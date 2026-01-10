export enum OrderStatus {
  Pendente = 'Pendente',
  EmProcessamento = 'Em Processamento',
  Concluido = 'Concluido',
  Cancelado = 'Cancelado',
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  
  // Campos detalhados do painel
  tipo_producao?: string;
  descricao?: string;
  largura?: string;
  altura?: string;
  metro_quadrado?: string;
  vendedor?: string;
  designer?: string;
  tecido?: string;
  overloque?: boolean;
  elastico?: boolean;
  tipo_acabamento?: string;
  quantidade_ilhos?: string;
  espaco_ilhos?: string;
  valor_ilhos?: string;
  quantidade_cordinha?: string;
  espaco_cordinha?: string;
  valor_cordinha?: string;
  observacao?: string;
  imagem?: string;
  legenda_imagem?: string;
  quantidade_paineis?: string;
  valor_painel?: string;
  valores_adicionais?: string;
  valor_unitario?: string;
  emenda?: string;
  emenda_qtd?: string;
  emendaQtd?: string;
  terceirizado?: boolean;
  acabamento_lona?: string;
  valor_lona?: string;
  quantidade_lona?: string;
  outros_valores_lona?: string;
  tipo_adesivo?: string;
  valor_adesivo?: string;
  quantidade_adesivo?: string;
  outros_valores_adesivo?: string;
  ziper?: boolean;
  cordinha_extra?: boolean;
  alcinha?: boolean;
  toalha_pronta?: boolean;
  acabamento_totem?: string;
  acabamento_totem_outro?: string;
  valor_totem?: string;
  quantidade_totem?: string;
  outros_valores_totem?: string;
  data_impressao?: string;
  rip_maquina?: string;
}

export interface OrderWithItems {
  id: number;
  numero?: string;
  customer_name: string;
  cliente?: string;
  address: string;
  cidade_cliente?: string;
  estado_cliente?: string;
  telefone_cliente?: string;
  data_entrada?: string;
  data_entrega?: string;
  total_value: number | string;
  valor_total?: number | string;
  valor_frete?: number | string;
  created_at?: string | null;
  updated_at?: string | null;
  status: OrderStatus;
  prioridade?: string;
  forma_envio?: string;
  forma_pagamento_id?: number;
  observacao?: string;
  
  // Status de produção (checkboxes)
  financeiro?: boolean;
  conferencia?: boolean;
  sublimacao?: boolean;
  costura?: boolean;
  expedicao?: boolean;
  pronto?: boolean;
  sublimacao_maquina?: string | null;
  sublimacao_data_impressao?: string | null;
  
  items: OrderItem[];
}

export interface CreateOrderRequest {
  cliente: string;
  customer_name?: string;
  address?: string;
  cidade_cliente: string;
  status: OrderStatus;
  items: CreateOrderItemRequest[];
  // Campos adicionais do formulário
  numero?: string;
  data_entrada: string; // Obrigatório
  data_entrega?: string;
  forma_envio?: string;
  forma_pagamento_id?: number;
  prioridade?: string;
  observacao?: string;
  telefone_cliente?: string;
  estado_cliente?: string;
  valor_frete?: number;
}

export interface CreateOrderItemRequest {
  item_name: string;
  quantity: number;
  unit_price: number;
  
  // Campos detalhados do painel
  tipo_producao?: string;
  descricao?: string;
  largura?: string;
  altura?: string;
  metro_quadrado?: string;
  vendedor?: string;
  designer?: string;
  tecido?: string;
  overloque?: boolean;
  elastico?: boolean;
  tipo_acabamento?: string;
  quantidade_ilhos?: string;
  espaco_ilhos?: string;
  valor_ilhos?: string;
  quantidade_cordinha?: string;
  espaco_cordinha?: string;
  valor_cordinha?: string;
  observacao?: string;
  imagem?: string;
  legenda_imagem?: string;
  quantidade_paineis?: string;
  valor_painel?: string;
  valores_adicionais?: string;
  valor_unitario?: string;
  emenda?: string;
  emenda_qtd?: string;
  terceirizado?: boolean;
  acabamento_lona?: string;
  valor_lona?: string;
  quantidade_lona?: string;
  outros_valores_lona?: string;
  tipo_adesivo?: string;
  valor_adesivo?: string;
  quantidade_adesivo?: string;
  outros_valores_adesivo?: string;
  ziper?: boolean;
  cordinha_extra?: boolean;
  alcinha?: boolean;
  toalha_pronta?: boolean;
  acabamento_totem?: string;
  acabamento_totem_outro?: string;
  valor_totem?: string;
  quantidade_totem?: string;
  outros_valores_totem?: string;
}

export interface UpdateOrderRequest {
  id: number;
  customer_name: string;
  address: string;
  status: OrderStatus;
  items: UpdateOrderItemRequest[];
  valor_frete?: number;
  cliente?: string;
  cidade_cliente?: string;
  estado_cliente?: string;
  telefone_cliente?: string;
  data_entrega?: string;
  prioridade?: string;
  forma_envio?: string;
  forma_pagamento_id?: number | null;
  observacao?: string;
}

