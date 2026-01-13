import { useState, useMemo } from 'react';
import { Loader2, Calendar, Search, FileDown, FileText } from 'lucide-react';
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

type SinteticoType = 'data' | 'vendedor' | 'designer' | 'cliente' | 'envio';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatCurrency = (value: number) => currencyFormatter.format(value || 0);

export default function Fechamentos() {
  const { toast } = useToast();
  const [sinteticoType, setSinteticoType] = useState<SinteticoType>('data');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateMode, setDateMode] = useState<string>('entrada');
  const [status, setStatus] = useState<string>('Todos');
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);

  // Mapear tipo sintético para ReportTypeKey
  const getReportType = (): ReportTypeKey => {
    switch (sinteticoType) {
      case 'data':
        return 'sintetico_data';
      case 'vendedor':
        return 'sintetico_vendedor';
      case 'designer':
        return 'sintetico_designer';
      case 'cliente':
        return 'sintetico_cliente';
      case 'envio':
        return 'sintetico_entrega';
      default:
        return 'sintetico_data';
    }
  };

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
        report_type: getReportType(),
        start_date: startDate,
        end_date: endDate,
        date_mode: dateMode as 'entrada' | 'entrega' | 'qualquer',
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

  // Função para obter o nome da coluna baseado no tipo
  const getColumnName = () => {
    switch (sinteticoType) {
      case 'data':
        return 'Data';
      case 'vendedor':
        return 'Vendedor';
      case 'designer':
        return 'Designer';
      case 'cliente':
        return 'Cliente';
      case 'envio':
        return 'Forma de Envio';
      default:
        return 'Grupo';
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

      // Adicionar cabeçalho
      const columnName = getColumnName();
      csvRows.push({
        [columnName]: columnName,
        'Valor Frete': 'Valor Frete',
        'Valor Serviços': 'Valor Serviços',
        'Total': 'Total',
      });

      // Adicionar dados dos grupos
      report.groups.forEach((group) => {
        if (group.subtotal) {
          const total = group.subtotal.valor_frete + group.subtotal.valor_servico;
          csvRows.push({
            [columnName]: group.label,
            'Valor Frete': formatCurrency(group.subtotal.valor_frete),
            'Valor Serviços': formatCurrency(group.subtotal.valor_servico),
            'Total': formatCurrency(total),
          });
        }
      });

      // Adicionar linha de total geral
      if (report.total) {
        const totalGeral = report.total.valor_frete + report.total.valor_servico;
        csvRows.push({
          [columnName]: 'TOTAL GERAL',
        'Valor Frete': formatCurrency(report.total.valor_frete),
          'Valor Serviços': formatCurrency(report.total.valor_servico),
        'Total': formatCurrency(totalGeral),
        });
      }

      // Gerar CSV
      const csv = Papa.default.unparse(csvRows, {
        header: true,
        delimiter: ';',
        newline: '\n',
      });

      // Criar blob e fazer download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const filenameSuffix =
        startDate && endDate && endDate !== startDate
          ? `${startDate}_${endDate}`
          : startDate || new Date().toISOString().split('T')[0];
      const filename = `relatorio_fechamentos_${sinteticoType}_${filenameSuffix}.csv`;
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

      // Cabeçalho
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

      // Preparar dados da tabela
      const tableData: string[][] = [];
      report.groups.forEach((group) => {
        if (group.subtotal) {
          const total = group.subtotal.valor_frete + group.subtotal.valor_servico;
          tableData.push([
            group.label,
            formatCurrency(group.subtotal.valor_frete),
            formatCurrency(group.subtotal.valor_servico),
            formatCurrency(total),
          ]);
        }
      });

      // Adicionar linha de total geral
      if (report.total) {
        const totalGeral = report.total.valor_frete + report.total.valor_servico;
        tableData.push([
          'TOTAL GERAL',
          formatCurrency(report.total.valor_frete),
          formatCurrency(report.total.valor_servico),
          formatCurrency(totalGeral),
        ]);
      }

      // Gerar tabela
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
      const filename = `relatorio_fechamentos_${sinteticoType}_${filenameSuffix}.pdf`;

      // Abrir PDF em nova janela
      try {
        await openPdfInWindow(doc, filename);
      } catch (error) {
        // Fallback: download direto
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

  // Renderizar tabela com os grupos do relatório
  const renderTable = () => {
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

      report.groups.forEach((group) => {
      // Se o grupo tem subtotais, usar o subtotal
      if (group.subtotal) {
        allRows.push({
          label: group.label,
          valor_frete: group.subtotal.valor_frete,
          valor_servico: group.subtotal.valor_servico,
          total: group.subtotal.valor_frete + group.subtotal.valor_servico,
        });
      }
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
                        <div className="flex items-center">
                          {sinteticoType === 'data' && 'Data'}
                          {sinteticoType === 'vendedor' && 'Vendedor'}
                          {sinteticoType === 'designer' && 'Designer'}
                          {sinteticoType === 'cliente' && 'Cliente'}
                          {sinteticoType === 'envio' && 'Forma de Envio'}
              </div>
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
  };

  return (
    <div className="space-y-6">
        <div>
        <h1 className="text-3xl font-semibold text-slate-900">Fechamentos</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Relatórios sintéticos de fechamentos. Selecione o tipo de agrupamento e os filtros para gerar o relatório.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="sintetico_type">Tipo de Relatório</Label>
              <Select value={sinteticoType} onValueChange={(value) => setSinteticoType(value as SinteticoType)}>
                <SelectTrigger id="sintetico_type" className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">Por Data</SelectItem>
                  <SelectItem value="vendedor">Por Vendedor</SelectItem>
                  <SelectItem value="designer">Por Designer</SelectItem>
                  <SelectItem value="cliente">Por Cliente</SelectItem>
                  <SelectItem value="envio">Por Forma de Envio</SelectItem>
                </SelectContent>
              </Select>
          </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Inicial</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data Final</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_mode">Modo de Data</Label>
              <Select value={dateMode} onValueChange={setDateMode}>
                <SelectTrigger id="date_mode" className="w-full">
                  <SelectValue placeholder="Selecione o modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="entrega">Entrega</SelectItem>
                  <SelectItem value="qualquer">Qualquer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Processamento">Em Processamento</SelectItem>
                  <SelectItem value="Concluido">Concluído</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
          <div className="mt-4 flex justify-end">
              <Button
              onClick={handleGenerate}
              disabled={loading}
              className="min-w-[120px]"
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </>
              )}
              </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading && !report ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-600">Gerando relatório...</span>
        </div>
      ) : (
        report && (
          <div className="space-y-4">
            {/* Botões de exportação */}
            <div className="flex justify-end gap-2">
              <Button
                onClick={exportToCsv}
                disabled={exportingCsv || !report}
                variant="outline"
                type="button"
            >
                {exportingCsv ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar CSV
                </>
              )}
            </Button>
              <Button
                onClick={exportToPdf}
                disabled={exportingPdf || !report}
                variant="outline"
                type="button"
              >
                {exportingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                    </>
                  ) : (
                    <>
                    <FileText className="mr-2 h-4 w-4" />
                    Imprimir PDF
                    </>
                  )}
              </Button>
                </div>
            {renderTable()}
              </div>
        )
      )}
    </div>
  );
}
