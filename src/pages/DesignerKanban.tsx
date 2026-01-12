import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { OrderWithItems } from '../types';
import { DesignerColumn, DesignCardData } from '../types/designerKanban';
import DesignerColumnComponent from '../components/DesignerColumn';
import { Loader2, RefreshCw, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isValidImagePath } from '@/utils/path';

export default function DesignerKanban() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Buscar pedidos da API
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const allOrders = await api.getOrders();
      setOrders(allOrders);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      setError('Erro ao carregar pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Transformar dados para formato Kanban
  const designerColumns = useMemo((): DesignerColumn[] => {
    const columnsMap = new Map<string, DesignCardData[]>();

    orders.forEach((order) => {
      // Filtrar apenas itens que possuem arte (imagem)
      const itemsWithArt = order.items.filter((item) => {
        const hasImage = item.imagem && item.imagem.trim().length > 0;
        return hasImage && isValidImagePath(item.imagem || '');
      });

      itemsWithArt.forEach((item) => {
        // Obter nome do designer com fallback seguro
        const designerName = item.designer?.trim() || 'Designer não informado';

        // Criar card para este item
        const card: DesignCardData = {
          orderId: order.id,
          orderNumber: order.numero,
          itemId: item.id,
          itemName: item.item_name,
          customerName: order.customer_name || order.cliente || 'Cliente não informado',
          productType: item.tipo_producao || 'Não especificado',
          imageUrl: item.imagem,
          createdAt: item.order_id ? undefined : order.created_at || undefined,
          orderCreatedAt: order.created_at || undefined,
          status: order.status,
        };

        // Agrupar por designer
        if (!columnsMap.has(designerName)) {
          columnsMap.set(designerName, []);
        }
        columnsMap.get(designerName)!.push(card);
      });
    });

    // Converter Map para array e ordenar por nome do designer
    const columns: DesignerColumn[] = Array.from(columnsMap.entries())
      .map(([designerName, cards]) => ({
        designerName,
        cards: cards.sort((a, b) => {
          // Ordenar cards por data de criação (mais recente primeiro)
          const dateA = a.orderCreatedAt ? new Date(a.orderCreatedAt).getTime() : 0;
          const dateB = b.orderCreatedAt ? new Date(b.orderCreatedAt).getTime() : 0;
          return dateB - dateA;
        }),
      }))
      .sort((a, b) => a.designerName.localeCompare(b.designerName));

    return columns;
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Tela do Designer</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Visão Kanban dos pedidos com arte organizados por designer
          </p>
          {lastRefresh && (
            <p className="text-xs text-muted-foreground mt-1">
              Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>
        <Button onClick={loadOrders} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Kanban Board */}
      {designerColumns.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <Palette className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg text-muted-foreground">
                Nenhum pedido com arte encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Os pedidos que possuem itens com imagens aparecerão aqui organizados por designer
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max h-full">
            {designerColumns.map((column) => (
              <DesignerColumnComponent key={column.designerName} column={column} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
