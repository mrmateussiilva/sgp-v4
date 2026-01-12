import { DesignCardData } from '@/types/designerKanban';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
  cardsAliberar: DesignCardData[];
  cardsPronto: DesignCardData[];
  onMoveToPronto: (card: DesignCardData) => void;
  onMoveToAliberar: (card: DesignCardData) => void;
}

/**
 * Board Kanban reutilizável com duas colunas
 * Usado tanto na tela do designer quanto na visão admin
 */
export default function KanbanBoard({
  cardsAliberar,
  cardsPronto,
  onMoveToPronto,
  onMoveToAliberar,
}: KanbanBoardProps) {
  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1">
        <KanbanColumn
          title="A liberar"
          status="a_liberar"
          cards={cardsAliberar}
          onMoveToPronto={onMoveToPronto}
        />
      </div>
      <div className="flex-1">
        <KanbanColumn
          title="Pronto"
          status="pronto"
          cards={cardsPronto}
          onMoveToAliberar={onMoveToAliberar}
        />
      </div>
    </div>
  );
}
