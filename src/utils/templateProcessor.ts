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
 * Remove variáveis não renderizadas do HTML ({{...}}, #IF, #ELSE, #ENDIF, etc.)
 */
const removeUnrenderedVariables = (html: string): string => {
  let result = html;
  
  // Remover blocos condicionais não processados ({{#IF ...}}, {{#ELSE}}, {{#ENDIF}}, {{/IF}})
  result = result.replace(/\{\{#IF[^}]*\}\}/gi, '');
  result = result.replace(/\{\{#ELSE\}\}/gi, '');
  result = result.replace(/\{\{#ENDIF\}\}/gi, '');
  result = result.replace(/\{\{\/IF\}\}/gi, '');
  
  // Remover variáveis não substituídas ({{...}})
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  // Remover linhas vazias extras (máximo 2 linhas vazias consecutivas)
  result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  return result;
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
 * Processa condicionais {{#IF tipo_producao == 'painel'}} ... {{/IF}} no HTML
 * Suporta:
 * - {{#IF tipo_producao == 'painel'}} ... {{/IF}}
 * - {{#IF tipo_producao == 'totem'}} ... {{/IF}}
 * - {{#IF tipo_producao == 'lona'}} ... {{/IF}}
 * - {{#IF tipo_producao == 'adesivo'}} ... {{/IF}}
 * - {{#IF tipo_producao == 'tecido'}} ... {{/IF}}
 * - {{#IF tipo_producao == 'generica'}} ... {{/IF}}
 */
const processConditionals = (
  html: string,
  tipoProducao: string
): string => {
  let result = html;
  const normalizedTipo = tipoProducao.toLowerCase().trim();
  
  // Regex para encontrar blocos {{#IF tipo_producao == 'valor'}} ... {{/IF}}
  // Suporta case-insensitive e espaços variáveis
  const ifRegex = /\{\{#IF\s+tipo_producao\s*==\s*['"]([^'"]+)['"]\s*\}\}([\s\S]*?)\{\{\/IF\}\}/gi;
  
  result = result.replace(ifRegex, (_match, tipoEsperado, conteudo) => {
    const normalizedEsperado = tipoEsperado.toLowerCase().trim();
    
    // Verificar se o tipo de produção corresponde
    if (normalizedTipo === normalizedEsperado) {
      // Manter o conteúdo
      return conteudo;
    } else {
      // Remover o conteúdo
      return '';
    }
  });
  
  return result;
};

/**
 * Substitui variáveis no HTML com dados do pedido
 * Suporta substituição case-insensitive ({{numero}}, {{NUMERO}}, {{Numero}})
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
    
    // Substituição case-insensitive: {{numero}}, {{NUMERO}}, {{Numero}} funcionam
    // Escapar caracteres especiais da chave para regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'gi'); // 'i' flag para case-insensitive
    
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
 * Envolve conteúdo do item em estrutura fixa com seções definidas
 * Garante que cada item ocupe exatamente 9,9cm (99mm) da página A4
 * Corrige encoding e remove seções vazias
 */
const wrapItemInFixedStructure = (content: string): string => {
  // Corrigir encoding de caracteres especiais (Õ, É, etc.)
  const normalizedContent = content
    .replace(/Õ(?=[\s&<"'])/g, '&Otilde;')
    .replace(/É(?=[\s&<"'])/g, '&Eacute;')
    .replace(/Õ/g, '&Otilde;')
    .replace(/É/g, '&Eacute;')
    .replace(/ã/g, '&atilde;')
    .replace(/á/g, '&aacute;')
    .replace(/ê/g, '&ecirc;');
  
  // Usar estrutura com seções fixas para layout consistente
  // Seções: header, description, specs, visual
  return `<div class="item" itemscope itemtype="http://schema.org/Product">
    <div class="item-content">
      ${normalizedContent}
    </div>
  </div>`;
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
  
  // 1. Processar condicionais {{#IF tipo_producao == 'tipo'}} ... {{/IF}}
  // IMPORTANTE: Processar condicionais ANTES de substituir variáveis para melhor performance
  let processed = processConditionals(html, tipoProducao);
  
  // 2. Substituir variáveis
  processed = replaceVariables(processed, dataMap, imageBase64Map, item);
  
  // 3. Processar tags de imagem
  processed = processImageTags(processed, item.imagem, imageBase64Map);
  
  // 4. Normalizar tipo de produção
  processed = normalizeTipoProducao(processed, tipoProducao);
  
  // 5. Aplicar regras de visibilidade
  processed = applyFieldVisibilityRules(processed, tipoProducao);
  
  // 6. Remover variáveis não renderizadas ({{...}}, #IF, #ELSE, etc.)
  processed = removeUnrenderedVariables(processed);
  
  logger.debug(`[processItemTemplate] ✅ Item processado:`, {
    itemId: item.id,
    tipoProducao,
    processedLength: processed.length,
    hasOverloque: processed.includes('Overloque'),
    hasElastico: processed.includes('Elástico') || processed.includes('Elastico'),
    hasEmenda: processed.includes('Emenda')
  });
  
  // Estruturar item com seções fixas para garantir layout consistente
  // Cada item tem altura fixa de 33% da página A4
  return wrapItemInFixedStructure(processed);
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

/**
 * Remove estilos do template HTML vindo da API para evitar conflitos
 * - Remove blocos <style>...</style>
 * - Remove estilos inline que fixam height/width em template-page/item
 * @deprecated Desabilitado - agora usamos template diretamente da API
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _sanitizeTemplateHtml = (html: string): string => {
  let cleaned = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\sstyle="[^"]*(height|min-height|max-height|width)[^"]*"/gi, '');

  // Desembrulhar containers herdados do template da API (template-page, item-container)
  // Mantém apenas o conteúdo interno para caber no nosso layout de 3 itens/página
  cleaned = cleaned.replace(/<div[^>]*class="[^"]*\btemplate-page\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1');
  cleaned = cleaned.replace(/<div[^>]*class="[^"]*\bitem-container\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1');

  return cleaned;
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
 * Gera o CSS para o template (função legada, não usada atualmente - mantida para referência)
 */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _generateTemplateStyles = (template: FichaTemplate): string => {
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
    
    // Agrupar itens em grupos de EXATAMENTE 3 por página
    const pages: string[] = [];
    for (let i = 0; i < itemTemplates.length; i += 3) {
      const item1 = itemTemplates[i] || '';
      const item2 = itemTemplates[i + 1] || '';
      const item3 = itemTemplates[i + 2] || '';
      
      // Determinar se é a última página (para não forçar quebra de página)
      const isLastPage = i + 3 >= itemTemplates.length;
      
      // Envolver os 3 itens em uma página A4 com altura fixa
      // Cada item ocupa exatamente 1/3 da altura (33%)
      pages.push(`<div class="print-page" ${isLastPage ? '' : 'data-page-break="always"'}><div class="items-container">${item1}${item2}${item3}</div></div>`);
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
  
  // 1. Processar condicionais primeiro
  let processed = processConditionals(html, tipoProducao);
  
  // 2. Substituir variáveis
  processed = replaceVariables(processed, dataMap, imageBase64Map);
  
  // 3. Processar tags de imagem
  processed = processImageTags(processed, undefined, imageBase64Map);
  
  // 4. Normalizar tipo de produção
  processed = normalizeTipoProducao(processed, tipoProducao);
  
  // 5. Aplicar regras de visibilidade
  processed = applyFieldVisibilityRules(processed, tipoProducao);
  
  // 6. Remover variáveis não renderizadas
  processed = removeUnrenderedVariables(processed);
  
  return `<div class="template-page">${processed}</div>`;
};

/**
 * Gera CSS básico para templates HTML
 * Para resumo: 3 itens por página A4, cada um ocupando exatamente 1/3 (33%)
 * Reestruturação completa com seções fixas
 */
const generateBasicTemplateCSS = (templateType?: TemplateType): string => {
  const isResumo = templateType === 'resumo';
  
  return `
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
      color: #1a1a1a;
      background: white;
    }
    
      ${isResumo ? `
    /* ============================================================
       ESTRUTURA BASE: PÁGINA A4 COM MARGENS CORRETAS
       ============================================================ */
    .print-page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      margin: 15mm 15mm 10mm 15mm; /* Superior 1,5cm, Lateral 1,5cm, Inferior 1cm */
      padding: 0;
      overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
      display: flex;
      flex-direction: column;
      background: white;
      box-sizing: border-box;
    }
    
    .items-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0;
      margin: 0;
      overflow: hidden;
    }
    
    /* ============================================================
       ITEM: ALTURA FIXA DE ~9,0cm (90mm)
       Área útil A4: 297mm - 15mm (top) - 10mm (bottom) = 272mm
       272mm / 3 ≈ 90.7mm → usamos 90mm para garantir 3 itens por página
       ============================================================ */
    .item {
      width: 100%;
      height: 90mm; /* Aproximadamente 9,0cm para caber 3 itens */
      min-height: 90mm;
      max-height: 90mm;
      overflow: hidden;
      flex-shrink: 0;
      flex-grow: 0;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      orphans: 999 !important;
      widows: 999 !important;
      border-bottom: 1px solid #d1d5db;
      padding: 2mm 3mm;
      display: flex;
      flex-direction: column;
      background: white;
      position: relative;
      box-sizing: border-box;
    }
    
    .item:last-child {
      border-bottom: none;
    }
    
    /* ============================================================
       CONTEÚDO DO ITEM: FLEX COLUMN COM SEÇÕES FIXAS
       ============================================================ */
    .item-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1mm;
      overflow: hidden;
      word-wrap: break-word;
      word-break: break-word;
      hyphens: auto;
    }
    
    /* ============================================================
       OCULTAR SEÇÕES VAZIAS PARA ECONOMIZAR ESPAÇO
       ============================================================ */
    .image-container:empty,
    .image-container:has(img[src=""]),
    .image-container:has(img[src*="undefined"]),
    .image-container:has(img[src*="null"]),
    .image-container:not(:has(img)) {
      display: none !important;
    }
    
    .section-content:empty,
    .observacao-box:empty,
    .observacao-box:has(span:empty) {
      display: none !important;
    }
    
    /* Ocultar seção "VISUAL DO ITEM" se não houver imagem */
    .right-column:has(.image-container:empty),
    .right-column:not(:has(img[src])) {
      display: none !important;
    }
    
    /* Quando visual está oculto, expandir coluna esquerda */
    .content-wrapper:not(:has(.right-column:not([style*="display: none"]))) .left-column {
      width: 100% !important;
    }
    
    /* ============================================================
       CORREÇÃO DE QUEBRAS DE PALAVRAS
       ============================================================ */
    .item-content,
    .item-content * {
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
      -webkit-hyphens: auto;
      -moz-hyphens: auto;
      -ms-hyphens: auto;
    }
    
    /* Prevenir quebra em palavras importantes */
    .item-content strong,
    .item-content b,
    .item-content .numero,
    .item-content .cliente {
      word-break: keep-all;
      white-space: nowrap;
    }
    
    /* ============================================================
       MARGENS E ESPAÇAMENTOS REDUZIDOS
       ============================================================ */
    .item-content > * {
      margin-top: 0.5mm;
      margin-bottom: 0.5mm;
      line-height: 1.3;
    }
    
    .item-content > *:first-child {
      margin-top: 0;
    }
    
    .item-content > *:last-child {
      margin-bottom: 0;
    }
    
    /* ============================================================
       FONTE: NUNCA MENOR QUE 10px
       ============================================================ */
    .item-content,
    .item-content * {
      font-size: max(10px, 1em);
    }
    
    .item-content h1,
    .item-content h2,
    .item-content h3,
    .item-content h4,
    .item-content h5,
    .item-content h6 {
      font-size: max(11px, 1.1em);
      font-weight: 600;
      margin-top: 1mm;
      margin-bottom: 0.5mm;
    }
    
    .item-content p,
    .item-content div,
    .item-content span {
      font-size: max(10px, 1em);
    }
    
    .item-content small {
      font-size: max(9px, 0.9em);
    }
    
    /* ============================================================
       IMAGENS: AJUSTE AUTOMÁTICO E PREVENÇÃO DE ERRO
       ============================================================ */
    .item-content img {
      max-width: 100%;
      max-height: 60mm;
      height: auto;
      object-fit: contain;
      display: block;
    }
    
    .item-content img[src=""],
    .item-content img[src*="undefined"],
    .item-content img[src*="null"],
    .item-content img:not([src]) {
      display: none !important;
    }
    
    /* ============================================================
       ALINHAMENTO CONSISTENTE
       ============================================================ */
    .item-content {
      text-align: left;
      vertical-align: top;
    }
    
    .item-content table {
      width: 100%;
      border-collapse: collapse;
      font-size: max(10px, 1em);
    }
    
    .item-content td,
    .item-content th {
      padding: 0.5mm 1mm;
      text-align: left;
      vertical-align: top;
    }
    ` : `
    .template-page {
        width: 210mm;
        min-height: 297mm;
        page-break-after: always;
        page-break-inside: avoid;
        break-inside: avoid;
    }
    `}
    
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      body {
        font-size: 10px !important;
        margin: 0;
        padding: 0;
      }
      
      ${isResumo ? `
      /* ============================================================
         IMPRESSÃO: PÁGINA A4 COM 3 ITENS FIXOS
         ============================================================ */
      .print-page {
        width: 210mm !important;
        height: 100vh !important;
        min-height: 100vh !important;
        max-height: 100vh !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
      }
      
      .print-page[data-page-break="always"] {
        page-break-after: always !important;
      }
      
      .print-page:last-child {
          page-break-after: auto !important;
      }
      
      /* ============================================================
         IMPRESSÃO: ITEM COM ALTURA FIXA ~9,0cm
         Altura disponível: 100vh - 25mm (margens)
         Cada item: (100vh - 25mm) / 3 ≈ 90mm
         ============================================================ */
      .item {
        width: 100% !important;
        height: calc((100vh - 25mm) / 3) !important;
        min-height: calc((100vh - 25mm) / 3) !important;
        max-height: calc((100vh - 25mm) / 3) !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
        orphans: 999 !important;
        widows: 999 !important;
      }
      
      /* Garantir que texto nunca invada outro item */
      .item-content {
        overflow: hidden !important;
        max-height: 100% !important;
      }
      
      /* Fonte mínima garantida em impressão */
      .item-content,
      .item-content * {
        font-size: max(10px, 1em) !important;
      }
      
      /* Quebra de palavras em impressão */
      .item-content,
      .item-content * {
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        hyphens: auto !important;
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
      // Usar template diretamente da API sem sanitização
      const rawHtml = templateHTML.html;
      // Template HTML editado manualmente encontrado - usar ele!
      logger.debug(`[templateProcessor] ✅ Usando template HTML diretamente da API (sem sanitização): ${templateType}`);
      
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
      
      const processedHTML = processTemplateHTML(rawHtml, order, itemsForProcessing, imageBase64Map);
      
      logger.debug(`[templateProcessor] HTML processado, tamanho:`, processedHTML.length);
      
      // Gerar CSS básico
      const css = generateBasicTemplateCSS(templateType);
      
      return {
        html: processedHTML,
        css: css
      };
    } else {
      // Template HTML não encontrado ou vazio - NÃO usar fallback, lançar erro
      const errorMessage = templateHTML.exists 
        ? `Template HTML '${templateType}' existe na API mas está vazio. Verifique o conteúdo do template.`
        : `Template HTML '${templateType}' não encontrado na API. Certifique-se de que o template foi salvo corretamente.`;
      
      logger.error(`[templateProcessor] ❌ ${errorMessage}`, {
        templateType,
        exists: templateHTML.exists,
        hasHtml: !!templateHTML.html,
        htmlLength: templateHTML.html?.length || 0
      });
      
      throw new Error(errorMessage);
    }
      } catch (error) {
    // Se já for um Error que lançamos, re-lançar
    if (error instanceof Error) {
      throw error;
    }
    // Se for outro tipo de erro (ex: erro de rede), lançar com contexto
    logger.error('[templateProcessor] ❌ Erro ao buscar template HTML editado:', error);
    throw new Error(
      `Erro ao buscar template HTML '${templateType}' da API: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
