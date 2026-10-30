import { OrderWithItems, OrderItem } from '../types';
import { api } from '../services/api';
import { groupOrders } from '../pdf/groupOrders';
import { saveAndOpenPdf } from '../pdf/tauriPdfUtils';
import { imageToBase64 } from '@/utils/imageLoader';
import { logger } from '@/utils/logger';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================


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
          ...order,
          ...fullOrder,
          data_entrada: fullOrder.data_entrada || order.data_entrada,
          observacao: (order.observacao && order.observacao.trim()) || fullOrder.observacao,
          items: fullOrder.items && fullOrder.items.length > 0 ? fullOrder.items : order.items
        }
      };
    }

    const mergedItems = items.map((item) => {
      const fullItem = fullItemsById.get(item.id);
      if (!fullItem) return item;
      return {
        ...fullItem,
        ...item,
        terceirizado: item.terceirizado ?? fullItem.terceirizado,
        acabamento_lona: item.acabamento_lona || fullItem.acabamento_lona,
        acabamento_totem: item.acabamento_totem || fullItem.acabamento_totem,
        acabamento_totem_outro: item.acabamento_totem_outro || fullItem.acabamento_totem_outro,
        observacao: (item.observacao && item.observacao.trim()) || fullItem.observacao,
        imagem: (item.imagem && item.imagem.trim()) || fullItem.imagem,
        legenda_imagem: (item.legenda_imagem && item.legenda_imagem.trim()) || fullItem.legenda_imagem
      };
    });

    return {
      order: {
        ...order,
        ...fullOrder,
        data_entrada: fullOrder.data_entrada || order.data_entrada,
        observacao: (order.observacao && order.observacao.trim()) || fullOrder.observacao,
        items: mergedItems
      },
      items: mergedItems
    };
  } catch {
    return { order, items };
  }
};

/**
 * Converte todas as imagens dos pedidos para Base64 para garantir exibição no PDF
 */
const preFetchImages = async (orders: OrderWithItems[]): Promise<OrderWithItems[]> => {
  const result: OrderWithItems[] = [];
  // Processar pedidos SEQUENCIALMENTE para evitar explosão de requests
  for (const order of orders) {
    if (!order.items) {
      result.push(order);
      continue;
    }

    const itemsWithBase64: OrderItem[] = [];
    // Processar imagens de cada item SEQUENCIALMENTE
    for (const item of order.items) {
      if (item.imagem && (item.imagem.startsWith('http') || !item.imagem.startsWith('data:'))) {
        try {
          const base64 = await imageToBase64(item.imagem);
          itemsWithBase64.push({ ...item, imagem: base64 });
        } catch (imgError) {
          logger.warn(`[printOrderServiceForm] Falha ao converter imagem do item "${item.descricao || item.id}" para PDF:`, imgError);
          // Converter falhou: zerar imagem para evitar caixa azul quebrada no PDF
          itemsWithBase64.push({ ...item, imagem: undefined });
        }
      } else {
        itemsWithBase64.push(item);
      }
    }

    result.push({ ...order, items: itemsWithBase64 });
  }
  return result;
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
  // @ts-expect-error - JSX element
  const blob = await pdf(React.createElement(ProductionReportPDF, { pedidos: grouped })).toBlob();

  // Nome do arquivo sanitizado para compatibilidade Windows
  const orderIdentifier = String(orderForPrint.numero || orderForPrint.id || 'pedido')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timestamp = now.toLocaleTimeString('pt-BR').replace(/:/g, '-');
  const filename = `Ficha-${orderIdentifier}-${localDate}_${timestamp}.pdf`;

  // Salvar e abrir via Tauri
  await saveAndOpenPdf(blob, filename);
};

/**
 * Gera o Blob do PDF para múltiplos pedidos
 */
export const generateMultipleOrdersPdfBlob = async (
  orders: OrderWithItems[]
): Promise<{ blob: Blob; filename: string }> => {
  if (orders.length === 0) {
    throw new Error('Nenhum pedido fornecido para geração de PDF');
  }

  // Hidratar pedidos SEQUENCIALMENTE para evitar explosão de GETs
  const hydratedOrders: OrderWithItems[] = [];
  for (const order of orders) {
    const resolved = await hydrateOrderForPrint(order);
    hydratedOrders.push(resolved.order);
  }

  // Pre-fetch de imagens (CONVERTER PARA BASE64)
  const ordersWithImages = await preFetchImages(hydratedOrders);

  const grouped = groupOrders(ordersWithImages);

  // Carregamento dinâmico para otimização
  const { pdf } = await import('@react-pdf/renderer');
  const { ProductionReportPDF } = await import('../pdf/ProductionReportPDF');
  const React = await import('react');

  // Gerar Blob
  // @ts-expect-error - JSX element
  const blob = await pdf(React.createElement(ProductionReportPDF, { pedidos: grouped })).toBlob();

  // Nome do arquivo com timestamp e data local para evitar fuso incorreto
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timestamp = now.toLocaleTimeString('pt-BR').replace(/:/g, '-');
  const filename = `Fichas-Multiplas-${localDate}_${timestamp}.pdf`;

  return { blob, filename };
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
  const { blob, filename } = await generateMultipleOrdersPdfBlob(orders);

  // Salvar e abrir via Tauri
  await saveAndOpenPdf(blob, filename);
};
