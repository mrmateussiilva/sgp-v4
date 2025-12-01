import { useEffect, useMemo, useState } from 'react';
import {
  ReportGroup,
  ReportResponse,
  ReportTypeKey,
  ReportRequestPayload,
} from '@/types';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileDown, RefreshCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { isTauri } from '@/utils/isTauri';

const REPORT_OPTIONS: Record<
  'analitico' | 'sintetico',
  Array<{ value: ReportTypeKey; label: string }>
> = {
  analitico: [
    { value: 'analitico_designer_cliente', label: 'Designer × Cliente' },
    { value: 'analitico_cliente_designer', label: 'Cliente × Designer' },
    { value: 'analitico_cliente_painel', label: 'Cliente × Tecido' },
    { value: 'analitico_designer_painel', label: 'Designer × Tecido' },
    { value: 'analitico_entrega_painel', label: 'Entrega × Tecido' },
  ],
  sintetico: [
    { value: 'sintetico_data', label: 'Por Data (automático)' },
    { value: 'sintetico_data_entrada', label: 'Por Data de Entrada' },
    { value: 'sintetico_data_entrega', label: 'Por Data de Entrega' },
    { value: 'sintetico_vendedor', label: 'Por Vendedor' },
    { value: 'sintetico_designer', label: 'Por Designer' },
    { value: 'sintetico_vendedor_designer', label: 'Por Vendedor/Designer' },
    { value: 'sintetico_cliente', label: 'Por Cliente' },
    { value: 'sintetico_entrega', label: 'Por Forma de Entrega' },
  ],
};

const STATUS_OPTIONS = ['Todos', 'Pendente', 'Em Processamento', 'Concluido', 'Cancelado'] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];
type FiltersState = {
  reportType: ReportTypeKey;
  startDate: string;
  endDate: string;
  status: StatusOption;
  dateMode: 'entrada' | 'entrega';
  vendedor?: string;
  designer?: string;
};

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

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10);

