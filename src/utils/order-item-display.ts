import { OrderItem, OrderItemFicha } from '@/types';

export interface ItemDisplayEntry {
  key: string;
  label: string;
  value: string;
}

type GenericOrderItem = Partial<OrderItem> & Partial<OrderItemFicha> & Record<string, unknown>;

const LABELS: Record<string, string> = {
  tipo_producao: 'Tipo de produção',
  descricao: 'Descrição',
  vendedor: 'Vendedor',
  designer: 'Designer',
  tecido: 'Tecido',
  largura: 'Largura',
  altura: 'Altura',
  metro_quadrado: 'Área (m²)',
  quantidade_paineis: 'Quantidade de painéis',
  valor_painel: 'Valor do painel',
  valores_adicionais: 'Valores adicionais',
  quantidade_ilhos: 'Quantidade de ilhós',
  espaco_ilhos: 'Espaçamento dos ilhós',
  valor_ilhos: 'Valor dos ilhós',
  quantidade_cordinha: 'Quantidade de cordinhas',
  espaco_cordinha: 'Espaçamento das cordinhas',
  valor_cordinha: 'Valor das cordinhas',
  tipo_acabamento: 'Tipo de acabamento',
  emenda: 'Emenda',
  emenda_qtd: 'Quantidade de emendas',
  overloque: 'Overloque',
  elastico: 'Elástico',
  ziper: 'Zíper',
  cordinha_extra: 'Cordinha extra',
  alcinha: 'Alcinha',
  toalha_pronta: 'Toalha pronta',
  terceirizado: 'Terceirizado',
  acabamento_lona: 'Acabamento (lona)',
  valor_lona: 'Valor da lona',
  quantidade_lona: 'Quantidade de lonas',
  outros_valores_lona: 'Outros valores (lona)',
  acabamento_totem: 'Acabamento (totem)',
  acabamento_totem_outro: 'Acabamento extra (totem)',
  valor_totem: 'Valor do totem',
  quantidade_totem: 'Quantidade de totens',
  outros_valores_totem: 'Outros valores (totem)',
  tipo_adesivo: 'Tipo de adesivo',
  valor_adesivo: 'Valor do adesivo',
  quantidade_adesivo: 'Quantidade de adesivos',
  outros_valores_adesivo: 'Outros valores (adesivo)',
  valor_unitario: 'Valor unitário',
  subtotal: 'Subtotal',
  observacao: 'Observação do item',
  legenda_imagem: 'Legenda da imagem',
  rip_maquina: 'Máquina / RIP',
  perfil_cor: 'Perfil de cor',
  tecido_fornecedor: 'Tecido (Fornecedor)',
  data_impressao: 'Data de impressão',
};

/** Campos que só se aplicam a certos tipos de produção. Usado para limpar campos ao trocar o tipo do item. */
export const FIELD_ALLOWED_TYPES: Record<string, readonly string[]> = {
  quantidade_paineis: ['painel', 'generica', 'mesa_babado'],
  valor_painel: ['painel', 'generica', 'mesa_babado'],
  tipo_acabamento: ['painel', 'generica', 'lona', 'mochilinha', 'bolsinha', 'mesa_babado'],
  quantidade_ilhos: ['painel', 'generica', 'lona'],
  espaco_ilhos: ['painel', 'generica', 'lona'],
  valor_ilhos: ['painel', 'generica', 'lona'],
  quantidade_cordinha: ['painel', 'generica'],
  espaco_cordinha: ['painel', 'generica'],
  valor_cordinha: ['painel', 'generica'],
  emenda: ['painel', 'generica', 'lona'],
  emenda_qtd: ['painel', 'generica', 'lona'],
  overloque: ['painel', 'generica'],
  elastico: ['painel', 'generica'],
  ziper: ['painel', 'generica'],
  cordinha_extra: ['painel', 'generica'],
  alcinha: ['painel', 'generica'],
  toalha_pronta: ['painel', 'generica'],
  terceirizado: ['lona'],
  acabamento_lona: ['lona'],
  valor_lona: ['lona'],
  quantidade_lona: ['lona'],
  outros_valores_lona: ['lona'],
  tipo_adesivo: ['adesivo'],
  valor_adesivo: ['adesivo'],
  quantidade_adesivo: ['adesivo'],
  outros_valores_adesivo: ['adesivo'],
  acabamento_totem: ['totem'],
  acabamento_totem_outro: ['totem'],
  valor_totem: ['totem'],
  quantidade_totem: ['totem'],
  outros_valores_totem: ['totem'],
  valores_adicionais: ['mochilinha', 'bolsinha', 'mochilinha/bolsinha', 'painel', 'generica', 'mesa_babado'],
};

const CURRENCY_FIELDS = new Set([
  'valor_unitario',
  'valor_painel',
  'valores_adicionais',
  'valor_ilhos',
  'valor_cordinha',
  'valor_lona',
  'outros_valores_lona',
  'valor_totem',
  'outros_valores_totem',
  'valor_adesivo',
  'outros_valores_adesivo',
  'subtotal',
]);

const BOOLEAN_FIELDS = new Set([
  'overloque',
  'elastico',
  'ziper',
  'cordinha_extra',
  'alcinha',
  'toalha_pronta',
  'terceirizado',
]);

