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

const ANALYTICAL_OPTIONS: Array<{ value: ReportTypeKey; label: string }> = [
  { value: 'analitico_designer_cliente', label: 'Analítico / Designer × Cliente' },
  { value: 'analitico_cliente_designer', label: 'Analítico / Cliente × Designer' },
  { value: 'analitico_cliente_painel', label: 'Analítico / Cliente × Painel' },
  { value: 'analitico_designer_painel', label: 'Analítico / Designer × Painel' },
  { value: 'analitico_entrega_painel', label: 'Analítico / Entrega × Painel' },
];

const SYNTHETIC_OPTIONS: Array<{ value: ReportTypeKey; label: string }> = [
  { value: 'sintetico_data', label: 'Sintético por Data' },
  { value: 'sintetico_designer', label: 'Sintético por Designer' },
  { value: 'sintetico_cliente', label: 'Sintético por Cliente' },
  { value: 'sintetico_entrega', label: 'Sintético por Forma de Entrega' },
];

const STATUS_OPTIONS = ['Todos', 'Pendente', 'Em Processamento', 'Concluído', 'Cancelado'] as const;

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
  const [reportType, setReportType] = useState<ReportTypeKey>('analitico_designer_cliente');
  const [startDate, setStartDate] = useState<string>(formatInputDate(firstDayOfMonth));
  const [endDate, setEndDate] = useState<string>(formatInputDate(today));
  const [status, setStatus] = useState<string>('Todos');
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<ReportResponse | null>(null);

  const availableOptions = useMemo(
    () => (activeTab === 'analitico' ? ANALYTICAL_OPTIONS : SYNTHETIC_OPTIONS),
    [activeTab],
  );

  useEffect(() => {
    if (!availableOptions.some((option) => option.value === reportType)) {
      setReportType(availableOptions[0].value);
    }
  }, [activeTab, availableOptions, reportType]);

  const handleGenerate = async () => {
    const payload: ReportRequestPayload = {
      report_type: reportType,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: status || undefined,
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

    doc.save('relatorio_servicos.pdf');
  };

  const renderGroup = (group: ReportGroup, depth = 0, path = group.key): JSX.Element => {
    const marginLeft = depth * 16;

    return (
      <div key={path} className="space-y-3">
        <div
          className="flex items-center justify-between bg-slate-900 text-slate-50 px-4 py-2 shadow-sm uppercase tracking-[0.24em] text-[11px]"
          style={{ marginLeft }}
        >
          <span>{group.label}</span>
          <span className="font-semibold tracking-[0.12em]">
            Frete: {formatCurrency(group.subtotal.valor_frete)} | Serviços: {formatCurrency(group.subtotal.valor_servico)}
          </span>
        </div>

        {group.subgroups && group.subgroups.length > 0 ? (
          <div className="space-y-4">
            {group.subgroups.map((subgroup, index) =>
              renderGroup(subgroup, depth + 1, `${path}-${index}`),
            )}
          </div>
        ) : group.rows && group.rows.length > 0 ? (
          <div
            className="overflow-hidden rounded border border-slate-300 bg-white shadow-sm"
            style={{ marginLeft }}
          >
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-200 text-slate-700 uppercase tracking-[0.18em] text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Ficha</th>
                  <th className="px-4 py-2 text-left">Descrição</th>
                  <th className="px-4 py-2 text-right">Valor Frete</th>
                  <th className="px-4 py-2 text-right">Valor Serviços</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, index) => (
                  <tr
                    key={`${path}-row-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-4 py-2 font-semibold text-slate-900">{row.ficha}</td>
                    <td className="px-4 py-2 text-slate-800">{row.descricao}</td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {formatCurrency(row.valor_frete)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900">
                      {formatCurrency(row.valor_servico)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-slate-50">
                  <td className="px-4 py-2 text-right font-semibold" colSpan={2}>
                    Subtotal do Grupo
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {formatCurrency(group.subtotal.valor_frete)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {formatCurrency(group.subtotal.valor_servico)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div
            className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500"
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
          Gere relatórios analíticos e sintéticos com visão clássica de fábrica/ERP.
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

            <TabsContent value="analitico" className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tipo de Relatório</Label>
                  <Select
                    value={reportType}
                    onValueChange={(value) => setReportType(value as ReportTypeKey)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYTICAL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sintetico" className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tipo de Relatório</Label>
                  <Select
                    value={reportType}
                    onValueChange={(value) => setReportType(value as ReportTypeKey)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {SYNTHETIC_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Data Inicial (Entrada)</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final (Entrada)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
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

            <div className="flex items-end gap-4">
              <Button
                className="w-full gap-2 bg-slate-900 text-white hover:bg-slate-800"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {loading ? 'Gerando...' : 'Gerar Relatório'}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 border-slate-400 text-slate-800 hover:bg-slate-100"
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
        <Card className="border-slate-300 shadow-lg">
          <CardHeader className="bg-slate-900 text-slate-50">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-lg font-semibold tracking-[0.22em] uppercase">
                {report.title}
              </CardTitle>
              <span className="text-xs uppercase tracking-[0.24em]">
                Pág: {report.page}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs tracking-[0.18em] md:grid-cols-4">
              <div>{report.period_label}</div>
              <div>{report.status_label}</div>
              <div>Tipo: {report.report_type.replace(/_/g, ' ').toUpperCase()}</div>
              <div className="md:text-right">Emitido em: {report.generated_at}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 bg-slate-50 py-6">
            {report.groups.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 bg-white py-12 text-center text-muted-foreground">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-8">
                {report.groups.map((group, index) => renderGroup(group, 0, `root-${index}`))}
              </div>
            )}

            <div className="rounded border border-slate-400 bg-white">
              <div className="flex flex-col gap-2 border-b border-slate-300 bg-slate-900 px-6 py-3 text-xs uppercase tracking-[0.24em] text-slate-50 md:flex-row md:items-center md:justify-between">
                <span>Total Geral do Período</span>
                <span>
                  Frete: {formatCurrency(report.total.valor_frete)} | Serviços:{' '}
                  {formatCurrency(report.total.valor_servico)}
                </span>
              </div>
              <div className="bg-slate-100 px-6 py-3 text-xs tracking-[0.12em] text-slate-600">
                Relatório analítico clássico em conformidade com fechamento produtivo.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-slate-300 bg-slate-50">
          <CardContent className="py-16 text-center text-muted-foreground">
            Configure os filtros e clique em <strong>Gerar Relatório</strong> para visualizar os dados.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
