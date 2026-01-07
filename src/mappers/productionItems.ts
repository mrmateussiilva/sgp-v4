import type { CreateOrderItemRequest, OrderItem } from '@/types';

export type CanonicalTipoProducao = 'painel' | 'generica' | 'totem' | 'lona' | 'adesivo' | 'other';

export type CommonCanonicalFields = {
  descricao: string;
  largura?: string;
  altura?: string;
  metro_quadrado?: string;
  vendedor?: string;
  designer?: string;
  tecido?: string;
  observacao?: string;
  imagem?: string | null;
  legenda_imagem?: string | null;
  emenda?: string;
  emenda_qtd?: string | null;
  terceirizado?: boolean;
};

export type OtherCanonicalItem = CommonCanonicalFields & {
  tipo_producao: 'other';
};

export type PainelCanonicalItem = CommonCanonicalFields & {
  tipo_producao: 'painel' | 'generica';
  overloque: boolean;
  elastico: boolean;
  tipo_acabamento?: 'ilhos' | 'cordinha' | 'nenhum';
  quantidade_ilhos?: string;
  espaco_ilhos?: string;
  valor_ilhos?: string;
  quantidade_cordinha?: string;
  espaco_cordinha?: string;
  valor_cordinha?: string;
  quantidade_paineis?: string;
  valor_painel?: string;
  valores_adicionais?: string;
};

export type TotemCanonicalItem = CommonCanonicalFields & {
  tipo_producao: 'totem';
  acabamento_totem?: 'com_pe' | 'sem_pe' | 'outro' | string;
  acabamento_totem_outro?: string;
  quantidade_totem?: string;
  valor_totem?: string;
  outros_valores_totem?: string;
  valor_unitario?: string;
};

export type LonaCanonicalItem = CommonCanonicalFields & {
  tipo_producao: 'lona';
  acabamento_lona?: 'refilar' | 'nao_refilar' | string;
  quantidade_lona?: string;
  valor_lona?: string;
  outros_valores_lona?: string;
  tipo_acabamento?: 'ilhos' | 'cordinha' | 'nenhum';
  quantidade_ilhos?: string;
  espaco_ilhos?: string;
  valor_ilhos?: string;
  quantidade_cordinha?: string;
  espaco_cordinha?: string;
  valor_cordinha?: string;
};

export type AdesivoCanonicalItem = CommonCanonicalFields & {
  tipo_producao: 'adesivo';
  tipo_adesivo?: string;
  quantidade_adesivo?: string;
  valor_adesivo?: string;
  outros_valores_adesivo?: string;
};

export type CanonicalProductionItem =
  | PainelCanonicalItem
  | TotemCanonicalItem
  | LonaCanonicalItem
  | AdesivoCanonicalItem
  | OtherCanonicalItem;