const DIMENSION_FIELDS = new Set(['largura', 'altura']);
const SPACING_FIELDS = new Set(['espaco_ilhos', 'espaco_cordinha']);

const DISALLOW_VALUES: Record<string, string[]> = {
  tipo_acabamento: ['nenhum', ''],
  emenda: ['sem-emenda', ''],
};

const numberFromValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const compact = value.trim().replace(/\s+/g, '');
  if (!compact) return null;

  // Mantém apenas dígitos, vírgula, ponto e sinal
  const cleaned = compact.replace(/[^\d,.-]/g, '');

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    // Tem vírgula e ponto: o separador decimal é o que aparece por último
    if (lastComma > lastDot) {
      // Formato pt-BR: vírgula decimal, ponto milhar  (ex: 9.000,00)
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato en-US: ponto decimal, vírgula milhar (ex: 9,000.00)
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Só vírgula: tratar como decimal
    normalized = cleaned.replace(',', '.');
  } else if (lastDot > -1) {
    // Só ponto: tratar como decimal (não remover)
    normalized = cleaned;
  }

  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatCurrency = (value: unknown): string => {
  const numeric = numberFromValue(value);
  if (numeric === null) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numeric);
};

const formatDimension = (value: unknown): string => {
  const numeric = numberFromValue(value);
  if (numeric === null) {
    return typeof value === 'string' ? value : '';
  }
  return `${numeric} m`;
};

const formatSpacing = (value: unknown): string => {
  const numeric = numberFromValue(value);
  if (numeric === null) {
    return typeof value === 'string' ? value : '';
  }
  return `${numeric} cm`;
};

const formatBoolean = (value: unknown): string => {
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'sim', 'yes'].includes(normalized)) {
      return 'Sim';
    }
    if (['false', '0', 'não', 'nao', 'no'].includes(normalized)) {
      return 'Não';
    }
  }
  return '';
};

const formatComposition = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((part: any) => `${part.label || part.item || 'Parte'}: ${part.tecido || 'N/A'}`)
        .join(' | ');
    }
    return String(value);
  } catch (e) {
    return String(value);
  }
};

const shouldInclude = (_item: GenericOrderItem, key: string, raw: unknown): boolean => {
  if (BOOLEAN_FIELDS.has(key)) {
    return !!raw;
  }

  if (CURRENCY_FIELDS.has(key)) {
    const numeric = numberFromValue(raw);
    return numeric !== null && numeric !== 0;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    const disallow = DISALLOW_VALUES[key];
    if (disallow && disallow.includes(trimmed.toLowerCase())) {
      return false;
    }
    return true;
  }

  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw !== 0;
  }

  return false;
};

const formatValue = (key: string, raw: unknown): string => {
  if (key === 'composicao_tecidos') {
    return formatComposition(raw);
  }
  if (CURRENCY_FIELDS.has(key)) {
    return formatCurrency(raw);
  }
  if (BOOLEAN_FIELDS.has(key)) {
    return formatBoolean(raw);
  }
  if (DIMENSION_FIELDS.has(key)) {
    return formatDimension(raw);
  }
  if (SPACING_FIELDS.has(key)) {
    return formatSpacing(raw);
  }
  if (key === 'emenda_qtd' && typeof raw === 'string' && !raw.trim()) {
    return '';
  }
  if (typeof raw === 'string') {
    return raw.trim();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  return '';
};

export const getItemDisplayEntries = (
  item: GenericOrderItem,
  options: { omitKeys?: string[] } = {}
): ItemDisplayEntry[] => {
  const entries: ItemDisplayEntry[] = [];
  const omitSet = new Set(options.omitKeys ?? []);
  const rawType =
    typeof item.tipo_producao === 'string'
      ? item.tipo_producao
      : typeof (item as Record<string, unknown>).tipoProducao === 'string'
        ? ((item as Record<string, unknown>).tipoProducao as string)
        : '';
  const itemType = rawType.trim().toLowerCase();

  Object.entries(LABELS).forEach(([key, label]) => {
    if (omitSet.has(key)) {
      return;
    }
    const allowedTypes = FIELD_ALLOWED_TYPES[key];

    // Lógica especial para tipo_acabamento: permitir se for mochilinha/bolsinha
    if (key === 'tipo_acabamento') {
      const itemName = String(item.item_name || '').toLowerCase();
      const isMochilinha = itemType.includes('mochilinha') ||
        itemType.includes('bolsinha') ||
        itemName.includes('mochilinha') ||
        itemName.includes('bolsinha');
      if (!isMochilinha && allowedTypes && !allowedTypes.includes(itemType)) {
        return;
      }
    } else if (allowedTypes && itemType && !allowedTypes.includes(itemType)) {
      return;
    }
    const raw = (item as Record<string, unknown>)[key];
    if (!shouldInclude(item, key, raw)) {
      return;
    }

    const value = formatValue(key, raw);
    if (!value) {
      return;
    }

    if (key === 'emenda_qtd') {
      const emendaRaw = (item as Record<string, unknown>).emenda;
      if (!shouldInclude(item, 'emenda', emendaRaw)) {
        return;
      }
      entries.push({ key, label, value });
      return;
    }

    entries.push({ key, label, value });
  });

  return entries;
};
