import { DesignerColumn } from '../types/designerKanban';
import DesignCard from './DesignCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface DesignerColumnProps {
  column: DesignerColumn;
}

export default function DesignerColumnComponent({ column }: DesignerColumnProps) {
  return (
    <Card className="flex flex-col w-80 h-full min-h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {column.designerName}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {column.cards.length} {column.cards.length === 1 ? 'arte' : 'artes'}
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {column.cards.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Nenhuma arte nesta coluna
          </div>
        ) : (
          column.cards.map((card) => (
            <DesignCard key={`${card.orderId}-${card.itemId}`} card={card} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
