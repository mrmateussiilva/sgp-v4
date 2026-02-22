import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { OrderWithItems } from '../types';
import { DesignCardData, CardStatus } from '../types/designerKanban';
import { isValidImagePath } from '@/utils/path';
import { useUser } from './useUser';

interface UseDesignerArtsOptions {
  designerName?: string; // Se não fornecido, usa o username do usuário logado
  filterByDesigner?: boolean; // Se true, filtra por designer
}

interface UseDesignerArtsResult {
  cardsAliberar: DesignCardData[];
  cardsPronto: DesignCardData[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  moveCard: (card: DesignCardData, toStatus: CardStatus) => void;
  totalCards: number;
}

/**
 * Hook para gerenciar artes de um designer
 * Se designerName não for fornecido, usa o username do usuário logado
 * 
 * @param options - Opções de configuração
 * @returns Dados e funções para gerenciar artes do designer
 */
export function useDesignerArts(options: UseDesignerArtsOptions = {}): UseDesignerArtsResult {
  const { username } = useUser();
  const { designerName: targetDesigner, filterByDesigner = true } = options;

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movedCards, setMovedCards] = useState<Map<string, CardStatus>>(new Map());

  // Determinar nome do designer alvo
  const designerName = targetDesigner || username || '';

  // Carregar pedidos
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const allOrders = await api.getOrders();
      setOrders(allOrders);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      setError('Erro ao carregar pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const allOrders = await api.getOrders();
        if (isMounted) {
          setOrders(allOrders);
        }
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        if (isMounted) {
          setError('Erro ao carregar pedidos. Tente novamente.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtrar e processar artes
  const { cardsAliberar, cardsPronto } = useMemo(() => {
    const aliberar: DesignCardData[] = [];
    const pronto: DesignCardData[] = [];

    orders.forEach((order) => {
      const itemsWithArt = order.items.filter((item) => {
        const hasImage = item.imagem && item.imagem.trim().length > 0;
        const hasValidImage = hasImage && isValidImagePath(item.imagem || '');

        // Filtrar por designer se necessário
        if (filterByDesigner && designerName) {
          const itemDesigner = item.designer?.trim() || '';
          const matchesDesigner = itemDesigner.toLowerCase() === designerName.toLowerCase();
          return hasValidImage && matchesDesigner;
        }

        return hasValidImage;
      });

      itemsWithArt.forEach((item) => {
        const card: DesignCardData = {
          orderId: order.id,
          orderNumber: order.numero,
          itemId: item.id,
          itemName: item.item_name,
          customerName: order.customer_name || order.cliente || 'Cliente não informado',
          productType: item.tipo_producao || 'Não especificado',
          imageUrl: item.imagem,
          orderCreatedAt: order.created_at || undefined,
          status: order.status,
        };

        const cardId = `${card.orderId}-${card.itemId}`;
        const movedStatus = movedCards.get(cardId);
        const finalStatus = movedStatus || 'a_liberar';

        if (finalStatus === 'pronto') {
          pronto.push(card);
        } else {
          aliberar.push(card);
        }
      });
    });

    // Ordenar por data (mais recente primeiro)
    const sortByDate = (a: DesignCardData, b: DesignCardData) => {
      const dateA = a.orderCreatedAt ? new Date(a.orderCreatedAt).getTime() : 0;
      const dateB = b.orderCreatedAt ? new Date(b.orderCreatedAt).getTime() : 0;
      return dateB - dateA;
    };

    return {
      cardsAliberar: aliberar.sort(sortByDate),
      cardsPronto: pronto.sort(sortByDate),
    };
  }, [orders, movedCards, designerName, filterByDesigner]);

  // Mover card entre colunas
  const moveCard = (card: DesignCardData, toStatus: CardStatus) => {
    const cardId = `${card.orderId}-${card.itemId}`;
    setMovedCards((prev) => {
      const newMap = new Map(prev);
      if (toStatus === 'a_liberar') {
        newMap.delete(cardId);
      } else {
        newMap.set(cardId, toStatus);
      }
      return newMap;
    });
  };

  return {
    cardsAliberar,
    cardsPronto,
    loading,
    error,
    refresh: loadOrders,
    moveCard,
    totalCards: cardsAliberar.length + cardsPronto.length,
  };
}
