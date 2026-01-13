import { useState, useMemo } from 'react';
import { Loader2, RefreshCcw, FileDown, FileText, X } from 'lucide-react';
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
import { ReportRequestPayload, ReportResponse, ReportGroup, ReportTypeKey } from '@/types';
import { openPdfInWindow } from '@/utils/exportUtils';

// Lazy load de bibliotecas pesadas
const loadJsPDF = async () => {
  const module = await import('jspdf');
  return module.default;
};

const loadAutoTable = async () => {
  const module = await import('jspdf-autotable');
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
    { value: 'analitico_cliente_painel', label: 'Cliente × Tecido' },
    { value: 'analitico_designer_painel', label: 'Designer × Tecido' },
    { value: 'analitico_entrega_painel', label: 'Entrega × Tecido' },
  ],
  sintetico: [
    { value: 'sintetico_data', label: 'Por Data' },
    { value: 'sintetico_vendedor', label: 'Por Vendedor' },
    { value: 'sintetico_designer', label: 'Por Designer' },
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

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10);

// Componente de Tabela de Resultados
interface ReportTableProps {
  report: ReportResponse;
  columnName: string;
  loading: boolean;
}

function ReportTable({ report, columnName, loading }: ReportTableProps) {
  if (!report || !report.groups || report.groups.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-base text-muted-foreground">
        Nenhum dado encontrado para os filtros selecionados.
      </div>
    );
  }

  // Coletar todas as linhas de todos os grupos
  const allRows: Array<{
    label: string;
    valor_frete: number;
    valor_servico: number;
    total: number;
  }> = [];

  const collectRows = (group: ReportGroup) => {
    // Se o grupo tem subgrupos (relatórios analíticos), processar subgrupos
    if (group.subgroups && group.subgroups.length > 0) {
      group.subgroups.forEach((subgroup) => {
        allRows.push({
          label: subgroup.label,
          valor_frete: subgroup.subtotal.valor_frete,
          valor_servico: subgroup.subtotal.valor_servico,
          total: subgroup.subtotal.valor_frete + subgroup.subtotal.valor_servico,
        });
      });
    } else if (group.subtotal) {
      // Grupo principal sem subgrupos (relatórios sintéticos)
      allRows.push({
        label: group.label,
        valor_frete: group.subtotal.valor_frete,
        valor_servico: group.subtotal.valor_servico,
        total: group.subtotal.valor_frete + group.subtotal.valor_servico,
      });
    }
  };

  report.groups.forEach((group) => {
    collectRows(group);
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
                  {loading && allRows.length === 0 ? (
                    <>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
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
                      {allRows.map((row, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-muted/50 transition-all duration-200"
                        >
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
                      {/* Linha de total geral */}
                      {report.total && (
                        <TableRow className="bg-slate-100 font-semibold">
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base font-bold">
                            TOTAL GERAL
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base font-bold">
                            {formatCurrency(report.total.valor_frete)}
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base font-bold">
                            {formatCurrency(report.total.valor_servico)}
                          </TableCell>
                          <TableCell className="px-2 lg:px-3 xl:px-4 text-right text-[10px] sm:text-xs lg:text-sm xl:text-base font-bold">
                            {formatCurrency(report.total.valor_frete + report.total.valor_servico)}
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
  const [dateMode, setDateMode] = useState<'entrada' | 'entrega' | 'qualquer'>('entrega');
  const [status, setStatus] = useState<string>(STATUS_OPTIONS[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string>('');

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
    setDateError('');
    setReport(null);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      status !== STATUS_OPTIONS[0] ||
      reportType !== REPORT_OPTIONS.analitico[0].value ||
      startDate !== formatInputDate(firstDayOfMonth) ||
      endDate !== formatInputDate(today) ||
      dateMode !== 'entrega'
    );
  }, [status, reportType, startDate, endDate, dateMode, firstDayOfMonth, today]);

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
      };

      const response = await api.generateReport(payload);
      setReport(response);
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

    setExportingCsv(true);
    try {
      const Papa = await import('papaparse');
      const csvRows: Array<Record<string, string>> = [];

      const columnName = getColumnName();
      csvRows.push({
        [columnName]: columnName,
        'Valor Frete': 'Valor Frete',
        'Valor Serviços': 'Valor Serviços',
        'Total': 'Total',
      });

      report.groups.forEach((group) => {
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

      if (report.total) {
        const totalGeral = report.total.valor_frete + report.total.valor_servico;
        csvRows.push({
          [columnName]: 'TOTAL GERAL',
        'Valor Frete': formatCurrency(report.total.valor_frete),
          'Valor Serviços': formatCurrency(report.total.valor_servico),
        'Total': formatCurrency(totalGeral),
        });
      }

      const csv = Papa.default.unparse(csvRows, {
        header: true,
        delimiter: ';',
        newline: '\n',
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const filenameSuffix =
        startDate && endDate && endDate !== startDate
          ? `${startDate}_${endDate}`
          : startDate || new Date().toISOString().split('T')[0];
      const filename = `relatorio_fechamentos_${reportType}_${filenameSuffix}.csv`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Falha ao exportar CSV',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao exportar o CSV.',
        variant: 'destructive',
      });
    } finally {
      setExportingCsv(false);
    }
  };

  // Função para exportar para PDF
  const exportToPdf = async () => {
    if (!report || !report.groups || report.groups.length === 0) {
      toast({
        title: 'Nenhum relatório disponível',
        description: 'Gere um relatório antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    setExportingPdf(true);
    try {
      const [jsPDF, autoTable] = await Promise.all([loadJsPDF(), loadAutoTable()]);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let cursorY = 22;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Relatório de Fechamentos', 14, cursorY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      cursorY += 8;
      doc.text(`Tipo: ${getColumnName()}`, 14, cursorY);
      cursorY += 6;
      if (report.period_label) {
        doc.text(`Período: ${report.period_label}`, 14, cursorY);
        cursorY += 6;
      }
      if (report.status_label) {
        doc.text(`Status: ${report.status_label}`, 14, cursorY);
        cursorY += 6;
      }
      if (report.generated_at) {
        doc.text(`Gerado em: ${report.generated_at}`, 14, cursorY);
      }
      cursorY += 8;

      const tableData: string[][] = [];
      report.groups.forEach((group) => {
        if (group.subgroups && group.subgroups.length > 0) {
          group.subgroups.forEach((subgroup) => {
            const total = subgroup.subtotal.valor_frete + subgroup.subtotal.valor_servico;
            tableData.push([
              subgroup.label,
              formatCurrency(subgroup.subtotal.valor_frete),
              formatCurrency(subgroup.subtotal.valor_servico),
              formatCurrency(total),
            ]);
          });
        } else if (group.subtotal) {
          const total = group.subtotal.valor_frete + group.subtotal.valor_servico;
          tableData.push([
            group.label,
            formatCurrency(group.subtotal.valor_frete),
            formatCurrency(group.subtotal.valor_servico),
            formatCurrency(total),
          ]);
        }
      });

      if (report.total) {
        const totalGeral = report.total.valor_frete + report.total.valor_servico;
        tableData.push([
          'TOTAL GERAL',
          formatCurrency(report.total.valor_frete),
          formatCurrency(report.total.valor_servico),
          formatCurrency(totalGeral),
        ]);
      }

      autoTable(doc, {
        startY: cursorY,
        head: [[getColumnName(), 'Valor Frete', 'Valor Serviços', 'Total']],
        body: tableData,
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          textColor: 0,
        },
        alternateRowStyles: {
          fillColor: [248, 248, 252],
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'right', cellWidth: 40 },
          2: { halign: 'right', cellWidth: 40 },
          3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      });

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
          {/* Botão de limpar filtros */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="gap-2"
                title="Limpar todos os filtros"
              >
                <X className="h-4 w-4" />
                Limpar Filtros
              </Button>
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

          {/* Filtros de data, status */}
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
                  <SelectItem value="qualquer">Qualquer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => updateFilter('status', value)}>
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
          </div>

          {/* Botões de ação principais */}
          <Separator />

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
        report && <ReportTable report={report} columnName={getColumnName()} loading={loading} />
      )}
    </div>
  );
}
