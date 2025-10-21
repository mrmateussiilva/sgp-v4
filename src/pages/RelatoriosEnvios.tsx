import { useState } from 'react';
import { OrderWithItems } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { invoke } from '@tauri-apps/api/tauri';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { formatDateForDisplay } from '@/utils/date';
import { exportEnvioReportToPDF } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';

interface RelatorioEnvio {
  forma_envio: string;
  pedidos: OrderWithItems[];
}

export default function RelatoriosEnvios() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [relatorio, setRelatorio] = useState<RelatorioEnvio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const navigate = useNavigate();
  const { toast } = useToast();

  const gerarRelatorio = async () => {
    if (!dataInicio) {
      setError('Por favor, selecione a data inicial');
      return;
    }

    if (dataFim && dataFim < dataInicio) {
      setError('A data final não pode ser anterior à data inicial');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataInicialSelecionada = dataInicio;
      const dataFinalSelecionada = dataFim || dataInicio;
      console.log('Intervalo selecionado:', {
        inicio: dataInicialSelecionada,
        fim: dataFinalSelecionada,
      });
      
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      const pedidos: OrderWithItems[] = await invoke('get_orders_by_delivery_date', {
        sessionToken,
        startDate: dataInicialSelecionada,
        endDate: dataFim || null,
      });

      console.log('Pedidos retornados:', pedidos.length); // Para debug
      console.log('Primeiro pedido:', pedidos[0]?.data_entrega); // Para debug
      
      // Debug: mostrar todas as datas dos pedidos retornados
      pedidos.forEach((pedido, index) => {
        console.log(`Pedido ${index + 1}:`, {
          id: pedido.id,
          cliente: pedido.cliente,
          data_entrega: pedido.data_entrega,
          forma_envio: pedido.forma_envio
        });
      });

      // Agrupar pedidos por forma de envio
      const agrupado = pedidos.reduce((acc, pedido) => {
        const formaEnvio = pedido.forma_envio || 'SEM FORMA DE ENVIO';
        
        if (!acc[formaEnvio]) {
          acc[formaEnvio] = [];
        }
        
        acc[formaEnvio].push(pedido);
        return acc;
      }, {} as Record<string, OrderWithItems[]>);

      // Converter para array e ordenar
      const relatorioArray = Object.entries(agrupado)
        .map(([forma_envio, pedidos]) => ({
          forma_envio,
          pedidos: pedidos.sort((a, b) => a.cliente?.localeCompare(b.cliente || '') || 0)
        }))
        .sort((a, b) => a.forma_envio.localeCompare(b.forma_envio));

      setRelatorio(relatorioArray);
    } catch (err) {
      setError('Erro ao gerar relatório: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data?: string | null) => formatDateForDisplay(data ?? null, '-');
  const formatarIntervalo = (inicio: string, fim: string) => {
    if (!inicio) return '-';
    const inicioFormatado = formatDateForDisplay(inicio, '-');
    if (!fim || fim === inicio) {
      return inicioFormatado;
    }
    return `${inicioFormatado} - ${formatDateForDisplay(fim, '-')}`;
  };

  const totalPedidos = relatorio.reduce(
    (acc, grupo) => acc + grupo.pedidos.length,
    0
  );

  const handleExportPDF = async () => {
    if (!relatorio.length || !dataInicio) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Gere o relatório antes de tentar exportar o PDF.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setExporting(true);
      console.info('Exportando relatório de envios', {
        grupos: relatorio.length,
        totalPedidos,
        dataInicio,
        dataFim,
      });
      exportEnvioReportToPDF(relatorio, dataInicio, dataFim || null);
      toast({
        title: 'PDF gerado',
        description: 'O download do relatório foi iniciado. Verifique sua pasta de downloads.',
      });
    } catch (err) {
      console.error('Erro ao exportar PDF de envios:', err);
      setError('Não foi possível exportar o PDF. Tente novamente.');
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o PDF. Veja o console para mais detalhes.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const obterTiposProducao = (pedido: OrderWithItems) => {
    return pedido.items.map(item => item.item_name).join(', ');
  };

  const obterCidadeEstado = (pedido: OrderWithItems) => {
    const cidade = pedido.cidade_cliente || '';
    return cidade;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatório de Envios</h1>
        <p className="text-muted-foreground">Gere relatórios de envios por data de entrega</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data de Entrega (início)</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="max-w-xs"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">até</span>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="max-w-xs"
                  min={dataInicio || undefined}
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={gerarRelatorio} 
              disabled={loading}
            >
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportPDF}
              disabled={
                exporting ||
                loading ||
                !relatorio.length ||
                !dataInicio
              }
            >
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {relatorio.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Relatório de Envios - {formatarIntervalo(dataInicio, dataFim)}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Intervalo selecionado: {formatarIntervalo(dataInicio, dataFim)} | Pedidos encontrados: {totalPedidos}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {relatorio.map((grupo, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary">
                    {grupo.forma_envio.toUpperCase()}:
                  </h3>
                  
                  <div className="ml-4 space-y-1">
                    {grupo.pedidos.map((pedido) => (
                      <div key={pedido.id} className="text-sm">
                        <span className="font-medium">{pedido.cliente}</span>
                        {pedido.items.length > 0 && (
                          <span className="text-muted-foreground">
                            {' - '}{obterTiposProducao(pedido)}
                          </span>
                        )}
                        {pedido.cidade_cliente && (
                          <span className="text-muted-foreground">
                            {' - '}{obterCidadeEstado(pedido)}
                          </span>
                        )}
                        {pedido.observacao && (
                          <span className="text-muted-foreground">
                            {' - '}{pedido.observacao}
                          </span>
                        )}
                        <span className="text-xs text-blue-500 ml-2">
                          (Data: {formatarData(pedido.data_entrega)})
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {index < relatorio.length - 1 && (
                    <div className="border-t border-gray-200 my-4"></div>
                  )}
                </div>
              ))}
      </div>
          </CardContent>
        </Card>
      )}

      {relatorio.length === 0 && !loading && dataInicio && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum pedido encontrado para o intervalo selecionado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
