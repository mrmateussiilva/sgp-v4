import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { OrderWithItems } from '../types';
import { DesignCardData, CardStatus } from '@/types/designerKanban';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import { Loader2, RefreshCw, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { isValidImagePath } from '@/utils/path';

interface DesignerBoardData {
  designerName: string;
  cardsAliberar: DesignCardData[];
  cardsPronto: DesignCardData[];
}

/**
 * Tela de trabalho do Designer
 * Mostra todos os designers em abas, cada um com seu Kanban
 * Layout organizado para visualização de múltiplos designers
 */
export default function DesignerWorkspace() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Estado para gerenciar os boards de cada designer
  // Mapeia nome do designer -> board com cards em cada coluna
  const [designerBoards, setDesignerBoards] = useState<Map<string, DesignerBoardData>>(new Map());
  
  // Estado para movimentação de cards (preservado entre atualizações)
  const [movedCards, setMovedCards] = useState<Map<string, CardStatus>>(new Map());

  // Buscar pedidos da API
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
    loadOrders();
  }, []);

  // Transformar dados para formato de boards com abas
  // Inicializa todos os cards em "A liberar" e mantém estado de movimentação
  useEffect(() => {
    setDesignerBoards((prevBoards) => {
      const boardsMap = new Map<string, DesignerBoardData>();
      
      // Criar um Set com IDs dos cards que já estão em "Pronto" (para preservar estado)
      const prontoCardIds = new Set<string>();
      movedCards.forEach((status, cardId) => {
        if (status === 'pronto') {
          prontoCardIds.add(cardId);
        }
      });

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
            orderCreatedAt: order.created_at || undefined,
            status: order.status,
          };

          // Inicializar board do designer se não existir
          if (!boardsMap.has(designerName)) {
            boardsMap.set(designerName, {
              designerName,
              cardsAliberar: [],
              cardsPronto: [],
            });
          }

          const board = boardsMap.get(designerName)!;
          const cardId = `${card.orderId}-${card.itemId}`;
          
          // Verificar se o card já estava em "Pronto" (preservar estado)
          if (prontoCardIds.has(cardId)) {
            card.cardStatus = 'pronto';
            board.cardsPronto.push(card);
          } else {
            card.cardStatus = 'a_liberar';
            board.cardsAliberar.push(card);
          }
        });
      });

      // Ordenar cards por data de criação (mais recente primeiro)
      boardsMap.forEach((board) => {
        const sortByDate = (a: DesignCardData, b: DesignCardData) => {
          const dateA = a.orderCreatedAt ? new Date(a.orderCreatedAt).getTime() : 0;
          const dateB = b.orderCreatedAt ? new Date(b.orderCreatedAt).getTime() : 0;
          return dateB - dateA;
        };
        board.cardsAliberar.sort(sortByDate);
        board.cardsPronto.sort(sortByDate);
      });

      // Definir primeira aba ativa se não houver uma selecionada
      if (!activeTab && boardsMap.size > 0) {
        const firstDesigner = Array.from(boardsMap.keys()).sort()[0];
        setActiveTab(firstDesigner);
      }

      return boardsMap;
    });
  }, [orders, movedCards, activeTab]);

  // Função para mover card entre colunas
  const handleMoveCard = (card: DesignCardData, toStatus: CardStatus, designerName: string) => {
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

    // Atualizar boards imediatamente
    setDesignerBoards((prevBoards) => {
      const newBoards = new Map(prevBoards);
      const board = newBoards.get(designerName);
      
      if (!board) return prevBoards;

      // Remover card da coluna de origem
      const fromStatus = toStatus === 'pronto' ? 'a_liberar' : 'pronto';
      if (fromStatus === 'a_liberar') {
        board.cardsAliberar = board.cardsAliberar.filter(
          (c) => !(c.orderId === card.orderId && c.itemId === card.itemId)
        );
      } else {
        board.cardsPronto = board.cardsPronto.filter(
          (c) => !(c.orderId === card.orderId && c.itemId === card.itemId)
        );
      }

      // Adicionar card na coluna de destino
      const updatedCard = { ...card, cardStatus: toStatus };
      if (toStatus === 'a_liberar') {
        board.cardsAliberar.push(updatedCard);
        board.cardsAliberar.sort((a, b) => {
          const dateA = a.orderCreatedAt ? new Date(a.orderCreatedAt).getTime() : 0;
          const dateB = b.orderCreatedAt ? new Date(b.orderCreatedAt).getTime() : 0;
          return dateB - dateA;
        });
      } else {
        board.cardsPronto.push(updatedCard);
        board.cardsPronto.sort((a, b) => {
          const dateA = a.orderCreatedAt ? new Date(a.orderCreatedAt).getTime() : 0;
          const dateB = b.orderCreatedAt ? new Date(b.orderCreatedAt).getTime() : 0;
          return dateB - dateA;
        });
      }

      newBoards.set(designerName, board);
      return newBoards;
    });
  };

  // Obter lista de designers ordenada
  const designers = useMemo(() => {
    return Array.from(designerBoards.keys()).sort();
  }, [designerBoards]);

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

      {/* Kanban Board com Abas */}
      {designers.length === 0 ? (
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
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${designers.length}, minmax(0, 1fr))` }}>
              {designers.map((designerName) => {
                const board = designerBoards.get(designerName);
                const totalCards = (board?.cardsAliberar.length || 0) + (board?.cardsPronto.length || 0);
                return (
                  <TabsTrigger 
                    key={designerName} 
                    value={designerName}
                    className="text-sm"
                  >
                    {designerName}
                    {totalCards > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 rounded-full">
                        {totalCards}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {designers.map((designerName) => {
              const board = designerBoards.get(designerName);
              if (!board) return null;
              
              const handleMoveToPronto = (card: DesignCardData) => {
                handleMoveCard(card, 'pronto', designerName);
              };

              const handleMoveToAliberar = (card: DesignCardData) => {
                handleMoveCard(card, 'a_liberar', designerName);
              };
              
              return (
                <TabsContent 
                  key={designerName} 
                  value={designerName}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <KanbanBoard
                    cardsAliberar={board.cardsAliberar}
                    cardsPronto={board.cardsPronto}
                    onMoveToPronto={handleMoveToPronto}
                    onMoveToAliberar={handleMoveToAliberar}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}
    </div>
  );
}
