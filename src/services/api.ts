import { AxiosError } from 'axios'
import {
  apiClient,
  getApiUrl as getConfiguredApiUrl,
  setApiUrl as setHttpApiUrl,
  setAuthToken,
} from './apiClient';
import { useAuthStore } from '../store/authStore';
import { logger } from '../utils/logger';
import {
  LoginRequest,
  LoginResponse,
  OrderWithItems,
  CreateOrderRequest,
  CreateOrderItemRequest,
  UpdateOrderRequest,
  UpdateOrderMetadataRequest,
  OrderFilters,
  PaginatedOrders,
  Cliente,
  CreateClienteRequest,
  UpdateClienteRequest,
  UpdateOrderStatusRequest,
  OrderAuditLogEntry,
  ReportRequestPayload,
  ReportResponse,
  BulkClienteImportItem,
  BulkClienteImportResult,
  BulkClienteImportError,
  OrderStatus,
  OrderItem,
  OrderFicha,
  FichaTemplatesConfig,
  RelatorioTemplatesConfig,
} from '../types';
import { generateFechamentoReport } from '../utils/fechamentoReport';
import { ordersSocket } from '../lib/realtimeOrders';
import { canonicalizeFromItemRequest } from '../mappers/productionItems';

type ApiOrderStatus = 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
type ApiPriority = 'NORMAL' | 'ALTA';

interface ApiAcabamento {
  overloque?: boolean;
  elastico?: boolean;
  ilhos?: boolean;
}

interface ApiPedidoItem {
  id?: number;
  tipo_producao?: string;
  descricao?: string;
  largura?: string | null;
  altura?: string | null;
  metro_quadrado?: string | null;
  vendedor?: string | null;
  designer?: string | null;
  tecido?: string | null;
  tipo_acabamento?: string | null;
  acabamento?: ApiAcabamento | null;
  emenda?: string | null;
  observacao?: string | null;
  valor_unitario?: string | null;
  imagem?: string | null;
  ilhos_qtd?: string | null;
  ilhos_valor_unitario?: string | null;
  ilhos_distancia?: string | null;
  quantidade_paineis?: string | null;
  valor_painel?: string | null;
  valores_adicionais?: string | null;
  quantidade_cordinha?: string | null;
  valor_cordinha?: string | null;
  espaco_cordinha?: string | null;
  quantidade_ilhos?: string | null;
  valor_ilhos?: string | null;
  espaco_ilhos?: string | null;
  quantidade_totem?: string | null;
  valor_totem?: string | null;
  outros_valores_totem?: string | null;
  quantidade_lona?: string | null;
  valor_lona?: string | null;
  outros_valores_lona?: string | null;
  tipo_adesivo?: string | null;
  quantidade_adesivo?: string | null;
  valor_adesivo?: string | null;
  outros_valores_adesivo?: string | null;
  ziper?: boolean | null;
  cordinha_extra?: boolean | null;
  alcinha?: boolean | null;
  toalha_pronta?: boolean | null;
  emenda_qtd?: string | null;
  terceirizado?: boolean | null;
  acabamento_lona?: string | null;
  acabamento_totem?: string | null;
  acabamento_totem_outro?: string | null;
  legenda_imagem?: string | null;
  outros_valores?: string | null;
}

interface ApiPedido {
  id: number;
  numero?: string | null;
  data_entrada?: string | null;
  data_entrega?: string | null;
  observacao?: string | null;
  prioridade?: ApiPriority | string | null;
  status: ApiOrderStatus;
  cliente: string;
  telefone_cliente?: string | null;
  cidade_cliente?: string | null;
  estado_cliente?: string | null;
  valor_total?: string | null;
  valor_frete?: string | null;
  valor_itens?: string | null;
  tipo_pagamento?: string | null;
  obs_pagamento?: string | null;
  forma_envio?: string | null;
  forma_envio_id?: number | null;
  financeiro?: boolean | null;
  sublimacao?: boolean | null;
  costura?: boolean | null;
  expedicao?: boolean | null;
  items?: ApiPedidoItem[];
  data_criacao?: string | null;
  ultima_atualizacao?: string | null;
  conferencia?: boolean | null;
  sublimacao_maquina?: string | null;
  sublimacao_data_impressao?: string | null;
}

interface MaterialApi {
  id: number;
  nome: string;
  tipo: string;
  valor_metro: number;
  estoque_metros: number;
  ativo: boolean;
  observacao?: string | null;
}

interface DesignerApi {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  ativo: boolean;
  observacao?: string | null;
}

interface DesignerPayload {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  ativo: boolean;
  observacao?: string | null;
}

interface VendedorApi {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  comissao_percentual: number;
  ativo: boolean;
  observacao?: string | null;
}

interface VendedorPayload {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  comissao_percentual: number;
  ativo: boolean;
  observacao?: string | null;
}

interface FormaEnvioApi {
  id: number;
  nome: string;
  valor?: number | null;
  prazo_dias: number;
  ativo: boolean;
  observacao?: string | null;
}

interface FormaEnvioPayload {
  nome: string;
  valor?: number | null;
  prazo_dias: number;
  ativo: boolean;
  observacao?: string | null;
}

interface FormaPagamentoApi {
  id: number;
  nome: string;
  parcelas_max: number;
  taxa_percentual: number;
  ativo: boolean;
  observacao?: string | null;
}

interface FormaPagamentoPayload {
  nome: string;
  parcelas_max: number;
  taxa_percentual: number;
  ativo: boolean;
  observacao?: string | null;
}

interface UserApi {
  id: number;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at?: string | null;
}

interface UserCreatePayload {
  username: string;
  password: string;
  is_admin: boolean;
  is_active?: boolean;
}

interface UserUpdatePayload {
  username?: string;
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
}

interface TipoProducaoApi {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  created_at?: string | null;
}

interface TipoProducaoPayload {
  name: string;
  description?: string | null;
  active: boolean;
}

interface MaterialPayload {
  nome: string;
  tipo: string;
  valor_metro: number;
  estoque_metros: number;
  ativo: boolean;
  observacao?: string | null;
}

export interface DesignerEntity {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
  observacao?: string;
}

export interface VendedorEntity {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  comissao_percentual: number;
  ativo: boolean;
  observacao?: string;
}

export interface FormaEnvioEntity {
  id: number;
  nome: string;
  valor: number;
  prazo_dias: number;
  ativo: boolean;
  observacao?: string;
}

export interface FormaPagamentoEntity {
  id: number;
  nome: string;
  parcelas_max: number;
  taxa_percentual: number;
  ativo: boolean;
  observacao?: string;
}

export interface UserEntity {
  id: number;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface TipoProducaoEntity {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  created_at?: string;
}

export interface FormaPagamentoEntity {
  id: number;
  nome: string;
  parcelas_max: number;
  taxa_percentual: number;
  ativo: boolean;
  observacao?: string;
}

type MaterialEntity = Omit<MaterialApi, 'observacao'> & {
  observacao?: string;
};

const DESIGNERS_ENDPOINT = '/designers';
const DESIGNERS_LIST_ENDPOINT = `${DESIGNERS_ENDPOINT}/`;
const MATERIAIS_ENDPOINT = '/materiais';
const MATERIAIS_LIST_ENDPOINT = `${MATERIAIS_ENDPOINT}/`;
const CATALOG_CACHE_TTL_MS = 60_000;
// Pedidos precisam refletir mudanças quase em tempo real (WebSocket). Cache longo aqui causa UI stale.
const ORDER_BY_ID_CACHE_TTL_MS = 2_000;
const ORDERS_BY_STATUS_CACHE_TTL_MS = 2_000;

interface TimedCache<T> {
  data: T;
  timestamp: number;
}

const isCacheFresh = <T>(cache: TimedCache<T> | null, ttlMs: number = CATALOG_CACHE_TTL_MS): cache is TimedCache<T> => {
  if (!cache) {
    return false;
  }
  return Date.now() - cache.timestamp < ttlMs;
};

const createCacheEntry = <T>(data: T): TimedCache<T> => ({
  data,
  timestamp: Date.now(),
});

let designersCache: TimedCache<DesignerApi[]> | null = null;
let materiaisCache: TimedCache<MaterialApi[]> | null = null;
let ordersByStatusCache: Map<string, TimedCache<OrderWithItems[]>> = new Map();
let ordersByIdCache: Map<number, TimedCache<OrderWithItems>> = new Map();
let vendedoresCache: TimedCache<Array<{ id: number; nome: string }>> | null = null;
let tiposPagamentoCache: TimedCache<Array<{ id: number; nome: string }>> | null = null;

const clearDesignersCache = (): void => {
  designersCache = null;
};

const clearMateriaisCache = (): void => {
  materiaisCache = null;
};

const clearOrderCache = (orderId: number): void => {
  ordersByIdCache.delete(orderId);
  logger.debug(`[clearOrderCache] 🗑️ Cache invalidado para pedido ${orderId}`);
};

const API_STATUS_TO_APP: Record<ApiOrderStatus, OrderStatus> = {
  pendente: OrderStatus.Pendente,
  em_producao: OrderStatus.EmProcessamento,
  pronto: OrderStatus.Concluido,
  entregue: OrderStatus.Concluido,
  cancelado: OrderStatus.Cancelado,
};

const APP_STATUS_TO_API: Record<OrderStatus, ApiOrderStatus> = {
  [OrderStatus.Pendente]: 'pendente',
  [OrderStatus.EmProcessamento]: 'em_producao',
  [OrderStatus.Concluido]: 'pronto',
  [OrderStatus.Cancelado]: 'cancelado',
};

const DEFAULT_PAGE_SIZE = 20;

const requireSessionToken = (): string => {
  const token = useAuthStore.getState().sessionToken;
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  setAuthToken(token);
  return token;
};

const sanitizeDecimalString = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '0';
  }
  if (trimmed.includes(',')) {
    return trimmed.replace(/\./g, '').replace(',', '.');
  }
  return trimmed;
};

const parseDecimal = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : value;
  }
  if (typeof value === 'string') {
    const numeric = Number.parseFloat(sanitizeDecimalString(value));
    return Number.isNaN(numeric) ? 0 : numeric;
  }
  if (value == null) {
    return 0;
  }
  return 0;
};

const toCurrencyString = (value: string | number | null | undefined): string => {
  return parseDecimal(value).toFixed(2);
};

/**
 * Normaliza valores monetários vindos da API que podem estar em centavos.
 *
 * Exemplos:
 * - 90          -> "90.00"
 * - "90.00"     -> "90.00"
 * - 9000        -> "90.00"   (valor em centavos)
 * - "9000"      -> "90.00"   (valor em centavos)
 */
const normalizeApiMoney = (value: string | number | null | undefined): string | undefined => {
  const numeric = parseDecimal(value);
  if (!numeric) {
    return undefined;
  }

  // Heurística: se o valor for maior ou igual a 1000 e inteiro,
  // consideramos que está em centavos e dividimos por 100.
  const adjusted =
    numeric >= 1000 && Number.isInteger(numeric)
      ? numeric / 100
      : numeric;

  return adjusted.toFixed(2);
};

const safeString = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
};

const parseNumericId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0 && /^[0-9]+$/.test(trimmed)) {
      return Number.parseInt(trimmed, 10);
    }
  }
  return null;
};

const deriveQuantity = (source: any): number => {
  const candidates = [
    source?.quantity,
    source?.quantidade_paineis,
    source?.quantidade_totem,
    source?.quantidade_lona,
    source?.quantidade_adesivo,
    source?.quantidade,
  ];

  for (const candidate of candidates) {
    const numeric = parseDecimal(candidate);
    if (numeric > 0) {
      return numeric;
    }
  }
  return 1;
};

const deriveUnitPrice = (source: any): number => {
  const candidates = [
    source?.unit_price,
    source?.valor_unitario,
    source?.valor_totem,
    source?.valor_lona,
    source?.valor_adesivo,
  ];

  for (const candidate of candidates) {
    const numeric = parseDecimal(candidate);
    if (numeric > 0) {
      return numeric;
    }
  }
  return 0;
};

