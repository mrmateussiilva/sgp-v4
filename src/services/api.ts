import { apiClient, setApiUrl, getApiUrl } from '../api/client';
import { ordersApi } from '../api/endpoints/orders';
import { customersApi } from '../api/endpoints/customers';
import { resourcesApi } from '../api/endpoints/resources';
import { authApi } from '../api/endpoints/auth';
import { maquinasApi } from '../api/endpoints/maquinas';
import { printLogsApi } from '../api/endpoints/printLogs';
import { OrderStatus } from '../types';

/**
 * @deprecated Legacy monolithic API service. Use individual modules from `src/api/` instead.
 * This file acts as a facade to maintain backward compatibility during refactoring.
 */
export const api = {
  // Auth
  login: authApi.login,
  logout: authApi.logout,

  // Orders
  getOrders: ordersApi.getOrders,
  getOrdersPaginated: ordersApi.getOrdersPaginated,
  getOrdersPaginatedForTable: ordersApi.getOrdersPaginated, // Alias for now, as implementation is identical in logic
  getPendingOrdersLight: async () => {
    const orders = await ordersApi.getOrders();
    return orders.filter(o => o.pronto === false || o.pronto == null);
  },
  getPendingOrdersPaginated: async (page?: number, pageSize?: number) =>
    ordersApi.getOrdersPaginated(page, pageSize, OrderStatus.Pendente),
  getReadyOrdersPaginated: async (page?: number, pageSize?: number) =>
    ordersApi.getOrdersPaginated(page, pageSize, OrderStatus.Concluido),
  getReadyOrdersLight: async () => {
    const orders = await ordersApi.getOrders();
    return orders.filter(o => o.status === OrderStatus.Concluido);
  },
  getOrderById: ordersApi.getOrderById,
  getOrderByIdFresh: ordersApi.getOrderByIdFresh,
  createOrder: ordersApi.createOrder,
  duplicateOrder: ordersApi.duplicateOrder,
  createReplacementOrder: ordersApi.createReplacementOrder,
  updateOrder: ordersApi.updateOrder,
  updateOrderMetadata: ordersApi.updateOrderMetadata,
  updateOrderStatus: ordersApi.updateOrderStatus,
  updateOrderItem: ordersApi.updateOrderItem,
  deleteOrder: ordersApi.deleteOrder,
  deleteAllOrders: async () => { await apiClient.delete('/pedidos/all'); return true; },
  resetOrderIds: async () => { await apiClient.post('/pedidos/reset-ids'); return true; },
  getOrdersWithFilters: async (filters: any) => ordersApi.getOrdersPaginated(filters.page, filters.page_size, filters.status, filters.cliente, filters.date_from, filters.date_to),
  getOrdersWithFiltersForTable: async (filters: any) => ordersApi.getOrdersPaginated(filters.page, filters.page_size, filters.status, filters.cliente, filters.date_from, filters.date_to),
  getDashboardSummary: ordersApi.getDashboardSummary,
  getTotalOrdersCount: ordersApi.getTotalOrdersCount,
  getOrderHistory: async (_orderId?: number) => [],
  getOrderFicha: ordersApi.getOrderFicha,
  // Orders by range
  getOrdersByDeliveryDateRange: ordersApi.getOrdersByDeliveryDateRange,
  getRelatorioEnviosPedidos: async (start: string, end?: string, options?: any) => {
    return ordersApi.getOrdersPaginated(options?.page, options?.pageSize, options?.status, options?.cliente, start, end).then(r => r.orders);
  },

  // Customers
  getClientes: customersApi.getClientes,
  getClienteById: customersApi.getClienteById,
  createCliente: customersApi.createCliente,
  updateCliente: customersApi.updateCliente,
  deleteCliente: customersApi.deleteCliente,
  importClientesBulk: customersApi.importClientesBulk,

  // Resources
  getVendedoresAtivos: resourcesApi.getVendedoresAtivos,
  getDesignersAtivos: resourcesApi.getDesignersAtivos,
  getTecidosAtivos: resourcesApi.getTecidosAtivos,
  getFilamentosAtivos: resourcesApi.getFilamentosAtivos,
  getMateriaisAtivosPorTipo: resourcesApi.getMateriaisAtivosPorTipo,
  getFormasEnvioAtivas: resourcesApi.getFormasEnvioAtivas,
  getFormasPagamentoAtivas: resourcesApi.getFormasPagamentoAtivas,

  // Templates & Reports
  getFichaTemplates: resourcesApi.getFichaTemplates,
  saveFichaTemplates: resourcesApi.saveFichaTemplates,
  saveFichaTemplatesHTML: resourcesApi.saveFichaTemplatesHTML,
  getFichaTemplateHTML: resourcesApi.getFichaTemplateHTML,
  getRelatorioTemplates: resourcesApi.getRelatorioTemplates,
  saveRelatorioTemplates: resourcesApi.saveRelatorioTemplates,
  generateReport: resourcesApi.generateReport,
  getRelatorioSemanal: resourcesApi.getRelatorioSemanal,
  getFechamentoStatistics: resourcesApi.getFechamentoStatistics,
  getFechamentoTrends: resourcesApi.getFechamentoTrends,
  getFechamentoRankings: resourcesApi.getFechamentoRankings,

  // Maquinas
  getMaquinasAtivas: maquinasApi.getAtivas,

  // Print Logs
  getPrinterLogs: printLogsApi.getPrinterLogs,
  getAllLogs: printLogsApi.getAllLogs,
  createPrintLog: printLogsApi.createPrintLog,
  getPrinterStats: printLogsApi.getPrinterStats,

  // Batch operations
  batchUpdateStatus: ordersApi.batchUpdateStatus,
};

