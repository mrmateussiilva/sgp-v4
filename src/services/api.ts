import { invoke } from '@tauri-apps/api/tauri';
import { useAuthStore } from '../store/authStore';
import {
  LoginRequest,
  LoginResponse,
  OrderWithItems,
  CreateOrderRequest,
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
} from '../types';

const requireSessionToken = () => {
  const token = useAuthStore.getState().sessionToken;
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return token;
};

export const api = {
  // Autenticação
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    return await invoke<LoginResponse>('login', { request });
  },

  logout: async (): Promise<void> => {
    const sessionToken = useAuthStore.getState().sessionToken;
    if (!sessionToken) {
      return;
    }

    try {
      await invoke<boolean>('logout', { sessionToken });
    } finally {
      useAuthStore.getState().logout();
    }
  },

  // Pedidos
  getOrders: async (): Promise<OrderWithItems[]> => {
    const sessionToken = requireSessionToken();
    return await invoke<OrderWithItems[]>('get_orders', { sessionToken });
  },

  getOrderById: async (orderId: number): Promise<OrderWithItems> => {
    const sessionToken = requireSessionToken();
    return await invoke<OrderWithItems>('get_order_by_id', { sessionToken, orderId });
  },

  createOrder: async (request: CreateOrderRequest): Promise<OrderWithItems> => {
    const sessionToken = requireSessionToken();
    return await invoke<OrderWithItems>('create_order', { sessionToken, request });
  },

  updateOrder: async (request: UpdateOrderRequest): Promise<OrderWithItems> => {
    const sessionToken = requireSessionToken();
    return await invoke<OrderWithItems>('update_order', { sessionToken, request });
  },

  updateOrderMetadata: async (request: UpdateOrderMetadataRequest): Promise<OrderWithItems> => {
    const sessionToken = requireSessionToken();
    return await invoke<OrderWithItems>('update_order_metadata', { sessionToken, request });
  },

  updateOrderStatus: async (request: UpdateOrderStatusRequest): Promise<OrderWithItems> => {
    const sessionToken = requireSessionToken();
    return await invoke<OrderWithItems>('update_order_status_flags', { sessionToken, request });
  },

  deleteOrder: async (orderId: number): Promise<boolean> => {
    const sessionToken = requireSessionToken();
    return await invoke<boolean>('delete_order', { sessionToken, orderId });
  },

  getOrdersWithFilters: async (filters: OrderFilters): Promise<PaginatedOrders> => {
    const sessionToken = requireSessionToken();
    return await invoke<PaginatedOrders>('get_orders_with_filters', { sessionToken, filters });
  },

  getOrderHistory: async (orderId: number): Promise<OrderAuditLogEntry[]> => {
    const sessionToken = requireSessionToken();
    return await invoke<OrderAuditLogEntry[]>('get_order_audit_log', { sessionToken, orderId });
  },

  // Clientes
  getClientes: async (): Promise<Cliente[]> => {
    const sessionToken = requireSessionToken();
    return await invoke<Cliente[]>('get_clientes', { sessionToken });
  },

  getClienteById: async (clienteId: number): Promise<Cliente> => {
    const sessionToken = requireSessionToken();
    return await invoke<Cliente>('get_cliente_by_id', { sessionToken, clienteId });
  },

  createCliente: async (request: CreateClienteRequest): Promise<Cliente> => {
    const sessionToken = requireSessionToken();
    return await invoke<Cliente>('create_cliente', { sessionToken, request });
  },

  updateCliente: async (request: UpdateClienteRequest): Promise<Cliente> => {
    const sessionToken = requireSessionToken();
    return await invoke<Cliente>('update_cliente', { sessionToken, request });
  },

  deleteCliente: async (clienteId: number): Promise<boolean> => {
    const sessionToken = requireSessionToken();
    return await invoke<boolean>('delete_cliente', { sessionToken, clienteId });
  },

  importClientesBulk: async (
    clientes: BulkClienteImportItem[]
  ): Promise<BulkClienteImportResult> => {
    const sessionToken = requireSessionToken();
    return await invoke<BulkClienteImportResult>('import_clientes_bulk', {
      sessionToken,
      request: { clientes },
    });
  },

  // Catálogos (Vendedores, Designers, Materiais/Tecidos)
  getVendedoresAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
    const sessionToken = requireSessionToken();
    return await invoke<Array<{ id: number; nome: string }>>('get_vendedores_ativos', {
      sessionToken,
    });
  },

  getDesignersAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
    const sessionToken = requireSessionToken();
    return await invoke<Array<{ id: number; nome: string }>>('get_designers_ativos', {
      sessionToken,
    });
  },

  getTecidosAtivos: async (): Promise<string[]> => {
    return api.getMateriaisAtivosPorTipo('tecido');
  },

  getMateriaisAtivosPorTipo: async (tipo: string): Promise<string[]> => {
    const sessionToken = requireSessionToken();
    const materiais = await invoke<
      Array<{ id: number; nome: string; tipo: string; ativo: boolean }>
    >('get_materiais_ativos', { sessionToken });
    return (materiais || [])
      .filter((m) => (m as any).tipo?.toLowerCase() === tipo.toLowerCase())
      .map((m) => m.nome);
  },

  // Formas de Envio
  getFormasEnvioAtivas: async (): Promise<any[]> => {
    const sessionToken = requireSessionToken();
    return await invoke<any[]>('get_formas_envio_ativas', { sessionToken });
  },

  // Formas de Pagamento
  getFormasPagamentoAtivas: async (): Promise<any[]> => {
    const sessionToken = requireSessionToken();
    return await invoke<any[]>('get_formas_pagamento_ativas', { sessionToken });
  },

  // Relatórios
  generateReport: async (request: ReportRequestPayload): Promise<ReportResponse> => {
    const sessionToken = requireSessionToken();
    return await invoke<ReportResponse>('generate_report', { sessionToken, request });
  },
};
