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
};

