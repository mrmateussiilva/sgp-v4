import { create } from 'zustand';
import { OrderWithItems } from '../types';

interface OrderState {
  orders: OrderWithItems[];
  selectedOrder: OrderWithItems | null;
  setOrders: (orders: OrderWithItems[]) => void;
  setSelectedOrder: (order: OrderWithItems | null) => void;
  addOrder: (order: OrderWithItems) => void;
  updateOrder: (order: OrderWithItems) => void;
  removeOrder: (orderId: number) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  selectedOrder: null,
  setOrders: (orders) => set({ orders }),
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