const inferTipoProducao = (item: any): string => {
  if (item?.tipo_producao) {
    return String(item.tipo_producao);
  }
  if (typeof item?.descricao === 'string') {
    const lower = item.descricao.toLowerCase();
    if (lower.includes('totem')) return 'totem';
    if (lower.includes('lona')) return 'lona';
    if (lower.includes('adesivo')) return 'adesivo';
  }
  return 'generica';
};

const buildAcabamento = (item: any): ApiAcabamento => ({
  overloque: Boolean(item?.overloque),
  elastico: Boolean(item?.elastico),
  ilhos:
    Boolean(item?.tipo_acabamento && String(item.tipo_acabamento).toLowerCase().includes('ilho')) ||
    Boolean(item?.quantidade_ilhos || item?.ilhos_qtd),
});

const sanitizePayload = (payload: Record<string, any>): Record<string, any> => {
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });
  return payload;
};

const normalizeNullableString = (value?: string | null): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePriority = (value?: string | null): ApiPriority => {
  if (value && value.toUpperCase() === 'ALTA') {
    return 'ALTA';
  }
  return 'NORMAL';
};

const mapItemFromApi = (item: ApiPedidoItem, orderId: number, index: number): OrderItem => {
  const anyItem = item as unknown as Record<string, unknown>;
  const acabamentoAny = (item.acabamento ?? (anyItem.acabamento as ApiAcabamento | null | undefined)) ?? null;
  const quantity = deriveQuantity(item);
  const unitPrice =
    item.valor_unitario != null || item.valor_totem != null || item.valor_lona != null || item.valor_adesivo != null
      ? parseDecimal(item.valor_unitario ?? item.valor_totem ?? item.valor_lona ?? item.valor_adesivo)
      : deriveUnitPrice(item);
  const subtotal = Number((unitPrice * quantity).toFixed(2));
  const fallbackId = item.id ?? orderId * 1000 + index;
  const imagemCandidate =
    (typeof item.imagem === 'string' && item.imagem.trim().length > 0 ? item.imagem : null) ??
    (typeof anyItem.imagem_path === 'string' && anyItem.imagem_path.trim().length > 0 ? anyItem.imagem_path : null) ??
    (typeof anyItem.image_reference === 'string' && anyItem.image_reference.trim().length > 0 ? anyItem.image_reference : null) ??
    (typeof anyItem.server_reference === 'string' && anyItem.server_reference.trim().length > 0 ? anyItem.server_reference : null) ??
    null;

  return {
    id: fallbackId,
    order_id: orderId,
    item_name: safeString(item.descricao ?? item.tipo_producao ?? 'Item'),
    quantity,
    unit_price: unitPrice,
    subtotal,
    tipo_producao: item.tipo_producao,
    descricao: item.descricao,
    largura: item.largura ?? undefined,
    altura: item.altura ?? undefined,
    metro_quadrado: item.metro_quadrado ?? undefined,
    vendedor: item.vendedor ?? undefined,
    designer: item.designer ?? undefined,
    tecido: item.tecido ?? undefined,
    // Compatibilidade: alguns payloads (especialmente JSON salvo) podem trazer
    // overloque/elastico em raiz, e não dentro de acabamento.
    overloque: Boolean(acabamentoAny?.overloque ?? anyItem.overloque),
    elastico: Boolean(acabamentoAny?.elastico ?? anyItem.elastico),
    tipo_acabamento: item.tipo_acabamento ?? undefined,
    quantidade_ilhos: item.quantidade_ilhos ?? item.ilhos_qtd ?? undefined,
    espaco_ilhos: item.espaco_ilhos ?? item.ilhos_distancia ?? undefined,
    valor_ilhos: item.valor_ilhos ?? item.ilhos_valor_unitario ?? undefined,
    quantidade_cordinha: item.quantidade_cordinha ?? undefined,
    espaco_cordinha: item.espaco_cordinha ?? undefined,
    valor_cordinha: item.valor_cordinha ?? undefined,
    observacao: item.observacao ?? undefined,
    // Compatibilidade: imagem pode vir em campos alternativos dependendo da origem
    imagem: imagemCandidate ?? undefined,
    legenda_imagem: item.legenda_imagem ?? undefined,
    quantidade_paineis: item.quantidade_paineis ?? undefined,
    // Normalizar campos monetários que historicamente podem vir em centavos da API
    valor_painel: normalizeApiMoney(item.valor_painel) ?? undefined,
    valores_adicionais: normalizeApiMoney(item.valores_adicionais) ?? undefined,
    valor_unitario: normalizeApiMoney(item.valor_unitario) ?? undefined,
    emenda: item.emenda ?? undefined,
    emenda_qtd: item.emenda_qtd ?? undefined,
    terceirizado: Boolean(item.terceirizado),
    acabamento_lona: item.acabamento_lona ?? undefined,
    quantidade_lona: item.quantidade_lona ?? undefined,
    valor_lona: normalizeApiMoney(item.valor_lona) ?? undefined,
    outros_valores_lona: normalizeApiMoney(item.outros_valores_lona) ?? undefined,
    tipo_adesivo: item.tipo_adesivo ?? undefined,
    quantidade_adesivo: item.quantidade_adesivo ?? undefined,
    valor_adesivo: normalizeApiMoney(item.valor_adesivo) ?? undefined,
    outros_valores_adesivo: normalizeApiMoney(item.outros_valores_adesivo) ?? undefined,
    ziper: Boolean(item.ziper),
    cordinha_extra: Boolean(item.cordinha_extra),
    alcinha: Boolean(item.alcinha),
    toalha_pronta: Boolean(item.toalha_pronta),
    acabamento_totem: item.acabamento_totem ?? undefined,
    acabamento_totem_outro: item.acabamento_totem_outro ?? undefined,
    quantidade_totem: item.quantidade_totem ?? undefined,
    valor_totem: normalizeApiMoney(item.valor_totem) ?? undefined,
    outros_valores_totem: normalizeApiMoney(item.outros_valores_totem) ?? undefined,
  };
};

const mapStatusFromApi = (status: ApiOrderStatus): OrderStatus => {
  return API_STATUS_TO_APP[status] ?? OrderStatus.Pendente;
};

const mapStatusToApi = (status: OrderStatus): ApiOrderStatus => {
  return APP_STATUS_TO_API[status] ?? 'pendente';
};

const mapPedidoFromApi = (pedido: ApiPedido): OrderWithItems => {
  const items = (pedido.items ?? []).map((item, index) => mapItemFromApi(item, pedido.id, index));
  const valorFrete = parseDecimal(pedido.valor_frete);
  const valorItens = parseDecimal(pedido.valor_itens ?? pedido.valor_total);
  const totalValue = valorItens || items.reduce((sum, item) => sum + item.subtotal, 0);
  const status = mapStatusFromApi(pedido.status);
  const prontoFromApi = (pedido as unknown as { pronto?: unknown }).pronto;

  return {
    id: pedido.id,
    numero: pedido.numero ?? undefined,
    customer_name: pedido.cliente ?? '',
    cliente: pedido.cliente ?? '',
    address: pedido.cidade_cliente ?? '',
    cidade_cliente: pedido.cidade_cliente ?? undefined,
    estado_cliente: pedido.estado_cliente ?? undefined,
    telefone_cliente: pedido.telefone_cliente ?? undefined,
    data_entrada: pedido.data_entrada ?? undefined,
    data_entrega: pedido.data_entrega ?? undefined,
    total_value: totalValue,
    valor_total: totalValue,
    valor_frete: valorFrete,
    created_at: pedido.data_criacao ?? undefined,
    updated_at: pedido.ultima_atualizacao ?? undefined,
    status,
    prioridade: pedido.prioridade ?? undefined,
    forma_envio: pedido.forma_envio ?? undefined,
    forma_pagamento_id: parseNumericId(pedido.tipo_pagamento ?? undefined) ?? undefined,
    observacao: pedido.observacao ?? undefined,
    financeiro: Boolean(pedido.financeiro),
    conferencia: Boolean(pedido.conferencia),
    sublimacao: Boolean(pedido.sublimacao),
    costura: Boolean(pedido.costura),
    expedicao: Boolean(pedido.expedicao),
    // O backend pode expor "pronto" como boolean independente do campo "status".
    // Se existir no payload, ele é a fonte da verdade; senão, usamos o fallback antigo.
    pronto: typeof prontoFromApi === 'boolean' ? prontoFromApi : status === OrderStatus.Concluido,
    sublimacao_maquina: pedido.sublimacao_maquina ?? undefined,
    sublimacao_data_impressao: pedido.sublimacao_data_impressao ?? undefined,
    items,
  };
};

const mapOrderToFicha = (order: OrderWithItems): OrderFicha => ({
  id: order.id,
  numero: order.numero,
  cliente: order.cliente,
  telefone_cliente: order.telefone_cliente,
  cidade_cliente: order.cidade_cliente,
  estado_cliente: order.estado_cliente,
  data_entrada: order.data_entrada,
  data_entrega: order.data_entrega,
  forma_envio: order.forma_envio,
  forma_pagamento_id: order.forma_pagamento_id ?? undefined,
  valor_frete:
    typeof order.valor_frete === 'string'
      ? parseDecimal(order.valor_frete)
      : order.valor_frete ?? 0,
  total_value:
    typeof order.total_value === 'string'
      ? parseDecimal(order.total_value)
      : order.total_value ?? 0,
  observacao: order.observacao,
  items: order.items.map((item) => ({ ...item })),
});

const mapMaterialFromApi = (material: MaterialApi): MaterialEntity => ({
  id: material.id,
  nome: material.nome,
  tipo: material.tipo,
  valor_metro: Number(material.valor_metro ?? 0),
  estoque_metros: Number(material.estoque_metros ?? 0),
  ativo: Boolean(material.ativo),
  observacao: material.observacao ?? undefined,
});

const buildMaterialCreatePayload = (payload: MaterialPayload): MaterialPayload => ({
  nome: payload.nome,
  tipo: payload.tipo,
  valor_metro: Number(payload.valor_metro ?? 0),
  estoque_metros: Number(payload.estoque_metros ?? 0),
  ativo: payload.ativo ?? true,
  observacao: normalizeNullableString(payload.observacao),
});

const buildMaterialUpdatePayload = (payload: Partial<MaterialPayload>): Record<string, any> => {
  const update: Record<string, any> = {};
  if (payload.nome !== undefined) {
    update.nome = payload.nome;
  }
  if (payload.tipo !== undefined) {
    update.tipo = payload.tipo;
  }
  if (payload.valor_metro !== undefined) {
    update.valor_metro = Number(payload.valor_metro ?? 0);
  }
  if (payload.estoque_metros !== undefined) {
    update.estoque_metros = Number(payload.estoque_metros ?? 0);
  }
  if (payload.ativo !== undefined) {
    update.ativo = Boolean(payload.ativo);
  }
  if (payload.observacao !== undefined) {
    update.observacao = normalizeNullableString(payload.observacao);
  }
  return sanitizePayload(update);
};

const mapDesignerFromApi = (designer: DesignerApi): DesignerEntity => ({
  id: designer.id,
  nome: designer.nome,
  email: designer.email ?? undefined,
  telefone: designer.telefone ?? undefined,
  ativo: Boolean(designer.ativo),
  observacao: designer.observacao ?? undefined,
});

const buildDesignerCreatePayload = (payload: DesignerPayload): DesignerPayload => ({
  nome: payload.nome,
  email: normalizeNullableString(payload.email),
  telefone: normalizeNullableString(payload.telefone),
  ativo: payload.ativo ?? true,
  observacao: normalizeNullableString(payload.observacao),
});

