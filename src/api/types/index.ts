
export type ApiOrderStatus = 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
export type ApiPriority = 'NORMAL' | 'ALTA';

export interface ApiAcabamento {
    overloque?: boolean;
    elastico?: boolean;
    ilhos?: boolean;
}

export interface ApiPedidoItem {
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
    composicao_tecidos?: string | null;
}

export interface ApiPedido {
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

export interface MaterialApi {
    id: number;
    nome: string;
    tipo: string;
    valor_metro: number;
    estoque_metros: number;
    ativo: boolean;
    observacao?: string | null;
}

export interface DesignerApi {
    id: number;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    ativo: boolean;
    observacao?: string | null;
}

export interface DesignerPayload {
    nome: string;
    email?: string | null;
    telefone?: string | null;
    ativo: boolean;
    observacao?: string | null;
}

export interface VendedorApi {
    id: number;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    comissao_percentual: number;
    ativo: boolean;
    observacao?: string | null;
}

export interface VendedorPayload {
    nome: string;
    email?: string | null;
    telefone?: string | null;
    comissao_percentual: number;
    ativo: boolean;
    observacao?: string | null;
}

export interface FormaEnvioApi {
    id: number;
    nome: string;
    valor?: number | null;
    prazo_dias: number;
    ativo: boolean;
    observacao?: string | null;
}

export interface FormaEnvioPayload {
    nome: string;
    valor?: number | null;
    prazo_dias: number;
    ativo: boolean;
    observacao?: string | null;
}

export interface FormaPagamentoApi {
    id: number;
    nome: string;
    parcelas_max: number;
    taxa_percentual: number;
    ativo: boolean;
    observacao?: string | null;
}

export interface FormaPagamentoPayload {
    nome: string;
    parcelas_max: number;
    taxa_percentual: number;
    ativo: boolean;
    observacao?: string | null;
}

export interface UserApi {
    id: number;
    username: string;
    is_admin: boolean;
    is_active: boolean;
    created_at?: string | null;
}

export interface UserCreatePayload {
    username: string;
    password: string;
    is_admin: boolean;
    is_active?: boolean;
}

export interface UserUpdatePayload {
    username?: string;
    password?: string;
    is_admin?: boolean;
    is_active?: boolean;
}

export interface TipoProducaoApi {
    id: number;
    name: string;
    description?: string | null;
    active: boolean;
    created_at?: string | null;
}

export interface TipoProducaoPayload {
    name: string;
    description?: string | null;
    active: boolean;
}

export interface MaterialPayload {
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

export type MaterialEntity = Omit<MaterialApi, 'observacao'> & {
    observacao?: string;
};

// Re-export domain types from src/types/index.ts
export { OrderStatus } from '../../types';
export type {
    OrderWithItems,
    OrderItem,
    OrderFicha,
    OrderItemFicha,
    CreateOrderRequest,
    CreateOrderItemRequest,
    UpdateOrderRequest,
    UpdateOrderItemRequest,
    UpdateOrderMetadataRequest,
    UpdateOrderStatusRequest,
    OrderFilters,
    PaginatedOrders,
    OrderAuditLogEntry,
    LoginRequest,
    LoginResponse,
    Cliente,
    CreateClienteRequest,
    UpdateClienteRequest,
    BulkClienteImportItem,
    BulkClienteImportResult,
    BulkClienteImportError,
    FichaTemplatesConfig,
    FichaTemplateConfig,
    RelatorioTemplatesConfig,
    RelatorioTemplateConfig,
    ReportRequestPayload,
    ReportResponse,
    ReportGroup,
    ReportRowData,
    ReportTotals,
} from '../../types';