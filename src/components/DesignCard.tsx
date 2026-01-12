import { DesignCardData } from '../types/designerKanban';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Calendar, Package } from 'lucide-react';
import { useLazyImage } from '@/hooks/useLazyImage';

interface DesignCardProps {
  card: DesignCardData;
}

export default function DesignCard({ card }: DesignCardProps) {
  // Format date helper
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Data não disponível';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Data inválida';
    }
  };

  // Usar lazy loading para carregar imagem apenas quando visível
  const { imageSrc, isLoading: imageLoading, error: imageError, imgRef } = useLazyImage(
    card.imageUrl,
    {
      rootMargin: '100px',
      threshold: 0.01,
    }
  );

  const formattedDate = formatDate(card.orderCreatedAt);

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Preview da Arte */}
        <div 
          ref={imgRef as React.RefObject<HTMLDivElement>}
          className="relative w-full h-48 bg-muted rounded-lg overflow-hidden"
        >
          {imageSrc && !imageError ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              <img
                src={imageSrc}
                alt={`Arte: ${card.itemName}`}
                className={`w-full h-full object-contain ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                loading="lazy"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs">
                  {imageLoading ? 'Carregando...' : imageError ? 'Imagem não disponível' : 'Imagem não disponível'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Informações do Card */}
        <div className="space-y-2">
          {/* Cliente */}
          <div>
            <p className="font-semibold text-sm truncate" title={card.customerName}>
              {card.customerName}
            </p>
          </div>

          {/* Produto/Tipo */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            <span className="truncate">{card.productType || 'Não especificado'}</span>
          </div>

          {/* Nome do Item */}
          <div>
            <p className="text-sm text-foreground truncate" title={card.itemName}>
              {card.itemName}
            </p>
          </div>

          {/* Data de Criação */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>

          {/* Número do Pedido (se disponível) */}
          {card.orderNumber && (
            <div className="text-xs text-muted-foreground">
              Pedido: {card.orderNumber}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
