import { create } from 'zustand';
import { OrderWithItems } from '../types';

interface OrderState {
  orders: OrderWithItems[];
  selectedOrder: OrderWithItems | null;
  setOrders: (orders: OrderWithItems[] | ((prev: OrderWithItems[]) => OrderWithItems[])) => void;
  setSelectedOrder: (order: OrderWithItems | null) => void;
  addOrder: (order: OrderWithItems) => void;
  updateOrder: (order: OrderWithItems) => void;
  removeOrder: (orderId: number) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  selectedOrder: null,
  setOrders: (ordersOrUpdater) => {
    if (typeof ordersOrUpdater === 'function') {
      // Se for uma função, usar como updater (padrão Zustand)
      set((state) => ({ orders: ordersOrUpdater(state.orders) }));
    } else {
      // Se for um array, substituir diretamente
      set({ orders: ordersOrUpdater });
    }
  },
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
  updateOrder: (order) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === order.id ? order : o)),
    })),
  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
    })),
}));