export default function Fechamentos() {
  const { toast } = useToast();

  const today = useMemo(() => new Date(), []);
  const firstDayOfMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

  const [activeTab, setActiveTab] = useState<'analitico' | 'sintetico'>('analitico');
  const [filters, setFilters] = useState<FiltersState>({
    reportType: REPORT_OPTIONS.analitico[0].value,
    startDate: formatInputDate(firstDayOfMonth),
    endDate: formatInputDate(today),
    status: STATUS_OPTIONS[0],
    dateMode: 'entrega',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [nomeFilter, setNomeFilter] = useState<string>('');
  const [vendedores, setVendedores] = useState<Array<{ id: number; nome: string }>>([]);
  const [designers, setDesigners] = useState<Array<{ id: number; nome: string }>>([]);

  const availableOptions = useMemo(() => REPORT_OPTIONS[activeTab], [activeTab]);

  // Carregar listas de vendedores e designers ativos para os filtros
  useEffect(() => {
    let isMounted = true;

    const loadPeople = async () => {
      try {
        const [vendedoresResponse, designersResponse] = await Promise.all([
          api.getVendedoresAtivos(),
          api.getDesignersAtivos(),
        ]);

        if (!isMounted) return;

        setVendedores(vendedoresResponse);
        setDesigners(designersResponse);
      } catch (error) {
        if (!isMounted) return;
        console.error('Erro ao carregar vendedores/designers para filtros de fechamento:', error);
      }
    };

    void loadPeople();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!availableOptions.some((option) => option.value === filters.reportType)) {
      setFilters((previous) => ({
        ...previous,
        reportType: availableOptions[0].value,
      }));
    }
  }, [activeTab, availableOptions, filters.reportType]);

  const updateFilter = <Key extends keyof FiltersState>(
    key: Key,
    value: FiltersState[Key],
  ) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const applyQuickRange = (rangeValue: (typeof QUICK_RANGES)[number]['value']) => {
    const selectedRange = QUICK_RANGES.find((range) => range.value === rangeValue);
    if (!selectedRange) return;

    const { start, end } = selectedRange.getDates(today);
    updateFilter('startDate', formatInputDate(start));
    updateFilter('endDate', formatInputDate(end));
  };

  const handleGenerate = async () => {
    const payload: ReportRequestPayload = {
      report_type: filters.reportType,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined,
      status: filters.status || undefined,
      date_mode: filters.dateMode,
      vendedor: filters.vendedor || undefined,
      designer: filters.designer || undefined,
    };

    setLoading(true);
    try {
      const response = await api.generateReport(payload);
      setReport(response);
      toast({
        title: 'Relatório atualizado',
        description: 'Dados agrupados com sucesso.',
      });
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

  const ensurePdfSpace = (doc: jsPDF, cursorY: number, required: number): number => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (cursorY + required > pageHeight - 20) {
      doc.addPage();
      return 20;
    }
    return cursorY;
  };

  const exportToPdf = async () => {
    if (!report) {
      toast({
        title: 'Nenhum relatório disponível',
        description: 'Gere um relatório antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let cursorY = 22;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(report.title, 14, cursorY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    cursorY += 8;
    doc.text(report.period_label, 14, cursorY);
    cursorY += 6;
    doc.text(report.status_label, 14, cursorY);
    cursorY += 6;
    doc.text(`Emitido: ${report.generated_at}`, 14, cursorY);
    doc.text(`Pág: ${report.page}`, 196, 20, { align: 'right' });
    cursorY += 8;

    const renderGroupToPdf = (group: ReportGroup, depth = 0) => {
      cursorY = ensurePdfSpace(doc, cursorY, 10);

      const indent = 14 + depth * 6;
      doc.setFillColor(35, 38, 47);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.rect(indent, cursorY - 5, 180 - depth * 6, 6, 'F');
      doc.text(group.label, indent + 2, cursorY - 1);
      doc.setFontSize(9);
      const subtotalLine = `Frete: ${formatCurrency(group.subtotal.valor_frete)}  |  Serviços: ${formatCurrency(group.subtotal.valor_servico)}`;
      doc.text(subtotalLine, indent + 2, cursorY + 4);
      cursorY += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      if (group.subgroups && group.subgroups.length > 0) {
        group.subgroups.forEach((sub) => {
          renderGroupToPdf(sub, depth + 1);
        });
        return;
      }

      if (group.rows && group.rows.length > 0) {
        cursorY = ensurePdfSpace(doc, cursorY, 8);

        autoTable(doc, {
          startY: cursorY,
          head: [['Ficha', 'Descrição', 'Valor Frete', 'Valor Serviços']],
          body: group.rows.map((row) => [
            row.ficha,
            row.descricao,
            formatCurrency(row.valor_frete),
            formatCurrency(row.valor_servico),
          ]),
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
          },
          headStyles: {
            fillColor: [224, 225, 231],
            textColor: 20,
            fontStyle: 'bold',
          },
          bodyStyles: {
            textColor: 30,
          },
          alternateRowStyles: {
            fillColor: [248, 248, 252],
          },
          margin: {
            left: indent,
            right: 16,
          },
          tableWidth: 180 - depth * 6,
        });

        const tableInfo = (doc as any).lastAutoTable;
        cursorY = tableInfo.finalY + 4;

        cursorY = ensurePdfSpace(doc, cursorY, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(
          `Subtotal: Frete ${formatCurrency(group.subtotal.valor_frete)}  |  Serviços ${formatCurrency(group.subtotal.valor_servico)}`,
          indent + 2,
          cursorY,
        );
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        cursorY += 6;
      }
    };

    report.groups.forEach((group) => renderGroupToPdf(group));

    cursorY = ensurePdfSpace(doc, cursorY, 12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(20, 24, 32);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, cursorY - 6, 182, 8, 'F');
    doc.text('TOTAL GERAL', 18, cursorY - 1);
    doc.text(
      `Frete: ${formatCurrency(report.total.valor_frete)}  |  Serviços: ${formatCurrency(report.total.valor_servico)}`,
      196,
      cursorY - 1,
      { align: 'right' },
    );
    doc.setTextColor(0, 0, 0);

      const filenameSuffix =
        filters.startDate && filters.endDate && filters.endDate !== filters.startDate
          ? `${filters.startDate}_${filters.endDate}`
          : filters.startDate || report.generated_at.replace(/[^\d-]/g, '');
      const filename = `relatorio_fechamentos_${filenameSuffix || 'periodo'}.pdf`;

      // Gerar o PDF como blob
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      // Se estiver no Tauri, tentar usar shell.open
      if (isTauri()) {
        try {
          const { save } = await import('@tauri-apps/api/dialog');
          const { writeBinaryFile } = await import('@tauri-apps/api/fs');
          const { appDataDir } = await import('@tauri-apps/api/path');

          await appDataDir();
          const filePath = await save({
            defaultPath: filename,
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
          });

          if (filePath) {
            // Converter blob para array de bytes
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            await writeBinaryFile(filePath, uint8Array);

            // Tentar abrir o arquivo
            try {
              const { open } = await import('@tauri-apps/api/shell');
              await open(filePath);
              toast({
                title: 'Relatório exportado',
                description: 'O arquivo foi salvo e aberto com sucesso.',
              });
            } catch (openError) {
              console.warn('Erro ao abrir arquivo:', openError);
              toast({
                title: 'Relatório exportado',
                description: 'O arquivo foi salvo, mas não foi possível abri-lo automaticamente.',
              });
            }
          } else {
            // Usuário cancelou
            URL.revokeObjectURL(blobUrl);
            return;
          }
        } catch (tauriError) {
          console.error('Erro ao exportar via Tauri:', tauriError);
          // Fallback para download direto
          doc.save(filename);
          toast({
            title: 'Relatório exportado',
            description: 'O arquivo foi baixado com sucesso.',
          });
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      } else {
        // Ambiente web: download direto
        try {
          doc.save(filename);
          toast({
            title: 'Relatório exportado',
            description: 'O arquivo foi baixado com sucesso.',
          });
        } catch (saveError) {
          console.error('Erro ao salvar PDF:', saveError);
          toast({
            title: 'Falha ao exportar relatório',
            description: 'Não foi possível salvar o arquivo. Tente novamente.',
            variant: 'destructive',
          });
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    } catch (error) {
      console.error('Erro ao exportar relatório de fechamentos:', error);
      toast({
        title: 'Falha ao exportar relatório',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao exportar o relatório.',
        variant: 'destructive',
      });
    }
  };

  // Função para filtrar grupos recursivamente por nome
  const filterGroupByName = (group: ReportGroup, filterText: string): ReportGroup | null => {
    if (!filterText.trim()) {
      return group;
    }

    const filterLower = filterText.toLowerCase().trim();
    const filteredSubgroups = (group.subgroups ?? [])
      .map((sub) => filterGroupByName(sub, filterText))
      .filter((sub): sub is ReportGroup => sub !== null);

    const filteredRows = (group.rows ?? []).filter(
      (row) =>
        row.ficha?.toLowerCase().includes(filterLower) ||
        row.descricao?.toLowerCase().includes(filterLower)
    );

    // Se não há subgrupos nem linhas após filtrar, retornar null
    if (filteredSubgroups.length === 0 && filteredRows.length === 0) {
      // Mas se o próprio label do grupo contém o filtro, manter o grupo
      if (group.label?.toLowerCase().includes(filterLower)) {
        return { ...group, subgroups: [], rows: [] };
      }
      return null;
    }

    return {
      ...group,
      subgroups: filteredSubgroups,
      rows: filteredRows,
    };
  };

  const filteredReport = useMemo(() => {
    if (!report || !nomeFilter.trim()) {
      return report;
    }

    const filteredGroups = report.groups
      .map((group) => filterGroupByName(group, nomeFilter))
      .filter((group): group is ReportGroup => group !== null);

    return {
      ...report,
      groups: filteredGroups,
    };
  }, [report, nomeFilter]);

  const renderGroup = (group: ReportGroup, depth = 0, path = group.key): JSX.Element => {
    const marginLeft = depth * 16;
    const subgroups = group.subgroups ?? [];
    const rows = group.rows ?? [];
    const hasSubgroups = subgroups.length > 0;
    const hasRows = rows.length > 0;

    return (
      <div key={path} className="space-y-3">
        <div
          className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 shadow-sm"
          style={{ marginLeft }}
        >
          <span>{group.label}</span>
          <span className="text-base font-semibold text-slate-700">
            Frete: {formatCurrency(group.subtotal.valor_frete)} · Serviços: {formatCurrency(group.subtotal.valor_servico)}
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
                  <th className="px-4 py-2 text-left">Ficha</th>
                  <th className="px-4 py-2 text-left">Descrição</th>
                  <th className="px-4 py-2 text-right">Valor Frete</th>
                  <th className="px-4 py-2 text-right">Valor Serviços</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${path}-row-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                  >
                    <td className="px-4 py-2 font-medium text-slate-800">{row.ficha}</td>
                    <td className="px-4 py-2 text-slate-700">{row.descricao}</td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {formatCurrency(row.valor_frete)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900">
                      {formatCurrency(row.valor_servico)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 text-slate-700">
                  <td className="px-4 py-2 text-right font-medium" colSpan={2}>
                    Subtotal do grupo
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency(group.subtotal.valor_frete)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900">
                    {formatCurrency(group.subtotal.valor_servico)}
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
          {/* Filtro por Nome (cliente, vendedor, designer, etc.) */}
          {report && (
            <div className="space-y-2">
              <Label>Filtrar por nome</Label>
              <Input
                type="text"
                placeholder="Buscar por cliente, vendedor, designer ou descrição..."
                value={nomeFilter}
                onChange={(e) => setNomeFilter(e.target.value)}
                className="bg-white"
              />
              <p className="text-sm text-muted-foreground">
                Digite um trecho do nome (cliente, vendedor, designer) ou da descrição para filtrar os resultados.
              </p>
            </div>
          )}
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
            <TabsContent value="analitico" className="mt-4 text-base text-muted-foreground">
              Para entender detalhes por ficha ou agrupamento específico.
            </TabsContent>
            <TabsContent value="sintetico" className="mt-4 text-base text-muted-foreground">
              Para uma visão resumida com totais por eixo de comparação.
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de relatório</Label>
              <Select
                value={filters.reportType}
                onValueChange={(value) => updateFilter('reportType', value as ReportTypeKey)}
              >
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
                  ? 'Escolha o agrupamento que melhor combina com a análise detalhada que você precisa.'
                  : 'Selecione a forma de sumarizar os valores para uma visão rápida do período.'}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            {QUICK_RANGES.map((range) => (
              <Button
                key={range.value}
                variant="outline"
                className="border-slate-200 text-slate-600 hover:bg-slate-100"
                onClick={() => applyQuickRange(range.value)}
                type="button"
              >
                {range.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(event) => updateFilter('startDate', event.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Data final</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(event) => updateFilter('endDate', event.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de data</Label>
              <Select
                value={filters.dateMode}
                onValueChange={(value) =>
                  updateFilter('dateMode', value as FiltersState['dateMode'])
                }
              >
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
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => updateFilter('status', value as StatusOption)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select
                value={filters.vendedor && filters.vendedor.length > 0 ? filters.vendedor : 'all'}
                onValueChange={(value) =>
                  updateFilter('vendedor', value === 'all' ? '' : (value as string))
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {vendedores.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.nome}>
                      {vendedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Use para fechamento de comissão por vendedor. A lista vem automaticamente do cadastro.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Designer</Label>
              <Select
                value={filters.designer && filters.designer.length > 0 ? filters.designer : 'all'}
                onValueChange={(value) =>
                  updateFilter('designer', value === 'all' ? '' : (value as string))
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione um designer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {designers.map((designer) => (
                    <SelectItem key={designer.id} value={designer.nome}>
                      {designer.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Combine com o vendedor para fechar comissão por par vendedor/designer.
              </p>
            </div>

            <div className="flex flex-col gap-2 md:justify-end">
              <Button
                className="w-full gap-2"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {loading ? 'Gerando...' : 'Gerar Relatório'}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
                onClick={exportToPdf}
                disabled={!report || loading}
              >
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredReport ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-white text-slate-900">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-lg font-semibold">{filteredReport.title}</CardTitle>
              <span className="text-base text-slate-500">Página {filteredReport.page}</span>
            </div>
            <div className="mt-3 grid gap-2 text-base text-slate-500 md:grid-cols-4">
              <div>{filteredReport.period_label}</div>
              <div>{filteredReport.status_label}</div>
              <div>Tipo: {filteredReport.report_type.replace(/_/g, ' ').toUpperCase()}</div>
              <div className="md:text-right">Emitido em: {filteredReport.generated_at}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 bg-slate-50 py-6">
            {filteredReport.groups.length === 0 ? (
              <div className="rounded border border-dashed border-slate-200 bg-white py-12 text-center text-muted-foreground">
                {nomeFilter.trim() 
                  ? 'Nenhum resultado encontrado para o filtro de nome selecionado.'
                  : 'Nenhum dado encontrado para os filtros selecionados.'}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredReport.groups.map((group, index) => renderGroup(group, 0, `root-${index}`))}
              </div>
            )}

            <div className="rounded border border-slate-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-100 px-6 py-3 text-base text-slate-700 md:flex-row md:items-center md:justify-between">
                <span>Total do período</span>
                <span className="font-semibold text-slate-900">
                  Frete: {formatCurrency(filteredReport.total.valor_frete)} | Serviços:{' '}
                  {formatCurrency(filteredReport.total.valor_servico)}
                </span>
              </div>
              <div className="bg-slate-50 px-6 py-3 text-base text-slate-500">
                Relatório analítico clássico em conformidade com fechamento produtivo.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-slate-200 bg-slate-50">
          <CardContent className="py-16 text-center text-muted-foreground">
            Configure os filtros e clique em <strong>Gerar Relatório</strong> para visualizar os dados.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
