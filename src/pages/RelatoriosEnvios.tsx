import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderWithItems } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { formatDateForDisplay } from '@/utils/date';
import { printEnvioReport } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Settings } from 'lucide-react';

interface RelatorioEnvio {
  forma_envio: string;
  pedidos: OrderWithItems[];
}

export default function RelatoriosEnvios() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [relatorio, setRelatorio] = useState<RelatorioEnvio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
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
      // Como a API filtra por data de criação e queremos filtrar por data de entrega,
      // precisamos buscar um intervalo maior de pedidos criados e filtrar no frontend.
      // Buscamos pedidos criados até 90 dias antes para garantir que pegamos pedidos antigos com entrega futura.
      const dataCriacaoInicio = new Date(dataInicio);
      dataCriacaoInicio.setDate(dataCriacaoInicio.getDate() - 90);
      const dataCriacaoInicioStr = dataCriacaoInicio.toISOString().split('T')[0];

      // A API também tem um limite padrão de 20 itens. Vamos aumentar para 1000.
      const pedidosResponse = await api.getRelatorioEnviosPedidos(
        dataCriacaoInicioStr,
        undefined, // Sem limite final de criação para não perder nada
        { pageSize: 1000 }
      );

      // Filtro Rigoroso no Frontend: Apenas pedidos onde a data_entrega está no intervalo solicitado
      const pedidos = pedidosResponse.filter((pedido) => {
        if (!pedido.data_entrega) return false;

        // Normalizar para YYYY-MM-DD para comparação de string
        const entrega = pedido.data_entrega.split('T')[0].split(' ')[0];
        const fim = dataFim || dataInicio;

        return entrega >= dataInicio && entrega <= fim;
      });

      // Agrupar pedidos por forma de envio
      const gruposMap = new Map<string, OrderWithItems[]>();
      pedidos.forEach((pedido) => {
        const key = (pedido.forma_envio ?? 'SEM FORMA DE ENVIO').trim() || 'SEM FORMA DE ENVIO';
        if (!gruposMap.has(key)) {
          gruposMap.set(key, []);
        }
        gruposMap.get(key)!.push(pedido);
      });

      const relatorioArray = Array.from(gruposMap.entries())
        .map(([forma_envio, lista]) => ({
          forma_envio,
          pedidos: lista.sort((a, b) => {
            const clienteA = (a.cliente ?? a.customer_name ?? '').toLowerCase();
            const clienteB = (b.cliente ?? b.customer_name ?? '').toLowerCase();
            return clienteA.localeCompare(clienteB, 'pt-BR');
          }),
        }))
        .sort((a, b) => a.forma_envio.localeCompare(b.forma_envio, 'pt-BR'));

      setRelatorio(relatorioArray);
      if (!relatorioArray.length) {
        toast({
          title: 'Nenhum pedido encontrado',
          description: 'Não há envios no intervalo selecionado.',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao gerar o relatório.';
      setError(`Erro ao gerar relatório: ${message}`);
      toast({
        title: 'Falha ao gerar relatório',
        description: message,
        variant: 'destructive',
      });
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
      console.info('Imprimindo relatório de envios', {
        grupos: relatorio.length,
        totalPedidos,
        dataInicio,
        dataFim,
      });
      printEnvioReport(relatorio, dataInicio, dataFim || null);
      toast({
        title: 'Impressão iniciada',
        description: 'O diálogo de impressão foi aberto (caso permitido pelo navegador).',
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
    const cidade = (pedido.cidade_cliente ?? '').trim();
    const estado = (pedido.estado_cliente ?? '').trim();
    if (cidade && estado) {
      return `${cidade}/${estado}`;
    }
    return cidade || estado || '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Envios</h1>
          <p className="text-muted-foreground">Gere relatórios de envios por data de entrega</p>
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
