import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { ordersSocket, OrderEventMessage } from '@/lib/realtimeOrders';

export interface EditingUser {
  userId: number;
  username: string;
  orderId: number;
  timestamp: number;
}

interface EditingState {
  [orderId: number]: EditingUser;
}

/**
 * Hook para rastrear quais usuários estão editando quais pedidos em tempo real
 */
export const useEditingTracker = () => {
  const { userId: currentUserId, username: currentUsername } = useAuthStore();
  const [editingUsers, setEditingUsers] = useState<EditingState>({});
  const editingTimeoutRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const lastActivityRef = useRef<Map<number, number>>(new Map());

  // Limpar usuários inativos após 30 segundos sem atividade
  const EDITING_TIMEOUT_MS = 30000;

  const clearEditingUser = useCallback((orderId: number) => {
    setEditingUsers((prev) => {
      const updated = { ...prev };
      delete updated[orderId];
      return updated;
    });
    
    const timeout = editingTimeoutRef.current.get(orderId);
    if (timeout) {
      clearTimeout(timeout);
      editingTimeoutRef.current.delete(orderId);
    }
  }, []);

  const setEditingUser = useCallback((orderId: number, userId: number, username: string) => {
    // Não mostrar a si mesmo como editando
    if (userId === currentUserId) {
      return;
    }

    const now = Date.now();
    lastActivityRef.current.set(orderId, now);

    setEditingUsers((prev) => ({
      ...prev,
      [orderId]: {
        userId,
        username,
        orderId,
        timestamp: now,
      },
    }));

    // Limpar timeout anterior se existir
    const existingTimeout = editingTimeoutRef.current.get(orderId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Criar novo timeout para remover após inatividade
    const timeout = setTimeout(() => {
      clearEditingUser(orderId);
    }, EDITING_TIMEOUT_MS);

    editingTimeoutRef.current.set(orderId, timeout);
  }, [currentUserId, clearEditingUser]);

  // Escutar eventos de atualização para detectar edições
  useEffect(() => {
    const handleMessage = (message: OrderEventMessage) => {
      if (!message.type || !message.order) {
        return;
      }

      const orderPayload = message.order as any;
      const orderId = orderPayload?.id;
      const userId = orderPayload?.user_id;

      if (!orderId || !userId) {
        return;
      }

      // Se for evento de atualização, marcar usuário como editando
      if (message.type === 'order_updated' || message.type === 'order_status_updated') {
        const username = orderPayload?.username || `Usuário ${userId}`;
        setEditingUser(orderId, userId, username);
      }
    };

    const unsubscribe = ordersSocket.subscribe(handleMessage);

    return () => {
      unsubscribe();
    };
  }, [setEditingUser]);

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      editingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      editingTimeoutRef.current.clear();
      lastActivityRef.current.clear();
    };
  }, []);

  const getEditingUser = useCallback((orderId: number): EditingUser | null => {
    return editingUsers[orderId] || null;
  }, [editingUsers]);

  const isBeingEdited = useCallback((orderId: number): boolean => {
    return orderId in editingUsers;
  }, [editingUsers]);

  return {
    editingUsers,
    getEditingUser,
    isBeingEdited,
    clearEditingUser,
  };
};

