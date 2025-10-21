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

const REPORT_OPTIONS: Record<
  'analitico' | 'sintetico',
  Array<{ value: ReportTypeKey; label: string }>
> = {
  analitico: [
    { value: 'analitico_designer_cliente', label: 'Designer × Cliente' },
    { value: 'analitico_cliente_designer', label: 'Cliente × Designer' },
    { value: 'analitico_cliente_painel', label: 'Cliente × Painel' },
    { value: 'analitico_designer_painel', label: 'Designer × Painel' },
    { value: 'analitico_entrega_painel', label: 'Entrega × Painel' },
  ],
  sintetico: [
    { value: 'sintetico_data', label: 'Por Data' },
    { value: 'sintetico_designer', label: 'Por Designer' },
    { value: 'sintetico_cliente', label: 'Por Cliente' },
    { value: 'sintetico_entrega', label: 'Por Forma de Entrega' },
  ],
};

const STATUS_OPTIONS = ['Todos', 'Pendente', 'Em Processamento', 'Concluído', 'Cancelado'] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];
type FiltersState = {
  reportType: ReportTypeKey;
  startDate: string;
  endDate: string;
  status: StatusOption;
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
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<ReportResponse | null>(null);

  const availableOptions = useMemo(() => REPORT_OPTIONS[activeTab], [activeTab]);

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

  const exportToPdf = () => {
    if (!report) return;

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

    const triggerDownload = () => {
      doc.save(filename);
    };

    try {
      if (typeof doc.autoPrint === 'function') {
        doc.autoPrint({ variant: 'non-conform' });
      }
    } catch (error) {
      console.warn('Falha ao preparar impressão automática, realizando download direto.', error);
      triggerDownload();
      return;
    }

    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;

      const cleanup = () => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      };

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          const printResult = iframe.contentWindow?.print() as unknown;
          if (typeof printResult === 'boolean' && printResult === false) {
            throw new Error('Impressão bloqueada pelo navegador');
          }
          setTimeout(cleanup, 1000);
        } catch (printError) {
          console.warn('Impressão automática indisponível, baixando PDF.', printError);
          cleanup();
          triggerDownload();
        }
      };

      iframe.onerror = () => {
        cleanup();
        triggerDownload();
      };

      document.body.appendChild(iframe);
    } catch (error) {
      console.error('Erro ao exportar relatório de fechamentos:', error);
      triggerDownload();
    }
  };

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

      {report ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-white text-slate-900">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-lg font-semibold">{report.title}</CardTitle>
              <span className="text-base text-slate-500">Página {report.page}</span>
            </div>
            <div className="mt-3 grid gap-2 text-base text-slate-500 md:grid-cols-4">
              <div>{report.period_label}</div>
              <div>{report.status_label}</div>
              <div>Tipo: {report.report_type.replace(/_/g, ' ').toUpperCase()}</div>
              <div className="md:text-right">Emitido em: {report.generated_at}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 bg-slate-50 py-6">
            {report.groups.length === 0 ? (
              <div className="rounded border border-dashed border-slate-200 bg-white py-12 text-center text-muted-foreground">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-6">
                {report.groups.map((group, index) => renderGroup(group, 0, `root-${index}`))}
              </div>
            )}

            <div className="rounded border border-slate-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-100 px-6 py-3 text-base text-slate-700 md:flex-row md:items-center md:justify-between">
                <span>Total do período</span>
                <span className="font-semibold text-slate-900">
                  Frete: {formatCurrency(report.total.valor_frete)} | Serviços:{' '}
                  {formatCurrency(report.total.valor_servico)}
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
