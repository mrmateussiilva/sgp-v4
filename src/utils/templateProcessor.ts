import { OrderWithItems, OrderItem, TemplateFieldConfig as TemplateField, FichaTemplateConfig as FichaTemplate, FichaTemplatesConfig as TemplatesConfig, TemplateType } from '../types';
import { imageToBase64 } from './imageLoader';
import { isValidImagePath } from './path';
import { apiClient } from '../services/apiClient';
import { logger } from './logger';
import { canonicalizeFromOrderItem, toPrintFields } from '@/mappers/productionItems';

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
    logger.warn('[templateProcessor] Não foi possível salvar templates localmente:', error);
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
    logger.error('[templateProcessor] Erro ao carregar templates locais:', error);
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
      logger.warn('[templateProcessor] Falha ao buscar templates no servidor:', error);
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
      logger.warn('[templateProcessor] API indisponível, usando cache local');
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
 * Formata valores monetários para exibição
 */
const formatCurrency = (value: string | number | undefined): string => {
  if (!value) return 'R$ 0,00';
  const num = typeof value === 'string' 
    ? parseFloat(value.replace(',', '.').replace(/[^\d.,-]/g, '')) 
    : value;
  if (Number.isNaN(num) || num === 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
};

/**
 * Cria um mapa de dados do pedido e item para preencher os campos do template
 */
export const createOrderDataMap = (
  order: OrderWithItems,
  item?: OrderItem
): OrderDataMap => {
  logger.debug(`[createOrderDataMap] 🗺️ Criando mapa de dados:`, {
    orderId: order.id,
    itemId: item?.id,
    itemName: item?.item_name,
    tipoProducao: item?.tipo_producao,
    itemData: item ? {
      overloque: item.overloque,
      elastico: item.elastico,
      emenda: item.emenda,
      emenda_qtd: item.emenda_qtd,
      quantidade_paineis: item.quantidade_paineis,
      tecido: item.tecido,
      acabamento_totem: item.acabamento_totem,
      quantidade_totem: item.quantidade_totem,
      acabamento_lona: item.acabamento_lona,
      quantidade_lona: item.quantidade_lona,
      tipo_adesivo: item.tipo_adesivo,
      quantidade_adesivo: item.quantidade_adesivo
    } : null
  });
  
  const itemRecord = item as unknown as Record<string, unknown> || {};
  const printFields = item ? toPrintFields(canonicalizeFromOrderItem(item)) : {};
  
  // Campos específicos com formatação
  const dimensoes = item ? formatDimensions(item) : '';
  const cidadeEstado = [
    order.cidade_cliente,
    order.estado_cliente
  ].filter(Boolean).join(' / ') || '';

  const dataMap = {
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
    // Campos canônicos (Painel/Totem) — garantem consistência entre create/edit/print
    ...printFields,
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
    emenda: item?.emenda ? (item.emenda === 'vertical' ? 'Vertical' : item.emenda === 'horizontal' ? 'Horizontal' : item.emenda) : '',
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
    acabamento_lona_display: item?.acabamento_lona === 'refilar' ? 'Refilar' 
      : item?.acabamento_lona === 'nao_refilar' ? 'Não refilar'
      : '',
    valor_lona: formatCurrency(item?.valor_lona),
    quantidade_lona: item?.quantidade_lona || '',
    outros_valores_lona: formatCurrency(item?.outros_valores_lona),
    
    // Campos de adesivo
    tipo_adesivo: item?.tipo_adesivo || '',
    valor_adesivo: formatCurrency(item?.valor_adesivo),
    quantidade_adesivo: item?.quantidade_adesivo || '',
    outros_valores_adesivo: formatCurrency(item?.outros_valores_adesivo),
    
    // Campos de totem
    acabamento_totem: item?.acabamento_totem || '',
    acabamento_totem_display: item?.acabamento_totem === 'com_pe' ? 'Com pé' 
      : item?.acabamento_totem === 'sem_pe' ? 'Sem pé'
      : item?.acabamento_totem === 'outro' ? (item?.acabamento_totem_outro || 'Outro')
      : '',
    acabamento_totem_outro: item?.acabamento_totem_outro || '',
    valor_totem: formatCurrency(item?.valor_totem),
    quantidade_totem: item?.quantidade_totem || '',
    outros_valores_totem: formatCurrency(item?.outros_valores_totem),
    
    // Campos de impressão (para anotação manual no resumo)
    data_impressao: item?.data_impressao || '',
    rip_maquina: item?.rip_maquina || '',
    
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
  
  logger.debug(`[createOrderDataMap] ✅ Mapa criado:`, {
    orderId: order.id,
    itemId: item?.id,
    tipoProducao: dataMap.tipo_producao,
    camposRelevantes: {
      overloque: dataMap.overloque,
      elastico: dataMap.elastico,
      emenda: dataMap.emenda,
      emenda_qtd: dataMap.emenda_qtd,
      quantidade_paineis: dataMap.quantidade_paineis,
      tecido: dataMap.tecido,
      acabamento_totem_display: dataMap.acabamento_totem_display,
      quantidade_totem: dataMap.quantidade_totem,
      acabamento_lona_display: dataMap.acabamento_lona_display,
      quantidade_lona: dataMap.quantidade_lona,
      tipo_adesivo: dataMap.tipo_adesivo,
      quantidade_adesivo: dataMap.quantidade_adesivo
    }
  });
  
  return dataMap;
};

// ============================================================================
// CONFIGURAÇÃO DE CAMPOS POR TIPO DE PRODUÇÃO
// ============================================================================

/**
 * Define quais campos devem ser exibidos para cada tipo de produção
 * Esta estrutura declarativa substitui a lógica complexa de regex
 * 
 * show: Lista de campos (pelos nomes das variáveis no template) que devem ser preservados
 * hide: Lista de classes CSS que devem ser removidas do HTML
 * preserveEmpty: Se true, não remove campos vazios (usa CSS para esconder)
 */
const FIELD_VISIBILITY_RULES = {
  totem: {
    show: ['acabamento_totem', 'quantidade_totem', 'valor_totem', 'outros_valores_totem', 'terceirizado'],
    hide: ['spec-painel', 'spec-tecido', 'spec-lona', 'spec-adesivo'],
    preserveEmpty: false
  },
  lona: {
    show: ['acabamento_lona', 'quantidade_lona', 'valor_lona', 'outros_valores_lona', 'terceirizado'],
    hide: ['spec-painel', 'spec-tecido', 'spec-totem', 'spec-adesivo'],
    preserveEmpty: false
  },
  adesivo: {
    show: ['tipo_adesivo', 'quantidade_adesivo', 'valor_adesivo', 'outros_valores_adesivo'],
    hide: ['spec-painel', 'spec-tecido', 'spec-totem', 'spec-lona'],
    preserveEmpty: false
  },
  painel: {
    show: ['overloque', 'elastico', 'emenda', 'emenda_qtd', 'quantidade_paineis', 'tecido'],
    hide: ['spec-totem', 'spec-lona', 'spec-adesivo'],
    preserveEmpty: true // Não remover campos vazios - usar CSS para esconder
  },
  tecido: {
    show: ['overloque', 'elastico', 'emenda', 'emenda_qtd', 'tecido'],
    hide: ['spec-totem', 'spec-lona', 'spec-adesivo'],
    preserveEmpty: true // Não remover campos vazios - usar CSS para esconder
  }
} as const;

// ============================================================================
// FUNÇÕES AUXILIARES DE LIMPEZA DE HTML
// ============================================================================

/**
 * Remove elementos HTML baseado em seletores de classe
 */
const removeElementsByClass = (html: string, classesToRemove: readonly string[]): string => {
  let result = html;
  for (const className of classesToRemove) {
    // Regex robusto que captura elementos com múltiplas classes
    const regex = new RegExp(`<div[^>]*\\b${className}\\b[^>]*>.*?</div>`, 'gi');
    result = result.replace(regex, '');
  }
  return result;
};

/**
 * Mapeia nomes de variáveis para labels que aparecem no HTML
 */
const mapVariableToLabel: Record<string, string> = {
  // Totem
  'acabamento_totem': 'Acabamento Totem',
  'quantidade_totem': 'Totem Qtd',
  'valor_totem': 'Valor Totem',
  'outros_valores_totem': 'Outros Valores Totem',
  // Lona
  'acabamento_lona': 'Acabamento Lona',
  'quantidade_lona': 'Lona Qtd',
  'valor_lona': 'Valor Lona',
  'outros_valores_lona': 'Outros Valores Lona',
  // Adesivo
  'tipo_adesivo': 'Tipo Adesivo',
  'quantidade_adesivo': 'Adesivo Qtd',
  'valor_adesivo': 'Valor Adesivo',
  'outros_valores_adesivo': 'Outros Valores Adesivo',
  // Painel/Tecido
  'overloque': 'Overloque',
  'elastico': 'Elástico',
  'emenda': 'Emenda',
  'emenda_qtd': 'Qtd Emendas',
  'quantidade_paineis': 'Painéis Qtd',
  'tecido': 'Tecido',
  // Genéricos
  'terceirizado': 'Terceirizado'
};

/**
 * Remove campos vazios do HTML, exceto campos específicos que devem ser preservados
 * Aceita tanto nomes de variáveis quanto labels do HTML
 */
const removeEmptyFields = (html: string, fieldsToPreserve: readonly string[]): string => {
  // Converter nomes de variáveis para labels se necessário
  const labelsToPreserve = fieldsToPreserve.map(field => 
    mapVariableToLabel[field] || field
  );
  
  // Criar padrão de campos a preservar
  const preservePattern = labelsToPreserve.length > 0 
    ? `(?!${labelsToPreserve.join('|')})`
    : '';
  
  // Remove divs com valor vazio, "Não" ou "0" após os dois pontos
  const regex = new RegExp(`<div[^>]*>• ${preservePattern}[^:]+: (?:|Não|0| )</div>`, 'gi');
  return html.replace(regex, '');
};

/**
 * Normaliza o tipo de produção no HTML
 */
const normalizeTipoProducao = (html: string, tipoProducao: string): string => {
  const normalized = tipoProducao.toLowerCase().trim();
  return html.replace(
    /data-tipo-producao="[^"]*"/gi,
    `data-tipo-producao="${normalized}"`
  );
};

/**
 * Adiciona classe CSS "hidden-empty" em campos com "Não" ou vazio para painel/tecido
 */
const addHiddenEmptyClass = (html: string): string => {
  // Adicionar classe hidden-empty em campos com "Não", vazio ou "0" após os dois pontos
  // Para elementos com spec-painel ou spec-tecido
  let result = html;
  
  // Substituir class="..." por class="... hidden-empty" quando encontrar ": 0" ou ": "
  // IMPORTANTE: NÃO esconder valores "Não" — na ficha de resumo queremos ver explicitamente Sim/Não.
  result = result.replace(
    /(class="([^"]*spec-item[^"]*spec-painel[^"]*))"[^>]*>• [^:]+: (0| )\s*<\/div>/gi,
    (match, p1) => {
      return match.replace(p1, `${p1} hidden-empty`);
    }
  );
  result = result.replace(
    /(class="([^"]*spec-item[^"]*spec-tecido[^"]*))"[^>]*>• [^:]+: (0| )\s*<\/div>/gi,
    (match, p1) => {
      return match.replace(p1, `${p1} hidden-empty`);
    }
  );
  
  return result;
};

