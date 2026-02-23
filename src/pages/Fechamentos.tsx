import { useState, useMemo, useEffect } from 'react';
import { Loader2, RefreshCcw, FileDown, FileText, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { SmoothTableWrapper } from '@/components/SmoothTableWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ReportRequestPayload, ReportResponse, ReportGroup, ReportRowData, ReportTotals, ReportTypeKey, Cliente } from '@/types';
import { openPdfInWindow } from '@/utils/exportUtils';
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete';
import { generateFechamentoReport } from '@/utils/fechamentoReport';

// Lazy load de bibliotecas pesadas
const loadJsPDF = async () => {
  const module = await import('jspdf');
  return module.default;
};


// Constantes para opções de relatórios
const REPORT_OPTIONS: Record<
  'analitico' | 'sintetico',
  Array<{ value: ReportTypeKey; label: string }>
> = {
  analitico: [
    { value: 'analitico_designer_cliente', label: 'Designer × Cliente' },
    { value: 'analitico_cliente_designer', label: 'Cliente × Designer' },
    { value: 'analitico_vendedor_designer', label: 'Vendedor × Designer' },
    { value: 'analitico_designer_vendedor', label: 'Designer × Vendedor' },
    { value: 'analitico_cliente_painel', label: 'Cliente × Tecido' },
    { value: 'analitico_designer_painel', label: 'Designer × Tecido' },
    { value: 'analitico_entrega_painel', label: 'Entrega × Tecido' },
  ],
  sintetico: [
    { value: 'sintetico_data', label: 'Por Data' },
    { value: 'sintetico_vendedor', label: 'Por Vendedor' },
    { value: 'sintetico_designer', label: 'Por Designer' },
    { value: 'sintetico_vendedor_designer', label: 'Vendedor/Designer (Sintético)' },
    { value: 'sintetico_cliente', label: 'Por Cliente' },
    { value: 'sintetico_entrega', label: 'Por Forma de Entrega' },
  ],
};

const STATUS_OPTIONS = ['Todos', 'Pendente', 'Em Processamento', 'Concluido', 'Cancelado'] as const;

// Quick ranges para datas
const QUICK_RANGES = [
  {
    value: 'current_month',
    label: 'Este mês',
    getDates: (today: Date) => ({
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    }),
  },
  {
    value: 'last_month',
    label: 'Último mês',
    getDates: (today: Date) => ({
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    }),
  },
  {
    value: 'last_7_days',
    label: 'Últimos 7 dias',
    getDates: (today: Date) => ({
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
      end: today,
    }),
  },
] as const;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatCurrency = (value: number) => currencyFormatter.format(value || 0);

// Formata apenas o número sem o símbolo R$ (para alinhamento profissional)
const formatCurrencyNumber = (value: number): string => {
  const formatted = currencyFormatter.format(value || 0);
  // Remove "R$" e espaços, mantém apenas o número formatado
  return formatted.replace(/R\$\s*/, '').trim();
};

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10);

/** Extrai IDs estáveis de todas as linhas exportáveis do relatório */
function getAllRowIds(report: ReportResponse, isAnalitico: boolean): string[] {
  const ids: string[] = [];
  if (!report?.groups) return ids;

  if (isAnalitico) {
    const visit = (group: ReportGroup, path: string) => {
      if (group.subgroups && group.subgroups.length > 0) {
        group.subgroups.forEach((sg, i) => visit(sg, `${path}-${i}`));
      } else if (group.rows && group.rows.length > 0) {
        group.rows.forEach((_, rowIndex) => ids.push(`analitico-${path}-row-${rowIndex}`));
      }
    };
    report.groups.forEach((g, i) => visit(g, `group-${i}`));
  } else {
    report.groups.forEach((group, gi) => {
      if (group.subgroups && group.subgroups.length > 0) {
        group.subgroups.forEach((_, si) => ids.push(`sintetico-${gi}-${si}`));
      } else {
        ids.push(`sintetico-${gi}`);
      }
    });
  }
  return ids;
}

/** Soma totais deduplicando frete por ficha (frete é por pedido, não por item) */
function sumTotalsDedupFrete(rows: ReportRowData[], distribution?: 'por_pedido' | 'proporcional'): ReportTotals {
  if (distribution === 'proporcional') {
    // No modo proporcional, o frete já é fatiado individualmente em cada linha.
    // Somar tudo diretamente, sem deduplicar, para não perder os centavos.
    let valor_frete = 0;
    let valor_servico = 0;
    rows.forEach((r) => {
      valor_frete += r.valor_frete ?? 0;
      valor_servico += r.valor_servico ?? 0;
    });
    return { valor_frete, valor_servico };
  }

  // Modo 'por_pedido' (padrão): deduplicar por orderId para não somar o frete cheio múltiplas vezes
  const fretesPorPedido = new Map<number | string, number>();
  let valor_servico = 0;
  rows.forEach((r) => {
    valor_servico += r.valor_servico ?? 0;
    const key = r.orderId ?? r.ficha;
    if (!fretesPorPedido.has(key)) {
      fretesPorPedido.set(key, r.valor_frete ?? 0);
    }
  });
  const valor_frete = Array.from(fretesPorPedido.values()).reduce((a, v) => a + v, 0);
  return { valor_frete, valor_servico };
}

