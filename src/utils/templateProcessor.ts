import { OrderWithItems, OrderItem } from '../types';

// ============================================================================
// TYPES - Tipos do Template
// ============================================================================

export interface TemplateField {
  id: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'table' | 'custom' | 'image';
  label: string;
  key: string; // Chave do dado
  x: number; // em mm
  y: number; // em mm
  width: number; // em mm
  height: number; // em mm
  fontSize?: number;
  bold?: boolean;
  visible: boolean;
  editable: boolean;
  imageUrl?: string;
}

export interface FichaTemplate {
  title: string;
  fields: TemplateField[];
  width: number; // em mm
  height: number; // em mm
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export interface TemplatesConfig {
  geral: FichaTemplate;
  resumo: FichaTemplate;
}

type TemplateType = 'geral' | 'resumo';

// ============================================================================
// STORAGE - Leitura e Escrita de Templates
// ============================================================================

const STORAGE_KEY = 'ficha_templates_config';

export const loadTemplates = (): TemplatesConfig | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as TemplatesConfig;
      if (parsed.geral && parsed.resumo) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar templates:', error);
  }
  return null;
};

// ============================================================================
// DATA MAPPING - Mapeamento de Dados do Pedido
// ============================================================================

interface OrderDataMap {
  [key: string]: string | number | undefined;
}