/**
 * Aplica regras de visibilidade de campos baseado no tipo de produção
 */
const applyFieldVisibilityRules = (html: string, tipoProducao: string): string => {
  const rules = FIELD_VISIBILITY_RULES[tipoProducao as keyof typeof FIELD_VISIBILITY_RULES];
  
  if (!rules) {
    // Tipo de produção desconhecido - remover apenas campos vazios genéricos
    return removeEmptyFields(html, []);
  }
  
  // 1. Remover classes que devem ser escondidas
  let result = removeElementsByClass(html, rules.hide);
  
  // 2. Remover campos vazios se não for para preservar
  if (!rules.preserveEmpty) {
    result = removeEmptyFields(result, rules.show);
  } else {
    // Para painel/tecido, adicionar classe CSS para controle de visibilidade
    result = addHiddenEmptyClass(result);
    logger.debug(`[templateProcessor] Preservando campos vazios para tipo: ${tipoProducao}`);
  }
  
  return result;
};

/**
 * Substitui variáveis no HTML com dados do pedido
 */
const replaceVariables = (
  html: string,
  dataMap: OrderDataMap,
  imageBase64Map: Map<string, string>,
  item?: OrderItem
): string => {
  let result = html;
  
  for (const [key, value] of Object.entries(dataMap)) {
    // Ignorar campos de debug
    if (key.startsWith('_debug_')) continue;
    
    let replacementValue = String(value || '');
    
    // Tratamento especial para imagens
    if (key === 'imagem' && item?.imagem) {
      const imagePath = item.imagem.trim();
      if (imageBase64Map.has(imagePath)) {
        replacementValue = imageBase64Map.get(imagePath)!;
      } else if (isValidImagePath(imagePath)) {
        replacementValue = imagePath;
      }
    }
    
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    
    // Para imagens, não escapar HTML (já é base64 ou URL)
    if (key === 'imagem') {
      result = result.replace(regex, replacementValue);
    } else {
      result = result.replace(regex, escapeHtml(replacementValue));
    }
  }
  
  return result;
};

