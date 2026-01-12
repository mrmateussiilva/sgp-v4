import { DesignCardData } from '../types/designerKanban';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Calendar, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isValidImagePath } from '@/utils/path';
import { loadAuthenticatedImage } from '@/utils/imageLoader';

interface DesignCardProps {
  card: DesignCardData;
}

export default function DesignCard({ card }: DesignCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

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

  // Carregar imagem
  useEffect(() => {
    const loadImage = async () => {
      if (!card.imageUrl) {
        setImageError(true);
        setImageLoading(false);
        return;
      }

      // Se for base64, usar diretamente
      if (card.imageUrl.startsWith('data:image/')) {
        setImageSrc(card.imageUrl);
        setImageLoading(false);
        return;
      }

      // Verificar se é um caminho válido
      if (!isValidImagePath(card.imageUrl)) {
        setImageError(true);
        setImageLoading(false);
        return;
      }

      // Tentar carregar a imagem autenticada
      try {
        const blobUrl = await loadAuthenticatedImage(card.imageUrl);
        setImageSrc(blobUrl);
        setImageError(false);
      } catch (error) {
        console.error('Erro ao carregar imagem do card:', error);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    loadImage();
  }, [card.imageUrl]);

  const formattedDate = formatDate(card.orderCreatedAt);

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Preview da Arte */}
        <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
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
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Imagem não disponível</p>
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
