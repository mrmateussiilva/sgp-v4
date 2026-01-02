import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { OrderItem, OrderWithItems } from '../types';
import { Printer, Save, ArrowUp, ArrowDown, X } from 'lucide-react';
import { printOrderServiceForm } from '../utils/printOrderServiceForm';
import { isTauri } from '@/utils/isTauri';

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

  // Função auxiliar para parsear valores monetários
  const parseCurrencyValue = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const raw = String(value).trim();
    if (!raw) return 0;
    const cleaned = raw.replace(/[^\d.,-]/g, '');
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned;
    if (lastComma > -1 && lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > -1 && lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(',', '.');
    }
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  // Salvar em PDF
  const handleSavePDF = async () => {
    if (!order) return;
    
    setIsGenerating(true);
    try {
      const reorderedOrder = getReorderedOrder();
      if (!reorderedOrder) return;

      // Usar jsPDF para gerar PDF
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Configurações da página
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Cabeçalho
      doc.setFontSize(18);
      doc.text(`Pedido #${order.numero || order.id}`, margin, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.text(`Cliente: ${order.customer_name || order.cliente || 'Não informado'}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Telefone: ${order.telefone_cliente || 'Não informado'}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Cidade: ${order.cidade_cliente || 'Não informado'}`, margin, yPosition);
      yPosition += 8;
      
      if (order.data_entrada) {
        const entradaDate = new Date(order.data_entrada).toLocaleDateString('pt-BR');
        doc.text(`Data de Entrada: ${entradaDate}`, margin, yPosition);
        yPosition += 8;
      }
      
      if (order.data_entrega) {
        const entregaDate = new Date(order.data_entrega).toLocaleDateString('pt-BR');
        doc.text(`Data de Entrega: ${entregaDate}`, margin, yPosition);
        yPosition += 8;
      }
      
      yPosition += 5;

      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Itens reordenados
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Itens do Pedido:', margin, yPosition);
      yPosition += 10;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      let totalItems = 0;
      orderedItems.forEach((item, index) => {
        // Verificar se precisa de nova página
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
        }

        const itemNumber = index + 1;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${itemNumber}. ${item.item_name}`, margin, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        if (item.descricao) {
          const descricao = doc.splitTextToSize(`   Descrição: ${item.descricao}`, pageWidth - margin * 2 - 5);
          doc.text(descricao, margin + 5, yPosition);
          yPosition += descricao.length * 6;
        }
        
        if (item.largura && item.altura) {
          doc.text(`   Dimensões: ${item.largura} x ${item.altura}`, margin + 5, yPosition);
          yPosition += 6;
        }
        
        if (item.metro_quadrado) {
          doc.text(`   Área: ${item.metro_quadrado} m²`, margin + 5, yPosition);
          yPosition += 6;
        }
        
        if (item.tipo_producao) {
          doc.text(`   Tipo de Produção: ${item.tipo_producao}`, margin + 5, yPosition);
          yPosition += 6;
        }
        
        if (item.tecido) {
          doc.text(`   Tecido: ${item.tecido}`, margin + 5, yPosition);
          yPosition += 6;
        }
        
        doc.text(`   Quantidade: ${item.quantity}`, margin + 5, yPosition);
        yPosition += 6;
        
        const subtotal = parseCurrencyValue(item.subtotal);
        doc.text(`   Subtotal: R$ ${subtotal.toFixed(2)}`, margin + 5, yPosition);
        yPosition += 10;
        
        totalItems += item.quantity;
      });

      // Total
      yPosition += 5;
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total de Itens: ${totalItems}`, margin, yPosition);
      yPosition += 8;
      
      const freightValue = parseCurrencyValue(order.valor_frete || order.valor_frete || 0);
      if (freightValue > 0) {
        doc.text(`Frete: R$ ${freightValue.toFixed(2)}`, margin, yPosition);
        yPosition += 8;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      const totalValue = parseCurrencyValue(order.total_value || order.valor_total || 0);
      doc.text(`Total: R$ ${totalValue.toFixed(2)}`, margin, yPosition);

      // Salvar PDF
      const orderIdentifier = String(order.numero || order.id || 'pedido').trim();
      const sanitizedIdentifier = orderIdentifier
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-');
      const filename = `Pedido-${sanitizedIdentifier}-${new Date().toISOString().split('T')[0]}.pdf`;

      // Verificar se está no Tauri
      const tauriCheck = isTauri();

      if (tauriCheck) {
        try {
          const { save } = await import('@tauri-apps/plugin-dialog');
          const { writeFile } = await import('@tauri-apps/plugin-fs');
          const { open } = await import('@tauri-apps/plugin-shell');

          const filePath = await save({
            defaultPath: filename,
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
          });

          if (filePath) {
            const blob = doc.output('blob');
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            await writeFile(filePath, uint8Array);
            await open(filePath);
          }
        } catch (error) {
          console.error('Erro ao salvar PDF via Tauri:', error);
          doc.save(filename);
        }
      } else {
        doc.save(filename);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Imprimir
  const handlePrint = async () => {
    if (!order) return;
    
    setIsGenerating(true);
    try {
      const reorderedOrder = getReorderedOrder();
      if (!reorderedOrder) return;

      // Usar template da API (sempre usa template 'geral')
      await printOrderServiceForm(reorderedOrder, 'geral');
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao imprimir. Tente novamente.';
      alert(`Erro ao imprimir: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

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

