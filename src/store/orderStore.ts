import { create } from 'zustand';
import { DashboardSummary, OrderWithItems } from '../types';
import { revokeImageUrl } from '../utils/imageLoader';

export type OrderListProductionStatusFilter = 'all' | 'pending' | 'ready' | 'delayed' | 'drafts';

export interface OrderListTabTotals {
  pending?: number;
  ready?: number;
  all?: number;
  delayed?: number;
  drafts?: number;
}

export interface OrderListCacheState {
  searchTerm: string;
  activeSearchTerm: string;
  productionStatusFilter: OrderListProductionStatusFilter;
  dateFrom: string;
  dateTo: string;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  selectedStatuses: string[];
  selectedVendedor: string;
  selectedDesigner: string;
  selectedCidade: string;
  selectedFormaEnvio: string;
  selectedTipoProducao: string;
  advancedFiltersOpen: boolean;
  page: number;
  rowsPerPage: number;
  totalPages: number;
  totalOrders: number;
  tabTotals: OrderListTabTotals;
  draftsCount: number | null;
  printedOrderIds: number[];
  lastServerQueryKey: string;
  lastFetchTime: number;
}

const getInitialProductionStatusFilter = (): OrderListProductionStatusFilter => {
  try {
    const saved = sessionStorage.getItem('sgp_production_status_filter');
    if (saved === 'all' || saved === 'pending' || saved === 'ready' || saved === 'delayed' || saved === 'drafts') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'pending';
};

const DEFAULT_ORDER_LIST_CACHE: OrderListCacheState = {
  searchTerm: '',
  activeSearchTerm: '',
  productionStatusFilter: getInitialProductionStatusFilter(),
  dateFrom: '',
  dateTo: '',
  sortColumn: null,
  sortDirection: 'asc',
  selectedStatuses: [],
  selectedVendedor: '',
  selectedDesigner: '',
  selectedCidade: '',
  selectedFormaEnvio: '',
  selectedTipoProducao: '',
  advancedFiltersOpen: false,
  page: 0,
  rowsPerPage: 10,
  totalPages: 1,
  totalOrders: 0,
  tabTotals: {},
  draftsCount: null,
  printedOrderIds: [],
  lastServerQueryKey: '',
  lastFetchTime: 0,
};

interface OrderState {
  orders: OrderWithItems[];
  selectedOrder: OrderWithItems | null;
  dashboardOrders: OrderWithItems[];
  dashboardSummary: DashboardSummary | null;
  dashboardLastUpdate: Date | null;
  dashboardLastFetchTime: number;
  orderListCache: OrderListCacheState;
  setOrders: (orders: OrderWithItems[] | ((prev: OrderWithItems[]) => OrderWithItems[])) => void;
  setSelectedOrder: (order: OrderWithItems | null) => void;
  setDashboardData: (orders: OrderWithItems[], summary: DashboardSummary | null) => void;
  setOrderListCache: (partial: Partial<OrderListCacheState>) => void;
  addOrder: (order: OrderWithItems) => void;
  updateOrder: (order: OrderWithItems) => void;
  removeOrder: (orderId: number) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  selectedOrder: null,
  dashboardOrders: [],
  dashboardSummary: null,
  dashboardLastUpdate: null,
  dashboardLastFetchTime: 0,
  orderListCache: DEFAULT_ORDER_LIST_CACHE,
  setOrders: (ordersOrUpdater) => {
    if (typeof ordersOrUpdater === 'function') {
      set((state) => ({ orders: ordersOrUpdater(state.orders) }));
    } else {
      set({ orders: ordersOrUpdater });
    }
  },
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setDashboardData: (orders, summary) =>
    set({
      dashboardOrders: orders,
      dashboardSummary: summary,
      dashboardLastUpdate: new Date(),
      dashboardLastFetchTime: Date.now(),
    }),
  setOrderListCache: (partial) =>
    set((state) => ({
      orderListCache: { ...state.orderListCache, ...partial },
    })),
  addOrder: (order) =>
    set((state) => {
      const existsInOrders = state.orders.some((o) => o.id === order.id);
      const nextOrders = existsInOrders
        ? state.orders.map((o) => (o.id === order.id ? order : o))
        : [order, ...state.orders];

      const existsInDashboard = state.dashboardOrders.some((o) => o.id === order.id);
      const nextDashboardOrders =
        state.dashboardOrders.length === 0
          ? state.dashboardOrders
          : existsInDashboard
            ? state.dashboardOrders.map((o) => (o.id === order.id ? order : o))
            : [order, ...state.dashboardOrders];

      return {
        orders: nextOrders,
        dashboardOrders: nextDashboardOrders,
        dashboardLastFetchTime: 0,
        orderListCache: { ...state.orderListCache, lastFetchTime: 0 },
      };
    }),
  updateOrder: (order) =>
    set((state) => {
      const previousOrder =
        state.orders.find((o) => o.id === order.id) ||
        state.dashboardOrders.find((o) => o.id === order.id);

      if (previousOrder?.items && order?.items) {
        const newImages = new Set(
          order.items.map((item) => item.imagem).filter((img): img is string => Boolean(img))
        );
        previousOrder.items.forEach((oldItem) => {
          if (oldItem.imagem && !newImages.has(oldItem.imagem)) {
            revokeImageUrl(oldItem.imagem);
          }
        });
      }

      return {
        orders: state.orders.map((o) => (o.id === order.id ? order : o)),
        dashboardOrders: state.dashboardOrders.map((o) => (o.id === order.id ? order : o)),
        selectedOrder: state.selectedOrder?.id === order.id ? order : state.selectedOrder,
        dashboardLastFetchTime: 0,
        orderListCache: { ...state.orderListCache, lastFetchTime: 0 },
      };
    }),
  removeOrder: (orderId) =>
    set((state) => {
      const removedOrder =
        state.orders.find((o) => o.id === orderId) ||
        state.dashboardOrders.find((o) => o.id === orderId);

      removedOrder?.items?.forEach((item) => {
        if (item.imagem) {
          revokeImageUrl(item.imagem);
        }
      });

      return {
        orders: state.orders.filter((o) => o.id !== orderId),
        dashboardOrders: state.dashboardOrders.filter((o) => o.id !== orderId),
        selectedOrder: state.selectedOrder?.id === orderId ? null : state.selectedOrder,
        dashboardLastFetchTime: 0,
        orderListCache: { ...state.orderListCache, lastFetchTime: 0 },
      };
    }),
}));