/** Filtra o relatório mantendo apenas linhas selecionadas e recalcula subtotais e total */
function filterReportBySelection(
  report: ReportResponse,
  selectedIds: Set<string>,
  isAnalitico: boolean
): ReportResponse {
  if (!report?.groups) return report;

  if (isAnalitico) {
    const visit = (group: ReportGroup, path: string): ReportGroup | null => {
      if (group.subgroups && group.subgroups.length > 0) {
        const filteredSubs = group.subgroups
          .map((sg, i) => visit(sg, `${path}-${i}`))
          .filter((g): g is ReportGroup => g !== null);
        if (filteredSubs.length === 0) return null;

        // Coletar todas as rows dos subgrupos filtrados para o subtotal do pai
        const subRows: ReportRowData[] = [];
        const collectSubRows = (g: ReportGroup) => {
          if (g.subgroups?.length) g.subgroups.forEach(collectSubRows);
          else if (g.rows) subRows.push(...g.rows);
        };
        filteredSubs.forEach(collectSubRows);

        return {
          ...group,
          subgroups: filteredSubs,
          subtotal: sumTotalsDedupFrete(subRows),
        };
      }
      if (group.rows && group.rows.length > 0) {
        const filteredRows = group.rows.filter((_, rowIndex) =>
          selectedIds.has(`analitico-${path}-row-${rowIndex}`)
        );
        if (filteredRows.length === 0) return null;
        return {
          ...group,
          rows: filteredRows,
          subtotal: sumTotalsDedupFrete(filteredRows, report.frete_distribution),
        };
      }
      return null;
    };

    const filteredGroups = report.groups
      .map((g, i) => visit(g, `group-${i}`))
      .filter((g): g is ReportGroup => g !== null);

    // Para o total geral, coletar todas as rows de todos os grupos filtrados
    // e aplicar a deduplicação global. Somar subtotais de grupos duplicaria frete
    // se um pedido estivesse presente em múltiplos grupos.
    const allRows: ReportRowData[] = [];
    const collectRows = (g: ReportGroup) => {
      if (g.subgroups?.length) {
        g.subgroups.forEach(collectRows);
      } else if (g.rows?.length) {
        allRows.push(...g.rows);
      }
    };
    filteredGroups.forEach(collectRows);
    const total = sumTotalsDedupFrete(allRows, report.frete_distribution);

    return {
      ...report,
      groups: filteredGroups,
      total,
    };
  }

  // Sintético: filtrar groups/subgroups
  const filteredGroups: ReportGroup[] = [];
  const allSelectedRows: ReportRowData[] = [];

  report.groups.forEach((group, gi) => {
    if (group.subgroups && group.subgroups.length > 0) {
      const filteredSubs = group.subgroups.filter((_, si) =>
        selectedIds.has(`sintetico-${gi}-${si}`)
      );
      if (filteredSubs.length === 0) return;

      // Coletar todas as rows dos subgrupos selecionados
      const subRows: ReportRowData[] = [];
      filteredSubs.forEach(sg => {
        if (sg.rows) subRows.push(...sg.rows);
      });
      allSelectedRows.push(...subRows);

      filteredGroups.push({
        ...group,
        subgroups: filteredSubs,
        subtotal: sumTotalsDedupFrete(subRows, report.frete_distribution),
      });
    } else if (selectedIds.has(`sintetico-${gi}`)) {
      if (group.rows) allSelectedRows.push(...group.rows);
      filteredGroups.push(group);
    }
  });

  return {
    ...report,
    groups: filteredGroups,
    total: sumTotalsDedupFrete(allSelectedRows, report.frete_distribution),
  };
}

/** Calcula subtotais filtrados por path percorrendo o relatório completo (paths alinhados à exibição) */
function computeFilteredTotalsByPath(
  report: ReportResponse | null,
  selectedIds: Set<string>,
  isAnalitico: boolean
): { subtotalByPath: Map<string, ReportTotals>; total: ReportTotals } {
  const subtotalByPath = new Map<string, ReportTotals>();
  const zeroTotal: ReportTotals = { valor_frete: 0, valor_servico: 0 };

  if (!report?.groups) {
    return { subtotalByPath, total: zeroTotal };
  }

  if (isAnalitico) {
    const visit = (group: ReportGroup, path: string): { totals: ReportTotals, rows: ReportRowData[] } => {
      let currentRows: ReportRowData[] = [];

      if (group.subgroups?.length) {
        group.subgroups.forEach((sg, i) => {
          const res = visit(sg, `${path}-${i}`);
          currentRows.push(...res.rows);
        });
      } else if (group.rows?.length) {
        const selected = group.rows.filter((_, rowIndex) =>
          selectedIds.has(`analitico-${path}-row-${rowIndex}`)
        );
        currentRows = selected;
      }

      const totals = sumTotalsDedupFrete(currentRows, report.frete_distribution);
      subtotalByPath.set(path, totals);
      return { totals, rows: currentRows };
    };

    const allVisibleRows: ReportRowData[] = [];
    report.groups.forEach((g, i) => {
      const res = visit(g, `group-${i}`);
      allVisibleRows.push(...res.rows);
    });

    const totalGeral = sumTotalsDedupFrete(allVisibleRows, report.frete_distribution);
    return { subtotalByPath, total: totalGeral };
  }

  // Sintético
  const allRows: ReportRowData[] = [];
  report.groups.forEach((group, gi) => {
    if (group.subgroups?.length) {
      group.subgroups.forEach((subgroup, si) => {
        const id = `sintetico-${gi}-${si}`;
        if (selectedIds.has(id)) {
          if (subgroup.rows) allRows.push(...subgroup.rows);
          subtotalByPath.set(id, subgroup.subtotal);
        }
      });
    } else if (selectedIds.has(`sintetico-${gi}`)) {
      if (group.rows) allRows.push(...group.rows);
      subtotalByPath.set(`sintetico-${gi}`, group.subtotal);
    }
  });

  return { subtotalByPath, total: sumTotalsDedupFrete(allRows, report.frete_distribution) };
}

// Componente de Tabela de Resultados
interface FilteredTotals {
  subtotalByPath: Map<string, ReportTotals>;
  total: ReportTotals;
}

interface ReportTableProps {
  report: ReportResponse;
  columnName: string;
  loading: boolean;
  isAnalitico: boolean;
  selectedRowIds: Set<string>;
  onSelectionChange: (id: string, checked: boolean) => void;
  filteredTotals: FilteredTotals;
}

type SortField = 'ficha' | 'descricao' | 'valor_frete' | 'valor_servico' | null;
type SortDirection = 'asc' | 'desc' | null;

const ZERO_TOTAL: ReportTotals = { valor_frete: 0, valor_servico: 0 };

