import { useState, useMemo } from 'react';
import { Loader2, Calendar, Search, Inbox } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SmoothTableWrapper } from '@/components/SmoothTableWrapper';
import { Skeleton } from '@/components/ui/skeleton';

export default function PainelDesempenho() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateMode, setDateMode] = useState<string>('entrada');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Limpar seleção quando os dados mudarem
  const handleSearch = async () => {
    setSelectedRows(new Set());
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
      const response = await api.getRelatorioSemanal({
        start_date: startDate,
        end_date: endDate,
        date_mode: dateMode,
      });
      setData(response);
      setSelectedRows(new Set()); // Limpar seleção ao carregar novos dados
      toast({
        title: 'Relatório carregado',
        description: 'Dados do relatório semanal carregados com sucesso.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao buscar relatório semanal:', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Não foi possível carregar o relatório semanal.';
        toast({
        title: 'Falha ao carregar relatório',
        description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
    }
  };

  // Mapeamento de colunas desejadas e seus possíveis nomes na API
  const getColumnMapping = (row: any): Record<string, string> => {
    const mapping: Record<string, string> = {};
    
    // Mapear possíveis nomes de campos para as colunas desejadas
    const fieldMappings: Record<string, string[]> = {
      'id': ['id', 'ID', 'Id'],
      'data_entrada': ['data_entrada', 'dataEntrada', 'data_entrada', 'entrada', 'date_entrada'],
      'data_entrega': ['data_entrega', 'dataEntrega', 'data_entrega', 'entrega', 'date_entrega'],
      'valor_total': ['valor_total', 'total_value', 'valorTotal', 'total', 'totalValue'],
      'valor_frete': ['valor_frete', 'valorFrete', 'frete', 'frete_value'],
      'valor_itens': ['valor_itens', 'valor_servico', 'valorItens', 'valorServico', 'servico', 'itens_value'],
      'created_at': ['created_at', 'data_criacao', 'dataCriacao', 'criacao', 'createdAt'],
      'updated_at': ['updated_at', 'ultima_atualizacao', 'ultimaAtualizacao', 'atualizacao', 'updatedAt'],
    };

    // Para cada coluna desejada, encontrar o campo correspondente no objeto
    Object.entries(fieldMappings).forEach(([desiredKey, possibleKeys]) => {
      for (const key of possibleKeys) {
        if (row.hasOwnProperty(key)) {
          mapping[desiredKey] = key;
          break;
        }
      }
    });

    return mapping;
  };

  // Colunas desejadas com labels em português
  const columnLabels: Record<string, string> = {
    'id': 'ID',
    'data_entrada': 'Data de Entrada',
    'data_entrega': 'Data de Entrega',
    'valor_total': 'Valor Total',
    'valor_frete': 'Valor Frete',
    'valor_itens': 'Valor Itens',
    'created_at': 'Data Criação',
    'updated_at': 'Última Atualização',
  };

  // Componente para exibir resumo das linhas selecionadas
  const SelectedRowsSummary = ({
    tableData,
    selectedIndices,
    columnMapping,
  }: {
    tableData: any[];
    selectedIndices: number[];
    columnMapping: Record<string, string>;
  }) => {
    const summary = useMemo(() => {
      const selectedRows = selectedIndices.map((idx) => tableData[idx]);
      
      let totalValorTotal = 0;
      let totalValorFrete = 0;
      let totalValorItens = 0;

      selectedRows.forEach((row) => {
        const valorTotalKey = columnMapping['valor_total'];
        const valorFreteKey = columnMapping['valor_frete'];
        const valorItensKey = columnMapping['valor_itens'];

        if (valorTotalKey && row[valorTotalKey]) {
          totalValorTotal += Number(row[valorTotalKey]) || 0;
        }
        if (valorFreteKey && row[valorFreteKey]) {
          totalValorFrete += Number(row[valorFreteKey]) || 0;
        }
        if (valorItensKey && row[valorItensKey]) {
          totalValorItens += Number(row[valorItensKey]) || 0;
        }
      });

      return {
        count: selectedIndices.length,
        totalValorTotal,
        totalValorFrete,
        totalValorItens,
      };
    }, [tableData, selectedIndices, columnMapping]);

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    return (
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-900">
            Resumo das Linhas Selecionadas ({summary.count} {summary.count === 1 ? 'linha' : 'linhas'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {columnMapping['valor_total'] && (
              <div className="rounded-lg border border-blue-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-600">Valor Total</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {formatCurrency(summary.totalValorTotal)}
                </p>
              </div>
            )}
            {columnMapping['valor_frete'] && (
              <div className="rounded-lg border border-green-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-600">Valor Frete</p>
                <p className="mt-1 text-2xl font-bold text-green-700">
                  {formatCurrency(summary.totalValorFrete)}
                </p>
              </div>
            )}
            {columnMapping['valor_itens'] && (
              <div className="rounded-lg border border-purple-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-600">Valor Itens</p>
                <p className="mt-1 text-2xl font-bold text-purple-700">
                  {formatCurrency(summary.totalValorItens)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Função para renderizar dados em tabela
  const renderTable = () => {
    if (!data) return null;

    let tableData: any[] = [];

    // Se os dados são um array
    if (Array.isArray(data)) {
      tableData = data;
    } else if (typeof data === 'object' && data !== null) {
      // Se tem uma propriedade que parece ser um array de dados
      const arrayKeys = Object.keys(data).filter((key) => Array.isArray(data[key]));
      
      if (arrayKeys.length > 0) {
        // Usar o primeiro array encontrado
        tableData = data[arrayKeys[0]] as any[];
      } else {
        // Se não tem array, não mostrar tabela
        return (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-base text-muted-foreground">
            Nenhum dado de tabela encontrado.
          </div>
        );
      }
    } else {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-base text-muted-foreground">
          Formato de dados não reconhecido.
        </div>
      );
    }

    if (tableData.length === 0) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-base text-muted-foreground">
          Nenhum dado encontrado para o período selecionado.
        </div>
      );
    }

    // Obter mapeamento de colunas do primeiro item
    const columnMapping = getColumnMapping(tableData[0]);
    const columns = Object.keys(columnLabels).filter((key) => columnMapping[key]);

    if (columns.length === 0) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-base text-muted-foreground">
          Nenhuma das colunas esperadas foi encontrada nos dados.
        </div>
      );
    }

    const toggleRowSelection = (index: number) => {
      setSelectedRows((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
    };

    const toggleSelectAll = () => {
      if (selectedRows.size === tableData.length) {
        setSelectedRows(new Set());
      } else {
        setSelectedRows(new Set(tableData.map((_: any, i: number) => i)));
      }
    };

    const allSelected = selectedRows.size === tableData.length && tableData.length > 0;
    const someSelected = selectedRows.size > 0 && selectedRows.size < tableData.length;

    return (
      <div className="space-y-4">
        <Card className="flex-1 flex flex-col min-h-0 flex-grow">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="relative flex-1 min-h-0">
              {/* Indicador de loading sutil */}
              {loading && tableData.length > 0 && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 z-20 overflow-hidden">
                  <div className="h-full bg-primary animate-pulse" style={{ width: '40%', animation: 'loading 1.5s ease-in-out infinite' }} />
                </div>
              )}
              {/* Container com scroll interno */}
              <div className="h-full max-h-[70vh] overflow-y-auto overflow-x-auto border-t border-slate-200">
                <SmoothTableWrapper>
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                      <TableRow>
                        <TableHead className="w-[35px] min-w-[35px] lg:w-[40px] lg:min-w-[40px] xl:w-[45px] xl:min-w-[45px] sticky left-0 z-20 bg-background border-r px-1 lg:px-2">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        {columns.map((colKey) => (
                          <TableHead
                            key={colKey}
                            className="min-w-[100px] lg:min-w-[120px] xl:min-w-[140px] cursor-pointer hover:bg-muted/50 transition-colors px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base bg-background"
                          >
                            <div className="flex items-center">
                              {columnLabels[colKey]}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && tableData.length === 0 ? (
                        <>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={`skeleton-${index}`}>
                              <TableCell className="sticky left-0 z-10 bg-background border-r px-1 lg:px-2">
                                <Skeleton className="h-4 w-4" />
                              </TableCell>
                              {columns.map((colKey) => (
                                <TableCell key={colKey} className="px-2 lg:px-3 xl:px-4">
                                  <Skeleton className="h-4 w-24 lg:w-32" />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </>
                      ) : tableData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Inbox className="h-10 w-10 text-muted-foreground" />
                              <h3 className="text-lg font-semibold">Nenhum dado encontrado</h3>
                              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        tableData.map((row: any, index: number) => {
                          const isSelected = selectedRows.has(index);
                          return (
                            <TableRow
                              key={index}
                              className={`
                                hover:bg-muted/50 transition-all duration-200
                                ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
                              `.trim().replace(/\s+/g, ' ')}
                            >
                              <TableCell className="text-center sticky left-0 z-10 bg-background border-r px-1 lg:px-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleRowSelection(index)}
                                />
                              </TableCell>
                              {columns.map((colKey) => {
                                const apiKey = columnMapping[colKey];
                                const value = apiKey ? row[apiKey] : null;
                                return (
                                  <TableCell
                                    key={colKey}
                                    className={`
                                      px-2 lg:px-3 xl:px-4 text-[10px] sm:text-xs lg:text-sm xl:text-base
                                      ${colKey === 'id' ? 'font-mono font-medium' : ''}
                                      ${colKey === 'valor_total' || colKey === 'valor_frete' || colKey === 'valor_itens' ? 'font-medium text-right' : ''}
                                    `.trim().replace(/\s+/g, ' ')}
                                  >
                                    {formatCellValue(value, colKey)}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </SmoothTableWrapper>
              </div>
            </div>
          </CardContent>
        </Card>
        {selectedRows.size > 0 && (
          <SelectedRowsSummary
            tableData={tableData}
            selectedIndices={Array.from(selectedRows)}
            columnMapping={columnMapping}
          />
        )}
      </div>
    );
  };

  // Função para formatar valores das células
  const formatCellValue = (value: any, columnKey?: string): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'number') {
      // ID deve ser formatado como número inteiro, não como moeda
      if (columnKey === 'id') {
        return value.toString();
      }
      // Valores monetários (valor_total, valor_frete, valor_itens)
      if (columnKey === 'valor_total' || columnKey === 'valor_frete' || columnKey === 'valor_itens') {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
      }
      // Outros números como inteiros
      return new Intl.NumberFormat('pt-BR').format(value);
    }
    if (typeof value === 'string') {
      // Formatar datas sem deslocamento de fuso horário
      if (columnKey === 'data_entrada' || columnKey === 'data_entrega' || 
          columnKey === 'created_at' || columnKey === 'updated_at') {
        // Se é formato YYYY-MM-DD, formatar diretamente
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [y, m, d] = value.split('-');
          return `${d}/${m}/${y}`;
        }
        // Se tem timestamp, extrair apenas a data
        if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
          const dateOnly = value.split('T')[0];
          const [y, m, d] = dateOnly.split('-');
          return `${d}/${m}/${y}`;
        }
        // Tentar extrair data do início da string
        const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [, y, m, d] = dateMatch;
          return `${d}/${m}/${y}`;
        }
      }
      // Para outras strings que parecem datas (formato YYYY-MM-DD)
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        const dateOnly = value.split('T')[0] || value.split(' ')[0];
        if (dateOnly.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [y, m, d] = dateOnly.split('-');
          return `${d}/${m}/${y}`;
        }
      }
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Painel de Desempenho</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Relatório semanal de fechamentos. Selecione o período e o modo de data para visualizar os dados.
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
          <div className="grid gap-4 md:grid-cols-4">
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
            <div className="space-y-2 flex items-end">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="w-full"
                type="button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
        </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-600">Carregando relatório...</span>
        </div>
      ) : (
        data && renderTable()
      )}
    </div>
  );
}