/**
 * Processa tags <img> no HTML
 */
const processImageTags = (
  html: string,
  imagePath: string | undefined,
  imageBase64Map: Map<string, string>
): string => {
  if (!imagePath) return html;
  
  const imageUrl = imageBase64Map.has(imagePath) 
    ? imageBase64Map.get(imagePath)! 
    : (isValidImagePath(imagePath) ? imagePath : '');
  
  if (!imageUrl) return html;
  
  // Substituir src="{{imagem}}" com a URL da imagem
  return html.replace(
    /src\s*=\s*["']?\{\{imagem\}\}["']?/gi,
    `src="${imageUrl}"`
  );
};

/**
 * Processa um único item no template HTML
 */
const processItemTemplate = (
  html: string,
  order: OrderWithItems,
  item: OrderItem,
  imageBase64Map: Map<string, string>
): string => {
  const dataMap = createOrderDataMap(order, item);
  const tipoProducao = String(dataMap.tipo_producao || '').toLowerCase().trim();
  
  logger.debug(`[processItemTemplate] 🔧 Processando item:`, {
    itemId: item.id,
    itemName: item.item_name,
    tipoProducao,
    dataMapFields: {
      overloque: dataMap.overloque,
      elastico: dataMap.elastico,
      emenda: dataMap.emenda,
      emenda_qtd: dataMap.emenda_qtd,
      quantidade_paineis: dataMap.quantidade_paineis,
      tecido: dataMap.tecido
    }
  });
  
  // 1. Substituir variáveis
  let processed = replaceVariables(html, dataMap, imageBase64Map, item);
  
  // 2. Processar tags de imagem
  processed = processImageTags(processed, item.imagem, imageBase64Map);
  
  // 3. Normalizar tipo de produção
  processed = normalizeTipoProducao(processed, tipoProducao);
  
  // 4. Aplicar regras de visibilidade
  processed = applyFieldVisibilityRules(processed, tipoProducao);
  
  logger.debug(`[processItemTemplate] ✅ Item processado:`, {
    itemId: item.id,
    tipoProducao,
    processedLength: processed.length,
    hasOverloque: processed.includes('Overloque'),
    hasElastico: processed.includes('Elástico') || processed.includes('Elastico'),
    hasEmenda: processed.includes('Emenda')
  });
  
  // 5. Envolver em container com altura fixa
  return `<div class="item-container" style="height: 140mm !important; max-height: 140mm !important; min-height: 140mm !important; overflow: hidden !important; flex-shrink: 0 !important; flex-grow: 0 !important; page-break-inside: avoid !important; break-inside: avoid !important;">${processed}</div>`;
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
 * Usa a nova abordagem declarativa com FIELD_VISIBILITY_RULES
 */
const processTemplateHTML = (
  html: string,
  order: OrderWithItems,
  items: OrderItem[] | undefined,
  imageBase64Map: Map<string, string>
): string => {
  logger.debug(`[processTemplateHTML] 🔄 Processando template HTML:`, {
    orderId: order.id,
    htmlLength: html.length,
    itemsCount: items?.length || 0,
    items: items?.map(item => ({
      id: item.id,
      item_name: item.item_name,
      tipo_producao: item.tipo_producao,
      overloque: item.overloque,
      elastico: item.elastico,
      emenda: item.emenda,
      emenda_qtd: item.emenda_qtd
    })) || [],
    imageBase64MapSize: imageBase64Map.size
  });
  
  // Múltiplos itens - processar cada um separadamente
  if (items && items.length > 1) {
    logger.debug(`[processTemplateHTML] 📦 Processando ${items.length} itens múltiplos`);
    const itemTemplates = items.map(item => 
      processItemTemplate(html, order, item, imageBase64Map)
    );
    
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
  
  // Item único ou sem itens - usar processItemTemplate ou processar diretamente
  if (items && items.length === 1) {
    return `<div class="template-page">${processItemTemplate(html, order, items[0], imageBase64Map)}</div>`;
  }
  
  // Sem itens - processar com dados do pedido apenas
  const dataMap = createOrderDataMap(order, undefined);
  const tipoProducao = String(dataMap.tipo_producao || '').toLowerCase().trim();
  
  let processed = replaceVariables(html, dataMap, imageBase64Map);
  processed = processImageTags(processed, undefined, imageBase64Map);
  processed = normalizeTipoProducao(processed, tipoProducao);
  processed = applyFieldVisibilityRules(processed, tipoProducao);
  
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
  logger.debug(`[generateTemplatePrintContent] 🖨️ Iniciando geração de template:`, {
    templateType,
    orderId: order.id,
    orderNumero: order.numero,
    itemsCount: order.items?.length || 0,
    itemsParamCount: items?.length || 0,
    itemsParamProvided: !!items,
    orderItems: order.items?.map(item => ({
      id: item.id,
      item_name: item.item_name,
      tipo_producao: item.tipo_producao,
      overloque: item.overloque,
      elastico: item.elastico,
      emenda: item.emenda,
      emenda_qtd: item.emenda_qtd,
      imagem: item.imagem
    })) || []
  });
  
  // PRIMEIRO: Tentar buscar template HTML editado manualmente
  try {
    const { api } = await import('../services/api');
    const templateHTML = await api.getFichaTemplateHTML(templateType);
    
    logger.debug(`[templateProcessor] Template HTML buscado:`, {
      templateType,
      exists: templateHTML.exists,
      hasHtml: !!templateHTML.html,
      htmlLength: templateHTML.html?.length || 0
    });
    
    // Só usar HTML editado manualmente se existir E tiver conteúdo (não vazio)
    if (templateHTML.exists && templateHTML.html && templateHTML.html.trim().length > 0) {
      // Template HTML editado manualmente encontrado - usar ele!
      logger.debug(`[templateProcessor] ✅ Usando template HTML editado manualmente: ${templateType}`);
      
      // Se não houver itens especificados, usar todos os itens do pedido
      const itemsToRender = items || order.items || [];
      
      logger.debug(`[generateTemplatePrintContent] 📋 Itens para renderizar:`, {
        itemsToRenderCount: itemsToRender.length,
        itemsToRender: itemsToRender.map(item => ({
          id: item.id,
          item_name: item.item_name,
          tipo_producao: item.tipo_producao,
          overloque: item.overloque,
          elastico: item.elastico,
          emenda: item.emenda,
          emenda_qtd: item.emenda_qtd
        }))
      });
      
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
            logger.error('[templateProcessor] Erro ao carregar imagem:', item.imagem, error);
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
      
      logger.debug(`[templateProcessor] HTML processado, tamanho:`, processedHTML.length);
      
      // Gerar CSS básico
      const css = generateBasicTemplateCSS(templateType);
      
      return {
        html: processedHTML,
        css: css
      };
    } else {
      logger.warn(`[templateProcessor] ⚠️ Template HTML não encontrado, usando fallback JSON`);
    }
  } catch (error) {
    logger.warn('[templateProcessor] Erro ao buscar template HTML editado, usando fallback:', error);
  }

  // FALLBACK: Usar sistema de templates JSON (comportamento atual)
  const templates = await loadTemplates();
  if (!templates) {
    logger.warn('Templates não encontrados no localStorage');
    return null;
  }

  const template = templates[templateType];
  if (!template) {
    logger.warn(`Template ${templateType} não encontrado`);
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
        logger.debug('[templateProcessor] 🔄 Carregando imagem para template:', imagePath);
        const base64 = await imageToBase64(imagePath);
        imageBase64Map.set(imagePath, base64);
        logger.debug('[templateProcessor] ✅ Imagem carregada para template:', imagePath);
      } catch (error) {
        logger.error('[templateProcessor] ❌ Erro ao carregar imagem para template:', {
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
