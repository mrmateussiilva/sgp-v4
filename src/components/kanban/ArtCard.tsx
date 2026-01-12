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
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

/**
 * Card de arte estilo Trello
 * Visual limpo e minimalista com drag and drop
 */
export default function ArtCard({ 
  card, 
  currentStatus, 
  onMoveToPronto, 
  onMoveToAliberar,
  isDragging = false,
  onDragStart,
  onDragEnd
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

  const formattedDate = formatDate(card.orderCreatedAt);

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing",
        "hover:shadow-md transition-all duration-200 mb-2",
        isDragging && "opacity-50 rotate-2 scale-105",
        !isDragging && "hover:-translate-y-0.5"
      )}
    >
      {/* Preview da Arte - Estilo Trello */}
      <div className="relative w-full -mx-3 -mt-3 mb-3 bg-gray-100 rounded-t-lg overflow-hidden" style={{ height: '160px' }}>
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
                "w-full h-full object-cover transition-opacity",
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

      {/* Informações do Card - Estilo Trello */}
      <div className="space-y-1.5">
        {/* Título do Cliente */}
        <div>
          <p className="font-medium text-sm text-gray-900 leading-tight" title={card.customerName}>
            {card.customerName}
          </p>
        </div>

        {/* Item Name */}
        <div>
          <p className="text-xs text-gray-600 leading-tight" title={card.itemName}>
            {card.itemName}
          </p>
        </div>

        {/* Metadados - Compacto */}
        <div className="flex items-center gap-3 flex-wrap">
          {card.productType && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Package className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{card.productType}</span>
            </div>
          )}
          {formattedDate && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>

        {/* Botões de Ação - Estilo Trello (discretos) */}
        <div className={cn(
          "flex items-center gap-2 pt-2 border-t border-gray-100 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          {currentStatus === 'a_liberar' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToPronto?.();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
              title="Marcar como pronto"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pronto
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToAliberar?.();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              title="Mover para A liberar"
            >
              <XCircle className="h-3.5 w-3.5" />
              Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
