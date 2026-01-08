/**
 * Adapter para converter dados do sistema (OrderWithItems, OrderItem) 
 * para o formato esperado pelo gerador de PDF (ItemRelatorio)
 */

import { OrderWithItems, OrderItem } from '../types';
import { ItemRelatorio, baixarPDF, abrirPDF } from './pdfGenerator';
import { imageToBase64 } from './imageLoader';
import { isValidImagePath } from './path';
import { canonicalizeFromOrderItem, toPrintFields } from '@/mappers/productionItems';
import { logger } from './logger';

// ============================================================================
// FUNÇÕES DE CONVERSÃO
// ============================================================================

/**
 * Formata dimensões do item
 */
function formatarDimensoes(item: OrderItem): string {
  const largura = item.largura?.trim() || '';
  const altura = item.altura?.trim() || '';
  const metroQuadrado = item.metro_quadrado?.trim() || '';
  
  if (largura && altura) {
    const dimensoes = `${largura} x ${altura}`;
    if (metroQuadrado) {
      return `${dimensoes} = ${metroQuadrado} m²`;
    }
    return dimensoes;
  }
  return '';
}

/**
 * Formata cidade e estado
 */
function formatarCidadeEstado(order: OrderWithItems): string {
  const partes = [order.cidade_cliente, order.estado_cliente].filter(Boolean);
  if (partes.length === 2) {
    return `${partes[0]} (${partes[1]})`;
  }
  return partes.join('');
}

/**
 * Gera resumo de ilhós
 */
function formatarIlhosResumo(item: OrderItem): string {
  const qtd = item.quantidade_ilhos;
  const espaco = item.espaco_ilhos;
  
  if (!qtd && !espaco) return '';
  
  const partes: string[] = [];
  if (qtd) partes.push(`${qtd}`);
  if (espaco) partes.push(`(${espaco})`);
  
  return partes.join(' ') || 'Nenhum';
}

/**
 * Gera resumo de cordinha
 */
function formatarCordinhaResumo(item: OrderItem): string {
  const qtd = item.quantidade_cordinha;
  const espaco = item.espaco_cordinha;
  
  if (!qtd && !espaco) return '';
  
  const partes: string[] = [];
  if (qtd) partes.push(`${qtd}`);
  if (espaco) partes.push(`(${espaco})`);
  
  return partes.join(' ') || 'Nenhum';
}

/**
 * Gera resumo de acabamentos para painel
 */
function formatarAcabamentosPainel(item: OrderItem): string {
  const acabamentos: string[] = [];
  
  if (item.overloque) acabamentos.push('Overloque');
  if (item.elastico) acabamentos.push('Elástico');
  
  return acabamentos.length > 0 ? acabamentos.join(' + ') : '';
}

/**
 * Gera resumo de acabamento totem
 */
function formatarAcabamentoTotem(item: OrderItem): string {
  const acabamento = item.acabamento_totem;
  if (!acabamento) return '';
  
  switch (acabamento) {
    case 'com_pe': return 'Com pé';
    case 'sem_pe': return 'Sem pé';
    case 'outro': return item.acabamento_totem_outro || 'Outro';
    default: return acabamento;
  }
}

/**
 * Formata label de emenda
 */
function formatarEmendaLabel(item: OrderItem): string {
  if (!item.emenda) return 'Não';
  
  switch (item.emenda) {
    case 'vertical': return 'Vertical';
    case 'horizontal': return 'Horizontal';
    default: return item.emenda;
  }
}

/**
 * Converte OrderItem para ItemRelatorio
 */