// Re-export deprecated standalone functions to maintain compatibility with existing imports
export { setApiUrl, getApiUrl };
export const getFichas = async () => { return []; };

// Re-export types for backwards compatibility
export type {
  DesignerEntity,
  VendedorEntity,
  FormaEnvioEntity,
  FormaPagamentoEntity,
  UserEntity,
  TipoProducaoEntity,
  MaterialEntity,
} from '../api/types';

// Global function exports matching original file
// Note: token parameter is kept for backwards compatibility but not used internally
// as authentication is now handled by apiClient interceptor
/* eslint-disable @typescript-eslint/no-explicit-any */
export const getMateriais = async (_token?: string) => resourcesApi.getMateriais();
export const createMaterial = (_token: string, req: any) => resourcesApi.createMaterial(req);
export const updateMaterial = (_token: string, req: any) => resourcesApi.updateMaterial(req);
export const deleteMaterial = (_token: string, id: number) => resourcesApi.deleteMaterial(id);

export const getVendedores = async (_token?: string) => resourcesApi.getVendedores();
export const createVendedor = (_token: string, req: any) => resourcesApi.createVendedor(req);
export const updateVendedor = (_token: string, req: any) => resourcesApi.updateVendedor(req);
export const deleteVendedor = (_token: string, id: number) => resourcesApi.deleteVendedor(id);

export const getDesigners = async (_token?: string) => resourcesApi.getDesigners();
export const createDesigner = (_token: string, req: any) => resourcesApi.createDesigner(req);
export const updateDesigner = (_token: string, req: any) => resourcesApi.updateDesigner(req);
export const deleteDesigner = (_token: string, id: number) => resourcesApi.deleteDesigner(id);

export const getFormasEnvio = async (_token?: string) => resourcesApi.getFormasEnvio();
export const createFormaEnvio = (_token: string, req: any) => resourcesApi.createFormaEnvio(req);
export const updateFormaEnvio = (_token: string, req: any) => resourcesApi.updateFormaEnvio(req);
export const deleteFormaEnvio = (_token: string, id: number) => resourcesApi.deleteFormaEnvio(id);

export const getFormasPagamento = async (_token?: string) => resourcesApi.getFormasPagamento();
export const createFormaPagamento = (_token: string, req: any) => resourcesApi.createFormaPagamento(req);
export const updateFormaPagamento = (_token: string, req: any) => resourcesApi.updateFormaPagamento(req);
export const deleteFormaPagamento = (_token: string, id: number) => resourcesApi.deleteFormaPagamento(id);

export const getUsers = async (_token?: string) => resourcesApi.getUsers();
export const createUser = (_token: string, req: any) => resourcesApi.createUser(req);
export const updateUser = (_token: string, req: any) => resourcesApi.updateUser(req);
export const deleteUser = (_token: string, id: number) => resourcesApi.deleteUser(id);

export const getTiposProducao = async (_token?: string) => resourcesApi.getTiposProducao();
export const getTiposProducaoAtivos = async (_token?: string) => resourcesApi.getTiposProducaoAtivos();
export const createTipoProducao = (_token: string, req: any) => resourcesApi.createTipoProducao(req);
export const updateTipoProducao = (_token: string, req: any) => resourcesApi.updateTipoProducao(req);
export const deleteTipoProducao = (_token: string, id: number) => resourcesApi.deleteTipoProducao(id);
/* eslint-enable @typescript-eslint/no-explicit-any */

export const getOrdersByDeliveryDate = async (_token: string, start: string, end: string) => {
  return ordersApi.getOrdersByDeliveryDateRange(start, end);
};
export const getOrderFicha = (_token: string, id: number) => ordersApi.getOrderFicha(id);