const buildDesignerUpdatePayload = (payload: Partial<DesignerPayload>): Record<string, any> => {
  const update: Record<string, any> = {};
  if (payload.nome !== undefined) update.nome = payload.nome;
  if (payload.email !== undefined) update.email = normalizeNullableString(payload.email);
  if (payload.telefone !== undefined) update.telefone = normalizeNullableString(payload.telefone);
  if (payload.ativo !== undefined) update.ativo = Boolean(payload.ativo);
  if (payload.observacao !== undefined) update.observacao = normalizeNullableString(payload.observacao);
  return sanitizePayload(update);
};

const mapVendedorFromApi = (vendedor: VendedorApi): VendedorEntity => ({
  id: vendedor.id,
  nome: vendedor.nome,
  email: vendedor.email ?? undefined,
  telefone: vendedor.telefone ?? undefined,
  comissao_percentual: Number(vendedor.comissao_percentual ?? 0),
  ativo: Boolean(vendedor.ativo),
  observacao: vendedor.observacao ?? undefined,
});

const buildVendedorCreatePayload = (payload: VendedorPayload): VendedorPayload => ({
  nome: payload.nome,
  email: normalizeNullableString(payload.email),
  telefone: normalizeNullableString(payload.telefone),
  comissao_percentual: Number(payload.comissao_percentual ?? 0),
  ativo: payload.ativo ?? true,
  observacao: normalizeNullableString(payload.observacao),
});

const buildVendedorUpdatePayload = (payload: Partial<VendedorPayload>): Record<string, any> => {
  const update: Record<string, any> = {};
  if (payload.nome !== undefined) update.nome = payload.nome;
  if (payload.email !== undefined) update.email = normalizeNullableString(payload.email);
  if (payload.telefone !== undefined) update.telefone = normalizeNullableString(payload.telefone);
  if (payload.comissao_percentual !== undefined) {
    update.comissao_percentual = Number(payload.comissao_percentual ?? 0);
  }
  if (payload.ativo !== undefined) update.ativo = Boolean(payload.ativo);
  if (payload.observacao !== undefined) update.observacao = normalizeNullableString(payload.observacao);
  return sanitizePayload(update);
};

const mapFormaEnvioFromApi = (forma: FormaEnvioApi): FormaEnvioEntity => ({
  id: forma.id,
  nome: forma.nome,
  valor: Number(forma.valor ?? 0),
  prazo_dias: Number(forma.prazo_dias ?? 0),
  ativo: Boolean(forma.ativo),
  observacao: forma.observacao ?? undefined,
});

const buildFormaEnvioCreatePayload = (payload: FormaEnvioPayload): FormaEnvioPayload => ({
  nome: payload.nome,
  valor: payload.valor ?? 0,
  prazo_dias: Number(payload.prazo_dias ?? 0),
  ativo: payload.ativo ?? true,
  observacao: normalizeNullableString(payload.observacao),
});

const buildFormaEnvioUpdatePayload = (payload: Partial<FormaEnvioPayload>): Record<string, any> => {
  const update: Record<string, any> = {};
  if (payload.nome !== undefined) update.nome = payload.nome;
  if (payload.valor !== undefined) update.valor = payload.valor ?? 0;
  if (payload.prazo_dias !== undefined) update.prazo_dias = Number(payload.prazo_dias ?? 0);
  if (payload.ativo !== undefined) update.ativo = Boolean(payload.ativo);
  if (payload.observacao !== undefined) update.observacao = normalizeNullableString(payload.observacao);
  return sanitizePayload(update);
};

const mapFormaPagamentoFromApi = (forma: FormaPagamentoApi): FormaPagamentoEntity => ({
  id: forma.id,
  nome: forma.nome,
  parcelas_max: Number(forma.parcelas_max ?? 1),
  taxa_percentual: Number(forma.taxa_percentual ?? 0),
  ativo: Boolean(forma.ativo),
  observacao: forma.observacao ?? undefined,
});

const buildFormaPagamentoCreatePayload = (payload: FormaPagamentoPayload): FormaPagamentoPayload => ({
  nome: payload.nome,
  parcelas_max: Number(payload.parcelas_max ?? 1),
  taxa_percentual: Number(payload.taxa_percentual ?? 0),
  ativo: payload.ativo ?? true,
  observacao: normalizeNullableString(payload.observacao),
});

const buildFormaPagamentoUpdatePayload = (payload: Partial<FormaPagamentoPayload>): Record<string, any> => {
  const update: Record<string, any> = {};
  if (payload.nome !== undefined) update.nome = payload.nome;
  if (payload.parcelas_max !== undefined) update.parcelas_max = Number(payload.parcelas_max ?? 1);
  if (payload.taxa_percentual !== undefined) update.taxa_percentual = Number(payload.taxa_percentual ?? 0);
  if (payload.ativo !== undefined) update.ativo = Boolean(payload.ativo);
  if (payload.observacao !== undefined) update.observacao = normalizeNullableString(payload.observacao);
  return sanitizePayload(update);
};

const mapUserFromApi = (user: UserApi): UserEntity => ({
  id: user.id,
  username: user.username,
  is_admin: Boolean(user.is_admin),
  is_active: Boolean(user.is_active),
  created_at: user.created_at ?? undefined,
});

const buildUserCreatePayload = (payload: UserCreatePayload): Record<string, any> =>
  sanitizePayload({
    username: payload.username,
    password: payload.password,
    is_admin: payload.is_admin ?? false,
    is_active: payload.is_active ?? true,
  });

const buildUserUpdatePayload = (payload: UserUpdatePayload): Record<string, any> => {
  const update: Record<string, any> = {};
  if (payload.username !== undefined) update.username = payload.username;
  if (payload.password) update.password = payload.password;
  if (payload.is_admin !== undefined) update.is_admin = payload.is_admin;
  if (payload.is_active !== undefined) update.is_active = payload.is_active;
  return sanitizePayload(update);
};

const mapTipoProducaoFromApi = (tipo: TipoProducaoApi): TipoProducaoEntity => ({
  id: tipo.id,
  name: tipo.name,
  description: tipo.description ?? undefined,
  active: Boolean(tipo.active),
  created_at: tipo.created_at ?? undefined,
});

const buildTipoProducaoCreatePayload = (payload: TipoProducaoPayload): TipoProducaoPayload => ({
  name: payload.name,
  description: normalizeNullableString(payload.description),
  active: payload.active ?? true,
});

const buildTipoProducaoUpdatePayload = (payload: Partial<TipoProducaoPayload>): Record<string, any> => {
  const update: Record<string, any> = {};
  if (payload.name !== undefined) update.name = payload.name;
  if (payload.description !== undefined) update.description = normalizeNullableString(payload.description);
  if (payload.active !== undefined) update.active = Boolean(payload.active);
  return sanitizePayload(update);
};

const fetchOrdersRaw = async (): Promise<ApiPedido[]> => {
  requireSessionToken();
  const response = await apiClient.get<ApiPedido[]>('/pedidos/');
  return response.data ?? [];
};

/**
 * Busca pedidos com paginação do backend (usa skip/limit)
 * Para calcular o total, faz uma chamada adicional sem limit
 */
const fetchOrdersPaginated = async (
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  status?: OrderStatus,
  cliente?: string,
  data_inicio?: string,
  data_fim?: string
): Promise<PaginatedOrders> => {
  requireSessionToken();
  
  const skip = (page - 1) * pageSize;
  const limit = pageSize;
  
  // Construir query params
  const params: Record<string, any> = {
    skip,
    limit,
  };
  
  // Log para debug
  console.log('[fetchOrdersPaginated] 📡 Parâmetros da requisição:', { page, pageSize, skip, limit, params });
  console.log('[fetchOrdersPaginated] 📡 URL da requisição:', `/pedidos/`, 'Params:', JSON.stringify(params));
  
  if (status) {
    // Converter OrderStatus para formato da API
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.Pendente]: 'pendente',
      [OrderStatus.EmProcessamento]: 'em_producao',
      [OrderStatus.Concluido]: 'pronto',
      [OrderStatus.Cancelado]: 'cancelado',
    };
    params.status = statusMap[status] || status;
  }
  
  if (cliente) {
    params.cliente = cliente;
  }
  
  if (data_inicio) {
    params.data_inicio = data_inicio;
  }
  
  if (data_fim) {
    params.data_fim = data_fim;
  }
  
  // Buscar pedidos paginados
  const response = await apiClient.get<ApiPedido[]>('/pedidos/', { params });
  const paginatedData = (response.data ?? []).map(mapPedidoFromApi);
  
  // Para calcular o total de forma eficiente:
  // - Se retornou menos que pageSize, sabemos que é a última página
  // - Se retornou exatamente pageSize, fazer uma chamada adicional apenas na primeira página
  //   para contar o total (e cachear se possível)
  let total = paginatedData.length;
  let totalPages = 1;
  
  if (paginatedData.length < pageSize) {
    // Última página: calcular total exato
    total = skip + paginatedData.length;
    totalPages = Math.ceil(total / pageSize);
  } else if (page === 1) {
    // Primeira página: fazer chamada adicional para contar total
    // Usar limit alto para obter todos e contar (otimização futura: endpoint de contagem)
    const countParams = { ...params };
    delete countParams.skip;
    delete countParams.limit;
    countParams.limit = 10000; // Limite alto para contar (otimização futura: endpoint COUNT)
    
    try {
      const countResponse = await apiClient.get<ApiPedido[]>('/pedidos/', { params: countParams });
      total = (countResponse.data ?? []).length;
      totalPages = Math.ceil(total / pageSize);
    } catch (error) {
      // Se falhar, estimar conservadoramente
      logger.warn('Erro ao contar total de pedidos, usando estimativa:', error);
      total = paginatedData.length + pageSize; // Estimativa conservadora
      totalPages = Math.ceil(total / pageSize);
    }
  } else {
    // Páginas seguintes: estimar baseado na página atual
    // (o total já foi calculado na primeira página)
    total = skip + paginatedData.length + pageSize; // Estimativa conservadora
    totalPages = Math.ceil(total / pageSize);
  }
  
  return {
    orders: paginatedData,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
};

