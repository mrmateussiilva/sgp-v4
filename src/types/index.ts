export enum OrderStatus {
  Pendente = 'Pendente',
  EmProcessamento = 'Em Processamento',
  Concluido = 'Concluído',
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
  quantidade_paineis?: string;
  valor_unitario?: string;
  emenda?: string;
  emenda_qtd?: string;
  emendaQtd?: string;
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
  
  items: OrderItem[];
}

export interface CreateOrderRequest {
  cliente: string;
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
  quantidade_paineis?: string;
  valor_unitario?: string;
  emenda?: string;
  emenda_qtd?: string;
}

export interface UpdateOrderRequest {
  id: number;
  customer_name: string;
  address: string;
  status: OrderStatus;
  items: UpdateOrderItemRequest[];
}

export interface UpdateOrderItemRequest {
  id?: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  emenda?: string;
  emenda_qtd?: string;
}

export interface UpdateOrderStatusRequest {
  id: number;
  financeiro: boolean;
  conferencia: boolean;
  sublimacao: boolean;
  costura: boolean;
  expedicao: boolean;
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
  cep: string;
  cidade: string;
  estado: string;
  telefone: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateClienteRequest {
  nome: string;
  cep: string;
  cidade: string;
  estado: string;
  telefone: string;
}

export interface UpdateClienteRequest {
  id: number;
  nome: string;
  cep: string;
  cidade: string;
  estado: string;
  telefone: string;
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
}
