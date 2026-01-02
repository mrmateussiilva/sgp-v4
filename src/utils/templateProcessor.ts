import { OrderWithItems, OrderItem, TemplateFieldConfig as TemplateField, FichaTemplateConfig as FichaTemplate, FichaTemplatesConfig as TemplatesConfig, TemplateType } from '../types';
import { imageToBase64 } from './imageLoader';
import { isValidImagePath } from './path';
import { apiClient } from '../services/apiClient';

// ============================================================================
// STORAGE - Leitura e Escrita de Templates
// ============================================================================

const STORAGE_KEY = 'ficha_templates_config';
let templatesCache: TemplatesConfig | null = null;
let fetchPromise: Promise<TemplatesConfig | null> | null = null;

const ensureFieldDefaults = (field: TemplateField): TemplateField => ({
  ...field,
  fontSize: field.fontSize ?? 11,
  visible: field.visible !== false,
  editable: field.editable !== false,
});

const normalizeTemplate = (template?: FichaTemplate, templateType?: TemplateType): FichaTemplate => ({
  title: template?.title ?? '',
  width: template?.width ?? 210,
  height: template?.height ?? 297,
  marginTop: template?.marginTop ?? 0,
  marginBottom: template?.marginBottom ?? 0,
  marginLeft: template?.marginLeft ?? 0,
  marginRight: template?.marginRight ?? 0,
  fields: (template?.fields ?? []).map(ensureFieldDefaults),
  templateType: templateType ?? template?.templateType,
  updatedAt: template?.updatedAt,
});

const normalizeTemplates = (templates: TemplatesConfig): TemplatesConfig => ({
  geral: normalizeTemplate(templates.geral, 'geral'),
  resumo: normalizeTemplate(templates.resumo, 'resumo'),
});

const saveTemplatesToStorage = (templates: TemplatesConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.warn('[templateProcessor] Não foi possível salvar templates localmente:', error);
  }
};

const getLocalTemplates = (): TemplatesConfig | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }
    const parsed = JSON.parse(saved) as TemplatesConfig;
    if (parsed.geral && parsed.resumo) {
      return normalizeTemplates(parsed);
    }
  } catch (error) {
    console.error('[templateProcessor] Erro ao carregar templates locais:', error);
  }
  return null;
};

const fetchTemplatesFromServer = async (): Promise<TemplatesConfig | null> => {
  try {
    const response = await apiClient.get<TemplatesConfig>('/fichas/templates');
    const normalized = normalizeTemplates(response.data);
    saveTemplatesToStorage(response.data);
    return normalized;
  } catch (error) {
    // Silenciar erros 422 (Unprocessable Content) - geralmente significa que o endpoint não está disponível ou não há templates configurados
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status === 422) {
      // Erro 422 é esperado quando não há templates configurados - não logar como warning
      return null;
    }
    // Logar apenas erros inesperados
    if (axiosError.response?.status !== 404) {
      console.warn('[templateProcessor] Falha ao buscar templates no servidor:', error);
    }
    return null;
  }
};

export const loadTemplates = async (): Promise<TemplatesConfig | null> => {
  // Sempre tentar buscar da API primeiro
  if (!fetchPromise) {
    fetchPromise = fetchTemplatesFromServer().finally(() => {
      fetchPromise = null;
    });
  }

  const remote = await fetchPromise;
  if (remote) {
    templatesCache = remote;
    return templatesCache;
  }

  // Se a API não estiver disponível, tentar usar cache local como fallback
  if (!templatesCache) {
    const local = getLocalTemplates();
    if (local) {
      templatesCache = local;
      console.warn('[templateProcessor] API indisponível, usando cache local');
      return templatesCache;
    }
  } else {
    // Se já tiver em cache, retornar (mas ainda assim tentar atualizar em background)
    return templatesCache;
  }

  // Se não houver templates remotos nem locais, retornar null
  return null;
};

// ============================================================================
// DATA MAPPING - Mapeamento de Dados do Pedido
// ============================================================================

