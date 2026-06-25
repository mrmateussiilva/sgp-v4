import { useState, useEffect } from 'react';
import { OrderWithItems, OrderItem } from '../types';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Printer, Check, ShoppingBag, MapPin, Truck, AlertTriangle } from 'lucide-react';
import { formatDateForDisplay } from '@/utils/date';
import { getImagePreviewUrl } from '@/utils/imagePreview';

// Componente para carregar imagens de forma assíncrona
function AsyncItemImageDrawer({ imageReference, alt }: { imageReference: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getImagePreviewUrl(imageReference).then((resolvedUrl) => {
      if (isMounted && resolvedUrl) setUrl(resolvedUrl);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [imageReference]);

  if (!url) {
    return (
      <div className="shrink-0 w-16 h-16 rounded bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center">
        <span className="text-[10px] text-slate-400 font-bold tracking-tighter">IMG</span>
      </div>
    );
  }

  return (
    <div className="shrink-0 w-16 h-16 rounded bg-muted overflow-hidden border border-border">
      <img src={url} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}

interface ExpedicaoDrawerProps {
  order: OrderWithItems | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmExpedition: (orderId: number) => Promise<void>;
  isConfirming: boolean;
}

export default function ExpedicaoDrawer({
  order,
  isOpen,
  onClose,
  onConfirmExpedition,
  isConfirming,
}: ExpedicaoDrawerProps) {
  // Estado para checklist individual dos itens para conferência
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Resetar checklist ao mudar de pedido
  useEffect(() => {
    if (order) {
      const initial: Record<number, boolean> = {};
      order.items.forEach((item) => {
        initial[item.id] = false;
      });
      setCheckedItems(initial);
    }
  }, [order]);

  if (!order) return null;

  const toggleItemCheck = (itemId: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const allItemsChecked = order.items.length > 0 && order.items.every((item) => checkedItems[item.id]);

  const getAcabamentoText = (item: OrderItem) => {
    const list: string[] = [];
    if (item.tecido) list.push(`Tecido: ${item.tecido}`);
    if (item.overloque) list.push('Overloque');
    if (item.elastico) list.push('Elástico');
    
    if (item.tipo_acabamento && item.tipo_acabamento !== 'nenhum') {
      if (item.tipo_acabamento === 'ilhos') {
        list.push(`Ilhós (${item.quantidade_ilhos || '0'} un, espac. ${item.espaco_ilhos || '-'})`);
      } else if (item.tipo_acabamento === 'cordinha') {
        list.push(`Cordinha (${item.quantidade_cordinha || '0'} un, espac. ${item.espaco_cordinha || '-'})`);
      } else {
        list.push(`Acabamento: ${item.tipo_acabamento}`);
      }
    }

    if (item.ziper) list.push('Zíper');
    if (item.cordinha_extra) list.push('Cordinha Extra');
    if (item.alcinha) list.push(`Alcinha ${item.tipo_alcinha ? `(${item.tipo_alcinha})` : ''}`);
    if (item.toalha_pronta) list.push('Toalha Pronta');
    if (item.baininha) list.push('Baininha');
    
    if (item.acabamento_totem && item.acabamento_totem !== 'nenhum') {
      list.push(`Totem: ${item.acabamento_totem === 'outro' ? item.acabamento_totem_outro : item.acabamento_totem}`);
    }

    if (item.largura || item.altura) {
      list.push(`Medidas: ${item.largura || '-'} x ${item.altura || '-'}m`);
    }

    return list.join(' · ');
  };

  const handleConfirm = async () => {
    await onConfirmExpedition(order.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Custom side drawer styling via className overrides on DialogContent */}
      <DialogContent className="fixed right-0 top-0 bottom-0 left-auto translate-x-0 translate-y-0 h-[100dvh] w-full sm:max-w-lg md:max-w-xl p-0 flex flex-col rounded-none border-l shadow-2xl bg-card transition-transform duration-300">
        
        {/* Header da Expedição */}
        <div className="p-6 bg-slate-900 text-white flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Conferência & Expedição
            </span>
            <Badge variant="outline" className="text-white border-white/20 bg-white/10 uppercase font-bold text-[10px]">
              Pedido #{order.numero || order.id}
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-white mt-1">
            {order.cliente || order.customer_name}
          </DialogTitle>
          <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-slate-300 mt-1.5 items-center">
            {order.cidade_cliente && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                {order.cidade_cliente}/{order.estado_cliente || ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3 shrink-0 text-slate-400" />
              {order.forma_envio || 'Sem forma de envio'}
            </span>
          </div>
        </div>

        {/* Corpo do Drawer com Scroll */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            
            {/* Informações Gerais */}
            <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg border border-border/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Data de Entrada
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatDateForDisplay(order.data_entrada ?? null, '-')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Data de Entrega
                </span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                  {formatDateForDisplay(order.data_entrega ?? null, '-')}
                  {order.prioridade === 'ALTA' && (
                    <Badge variant="destructive" className="h-4 py-0 text-[9px] font-bold">
                      Urgente
                    </Badge>
                  )}
                </span>
              </div>
            </div>

            {/* Observações Gerais */}
            {order.observacao && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-lg flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-400 block uppercase">
                    Observação do Pedido
                  </span>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 whitespace-pre-wrap font-medium">
                    {order.observacao}
                  </p>
                </div>
              </div>
            )}

            {/* Checklist de Itens para Conferência */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  Conferência de Itens ({order.items.length})
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  Marque os itens ao conferir
                </span>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => {
                  const isChecked = checkedItems[item.id] || false;
                  const acabamentos = getAcabamentoText(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemCheck(item.id)}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-border hover:border-slate-300 dark:hover:border-slate-700 bg-card'
                      }`}
                    >
                      <div className="pt-0.5 p-2 -m-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleItemCheck(item.id)}
                          className="h-6 w-6 rounded border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                      </div>
                      
                      {item.imagem && (
                        <AsyncItemImageDrawer imageReference={item.imagem} alt={item.item_name} />
                      )}
                      
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`font-semibold text-sm text-foreground break-words ${isChecked ? 'line-through text-muted-foreground/80' : ''}`}>
                            {item.quantity}x {item.item_name}
                          </span>
                          {item.tipo_producao && (
                            <Badge variant="secondary" className="text-[9px] uppercase font-bold shrink-0">
                              {item.tipo_producao}
                            </Badge>
                          )}
                        </div>

                        {acabamentos && (
                          <p className={`text-xs text-muted-foreground leading-relaxed ${isChecked ? 'opacity-60' : ''}`}>
                            {acabamentos}
                          </p>
                        )}

                        {item.observacao && (
                          <div className={`text-xs p-2 rounded bg-muted/60 text-slate-600 dark:text-slate-400 font-medium ${isChecked ? 'opacity-60' : ''}`}>
                            <span className="font-bold">Item Obs:</span> {item.observacao}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </ScrollArea>

        {/* Footer do Drawer com Ações */}
        <div className="p-4 sm:p-6 pb-6 sm:pb-6 bg-slate-50 dark:bg-slate-900/40 border-t shrink-0 flex flex-col gap-3">
          {/* Info opcional sobre conferência */}
          {!allItemsChecked && order.items.length > 0 && (
            <div className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 py-1">
              Conferência opcional (não obrigatória para expedir)
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className={`h-12 text-sm font-bold gap-2 text-white transition-all shadow-md ${
                order.expedicao 
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/10' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
              }`}
            >
              {isConfirming ? (
                'Processando...'
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  {order.expedicao ? 'Estornar Expedição' : 'Expedir Pedido'}
                </>
              )}
            </Button>
          </div>
          
          <Button variant="ghost" onClick={onClose} className="h-10 text-xs text-muted-foreground hover:text-foreground">
            Fechar Painel
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
