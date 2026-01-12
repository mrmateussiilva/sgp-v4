import { DesignCardData, CardStatus } from '../types/designerKanban';
import ArtCard from './ArtCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ArtColumnProps {
  title: string;
  status: CardStatus;
  cards: DesignCardData[];
  onMoveToPronto?: (card: DesignCardData) => void;
  onMoveToAliberar?: (card: DesignCardData) => void;
}

/**
 * Componente de coluna do Kanban
 * Exibe uma lista de cards com título e contador
 */
export default function ArtColumn({ 
  title, 
  status, 
  cards, 
  onMoveToPronto, 
  onMoveToAliberar 
}: ArtColumnProps) {
  return (
    <Card className="flex flex-col w-full h-full min-h-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {cards.length} {cards.length === 1 ? 'arte' : 'artes'}
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {cards.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Nenhuma arte nesta coluna
          </div>
        ) : (
          cards.map((card) => (
            <ArtCard
              key={`${card.orderId}-${card.itemId}`}
              card={card}
              currentStatus={status}
              onMoveToPronto={onMoveToPronto ? () => onMoveToPronto(card) : undefined}
              onMoveToAliberar={onMoveToAliberar ? () => onMoveToAliberar(card) : undefined}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