async function converterItem(order: OrderWithItems, item: OrderItem): Promise<ItemRelatorio> {
  // Obter campos canônicos do mapper
  const printFields = toPrintFields(canonicalizeFromOrderItem(item));
  
  // Converter imagem para base64 se necessário
  let imagemBase64: string | undefined;
  if (item.imagem && isValidImagePath(item.imagem)) {
    try {
      imagemBase64 = await imageToBase64(item.imagem);
    } catch (error) {
      logger.warn('[pdfReportAdapter] Falha ao carregar imagem:', item.imagem, error);
    }
  }
  
  return {
    numero: order.numero || order.id?.toString() || '000000000',
    cliente: order.customer_name || order.cliente || 'Cliente não informado',
    telefone_cliente: order.telefone_cliente,
    cidade_estado: formatarCidadeEstado(order),
    descricao: item.item_name || item.descricao || 'Sem descrição',
    dimensoes: formatarDimensoes(item),
    quantity: item.quantity || 1,
    material: printFields.material || item.tecido,
    emenda_label: formatarEmendaLabel(item),
    emenda_qtd: typeof item.emenda_qtd === 'number' ? item.emenda_qtd : 
                typeof item.emendaQtd === 'number' ? item.emendaQtd :
                typeof item.emenda_qtd === 'string' ? Number.parseInt(item.emenda_qtd, 10) || undefined :
                typeof item.emendaQtd === 'string' ? Number.parseInt(item.emendaQtd, 10) || undefined :
                undefined,
    tipo_producao: item.tipo_producao || 'painel',
    
    // Campos específicos - Painel/Tecido
    acabamentos_painel: formatarAcabamentosPainel(item),
    overloque: item.overloque ? 'Sim' : undefined,
    elastico: item.elastico ? 'Sim' : undefined,
    ilhos_resumo: formatarIlhosResumo(item),
    cordinha_resumo: formatarCordinhaResumo(item),
    quantidade_paineis: typeof item.quantidade_paineis === 'number' ? item.quantidade_paineis :
                        typeof item.quantidade_paineis === 'string' ? Number.parseInt(item.quantidade_paineis, 10) || undefined :
                        undefined,
    
    // Campos específicos - Totem
    acabamento_totem_resumo: formatarAcabamentoTotem(item),
    acabamento_totem_outro: item.acabamento_totem_outro,
    quantidade_totem: typeof item.quantidade_totem === 'number' ? item.quantidade_totem :
                      typeof item.quantidade_totem === 'string' ? Number.parseInt(item.quantidade_totem, 10) || undefined :
                      undefined,
    
    // Campos específicos - Lona
    acabamento_lona: item.acabamento_lona === 'refilar' ? 'Refilar' : 
                     item.acabamento_lona === 'nao_refilar' ? 'Não refilar' : 
                     item.acabamento_lona,
    quantidade_lona: typeof item.quantidade_lona === 'number' ? item.quantidade_lona :
                     typeof item.quantidade_lona === 'string' ? Number.parseInt(item.quantidade_lona, 10) || undefined :
                     undefined,
    quantidade_ilhos: item.quantidade_ilhos ? Number(item.quantidade_ilhos) : undefined,
    espaco_ilhos: item.espaco_ilhos,
    quantidade_cordinha: item.quantidade_cordinha ? Number(item.quantidade_cordinha) : undefined,
    espaco_cordinha: item.espaco_cordinha,
    
    // Campos específicos - Adesivo
    tipo_adesivo: item.tipo_adesivo,
    quantidade_adesivo: typeof item.quantidade_adesivo === 'number' ? item.quantidade_adesivo :
                        typeof item.quantidade_adesivo === 'string' ? Number.parseInt(item.quantidade_adesivo, 10) || undefined :
                        undefined,
    
    // Opcionais gerais
    observacao_item: item.observacao,
    designer: item.designer,
    vendedor: item.vendedor,
    imagem: imagemBase64,
    legenda_imagem: item.legenda_imagem,
  };
}

/**
 * Converte array de OrderItems para ItemRelatorio[]
 */
export async function converterItensParaPDF(
  order: OrderWithItems,
  items?: OrderItem[]
): Promise<ItemRelatorio[]> {
  const itensParaConverter = items || order.items || [];
  
  if (itensParaConverter.length === 0) {
    throw new Error('Nenhum item encontrado para gerar o PDF');
  }
  
  logger.debug('[pdfReportAdapter] Convertendo itens:', {
    orderId: order.id,
    totalItens: itensParaConverter.length,
  });
  
  const itensConvertidos = await Promise.all(
    itensParaConverter.map(item => converterItem(order, item))
  );
  
  return itensConvertidos;
}

// ============================================================================
// FUNÇÕES DE EXPORTAÇÃO (WRAPPERS)
// ============================================================================

/**
 * Baixa PDF do relatório de pedidos
 */
export async function baixarRelatorioResumoPDF(
  order: OrderWithItems,
  items?: OrderItem[],
  nomeArquivo?: string
): Promise<void> {
  const itens = await converterItensParaPDF(order, items);
  const nome = nomeArquivo || `relatorio-pedido-${order.numero || order.id}.pdf`;
  await baixarPDF(itens, nome);
}

/**
 * Abre PDF do relatório em nova aba
 */
export async function abrirRelatorioResumoPDF(
  order: OrderWithItems,
  items?: OrderItem[]
): Promise<void> {
  const itens = await converterItensParaPDF(order, items);
  await abrirPDF(itens);
}

/**
 * Gera PDF de múltiplos pedidos (todos os itens juntos)
 */
export async function gerarRelatorioMultiplosPedidosPDF(
  orders: OrderWithItems[],
  action: 'baixar' | 'abrir' = 'abrir',
  nomeArquivo?: string
): Promise<void> {
  if (!orders || orders.length === 0) {
    throw new Error('Nenhum pedido fornecido');
  }
  
  try {
    console.log('[pdfReportAdapter] Iniciando conversão de pedidos:', { totalPedidos: orders.length });
    
    // Converter todos os itens de todos os pedidos
    const todosItens: ItemRelatorio[] = [];
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`[pdfReportAdapter] Convertendo pedido ${i + 1}/${orders.length}:`, order.id);
      
      try {
        const itens = await converterItensParaPDF(order);
        todosItens.push(...itens);
        console.log(`[pdfReportAdapter] Pedido ${order.id} convertido:`, itens.length, 'itens');
      } catch (error) {
        console.error(`[pdfReportAdapter] Erro ao converter pedido ${order.id}:`, error);
        // Continuar com outros pedidos
      }
    }
    
    if (todosItens.length === 0) {
      throw new Error('Nenhum item foi convertido com sucesso');
    }
    
    logger.debug('[pdfReportAdapter] Gerando PDF de múltiplos pedidos:', {
      totalPedidos: orders.length,
      totalItens: todosItens.length,
    });
    
    console.log('[pdfReportAdapter] Chamando função de PDF:', action, { totalItens: todosItens.length });
    
    switch (action) {
      case 'baixar':
        await baixarPDF(todosItens, nomeArquivo || 'relatorio-pedidos.pdf');
        break;
      case 'abrir':
      default:
        await abrirPDF(todosItens);
        break;
    }
    
    console.log('[pdfReportAdapter] PDF gerado com sucesso');
  } catch (error) {
    console.error('[pdfReportAdapter] Erro completo:', error);
    throw error;
  }
}