const formatCurrency = (value: unknown): string => {
  if (value === null || value === undefined) return 'R$ 0,00';
  const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (Number.isNaN(numValue)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(numValue);
};

const formatDate = (dateValue?: string | null): string => {
  if (!dateValue) return '';
  try {
    const date = dateValue.includes('T') ? new Date(dateValue) : new Date(`${dateValue}T00:00:00`);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

const formatDimensions = (item: OrderItem): string => {
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
};

/**
 * Cria um mapa de dados do pedido e item para preencher os campos do template
 */
export const createOrderDataMap = (
  order: OrderWithItems,
  item?: OrderItem
): OrderDataMap => {
  const orderRecord = order as unknown as Record<string, unknown>;
  const itemRecord = item as unknown as Record<string, unknown> || {};
  
  const getValue = (key: string): string | number | undefined => {
    // Primeiro tenta no item, depois no pedido
    if (itemRecord[key] !== undefined) {
      const value = itemRecord[key];
      if (value === null || value === undefined) return undefined;
      if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
      return String(value).trim() || undefined;
    }
    
    if (orderRecord[key] !== undefined) {
      const value = orderRecord[key];
      if (value === null || value === undefined) return undefined;
      if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
      return String(value).trim() || undefined;
    }
    
    return undefined;
  };

  // Campos específicos com formatação
  const dimensoes = item ? formatDimensions(item) : '';
  const cidadeEstado = [
    order.cidade_cliente,
    order.estado_cliente
  ].filter(Boolean).join(' / ') || '';

  return {
    // Dados do pedido
    numero: order.numero || order.id?.toString() || '',
    cliente: order.customer_name || order.cliente || '',
    telefone_cliente: order.telefone_cliente || '',
    cidade_cliente: order.cidade_cliente || '',
    estado_cliente: order.estado_cliente || '',
    cidade_estado: cidadeEstado,
    data_entrada: formatDate(order.data_entrada || order.created_at),
    data_entrega: formatDate(order.data_entrega),
    forma_envio: order.forma_envio || '',
    forma_pagamento_id: order.forma_pagamento_id?.toString() || '',
    valor_frete: formatCurrency((order as any).valor_frete || (order as any).frete || 0),
    total_value: formatCurrency(order.total_value || 0),
    observacao: order.observacao || '',
    
    // Dados do item
    item_name: item?.item_name || item?.descricao || '',
    descricao: item?.descricao || item?.item_name || '',
    dimensoes: dimensoes,
    largura: item?.largura || '',
    altura: item?.altura || '',
    metro_quadrado: item?.metro_quadrado || '',
    designer: item?.designer || '',
    vendedor: item?.vendedor || '',
    tecido: item?.tecido || '',
    quantity: item?.quantity?.toString() || '1',
    unit_price: formatCurrency(item?.valor_unitario || 0),
    subtotal: formatCurrency(item?.subtotal || 0),
    tipo_producao: item?.tipo_producao || '',
    observacao_item: item?.observacao || '',
    imagem: item?.imagem || '',
    legenda_imagem: item?.legenda_imagem || '',
    
    // Campos adicionais do item
    overloque: item?.overloque ? 'Sim' : 'Não',
    elastico: item?.elastico ? 'Sim' : 'Não',
    quantidade_ilhos: item?.quantidade_ilhos || '',
    espaco_ilhos: item?.espaco_ilhos || '',
    valor_ilhos: formatCurrency(item?.valor_ilhos || 0),
    quantidade_cordinha: item?.quantidade_cordinha || '',
    espaco_cordinha: item?.espaco_cordinha || '',
    valor_cordinha: formatCurrency(item?.valor_cordinha || 0),
    emenda: item?.emenda || '',
    emenda_qtd: item?.emenda_qtd || item?.emendaQtd || '',
    
    // Campos genéricos (fallback)
    ...Object.keys(itemRecord).reduce((acc, key) => {
      if (!acc[key]) {
        const value = itemRecord[key];
        if (value !== null && value !== undefined) {
          acc[key] = String(value);
        }
      }
      return acc;
    }, {} as OrderDataMap),
  };
};

// ============================================================================
// TEMPLATE RENDERING - Renderização do Template em HTML/CSS
// ============================================================================

const escapeHtml = (value: string | number | undefined): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const mmToPx = (mm: number): number => mm * 3.779527559;

/**
 * Gera o HTML de um campo do template
 */
const renderField = (
  field: TemplateField,
  dataMap: OrderDataMap,
  scale: number = 1
): string => {
  if (!field.visible) return '';

  const value = dataMap[field.key] || '';
  const displayValue = value ? escapeHtml(String(value)) : '';
  
  const style = `
    position: absolute;
    left: ${mmToPx(field.x) * scale}px;
    top: ${mmToPx(field.y) * scale}px;
    width: ${mmToPx(field.width) * scale}px;
    height: ${mmToPx(field.height) * scale}px;
    font-size: ${(field.fontSize || 11) * scale}pt;
    font-weight: ${field.bold ? 'bold' : 'normal'};
    overflow: hidden;
    word-wrap: break-word;
  `;

  if (field.type === 'image') {
    const imageUrl = field.imageUrl || dataMap.imagem || '';
    if (!imageUrl) return '';
    
    return `
      <div class="template-field template-field-image" style="${style}">
        <img src="${escapeHtml(String(imageUrl))}" 
             alt="${escapeHtml(field.label)}" 
             style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
    `;
  }

  return `
    <div class="template-field template-field-${field.type}" style="${style}">
      ${displayValue || field.label}
    </div>
  `;
};

/**
 * Gera o CSS para o template
 */
const generateTemplateStyles = (template: FichaTemplate): string => {
  return `
    .template-page {
      width: ${mmToPx(template.width)}px;
      height: ${mmToPx(template.height)}px;
      position: relative;
      background: white;
      margin: 0 auto;
      padding: ${mmToPx(template.marginTop)}px ${mmToPx(template.marginRight)}px ${mmToPx(template.marginBottom)}px ${mmToPx(template.marginLeft)}px;
      box-sizing: border-box;
      page-break-after: always;
    }
    
    .template-field {
      box-sizing: border-box;
    }
    
    .template-field-text,
    .template-field-date,
    .template-field-number,
    .template-field-currency {
      display: flex;
      align-items: center;
      padding: 2px;
    }
    
    .template-field-image {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #ddd;
      background: #f9f9f9;
    }
    
    @media print {
      .template-page {
        page-break-inside: avoid;
      }
      
      .template-field {
        page-break-inside: avoid;
      }
    }
  `;
};

/**
 * Gera o HTML completo de uma ficha baseada no template
 */
export const renderTemplate = (
  template: FichaTemplate,
  order: OrderWithItems,
  item?: OrderItem
): string => {
  const dataMap = createOrderDataMap(order, item);
  const fieldsHtml = template.fields
    .filter(f => f.visible)
    .map(field => renderField(field, dataMap))
    .join('\n');

  return `
    <div class="template-page">
      ${fieldsHtml}
    </div>
  `;
};

/**
 * Gera o HTML completo com estilos para impressão
 */
export const generateTemplatePrintContent = (
  templateType: TemplateType,
  order: OrderWithItems,
  items?: OrderItem[]
): { html: string; css: string } | null => {
  const templates = loadTemplates();
  if (!templates) {
    console.warn('Templates não encontrados no localStorage');
    return null;
  }

  const template = templates[templateType];
  if (!template) {
    console.warn(`Template ${templateType} não encontrado`);
    return null;
  }

  // Se não houver itens especificados, usar todos os itens do pedido
  const itemsToRender = items || order.items || [];
  
  if (itemsToRender.length === 0) {
    // Renderizar apenas com dados do pedido
    const html = renderTemplate(template, order);
    const css = generateTemplateStyles(template);
    return { html, css };
  }

  // Renderizar uma ficha por item
  const pagesHtml = itemsToRender
    .map(item => renderTemplate(template, order, item))
    .join('\n');

  const css = generateTemplateStyles(template);
  
  return {
    html: pagesHtml,
    css,
  };
};

