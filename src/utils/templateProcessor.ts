import { OrderWithItems, OrderItem, TemplateFieldConfig as TemplateField, FichaTemplateConfig as FichaTemplate, FichaTemplatesConfig as TemplatesConfig, TemplateType } from '../types';
import { imageToBase64, loadAuthenticatedImage } from './imageLoader';
import { isValidImagePath } from './path';
import { apiClient } from '../api/client';
import { logger } from './logger';
import { canonicalizeFromOrderItem, toPrintFields } from '@/mappers/productionItems';
import { resizeImageToBase64 } from './imageResizer';

// ============================================================================
// FUNÇÕES DE AGRUPAMENTO DE ITENS POR PÁGINA
// ============================================================================

/**
 * Agrupa itens em arrays de tamanho fixo para paginação
 * @param itens - Array de itens a serem agrupados
 * @param itensPorPagina - Quantidade máxima de itens por página (padrão: 2)
 * @returns Array de arrays, onde cada sub-array representa uma página
 * 
 * @example
 * // Input: 5 itens
 * const itens = [item1, item2, item3, item4, item5];
 * // Output: 3 páginas
 * const paginas = [
 *   [item1, item2],  // Página 1
 *   [item3, item4],  // Página 2
 *   [item5]          // Página 3 (última página pode ter menos de 2)
 * ];
 */
export function agruparItensPorPagina<T>(itens: T[], itensPorPagina: number = 2): T[][] {
  if (!itens || itens.length === 0) {
    return [];
  }

  const paginas: T[][] = [];
  for (let i = 0; i < itens.length; i += itensPorPagina) {
    paginas.push(itens.slice(i, i + itensPorPagina));
  }

  return paginas;
}

/**
 * Valida se as páginas estão corretamente agrupadas
 * @param paginas - Array de páginas a validar
 * @param maxItensPorPagina - Quantidade máxima de itens por página (padrão: 2)
 * @returns true se todas as páginas são válidas
 * 
 * Regras de validação:
 * - Cada página deve ter no máximo maxItensPorPagina itens
 * - Nenhuma página pode estar vazia
 * - Última página pode ter menos de maxItensPorPagina itens
 */
export function validarPaginas<T>(paginas: T[][], maxItensPorPagina: number = 2): boolean {
  if (!paginas || paginas.length === 0) {
    return true; // Array vazio é válido (0 itens = 0 páginas)
  }

  return paginas.every(pagina =>
    pagina.length > 0 && pagina.length <= maxItensPorPagina
  );
}

/**
 * Calcula o número de páginas necessárias para uma quantidade de itens
 * @param totalItens - Total de itens
 * @param itensPorPagina - Itens por página (padrão: 2)
 * @returns Número de páginas necessárias
 */
export function calcularNumeroPaginas(totalItens: number, itensPorPagina: number = 2): number {
  if (totalItens <= 0) return 0;
  return Math.ceil(totalItens / itensPorPagina);
}

// ============================================================================
// EXTRAÇÃO DE TEMPLATE HTML
// ============================================================================

/**
 * Extrai o template de um único item do HTML completo
 * O template da API tem a estrutura: <div class="print-page"> <div class="item">...</div> (x3) </div>
 * Esta função extrai apenas o primeiro .item para usar como template base
 */
