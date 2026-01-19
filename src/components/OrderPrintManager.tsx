import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { OrderItem, OrderWithItems } from '../types';
import { Printer, Save, ArrowUp, ArrowDown, X } from 'lucide-react';
import { saveAndOpenPdf } from '../pdf/tauriPdfUtils';
import { groupOrders } from '../pdf/groupOrders';
import { imageToBase64 } from '@/utils/imageLoader';

interface OrderPrintManagerProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithItems | null;
}

export const OrderPrintManager: React.FC<OrderPrintManagerProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const [orderedItems, setOrderedItems] = useState<OrderItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Inicializar com os itens do pedido quando o modal abrir
  useEffect(() => {
    if (isOpen && order?.items) {
      setOrderedItems([...order.items]);
    }
  }, [isOpen, order]);

  // Mover item para cima
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...orderedItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setOrderedItems(newItems);
  };

  // Mover item para baixo
  const moveItemDown = (index: number) => {
    if (index === orderedItems.length - 1) return;
    const newItems = [...orderedItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setOrderedItems(newItems);
  };

  // Criar pedido com itens reordenados
  const getReorderedOrder = (): OrderWithItems | null => {
    if (!order) return null;
    return {
      ...order,
      items: orderedItems,
    };
  };

  // Função auxiliar para formatar valores monetários na exibição
  const parseCurrencyValue = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const raw = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  // Gerar e Salvar/Imprimir PDF usando React-PDF
  const generatePDF = async (action: 'save' | 'print') => {
    if (!order) return;

    setIsGenerating(true);
    try {
      const reorderedOrder = getReorderedOrder();
      if (!reorderedOrder) return;

      // Importar dinamicamente para reduzir o bundle inicial
      const { pdf } = await import('@react-pdf/renderer');
      const { ProductionReportPDF } = await import('../pdf/ProductionReportPDF');

      // Pre-fetch de imagens (CONVERTER PARA BASE64)
      const itemsWithBase64 = await Promise.all(
        reorderedOrder.items.map(async (item) => {
          if (item.imagem && (item.imagem.startsWith('http') || !item.imagem.startsWith('data:'))) {
            try {
              const base64 = await imageToBase64(item.imagem);
              return { ...item, imagem: base64 };
            } catch (err) {
              console.warn(`[OrderPrintManager] Falha ao converter imagem para item ${item.id}:`, err);
            }
          }
          return item;
        })
      );

      const orderWithImages = { ...reorderedOrder, items: itemsWithBase64 };

      // Agrupar itens de forma correta (respeitando reordenação)
      // Garantir que designer/vendedor sejam propagados se estiverem nos itens mas não no pedido
      const orderWithResponsibles = {
        ...orderWithImages,
        designer: (orderWithImages as any).designer || orderWithImages.items?.[0]?.designer,
        vendedor: (orderWithImages as any).vendedor || orderWithImages.items?.[0]?.vendedor,
      };
      const grouped = groupOrders([orderWithResponsibles as any]);

      // Gerar PDF usando React (instantâneo!)
      const blob = await pdf(<ProductionReportPDF pedidos={grouped} />).toBlob();

      // Gerar nome do arquivo com timestamp para evitar cache
      const orderIdentifier = String(order.numero || order.id || 'pedido').trim();
      const timestamp = new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-');
      const filename = `Producao-${orderIdentifier}-${new Date().toISOString().split('T')[0]}_${timestamp}.pdf`;

      // No Tauri, salvar e abrir é o fluxo mais robusto para impressão
      await saveAndOpenPdf(blob, filename);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar PDF. Tente novamente.';
      alert(`Erro ao gerar PDF: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Salvar em PDF
  const handleSavePDF = () => generatePDF('save');

  // Imprimir
  const handlePrint = () => generatePDF('print');

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Gerenciar Impressão - Pedido #{order.numero || order.id}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Informações do Pedido */}
          <div className="bg-slate-50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">Informações do Pedido</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Cliente:</span> {order.customer_name || order.cliente || 'Não informado'}
              </div>
              <div>
                <span className="font-medium">Telefone:</span> {order.telefone_cliente || 'Não informado'}
              </div>
              <div>
                <span className="font-medium">Cidade:</span> {order.cidade_cliente || 'Não informado'}
              </div>
              <div>
                <span className="font-medium">Total:</span> R$ {
                  parseCurrencyValue(order.total_value || order.valor_total || 0).toFixed(2)
                }
              </div>
            </div>
          </div>

          {/* Lista de Itens Ordenáveis */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Itens do Pedido (Reordenar)</h3>
            <div className="space-y-2">
              {orderedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum item encontrado
                </div>
              ) : (
                orderedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Número do item */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-semibold">
                      {index + 1}
                    </div>

                    {/* Informações do item */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{item.item_name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {item.descricao && <span>Descrição: {item.descricao} • </span>}
                        {item.largura && item.altura && (
                          <span>Dimensões: {item.largura} x {item.altura} • </span>
                        )}
                        <span>Quantidade: {item.quantity}</span>
                      </div>
                    </div>

                    {/* Botões de ordenação */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveItemUp(index)}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveItemDown(index)}
                        disabled={index === orderedItems.length - 1}
                        className="h-8 w-8 p-0"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            onClick={handleSavePDF}
            disabled={isGenerating || orderedItems.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isGenerating ? 'Gerando PDF...' : 'Salvar PDF'}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isGenerating || orderedItems.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            {isGenerating ? 'Imprimindo...' : 'Imprimir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