function normalizeTipo(tipo?: string | null): CanonicalTipoProducao {
  if (tipo === 'painel') return 'painel';
  if (tipo === 'generica') return 'generica';
  if (tipo === 'totem') return 'totem';
  if (tipo === 'lona') return 'lona';
  if (tipo === 'adesivo') return 'adesivo';
  return 'other';
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeNullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function baseFromAny(input: Record<string, unknown>): Omit<CommonCanonicalFields, 'descricao'> {
  return {
    largura: normalizeString(input.largura),
    altura: normalizeString(input.altura),
    metro_quadrado: normalizeString(input.metro_quadrado),
    vendedor: normalizeString(input.vendedor),
    designer: normalizeString(input.designer),
    tecido: normalizeString(input.tecido),
    observacao: normalizeString(input.observacao),
    imagem: typeof input.imagem === 'string' ? input.imagem : input.imagem == null ? null : undefined,
    legenda_imagem: normalizeNullableString(input.legenda_imagem),
    emenda: normalizeString(input.emenda),
    emenda_qtd: normalizeNullableString(input.emenda_qtd ?? input.emendaQtd),
    terceirizado: typeof input.terceirizado === 'boolean' ? input.terceirizado : undefined,
  };
}

export function canonicalizeFromItemRequest(item: CreateOrderItemRequest): CanonicalProductionItem {
  const anyItem = item as unknown as Record<string, unknown>;
  const tipo = normalizeTipo(anyItem.tipo_producao as string | null | undefined);
  const descricao = (typeof anyItem.descricao === 'string' && anyItem.descricao.trim().length)
    ? anyItem.descricao
    : typeof anyItem.item_name === 'string'
      ? anyItem.item_name
      : '';

  const baseCommon = {
    descricao,
    ...baseFromAny(anyItem),
  };

  if (tipo === 'painel' || tipo === 'generica') {
    return {
      tipo_producao: tipo,
      ...baseCommon,
      overloque: Boolean(anyItem.overloque),
      elastico: Boolean(anyItem.elastico),
      tipo_acabamento: (anyItem.tipo_acabamento as PainelCanonicalItem['tipo_acabamento']) ?? 'nenhum',
      quantidade_ilhos: normalizeString(anyItem.quantidade_ilhos),
      espaco_ilhos: normalizeString(anyItem.espaco_ilhos),
      valor_ilhos: normalizeString(anyItem.valor_ilhos),
      quantidade_cordinha: normalizeString(anyItem.quantidade_cordinha),
      espaco_cordinha: normalizeString(anyItem.espaco_cordinha),
      valor_cordinha: normalizeString(anyItem.valor_cordinha),
      quantidade_paineis: normalizeString(anyItem.quantidade_paineis),
      valor_painel: normalizeString(anyItem.valor_painel),
      valores_adicionais: normalizeString(anyItem.valores_adicionais),
    };
  }

  if (tipo === 'totem') {
    return {
      tipo_producao: 'totem',
      ...baseCommon,
      acabamento_totem: normalizeString(anyItem.acabamento_totem) ?? undefined,
      acabamento_totem_outro: normalizeString(anyItem.acabamento_totem_outro),
      quantidade_totem: normalizeString(anyItem.quantidade_totem),
      valor_totem: normalizeString(anyItem.valor_totem),
      outros_valores_totem: normalizeString(anyItem.outros_valores_totem),
      valor_unitario: normalizeString(anyItem.valor_unitario),
    };
  }

  if (tipo === 'lona') {
    return {
      tipo_producao: 'lona',
      ...baseCommon,
      acabamento_lona: normalizeString(anyItem.acabamento_lona) ?? undefined,
      quantidade_lona: normalizeString(anyItem.quantidade_lona),
      valor_lona: normalizeString(anyItem.valor_lona),
      outros_valores_lona: normalizeString(anyItem.outros_valores_lona),
      tipo_acabamento: (anyItem.tipo_acabamento as LonaCanonicalItem['tipo_acabamento']) ?? 'nenhum',
      quantidade_ilhos: normalizeString(anyItem.quantidade_ilhos),
      espaco_ilhos: normalizeString(anyItem.espaco_ilhos),
      valor_ilhos: normalizeString(anyItem.valor_ilhos),
      quantidade_cordinha: normalizeString(anyItem.quantidade_cordinha),
      espaco_cordinha: normalizeString(anyItem.espaco_cordinha),
      valor_cordinha: normalizeString(anyItem.valor_cordinha),
    };
  }

  if (tipo === 'adesivo') {
    return {
      tipo_producao: 'adesivo',
      ...baseCommon,
      tipo_adesivo: normalizeString(anyItem.tipo_adesivo),
      quantidade_adesivo: normalizeString(anyItem.quantidade_adesivo),
      valor_adesivo: normalizeString(anyItem.valor_adesivo),
      outros_valores_adesivo: normalizeString(anyItem.outros_valores_adesivo),
    };
  }

  return {
    tipo_producao: 'other',
    ...baseCommon,
  };
}

export function canonicalizeFromOrderItem(item: OrderItem): CanonicalProductionItem {
  const anyItem = item as unknown as Record<string, unknown>;
  const tipo = normalizeTipo(
    (item.tipo_producao as string | null | undefined) ?? (anyItem.tipo_producao as string | null | undefined)
  );
  const descricao = item.descricao ?? item.item_name ?? '';

  const baseCommon = {
    descricao,
    ...baseFromAny(anyItem),
  };

  if (tipo === 'painel' || tipo === 'generica') {
    return {
      tipo_producao: tipo,
      ...baseCommon,
      overloque: Boolean((anyItem.overloque as unknown) ?? false),
      elastico: Boolean((anyItem.elastico as unknown) ?? false),
      tipo_acabamento: (anyItem.tipo_acabamento as PainelCanonicalItem['tipo_acabamento']) ?? 'nenhum',
      quantidade_ilhos: normalizeString(anyItem.quantidade_ilhos),
      espaco_ilhos: normalizeString(anyItem.espaco_ilhos),
      valor_ilhos: normalizeString(anyItem.valor_ilhos),
      quantidade_cordinha: normalizeString(anyItem.quantidade_cordinha),
      espaco_cordinha: normalizeString(anyItem.espaco_cordinha),
      valor_cordinha: normalizeString(anyItem.valor_cordinha),
      quantidade_paineis: normalizeString(anyItem.quantidade_paineis),
      valor_painel: normalizeString(anyItem.valor_painel),
      valores_adicionais: normalizeString(anyItem.valores_adicionais),
    };
  }

  if (tipo === 'totem') {
    return {
      tipo_producao: 'totem',
      ...baseCommon,
      acabamento_totem: normalizeString(anyItem.acabamento_totem) ?? undefined,
      acabamento_totem_outro: normalizeString(anyItem.acabamento_totem_outro),
      quantidade_totem: normalizeString(anyItem.quantidade_totem),
      valor_totem: normalizeString(anyItem.valor_totem),
      outros_valores_totem: normalizeString(anyItem.outros_valores_totem),
      valor_unitario: normalizeString(anyItem.valor_unitario),
    };
  }

  if (tipo === 'lona') {
    return {
      tipo_producao: 'lona',
      ...baseCommon,
      acabamento_lona: normalizeString(anyItem.acabamento_lona) ?? undefined,
      quantidade_lona: normalizeString(anyItem.quantidade_lona),
      valor_lona: normalizeString(anyItem.valor_lona),
      outros_valores_lona: normalizeString(anyItem.outros_valores_lona),
      tipo_acabamento: (anyItem.tipo_acabamento as LonaCanonicalItem['tipo_acabamento']) ?? 'nenhum',
      quantidade_ilhos: normalizeString(anyItem.quantidade_ilhos),
      espaco_ilhos: normalizeString(anyItem.espaco_ilhos),
      valor_ilhos: normalizeString(anyItem.valor_ilhos),
      quantidade_cordinha: normalizeString(anyItem.quantidade_cordinha),
      espaco_cordinha: normalizeString(anyItem.espaco_cordinha),
      valor_cordinha: normalizeString(anyItem.valor_cordinha),
    };
  }

  if (tipo === 'adesivo') {
    return {
      tipo_producao: 'adesivo',
      ...baseCommon,
      tipo_adesivo: normalizeString(anyItem.tipo_adesivo),
      quantidade_adesivo: normalizeString(anyItem.quantidade_adesivo),
      valor_adesivo: normalizeString(anyItem.valor_adesivo),
      outros_valores_adesivo: normalizeString(anyItem.outros_valores_adesivo),
    };
  }

  return {
    tipo_producao: 'other',
    ...baseCommon,
  };
}

export function toPrintFields(canon: CanonicalProductionItem): Record<string, string> {
  // Helpers "humanizados" para templates de impressão (Resumo)
  // Mantidos aqui para virar um ponto único de manutenção.
  const boolText = (value?: boolean) => (value ? 'Sim' : 'Não');
  const yesNo = (value: boolean) => (value ? 'Sim' : 'Não');

  const emendaLabel = (value?: string) => {
    const v = (value ?? '').trim();
    if (!v || v === 'sem-emenda') return 'Não';
    if (v === 'vertical') return 'Vertical';
    if (v === 'horizontal') return 'Horizontal';
    return v;
  };

  const acabamentoTotemLabel = (value?: string) => {
    const v = (value ?? '').trim();
    if (!v) return '';
    if (v === 'com_pe') return 'Com pé';
    if (v === 'sem_pe') return 'Sem pé';
    if (v === 'outro') return 'Outro';
    return v;
  };

  const parseQtd = (value?: string) => {
    const n = Number.parseInt(String(value ?? '0'), 10);
    return Number.isNaN(n) ? 0 : n;
  };

  const fields: Record<string, string> = {
    tipo_producao: canon.tipo_producao,
    descricao: canon.descricao ?? '',
    largura: canon.largura ?? '',
    altura: canon.altura ?? '',
    metro_quadrado: canon.metro_quadrado ?? '',
    vendedor: canon.vendedor ?? '',
    designer: canon.designer ?? '',
    tecido: canon.tecido ?? '',
    // Alias útil para templates (mais “humano” que tecido)
    material: canon.tecido ?? '',
    observacao: canon.observacao ?? '',
    emenda: canon.emenda ?? '',
    emenda_qtd: canon.emenda_qtd ?? '',
    // Versões “humanizadas” para resumo
    emenda_label: emendaLabel(canon.emenda),
  };

  if (canon.tipo_producao === 'painel' || canon.tipo_producao === 'generica') {
    fields.overloque = boolText(canon.overloque);
    fields.elastico = boolText(canon.elastico);
    fields.tipo_acabamento = canon.tipo_acabamento ?? 'nenhum';
    fields.quantidade_paineis = canon.quantidade_paineis ?? '';
    fields.valor_painel = canon.valor_painel ?? '';
    fields.valores_adicionais = canon.valores_adicionais ?? '';
    fields.quantidade_ilhos = canon.quantidade_ilhos ?? '';
    fields.espaco_ilhos = canon.espaco_ilhos ?? '';
    fields.valor_ilhos = canon.valor_ilhos ?? '';
    fields.quantidade_cordinha = canon.quantidade_cordinha ?? '';
    fields.espaco_cordinha = canon.espaco_cordinha ?? '';
    fields.valor_cordinha = canon.valor_cordinha ?? '';

    // Campos resumidos (Sim/Não) para o template de Resumo
    const hasIlhos = parseQtd(canon.quantidade_ilhos) > 0;
    const hasCordinha = parseQtd(canon.quantidade_cordinha) > 0;
    fields.ilhos = yesNo(hasIlhos);
    fields.cordinha = yesNo(hasCordinha);

    // Campos "resumo" (não viram "Não" para evitar sumir via hidden-empty no template)
    const acabamentos: string[] = [];
    if (canon.overloque) acabamentos.push('Overloque');
    if (canon.elastico) acabamentos.push('Elástico');
    fields.acabamentos_painel = acabamentos.length ? acabamentos.join(' + ') : 'Nenhum';

    fields.ilhos_resumo = hasIlhos ? `Sim (${parseQtd(canon.quantidade_ilhos)})` : 'Nenhum';
    fields.cordinha_resumo = hasCordinha ? `Sim (${parseQtd(canon.quantidade_cordinha)})` : 'Nenhum';
  }

  if (canon.tipo_producao === 'totem') {
    fields.acabamento_totem = canon.acabamento_totem ?? '';
    fields.acabamento_totem_label = acabamentoTotemLabel(canon.acabamento_totem);
    fields.acabamento_totem_outro = canon.acabamento_totem_outro ?? '';
    fields.quantidade_totem = canon.quantidade_totem ?? '';
    fields.valor_totem = canon.valor_totem ?? '';
    fields.outros_valores_totem = canon.outros_valores_totem ?? '';
    fields.valor_unitario = canon.valor_unitario ?? '';

    // Campo agregado para Resumo: evita ficar vazio e facilita manutenção do template
    const label = acabamentoTotemLabel(canon.acabamento_totem);
    const outro = (canon.acabamento_totem_outro ?? '').trim();
    if (label === 'Outro') {
      fields.acabamento_totem_resumo = outro ? `Outro (${outro})` : 'Outro';
    } else if (label) {
      fields.acabamento_totem_resumo = label;
    } else {
      fields.acabamento_totem_resumo = 'Não informado';
    }
  }

  if (canon.tipo_producao === 'lona') {
    fields.acabamento_lona = canon.acabamento_lona ?? '';
    fields.tipo_acabamento = canon.tipo_acabamento ?? 'nenhum';
    fields.quantidade_lona = canon.quantidade_lona ?? '';
    fields.valor_lona = canon.valor_lona ?? '';
    fields.outros_valores_lona = canon.outros_valores_lona ?? '';
    fields.quantidade_ilhos = canon.quantidade_ilhos ?? '';
    fields.espaco_ilhos = canon.espaco_ilhos ?? '';
    fields.valor_ilhos = canon.valor_ilhos ?? '';
    fields.quantidade_cordinha = canon.quantidade_cordinha ?? '';
    fields.espaco_cordinha = canon.espaco_cordinha ?? '';
    fields.valor_cordinha = canon.valor_cordinha ?? '';
  }

  if (canon.tipo_producao === 'adesivo') {
    fields.tipo_adesivo = canon.tipo_adesivo ?? '';
    fields.quantidade_adesivo = canon.quantidade_adesivo ?? '';
    fields.valor_adesivo = canon.valor_adesivo ?? '';
    fields.outros_valores_adesivo = canon.outros_valores_adesivo ?? '';
  }

  return fields;
}


