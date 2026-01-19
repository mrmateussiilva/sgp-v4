import { OrderWithItems, OrderItem } from '../types';
import { api } from '../services/api';
import { groupOrders } from '../pdf/groupOrders';
import { saveAndOpenPdf } from '../pdf/tauriPdfUtils';
import { imageToBase64 } from '@/utils/imageLoader';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const dedupeItemsById = (items: OrderItem[]): OrderItem[] => {
  const seen = new Set<number>();
  const result: OrderItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result;
};

const mergeOrdersForPrint = (orders: OrderWithItems[]): OrderWithItems[] => {
  const merged = new Map<string, OrderWithItems>();

  for (const order of orders) {
    const key = order.numero ? `num:${order.numero}` : `id:${order.id}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...order,
        items: dedupeItemsById(order.items || [])
      });
      continue;
    }

    const combinedItems = dedupeItemsById([...(existing.items || []), ...(order.items || [])]);
    merged.set(key, {
      ...existing,
      ...order,
      items: combinedItems
    });
  }

  return Array.from(merged.values());
};

const hydrateOrderForPrint = async (
  order: OrderWithItems,
  items?: OrderItem[]
): Promise<{ order: OrderWithItems; items?: OrderItem[] }> => {
  try {
    const fullOrder = api.getOrderByIdFresh
      ? await api.getOrderByIdFresh(order.id)
      : await api.getOrderById(order.id);
    const fullItemsById = new Map(fullOrder.items.map((item) => [item.id, item]));

    if (!items || items.length === 0) {
      return {
        order: {
          ...fullOrder,
          ...order,
          data_entrada: order.data_entrada ?? fullOrder.data_entrada,
          observacao: order.observacao ?? fullOrder.observacao
        }
      };
    }

    const mergedItems = items.map((item) => {
      const fullItem = fullItemsById.get(item.id);
      if (!fullItem) return item;
      return {
        ...fullItem,
        ...item,
        observacao: item.observacao ?? fullItem.observacao,
        imagem: item.imagem ?? fullItem.imagem,
        legenda_imagem: item.legenda_imagem ?? fullItem.legenda_imagem
      };
    });

    return {
      order: {
        ...fullOrder,
        ...order,
        data_entrada: order.data_entrada ?? fullOrder.data_entrada,
        observacao: order.observacao ?? fullOrder.observacao,
        items: mergedItems
      },
      items: mergedItems
    };
  } catch (error) {
    console.warn('Falha ao hidratar pedido para impressão, usando dados atuais:', error);
    return { order, items };
  }
};

/**
 * Converte todas as imagens dos pedidos para Base64 para garantir exibição no PDF
 */
const preFetchImages = async (orders: OrderWithItems[]): Promise<OrderWithItems[]> => {
  return Promise.all(
    orders.map(async (order) => {
      if (!order.items) return order;

      const itemsWithBase64 = await Promise.all(
        order.items.map(async (item) => {
          if (item.imagem && (item.imagem.startsWith('http') || !item.imagem.startsWith('data:'))) {
            try {
              const base64 = await imageToBase64(item.imagem);
              return { ...item, imagem: base64 };
            } catch (err) {
              console.warn(`[preFetchImages] Falha ao converter imagem para item ${item.id}:`, err);
            }
          }
          return item;
        })
      );

      return { ...order, items: itemsWithBase64 };
    })
  );
};

/**
 * Imprime ficha de serviço usando React-PDF (Substituindo Templates Legados do Backend)
 * 
 * @param order - Pedido a ser impresso
 * @param _templateType - Tipo de template (Mantido por compatibilidade, mapeia para o novo layout)
 * @param items - Itens específicos para imprimir
 */
export const printOrderServiceForm = async (
  order: OrderWithItems,
  _templateType: 'geral' | 'resumo' = 'resumo',
  items?: OrderItem[]
) => {
  const resolved = await hydrateOrderForPrint(order, items);
  const orderForPrint = resolved.order;

  // Carregamento dinâmico para otimização
  const { pdf } = await import('@react-pdf/renderer');
  const { ProductionReportPDF } = await import('../pdf/ProductionReportPDF');
  const React = await import('react');

  // Pre-fetch de imagens (CONVERTER PARA BASE64)
  const ordersWithImages = await preFetchImages([{ ...orderForPrint }]);

  // Agrupar pedidos
  const grouped = groupOrders(ordersWithImages);

  // Gerar Blob
  // @ts-ignore - JSX element
  const blob = await pdf(React.createElement(ProductionReportPDF, { pedidos: grouped })).toBlob();

  // Nome do arquivo
  const orderIdentifier = String(orderForPrint.numero || orderForPrint.id || 'pedido').trim();
  const filename = `Ficha-${orderIdentifier}-${new Date().toISOString().split('T')[0]}.pdf`;

  // Salvar e abrir via Tauri
  await saveAndOpenPdf(blob, filename);
};

/**
 * Imprime múltiplos pedidos usando React-PDF (Substituindo Templates Legados do Backend)
 * 
 * @param orders - Array de pedidos a serem impressos
 * @param _templateType - Tipo de template (Mantido por compatibilidade)
 */
export const printMultipleOrdersServiceForm = async (
  orders: OrderWithItems[],
  _templateType: 'geral' | 'resumo' = 'resumo'
): Promise<void> => {
  if (orders.length === 0) {
    throw new Error('Nenhum pedido fornecido para impressão');
  }

  const hydratedOrders = await Promise.all(
    orders.map(async (order) => {
      const resolved = await hydrateOrderForPrint(order);
      return resolved.order;
    })
  );

  const mergedOrders = mergeOrdersForPrint(hydratedOrders);

  // Pre-fetch de imagens (CONVERTER PARA BASE64)
  const ordersWithImages = await preFetchImages(mergedOrders);

  const grouped = groupOrders(ordersWithImages);

  // Carregamento dinâmico para otimização
  const { pdf } = await import('@react-pdf/renderer');
  const { ProductionReportPDF } = await import('../pdf/ProductionReportPDF');
  const React = await import('react');

  // Gerar Blob
  // @ts-ignore - JSX element
  const blob = await pdf(React.createElement(ProductionReportPDF, { pedidos: grouped })).toBlob();

  // Nome do arquivo
  const filename = `Fichas-Multiplas-${new Date().toISOString().split('T')[0]}.pdf`;

  // Salvar e abrir via Tauri
  await saveAndOpenPdf(blob, filename);
};
