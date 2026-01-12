import { DesignCardData, CardStatus } from '@/types/designerKanban';
import ArtCard from './ArtCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  title: string;
  status: CardStatus;
  cards: DesignCardData[];
  onMoveToPronto?: (card: DesignCardData) => void;
  onMoveToAliberar?: (card: DesignCardData) => void;
  draggedCardId?: string | null;
  onDragStart?: (e: React.DragEvent, card: DesignCardData) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}

/**
 * Coluna do Kanban estilo Trello
 * Visual limpo com fundo claro e feedback de drag
 */
export default function KanbanColumn({
  title,
  status,
  cards,
  onMoveToPronto,
  onMoveToAliberar,
  draggedCardId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col w-full h-full min-h-0 bg-gray-50 rounded-lg",
        isDragOver && "bg-blue-50 border-2 border-blue-400 border-dashed"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
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
      <div className="flex-1 overflow-y-auto p-3 space-y-0">
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
            const isDragging = draggedCardId === cardId;
            
            return (
              <ArtCard
                key={cardId}
                card={card}
                currentStatus={status}
                onMoveToPronto={onMoveToPronto ? () => onMoveToPronto(card) : undefined}
                onMoveToAliberar={onMoveToAliberar ? () => onMoveToAliberar(card) : undefined}
                isDragging={isDragging}
                onDragStart={onDragStart ? (e) => onDragStart(e, card) : undefined}
                onDragEnd={onDragEnd}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