function ReportTable({ report, columnName, loading, isAnalitico, selectedRowIds, onSelectionChange, filteredTotals }: ReportTableProps) {
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: null,
    direction: null,
  });

  if (!report || !report.groups || report.groups.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-base text-muted-foreground">
        Nenhum dado encontrado para os filtros selecionados.
      </div>
    );
  }

  // Função para ordenar linhas
  const sortRows = (rows: Array<{ ficha: string; descricao: string; valor_frete: number; valor_servico: number }>) => {
    if (!sortConfig.field || !sortConfig.direction) {
      return rows;
    }

    const sorted = [...rows].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortConfig.field) {
        case 'ficha':
          aValue = a.ficha || '';
          bValue = b.ficha || '';
          const aNum = Number.parseInt(aValue.toString(), 10);
          const bNum = Number.parseInt(bValue.toString(), 10);
          if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
            return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
          }
          return sortConfig.direction === 'asc'
            ? aValue.toString().localeCompare(bValue.toString(), 'pt-BR')
            : bValue.toString().localeCompare(aValue.toString(), 'pt-BR');
        case 'descricao':
          aValue = a.descricao || '';
          bValue = b.descricao || '';
          return sortConfig.direction === 'asc'
            ? aValue.toString().localeCompare(bValue.toString(), 'pt-BR')
            : bValue.toString().localeCompare(aValue.toString(), 'pt-BR');
        case 'valor_frete':
          aValue = a.valor_frete || 0;
          bValue = b.valor_frete || 0;
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        case 'valor_servico':
          aValue = a.valor_servico || 0;
          bValue = b.valor_servico || 0;
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        default:
          return 0;
      }
    });

    return sorted;
  };

  const handleSort = (field: SortField) => {
    setSortConfig((current) => {
      if (current.field === field) {
        if (current.direction === 'asc') {
          return { field, direction: 'desc' };
        } else if (current.direction === 'desc') {
          return { field: null, direction: null };
        }
      }
      return { field, direction: 'asc' };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-3.5 w-3.5 text-blue-600" />;
    }
    if (sortConfig.direction === 'desc') {
      return <ArrowDown className="h-3.5 w-3.5 text-blue-600" />;
    }
    return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
  };

  // Renderização detalhada para relatórios analíticos
  const renderGroup = (group: ReportGroup, depth = 0, path = group.key): JSX.Element => {
    const marginLeft = depth * 16;
    const subgroups = group.subgroups ?? [];
    const rows = group.rows ?? [];
    const hasSubgroups = subgroups.length > 0;
    const hasRows = rows.length > 0;
    const sortedRows = hasRows ? sortRows(rows) : [];

    return (
      <div key={path} className="space-y-3">
        <div
          className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 shadow-sm"
          style={{ marginLeft }}
        >
          <span>{group.label}</span>
          <span className="text-base font-semibold text-slate-700">
            Frete: {formatCurrency((filteredTotals.subtotalByPath.get(path) ?? ZERO_TOTAL).valor_frete)} · Serviços: {formatCurrency((filteredTotals.subtotalByPath.get(path) ?? ZERO_TOTAL).valor_servico)}
          </span>
        </div>

        {hasSubgroups ? (
          <div className="space-y-4">
            {subgroups.map((subgroup, index) =>
              renderGroup(subgroup, depth + 1, `${path}-${index}`),
            )}
          </div>
        ) : hasRows ? (
          <div
            className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
            style={{ marginLeft }}
          >
            <table className="w-full border-collapse text-base">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-sm font-medium">
                  <th className="w-12 px-2 py-2 text-center" title="Incluir na exportação">
                    Incluir
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('ficha')}
                    title="Clique para ordenar por Ficha"
                  >
                    <div className="flex items-center gap-2">
                      Ficha
                      <SortIcon field="ficha" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-left hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('descricao')}
                    title="Clique para ordenar por Descrição"
                  >
                    <div className="flex items-center gap-2">
                      Descrição
                      <SortIcon field="descricao" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-right hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('valor_frete')}
                    title="Clique para ordenar por Valor Frete"
                  >
                    <div className="flex items-center justify-end gap-2">
                      Valor Frete
                      <SortIcon field="valor_frete" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-2 text-right hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('valor_servico')}
                    title="Clique para ordenar por Valor Serviços"
                  >
                    <div className="flex items-center justify-end gap-2">
                      Valor Serviços
                      <SortIcon field="valor_servico" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => {
                  const rowId = `analitico-${path}-row-${rows.indexOf(row)}`;
                  return (
                    <tr
                      key={`${path}-row-${index}`}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                    >
                      <td className="w-12 px-2 py-2 text-center">
                        <Checkbox
                          checked={selectedRowIds.has(rowId)}
                          onCheckedChange={(checked) => onSelectionChange(rowId, checked === true)}
                          title="Incluir na exportação"
                          aria-label="Incluir na exportação"
                        />
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-800">{row.ficha}</td>
                      <td className="px-4 py-2 text-slate-700">{row.descricao}</td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {formatCurrency(row.valor_frete)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">
                        {formatCurrency(row.valor_servico)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 text-slate-700">
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 text-right font-medium" colSpan={2}>
                    Subtotal do grupo
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency((filteredTotals.subtotalByPath.get(path) ?? ZERO_TOTAL).valor_frete)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900">
                    {formatCurrency((filteredTotals.subtotalByPath.get(path) ?? ZERO_TOTAL).valor_servico)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div
            className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-base text-slate-500"
            style={{ marginLeft }}
          >
            Nenhum item encontrado para este agrupamento.
          </div>
        )}
      </div>
    );
  };

  // Se for analítico, renderizar com hierarquia detalhada
  if (isAnalitico) {
    return (
      <Card className="flex-1 flex flex-col min-h-0 flex-grow">
        <CardContent className="p-6">
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-600">Carregando...</span>
              </div>
            ) : (
              <>
                {report.groups.map((group, index) => renderGroup(group, 0, `group-${index}`))}
                {/* Total geral */}
                {filteredTotals.total && (
                  <div className="mt-6 flex items-center justify-between rounded-md border-2 border-slate-300 bg-slate-100 px-4 py-3 text-base font-bold text-slate-900 shadow-sm">
                    <span>TOTAL GERAL</span>
                    <span>
                      Frete: {formatCurrency(filteredTotals.total.valor_frete)} · Serviços: {formatCurrency(filteredTotals.total.valor_servico)} · Total: {formatCurrency(filteredTotals.total.valor_frete + filteredTotals.total.valor_servico)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderização sintética (tabela simples)
  const allRowsWithIds: Array<{
    id: string;
    row: { label: string; valor_frete: number; valor_servico: number; total: number };
  }> = [];

  const collectRows = (group: ReportGroup, groupIndex: number) => {
    if (group.subgroups && group.subgroups.length > 0) {
      group.subgroups.forEach((subgroup, subIndex) => {
        allRowsWithIds.push({
          id: `sintetico-${groupIndex}-${subIndex}`,
          row: {
            label: subgroup.label,
            valor_frete: subgroup.subtotal.valor_frete,
            valor_servico: subgroup.subtotal.valor_servico,
            total: subgroup.subtotal.valor_frete + subgroup.subtotal.valor_servico,
          },
        });
      });
    } else if (group.subtotal) {
      allRowsWithIds.push({
        id: `sintetico-${groupIndex}`,
        row: {
          label: group.label,
          valor_frete: group.subtotal.valor_frete,
          valor_servico: group.subtotal.valor_servico,
          total: group.subtotal.valor_frete + group.subtotal.valor_servico,
        },
      });
    }
  };

  report.groups.forEach((group, gi) => {
    collectRows(group, gi);
  });

  return (
    <Card className="flex-1 flex flex-col min-h-0 flex-grow">
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <div className="relative flex-1 min-h-0">
          <div className="h-full max-h-[70vh] overflow-y-auto overflow-x-auto border-t border-slate-200">
            <SmoothTableWrapper>
              <Table className="w-full">
                <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                  <TableRow>
                    <TableHead className="w-12 px-2 py-2 text-center bg-background" title="Incluir na exportação">
                      Incluir
                    </TableHead>
                    <TableHead className="min-w-[200px] lg:min-w-[250px] xl:min-w-[300px] cursor-pointer hover:bg-muted/50 transition-colors px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base bg-background">
                      {columnName}
                    </TableHead>
                    <TableHead className="min-w-[120px] lg:min-w-[140px] xl:min-w-[160px] text-right cursor-pointer hover:bg-muted/50 transition-colors px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base bg-background">
                      Valor Frete
                    </TableHead>
                    <TableHead className="min-w-[120px] lg:min-w-[140px] xl:min-w-[160px] text-right cursor-pointer hover:bg-muted/50 transition-colors px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base bg-background">
                      Valor Serviços
                    </TableHead>
                    <TableHead className="min-w-[120px] lg:min-w-[140px] xl:min-w-[160px] text-right cursor-pointer hover:bg-muted/50 transition-colors px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base bg-background font-semibold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && allRowsWithIds.length === 0 ? (
                    <>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell className="px-2 lg:px-3 xl:px-4 w-12" />
                          <TableCell className="px-2 lg:px-3 xl:px-4">
                            <Skeleton className="h-4 w-24 lg:w-32" />
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right">
                            <Skeleton className="h-4 w-20 lg:w-24" />
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right">
                            <Skeleton className="h-4 w-20 lg:w-24" />
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right">
                            <Skeleton className="h-4 w-20 lg:w-24" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : (
                    <>
                      {allRowsWithIds.map(({ id, row }) => (
                        <TableRow
                          key={id}
                          className="hover:bg-muted/50 transition-all duration-200"
                        >
                          <TableCell className="w-12 px-2 py-2 text-center">
                            <Checkbox
                              checked={selectedRowIds.has(id)}
                              onCheckedChange={(checked) => onSelectionChange(id, checked === true)}
                              title="Incluir na exportação"
                              aria-label="Incluir na exportação"
                            />
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base font-medium">
                            {row.label}
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base">
                            {formatCurrency(row.valor_frete)}
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base">
                            {formatCurrency(row.valor_servico)}
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base font-semibold">
                            {formatCurrency(row.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredTotals.total && (
                        <TableRow className="bg-slate-100 font-semibold">
                          <TableCell className="w-12 px-2 py-2" />
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base font-bold">
                            TOTAL GERAL
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base font-bold">
                            {formatCurrency(filteredTotals.total.valor_frete)}
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base font-bold">
                            {formatCurrency(filteredTotals.total.valor_servico)}
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base font-bold">
                            {formatCurrency(filteredTotals.total.valor_frete + filteredTotals.total.valor_servico)}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </SmoothTableWrapper>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Fechamentos() {
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const firstDayOfMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

  const [activeTab, setActiveTab] = useState<'analitico' | 'sintetico'>('analitico');
  const [reportType, setReportType] = useState<ReportTypeKey>(REPORT_OPTIONS.analitico[0].value);
  const [startDate, setStartDate] = useState<string>(formatInputDate(firstDayOfMonth));
  const [endDate, setEndDate] = useState<string>(formatInputDate(today));
  const [dateMode, setDateMode] = useState<'entrada' | 'entrega'>('entrega');
  const [status, setStatus] = useState<string>(STATUS_OPTIONS[0]);
  const [cliente, setCliente] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string>('');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const isAnalitico = activeTab === 'analitico';

  // Inicializar seleção quando o relatório muda (todos selecionados por padrão)
  useEffect(() => {
    if (report) {
      const ids = getAllRowIds(report, isAnalitico);
      setSelectedRowIds(new Set(ids));
    } else {
      setSelectedRowIds(new Set());
    }
  }, [report, isAnalitico]);

  const handleSelectionChange = (id: string, checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const filteredTotals = useMemo(() => {
    if (!report) return { subtotalByPath: new Map<string, ReportTotals>(), total: { valor_frete: 0, valor_servico: 0 } };
    return computeFilteredTotalsByPath(report, selectedRowIds, isAnalitico);
  }, [report, selectedRowIds, isAnalitico]);

  const availableOptions = useMemo(() => REPORT_OPTIONS[activeTab], [activeTab]);

  // Atualizar tipo de relatório quando mudar a aba
  useMemo(() => {
    if (!availableOptions.some((option) => option.value === reportType)) {
      setReportType(availableOptions[0].value);
    }
  }, [activeTab, availableOptions, reportType]);

  // Obter nome da coluna baseado no tipo
  const getColumnName = () => {
    const option = availableOptions.find((opt) => opt.value === reportType);
    if (option) {
      return option.label.replace('Por ', '').replace(' × ', ' / ');
    }
    return 'Grupo';
  };

  const updateFilter = (key: string, value: any) => {
    if (key === 'startDate') {
      setStartDate(value);
      if (value && endDate && value > endDate) {
        setDateError('A data final não pode ser anterior à data inicial.');
      } else {
        setDateError('');
      }
    } else if (key === 'endDate') {
      setEndDate(value);
      if (startDate && value && startDate > value) {
        setDateError('A data final não pode ser anterior à data inicial.');
      } else {
        setDateError('');
      }
    } else if (key === 'reportType') {
      setReportType(value);
    } else if (key === 'dateMode') {
      setDateMode(value);
    } else if (key === 'status') {
      setStatus(value);
    } else if (key === 'cliente') {
      setCliente(value);
    }
  };

  const applyQuickRange = (rangeValue: (typeof QUICK_RANGES)[number]['value']) => {
    const selectedRange = QUICK_RANGES.find((range) => range.value === rangeValue);
    if (!selectedRange) return;

    const { start, end } = selectedRange.getDates(today);
    setStartDate(formatInputDate(start));
    setEndDate(formatInputDate(end));
    setDateError('');
  };

  const clearFilters = () => {
    setReportType(REPORT_OPTIONS.analitico[0].value);
    setStartDate(formatInputDate(firstDayOfMonth));
    setEndDate(formatInputDate(today));
    setStatus(STATUS_OPTIONS[0]);
    setDateMode('entrega');
    setCliente('');
    setDateError('');
    setReport(null);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      reportType !== REPORT_OPTIONS.analitico[0].value ||
      startDate !== formatInputDate(firstDayOfMonth) ||
      endDate !== formatInputDate(today) ||
      dateMode !== 'entrega' ||
      cliente !== ''
    );
  }, [reportType, startDate, endDate, dateMode, cliente, firstDayOfMonth, today]);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, preencha as datas de início e fim.',
        variant: 'destructive',
      });
      return;
    }

    if (startDate > endDate) {
      setDateError('A data final não pode ser anterior à data inicial.');
      toast({
        title: 'Erro de validação',
        description: 'A data final não pode ser anterior à data inicial.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload: ReportRequestPayload = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        date_mode: dateMode,
        status: status !== 'Todos' ? status : undefined,
        cliente: cliente.trim() !== '' ? cliente.trim() : undefined,
      };

      const response = await api.getRelatorioSemanal({
        start_date: startDate,
        end_date: endDate,
        date_mode: dateMode,
        cliente: cliente.trim() !== '' ? cliente.trim() : undefined,
      });

      const processedReport = generateFechamentoReport(response, payload);
      setReport(processedReport);
      setRawOrders(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Não foi possível gerar o relatório.';
      toast({
        title: 'Falha ao gerar relatório',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessar = async () => {
    // Pegar pedidos que estão com status 'pronto' (ou 'Concluido' no mapeamento legível)
    const prontos = rawOrders.filter(o => o.status === 'pronto');

    if (prontos.length === 0) {
      toast({
        title: 'Nenhum pedido para processar',
        description: 'Não há pedidos com status "Pronto" na lista atual.',
      });
      return;
    }

    if (!confirm(`Deseja marcar ${prontos.length} pedidos como "Entregue"?`)) {
      return;
    }

    setProcessing(true);
    try {
      const orderIds = prontos.map(o => o.id);
      await api.batchUpdateStatus(orderIds, 'entregue' as any);

      toast({
        title: 'Sucesso!',
        description: `${prontos.length} pedidos foram marcados como Entregue.`,
      });

      // Atualizar o relatório para refletir os novos status se necessário
      handleGenerate();
    } catch (error) {
      toast({
        title: 'Erro ao processar pedidos',
        description: 'Ocorreu um erro ao tentar atualizar os status em lote.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Função para exportar para CSV
  const exportToCsv = async () => {
    if (!report || !report.groups || report.groups.length === 0) {
      toast({
        title: 'Nenhum relatório disponível',
        description: 'Gere um relatório antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    const filteredReport = filterReportBySelection(report, selectedRowIds, isAnalitico);
    if (!filteredReport.groups || filteredReport.groups.length === 0) {
      toast({
        title: 'Nenhum item selecionado',
        description: 'Marque ao menos um item para incluir na exportação.',
        variant: 'destructive',
      });
      return;
    }

    setExportingCsv(true);
    try {
      // Importar papaparse corretamente
      const PapaModule = await import('papaparse');
      const Papa = PapaModule.default || PapaModule;

      const csvRows: Array<Record<string, string>> = [];

      const columnName = getColumnName();
      csvRows.push({
        [columnName]: columnName,
        'Valor Frete': 'Valor Frete',
        'Valor Serviços': 'Valor Serviços',
        'Total': 'Total',
      });

      filteredReport.groups.forEach((group) => {
        if (group.subgroups && group.subgroups.length > 0) {
          group.subgroups.forEach((subgroup) => {
            const total = subgroup.subtotal.valor_frete + subgroup.subtotal.valor_servico;
            csvRows.push({
              [columnName]: subgroup.label,
              'Valor Frete': formatCurrency(subgroup.subtotal.valor_frete),
              'Valor Serviços': formatCurrency(subgroup.subtotal.valor_servico),
              'Total': formatCurrency(total),
            });
          });
        } else if (group.subtotal) {
          const total = group.subtotal.valor_frete + group.subtotal.valor_servico;
          csvRows.push({
            [columnName]: group.label,
            'Valor Frete': formatCurrency(group.subtotal.valor_frete),
            'Valor Serviços': formatCurrency(group.subtotal.valor_servico),
            'Total': formatCurrency(total),
          });
        }
      });

      if (filteredReport.total) {
        const totalGeral = filteredReport.total.valor_frete + filteredReport.total.valor_servico;
        csvRows.push({
          [columnName]: 'TOTAL GERAL',
          'Valor Frete': formatCurrency(filteredReport.total.valor_frete),
          'Valor Serviços': formatCurrency(filteredReport.total.valor_servico),
          'Total': formatCurrency(totalGeral),
        });
      }

      const csv = Papa.unparse(csvRows, {
        header: true,
        delimiter: ';',
        newline: '\n',
      });

      const filenameSuffix =
        startDate && endDate && endDate !== startDate
          ? `${startDate}_${endDate}`
          : startDate || new Date().toISOString().split('T')[0];
      const filename = `relatorio_fechamentos_${reportType}_${filenameSuffix}.csv`;

      // Verificar se está no Tauri
      const { isTauri } = await import('@/utils/isTauri');
      const tauriCheck = isTauri();
      const tauriCheckAlt = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        (window.location.port === '1420' || window.location.protocol === 'tauri:');

      if (tauriCheck || tauriCheckAlt) {
        // Usar API do Tauri para salvar
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');

        const filePath = await save({
          defaultPath: filename,
          filters: [{ name: 'CSV', extensions: ['csv'] }],
        });

        if (filePath) {
          // Converter CSV para Uint8Array com BOM UTF-8
          const csvWithBom = '\ufeff' + csv;
          const encoder = new TextEncoder();
          const uint8Array = encoder.encode(csvWithBom);

          // Salvar arquivo
          await writeFile(filePath, uint8Array);

          toast({
            title: 'CSV exportado com sucesso',
            description: `Arquivo salvo: ${filename}`,
          });
        }
      } else {
        // Fallback: usar download via link (navegador)
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Limpar após um tempo
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);

        toast({
          title: 'CSV exportado com sucesso',
          description: `Download iniciado: ${filename}`,
        });
      }
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: 'Falha ao exportar CSV',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao exportar o CSV.',
        variant: 'destructive',
      });
    } finally {
      setExportingCsv(false);
    }
  };

  // Função para exportar para PDF - Estilo Clássico de ERP
  const exportToPdf = async () => {
    if (!report || !report.groups || report.groups.length === 0) {
      toast({
        title: 'Nenhum relatório disponível',
        description: 'Gere um relatório antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    const filteredReport = filterReportBySelection(report, selectedRowIds, isAnalitico);
    if (!filteredReport.groups || filteredReport.groups.length === 0) {
      toast({
        title: 'Nenhum item selecionado',
        description: 'Marque ao menos um item para incluir na exportação.',
        variant: 'destructive',
      });
      return;
    }

    setExportingPdf(true);
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let cursorY = 15;
      let pageNumber = 1;
      const marginLeft = 10;
      const marginRight = 10;
      const pageWidth = 210 - marginLeft - marginRight;

      // Função para desenhar linha horizontal simples
      const drawHorizontalLine = (y: number) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(marginLeft, y, marginLeft + pageWidth, y);
      };

      // Função para verificar espaço e adicionar nova página se necessário
      const ensurePdfSpace = (required: number): number => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (cursorY + required > pageHeight - 15) {
          doc.addPage();
          pageNumber++;
          cursorY = 15;
          return cursorY;
        }
        return cursorY;
      };

      // ========== CABEÇALHO DO RELATÓRIO (texto puro, sem decorações) ==========
      cursorY += 3;

      // Título principal centralizado
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const titleText = filteredReport.title || 'Relatório de Fechamentos';
      const titleWidth = doc.getTextWidth(titleText);
      doc.text(titleText, marginLeft + (pageWidth - titleWidth) / 2, cursorY);

      // Número da página à direita
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Pág:${pageNumber}`, marginLeft + pageWidth - 10, cursorY);

      cursorY += 4;

      // Subtítulo com período e status (centralizado)
      doc.setFontSize(9);
      let subtitleText = '';
      if (filteredReport.period_label) {
        subtitleText = filteredReport.period_label;
      }
      if (filteredReport.status_label) {
        subtitleText += (subtitleText ? ' - ' : '') + filteredReport.status_label;
      }
      if (subtitleText) {
        const subtitleWidth = doc.getTextWidth(subtitleText);
        doc.text(subtitleText, marginLeft + (pageWidth - subtitleWidth) / 2, cursorY);
        cursorY += 3;
      }

      if (filteredReport.generated_at) {
        doc.setFontSize(8);
        const emitidoText = `Emitido: ${filteredReport.generated_at}`;
        const emitidoWidth = doc.getTextWidth(emitidoText);
        doc.text(emitidoText, marginLeft + (pageWidth - emitidoWidth) / 2, cursorY);
        cursorY += 3;
      }

      cursorY += 3;

      // ========== CONTEÚDO DO RELATÓRIO ==========
      const renderGroupToPdf = (group: ReportGroup, depth = 0) => {
        const indent = marginLeft + depth * 4;

        // Cliente/Grupo: texto em negrito + linha horizontal simples abaixo
        ensurePdfSpace(8);

        // Linha horizontal acima do nome do cliente (separar clientes)
        if (depth === 0) {
          drawHorizontalLine(cursorY);
          cursorY += 3;
        }

        // Nome do cliente em negrito
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const groupLabel = depth === 0 ? group.label : group.label;
        doc.text(groupLabel, indent, cursorY);
        cursorY += 4;

        // Linha horizontal abaixo do nome do cliente
        if (depth === 0) {
          drawHorizontalLine(cursorY);
          cursorY += 3;
        }

        // Se tem subgrupos, renderizar recursivamente
        if (group.subgroups && group.subgroups.length > 0) {
          group.subgroups.forEach((subgroup) => {
            renderGroupToPdf(subgroup, depth + 1);
          });
          return;
        }

        // Se tem linhas (rows), renderizar tabela sem grade
        if (group.rows && group.rows.length > 0) {
          ensurePdfSpace(10);

          // ========== DEFINIÇÃO DE LARGURAS FIXAS (ESTRUTURAL) ==========
          // Colunas com larguras FIXAS (em mm)
          const colFichaWidth = 25; // Largura fixa para Ficha
          const colFreteWidth = 35; // Largura fixa para Vr.Frete
          const colServicosWidth = 35; // Largura fixa para Vr.Serviços

          // Gaps (espaçamentos) entre colunas
          const gapFichaDesc = 4; // Gap entre Ficha e Descrição
          const gapDescValores = 5; // Gap entre Descrição e valores (IMPORTANTE: previne invasão)
          const gapFreteServicos = 4; // Gap entre Frete e Serviços

          // ========== POSIÇÕES DAS COLUNAS (BOUNDING BOXES EXPLÍCITOS) ==========
          // Coluna Ficha: ancorada à esquerda
          const colFichaStart = indent;
          const colFichaEnd = colFichaStart + colFichaWidth;

          // Bloco de Valores: ancorado à direita (colado no canto direito) - CALCULAR PRIMEIRO
          const colServicosStart = marginLeft + pageWidth - colServicosWidth;
          const colFreteEnd = colServicosStart - gapFreteServicos;
          const colFreteStart = colFreteEnd - colFreteWidth;

          // Gap entre Descrição e Valores (zona proibida - nenhum texto pode passar)
          const gapZoneStart = colFreteStart - gapDescValores;

          // Coluna Descrição: usa APENAS o espaço entre Ficha e Gap (calculado exatamente)
          const colDescricaoStart = colFichaEnd + gapFichaDesc;
          const colDescricaoEnd = gapZoneStart; // Termina exatamente onde começa o gap
          const colDescricaoWidth = colDescricaoEnd - colDescricaoStart;

          // Validação: garantir que descrição tem largura mínima
          if (colDescricaoWidth < 10) {
            console.warn('Aviso: Largura da descrição muito pequena. Ajustando layout...');
          }

          // Posições finais para renderização
          const colFicha = colFichaStart;
          const colDescricao = colDescricaoStart;
          const colDescricaoWidthFinal = Math.max(10, colDescricaoWidth); // Mínimo 10mm
          const colFrete = colFreteStart;
          const colServicos = colServicosStart;

          // Cabeçalhos da tabela em negrito (sem grade)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('Ficha', colFicha, cursorY);
          doc.text('Descrição Painel', colDescricao, cursorY);
          doc.text('Vr.Frete (R$)', colFrete + colFreteWidth, cursorY, { align: 'right' });
          doc.text('Vr.Serviços (R$)', colServicos + colServicosWidth, cursorY, { align: 'right' });
          cursorY += 2;

          // Linha horizontal separando cabeçalho da tabela
          drawHorizontalLine(cursorY);
          cursorY += 3;

          // Linhas da tabela (com bounding boxes explícitos)
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          group.rows.forEach((row) => {
            ensurePdfSpace(6);
            const rowStartY = cursorY;

            // ========== COLUNA FICHA (bounding box fixo) ==========
            const fichaText = (row.ficha || '-').toString();
            const fichaFinal = fichaText.length > 15 ? fichaText.substring(0, 15) + '...' : fichaText;
            doc.text(fichaFinal, colFicha, cursorY);

            // ========== COLUNA DESCRIÇÃO (bounding box fixo, pode quebrar) ==========
            const descricaoText = (row.descricao || '-').toString();
            // Largura EXATA da descrição (sem aproximações)
            const descricaoMaxWidth = colDescricaoWidthFinal - 0.5; // Margem de 0.5mm

            // splitTextToSize garante quebra de linha respeitando a largura EXATA
            const descricaoLines = doc.splitTextToSize(descricaoText, descricaoMaxWidth);

            // Validação adicional: verificar cada linha não ultrapassa o limite
            const validatedLines: string[] = [];
            descricaoLines.forEach((line: string) => {
              const lineWidth = doc.getTextWidth(line);
              if (lineWidth > descricaoMaxWidth) {
                // Se ainda ultrapassar, truncar com ellipsis
                let truncated = line;
                while (doc.getTextWidth(truncated + '...') > descricaoMaxWidth && truncated.length > 0) {
                  truncated = truncated.slice(0, -1);
                }
                validatedLines.push(truncated + '...');
              } else {
                validatedLines.push(line);
              }
            });

            // Renderizar linhas da descrição dentro do bounding box
            let maxDescricaoHeight = 0;
            validatedLines.forEach((line: string, lineIndex: number) => {
              // Renderizar dentro do bounding box (colDescricao até colDescricaoEnd)
              doc.text(line, colDescricao, cursorY);
              if (lineIndex < validatedLines.length - 1) {
                cursorY += 3.5; // Espaçamento entre linhas da descrição
              }
              maxDescricaoHeight = Math.max(maxDescricaoHeight, cursorY - rowStartY);
            });

            // ========== COLUNAS DE VALORES (bounding boxes fixos, ancorados à direita) ==========
            // Posicionar valores na primeira linha da descrição
            const firstLineY = rowStartY;

            // Aplicar fonte monoespaçada para melhor alinhamento visual dos números
            doc.setFont('courier', 'normal');

            // Renderizar valores dentro de seus bounding boxes (alinhados à direita)
            // Vr.Frete: dentro de colFreteStart até colFreteEnd
            const freteText = formatCurrencyNumber(row.valor_frete);
            doc.text(freteText, colFrete + colFreteWidth, firstLineY, { align: 'right' });

            // Vr.Serviços: dentro de colServicosStart até colServicosEnd
            const servicosText = formatCurrencyNumber(row.valor_servico);
            doc.text(servicosText, colServicos + colServicosWidth, firstLineY, { align: 'right' });

            // Restaurar fonte normal para próximas linhas
            doc.setFont('helvetica', 'normal');

            // Ajustar cursorY para a próxima linha (usar a maior altura entre descrição e valores)
            cursorY = rowStartY + Math.max(maxDescricaoHeight, 4) + 2; // Espaçamento vertical leve entre linhas
          });

          cursorY += 2;
        }
      };

      // Renderizar todos os grupos
      filteredReport.groups.forEach((group) => {
        renderGroupToPdf(group, 0);
      });

      // ========== TOTAIS (texto alinhado, sem caixas) ==========
      ensurePdfSpace(8);
      drawHorizontalLine(cursorY);
      cursorY += 4;

      // Título dos totais
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const totalTitleText = 'TOTAL DO PERÍODO';
      const totalTitleWidth = doc.getTextWidth(totalTitleText);
      doc.text(totalTitleText, marginLeft + (pageWidth - totalTitleWidth) / 2, cursorY);
      cursorY += 5;

      // Totais em texto alinhado (sem caixas)
      const totalGeral = filteredReport.total.valor_frete + filteredReport.total.valor_servico;
      const colLabel = marginLeft;
      const colValue = marginLeft + pageWidth - 30;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Vr.Serviços(sem Frete) (R$):', colLabel, cursorY);
      doc.setFont('courier', 'bold'); // Fonte monoespaçada para números
      doc.text(formatCurrencyNumber(filteredReport.total.valor_servico), colValue, cursorY, { align: 'right' });
      cursorY += 4;

      doc.setFont('helvetica', 'normal');
      doc.text('(+) Vr.Frete (R$):', colLabel, cursorY);
      doc.setFont('courier', 'bold'); // Fonte monoespaçada para números
      doc.text(formatCurrencyNumber(filteredReport.total.valor_frete), colValue, cursorY, { align: 'right' });
      cursorY += 4;

      doc.setFont('helvetica', 'normal');
      doc.text('(=) Vr.Total (R$):', colLabel, cursorY);
      doc.setFont('courier', 'bold'); // Fonte monoespaçada para números
      doc.setFontSize(9);
      doc.text(formatCurrencyNumber(totalGeral), colValue, cursorY, { align: 'right' });
      cursorY += 3;

      const filenameSuffix =
        startDate && endDate && endDate !== startDate
          ? `${startDate}_${endDate}`
          : startDate || new Date().toISOString().split('T')[0];
      const filename = `relatorio_fechamentos_${reportType}_${filenameSuffix}.pdf`;

      try {
        await openPdfInWindow(doc, filename);
      } catch (error) {
        doc.save(filename);
      }
    } catch (error) {
      toast({
        title: 'Falha ao exportar PDF',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao exportar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fechamentos</h1>
        <p className="text-muted-foreground">
          Explore rapidamente como os valores estão distribuídos. Ajuste os filtros abaixo e gere o relatório na hora.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">Parâmetros do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'analitico' | 'sintetico')}
          >
            <TabsList className="bg-slate-100">
              <TabsTrigger value="analitico" className="data-[state=active]:font-semibold">
                Relatórios Analíticos
              </TabsTrigger>
              <TabsTrigger value="sintetico" className="data-[state=active]:font-semibold">
                Relatórios Sintéticos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="analitico" className="mt-4 text-sm text-muted-foreground">
              Detalhes por ficha ou agrupamento específico.
            </TabsContent>
            <TabsContent value="sintetico" className="mt-4 text-sm text-muted-foreground">
              Visão resumida com totais por eixo.
            </TabsContent>
          </Tabs>

          {/* Tipo de relatório e ações principais */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de relatório</Label>
              <Select value={reportType} onValueChange={(value) => updateFilter('reportType', value as ReportTypeKey)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {availableOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'analitico'
                  ? 'Agrupamento detalhado para análise.'
                  : 'Visão resumida com totais.'}
              </p>
            </div>

            {/* Botões de ação rápida */}
            <div className="flex flex-col gap-2 md:justify-end">
              <div className="flex flex-wrap gap-2">
                {QUICK_RANGES.map((range) => (
                  <Button
                    key={range.value}
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-600 hover:bg-slate-100"
                    onClick={() => applyQuickRange(range.value)}
                    type="button"
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Filtros de data, tipo de data e cliente */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => updateFilter('startDate', event.target.value)}
                className={`bg-white ${dateError ? 'border-red-500' : ''}`}
              />
              {dateError && <p className="text-sm text-red-600">{dateError}</p>}
            </div>

            <div className="space-y-2">
              <Label>Data final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => updateFilter('endDate', event.target.value)}
                className={`bg-white ${dateError ? 'border-red-500' : ''}`}
                min={startDate || undefined}
              />
              {dateError && <p className="text-sm text-red-600">{dateError}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo de data</Label>
              <Select value={dateMode} onValueChange={(value) => updateFilter('dateMode', value)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrega">Data de entrega</SelectItem>
                  <SelectItem value="entrada">Data de entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <ClienteAutocomplete
                value={cliente}
                onSelect={(clienteSelecionado: Cliente | null) => {
                  if (clienteSelecionado) {
                    setCliente(clienteSelecionado.nome);
                  } else {
                    setCliente('');
                  }
                }}
                onInputChange={(value: string) => {
                  setCliente(value);
                }}
              />
              <p className="text-sm text-muted-foreground">
                Filtro parcial pelo nome do cliente (opcional)
              </p>
            </div>
          </div>

          {/* Botões de ação principais */}
          <Separator />

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
                title="Limpar todos os filtros"
              >
                <X className="h-4 w-4" />
                Limpar Filtros
              </Button>
            )}

            <Button
              variant="outline"
              className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
              onClick={exportToCsv}
              disabled={!report || loading || exportingCsv}
            >
              {exportingCsv ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Exportar CSV
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
              onClick={exportToPdf}
              disabled={!report || loading || exportingPdf}
            >
              {exportingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Exportar PDF
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
              onClick={handleProcessar}
              disabled={loading || processing || !rawOrders.some(o => o.status === 'pronto')}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {processing ? 'Processando...' : 'Processar Prontos'}
            </Button>

            <Button className="gap-2" onClick={handleGenerate} disabled={loading || !!dateError}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <span className="text-slate-600">Gerando relatório...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        report && (
          <ReportTable
            report={report}
            columnName={getColumnName()}
            loading={loading}
            isAnalitico={isAnalitico}
            selectedRowIds={selectedRowIds}
            onSelectionChange={handleSelectionChange}
            filteredTotals={filteredTotals}
          />
        )
      )}
    </div>
  );
}
