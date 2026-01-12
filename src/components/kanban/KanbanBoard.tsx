import { DesignCardData } from '@/types/designerKanban';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
  cardsAliberar: DesignCardData[];
  cardsPronto: DesignCardData[];
  onMoveToPronto: (card: DesignCardData) => void;
  onMoveToAliberar: (card: DesignCardData) => void;
  onCardClick?: (card: DesignCardData) => void;
}

/**
 * Board Kanban estilo Trello
 * Cards clicáveis para ver detalhes
 */
export default function KanbanBoard({
  cardsAliberar,
  cardsPronto,
  onMoveToPronto,
  onMoveToAliberar,
  onCardClick,
}: KanbanBoardProps) {
  return (
    <div className="flex gap-4 h-full min-h-0" style={{ background: '#f4f5f7' }}>
      <div className="flex-1 min-w-0">
        <KanbanColumn
          title="A liberar"
          status="a_liberar"
          cards={cardsAliberar}
          onMoveToPronto={onMoveToPronto}
          onCardClick={onCardClick}
        />
      </div>
      <div className="flex-1 min-w-0">
        <KanbanColumn
          title="Pronto"
          status="pronto"
          cards={cardsPronto}
          onMoveToAliberar={onMoveToAliberar}
          onCardClick={onCardClick}
        />
      </div>
    </div>
  );
}
