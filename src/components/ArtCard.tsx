import { DesignCardData, CardStatus } from '../types/designerKanban';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Calendar, Package, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useLazyImage } from '@/hooks/useLazyImage';
import { Button } from '@/components/ui/button';

interface ArtCardProps {
  card: DesignCardData;
  currentStatus: CardStatus;
  onMoveToPronto?: () => void;
  onMoveToAliberar?: () => void;
}

/**
 * Componente de card de arte com botões de ação
 * Permite mover o card entre as colunas "A liberar" e "Pronto"
 */
export default function ArtCard({ 
  card, 
  currentStatus, 
  onMoveToPronto, 
  onMoveToAliberar 
}: ArtCardProps) {
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
      // Cards do kanban podem ser carregados um pouco antes de aparecer
      rootMargin: '100px',
      threshold: 0.01,
    }
  );

  const formattedDate = formatDate(card.orderCreatedAt);

  return (
    <Card className="hover:shadow-md transition-shadow">
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

        {/* Botões de Ação */}
        <div className="pt-2 border-t">
          {currentStatus === 'a_liberar' ? (
            <Button
              onClick={onMoveToPronto}
              className="w-full"
              size="sm"
              variant="default"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Pronto
            </Button>
          ) : (
            <Button
              onClick={onMoveToAliberar}
              className="w-full"
              size="sm"
              variant="outline"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