interface OrderDataMap {
  [key: string]: string | number | undefined;
}

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
  const itemRecord = item as unknown as Record<string, unknown> || {};
  
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
    // Valores monetários removidos (retornam vazio)
    valor_frete: '',
    total_value: '',
    observacao: order.observacao || '',
    
    // Status e prioridade do pedido
    status: order.status || '',
    prioridade: order.prioridade || '',
    
    // Status de produção (checkboxes) - convertidos para texto
    financeiro: order.financeiro ? 'Sim' : 'Não',
    conferencia: order.conferencia ? 'Sim' : 'Não',
    sublimacao: order.sublimacao ? 'Sim' : 'Não',
    costura: order.costura ? 'Sim' : 'Não',
    expedicao: order.expedicao ? 'Sim' : 'Não',
    pronto: order.pronto ? 'Sim' : 'Não',
    sublimacao_maquina: order.sublimacao_maquina || '',
    sublimacao_data_impressao: formatDate(order.sublimacao_data_impressao),
    
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
    // Valores monetários removidos (retornam vazio)
    unit_price: '',
    subtotal: '',
    tipo_producao: item?.tipo_producao || '',
    observacao_item: item?.observacao || '',
    imagem: item?.imagem || '',
    legenda_imagem: item?.legenda_imagem || '',
    
    // Campos adicionais do item
    overloque: item?.overloque ? 'Sim' : 'Não',
    elastico: item?.elastico ? 'Sim' : 'Não',
    tipo_acabamento: item?.tipo_acabamento || '',
    quantidade_ilhos: item?.quantidade_ilhos || '',
    espaco_ilhos: item?.espaco_ilhos || '',
    valor_ilhos: '', // Valor monetário removido
    quantidade_cordinha: item?.quantidade_cordinha || '',
    espaco_cordinha: item?.espaco_cordinha || '',
    valor_cordinha: '', // Valor monetário removido
    emenda: item?.emenda || '',
    emenda_qtd: item?.emenda_qtd || item?.emendaQtd || '',
    
    // Campos de painéis
    quantidade_paineis: item?.quantidade_paineis || '',
    valor_painel: '', // Valor monetário removido
    valores_adicionais: '', // Valor monetário removido
    valor_unitario: '', // Valor monetário removido
    
    // Campos booleanos
    terceirizado: item?.terceirizado ? 'Sim' : 'Não',
    ziper: item?.ziper ? 'Sim' : 'Não',
    cordinha_extra: item?.cordinha_extra ? 'Sim' : 'Não',
    alcinha: item?.alcinha ? 'Sim' : 'Não',
    toalha_pronta: item?.toalha_pronta ? 'Sim' : 'Não',
    
    // Campos de lona
    acabamento_lona: item?.acabamento_lona || '',
    valor_lona: '', // Valor monetário removido
    quantidade_lona: item?.quantidade_lona || '',
    outros_valores_lona: '', // Valor monetário removido
    
    // Campos de adesivo
    tipo_adesivo: item?.tipo_adesivo || '',
    valor_adesivo: '', // Valor monetário removido
    quantidade_adesivo: item?.quantidade_adesivo || '',
    outros_valores_adesivo: '', // Valor monetário removido
    
    // Campos de totem
    acabamento_totem: item?.acabamento_totem || '',
    acabamento_totem_outro: item?.acabamento_totem_outro || '',
    valor_totem: '', // Valor monetário removido
    quantidade_totem: item?.quantidade_totem || '',
    outros_valores_totem: '', // Valor monetário removido
    
    // Campos genéricos (fallback) - excluindo valores monetários
    ...Object.keys(itemRecord).reduce((acc, key) => {
      // Pular campos de valores monetários
      const valorFields = ['valor_frete', 'total_value', 'unit_price', 'subtotal', 
                          'valor_ilhos', 'valor_cordinha', 'valor_painel', 'valores_adicionais',
                          'valor_unitario', 'valor_lona', 'outros_valores_lona', 'valor_adesivo',
                          'outros_valores_adesivo', 'valor_totem', 'outros_valores_totem'];
      if (valorFields.includes(key.toLowerCase())) {
        return acc;
      }
      
      if (!acc[key]) {
        const value = itemRecord[key];
        if (value !== null && value !== undefined) {
          // Converter booleanos para texto
          if (typeof value === 'boolean') {
            acc[key] = value ? 'Sim' : 'Não';
          } else {
            acc[key] = String(value);
          }
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
  scale: number = 1,
  imageBase64Map?: Map<string, string>
): string => {
  if (field.visible === false) return '';

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
    const resolvedImagePath = field.imageUrl ?? dataMap.imagem ?? '';
    const imagePath = typeof resolvedImagePath === 'number' ? String(resolvedImagePath) : resolvedImagePath;
    if (!imagePath) return '';
    
    // Usar base64 se disponível, senão usar o caminho original
    const imageUrl = imageBase64Map?.has(imagePath) 
      ? imageBase64Map.get(imagePath)! 
      : imagePath;
    
    return `
      <div class="template-field template-field-image" style="${style}">
        <img src="${escapeHtml(String(imageUrl))}" 
             alt="${escapeHtml(field.label)}" 
             style="max-width: 100%; max-height: 100%; object-fit: contain;" />
      </div>
    `;
  }

  // Se houver label e valor, mostrar "Label: valor", senão mostrar apenas o que existir
  let content = '';
  if (field.label && displayValue) {
    content = `${field.label} ${displayValue}`;
  } else if (displayValue) {
    content = displayValue;
  } else if (field.label) {
    content = field.label;
  }

  return `
    <div class="template-field template-field-${field.type}" style="${style}">
      ${content}
    </div>
  `;
};

/**
 * Gera o CSS para o template
 */
    const generateTemplateStyles = (template: FichaTemplate): string => {
      const isResumo = template.title?.toLowerCase().includes('resumo');
      
      return `
        .template-page {
          width: ${mmToPx(template.width)}px;
          height: ${mmToPx(template.height)}px;
          position: relative;
          background: white;
          margin: 0 auto;
          padding: ${mmToPx(template.marginTop)}px ${mmToPx(template.marginRight)}px ${mmToPx(template.marginBottom)}px ${mmToPx(template.marginLeft)}px;
          box-sizing: border-box;
          ${isResumo ? '' : 'page-break-after: always;'}
        }
        
        .template-field {
          box-sizing: border-box;
        }
        
        .template-field-text,
        .template-field-date,
        .template-field-number,
        .template-field-currency {
          display: flex;
          align-items: flex-start;
          padding: 1px 2px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          ${isResumo ? 'overflow: visible;' : ''}
        }
        
        .template-field-image {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ddd;
          background: #f9f9f9;
          ${isResumo ? 'overflow: visible;' : ''}
        }
        
        ${isResumo ? `
        /* Template resumo: permitir que o conteúdo seja exibido completamente */
        .template-page {
          overflow: visible;
          height: auto;
          min-height: ${mmToPx(template.height)}px;
        }
        .template-field {
          max-height: none;
        }
        ` : ''}
        
        @media print {
          .template-page {
            ${isResumo ? 'page-break-inside: avoid;' : 'page-break-inside: avoid;'}
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
  item?: OrderItem,
  imageBase64Map?: Map<string, string>
): string => {
  const dataMap = createOrderDataMap(order, item);
  const fieldsHtml = template.fields
    .filter(f => f.visible !== false)
    .map(field => renderField(field, dataMap, 1, imageBase64Map))
    .join('\n');

  return `
    <div class="template-page">
      ${fieldsHtml}
    </div>
  `;
};

/**
 * Processa template HTML substituindo variáveis do pedido
 */
const processTemplateHTML = (
  html: string,
  order: OrderWithItems,
  items: OrderItem[] | undefined,
  imageBase64Map: Map<string, string>
): string => {
  // Se houver múltiplos itens, processar cada um separadamente
  if (items && items.length > 1) {
    const itemTemplates = items.map(item => {
      const itemDataMap = createOrderDataMap(order, item);
      let itemHtml = html;
      
      // Substituir variáveis no formato {{variavel}}
      for (const [key, value] of Object.entries(itemDataMap)) {
        let replacementValue = String(value || '');
        
        // Se for a variável de imagem, usar base64 se disponível
        if (key === 'imagem' && item.imagem) {
          const imagePath = item.imagem.trim();
          if (imageBase64Map.has(imagePath)) {
            replacementValue = imageBase64Map.get(imagePath)!;
          } else if (isValidImagePath(imagePath)) {
            // Se não estiver em base64 mas for um caminho válido, manter o caminho
            replacementValue = imagePath;
          }
        }
        
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        // Para imagem, não escapar HTML (já é base64 ou URL)
        if (key === 'imagem') {
          itemHtml = itemHtml.replace(regex, replacementValue);
        } else {
          itemHtml = itemHtml.replace(regex, escapeHtml(replacementValue));
        }
      }
      
      // Processar tags <img> que possam ter src="{{imagem}}" ou similar
      if (item.imagem) {
        const imagePath = item.imagem.trim();
        const imageUrl = imageBase64Map.has(imagePath) 
          ? imageBase64Map.get(imagePath)! 
          : (isValidImagePath(imagePath) ? imagePath : '');
        
        if (imageUrl) {
          // Substituir src="{{imagem}}" ou src='{{imagem}}' ou apenas {{imagem}} em atributos src
          itemHtml = itemHtml.replace(
            /src\s*=\s*["']?\{\{imagem\}\}["']?/gi,
            `src="${imageUrl}"`
          );
        }
      }
      
      // Remover linhas vazias ou com apenas ": " ou ": Não" após substituição
      itemHtml = itemHtml.replace(/<div[^>]*>• [^:]+: (?:|Não|0| )<\/div>/gi, '');
      
      // Envolver cada item em item-container com estilos inline para garantir altura fixa
      return `<div class="item-container" style="height: 140mm !important; max-height: 140mm !important; min-height: 140mm !important; overflow: hidden !important; flex-shrink: 0 !important; flex-grow: 0 !important; page-break-inside: avoid !important; break-inside: avoid !important;">${itemHtml}</div>`;
    });
    
    // Agrupar itens em pares (2 por página) - FORÇAR exatamente 2 itens por página com estilos inline
    const pages: string[] = [];
    for (let i = 0; i < itemTemplates.length; i += 2) {
      const item1 = itemTemplates[i];
      const item2 = itemTemplates[i + 1] || '';
      // Envolver o par de itens em uma template-page com estilos inline para garantir altura fixa
      pages.push(`<div class="template-page" style="height: 280mm !important; max-height: 280mm !important; min-height: 280mm !important; overflow: hidden !important; page-break-after: always !important; page-break-inside: avoid !important; break-inside: avoid !important; display: flex !important; flex-direction: column !important; gap: 0 !important; padding: 0 !important; margin: 0 !important; width: 187mm !important;">${item1}${item2}</div>`);
    }
    return pages.join('\n');
  }
  
  // Processar com dados do pedido e primeiro item (se houver)
  const dataMap = createOrderDataMap(order, items?.[0]);
  let processed = html;
  
  // Substituir variáveis no formato {{variavel}}
  for (const [key, value] of Object.entries(dataMap)) {
    let replacementValue = String(value || '');
    
    // Se for a variável de imagem, usar base64 se disponível
    if (key === 'imagem' && items?.[0]?.imagem) {
      const imagePath = items[0].imagem.trim();
      if (imageBase64Map.has(imagePath)) {
        replacementValue = imageBase64Map.get(imagePath)!;
      } else if (isValidImagePath(imagePath)) {
        // Se não estiver em base64 mas for um caminho válido, manter o caminho
        replacementValue = imagePath;
      }
    }
    
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    // Para imagem, não escapar HTML (já é base64 ou URL)
    if (key === 'imagem') {
      processed = processed.replace(regex, replacementValue);
    } else {
      processed = processed.replace(regex, escapeHtml(replacementValue));
    }
  }
  
  // Processar tags <img> que possam ter src="{{imagem}}" ou similar
  if (items?.[0]?.imagem) {
    const imagePath = items[0].imagem.trim();
    const imageUrl = imageBase64Map.has(imagePath) 
      ? imageBase64Map.get(imagePath)! 
      : (isValidImagePath(imagePath) ? imagePath : '');
    
    if (imageUrl) {
      // Substituir src="{{imagem}}" ou src='{{imagem}}' ou apenas {{imagem}} em atributos src
      processed = processed.replace(
        /src\s*=\s*["']?\{\{imagem\}\}["']?/gi,
        `src="${imageUrl}"`
      );
    }
  }
  
  // Remover linhas vazias ou com apenas ": " ou ": Não" após substituição
  processed = processed.replace(/<div[^>]*>• [^:]+: (?:|Não|0| )<\/div>/gi, '');
  
  // Envolver em template-page para manter estrutura consistente
  return `<div class="template-page">${processed}</div>`;
};

/**
 * Gera CSS básico para templates HTML
 */
const generateBasicTemplateCSS = (templateType?: TemplateType): string => {
  const isResumo = templateType === 'resumo';
  
  return `
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
    }
    .template-page {
      ${isResumo ? `
        width: 100%;
        height: auto !important;
        min-height: 92mm;
        max-height: none !important;
        overflow: visible !important;
        page-break-inside: avoid;
        break-inside: avoid;
        margin-bottom: 2mm;
      ` : `
        width: 210mm;
        min-height: 297mm;
        page-break-after: always;
        page-break-inside: avoid;
        break-inside: avoid;
      `}
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      ${isResumo ? `
        .template-page {
          page-break-after: auto !important;
          page-break-inside: avoid !important;
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
      ` : `
        .template-page {
          page-break-after: always !important;
        }
        .template-page:last-child {
          page-break-after: auto !important;
        }
      `}
    }
  `;
};

/**
 * Gera o HTML completo com estilos para impressão
 */
export const generateTemplatePrintContent = async (
  templateType: TemplateType,
  order: OrderWithItems,
  items?: OrderItem[]
): Promise<{ html: string; css: string } | null> => {
  // PRIMEIRO: Tentar buscar template HTML editado manualmente
  try {
    const { api } = await import('../services/api');
    const templateHTML = await api.getFichaTemplateHTML(templateType);
    
    console.log(`[templateProcessor] Template HTML buscado:`, {
      templateType,
      exists: templateHTML.exists,
      hasHtml: !!templateHTML.html,
      htmlLength: templateHTML.html?.length || 0
    });
    
    // Só usar HTML editado manualmente se existir E tiver conteúdo (não vazio)
    if (templateHTML.exists && templateHTML.html && templateHTML.html.trim().length > 0) {
      // Template HTML editado manualmente encontrado - usar ele!
      console.log(`[templateProcessor] ✅ Usando template HTML editado manualmente: ${templateType}`);
      
      // Se não houver itens especificados, usar todos os itens do pedido
      const itemsToRender = items || order.items || [];
      
      // Carregar todas as imagens para base64 antes de processar
      const imageBase64Map = new Map<string, string>();
      
      const allItems = itemsToRender.length > 0 ? itemsToRender : (order.items || []);
      const imagePromises = allItems
        .filter(item => item.imagem && isValidImagePath(item.imagem))
        .map(async (item) => {
          try {
            const imagePath = item.imagem!.trim();
            const base64 = await imageToBase64(imagePath);
            imageBase64Map.set(imagePath, base64);
          } catch (error) {
            console.error('[templateProcessor] Erro ao carregar imagem:', item.imagem, error);
            // Continuar mesmo se uma imagem falhar
          }
        });
      
      await Promise.all(imagePromises);
      
      // Processar o template HTML substituindo variáveis do pedido
      // Se itemsToRender estiver vazio mas order.items tiver itens, usar order.items
      const itemsForProcessing = itemsToRender.length > 0 
        ? itemsToRender 
        : (order.items && order.items.length > 0 ? order.items : undefined);
      
      const processedHTML = processTemplateHTML(templateHTML.html, order, itemsForProcessing, imageBase64Map);
      
      console.log(`[templateProcessor] HTML processado, tamanho:`, processedHTML.length);
      
      // Gerar CSS básico
      const css = generateBasicTemplateCSS(templateType);
      
      return {
        html: processedHTML,
        css: css
      };
    } else {
      console.log(`[templateProcessor] ⚠️ Template HTML não encontrado, usando fallback JSON`);
    }
  } catch (error) {
    console.warn('[templateProcessor] Erro ao buscar template HTML editado, usando fallback:', error);
  }

  // FALLBACK: Usar sistema de templates JSON (comportamento atual)
  const templates = await loadTemplates();
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
  
  // Carregar todas as imagens para base64 antes de renderizar
  const imageBase64Map = new Map<string, string>();
  
  const allItems = itemsToRender.length > 0 ? itemsToRender : (order.items || []);
  const imagePromises = allItems
    .filter(item => item.imagem && isValidImagePath(item.imagem))
    .map(async (item) => {
      try {
        const imagePath = item.imagem!.trim();
        console.log('[templateProcessor] 🔄 Carregando imagem para template:', imagePath);
        const base64 = await imageToBase64(imagePath);
        imageBase64Map.set(imagePath, base64);
        console.log('[templateProcessor] ✅ Imagem carregada para template:', imagePath);
      } catch (error) {
        console.error('[templateProcessor] ❌ Erro ao carregar imagem para template:', {
          imagem: item.imagem,
          error
        });
        // Continuar mesmo se uma imagem falhar
      }
    });
  
  await Promise.all(imagePromises);
  console.log('[templateProcessor] 📊 Total de imagens carregadas:', imageBase64Map.size);
  
  if (itemsToRender.length === 0) {
    // Renderizar apenas com dados do pedido
    const html = renderTemplate(template, order, undefined, imageBase64Map);
    const css = generateTemplateStyles(template);
    return { html, css };
  }

  // Renderizar uma ficha por item
  const pagesHtml = itemsToRender
    .map(item => renderTemplate(template, order, item, imageBase64Map))
    .join('\n');

  const css = generateTemplateStyles(template);
  
  return {
    html: pagesHtml,
    css,
  };
};
