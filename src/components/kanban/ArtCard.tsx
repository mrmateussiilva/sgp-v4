import React from 'react';
import { DesignCardData, CardStatus } from '@/types/designerKanban';
import { ImageIcon, Calendar, Package, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isValidImagePath } from '@/utils/path';
import { loadAuthenticatedImage } from '@/utils/imageLoader';
import { cn } from '@/lib/utils';

interface ArtCardProps {
  card: DesignCardData;
  currentStatus: CardStatus;
  onMoveToPronto?: () => void;
  onMoveToAliberar?: () => void;
  onClick?: () => void;
}

/**
 * Card de arte estilo Trello
 * Visual limpo e minimalista, clicável para ver detalhes
 * Memoizado para evitar re-renders desnecessários
 */
const ArtCard = React.memo(function ArtCard({ 
  card, 
  currentStatus, 
  onMoveToPronto, 
  onMoveToAliberar,
  onClick
}: ArtCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Format date helper - formato compacto estilo Trello
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return '';
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

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 cursor-pointer",
        "hover:shadow-md hover:border-gray-300 transition-all duration-200"
      )}
    >
      {/* Preview da Arte - Menor, estilo Trello */}
      <div className="relative w-full -mx-2.5 -mt-2.5 mb-2.5 bg-gray-100 rounded-t-lg overflow-hidden" style={{ height: '120px' }}>
        {imageSrc && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
            <img
              src={imageSrc}
              alt={`Arte: ${card.itemName}`}
              className={cn(
                "w-full h-full object-contain transition-opacity",
                imageLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <ImageIcon className="h-10 w-10 text-gray-300" />
          </div>
        )}
      </div>

      {/* Informações do Card - Mais minimalista estilo Trello */}
      <div className="space-y-1">
        {/* Título do Cliente - Destaque */}
        <div>
          <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2" title={card.customerName}>
            {card.customerName}
          </p>
        </div>

        {/* Item Name - Menos destaque */}
        <div>
          <p className="text-xs text-gray-600 leading-tight line-clamp-1" title={card.itemName}>
            {card.itemName}
          </p>
        </div>

        {/* Metadados - Compacto, apenas tipo de produção */}
        {card.productType && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Package className="h-3 w-3" />
            <span className="truncate">{card.productType}</span>
          </div>
        )}

        {/* Botões de Ação - Apenas no hover, estilo Trello */}
        <div className={cn(
          "flex items-center gap-1.5 pt-2 border-t border-gray-100 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          {currentStatus === 'a_liberar' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToPronto?.();
              }}
              className="flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
              title="Marcar como pronto"
            >
              <CheckCircle2 className="h-3 w-3" />
              Pronto
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToAliberar?.();
              }}
              className="flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              title="Mover para A liberar"
            >
              <XCircle className="h-3 w-3" />
              Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada para evitar re-renders desnecessários
  // Compara apenas as props que realmente afetam o render
  return (
    prevProps.card.orderId === nextProps.card.orderId &&
    prevProps.card.itemId === nextProps.card.itemId &&
    prevProps.card.imageUrl === nextProps.card.imageUrl &&
    prevProps.currentStatus === nextProps.currentStatus
  );
});

ArtCard.displayName = 'ArtCard';

export default ArtCard;