export interface UpdateOrderMetadataRequest {
  id: number;
  cliente?: string;
  cidade_cliente?: string;
  estado_cliente?: string;
  telefone_cliente?: string;
  data_entrega?: string;
  prioridade?: string;
  forma_envio?: string;
  forma_pagamento_id?: number | null;
  observacao?: string;
  valor_frete?: number;
  status?: OrderStatus;
}

export interface UpdateOrderItemRequest {
  id?: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  imagem?: string;
  legenda_imagem?: string;
  valor_painel?: string;
  valores_adicionais?: string;
  emenda?: string;
  emenda_qtd?: string;
  terceirizado?: boolean;
  acabamento_lona?: string;
  valor_lona?: string;
  quantidade_lona?: string;
  outros_valores_lona?: string;
  tipo_adesivo?: string;
  valor_adesivo?: string;
  quantidade_adesivo?: string;
  outros_valores_adesivo?: string;
  ziper?: boolean;
  cordinha_extra?: boolean;
  alcinha?: boolean;
  toalha_pronta?: boolean;
}

export interface UpdateOrderStatusRequest {
  id: number;
  financeiro?: boolean;
  conferencia: boolean;
  sublimacao: boolean;
  costura: boolean;
  expedicao: boolean;
  sublimacao_maquina?: string | null;
  sublimacao_data_impressao?: string | null;
  status?: OrderStatus;
  pronto?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user_id?: number;
  username?: string;
  is_admin?: boolean;
  session_token?: string;
  message: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  customer_name?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface OrderAuditLogEntry {
  id: number;
  order_id: number;
  changed_by?: number;
  changed_by_name?: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  created_at?: string | null;
}

export interface AnalyticsFilters {
  date_from?: string | null;
  date_to?: string | null;
  vendedor_id?: number | null;
  designer_id?: number | null;
  product_type?: string | null;
}

export interface AnalyticsSummary {
  total_orders: number;
  total_items_produced: number;
  total_revenue: number;
  average_ticket: number;
}

export interface AnalyticsLeaderboardEntry {
  id: number | string;
  name: string;
  value: number;
}

export interface AnalyticsTopProduct {
  product_id: number | string;
  product_name: string;
  quantity: number;
}

export interface AnalyticsTrendPoint {
  period: string;
  production_volume: number;
  revenue: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  top_products: AnalyticsTopProduct[];
  top_sellers: AnalyticsLeaderboardEntry[];
  top_designers: AnalyticsLeaderboardEntry[];
  monthly_trends: AnalyticsTrendPoint[];
  last_updated?: string;
  available_product_types?: string[];
}

export interface PaginatedOrders {
  orders: OrderWithItems[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ========================================
// Cliente
// ========================================

export interface Cliente {
  id: number;
  nome: string;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateClienteRequest {
  nome: string;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
}

export interface UpdateClienteRequest {
  id: number;
  nome: string;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
}

export interface BulkClienteImportItem {
  nome: string;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
}

export interface BulkClienteImportError {
  index: number;
  nome?: string | null;
  message: string;
}

export interface BulkClienteImportResult {
  imported: Cliente[];
  errors: BulkClienteImportError[];
}

// ========================================
// TabItem para formulário de produção
// ========================================

export interface TabItem {
  id: string;
  tipo_producao: string;
  descricao: string;
  largura: string;
  altura: string;
  metro_quadrado: string;
  vendedor: string;
  designer: string;
  tecido: string;
  overloque: boolean;
  elastico: boolean;
  tipo_acabamento: 'ilhos' | 'cordinha' | 'nenhum';
  // Campos para ilhós
  quantidade_ilhos: string;
  espaco_ilhos: string;
  valor_ilhos: string;
  // Campos para cordinha
  quantidade_cordinha: string;
  espaco_cordinha: string;
  valor_cordinha: string;
  // Campos extras
  imagem: string;
  valor_painel: string;
  valores_adicionais: string;
  quantidade_paineis: string;
  emenda: string;
  emendaQtd: string;
  observacao: string;
  valor_unitario: string;
  acabamento_totem: 'com_pe' | 'sem_pe' | 'outro';
  acabamento_totem_outro: string;
  valor_totem: string;
  quantidade_totem: string;
  outros_valores_totem: string;
}

// ========================================
// Relatórios
// ========================================

export type ReportTypeKey =
  | 'analitico_designer_cliente'
  | 'analitico_cliente_designer'
  | 'analitico_cliente_painel'
  | 'analitico_designer_painel'
  | 'analitico_entrega_painel'
  | 'sintetico_data'
  | 'sintetico_data_entrada'
  | 'sintetico_data_entrega'
  | 'sintetico_designer'
  | 'sintetico_vendedor'
  | 'sintetico_vendedor_designer'
  | 'sintetico_cliente'
  | 'sintetico_entrega';

export interface ReportRequestPayload {
  report_type: ReportTypeKey;
  start_date?: string;
  end_date?: string;
  status?: string;
  /**
   * Define qual campo de data será usado como referência nos filtros e nos agrupamentos por data.
   * - 'entrada': usa sempre `data_entrada`
   * - 'entrega': usa sempre `data_entrega`
   * - undefined: mantém o comportamento anterior (fallback entrega -> entrada -> created_at)
   */
  date_mode?: 'entrada' | 'entrega';
  /**
   * Filtro opcional por vendedor (parcial, case-insensitive).
   * Usado para fechamento de comissão por vendedor.
   */
  vendedor?: string;
  /**
   * Filtro opcional por designer (parcial, case-insensitive).
   * Usado para fechamento de comissão por designer.
   */
  designer?: string;
  /**
   * Filtro opcional por cliente (parcial, case-insensitive).
   * Usado para gerar relatório específico de um cliente.
   */
  cliente?: string;
}

export interface ReportTotals {
  valor_frete: number;
  valor_servico: number;
  desconto?: number;  // Desconto aplicado (opcional)
  valor_liquido?: number;  // Valor líquido (frete + serviço - desconto) (opcional)
}

export interface ReportRowData {
  ficha: string;
  descricao: string;
  valor_frete: number;
  valor_servico: number;
}

export interface ReportGroup {
  key: string;
  label: string;
  rows?: ReportRowData[];
  subgroups?: ReportGroup[];
  subtotal: ReportTotals;
}

export interface ReportResponse {
  title: string;
  period_label: string;
  status_label: string;
  page: number;
  generated_at: string;
  report_type: string;
  groups: ReportGroup[];
  total: ReportTotals;
}

// ========================================
// Ficha de Serviço
// ========================================

export interface OrderFicha {
  id: number;
  numero?: string;
  cliente?: string;
  telefone_cliente?: string;
  cidade_cliente?: string;
  estado_cliente?: string;
  data_entrada?: string;
  data_entrega?: string;
  forma_envio?: string;
  forma_pagamento_id?: number;
  valor_frete?: number;
  total_value: number;
  observacao?: string;
  items: OrderItemFicha[];
}

export interface OrderItemFicha {
  id: number;
  order_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  
  // Campos detalhados
  tipo_producao?: string;
  descricao?: string;
  largura?: string;
  altura?: string;
  metro_quadrado?: string;
  vendedor?: string;
  designer?: string;
  tecido?: string;
  overloque?: boolean;
  elastico?: boolean;
  tipo_acabamento?: string;
  quantidade_ilhos?: string;
  espaco_ilhos?: string;
  valor_ilhos?: string;
  quantidade_cordinha?: string;
  espaco_cordinha?: string;
  valor_cordinha?: string;
  observacao?: string;
  imagem?: string;
  legenda_imagem?: string;
  emenda?: string;
  emenda_qtd?: string;
  ziper?: boolean;
  cordinha_extra?: boolean;
  alcinha?: boolean;
  toalha_pronta?: boolean;
  valor_painel?: string;
  valores_adicionais?: string;
  acabamento_lona?: string;
  valor_lona?: string;
  quantidade_lona?: string;
  outros_valores_lona?: string;
  tipo_adesivo?: string;
  valor_adesivo?: string;
  quantidade_adesivo?: string;
  outros_valores_adesivo?: string;
  acabamento_totem?: string;
  acabamento_totem_outro?: string;
  valor_totem?: string;
  quantidade_totem?: string;
  outros_valores_totem?: string;
}

export type TemplateFieldType =
  | 'text'
  | 'date'
  | 'number'
  | 'currency'
  | 'table'
  | 'custom'
  | 'image';

export interface TemplateFieldConfig {
  id: string;
  type: TemplateFieldType;
  label: string;
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  bold?: boolean;
  visible?: boolean;
  editable?: boolean;
  imageUrl?: string;
}

export type TemplateType = 'geral' | 'resumo';

export interface FichaTemplateConfig {
  title: string;
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  fields: TemplateFieldConfig[];
  templateType?: TemplateType;
  updatedAt?: string;
}

export interface FichaTemplatesConfig {
  geral: FichaTemplateConfig;
  resumo: FichaTemplateConfig;
}

// ========================================
// Templates de Relatórios
// ========================================

export type RelatorioTemplateType = 'envios' | 'fechamentos';

export interface RelatorioTemplateConfig {
  title: string;
  // Campos de cabeçalho editáveis
  headerFields: {
    title?: string;
    subtitle?: string;
    periodoLabel?: string;
    dataGeracaoLabel?: string;
    totalPedidosLabel?: string;
    [key: string]: string | undefined;
  };
  // Estilos
  styles: {
    fontFamily?: string;
    fontSize?: number;
    titleSize?: number;
    subtitleSize?: number;
    textColor?: string;
    headerColor?: string;
    borderColor?: string;
    backgroundColor?: string;
  };
  // Configurações de tabela/lista
  tableConfig?: {
    showHeader?: boolean;
    headerStyle?: {
      backgroundColor?: string;
      textColor?: string;
      bold?: boolean;
    };
    alternatingRows?: boolean;
    cellPadding?: number;
  };
  // Configurações de página
  pageConfig?: {
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
  };
  updatedAt?: string;
}

export interface RelatorioTemplatesConfig {
  envios: RelatorioTemplateConfig;
  fechamentos: RelatorioTemplateConfig;
}
