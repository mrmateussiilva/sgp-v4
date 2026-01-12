import { DesignCardData } from '@/types/designerKanban';
import KanbanColumn from './KanbanColumn';
import { useState } from 'react';

interface KanbanBoardProps {
  cardsAliberar: DesignCardData[];
  cardsPronto: DesignCardData[];
  onMoveToPronto: (card: DesignCardData) => void;
  onMoveToAliberar: (card: DesignCardData) => void;
}

/**
 * Board Kanban estilo Trello com drag and drop
 */
export default function KanbanBoard({
  cardsAliberar,
  cardsPronto,
  onMoveToPronto,
  onMoveToAliberar,
}: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<DesignCardData | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'a_liberar' | 'pronto' | null>(null);

  const handleDragStart = (e: React.DragEvent, card: DesignCardData) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ orderId: card.orderId, itemId: card.itemId }));
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: 'a_liberar' | 'pronto') => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: 'a_liberar' | 'pronto') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);

    if (!draggedCard) return;

    const currentStatus = cardsAliberar.some(
      c => c.orderId === draggedCard.orderId && c.itemId === draggedCard.itemId
    ) ? 'a_liberar' : 'pronto';

    // Não fazer nada se soltar na mesma coluna
    if (currentStatus === targetStatus) {
      setDraggedCard(null);
      return;
    }

    // Mover card
    if (targetStatus === 'pronto') {
      onMoveToPronto(draggedCard);
    } else {
      onMoveToAliberar(draggedCard);
    }

    setDraggedCard(null);
  };

  const draggedCardId = draggedCard ? `${draggedCard.orderId}-${draggedCard.itemId}` : null;

  return (
    <div className="flex gap-4 h-full min-h-0" style={{ background: '#f4f5f7' }}>
      <div className="flex-1 min-w-0">
        <KanbanColumn
          title="A liberar"
          status="a_liberar"
          cards={cardsAliberar}
          onMoveToPronto={onMoveToPronto}
          draggedCardId={draggedCardId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, 'a_liberar')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'a_liberar')}
          isDragOver={dragOverColumn === 'a_liberar'}
        />
      </div>
      <div className="flex-1 min-w-0">
        <KanbanColumn
          title="Pronto"
          status="pronto"
          cards={cardsPronto}
          onMoveToAliberar={onMoveToAliberar}
          draggedCardId={draggedCardId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, 'pronto')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'pronto')}
          isDragOver={dragOverColumn === 'pronto'}
        />
      </div>
    </div>
  );
}