const fetchOrderById = async (orderId: number): Promise<OrderWithItems> => {
  requireSessionToken();
  
  // Cache por 10 segundos para pedidos individuais
  const cached = ordersByIdCache.get(orderId);
  if (cached && isCacheFresh(cached, ORDER_BY_ID_CACHE_TTL_MS)) {
    logger.debug(`[fetchOrderById] ✅ Retornando do cache: ${orderId}`);
    return cached.data;
  }
  
  logger.debug(`[fetchOrderById] 🔍 Buscando pedido ${orderId}...`);
  
  try {
    // PRIMEIRO: Tentar buscar do JSON salvo pela API (mais completo)
    logger.debug(`[fetchOrderById] 📄 Tentando buscar do JSON: /pedidos/${orderId}/json`);
    const jsonResponse = await apiClient.get(`/pedidos/${orderId}/json`);
    const jsonOrder = jsonResponse.data;
    
    logger.debug(`[fetchOrderById] ✅ JSON encontrado!`, {
      orderId,
      source: 'JSON_FILE',
      hasItems: !!jsonOrder.items,
      itemsCount: jsonOrder.items?.length || 0,
      firstItem: jsonOrder.items?.[0] ? {
        id: jsonOrder.items[0].id,
        item_name: jsonOrder.items[0].item_name,
        tipo_producao: jsonOrder.items[0].tipo_producao,
        overloque: jsonOrder.items[0].overloque,
        elastico: jsonOrder.items[0].elastico,
        emenda: jsonOrder.items[0].emenda,
        emenda_qtd: jsonOrder.items[0].emenda_qtd,
        imagem: jsonOrder.items[0].imagem
      } : null
    });
    
    // Normalizar caminhos de imagem para URLs absolutas se necessário
    // IMPORTANTE: Não normalizar aqui - deixar o imageLoader fazer a normalização
    // Isso evita duplicação de caminhos e problemas com blob URLs
    // O imageLoader já trata caminhos relativos corretamente via /pedidos/media/{file_path}
    
    // Converter o JSON para OrderWithItems
    const mappedOrder = mapPedidoFromApi(jsonOrder);
    
    logger.debug(`[fetchOrderById] 🔄 Dados mapeados (OrderWithItems):`, {
      orderId: mappedOrder.id,
      numero: mappedOrder.numero,
      itemsCount: mappedOrder.items?.length || 0,
      firstItemMapped: mappedOrder.items?.[0] ? {
        id: mappedOrder.items[0].id,
        item_name: mappedOrder.items[0].item_name,
        tipo_producao: mappedOrder.items[0].tipo_producao,
        overloque: mappedOrder.items[0].overloque,
        elastico: mappedOrder.items[0].elastico,
        emenda: mappedOrder.items[0].emenda,
        emenda_qtd: mappedOrder.items[0].emenda_qtd,
        imagem: mappedOrder.items[0].imagem
      } : null
    });
    
    // Cachear resultado por 10 segundos
    ordersByIdCache.set(orderId, createCacheEntry(mappedOrder));
    return mappedOrder;
  } catch (error) {
    // FALLBACK: Se não houver JSON, buscar da API normal
    logger.warn(`[fetchOrderById] ⚠️ JSON não encontrado para pedido ${orderId}, usando API normal:`, error);
    logger.debug(`[fetchOrderById] 📡 Buscando da API: /pedidos/${orderId}`);
    
    const response = await apiClient.get<ApiPedido>(`/pedidos/${orderId}`);
    const mappedOrder = mapPedidoFromApi(response.data);
    
    logger.debug(`[fetchOrderById] ✅ Dados da API normal:`, {
      orderId: mappedOrder.id,
      source: 'API_DATABASE',
      itemsCount: mappedOrder.items?.length || 0,
      firstItem: mappedOrder.items?.[0] ? {
        id: mappedOrder.items[0].id,
        item_name: mappedOrder.items[0].item_name,
        tipo_producao: mappedOrder.items[0].tipo_producao,
        overloque: mappedOrder.items[0].overloque,
        elastico: mappedOrder.items[0].elastico,
        emenda: mappedOrder.items[0].emenda,
        emenda_qtd: mappedOrder.items[0].emenda_qtd
      } : null
    });
    
    // Cachear resultado por 10 segundos
    ordersByIdCache.set(orderId, createCacheEntry(mappedOrder));
    return mappedOrder;
  }
};

const fetchOrders = async (): Promise<OrderWithItems[]> => {
  const data = await fetchOrdersRaw();
  return data.map(mapPedidoFromApi);
};

const fetchOrdersByStatus = async (status: ApiOrderStatus): Promise<OrderWithItems[]> => {
  requireSessionToken();
  
  // Cache para evitar requisições repetidas do mesmo status
  const cacheKey = `orders_${status}`;
  const cached = ordersByStatusCache.get(cacheKey);
  if (cached && isCacheFresh(cached, ORDERS_BY_STATUS_CACHE_TTL_MS)) {
    logger.debug(`[fetchOrdersByStatus] ✅ Retornando do cache: ${status}`);
    return cached.data;
  }
  
  logger.debug(`[fetchOrdersByStatus] 📡 Buscando do backend: ${status}`);
  const response = await apiClient.get<ApiPedido[]>(`/pedidos/status/${status}`);
  const data = Array.isArray(response.data) ? response.data : [];
  const result = data.map(mapPedidoFromApi);
  
  // Cachear resultado por 30 segundos
  ordersByStatusCache.set(cacheKey, createCacheEntry(result));
  return result;
};

const fetchDesignersRaw = async (): Promise<DesignerApi[]> => {
  requireSessionToken();
  if (isCacheFresh(designersCache)) {
    return designersCache.data;
  }
  const response = await apiClient.get<DesignerApi[]>(DESIGNERS_LIST_ENDPOINT);
  const data = response.data ?? [];
  designersCache = createCacheEntry(data);
  return data;
};

const fetchMateriaisRaw = async (): Promise<MaterialApi[]> => {
  requireSessionToken();
  if (isCacheFresh(materiaisCache)) {
    return materiaisCache.data;
  }
  const response = await apiClient.get<MaterialApi[]>(MATERIAIS_LIST_ENDPOINT);
  const data = response.data ?? [];
  materiaisCache = createCacheEntry(data);
  return data;
};

const paginateOrders = (orders: OrderWithItems[], page = 1, pageSize = DEFAULT_PAGE_SIZE): PaginatedOrders => {
  const total = orders.length;
  const safePageSize = pageSize <= 0 ? DEFAULT_PAGE_SIZE : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * safePageSize;
  const paginated = orders.slice(start, start + safePageSize);

  return {
    orders: paginated,
    total,
    page: currentPage,
    page_size: safePageSize,
    total_pages: totalPages,
  };
};

const isProductionComplete = (order: OrderWithItems): boolean => {
  return Boolean(
    order &&
      order.financeiro &&
      order.conferencia &&
      order.sublimacao &&
      order.costura &&
      order.expedicao
  );
};

const isPendingOrderByStages = (order: OrderWithItems): boolean => {
  if (!order) return false;
  if (order.status === OrderStatus.Pendente) {
    return true;
  }
  return !isProductionComplete(order);
};

const sortOrdersByUpdatedAtDesc = (orders: OrderWithItems[]): OrderWithItems[] => {
  return [...orders].sort((a, b) => {
    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    if (dateA === dateB) {
      return (b.id ?? 0) - (a.id ?? 0);
    }
    return dateB - dateA;
  });
};

const collectPendingOrders = async (): Promise<OrderWithItems[]> => {
  const [pending, inProduction] = await Promise.all([
    fetchOrdersByStatus('pendente'),
    fetchOrdersByStatus('em_producao'),
  ]);

  const unique = new Map<number, OrderWithItems>();
  [...pending, ...inProduction].forEach((order) => {
    if (!isPendingOrderByStages(order)) {
      return;
    }
    unique.set(order.id, order);
  });

  return sortOrdersByUpdatedAtDesc(Array.from(unique.values()));
};

const collectReadyOrders = async (): Promise<OrderWithItems[]> => {
  const ready = await fetchOrdersByStatus('pronto');
  const delivered = await fetchOrdersByStatus('entregue');
  const combined = [...ready, ...delivered].sort((a, b) => {
    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return dateB - dateA;
  });
  return combined;
};

const buildItemPayloadFromRequest = (item: any): Record<string, any> => {
  const tipo = inferTipoProducao(item);
  const canon = canonicalizeFromItemRequest(item as CreateOrderItemRequest);

  // Campos comuns a qualquer tipo (base)
  const payload: Record<string, any> = {
    tipo_producao: tipo,
    descricao: safeString(canon.descricao ?? 'Item'),
    largura: canon.largura ?? '',
    altura: canon.altura ?? '',
    metro_quadrado: canon.metro_quadrado ?? '',
    vendedor: canon.vendedor ?? '',
    designer: canon.designer ?? '',
    tecido: canon.tecido ?? '',
    // acabamento (overloque/elástico/ilhós) deve ser coerente com o tipo
    acabamento: buildAcabamento(canon),
    emenda: canon.emenda ?? 'sem-emenda',
    emenda_qtd: canon.emenda_qtd ?? undefined,
    observacao: canon.observacao ?? '',
    // valor_unitario é a base para itens genéricos e também é usado em Totem
    valor_unitario: toCurrencyString(
      (canon.tipo_producao === 'totem' ? canon.valor_unitario : undefined) ??
        item?.valor_unitario ??
        item?.unit_price ??
        0
    ),
    imagem: canon.imagem ?? null,
    legenda_imagem: normalizeNullableString(canon.legenda_imagem ?? undefined),
    terceirizado: canon.terceirizado ?? false,
    ziper: item?.ziper ?? false,
    cordinha_extra: item?.cordinha_extra ?? false,
    alcinha: item?.alcinha ?? false,
    toalha_pronta: item?.toalha_pronta ?? false,
    // Campos compartilhados de acabamento (ilhós/cordinha) — alguns tipos usam, outros ignoram
    quantidade_cordinha: item?.quantidade_cordinha ?? undefined,
    valor_cordinha: item?.valor_cordinha ?? undefined,
    espaco_cordinha: item?.espaco_cordinha ?? undefined,
    quantidade_ilhos: item?.quantidade_ilhos ?? item?.ilhos_qtd ?? undefined,
    valor_ilhos: item?.valor_ilhos ?? item?.ilhos_valor_unitario ?? undefined,
    espaco_ilhos: item?.espaco_ilhos ?? item?.ilhos_distancia ?? undefined,
  };

  // Campos específicos por tipo — agora cobrindo Painel/Totem/Lona/Adesivo
  if ((tipo === 'painel' || tipo === 'generica') && (canon.tipo_producao === 'painel' || canon.tipo_producao === 'generica')) {
    // CRÍTICO: o formulário (Painel) depende de tipo_acabamento para marcar Ilhós/Cordinha
    // Sem isso, ao reabrir para editar volta "nenhum" e o checkbox fica desmarcado.
    payload.tipo_acabamento = canon.tipo_acabamento ?? 'nenhum';
    payload.quantidade_paineis = canon.quantidade_paineis ?? (item?.quantity ? String(item.quantity) : undefined);
    payload.valor_painel = canon.valor_painel ? toCurrencyString(canon.valor_painel) : undefined;
    payload.valores_adicionais = canon.valores_adicionais ? toCurrencyString(canon.valores_adicionais) : undefined;
  } else if (tipo === 'totem' && canon.tipo_producao === 'totem') {
    payload.quantidade_totem = canon.quantidade_totem ?? undefined;
    payload.valor_totem = canon.valor_totem ? toCurrencyString(canon.valor_totem) : undefined;
    payload.outros_valores_totem = canon.outros_valores_totem ?? undefined;
    payload.acabamento_totem = canon.acabamento_totem ?? undefined;
    payload.acabamento_totem_outro = canon.acabamento_totem_outro ?? undefined;
  } else if (tipo === 'lona' && canon.tipo_producao === 'lona') {
    // Lona também usa tipo_acabamento + ilhós/cordinha
    payload.tipo_acabamento = canon.tipo_acabamento ?? 'nenhum';
    payload.acabamento_lona = canon.acabamento_lona ?? undefined;
    payload.quantidade_lona = canon.quantidade_lona ?? undefined;
    payload.valor_lona = canon.valor_lona ? toCurrencyString(canon.valor_lona) : undefined;
    payload.outros_valores_lona = canon.outros_valores_lona ? toCurrencyString(canon.outros_valores_lona) : undefined;
    payload.quantidade_ilhos = canon.quantidade_ilhos ?? undefined;
    payload.espaco_ilhos = canon.espaco_ilhos ?? undefined;
    payload.valor_ilhos = canon.valor_ilhos ?? undefined;
    payload.quantidade_cordinha = canon.quantidade_cordinha ?? undefined;
    payload.espaco_cordinha = canon.espaco_cordinha ?? undefined;
    payload.valor_cordinha = canon.valor_cordinha ?? undefined;
  } else if (tipo === 'adesivo' && canon.tipo_producao === 'adesivo') {
    payload.tipo_adesivo = canon.tipo_adesivo ?? undefined;
    payload.quantidade_adesivo = canon.quantidade_adesivo ?? undefined;
    payload.valor_adesivo = canon.valor_adesivo ? toCurrencyString(canon.valor_adesivo) : undefined;
    payload.outros_valores_adesivo = canon.outros_valores_adesivo
      ? toCurrencyString(canon.outros_valores_adesivo)
      : undefined;
  } else if (tipo === 'canga' && canon.tipo_producao === 'canga') {
    payload.baininha = canon.baininha ?? false;
    payload.quantidade_canga = canon.quantidade_canga ?? undefined;
    payload.valor_canga = canon.valor_canga ? toCurrencyString(canon.valor_canga) : undefined;
    payload.valores_adicionais = canon.valores_adicionais ? toCurrencyString(canon.valores_adicionais) : undefined;
  } else if (tipo === 'impressao_3d' && canon.tipo_producao === 'impressao_3d') {
    payload.material_gasto = canon.material_gasto ?? undefined;
    payload.quantidade_impressao_3d = canon.quantidade_impressao_3d ?? undefined;
    payload.valor_impressao_3d = canon.valor_impressao_3d ? toCurrencyString(canon.valor_impressao_3d) : undefined;
    payload.valores_adicionais = canon.valores_adicionais ? toCurrencyString(canon.valores_adicionais) : undefined;
  } else {
    // Outros tipos mantêm os campos existentes (serão refatorados depois)
    payload.quantidade_paineis = item?.quantidade_paineis ?? (item?.quantity ? String(item.quantity) : undefined);
    payload.valor_painel = item?.valor_painel ? toCurrencyString(item.valor_painel) : undefined;
    payload.valores_adicionais = item?.valores_adicionais ? toCurrencyString(item.valores_adicionais) : undefined;
    payload.quantidade_totem = item?.quantidade_totem ?? undefined;
    payload.quantidade_lona = item?.quantidade_lona ?? undefined;
    payload.quantidade_adesivo = item?.quantidade_adesivo ?? undefined;
    payload.valor_totem = item?.valor_totem ? toCurrencyString(item.valor_totem) : undefined;
    payload.valor_lona = item?.valor_lona ? toCurrencyString(item.valor_lona) : undefined;
    payload.valor_adesivo = item?.valor_adesivo ? toCurrencyString(item.valor_adesivo) : undefined;
    payload.outros_valores_totem = item?.outros_valores_totem ?? undefined;
    payload.outros_valores_lona = item?.outros_valores_lona ?? undefined;
    payload.outros_valores_adesivo = item?.outros_valores_adesivo ?? undefined;
    payload.acabamento_lona = item?.acabamento_lona ?? undefined;
    payload.acabamento_totem = item?.acabamento_totem ?? undefined;
    payload.acabamento_totem_outro = item?.acabamento_totem_outro ?? undefined;
    payload.tipo_adesivo = item?.tipo_adesivo ?? undefined;
  }

  const identifier = item?.orderItemId ?? item?.id;
  if (identifier) {
    payload.id = identifier;
  }

  return sanitizePayload(payload);
};

