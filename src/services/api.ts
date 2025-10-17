import { invoke } from '@tauri-apps/api/tauri';
import {
  LoginRequest,
  LoginResponse,
  OrderWithItems,
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderFilters,
  PaginatedOrders,
  Cliente,
  CreateClienteRequest,
  UpdateClienteRequest,
  UpdateOrderStatusRequest,
} from '../types';

export const api = {
  // Autenticação
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    return await invoke<LoginResponse>('login', { request });
  },

  // Pedidos
  getOrders: async (): Promise<OrderWithItems[]> => {
    return await invoke<OrderWithItems[]>('get_orders');
  },

  getOrderById: async (orderId: number): Promise<OrderWithItems> => {
    return await invoke<OrderWithItems>('get_order_by_id', { orderId });
  },

  createOrder: async (request: CreateOrderRequest): Promise<OrderWithItems> => {
    return await invoke<OrderWithItems>('create_order', { request });
  },

  updateOrder: async (request: UpdateOrderRequest): Promise<OrderWithItems> => {
    return await invoke<OrderWithItems>('update_order', { request });
  },

  updateOrderStatus: async (request: UpdateOrderStatusRequest): Promise<OrderWithItems> => {
    return await invoke<OrderWithItems>('update_order_status_flags', { request });
  },

  deleteOrder: async (orderId: number): Promise<boolean> => {
    return await invoke<boolean>('delete_order', { orderId });
  },

  getOrdersWithFilters: async (filters: OrderFilters): Promise<PaginatedOrders> => {
    return await invoke<PaginatedOrders>('get_orders_with_filters', { filters });
  },

  // Clientes
  getClientes: async (): Promise<Cliente[]> => {
    return await invoke<Cliente[]>('get_clientes');
  },

  getClienteById: async (clienteId: number): Promise<Cliente> => {
    return await invoke<Cliente>('get_cliente_by_id', { clienteId });
  },

  createCliente: async (request: CreateClienteRequest): Promise<Cliente> => {
    return await invoke<Cliente>('create_cliente', { request });
  },

  updateCliente: async (request: UpdateClienteRequest): Promise<Cliente> => {
    return await invoke<Cliente>('update_cliente', { request });
  },

  deleteCliente: async (clienteId: number): Promise<boolean> => {
    return await invoke<boolean>('delete_cliente', { clienteId });
  },

  // Catálogos (Vendedores, Designers, Materiais/Tecidos)
  getVendedoresAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
    return await invoke<Array<{ id: number; nome: string }>>('get_vendedores_ativos');
  },

  getDesignersAtivos: async (): Promise<Array<{ id: number; nome: string }>> => {
    return await invoke<Array<{ id: number; nome: string }>>('get_designers_ativos');
  },

  getTecidosAtivos: async (): Promise<string[]> => {
    const materiais = await invoke<Array<{ id: number; nome: string; tipo: string; ativo: boolean }>>('get_materiais_ativos');
    return (materiais || [])
      .filter((m) => (m as any).tipo?.toLowerCase() === 'tecido')
      .map((m) => m.nome);
  },

  // Formas de Envio
  getFormasEnvioAtivas: async (): Promise<any[]> => {
    return await invoke<any[]>('get_formas_envio_ativas');
  },

  // Formas de Pagamento
  getFormasPagamentoAtivas: async (): Promise<any[]> => {
    return await invoke<any[]>('get_formas_pagamento_ativas');
  },
};
