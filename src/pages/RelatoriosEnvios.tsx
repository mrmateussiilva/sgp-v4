import { useState } from 'react';
import { OrderWithItems } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { invoke } from '@tauri-apps/api/tauri';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface RelatorioEnvio {
  forma_envio: string;
  pedidos: OrderWithItems[];
}

export default function RelatoriosEnvios() {
  const [dataEntrega, setDataEntrega] = useState('');
  const [relatorio, setRelatorio] = useState<RelatorioEnvio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const navigate = useNavigate();

  const gerarRelatorio = async () => {
    if (!dataEntrega) {
      setError('Por favor, selecione uma data de entrega');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Garantir que a data está no formato correto (YYYY-MM-DD)
      const dataFormatada = dataEntrega;
      console.log('Data selecionada:', dataFormatada); // Para debug
      
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      const pedidos: OrderWithItems[] = await invoke('get_orders_by_delivery_date', {
        sessionToken,
        deliveryDate: dataFormatada,
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

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
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
            <Label htmlFor="dataEntrega">Data de Entrega</Label>
            <Input
              id="dataEntrega"
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              className="max-w-xs"
            />
          </div>
          
          <Button 
            onClick={gerarRelatorio} 
            disabled={loading}
            className="w-fit"
          >
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </Button>

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
              Relatório de Envios - {formatarData(dataEntrega)}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Data selecionada: {dataEntrega} | Pedidos encontrados: {relatorio.reduce((acc, grupo) => acc + grupo.pedidos.length, 0)}
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
                          (Data: {pedido.data_entrega})
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

      {relatorio.length === 0 && !loading && dataEntrega && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum pedido encontrado para a data selecionada.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
