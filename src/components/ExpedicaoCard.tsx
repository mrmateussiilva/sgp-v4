import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { OrderWithItems } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Check,
  Eye,
  MapPin,
  Clock,
  AlertTriangle,
  Undo2,
  Truck,
  ZoomIn,
  Package,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDateForDisplay } from '@/utils/date';
import { getImagePreviewUrl } from '@/utils/imagePreview';

// Miniatura individual de item com carregamento assíncrono e suporte a toque para prévia
function ExpedicaoItemThumb({
  imageRef,
  itemName,
  onOpenPreview,
}: {
  imageRef?: string | null;
  itemName: string;
  onOpenPreview: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(imageRef));

  useEffect(() => {
    let isMounted = true;
    if (!imageRef) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getImagePreviewUrl(imageRef)
      .then((res) => {
        if (isMounted) {
          setUrl(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [imageRef]);

  if (!imageRef) {
    return (
      <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-border/60 flex items-center justify-center text-muted-foreground/40">
        <Package className="h-4 w-4" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenPreview();
      }}
      className="relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border/80 overflow-hidden group transition-transform active:scale-95 focus:outline-hidden hover:ring-2 hover:ring-primary/40 cursor-pointer shadow-xs"
      title="Toque para ampliar a estampa"
      aria-label={`Ver estampa de ${itemName}`}
    >
      {url ? (
        <>
          <img src={url} alt={itemName} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ZoomIn className="h-4 w-4 text-white drop-shadow-md" />
          </div>
        </>
      ) : loading ? (
        <div className="w-full h-full flex items-center justify-center bg-muted/60 animate-pulse">
          <Package className="h-4 w-4 text-muted-foreground/30 animate-spin" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted/40 text-muted-foreground/40">
          <Package className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}

interface ExpedicaoCardProps {
  order: OrderWithItems;
  onOpenDetails: (order: OrderWithItems) => void;
  onToggleExpedition: (orderId: number, currentStatus: boolean) => Promise<void>;
  isUpdating: boolean;
}

export default function ExpedicaoCard({
  order,
  onOpenDetails,
  onToggleExpedition,
  isUpdating,
}: ExpedicaoCardProps) {
  const [expandedItems, setExpandedItems] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryImageUrl, setGalleryImageUrl] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Filtra itens com imagem válida para a galeria
  const galleryItems = useMemo(
    () => (order.items || []).filter((item) => Boolean(item.imagem)),
    [order.items]
  );

  // Carrega a imagem da galeria quando o índice mudar ou modal abrir
  useEffect(() => {
    let isMounted = true;
    if (!previewOpen || !galleryItems[currentImageIndex]) {
      setGalleryImageUrl(null);
      return;
    }

    const item = galleryItems[currentImageIndex];
    getImagePreviewUrl(item.imagem).then((url) => {
      if (isMounted) setGalleryImageUrl(url);
    });

    return () => {
      isMounted = false;
    };
  }, [previewOpen, currentImageIndex, galleryItems]);

  // Navegação da galeria
  const goToNextImage = useCallback(() => {
    if (galleryItems.length <= 1) return;
    setCurrentImageIndex((prev) => (prev < galleryItems.length - 1 ? prev + 1 : 0));
  }, [galleryItems.length]);

  const goToPrevImage = useCallback(() => {
    if (galleryItems.length <= 1) return;
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : galleryItems.length - 1));
  }, [galleryItems.length]);

  // Suporte a teclas de seta
  useEffect(() => {
    if (!previewOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNextImage();
      if (e.key === 'ArrowLeft') goToPrevImage();
      if (e.key === 'Escape') setPreviewOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewOpen, goToNextImage, goToPrevImage]);

  // Gestos de deslizar (swipe) em tela sensível ao toque
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff > 45) {
      goToPrevImage(); // Swipe para a direita: anterior
    } else if (diff < -45) {
      goToNextImage(); // Swipe para a esquerda: próxima
    }
    touchStartXRef.current = null;
  };

  // Feedback Háptico e expedição
  const handleExpeditionWithFeedback = async (e: React.MouseEvent, currentStatus: boolean) => {
    e.stopPropagation();
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(currentStatus ? [40, 40] : [65]);
      } catch {}
    }
    await onToggleExpedition(order.id, currentStatus);
  };

  const isAtrasado = () => {
    if (order.expedicao) return false;
    if (!order.data_entrega) return false;
    const entrega = order.data_entrega.split('T')[0].split(' ')[0].trim();
    const now = new Date();
    const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return Boolean(entrega && entrega < todayYmd);
  };

  // Detecta se a observação possui termos críticos de expedição conjunta
  const isObservacaoCritica = (obs?: string | null) => {
    if (!obs) return false;
    const upper = obs.toUpperCase();
    return (
      upper.includes('JUNTO') ||
      upper.includes('DEMAIS') ||
      upper.includes('AGUARDAR') ||
      upper.includes('RETIRADA') ||
      upper.includes('ATENÇÃO') ||
      upper.includes('CUIDADO') ||
      upper.includes('URGENTE')
    );
  };

  const getPriorityBadgeColor = () => {
    if (order.prioridade === 'ALTA') return 'bg-rose-500 hover:bg-rose-600 text-white';
    return 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  const getStatusBadge = (completed: boolean | undefined, label: string) => {
    return (
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
          completed
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'
        }`}
      >
        {label} {completed && <Check className="h-2.5 w-2.5 inline" />}
      </span>
    );
  };

  const items = order.items || [];
  const displayedItems = expandedItems ? items : items.slice(0, 3);
  const hasMoreItems = items.length > 3;
  const observacaoCritica = isObservacaoCritica(order.observacao);

  const activeGalleryItem = previewOpen ? galleryItems[currentImageIndex] || null : null;

  return (
    <>
      <Card
        className={`relative overflow-hidden transition-all duration-300 border hover:shadow-md flex flex-col h-full ${
          order.expedicao
            ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 opacity-80'
            : isAtrasado()
            ? 'border-rose-400 bg-rose-50/10'
            : observacaoCritica
            ? 'border-amber-400/80 dark:border-amber-600/60 bg-amber-50/20 shadow-xs'
            : 'border-border bg-card'
        }`}
      >
        {/* Top indicator stripe */}
        <div
          className={`h-1.5 w-full shrink-0 ${
            order.expedicao
              ? 'bg-emerald-500'
              : isAtrasado()
              ? 'bg-rose-500'
              : order.prioridade === 'ALTA'
              ? 'bg-amber-500'
              : observacaoCritica
              ? 'bg-amber-400'
              : 'bg-slate-300 dark:bg-slate-700'
          }`}
        />

        <CardContent className="p-3.5 sm:p-5 flex-1 flex flex-col space-y-3.5">
          {/* Header: Pedido # & Badges & Ação Detalhes */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 pr-2 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Pedido #{order.numero || order.id}
              </span>
              <h4 className="font-bold text-base text-foreground leading-tight line-clamp-1">
                {order.cliente || order.customer_name}
              </h4>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {/* Badges */}
              <div className="flex items-center gap-1.5">
                {order.prioridade === 'ALTA' && (
                  <Badge className={getPriorityBadgeColor()}>Urgente</Badge>
                )}
                {isAtrasado() && (
                  <Badge variant="destructive" className="animate-pulse">
                    Atrasado
                  </Badge>
                )}
                {order.expedicao ? (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Expedido</Badge>
                ) : null}
              </div>

              {/* Botão Ver Detalhes (Drawer Completo) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenDetails(order)}
                className="h-10 w-10 text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex items-center justify-center transition-colors"
                title="Ver Detalhes do Pedido"
                aria-label="Ver Detalhes"
              >
                <Eye className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Localização & Data de Entrega & Forma de Envio */}
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1.5 items-center">
            {order.cidade_cliente && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate max-w-[140px] sm:max-w-none">
                  {order.cidade_cliente}/{order.estado_cliente || ''}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Entrega: {formatDateForDisplay(order.data_entrega ?? null, '-')}
            </span>
            {order.forma_envio && (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground/80 bg-muted/80 px-2 py-0.5 rounded text-[10px] tracking-tight">
                <Truck className="h-3 w-3 text-primary shrink-0" />
                {order.forma_envio}
              </span>
            )}
          </div>

          {/* Lista de itens com prévia visual da estampa */}
          <div className="border-t border-border/60 pt-2.5 space-y-2">
            {displayedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <ExpedicaoItemThumb
                  imageRef={item.imagem}
                  itemName={item.item_name}
                  onOpenPreview={() => {
                    const idx = galleryItems.findIndex((g) => g.id === item.id);
                    setCurrentImageIndex(idx >= 0 ? idx : 0);
                    setPreviewOpen(true);
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-semibold text-xs sm:text-sm text-foreground leading-tight line-clamp-2">
                      <span className="font-bold text-primary mr-1">{item.quantity}x</span>
                      {item.item_name}
                    </span>
                    {item.tipo_producao && (
                      <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                        {item.tipo_producao}
                      </span>
                    )}
                  </div>
                  {item.tipo_acabamento && item.tipo_acabamento !== 'nenhum' && (
                    <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                      Acabamento: {item.tipo_acabamento}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Alternar expansão de itens extras direto no card */}
            {hasMoreItems && (
              <button
                type="button"
                onClick={() => setExpandedItems(!expandedItems)}
                className="w-full text-center py-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1 cursor-pointer select-none bg-primary/5 hover:bg-primary/10 rounded-md"
              >
                {expandedItems ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Mostrar menos itens
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />+ {items.length - 3} itens no pedido
                  </>
                )}
              </button>
            )}
          </div>

          {/* Observação com Destaque Especial / Envio Conjunto */}
          {order.observacao && (
            <div
              className={`text-[11px] p-2.5 rounded-lg border font-medium flex items-start gap-2 line-clamp-3 transition-colors ${
                observacaoCritica
                  ? 'bg-amber-100/90 dark:bg-amber-950/50 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30'
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  observacaoCritica ? 'text-amber-600 dark:text-amber-400 animate-pulse' : ''
                }`}
              />
              <div className="flex-1 leading-tight">
                {observacaoCritica && (
                  <span className="block font-black text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-0.5">
                    Atenção Especial / Envio Conjunto
                  </span>
                )}
                <span className="whitespace-pre-wrap">{order.observacao}</span>
              </div>
            </div>
          )}

          {/* Status de produção linear */}
          <div className="flex flex-wrap gap-1 items-center pt-2 mt-auto pb-1">
            {getStatusBadge(order.financeiro, 'Fin')}
            {getStatusBadge(order.conferencia, 'Conf')}
            {getStatusBadge(order.sublimacao, 'Sub')}
            {getStatusBadge(order.costura, 'Cost')}
            {getStatusBadge(order.expedicao, 'Exp')}
            {getStatusBadge(order.pronto, 'Pronto')}
          </div>

          {/* Ação Principal: Expedir ou Desfazer com botão grande e touch-friendly */}
          <div className="pt-2 border-t border-border/40">
            {order.expedicao ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={(e) => handleExpeditionWithFeedback(e, true)}
                className="w-full h-11 font-semibold gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <Undo2 className="h-4 w-4" />
                Desfazer Expedição
              </Button>
            ) : (
              <Button
                size="lg"
                disabled={isUpdating}
                onClick={(e) => handleExpeditionWithFeedback(e, false)}
                className="w-full h-14 font-bold text-base sm:text-lg gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-[0.98] cursor-pointer"
              >
                <Check className="h-6 w-6" />
                EXPEDIR PEDIDO
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Lightbox com Galeria e Navegação Swipe / Setas */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg w-[94vw] p-4 bg-background/95 backdrop-blur-md rounded-2xl border shadow-2xl overflow-hidden select-none">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate">
                {activeGalleryItem
                  ? `${activeGalleryItem.quantity}x ${activeGalleryItem.item_name}`
                  : 'Prévia da Estampa'}
              </DialogTitle>
              {galleryItems.length > 1 && (
                <span className="shrink-0 text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  {currentImageIndex + 1} de {galleryItems.length}
                </span>
              )}
            </div>
            <DialogDescription className="sr-only">
              Visualização detalhada da estampa para conferência na expedição
            </DialogDescription>
          </DialogHeader>

          {/* Área da Imagem com Controles de Navegação */}
          <div
            className="relative w-full aspect-square max-h-[62vh] rounded-xl overflow-hidden bg-slate-950/5 dark:bg-slate-950/40 flex items-center justify-center p-2 touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {galleryImageUrl ? (
              <img
                src={galleryImageUrl}
                alt={activeGalleryItem?.item_name || 'Estampa'}
                className="max-h-full w-auto max-w-full object-contain rounded-lg shadow-sm transition-transform duration-200"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Package className="h-8 w-8 animate-spin" />
                <span className="text-xs">Carregando imagem...</span>
              </div>
            )}

            {/* Botão Anterior */}
            {galleryItems.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevImage();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/70 text-white shadow-md transition-all active:scale-95 flex items-center justify-center"
                title="Estampa anterior (ou deslize para a direita)"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {/* Botão Próximo */}
            {galleryItems.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/70 text-white shadow-md transition-all active:scale-95 flex items-center justify-center"
                title="Próxima estampa (ou deslize para a esquerda)"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Use as setas &larr; &rarr; ou deslize na tela</span>
            <span className="sm:hidden text-[11px]">Deslize para ver outras artes</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(false)}
              className="h-8 px-3 text-xs font-semibold"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
