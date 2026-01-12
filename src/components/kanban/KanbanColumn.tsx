import React from 'react';
import { DesignCardData, CardStatus } from '@/types/designerKanban';
import ArtCard from './ArtCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  title: string;
  status: CardStatus;
  cards: DesignCardData[];
  onMoveToPronto?: (card: DesignCardData) => void;
  onMoveToAliberar?: (card: DesignCardData) => void;
  onCardClick?: (card: DesignCardData) => void;
}

/**
 * Coluna do Kanban estilo Trello
 * Visual limpo com fundo claro
 * Memoizado para evitar re-renders desnecessários
 */
const KanbanColumn = React.memo(function KanbanColumn({
  title,
  status,
  cards,
  onMoveToPronto,
  onMoveToAliberar,
  onCardClick,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-gray-50 rounded-lg">
      {/* Header estilo Trello */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards Container - Scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
            <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 mb-2 flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <p>Nenhuma arte</p>
          </div>
        ) : (
          cards.map((card) => {
            const cardId = `${card.orderId}-${card.itemId}`;
            
            return (
              <ArtCard
                key={cardId}
                card={card}
                currentStatus={status}
                onMoveToPronto={onMoveToPronto ? () => onMoveToPronto(card) : undefined}
                onMoveToAliberar={onMoveToAliberar ? () => onMoveToAliberar(card) : undefined}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
              />
            );
          })
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada para evitar re-renders desnecessários
  // Compara título, status, quantidade de cards
  if (
    prevProps.title !== nextProps.title ||
    prevProps.status !== nextProps.status ||
    prevProps.cards.length !== nextProps.cards.length
  ) {
    return false;
  }
  
  // Se os cards mudaram (mesmo tamanho), verificar se são os mesmos
  if (prevProps.cards.length > 0) {
    for (let i = 0; i < prevProps.cards.length; i++) {
      const prevCard = prevProps.cards[i];
      const nextCard = nextProps.cards[i];
      if (
        prevCard.orderId !== nextCard.orderId ||
        prevCard.itemId !== nextCard.itemId
      ) {
        return false;
      }
    }
  }
  
  return true;
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