function extractItemTemplate(fullHtml: string): string {
  // Regex para encontrar o primeiro <div class="item" ...> ... </div>
  // Usa um approach mais robusto que lida com divs aninhados
  const itemStartMatch = fullHtml.match(/<div[^>]*class="item"[^>]*>/i);

  if (!itemStartMatch) {
    // Se não encontrar .item, retornar o HTML original (fallback)
    logger.warn('[extractItemTemplate] Não foi possível encontrar .item no template, usando HTML completo');
    return fullHtml;
  }

  const startIndex = fullHtml.indexOf(itemStartMatch[0]);

  // Encontrar o </div> correspondente contando níveis de aninhamento
  let depth = 0;
  let endIndex = startIndex;
  let tagStart = 0;

  for (let i = startIndex; i < fullHtml.length; i++) {
    if (fullHtml[i] === '<') {
      tagStart = i;
    } else if (fullHtml[i] === '>') {
      const tag = fullHtml.substring(tagStart, i + 1);

      if (tag.match(/^<div/i)) {
        depth++;
      } else if (tag.match(/^<\/div>/i)) {
        depth--;
        if (depth === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }

  const itemTemplate = fullHtml.substring(startIndex, endIndex);

  logger.debug('[extractItemTemplate] Template de item extraído:', {
    originalLength: fullHtml.length,
    extractedLength: itemTemplate.length,
    startsWithItem: itemTemplate.startsWith('<div')
  });

  return itemTemplate;
}

/**
 * Extrai os estilos CSS do template HTML
 * Preserva os estilos originais definidos no template da API
 */
function extractTemplateStyles(fullHtml: string): string {
  const styleMatches = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);

  if (!styleMatches) {
    return '';
  }

  // Extrair conteúdo de todas as tags <style>
  const styles = styleMatches.map(styleTag => {
    const content = styleTag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return content ? content[1] : '';
  }).join('\n');

  logger.debug('[extractTemplateStyles] Estilos extraídos:', {
    styleTagsCount: styleMatches.length,
    totalStylesLength: styles.length
  });

  return styles;
}

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
 * Processa condicionais no template HTML
 * Suporta múltiplas sintaxes:
 * 
 * 1. Sintaxe legada: {{#IF tipo_producao == 'painel'}} ... {{/IF}}
 * 2. Sintaxe Handlebars com eq: {{#if (eq tipo_producao 'painel')}} ... {{/if}}
 * 3. Condicional simples: {{#if variavel}} ... {{/if}}
 */
const processConditionals = (
  html: string,
  tipoProducao: string,
  dataMap?: Record<string, string | number | undefined>
): string => {
  let result = html;
  const normalizedTipo = tipoProducao.toLowerCase().trim();

  // 1. Sintaxe legada: {{#IF tipo_producao == 'valor'}} ... {{/IF}}
  const legacyIfRegex = /\{\{#IF\s+tipo_producao\s*==\s*['"]([^'"]+)['"]\s*\}\}([\s\S]*?)\{\{\/IF\}\}/gi;
  result = result.replace(legacyIfRegex, (_match, tipoEsperado, conteudo) => {
    const normalizedEsperado = tipoEsperado.toLowerCase().trim();
    return normalizedTipo === normalizedEsperado ? conteudo : '';
  });

  // 2. Sintaxe Handlebars: {{#if (eq tipo_producao 'valor')}} ... {{/if}}
  const handlebarsEqRegex = /\{\{#if\s+\(eq\s+tipo_producao\s+['"]([^'"]+)['"]\)\s*\}\}([\s\S]*?)\{\{\/if\}\}/gi;
  result = result.replace(handlebarsEqRegex, (_match, tipoEsperado, conteudo) => {
    const normalizedEsperado = tipoEsperado.toLowerCase().trim();
    return normalizedTipo === normalizedEsperado ? conteudo : '';
  });

  // 3. Condicional simples: {{#if variavel}} ... {{/if}}
  // Verifica se a variável tem valor truthy no dataMap
  if (dataMap) {
    const simpleIfRegex = /\{\{#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}([\s\S]*?)\{\{\/if\}\}/gi;
    result = result.replace(simpleIfRegex, (_match, varName, conteudo) => {
      const value = dataMap[varName];
      // Truthy: tem valor, não é string vazia, não é "false", não é 0
      const isTruthy = value !== undefined && value !== null && value !== '' && value !== 'false' && value !== 0;
      return isTruthy ? conteudo : '';
    });
  }

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
 * Normaliza o conteúdo do item processado
 * NÃO adiciona wrapper se o template já contém a estrutura .item
 * Apenas corrige encoding de caracteres especiais
 */
const normalizeItemContent = (content: string): string => {
  // Corrigir encoding de caracteres especiais (Õ, É, etc.)
  const normalizedContent = content
    .replace(/Õ(?=[\s&<"'])/g, '&Otilde;')
    .replace(/É(?=[\s&<"'])/g, '&Eacute;')
    .replace(/Õ/g, '&Otilde;')
    .replace(/É/g, '&Eacute;')
    .replace(/ã/g, '&atilde;')
    .replace(/á/g, '&aacute;')
    .replace(/ê/g, '&ecirc;');

  // Se o template já contém a estrutura .item, retornar sem wrapper
  // O template em /api-sgp/media/templates/template-resumo.html já define a estrutura
  if (normalizedContent.includes('class="item"') || normalizedContent.includes("class='item'")) {
    return normalizedContent;
  }

  // Caso contrário (template legado), envolver em estrutura padrão
  return `<div class="item">${normalizedContent}</div>`;
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

  // 1. Processar condicionais (suporta sintaxe legada e Handlebars)
  // IMPORTANTE: Processar condicionais ANTES de substituir variáveis para melhor performance
  let processed = processConditionals(html, tipoProducao, dataMap);

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
  // Cada item tem altura fixa de 50% da página A4 (2 por página)
  const normalized = normalizeItemContent(processed);
  return injectExtraFieldsIntoItem(normalized, dataMap);
};

/**
 * Injeta campos adicionais padronizados no header/rodapé da ficha, sem depender do template da API.
 * Requisitos:
 * - No HEADER: DATA DE ENVIO, PRIORIDADE, FORMA DE ENVIO
 * - No RODAPÉ: MAQUINA RIP, DATA DE IMPRESSÃO
 * - MAQUINA RIP
 * - DATA DE IMPRESSÃO
 */
const injectExtraFieldsIntoItem = (itemHtml: string, dataMap: OrderDataMap): string => {
  const dataEnvio = escapeHtml(dataMap.data_entrega);
  const prioridade = escapeHtml(dataMap.prioridade);
  const formaEnvio = escapeHtml(dataMap.forma_envio);
  const maquinaRip = escapeHtml(dataMap.sublimacao_maquina);
  const dataImpressao = escapeHtml(dataMap.sublimacao_data_impressao);
  const observacaoPedido = escapeHtml(dataMap.observacao);
  const observacaoItem = escapeHtml(dataMap.observacao_item);

  const header = `
    <div class="__sgp_header_meta__">
      <div class="__sgp_row__">
        <div class="__sgp_field__"><span class="__sgp_label__">DATA DE ENVIO:</span><span class="__sgp_value__">${dataEnvio || '<span class="__sgp_fill__">&nbsp;</span>'}</span></div>
        <div class="__sgp_field__"><span class="__sgp_label__">PRIORIDADE:</span><span class="__sgp_value__">${prioridade || '<span class="__sgp_fill__">&nbsp;</span>'}</span></div>
        <div class="__sgp_field__"><span class="__sgp_label__">FORMA DE ENVIO:</span><span class="__sgp_value__">${formaEnvio || '<span class="__sgp_fill__">&nbsp;</span>'}</span></div>
      </div>
    </div>
  `;

  // Seção de observações (Pedido e Item)
  let obsHtml = '';
  if (observacaoPedido || observacaoItem) {
    obsHtml = `
      <div class="__sgp_observations_section__" style="margin-top: 2mm; padding-top: 1.5mm; border-top: 1.5px solid #666; font-size: 13px;">
        ${observacaoPedido ? `<div class="__sgp_field__" style="margin-bottom: 0.5mm;"><span class="__sgp_label__" style="font-weight: 800; color: #000;">OBSERVAÇÃO PEDIDO:</span> <span class="__sgp_value__" style="color: #000;">${observacaoPedido}</span></div>` : ''}
        ${observacaoItem ? `<div class="__sgp_field__"><span class="__sgp_label__" style="font-weight: 800; color: #000;">OBSERVAÇÃO ITEM:</span> <span class="__sgp_value__" style="color: #000;">${observacaoItem}</span></div>` : ''}
      </div>
    `;
  }

  const footer = `
    ${obsHtml}
    <div class="__sgp_footer_fields__">
      <div class="__sgp_row__">
        <div class="__sgp_field__"><span class="__sgp_label__">MAQUINA RIP:</span><span class="__sgp_value__">${maquinaRip || '<span class="__sgp_fill__">&nbsp;</span>'}</span></div>
        <div class="__sgp_field__"><span class="__sgp_label__">DATA DE IMPRESSÃO:</span><span class="__sgp_value__">${dataImpressao || '<span class="__sgp_fill__">&nbsp;</span>'}</span></div>
      </div>
    </div>
  `;

  const trimmed = itemHtml.trim();
  const hasHeader = trimmed.includes('__sgp_header_meta__');
  const hasFooter = trimmed.includes('__sgp_footer_fields__');
  if (hasHeader && hasFooter) return itemHtml; // idempotente

  let withHeader = trimmed;
  if (!hasHeader) {
    // Inserir logo após a abertura do <div class="item"...> se existir
    const openItemTag = withHeader.match(/<div[^>]*class=["'][^"']*\bitem\b[^"']*["'][^>]*>/i);
    if (openItemTag && openItemTag.index !== undefined) {
      const insertAt = openItemTag.index + openItemTag[0].length;
      withHeader = `${withHeader.slice(0, insertAt)}\n${header}\n${withHeader.slice(insertAt)}`;
    } else {
      withHeader = `${header}\n${withHeader}`;
    }
  }

  if (hasFooter) return withHeader;

  const lastDiv = withHeader.lastIndexOf('</div>');
  if (lastDiv === -1) return `${withHeader}\n${footer}`;

  return `${withHeader.slice(0, lastDiv)}\n${footer}\n${withHeader.slice(lastDiv)}`;
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
// Unused function - kept for reference
// @ts-expect-error - Function kept for future reference, intentionally unused
const _sanitizeTemplateHtml = (_html: string): string => {
  const html = _html;
  let cleaned = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\sstyle="[^"]*(height|min-height|max-height|width)[^"]*"/gi, '');

  // Desembrulhar containers herdados do template da API (template-page, item-container)
  // Mantém apenas o conteúdo interno para caber no nosso layout de 3 itens/página
  cleaned = cleaned.replace(/<div[^>]*class="[^"]*\btemplate-page\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1');
  cleaned = cleaned.replace(/<div[^>]*class="[^"]*\bitem-container\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1');

  return cleaned;
};
// Evita erro do TypeScript (noUnusedLocals) mantendo a função apenas como referência.
// Função não utilizada atualmente - mantida para referência futura

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
// Unused function - kept for reference
// @ts-expect-error - Function kept for future reference, intentionally unused
const _generateTemplateStyles = (_template: FichaTemplate): string => {
  const template = _template;
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
// Evita erro do TypeScript (noUnusedLocals) mantendo a função apenas como referência.
// Função não utilizada atualmente - mantida para referência futura

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
    const ITENS_POR_PAGINA = 2;
    logger.debug(`[processTemplateHTML] 📦 Processando ${items.length} itens múltiplos (${ITENS_POR_PAGINA} por página)`);

    // Processar cada item individualmente
    const itemTemplates = items.map(item =>
      processItemTemplate(html, order, item, imageBase64Map)
    );

    // Agrupar itens em páginas usando a função de agrupamento
    const paginas = agruparItensPorPagina(itemTemplates, ITENS_POR_PAGINA);

    // Validar agrupamento
    if (!validarPaginas(paginas, ITENS_POR_PAGINA)) {
      logger.warn(`[processTemplateHTML] ⚠️ Agrupamento de páginas inválido`, {
        paginasCount: paginas.length,
        itensPorPagina: paginas.map(p => p.length)
      });
    }

    logger.debug(`[processTemplateHTML] 📄 Itens agrupados em ${paginas.length} página(s):`, {
      totalItens: items.length,
      itensPorPagina: ITENS_POR_PAGINA,
      paginasGeradas: paginas.length,
      distribuicao: paginas.map((p, i) => `Página ${i + 1}: ${p.length} item(s)`)
    });

    // Gerar HTML das páginas
    const pages: string[] = paginas.map((paginaItens, index) => {
      const isLastPage = index === paginas.length - 1;
      const itensHtml = paginaItens.join('');

      // Envolver os itens em uma página A4 com altura fixa
      // Cada item ocupa exatamente 1/2 da altura (50%)
      return `<div class="template-page" ${isLastPage ? '' : 'data-page-break="always"'}><div class="items-container">${itensHtml}</div></div>`;
    });

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
 * Para resumo: 2 itens por página A4, cada um ocupando exatamente 1/2 (50%)
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
      font-size: 12px;
      line-height: 1.4;
      color: #1a1a1a;
      background: white;
    }

    /* Campos extras padronizados (injetados no header e rodapé de cada item) */
    .__sgp_header_meta__ {
      margin: 0 0 1.5mm 0;
      padding: 0 0 1.2mm 0;
      border-bottom: 1.5px solid #444;
      font-size: 13px;
      line-height: 1.2;
      color: #000;
    }
    .__sgp_footer_fields__ {
      margin-top: 2mm;
      padding-top: 1.5mm;
      border-top: 1.5px solid #444;
      font-size: 13px;
      line-height: 1.2;
      color: #000;
    }
    .__sgp_header_meta__ .__sgp_row__,
    .__sgp_footer_fields__ .__sgp_row__ {
      display: flex;
      flex-wrap: wrap;
      gap: 3mm;
      align-items: baseline;
      margin-top: 0.6mm;
    }
    .__sgp_header_meta__ .__sgp_field__,
    .__sgp_footer_fields__ .__sgp_field__ {
      display: inline-flex;
      gap: 1mm;
      align-items: baseline;
      white-space: nowrap;
    }
    .__sgp_header_meta__ .__sgp_label__,
    .__sgp_footer_fields__ .__sgp_label__ {
      font-weight: 800;
      letter-spacing: 0.2px;
      color: #000;
    }
    .__sgp_header_meta__ .__sgp_fill__,
    .__sgp_footer_fields__ .__sgp_fill__ {
      display: inline-block;
      min-width: 22mm;
      border-bottom: 1.5px solid #000;
      line-height: 1;
      transform: translateY(-0.5px);
    }
    
      ${isResumo ? `
    /* ============================================================
       ESTRUTURA BASE: PÁGINA A4 COM 2 ITENS POR PÁGINA
       A4 = 210mm x 297mm
       Cada item: 148.5mm de altura (297mm / 2)
       
       NOTA: Não sobrescrever estilos do template original!
       O template em /api-sgp/media/templates/template-resumo.html
       já define todos os estilos necessários.
       ============================================================ */
    
    /* Container de itens quando processado pelo templateProcessor */
    .items-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0;
      margin: 0;
    }
    
    /* Garantir que cada item ocupe exatamente 50% da página (para 2 itens/página) */
    .items-container > .item-content,
    .items-container > .template-page,
    .items-container > .item,
    .items-container > div {
      flex: 1 1 48% !important;
      height: 48% !important;
      max-height: 48% !important;
      overflow: hidden !important;
    }
    
    /* ============================================================
       ESTILOS COMPLEMENTARES (não sobrescrever template)
       ============================================================ */
    
    /* Wrapper do item quando processado pelo templateProcessor */
    .item-content {
      width: 100%;
      height: 100%;
      display: contents; /* Permite que o conteúdo interno herde layout do pai */
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
        font-size: 13px !important;
        margin: 0;
        padding: 0;
      }
      
      ${isResumo ? `
      /* ============================================================
         IMPRESSÃO: Respeitar estilos do template original
         O template define: .item { height: 99mm } e .print-page { 297mm }
         ============================================================ */
      
      /* Apenas garantir que items-container não interfira */
      .items-container {
        display: contents;
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
      logger.debug(`[templateProcessor] ✅ Usando template HTML da API: ${templateType}`);

      // Extrair apenas o template de um item (primeiro .item encontrado)
      // O template completo tem a estrutura: .print-page > .item (x3)
      // Precisamos apenas do conteúdo de um .item para usar como template
      const rawHtml = extractItemTemplate(templateHTML.html);

      // Extrair CSS do template para preservar os estilos originais
      const templateStyles = extractTemplateStyles(templateHTML.html);

      logger.debug(`[templateProcessor] Template de item extraído, tamanho: ${rawHtml.length}`);

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
            logger.debug('[templateProcessor] 🔄 Carregando e redimensionando imagem:', imagePath);

            // Carregar blob da imagem
            const blobUrl = await loadAuthenticatedImage(imagePath);

            // SEMPRE redimensionar imagem para impressão considerando altura E largura máximas
            // Altura: 85mm (aumentado para fotos maiores), Largura: 115mm
            // Isso garante que a imagem sempre caiba sem ser cortada
            // Mesmo se já for base64, vamos redimensionar para garantir o tamanho correto
            try {
              const resizedBase64 = await resizeImageToBase64(blobUrl, 85, 115);
              imageBase64Map.set(imagePath, resizedBase64);
              logger.debug('[templateProcessor] ✅ Imagem redimensionada para 85mm:', imagePath);
            } catch (resizeError) {
              logger.warn('[templateProcessor] ⚠️ Erro ao redimensionar, usando original:', resizeError);
              // Fallback: usar imagem original se redimensionamento falhar
              if (blobUrl.startsWith('data:image/')) {
                imageBase64Map.set(imagePath, blobUrl);
              } else {
                const base64 = await imageToBase64(imagePath);
                imageBase64Map.set(imagePath, base64);
              }
            }
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

      // Combinar CSS: estilos do template original + CSS básico complementar
      const basicCss = generateBasicTemplateCSS(templateType);
      const css = `${templateStyles}\n${basicCss}`;

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