const computeTotalsFromItems = (items: any[], frete: number): { valorItens: number; valorTotal: number } => {
  const valorItens = items.reduce((sum, item) => {
    const qty = deriveQuantity(item);
    const unitPrice = deriveUnitPrice(item);
    return sum + qty * unitPrice;
  }, 0);
  const valorTotal = valorItens + frete;
  return { valorItens, valorTotal };
};

const buildPedidoCreatePayload = (request: CreateOrderRequest): Record<string, any> => {
  const freteNumber = parseDecimal(request.valor_frete ?? 0);
  const { valorItens, valorTotal } = computeTotalsFromItems(request.items ?? [], freteNumber);
  const itemsPayload = (request.items ?? []).map((item) => buildItemPayloadFromRequest(item));

  const payload: Record<string, any> = {
    numero: request.numero ?? undefined,
    cliente: request.cliente ?? request.customer_name ?? '',
    telefone_cliente: request.telefone_cliente ?? '',
    cidade_cliente: request.cidade_cliente ?? '',
    estado_cliente: request.estado_cliente ?? '',
    data_entrada: request.data_entrada ?? new Date().toISOString().split('T')[0],
    data_entrega: request.data_entrega ?? null,
    observacao: request.observacao ?? '',
    prioridade: normalizePriority(request.prioridade ?? null),
    status: mapStatusToApi(request.status),
    valor_frete: toCurrencyString(freteNumber),
    valor_itens: toCurrencyString(valorItens),
    valor_total: toCurrencyString(valorTotal),
    tipo_pagamento: request.forma_pagamento_id ? String(request.forma_pagamento_id) : '',
    forma_envio: request.forma_envio ?? '',
    forma_envio_id: parseNumericId(request.forma_envio) ?? 0,
    items: itemsPayload,
    financeiro: false,
    conferencia: false,
    sublimacao: false,
    costura: false,
    expedicao: false,
  };

  return sanitizePayload(payload);
};

const buildPedidoUpdatePayload = (request: UpdateOrderRequest): Record<string, any> => {
  const payload: Record<string, any> = {};

  if (request.customer_name || request.cliente) {
    payload.cliente = request.cliente ?? request.customer_name;
  }
  if (request.address) {
    payload.cidade_cliente = request.address;
  }
  if (request.cidade_cliente) {
    payload.cidade_cliente = request.cidade_cliente;
  }
  if (request.estado_cliente) {
    payload.estado_cliente = request.estado_cliente;
  }
  if (request.telefone_cliente) {
    payload.telefone_cliente = request.telefone_cliente;
  }
  if (request.status) {
    payload.status = mapStatusToApi(request.status);
  }
  if (request.prioridade) {
    payload.prioridade = normalizePriority(request.prioridade);
  }
  if (request.forma_envio) {
    payload.forma_envio = request.forma_envio;
    const parsed = parseNumericId(request.forma_envio);
    if (parsed !== null) {
      payload.forma_envio_id = parsed;
    }
  }
  if (request.forma_pagamento_id !== undefined) {
    payload.forma_pagamento_id = request.forma_pagamento_id;
    payload.tipo_pagamento = request.forma_pagamento_id ? String(request.forma_pagamento_id) : '';
  }
  if (request.observacao !== undefined) {
    payload.observacao = request.observacao ?? '';
  }

  if (Array.isArray(request.items)) {
    payload.items = request.items.map((item) => buildItemPayloadFromRequest(item));
  }

  if (request.valor_frete !== undefined) {
    payload.valor_frete = toCurrencyString(request.valor_frete);
  }

  if (Array.isArray(request.items) || request.valor_frete !== undefined) {
    const frete = parseDecimal(payload.valor_frete ?? request.valor_frete ?? 0);
    const { valorItens, valorTotal } = computeTotalsFromItems(request.items ?? [], frete);
    payload.valor_itens = toCurrencyString(valorItens);
    payload.valor_total = toCurrencyString(valorTotal);
  }

  // Garantir que campo financeiro nunca seja enviado neste payload (não é tela financeira)
  delete payload.financeiro;

  return sanitizePayload(payload);
};

const buildMetadataPayload = (request: UpdateOrderMetadataRequest): Record<string, any> => {
  const payload: Record<string, any> = {};
  (
    [
      'cliente',
      'cidade_cliente',
      'estado_cliente',
      'telefone_cliente',
      'prioridade',
      'forma_envio',
      'observacao',
    ] as Array<keyof UpdateOrderMetadataRequest>
  ).forEach((key) => {
    if (request[key] !== undefined) {
      payload[key] = request[key];
    }
  });

  if (request.data_entrega !== undefined) {
    payload.data_entrega = request.data_entrega ?? null;
  }
  if (request.forma_pagamento_id !== undefined) {
    payload.forma_pagamento_id = request.forma_pagamento_id;
    payload.tipo_pagamento = request.forma_pagamento_id ? String(request.forma_pagamento_id) : '';
  }
  if (request.valor_frete !== undefined) {
    payload.valor_frete = toCurrencyString(request.valor_frete);
  }

  // Garantir que campo financeiro nunca seja enviado neste payload (não é tela financeira)
  delete payload.financeiro;

  return sanitizePayload(payload);
};

const buildStatusPayload = (request: UpdateOrderStatusRequest): Record<string, any> => {
  const payload: Record<string, any> = {
    conferencia: request.conferencia,
    sublimacao: request.sublimacao,
    costura: request.costura,
    expedicao: request.expedicao,
    sublimacao_maquina: request.sublimacao_maquina,
    sublimacao_data_impressao: request.sublimacao_data_impressao,
  };

  // CRÍTICO: Incluir financeiro APENAS se está sendo explicitamente alterado
  // Verificar se há um flag indicando que financeiro está sendo atualizado
  // Se não houver flag ou se for false, não incluir financeiro no payload
  // Isso evita erro 403 quando usuários comuns atualizam expedição, produção, etc.
  const isFinanceiroUpdate = (request as any)._isFinanceiroUpdate === true;
  if (isFinanceiroUpdate && request.financeiro !== undefined) {
    payload.financeiro = request.financeiro;
  }
  // Remover flag interno antes de enviar
  delete payload._isFinanceiroUpdate;

  if (request.status) {
    payload.status = mapStatusToApi(request.status);
  }
  if (request.pronto !== undefined) {
    payload.pronto = request.pronto;
  }

  return sanitizePayload(payload);
};

const buildBulkImportError = (index: number, item: BulkClienteImportItem, error: unknown): BulkClienteImportError => {
  const message =
    error instanceof AxiosError
      ? error.response?.data?.detail ?? error.message
      : error instanceof Error
        ? error.message
        : 'Falha desconhecida ao importar cliente';

  return {
    index,
    nome: item.nome,
    message,
  };
};

const createClienteRequest = async (payload: CreateClienteRequest): Promise<Cliente> => {
  requireSessionToken();
  const response = await apiClient.post<Cliente>('/clientes/', payload);
  return response.data;
};

const updateClienteRequest = async (payload: UpdateClienteRequest): Promise<Cliente> => {
  requireSessionToken();
  const response = await apiClient.patch<Cliente>(`/clientes/${payload.id}`, payload);
  return response.data;
};

export { setHttpApiUrl as setApiUrl, getConfiguredApiUrl as getApiUrl };

export async function getFichas(): Promise<any> {
  requireSessionToken();
  const response = await apiClient.get('/pedidos/');
  return response.data;
}

const fetchFichaTemplates = async (): Promise<FichaTemplatesConfig> => {
  requireSessionToken();
  const response = await apiClient.get<FichaTemplatesConfig>('/fichas/templates');
  return response.data;
};

const saveFichaTemplatesRequest = async (
  payload: FichaTemplatesConfig
): Promise<FichaTemplatesConfig> => {
  requireSessionToken();
  const response = await apiClient.put<FichaTemplatesConfig>('/fichas/templates', payload);
  return response.data;
};

const saveFichaTemplatesHTMLRequest = async (
  htmlContent: { geral: string; resumo: string }
): Promise<{ message: string; files: { geral?: string; resumo?: string } }> => {
  requireSessionToken();
  const response = await apiClient.put<{ message: string; files: { geral?: string; resumo?: string } }>(
    '/fichas/templates/html',
    htmlContent
  );
  return response.data;
};

const getFichaTemplateHTML = async (templateType: 'geral' | 'resumo'): Promise<{ html: string | null; exists: boolean }> => {
  requireSessionToken();
  try {
    const response = await apiClient.get<{ html: string | null; exists: boolean }>(
      `/fichas/templates/html/${templateType}/content`
    );
    return response.data;
  } catch (error) {
    const axiosError = error as { response?: { status?: number } };
    // Se não existir (404), retornar null (não é erro, apenas não há template editado)
    if (axiosError.response?.status === 404) {
      return { html: null, exists: false };
    }
    // Para outros erros, logar mas retornar null para usar fallback
      logger.warn('[api] Erro ao buscar template HTML editado:', error);
    return { html: null, exists: false };
  }
};

const fetchRelatorioTemplates = async (): Promise<RelatorioTemplatesConfig> => {
  requireSessionToken();
  const response = await apiClient.get<RelatorioTemplatesConfig>('/relatorios/templates');
  return response.data;
};

const saveRelatorioTemplatesRequest = async (
  payload: RelatorioTemplatesConfig
): Promise<RelatorioTemplatesConfig> => {
  requireSessionToken();
  const response = await apiClient.put<RelatorioTemplatesConfig>('/relatorios/templates', payload);
  return response.data;
};

