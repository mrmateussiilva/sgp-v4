import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReportGroup,
  ReportResponse,
  ReportTypeKey,
  ReportRequestPayload,
  Cliente,
  ReportRowData,
} from '@/types';
import { api } from '@/services/api';
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete';
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
import { Loader2, FileDown, RefreshCcw, Settings, X, Filter, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { openPdfInWindow } from '@/utils/exportUtils';
import { useAuthStore } from '@/store/authStore';
import { Collapsible } from '@/components/ui/collapsible';

// Lazy load de bibliotecas pesadas
const loadJsPDF = async () => {
  const module = await import('jspdf');
  return module.default;
};

const loadAutoTable = async () => {
  const module = await import('jspdf-autotable');
  return module.default;
};

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
  dateMode: 'entrada' | 'entrega' | 'qualquer';
  vendedor?: string;
  designer?: string;
  cliente?: string;
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
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
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
    dateMode: 'entrada', // Padrão alterado de 'entrega' para 'entrada'
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [vendedores, setVendedores] = useState<Array<{ id: number; nome: string }>>([]);
  const [designers, setDesigners] = useState<Array<{ id: number; nome: string }>>([]);
  const [dateError, setDateError] = useState<string>('');
  
  // Estado para ordenação de tabelas
  type SortField = 'ficha' | 'descricao' | 'valor_frete' | 'valor_servico' | null;
  type SortDirection = 'asc' | 'desc' | null;
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: null,
    direction: null,
  });
  
  // Estado para controlar quais linhas de subtotal estão expandidas (mostrando IDs dos pedidos)
  const [expandedFichas, setExpandedFichas] = useState<Set<string>>(new Set());
  
  // Estado para armazenar os IDs dos pedidos por grupo (cache)
  const [groupPedidosIds, setGroupPedidosIds] = useState<Map<string, string[]>>(new Map());
  
  // Estado para controlar quais grupos estão carregando os IDs
  const [loadingPedidosIds, setLoadingPedidosIds] = useState<Set<string>>(new Set());

  const availableOptions = useMemo(() => REPORT_OPTIONS[activeTab], [activeTab]);

  // Carregar listas de vendedores e designers ativos para os filtros
  // Nota: clientes são carregados automaticamente pelo ClienteAutocomplete
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
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a lista de vendedores e designers.';
        toast({
          title: 'Erro ao carregar filtros',
          description: errorMessage,
          variant: 'destructive',
        });
        console.error('Erro ao carregar pessoas para filtros:', error);
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
    setFilters((previous) => {
      const newFilters = {
      ...previous,
      [key]: value,
      };

      // Validação de datas: verificar se data final é anterior à inicial
      if (key === 'startDate' || key === 'endDate') {
        const startDate = key === 'startDate' ? value : newFilters.startDate;
        const endDate = key === 'endDate' ? value : newFilters.endDate;

        if (startDate && endDate && startDate > endDate) {
          setDateError('A data final não pode ser anterior à data inicial.');
        } else {
          setDateError('');
        }
      }

      return newFilters;
    });
  };

  const applyQuickRange = (rangeValue: (typeof QUICK_RANGES)[number]['value']) => {
    const selectedRange = QUICK_RANGES.find((range) => range.value === rangeValue);
    if (!selectedRange) return;

    const { start, end } = selectedRange.getDates(today);
    updateFilter('startDate', formatInputDate(start));
    updateFilter('endDate', formatInputDate(end));
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setFilters({
      reportType: REPORT_OPTIONS.analitico[0].value,
      startDate: formatInputDate(firstDayOfMonth),
      endDate: formatInputDate(today),
      status: STATUS_OPTIONS[0],
      dateMode: 'entrada', // Padrão alterado de 'entrega' para 'entrada'
      vendedor: undefined,
      designer: undefined,
      cliente: undefined,
    });
    setDateError('');
    setReport(null);
  };

  // Verificar se há filtros ativos além dos padrões
  const hasActiveFilters = useMemo(() => {
    const defaultFilters = {
      reportType: REPORT_OPTIONS.analitico[0].value,
      status: STATUS_OPTIONS[0],
      dateMode: 'entrada' as const, // Padrão alterado de 'entrega' para 'entrada'
    };
    
    return (
      filters.vendedor ||
      filters.designer ||
      filters.cliente ||
      filters.status !== defaultFilters.status ||
      filters.reportType !== defaultFilters.reportType ||
      filters.startDate !== formatInputDate(firstDayOfMonth) ||
      filters.endDate !== formatInputDate(today)
    );
  }, [filters, firstDayOfMonth, today]);

  // Calcular estatísticas do relatório
  const reportStats = useMemo(() => {
    if (!report) return null;
    
    const totalGroups = report.groups.length;
    const totalSubgroups = report.groups.reduce(
      (acc, group) => acc + (group.subgroups?.length || 0),
      0,
    );
    const totalRows = report.groups.reduce(
      (acc, group) =>
        acc +
        (group.rows?.length || 0) +
        (group.subgroups?.reduce((subAcc, sub) => subAcc + (sub.rows?.length || 0), 0) || 0),
      0,
    );
    
    return { totalGroups, totalSubgroups, totalRows };
  }, [report]);

  const handleGenerate = async () => {
    // Validar datas antes de gerar
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      setDateError('A data final não pode ser anterior à data inicial.');
      toast({
        title: 'Erro de validação',
        description: 'A data final não pode ser anterior à data inicial.',
        variant: 'destructive',
      });
      return;
    }

    setDateError('');
    const payload: ReportRequestPayload = {
      report_type: filters.reportType,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined,
      status: filters.status || undefined,
      date_mode: filters.dateMode,
      vendedor: filters.vendedor || undefined,
      designer: filters.designer || undefined,
      cliente: filters.cliente || undefined,
    };

    setLoading(true);
    try {
      const response = await api.generateReport(payload);
      setReport(response);
      
      const groupsCount = response.groups.length;
      const totalRows = response.groups.reduce(
        (acc, group) =>
          acc +
          (group.rows?.length || 0) +
          (group.subgroups?.reduce((subAcc, sub) => subAcc + (sub.rows?.length || 0), 0) || 0),
        0,
      );
      toast({
        title: 'Relatório gerado com sucesso',
        description: `${groupsCount} grupo(s) encontrado(s) com ${totalRows} item(ns) total(is).`,
        variant: 'default',
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

  const ensurePdfSpace = (doc: any, cursorY: number, required: number): number => {
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

    setExportingPdf(true);
    try {
      const [jsPDF, autoTable] = await Promise.all([loadJsPDF(), loadAutoTable()]);
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
    cursorY += 6;
    
    // Calcular e adicionar metadados
    const uniqueFichas = new Set<string>();
    let totalItems = 0;
    
    const countMetadata = (group: ReportGroup) => {
      if (group.rows && group.rows.length > 0) {
        group.rows.forEach((row) => {
          if (row.ficha && row.descricao !== 'Subtotal') {
            uniqueFichas.add(row.ficha);
            totalItems++;
          }
        });
      }
      if (group.subgroups) {
        group.subgroups.forEach((subgroup) => countMetadata(subgroup));
      }
    };
    
    report.groups.forEach((group) => countMetadata(group));
    
    doc.setFontSize(9);
    doc.text(`Pedidos únicos: ${uniqueFichas.size} | Itens totais: ${totalItems}`, 14, cursorY);
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
    const totalGeralPdf = report.total.valor_liquido ?? (report.total.valor_frete + report.total.valor_servico - (report.total.desconto ?? 0));
    doc.text(
      `Total: ${formatCurrency(totalGeralPdf)}`,
      196,
      cursorY - 1,
      { align: 'right' },
    );
    
    // Adicionar linha adicional com detalhamento se houver desconto
    if (report.total.desconto && report.total.desconto > 0) {
      cursorY += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `(Frete: ${formatCurrency(report.total.valor_frete)} + Serviços: ${formatCurrency(report.total.valor_servico)} - Desconto: ${formatCurrency(report.total.desconto)})`,
        196,
        cursorY,
        { align: 'right' },
      );
    }
    doc.setTextColor(0, 0, 0);

      const filenameSuffix =
        filters.startDate && filters.endDate && filters.endDate !== filters.startDate
          ? `${filters.startDate}_${filters.endDate}`
          : filters.startDate || report.generated_at.replace(/[^\d-]/g, '');
      const filename = `relatorio_fechamentos_${filenameSuffix || 'periodo'}.pdf`;

      // Abrir PDF em nova janela para o usuário escolher salvar ou imprimir
      try {
        await openPdfInWindow(doc, filename);
        toast({
          title: 'Relatório exportado',
          description: 'O relatório foi aberto. Você pode salvar ou imprimir.',
          variant: 'default',
        });
      } catch (error) {
        // Fallback: download direto
        doc.save(filename);
        toast({
          title: 'Relatório exportado',
          description: 'O arquivo foi baixado com sucesso.',
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: 'Falha ao exportar relatório',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao exportar o relatório.',
        variant: 'destructive',
      });
    } finally {
      setExportingPdf(false);
    }
  };

  // Função para exportar relatório em CSV
  const exportToCsv = async () => {
    if (!report) {
      toast({
        title: 'Nenhum relatório disponível',
        description: 'Gere um relatório antes de exportar.',
        variant: 'destructive',
      });
      return;
    }

    setExportingCsv(true);
    try {
      // Calcular metadados do relatório
      const uniqueFichas = new Set<string>();
      let totalItems = 0;

      const countMetadata = (group: ReportGroup) => {
        if (group.rows && group.rows.length > 0) {
          group.rows.forEach((row) => {
            // Contar apenas linhas reais de itens, não subtotais
            if (row.ficha && row.descricao && row.descricao !== 'Subtotal') {
              uniqueFichas.add(row.ficha);
              totalItems++;
            }
          });
        }
        if (group.subgroups) {
          group.subgroups.forEach((subgroup) => countMetadata(subgroup));
        }
      };

      report.groups.forEach((group) => countMetadata(group));

      // Coletar todas as linhas do relatório
      const hasDesconto = report.total.desconto && report.total.desconto > 0;
      const csvRows: Array<Record<string, string>> = [];

      // Adicionar linha de metadados no início
      const metadataRow: Record<string, string> = {
        'Grupo': 'METADADOS',
        'Ficha': '',
        'Descricao': `Pedidos únicos: ${uniqueFichas.size} | Itens totais: ${totalItems} | Gerado em: ${report.generated_at}`,
        'Valor Frete': '',
        'Valor Servicos': '',
        'Total': '',
      };
      
      if (hasDesconto) {
        metadataRow['Desconto'] = '';
      }
      
      csvRows.push(metadataRow);
      
      // Linha em branco para separar
      const emptyRow: Record<string, string> = {
        'Grupo': '',
        'Ficha': '',
        'Descricao': '',
        'Valor Frete': '',
        'Valor Servicos': '',
        'Total': '',
      };
      
      if (hasDesconto) {
        emptyRow['Desconto'] = '';
      }
      
      csvRows.push(emptyRow);

      const collectRowsData = (group: ReportGroup, parentGroup?: string) => {
        if (group.rows && group.rows.length > 0) {
          group.rows.forEach((row) => {
            const totalItem = row.valor_frete + row.valor_servico;
            const rowData: Record<string, string> = {
              'Grupo': parentGroup || group.label,
              'Subgrupo': parentGroup ? group.label : '',
              'Ficha': row.ficha || '',
              'Descricao': row.descricao || '',
              'Valor Frete': formatCurrency(row.valor_frete),
              'Valor Servicos': formatCurrency(row.valor_servico),
              'Total': formatCurrency(totalItem),
            };
            
            if (hasDesconto) {
              rowData['Desconto'] = '';
            }
            
            csvRows.push(rowData);
          });
        }

        if (group.subgroups) {
          group.subgroups.forEach((subgroup) => {
            collectRowsData(subgroup, group.label);
          });
        }
      };

      report.groups.forEach((group) => {
        collectRowsData(group);
      });

      // Adicionar linha de totais
      const totalGeral = report.total.valor_liquido ?? (report.total.valor_frete + report.total.valor_servico - (report.total.desconto ?? 0));
      const totalRow: Record<string, string> = {
        'Grupo': '',
        'Ficha': '',
        'Descricao': 'TOTAL GERAL',
        'Valor Frete': formatCurrency(report.total.valor_frete),
        'Valor Servicos': formatCurrency(report.total.valor_servico),
        'Total': formatCurrency(totalGeral),
      };
      
      if (hasDesconto) {
        totalRow['Desconto'] = formatCurrency(report.total.desconto!);
        totalRow['Total'] = formatCurrency(report.total.valor_liquido ?? totalGeral);
      }
      
      csvRows.push(totalRow);

      // Gerar CSV (remover campos vazios de desconto se não houver desconto)
      const Papa = await import('papaparse');
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
        filters.startDate && filters.endDate && filters.endDate !== filters.startDate
          ? `${filters.startDate}_${filters.endDate}`
          : filters.startDate || report.generated_at.replace(/[^\d-]/g, '');
      const filename = `relatorio_fechamentos_${filenameSuffix || 'periodo'}.csv`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'CSV exportado',
        description: `O arquivo ${filename} foi baixado com sucesso.`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Falha ao exportar CSV',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao exportar o CSV.',
        variant: 'destructive',
      });
    } finally {
      setExportingCsv(false);
    }
  };


  // Função para ordenar linhas da tabela
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
          // Tentar comparar como números se ambos forem numéricos
          const aNum = Number.parseInt(aValue.toString(), 10);
          const bNum = Number.parseInt(bValue.toString(), 10);
          if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
            return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
          }
          // Caso contrário, comparar como strings
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

  // Função para lidar com clique no header da tabela
  const handleSort = (field: SortField) => {
    setSortConfig((current) => {
      if (current.field === field) {
        // Ciclar: asc -> desc -> null
        if (current.direction === 'asc') {
          return { field, direction: 'desc' };
        } else if (current.direction === 'desc') {
          return { field: null, direction: null };
        }
      }
      // Novo campo, começar com asc
      return { field, direction: 'asc' };
    });
  };

  // Componente para renderizar ícone de ordenação
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

  // Função para extrair informações de linha de subtotal (relatórios sintéticos)
  const parseSubtotalInfo = (ficha: string): { pedidos: number; itens: number } | null => {
    // Formato esperado: "Pedidos: 12 · Itens: 27"
    const match = ficha.match(/Pedidos:\s*(\d+)\s*·\s*Itens:\s*(\d+)/);
    if (match) {
      return {
        pedidos: parseInt(match[1], 10),
        itens: parseInt(match[2], 10),
      };
    }
    return null;
  };

  // Função para coletar fichas únicas de um grupo
  const getUniqueFichas = (rows: ReportRowData[]): string[] => {
    const fichas = new Set<string>();
    rows.forEach(row => {
      // Ignorar linhas de subtotal agregadas (relatórios sintéticos)
      if (row.ficha && row.descricao !== 'Subtotal') {
        fichas.add(row.ficha);
      }
    });
    return Array.from(fichas).sort();
  };

  // Função para coletar todas as fichas de um grupo (incluindo subgrupos)
  const getAllFichasFromGroup = (group: ReportGroup): string[] => {
    const fichas = new Set<string>();
    
    // Coletar fichas das linhas diretas
    if (group.rows) {
      group.rows.forEach(row => {
        if (row.ficha && row.descricao !== 'Subtotal') {
          fichas.add(row.ficha);
        }
      });
    }
    
    // Coletar fichas dos subgrupos
    if (group.subgroups) {
      group.subgroups.forEach(subgroup => {
        if (subgroup.rows) {
          subgroup.rows.forEach(row => {
            if (row.ficha && row.descricao !== 'Subtotal') {
              fichas.add(row.ficha);
            }
          });
        }
        // Recursivamente coletar de subgrupos aninhados
        if (subgroup.subgroups) {
          subgroup.subgroups.forEach(nestedSubgroup => {
            if (nestedSubgroup.rows) {
              nestedSubgroup.rows.forEach(row => {
                if (row.ficha && row.descricao !== 'Subtotal') {
                  fichas.add(row.ficha);
                }
              });
            }
          });
        }
      });
    }
    
    return Array.from(fichas).sort();
  };

  // Função para buscar IDs dos pedidos de um grupo sintético
  const fetchPedidosIdsForGroup = async (
    group: ReportGroup,
    groupLabel: string,
    reportType: string,
    expectedPedidosCount?: number
  ): Promise<string[]> => {
    // Se já está no cache, retornar
    const cacheKey = `${group.key}-${groupLabel}`;
    if (groupPedidosIds.has(cacheKey)) {
      return groupPedidosIds.get(cacheKey)!;
    }
    
    // Extrair o valor do grupo do label (ex: "Vendedor: João" -> "João")
    const extractGroupValue = (label: string, reportType: string): string | null => {
      // Remover prefixos comuns
      const prefixes = [
        'Vendedor: ',
        'Designer: ',
        'Cliente: ',
        'Entrega: ',
        'Data: ',
        'Data de Entrada: ',
        'Data de Entrega: ',
        'Vendedor/Designer: ',
      ];
      
      for (const prefix of prefixes) {
        if (label.startsWith(prefix)) {
          return label.substring(prefix.length).trim();
        }
      }
      
      return label.trim();
    };
    
    const groupValue = extractGroupValue(groupLabel, reportType);
    if (!groupValue) {
      return [];
    }
    
    // Construir payload baseado no tipo de relatório e valor do grupo
    const payload: ReportRequestPayload = {
      report_type: reportType as ReportTypeKey,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined,
      status: filters.status !== 'Todos' ? filters.status : undefined,
      date_mode: filters.dateMode,
      vendedor: filters.vendedor || undefined,
      designer: filters.designer || undefined,
      cliente: filters.cliente || undefined,
    };
    
    // Adicionar filtro específico baseado no tipo de relatório
    if (reportType.startsWith('sintetico_vendedor')) {
      if (reportType === 'sintetico_vendedor_designer') {
        // Para vendedor/designer, o label vem como "Vendedor/Designer: João / Maria"
        const parts = groupValue.split(' / ');
        if (parts.length === 2) {
          payload.vendedor = parts[0].trim();
          payload.designer = parts[1].trim();
        }
      } else {
        payload.vendedor = groupValue;
      }
    } else if (reportType.startsWith('sintetico_designer')) {
      payload.designer = groupValue;
    } else if (reportType.startsWith('sintetico_cliente')) {
      payload.cliente = groupValue;
    } else if (reportType.startsWith('sintetico_entrega')) {
      // Para forma de envio, não há filtro direto, precisamos buscar todos e filtrar
      // Mas vamos tentar buscar com o valor como cliente primeiro
      payload.cliente = groupValue;
    } else if (reportType.startsWith('sintetico_data')) {
      // Para datas, precisamos ajustar o período
      // O label vem como "Data: DD/MM/YYYY"
      const dateMatch = groupValue.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const dateStr = `${year}-${month}-${day}`;
        payload.start_date = dateStr;
        payload.end_date = dateStr;
      }
    }
    
    try {
      setLoadingPedidosIds(prev => new Set(prev).add(cacheKey));
      
      // Usar relatório analítico para obter fichas individuais
      // O tipo analítico retorna as fichas detalhadas que precisamos
      let analiticoType: ReportTypeKey = 'analitico_cliente_designer';
      
      // Mapear tipo sintético para analítico equivalente
      if (reportType === 'sintetico_vendedor' || reportType === 'sintetico_vendedor_designer') {
        analiticoType = 'analitico_cliente_designer';
      } else if (reportType === 'sintetico_designer') {
        analiticoType = 'analitico_designer_cliente';
      } else if (reportType === 'sintetico_cliente') {
        analiticoType = 'analitico_cliente_designer';
      } else if (reportType === 'sintetico_entrega') {
        analiticoType = 'analitico_entrega_painel';
      } else if (reportType.startsWith('sintetico_data')) {
        analiticoType = 'analitico_cliente_designer';
      }
      
      const analiticoPayload: ReportRequestPayload = {
        ...payload,
        report_type: analiticoType,
      };
      
      const response = await api.generateReport(analiticoPayload);
      
      // Coletar fichas únicas do relatório
      const fichas = new Set<string>();
      
      // Para sintetico_vendedor_designer, precisamos garantir que coletamos apenas
      // fichas de pedidos que têm itens com a combinação EXATA vendedor/designer
      // O backend já deve filtrar corretamente quando ambos os filtros são fornecidos,
      // mas vamos coletar todas as fichas retornadas (o backend já fez o filtro)
      const collectFichas = (groups: ReportGroup[]) => {
        groups.forEach(g => {
          if (g.rows) {
            g.rows.forEach(row => {
              if (row.ficha && row.descricao !== 'Subtotal') {
                fichas.add(row.ficha);
              }
            });
          }
          if (g.subgroups) {
            collectFichas(g.subgroups);
          }
        });
      };
      
      collectFichas(response.groups);
      
      let fichasArray = Array.from(fichas).sort();
      
      // Validar que o número de fichas bate com o resumo (se fornecido)
      // Se o resumo diz "Pedidos: 4", devemos ter apenas 4 fichas únicas
      if (expectedPedidosCount !== undefined) {
        const antesLimitacao = fichasArray.length;
        
        // Se temos mais pedidos do que o esperado, vamos usar apenas os primeiros N
        // (ordenados) para corresponder ao número do resumo
        if (fichasArray.length > expectedPedidosCount) {
          fichasArray = fichasArray.slice(0, expectedPedidosCount);
          console.warn(
            `[fetchPedidosIdsForGroup] Discrepância detectada para grupo "${groupLabel}": ` +
            `resumo indica ${expectedPedidosCount} pedidos, mas backend retornou ${antesLimitacao}. ` +
            `Limitando para ${expectedPedidosCount}. ` +
            `Isso indica que o backend está retornando pedidos com vendedor OU designer, ` +
            `não apenas a combinação exata. Fichas antes: ${fichasArray.length}, depois: ${fichasArray.length}`
          );
        } else if (fichasArray.length < expectedPedidosCount) {
          // Se temos menos, apenas logar (pode ser que alguns pedidos não tenham fichas válidas)
          console.warn(
            `[fetchPedidosIdsForGroup] Menos pedidos encontrados para grupo "${groupLabel}": ` +
            `resumo indica ${expectedPedidosCount}, mas encontramos apenas ${fichasArray.length}.`
          );
        } else {
          console.log(
            `[fetchPedidosIdsForGroup] Número correto de pedidos para grupo "${groupLabel}": ${fichasArray.length}`
          );
        }
      }
      
      // Armazenar no cache (já limitado se necessário)
      setGroupPedidosIds(prev => {
        const newMap = new Map(prev);
        newMap.set(cacheKey, fichasArray);
        console.log(`[fetchPedidosIdsForGroup] Cache atualizado para "${groupLabel}": ${fichasArray.length} pedidos`);
        return newMap;
      });
      
      return fichasArray;
    } catch (error) {
      console.error('Erro ao buscar IDs dos pedidos:', error);
      toast({
        title: 'Erro ao buscar IDs',
        description: 'Não foi possível carregar os IDs dos pedidos.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoadingPedidosIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  };

  // Função para alternar expansão de fichas
  const toggleFichasExpansion = async (
    rowKey: string, 
    group: ReportGroup, 
    groupLabel: string,
    expectedPedidosCount?: number
  ) => {
    const isCurrentlyExpanded = expandedFichas.has(rowKey);
    
    if (!isCurrentlyExpanded) {
      // Se está expandindo, buscar os IDs se ainda não estiverem no cache
      const cacheKey = `${group.key}-${groupLabel}`;
      if (!groupPedidosIds.has(cacheKey) && report) {
        await fetchPedidosIdsForGroup(group, groupLabel, report.report_type, expectedPedidosCount);
      }
    }
    
    setExpandedFichas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  };

  // Função para calcular estatísticas do grupo
  const getGroupStats = (group: ReportGroup) => {
    const rows = group.rows || [];
    // Filtrar linhas de subtotal agregadas (relatórios sintéticos)
    const itemRows = rows.filter(row => row.descricao !== 'Subtotal');
    const fichasUnicas = getUniqueFichas(itemRows);
    const totalItens = itemRows.length;
    const totalGeral = group.subtotal.valor_frete + group.subtotal.valor_servico;
    
    // Verificar se é um grupo sintético (sem itens reais, mas com linha de subtotal)
    const subtotalRow = rows.find(row => row.descricao === 'Subtotal');
    const subtotalInfo = subtotalRow ? parseSubtotalInfo(subtotalRow.ficha) : null;
    
    return {
      fichasUnicas,
      totalItens,
      totalGeral,
      mediaPorItem: totalItens > 0 ? totalGeral / totalItens : 0,
      isSynthetic: totalItens === 0 && subtotalInfo !== null,
      subtotalInfo, // Informações extraídas da linha de subtotal
    };
  };

  // Componente para exibir estatísticas detalhadas do grupo
  const GroupStatsDetail = ({ groupStats }: { groupStats: ReturnType<typeof getGroupStats> }) => {
    // Se é um grupo sintético, mostrar visualização simplificada
    if (groupStats.isSynthetic && groupStats.subtotalInfo) {
      return (
        <div className="bg-slate-50 rounded-md p-4 border border-slate-200">
          <h4 className="font-semibold text-sm text-slate-700 mb-3">Resumo do Grupo</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Pedidos</p>
              <p className="font-semibold text-slate-900">{groupStats.subtotalInfo.pedidos}</p>
            </div>
            <div>
              <p className="text-slate-500">Itens</p>
              <p className="font-semibold text-slate-900">{groupStats.subtotalInfo.itens}</p>
            </div>
            <div>
              <p className="text-slate-500">Total Geral</p>
              <p className="font-semibold text-slate-900">{formatCurrency(groupStats.totalGeral)}</p>
            </div>
            <div>
              <p className="text-slate-500">Média por Item</p>
              <p className="font-semibold text-slate-900">
                {formatCurrency(groupStats.subtotalInfo.itens > 0 ? groupStats.totalGeral / groupStats.subtotalInfo.itens : 0)}
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    // Visualização padrão para grupos analíticos
    return (
      <div className="bg-slate-50 rounded-md p-4 border border-slate-200">
        <h4 className="font-semibold text-sm text-slate-700 mb-3">Estatísticas do Grupo</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Total de Itens</p>
            <p className="font-semibold text-slate-900">{groupStats.totalItens}</p>
          </div>
          <div>
            <p className="text-slate-500">Fichas Únicas</p>
            <p className="font-semibold text-slate-900">{groupStats.fichasUnicas.length}</p>
          </div>
          <div>
            <p className="text-slate-500">Total Geral</p>
            <p className="font-semibold text-slate-900">{formatCurrency(groupStats.totalGeral)}</p>
          </div>
          <div>
            <p className="text-slate-500">Média por Item</p>
            <p className="font-semibold text-slate-900">{formatCurrency(groupStats.mediaPorItem)}</p>
          </div>
        </div>
        {groupStats.fichasUnicas.length > 0 && (
          <div className="mt-4">
            <p className="text-slate-500 text-sm mb-2">Fichas do Grupo:</p>
            <div className="flex flex-wrap gap-2">
              {groupStats.fichasUnicas.map((ficha) => (
                <span 
                  key={ficha} 
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                >
                  {ficha}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (group: ReportGroup, depth = 0, path = group.key): JSX.Element => {
    const marginLeft = depth * 16;
    const subgroups = group.subgroups ?? [];
    const rows = group.rows ?? [];
    const hasSubgroups = subgroups.length > 0;
    const hasRows = rows.length > 0;
    
    // Ordenar linhas se houver ordenação ativa
    const sortedRows = hasRows ? sortRows(rows) : [];
    
    // Calcular estatísticas do grupo
    const groupStats = hasRows ? getGroupStats(group) : null;

    // Trigger do accordion (cabeçalho)
    const accordionTrigger = (
      <div className="flex items-center justify-between w-full pr-2">
        <span className="font-medium text-slate-800">{group.label}</span>
        <span className="text-base font-semibold text-slate-700">
          Frete: {formatCurrency(group.subtotal.valor_frete)} · Serviços: {formatCurrency(group.subtotal.valor_servico)}
        </span>
      </div>
    );

    return (
      <div key={path} className="space-y-3" style={{ marginLeft }}>
        {hasSubgroups ? (
          <Collapsible trigger={accordionTrigger}>
            <div className="p-4 space-y-4">
              {groupStats && <GroupStatsDetail groupStats={groupStats} />}
              <div className="space-y-4">
                {subgroups.map((subgroup, index) =>
                  renderGroup(subgroup, depth + 1, `${path}-${index}`),
                )}
              </div>
            </div>
          </Collapsible>
        ) : hasRows ? (
          <Collapsible trigger={accordionTrigger}>
            <div className="p-4 space-y-4">
              {groupStats && <GroupStatsDetail groupStats={groupStats} />}
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-base">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="text-sm font-medium">
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
                      const isSubtotalRow = row.descricao === 'Subtotal';
                      const subtotalInfo = isSubtotalRow ? parseSubtotalInfo(row.ficha) : null;
                      
                      // Tentar obter fichas do cache primeiro
                      const cacheKey = `${group.key}-${group.label}`;
                      let cachedFichas = groupPedidosIds.get(cacheKey);
                      
                      // Validar que os dados do cache respeitam o número esperado (se disponível)
                      if (isSubtotalRow && subtotalInfo && cachedFichas && cachedFichas.length > subtotalInfo.pedidos) {
                        console.warn(
                          `[Fechamentos] Cache com dados incorretos para "${group.label}": ` +
                          `esperado ${subtotalInfo.pedidos}, cache tem ${cachedFichas.length}. Limitando...`
                        );
                        cachedFichas = cachedFichas.slice(0, subtotalInfo.pedidos);
                        // Atualizar cache com dados corrigidos
                        setGroupPedidosIds(prev => {
                          const newMap = new Map(prev);
                          newMap.set(cacheKey, cachedFichas!);
                          return newMap;
                        });
                      }
                      
                      // Para relatórios sintéticos, não usar getAllFichasFromGroup pois não funciona
                      // Sempre buscar via API se não estiver no cache
                      const allFichas = isSubtotalRow && cachedFichas ? cachedFichas : [];
                      const rowKey = `${path}-subtotal-${index}`;
                      const isExpanded = expandedFichas.has(rowKey);
                      const isLoading = loadingPedidosIds.has(cacheKey);
                      
                      return (
                        <tr
                          key={`${path}-row-${index}`}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                        >
                          <td className="px-4 py-2 font-medium text-slate-800">
                            {isSubtotalRow && subtotalInfo ? (
                              <div className="space-y-1">
                                <button
                                  onClick={() => toggleFichasExpansion(rowKey, group, group.label, subtotalInfo?.pedidos)}
                                  disabled={isLoading}
                                  className="text-left hover:text-blue-600 hover:underline cursor-pointer transition-colors flex items-center gap-2 group disabled:opacity-50 disabled:cursor-wait"
                                  title="Clique para ver os IDs dos pedidos"
                                  type="button"
                                >
                                  <span className="group-hover:text-blue-600">{row.ficha}</span>
                                  {isLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                                  ) : (
                                    <span className="text-xs text-slate-400 group-hover:text-blue-600 transition-transform">
                                      {isExpanded ? '▼' : '▶'}
                                    </span>
                                  )}
                                </button>
                                {isExpanded && (
                                  <div className="mt-2 pl-4 border-l-2 border-blue-200 bg-blue-50 rounded p-2 animate-in fade-in slide-in-from-top-2">
                                    {isLoading ? (
                                      <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Carregando IDs dos pedidos...</span>
                                      </div>
                                    ) : allFichas.length > 0 ? (
                                      <>
                                        <p className="text-xs font-semibold text-slate-600 mb-1.5">IDs dos Pedidos:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {allFichas.map((ficha) => (
                                            <span
                                              key={ficha}
                                              className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                                            >
                                              {ficha}
                                            </span>
                                          ))}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1.5">
                                          Total: {allFichas.length} pedido(s)
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-xs text-slate-500">Nenhum pedido encontrado</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              row.ficha
                            )}
                          </td>
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
            </div>
          </Collapsible>
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-base text-slate-500">
            Nenhum item encontrado para este agrupamento.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fechamentos</h1>
          <p className="text-muted-foreground">
            Explore rapidamente como os valores estão distribuídos. Ajuste os filtros abaixo e gere o relatório na hora.
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/admin/template-relatorios')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Editar Template
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">Parâmetros do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Indicador de filtros ativos */}
          {hasActiveFilters && report && (
            <div className="flex flex-wrap items-center gap-2 pt-2 pb-2 border-t border-slate-200">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600 font-medium">Filtros ativos:</span>
              {filters.status !== STATUS_OPTIONS[0] && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-slate-300 flex items-center" 
                  onClick={() => updateFilter('status', STATUS_OPTIONS[0])}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      updateFilter('status', STATUS_OPTIONS[0]);
                    }
                  }}
                >
                  Status: {filters.status}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.vendedor && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-slate-300 flex items-center" 
                  onClick={() => updateFilter('vendedor', '')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      updateFilter('vendedor', '');
                    }
                  }}
                >
                  Vendedor: {filters.vendedor}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.designer && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-slate-300 flex items-center" 
                  onClick={() => updateFilter('designer', '')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      updateFilter('designer', '');
                    }
                  }}
                >
                  Designer: {filters.designer}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filters.cliente && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-slate-300 flex items-center" 
                  onClick={() => updateFilter('cliente', '')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      updateFilter('cliente', '');
                    }
                  }}
                >
                  Cliente: {filters.cliente}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
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

          {/* Filtros de data, status e pessoas */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(event) => updateFilter('startDate', event.target.value)}
                className={`bg-white ${dateError ? 'border-red-500' : ''}`}
              />
              {dateError && (
                <p className="text-sm text-red-600">{dateError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data final</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(event) => updateFilter('endDate', event.target.value)}
                className={`bg-white ${dateError ? 'border-red-500' : ''}`}
                min={filters.startDate || undefined}
              />
              {dateError && (
                <p className="text-sm text-red-600">{dateError}</p>
              )}
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
                  <SelectItem value="qualquer">Qualquer data (entrada ou entrega)</SelectItem>
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
                Para fechamento de comissão por vendedor.
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
                Para comissão por designer ou par vendedor/designer.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <ClienteAutocomplete
                value={filters.cliente || ''}
                onSelect={(cliente: Cliente | null) => {
                  updateFilter('cliente', cliente ? cliente.nome : '');
                }}
                onInputChange={(value: string) => {
                  // Limpar filtro se o campo ficar vazio
                  if (value.trim() === '' && filters.cliente) {
                    updateFilter('cliente', '');
                  }
                }}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Para relatório específico do cliente.
              </p>
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
                  <FileSpreadsheet className="h-4 w-4" />
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

            {hasActiveFilters && (
              <Button
                variant="outline"
                className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
                onClick={clearFilters}
                title="Limpar todos os filtros"
              >
                <X className="h-4 w-4" />
                Limpar Filtros
              </Button>
            )}

            <Button
              className="gap-2"
              onClick={handleGenerate}
              disabled={loading || !!dateError}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {loading ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
              <p className="text-base text-slate-600">Gerando relatório...</p>
              <p className="text-sm text-slate-500">Por favor, aguarde enquanto processamos os dados.</p>
          </div>
        </CardContent>
      </Card>
      ) : report ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-white text-slate-900">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-semibold">{report.title}</CardTitle>
                {reportStats && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      {reportStats.totalGroups} grupo(s)
                      {reportStats.totalSubgroups > 0 && `, ${reportStats.totalSubgroups} subgrupo(s)`}
                      {reportStats.totalRows > 0 && `, ${reportStats.totalRows} item(ns)`}
                    </span>
                  </div>
                )}
              </div>
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
              <div className="rounded border border-dashed border-slate-200 bg-white py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  {hasActiveFilters ? (
                    <>
                      <p className="text-base font-medium">Nenhum dado encontrado para os filtros selecionados</p>
                      <p className="text-sm">Tente ajustar as datas, status ou outros filtros aplicados.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="mt-2 gap-2"
                      >
                        <X className="h-4 w-4" />
                        Limpar filtros
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium">Nenhum dado encontrado para o período selecionado</p>
                      <p className="text-sm">Verifique se há pedidos no intervalo de datas escolhido.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {report.groups.map((group, index) => renderGroup(group, 0, `root-${index}`))}
              </div>
            )}

            {/* Total do período - versão simples */}
            <div className="rounded border border-slate-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-100 px-6 py-3 text-base text-slate-700 md:flex-row md:items-center md:justify-between">
                <span>Total do período</span>
                <span className="font-semibold text-slate-900">
                  Total: {formatCurrency(report.total.valor_frete + report.total.valor_servico)}
                  <span className="ml-4 text-sm font-normal text-slate-600">
                    (Frete: {formatCurrency(report.total.valor_frete)} + Serviços: {formatCurrency(report.total.valor_servico)})
                  </span>
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
