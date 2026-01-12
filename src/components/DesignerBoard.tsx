import { DesignerBoardData, DesignCardData } from '../types/designerKanban';
import ArtColumn from './ArtColumn';

interface DesignerBoardProps {
  board: DesignerBoardData;
  onMoveCard: (card: DesignCardData, fromStatus: 'a_liberar' | 'pronto', toStatus: 'a_liberar' | 'pronto', designerName: string) => void;
}

/**
 * Componente de board do designer
 * Contém duas colunas: "A liberar" e "Pronto"
 * Gerencia o movimento de cards entre as colunas
 */
export default function DesignerBoard({ board, onMoveCard }: DesignerBoardProps) {
  const handleMoveToPronto = (card: DesignCardData) => {
    onMoveCard(card, 'a_liberar', 'pronto', board.designerName);
  };

  const handleMoveToAliberar = (card: DesignCardData) => {
    onMoveCard(card, 'pronto', 'a_liberar', board.designerName);
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Coluna: A liberar */}
      <div className="flex-1">
        <ArtColumn
          title="A liberar"
          status="a_liberar"
          cards={board.cardsAliberar}
          onMoveToPronto={handleMoveToPronto}
        />
      </div>

      {/* Coluna: Pronto */}
      <div className="flex-1">
        <ArtColumn
          title="Pronto"
          status="pronto"
          cards={board.cardsPronto}
          onMoveToAliberar={handleMoveToAliberar}
        />
      </div>
    </div>
  );
}