export const api = {
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', request);
    if (response.data.session_token) {
      setAuthToken(response.data.session_token);
    }
    return response.data;
  },

  getFichaTemplates: fetchFichaTemplates,

  saveFichaTemplates: saveFichaTemplatesRequest,

  saveFichaTemplatesHTML: saveFichaTemplatesHTMLRequest,

  getFichaTemplateHTML: getFichaTemplateHTML,

  getRelatorioTemplates: fetchRelatorioTemplates,

  saveRelatorioTemplates: saveRelatorioTemplatesRequest,

  logout: async (): Promise<void> => {
    try {
      requireSessionToken();
      await apiClient.post('/auth/logout');
    } finally {
      setAuthToken(null);
      useAuthStore.getState().logout();
    }
  },

  getOrders: async (): Promise<OrderWithItems[]> => {
    return await fetchOrders();
  },

  /**
   * Busca pedidos com paginação do backend (usa skip/limit)
   * Esta função deve ser usada quando productionStatusFilter === 'all' para evitar carregar todos os pedidos
   */
  getOrdersPaginated: async (
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE,
    status?: OrderStatus,
    cliente?: string,
    data_inicio?: string,
    data_fim?: string
  ): Promise<PaginatedOrders> => {
    return await fetchOrdersPaginated(page, pageSize, status, cliente, data_inicio, data_fim);
  },

  getPendingOrdersLight: async (): Promise<OrderWithItems[]> => {
    return collectPendingOrders();
  },

  getPendingOrdersPaginated: async (page?: number, pageSize?: number): Promise<PaginatedOrders> => {
    const orders = await collectPendingOrders();
    return paginateOrders(orders, page ?? 1, pageSize ?? DEFAULT_PAGE_SIZE);
  },

  getReadyOrdersPaginated: async (page?: number, pageSize?: number): Promise<PaginatedOrders> => {
    const orders = await collectReadyOrders();
    return paginateOrders(orders, page ?? 1, pageSize ?? DEFAULT_PAGE_SIZE);
  },

  getReadyOrdersLight: async (): Promise<OrderWithItems[]> => {
    return collectReadyOrders();
  },

  getOrderById: async (orderId: number): Promise<OrderWithItems> => {
    return fetchOrderById(orderId);
  },

  createOrder: async (request: CreateOrderRequest): Promise<OrderWithItems> => {
    requireSessionToken();
    const payload = buildPedidoCreatePayload(request);
    const response = await apiClient.post<ApiPedido>('/pedidos/', payload);
    const order = mapPedidoFromApi(response.data);
    
    // Salvar pedido em JSON na API após criação
    try {
      await apiClient.post(`/pedidos/save-json/${order.id}`, order);
      logger.debug(`[api.createOrder] ✅ JSON do pedido ${order.id} salvo na API`);
    } catch (error) {
      logger.warn('[api.createOrder] Erro ao salvar JSON do pedido na API:', error);
    }
    
    // Invalidar caches após criar novo pedido
    ordersByStatusCache.clear();
    
    // 📡 Broadcast via WebSocket para notificar outros clientes conectados
    try {
      ordersSocket.broadcastOrderCreated(order.id, order);
      logger.debug(`[api.createOrder] 📡 Broadcast enviado para pedido ${order.id}`);
    } catch (error) {
      logger.warn('[api.createOrder] Erro ao enviar broadcast WebSocket:', error);
    }
    
    return order;
  },

  updateOrder: async (request: UpdateOrderRequest): Promise<OrderWithItems> => {
    requireSessionToken();
    const payload = buildPedidoUpdatePayload(request);
    const response = await apiClient.patch<ApiPedido>(`/pedidos/${request.id}`, payload);
    const order = mapPedidoFromApi(response.data);
    
    // Salvar pedido em JSON na API após atualização
    try {
      await apiClient.post(`/pedidos/save-json/${order.id}`, order);
      logger.debug(`[api.updateOrder] ✅ JSON do pedido ${order.id} salvo na API`);
    } catch (error) {
      logger.warn('[api.updateOrder] Erro ao salvar JSON do pedido na API:', error);
    }
    
    // 📡 Broadcast via WebSocket para notificar outros clientes conectados
    try {
      ordersSocket.broadcastOrderUpdate(order.id, order);
      logger.debug(`[api.updateOrder] 📡 Broadcast enviado para pedido ${order.id}`);
    } catch (error) {
      logger.warn('[api.updateOrder] Erro ao enviar broadcast WebSocket:', error);
    }
    
    return order;
  },

  updateOrderMetadata: async (request: UpdateOrderMetadataRequest): Promise<OrderWithItems> => {
    requireSessionToken();
    const payload = buildMetadataPayload(request);
    const response = await apiClient.patch<ApiPedido>(`/pedidos/${request.id}`, payload);
    return mapPedidoFromApi(response.data);
  },

  updateOrderStatus: async (request: UpdateOrderStatusRequest): Promise<OrderWithItems> => {
    requireSessionToken();
    const payload = buildStatusPayload(request);
    
    // CRÍTICO: Remover campo financeiro do payload quando não está sendo explicitamente alterado
    // O problema: buildStatusUpdatePayload sempre inclui financeiro com o valor atual do pedido,
    // mesmo quando o usuário está apenas atualizando expedição, produção, etc.
    // Isso causa erro 403 para usuários comuns porque o backend detecta financeiro no payload.
    // 
    // Solução: Remover financeiro do payload ANTES de enviar, EXCETO quando sabemos que está sendo alterado.
    // Verificar se financeiro está sendo alterado através do flag _isFinanceiroUpdate
    const isFinanceiroUpdate = (request as any)._isFinanceiroUpdate === true;
    
    // Remover campos financeiros do payload apenas quando NÃO está sendo alterado
    // Isso garante que usuários comuns possam atualizar expedição, produção, etc. sem erro 403
    if (!isFinanceiroUpdate) {
      delete payload.financeiro;
      delete payload.financeiro_aprovado;
      delete payload.status_financeiro;
      delete payload.financeiroStatus;
    }
    
    // Debug: log do payload final antes de enviar
    if (import.meta.env.DEV) {
      logger.debug('📤 Payload de atualização de status:', {
        pedido_id: request.id,
        isFinanceiroUpdate,
        payload: { ...payload },
        temFinanceiro: 'financeiro' in payload,
      });
    }
    
    // Fazer PATCH para atualizar o status
    await apiClient.patch<ApiPedido>(`/pedidos/${request.id}`, payload);
    
    // 🔥 CORREÇÃO CRÍTICA: Após o PATCH, fazer um GET explícito para garantir que o estado está sincronizado
    // Isso resolve o problema onde o checkbox volta ao estado anterior após atualização
    // O backend pode retornar dados stale no response do PATCH, então sempre buscamos o pedido atualizado
    
    // Invalidar cache do pedido antes de buscar novamente
    clearOrderCache(request.id);
    // Também invalidar cache de status para garantir consistência
    ordersByStatusCache.clear();

    // IMPORTANTE: Não usar fetchOrderById aqui porque ele prioriza /pedidos/{id}/json,
    // que pode estar desatualizado/incompleto logo após um PATCH e causar "reset" dos checkboxes.
    // Buscar diretamente da API (fonte da verdade) e só depois salvar o JSON.
    const freshResponse = await apiClient.get<ApiPedido>(`/pedidos/${request.id}`);
    const updatedOrder = mapPedidoFromApi(freshResponse.data);
    
    // 🔥 CORREÇÃO: Salvar pedido em JSON na API após atualização de status
    // Isso garante que o arquivo JSON fique sincronizado com o banco de dados
    // Sem isso, fetchOrderById pode retornar dados antigos do JSON
    try {
      await apiClient.post(`/pedidos/save-json/${updatedOrder.id}`, updatedOrder);
      logger.debug(`[api.updateOrderStatus] ✅ JSON do pedido ${updatedOrder.id} salvo na API`);
    } catch (error) {
      logger.warn('[api.updateOrderStatus] Erro ao salvar JSON do pedido na API:', error);
    }
    
    // 📡 Broadcast via WebSocket para notificar outros clientes conectados
    // Isso garante que todos os clientes recebam a atualização em tempo real
    try {
      ordersSocket.broadcastOrderStatusUpdate(updatedOrder.id, updatedOrder);
      logger.debug(`[api.updateOrderStatus] 📡 Broadcast enviado para pedido ${updatedOrder.id}`);
    } catch (error) {
      // Não falhar a operação se o broadcast falhar
      logger.warn('[api.updateOrderStatus] Erro ao enviar broadcast WebSocket:', error);
    }
    
    return updatedOrder;
  },

  getOrdersByDeliveryDateRange: async (startDate: string, endDate?: string | null): Promise<OrderWithItems[]> => {
    const trimmedStart = (startDate ?? '').trim();
    if (!trimmedStart) {
      throw new Error('Informe a data inicial.');
    }

    const parseDate = (value: string, label: string): Date => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Data inválida (${label}). Use o formato YYYY-MM-DD.`);
      }
      return parsed;
    };

    const start = parseDate(trimmedStart, 'inicial');
    const end = (() => {
      const trimmedEnd = (endDate ?? '').trim();
      if (!trimmedEnd) {
        const clone = new Date(start);
        clone.setHours(23, 59, 59, 999);
        return clone;
      }
      const parsedEnd = parseDate(trimmedEnd, 'final');
      parsedEnd.setHours(23, 59, 59, 999);
      if (parsedEnd < start) {
        throw new Error('A data final não pode ser anterior à data inicial.');
      }
      return parsedEnd;
    })();

    // Otimizado: usar paginação do backend em vez de carregar todos os pedidos
    // Formatar datas para o formato esperado pela API
    const dateFromStr = trimmedStart;
    const dateToStr = (endDate ?? '').trim() || end.toISOString().split('T')[0];
    
    const allOrders: OrderWithItems[] = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 100; // Página grande para reduzir requisições
    
    // Limitar a 20 páginas (2000 pedidos) para evitar sobrecarga
    while (hasMore && page <= 20) {
      const result = await fetchOrdersPaginated(
        page,
        pageSize,
        undefined, // status
        undefined, // cliente
        dateFromStr,
        dateToStr
      );
      
      allOrders.push(...result.orders);
      
      // Se retornou menos que pageSize, é a última página
      hasMore = result.orders.length === pageSize && result.total > allOrders.length;
      page++;
    }

    // Aplicar filtro adicional no frontend para garantir que todas as datas estão corretas
    // (o backend pode não filtrar perfeitamente)
    const filtered = allOrders.filter((order) => {
      const reference = order.data_entrega ?? order.data_entrada ?? null;
      if (!reference) {
        return false;
      }
      const current = new Date(reference);
      if (Number.isNaN(current.getTime())) {
        return false;
      }
      return current >= start && current <= end;
    });

    return filtered.sort((a, b) => {
      const dateA = a.data_entrega ?? a.data_entrada ?? '';
      const dateB = b.data_entrega ?? b.data_entrada ?? '';
      if (dateA === dateB) {
        const formaA = (a.forma_envio ?? '').toLowerCase();
        const formaB = (b.forma_envio ?? '').toLowerCase();
        if (formaA === formaB) {
          const clienteA = (a.cliente ?? a.customer_name ?? '').toLowerCase();
          const clienteB = (b.cliente ?? b.customer_name ?? '').toLowerCase();
          return clienteA.localeCompare(clienteB, 'pt-BR');
        }
        return formaA.localeCompare(formaB, 'pt-BR');
      }
      return dateA.localeCompare(dateB);
    });
  },

  deleteOrder: async (orderId: number): Promise<boolean> => {
    requireSessionToken();
    await apiClient.delete(`/pedidos/${orderId}`);
    
    // Invalidar caches após deletar pedido
    clearOrderCache(orderId);
    ordersByStatusCache.clear();
    
    // 📡 Broadcast via WebSocket para notificar outros clientes conectados
    try {
      ordersSocket.broadcastOrderDeleted(orderId);
      logger.debug(`[api.deleteOrder] 📡 Broadcast enviado para pedido ${orderId}`);
    } catch (error) {
      logger.warn('[api.deleteOrder] Erro ao enviar broadcast WebSocket:', error);
    }
    
    return true;
  },

  deleteAllOrders: async (): Promise<boolean> => {
    requireSessionToken();
    await apiClient.delete('/pedidos/all');
    return true;
  },

  resetOrderIds: async (): Promise<boolean> => {
    requireSessionToken();
    await apiClient.post('/pedidos/reset-ids');
    return true;
  },

  getOrdersWithFilters: async (filters: OrderFilters): Promise<PaginatedOrders> => {
    // SEMPRE usar paginação do backend quando possível
    // Isso economiza MUITAS requisições ao não carregar todos os pedidos
    // Os filtros avançados (vendedor, designer, cidade) são aplicados no frontend
    // depois que os dados paginados chegam, então não precisamos verificar aqui
    
    // Usar paginação do backend - muito mais eficiente
    // Nota: filtros avançados serão aplicados no frontend após receber os dados
    return await fetchOrdersPaginated(
      filters.page ?? 1,
      filters.page_size ?? DEFAULT_PAGE_SIZE,
      filters.status,
      filters.customer_name ?? (filters as any).cliente,
      filters.date_from,
      filters.date_to
    );
    
    // Código antigo removido - agora sempre usa paginação do backend para melhor performance
  },

  getOrderHistory: async (orderId: number): Promise<OrderAuditLogEntry[]> => {
    void orderId;
    return [];
  },

  getOrderFicha: async (orderId: number): Promise<OrderFicha> => {
    requireSessionToken();
    return fetchOrderFicha('', orderId);
  },

  getClientes: async (): Promise<Cliente[]> => {
    requireSessionToken();
    const response = await apiClient.get<Cliente[]>('/clientes/');
    return response.data ?? [];
  },

  getClienteById: async (clienteId: number): Promise<Cliente> => {
    requireSessionToken();
    const response = await apiClient.get<Cliente>(`/clientes/${clienteId}`);
    return response.data;
  },

  createCliente: async (request: CreateClienteRequest): Promise<Cliente> => {
    return createClienteRequest(request);
  },

  updateCliente: async (request: UpdateClienteRequest): Promise<Cliente> => {
    return updateClienteRequest(request);
  },

  deleteCliente: async (clienteId: number): Promise<boolean> => {
    requireSessionToken();
    await apiClient.delete(`/clientes/${clienteId}`);
    return true;
  },

  importClientesBulk: async (clientes: BulkClienteImportItem[]): Promise<BulkClienteImportResult> => {
    const imported: Cliente[] = [];
    const errors: BulkClienteImportError[] = [];

    for (let index = 0; index < clientes.length; index += 1) {
      const item = clientes[index];
      try {
        const created = await createClienteRequest({
          nome: item.nome,
          cep: item.cep ?? undefined,
          cidade: item.cidade ?? undefined,
          estado: item.estado ?? undefined,
          telefone: item.telefone ?? undefined,
        });
        imported.push(created);
      } catch (error) {
        errors.push(buildBulkImportError(index, item, error));
      }
    }

    return { imported, errors };
  },

  getVendedoresAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
    requireSessionToken();
    
    // Cache para evitar requisições repetidas
    if (isCacheFresh(vendedoresCache)) {
      logger.debug(`[getVendedoresAtivos] ✅ Retornando do cache`);
      return vendedoresCache.data;
    }
    
    logger.debug(`[getVendedoresAtivos] 📡 Buscando do backend`);
    const response = await apiClient.get<VendedorApi[]>('/vendedores/ativos');
    const result = (response.data ?? [])
      .filter((vendedor) => Boolean(vendedor?.nome))
      .map((vendedor) => ({ id: vendedor.id, nome: vendedor.nome.trim() }))
      .filter((vendedor) => vendedor.nome.length > 0);
    
    // Cachear resultado por 60 segundos (vendedores mudam pouco)
    vendedoresCache = createCacheEntry(result);
    return result;
  },

  getDesignersAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
    const designers = await fetchDesignersRaw();
    const unique = new Map<string, DesignerApi>();
    designers.forEach((designer) => {
      if (!designer?.ativo) {
        return;
      }
      const nome = designer.nome?.trim();
      if (!nome) {
        return;
      }
      const key = nome.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, designer);
      }
    });
    return Array.from(unique.values())
      .map((designer) => ({ id: designer.id, nome: designer.nome.trim() }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  getTecidosAtivos: async (): Promise<string[]> => {
    return api.getMateriaisAtivosPorTipo('tecido');
  },

  getMateriaisAtivosPorTipo: async (tipo: string): Promise<string[]> => {
    const normalizedTipo = String(tipo ?? '')
      .trim()
      .toLowerCase();
    if (!normalizedTipo) {
      return [];
    }

    const materiais = await fetchMateriaisRaw();
    const unique = new Set<string>();

    materiais.forEach((material) => {
      if (!material?.ativo) {
        return;
      }
      const materialTipo = String(material.tipo ?? '')
        .trim()
        .toLowerCase();
      if (materialTipo !== normalizedTipo) {
        return;
      }
      const nome = String(material.nome ?? '').trim();
      if (!nome) {
        return;
      }
      unique.add(nome);
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  getFormasEnvioAtivas: async (): Promise<Array<{ id: number; nome: string; valor: number }>> => {
    requireSessionToken();
    const response = await apiClient.get<FormaEnvioApi[]>('/tipos-envios/ativos');
    return (response.data ?? [])
      .filter((forma) => Boolean(forma?.nome))
      .map((forma) => ({
        id: forma.id,
        nome: (forma.nome ?? '').trim(),
        valor: Number(forma.valor ?? 0),
      }))
      .filter((forma) => forma.nome.length > 0);
  },

  getFormasPagamentoAtivas: async (): Promise<Array<{ id: number; nome: string }>> => {
    requireSessionToken();
    
    // Cache para evitar requisições repetidas
    if (isCacheFresh(tiposPagamentoCache)) {
      logger.debug(`[getFormasPagamentoAtivas] ✅ Retornando do cache`);
      return tiposPagamentoCache.data;
    }
    
    logger.debug(`[getFormasPagamentoAtivas] 📡 Buscando do backend`);
    const response = await apiClient.get<FormaPagamentoApi[]>('/tipos-pagamentos/ativos');
    const result = (response.data ?? [])
      .filter((forma) => Boolean(forma?.nome))
      .map((forma) => ({ id: forma.id, nome: forma.nome }));
    
    // Cachear resultado por 60 segundos (tipos de pagamento mudam pouco)
    tiposPagamentoCache = createCacheEntry(result);
    return result;
  },

  generateReport: async (request: ReportRequestPayload): Promise<ReportResponse> => {
    // Otimizado: carregar pedidos em lotes usando paginação quando há filtros de data
    // Se não houver filtros, pode precisar de todos os pedidos para o relatório completo
    let orders: OrderWithItems[] = [];
    
    // Se há filtros de data, usar paginação para reduzir requisições
    if (request.start_date || request.end_date) {
      const allOrders: OrderWithItems[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100; // Página grande
      
      // Limitar a 30 páginas (3000 pedidos) para relatórios
      while (hasMore && page <= 30) {
        // Converter string para OrderStatus se for válido
        const statusFilter = request.status 
          ? (Object.values(OrderStatus).includes(request.status as OrderStatus) 
              ? (request.status as OrderStatus) 
              : undefined)
          : undefined;
        
        const result = await fetchOrdersPaginated(
          page,
          pageSize,
          statusFilter,
          request.cliente, // cliente
          request.start_date,
          request.end_date
        );
        
        allOrders.push(...result.orders);
        hasMore = result.orders.length === pageSize && result.total > allOrders.length;
        page++;
      }
      orders = allOrders;
    } else {
      // Sem filtros de data: precisa carregar todos para relatório completo
      // Mas ainda é melhor carregar em lotes do que tudo de uma vez
      const allOrders: OrderWithItems[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100;
      
      // Limitar a 50 páginas (5000 pedidos) para relatórios completos
      while (hasMore && page <= 50) {
        // Converter string para OrderStatus se for válido
        const statusFilter = request.status 
          ? (Object.values(OrderStatus).includes(request.status as OrderStatus) 
              ? (request.status as OrderStatus) 
              : undefined)
          : undefined;
        
        const result = await fetchOrdersPaginated(
          page,
          pageSize,
          statusFilter,
          request.cliente
        );
        
        allOrders.push(...result.orders);
        hasMore = result.orders.length === pageSize && result.total > allOrders.length;
        page++;
      }
      orders = allOrders;
    }
    
    return generateFechamentoReport(orders, request);
  },

  // Estatísticas de Fechamentos
  getFechamentoStatistics: async (params: {
    start_date?: string;
    end_date?: string;
    status?: string;
    date_mode?: string;
    vendedor?: string;
    designer?: string;
    cliente?: string;
  }): Promise<{
    total_pedidos: number;
    total_items: number;
    total_revenue: number;
    total_frete: number;
    total_servico: number;
    average_ticket: number;
  }> => {
    requireSessionToken();
    const response = await apiClient.get('/relatorios/fechamentos/statistics', { params });
    return response.data;
  },

  getFechamentoTrends: async (params: {
    start_date?: string;
    end_date?: string;
    status?: string;
    date_mode?: string;
    group_by?: 'day' | 'week' | 'month';
  }): Promise<{
    trends: Array<{
      period: string;
      pedidos: number;
      revenue: number;
      frete: number;
      servico: number;
    }>;
  }> => {
    requireSessionToken();
    const response = await apiClient.get('/relatorios/fechamentos/trends', { params });
    return response.data;
  },

  getFechamentoRankings: async (
    category: 'vendedor' | 'designer' | 'cliente' | 'tipo_producao',
    params: {
      start_date?: string;
      end_date?: string;
      status?: string;
      date_mode?: string;
      limit?: number;
    },
  ): Promise<{
    category: string;
    rankings: Array<{
      name: string;
      pedidos: number;
      items: number;
      revenue: number;
    }>;
  }> => {
    requireSessionToken();
    const response = await apiClient.get(`/relatorios/fechamentos/rankings/${category}`, { params });
    return response.data;
  },
};

export async function getMateriais(_sessionToken: string): Promise<MaterialEntity[]> {
  requireSessionToken();
  const response = await apiClient.get<MaterialApi[]>(MATERIAIS_LIST_ENDPOINT);
  return (response.data ?? []).map(mapMaterialFromApi);
}

export async function createMaterial(
  _sessionToken: string,
  request: MaterialPayload,
): Promise<MaterialEntity> {
  requireSessionToken();
  const payload = buildMaterialCreatePayload(request);
  const response = await apiClient.post<MaterialApi>(MATERIAIS_LIST_ENDPOINT, payload);
  const material = mapMaterialFromApi(response.data);
  clearMateriaisCache();
  return material;
}

export async function updateMaterial(
  _sessionToken: string,
  request: MaterialPayload & { id: number },
): Promise<MaterialEntity> {
  requireSessionToken();
  const { id, ...rest } = request;
  const payload = buildMaterialUpdatePayload(rest);
  const response = await apiClient.patch<MaterialApi>(`${MATERIAIS_ENDPOINT}/${id}`, payload);
  const material = mapMaterialFromApi(response.data);
  clearMateriaisCache();
  return material;
}

export async function deleteMaterial(_sessionToken: string, materialId: number): Promise<boolean> {
  requireSessionToken();
  await apiClient.delete(`${MATERIAIS_ENDPOINT}/${materialId}`);
  clearMateriaisCache();
  return true;
}

export async function getVendedores(_sessionToken: string): Promise<VendedorEntity[]> {
  requireSessionToken();
  const response = await apiClient.get<VendedorApi[]>('/vendedores');
  return (response.data ?? []).map(mapVendedorFromApi);
}

export async function createVendedor(
  _sessionToken: string,
  request: VendedorPayload,
): Promise<VendedorEntity> {
  requireSessionToken();
  const payload = buildVendedorCreatePayload(request);
  const response = await apiClient.post<VendedorApi>('/vendedores', payload);
  return mapVendedorFromApi(response.data);
}

export async function updateVendedor(
  _sessionToken: string,
  request: VendedorPayload & { id: number },
): Promise<VendedorEntity> {
  requireSessionToken();
  const { id, ...rest } = request;
  const payload = buildVendedorUpdatePayload(rest);
  const response = await apiClient.patch<VendedorApi>(`/vendedores/${id}`, payload);
  return mapVendedorFromApi(response.data);
}

export async function deleteVendedor(_sessionToken: string, vendedorId: number): Promise<boolean> {
  requireSessionToken();
  await apiClient.delete(`/vendedores/${vendedorId}`);
  return true;
}

export async function getDesigners(_sessionToken: string): Promise<DesignerEntity[]> {
  requireSessionToken();
  const response = await apiClient.get<DesignerApi[]>(DESIGNERS_LIST_ENDPOINT);
  return (response.data ?? []).map(mapDesignerFromApi);
}

export async function createDesigner(
  _sessionToken: string,
  request: DesignerPayload,
): Promise<DesignerEntity> {
  requireSessionToken();
  const payload = buildDesignerCreatePayload(request);
  const response = await apiClient.post<DesignerApi>(DESIGNERS_LIST_ENDPOINT, payload);
  const designer = mapDesignerFromApi(response.data);
  clearDesignersCache();
  return designer;
}

export async function updateDesigner(
  _sessionToken: string,
  request: DesignerPayload & { id: number },
): Promise<DesignerEntity> {
  requireSessionToken();
  const { id, ...rest } = request;
  const payload = buildDesignerUpdatePayload(rest);
  const response = await apiClient.patch<DesignerApi>(`${DESIGNERS_ENDPOINT}/${id}`, payload);
  const designer = mapDesignerFromApi(response.data);
  clearDesignersCache();
  return designer;
}

export async function deleteDesigner(_sessionToken: string, designerId: number): Promise<boolean> {
  requireSessionToken();
  await apiClient.delete(`${DESIGNERS_ENDPOINT}/${designerId}`);
  clearDesignersCache();
  return true;
}

export async function getFormasEnvio(_sessionToken: string): Promise<FormaEnvioEntity[]> {
  requireSessionToken();
  const response = await apiClient.get<FormaEnvioApi[]>('/tipos-envios');
  return (response.data ?? []).map(mapFormaEnvioFromApi);
}

export async function createFormaEnvio(
  _sessionToken: string,
  request: FormaEnvioPayload,
): Promise<FormaEnvioEntity> {
  requireSessionToken();
  const payload = buildFormaEnvioCreatePayload(request);
  const response = await apiClient.post<FormaEnvioApi>('/tipos-envios', payload);
  return mapFormaEnvioFromApi(response.data);
}

export async function updateFormaEnvio(
  _sessionToken: string,
  request: FormaEnvioPayload & { id: number },
): Promise<FormaEnvioEntity> {
  requireSessionToken();
  const { id, ...rest } = request;
  const payload = buildFormaEnvioUpdatePayload(rest);
  const response = await apiClient.patch<FormaEnvioApi>(`/tipos-envios/${id}`, payload);
  return mapFormaEnvioFromApi(response.data);
}

export async function deleteFormaEnvio(_sessionToken: string, formaId: number): Promise<boolean> {
  requireSessionToken();
  await apiClient.delete(`/tipos-envios/${formaId}`);
  return true;
}

export async function getFormasPagamento(_sessionToken: string): Promise<FormaPagamentoEntity[]> {
  requireSessionToken();
  const response = await apiClient.get<FormaPagamentoApi[]>('/tipos-pagamentos');
  return (response.data ?? []).map(mapFormaPagamentoFromApi);
}

export async function createFormaPagamento(
  _sessionToken: string,
  request: FormaPagamentoPayload,
): Promise<FormaPagamentoEntity> {
  requireSessionToken();
  const payload = buildFormaPagamentoCreatePayload(request);
  const response = await apiClient.post<FormaPagamentoApi>('/tipos-pagamentos', payload);
  return mapFormaPagamentoFromApi(response.data);
}

export async function updateFormaPagamento(
  _sessionToken: string,
  request: FormaPagamentoPayload & { id: number },
): Promise<FormaPagamentoEntity> {
  requireSessionToken();
  const { id, ...rest } = request;
  const payload = buildFormaPagamentoUpdatePayload(rest);
  const response = await apiClient.patch<FormaPagamentoApi>(`/tipos-pagamentos/${id}`, payload);
  return mapFormaPagamentoFromApi(response.data);
}

export async function deleteFormaPagamento(_sessionToken: string, formaId: number): Promise<boolean> {
  requireSessionToken();
  await apiClient.delete(`/tipos-pagamentos/${formaId}`);
  return true;
}

export async function getUsers(_sessionToken: string): Promise<UserEntity[]> {
  requireSessionToken();
  const response = await apiClient.get<UserApi[]>('/users');
  return (response.data ?? []).map(mapUserFromApi);
}

export async function createUser(
  _sessionToken: string,
  request: UserCreatePayload,
): Promise<UserEntity> {
  requireSessionToken();
  const payload = buildUserCreatePayload(request);
  const response = await apiClient.post<UserApi>('/users', payload);
  return mapUserFromApi(response.data);
}

export async function updateUser(
  _sessionToken: string,
  request: UserUpdatePayload & { id: number },
): Promise<UserEntity> {
  requireSessionToken();
  const { id, ...rest } = request;
  const payload = buildUserUpdatePayload(rest);
  const response = await apiClient.patch<UserApi>(`/users/${id}`, payload);
  return mapUserFromApi(response.data);
}

export async function deleteUser(_sessionToken: string, userId: number): Promise<boolean> {
  requireSessionToken();
  
  // Validar userId
  if (!userId || typeof userId !== 'number' || isNaN(userId) || userId <= 0) {
    throw new Error('ID do usuário inválido');
  }
  
  // Garantir que a URL seja construída corretamente
  const url = `/users/${encodeURIComponent(userId)}`;
  
  try {
    await apiClient.delete(url);
    return true;
  } catch (error: any) {
    logger.error('Erro ao excluir usuário:', error);
    
    // Re-lançar erro com mensagem mais clara
    if (error?.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    if (error?.message) {
      throw error;
    }
    throw new Error('Erro desconhecido ao excluir usuário');
  }
}

export async function getOrdersByDeliveryDate(
  _sessionToken: string,
  dateFrom: string,
  dateTo: string,
): Promise<OrderWithItems[]> {
  // Otimizado: usar paginação do backend em vez de carregar todos os pedidos
  const allOrders: OrderWithItems[] = [];
  let page = 1;
  let hasMore = true;
  const pageSize = 100;
  
  // Limitar a 20 páginas (2000 pedidos) para evitar sobrecarga
  while (hasMore && page <= 20) {
    const result = await fetchOrdersPaginated(
      page,
      pageSize,
      undefined, // status
      undefined, // cliente
      dateFrom,
      dateTo
    );
    
    allOrders.push(...result.orders);
    hasMore = result.orders.length === pageSize && result.total > allOrders.length;
    page++;
  }

  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;

  // Aplicar filtro adicional para garantir precisão
  return allOrders.filter((order) => {
    if (!order.data_entrega) {
      return false;
    }
    const deliveryDate = new Date(order.data_entrega);
    if (from && deliveryDate < from) {
      return false;
    }
    if (to && deliveryDate > to) {
      return false;
    }
    return true;
  });
}

async function fetchOrderFicha(_sessionToken: string, orderId: number): Promise<OrderFicha> {
  requireSessionToken();
  
  logger.debug(`[fetchOrderFicha] 🔍 Buscando ficha do pedido ${orderId}...`);
  
  try {
    // PRIMEIRO: Tentar buscar do JSON salvo pela API
    logger.debug(`[fetchOrderFicha] 📄 Tentando buscar do JSON: /pedidos/${orderId}/json`);
    const jsonResponse = await apiClient.get(`/pedidos/${orderId}/json`);
    const jsonOrder = jsonResponse.data;
    
    logger.debug(`[fetchOrderFicha] ✅ JSON encontrado!`, {
      orderId,
      source: 'JSON_FILE',
      hasItems: !!jsonOrder.items,
      itemsCount: jsonOrder.items?.length || 0
    });
    
    // Converter o JSON para OrderWithItems e depois para OrderFicha
    const order = mapPedidoFromApi(jsonOrder);
    const ficha = mapOrderToFicha(order);
    
    logger.debug(`[fetchOrderFicha] 🔄 Ficha mapeada:`, {
      orderId: ficha.id,
      itemsCount: ficha.items?.length || 0,
      firstItem: ficha.items?.[0] ? {
        id: ficha.items[0].id,
        item_name: ficha.items[0].item_name,
        tipo_producao: ficha.items[0].tipo_producao
      } : null
    });
    
    return ficha;
  } catch (error) {
    // FALLBACK: Se não houver JSON, buscar do banco normalmente
    logger.warn(`[fetchOrderFicha] ⚠️ JSON não encontrado para pedido ${orderId}, usando fallback:`, error);
    const order = await fetchOrderById(orderId);
    const ficha = mapOrderToFicha(order);
    
    logger.debug(`[fetchOrderFicha] ✅ Ficha do fallback:`, {
      orderId: ficha.id,
      source: 'API_DATABASE',
      itemsCount: ficha.items?.length || 0
    });
    
    return ficha;
  }
}

export async function getOrderFicha(_sessionToken: string, orderId: number): Promise<OrderFicha> {
  return fetchOrderFicha(_sessionToken, orderId);
}

// ==================== TIPOS DE PRODUÇÃO ====================

export async function getTiposProducao(_sessionToken: string): Promise<TipoProducaoEntity[]> {
  requireSessionToken();
  const response = await apiClient.get<TipoProducaoApi[]>('/producoes');
  return (response.data ?? []).map(mapTipoProducaoFromApi);
}

export async function getTiposProducaoAtivos(): Promise<Array<{ value: string; label: string }>> {
  try {
    const response = await apiClient.get<TipoProducaoApi[]>('/producoes/ativos');
    return (response.data ?? []).map(tipo => ({
      value: tipo.name.toLowerCase(),
      label: tipo.description || tipo.name,
    }));
  } catch (error) {
    logger.error('Erro ao buscar tipos de produção ativos:', error);
    return [];
  }
}

export async function createTipoProducao(
  _sessionToken: string,
  request: TipoProducaoPayload,
): Promise<TipoProducaoEntity> {
  requireSessionToken();
  const payload = buildTipoProducaoCreatePayload(request);
  const response = await apiClient.post<TipoProducaoApi>('/producoes', payload);
  return mapTipoProducaoFromApi(response.data);
}

export async function updateTipoProducao(
  _sessionToken: string,
  request: TipoProducaoPayload & { id: number },
): Promise<TipoProducaoEntity> {
  requireSessionToken();
  const { id, ...rest } = request;
  const payload = buildTipoProducaoUpdatePayload(rest);
  const response = await apiClient.patch<TipoProducaoApi>(`/producoes/${id}`, payload);
  return mapTipoProducaoFromApi(response.data);
}

export async function deleteTipoProducao(_sessionToken: string, tipoId: number): Promise<boolean> {
  requireSessionToken();
  await apiClient.delete(`/producoes/${tipoId}`);
  return true;
}
