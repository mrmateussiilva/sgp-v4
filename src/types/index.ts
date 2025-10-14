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
}

export interface OrderWithItems {
  id: number;
  numero?: string;
  customer_name?: string;
  cliente?: string;
  address?: string;
  cidade_cliente?: string;
  telefone_cliente?: string;
  data_entrada?: string;
  data_entrega?: string;
  total_value?: number;
  valor_total?: number;
  created_at: string;
  updated_at: string;
  status: OrderStatus;
  prioridade?: string;
  
  // Status de produção (checkboxes)
  financeiro?: boolean;
  conferencia?: boolean;
  sublimacao?: boolean;
  costura?: boolean;
  expedicao?: boolean;
  
  items: OrderItem[];
}

export interface CreateOrderRequest {
  customer_name: string;
  address: string;
  status: OrderStatus;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  item_name: string;
  quantity: number;
  unit_price: number;
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
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user_id?: number;
  username?: string;
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

