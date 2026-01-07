import { useEffect, useState, useCallback } from 'react';
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
 * Singleton para gerenciar estado de edição globalmente
 * Evita múltiplas assinaturas WebSocket quando há muitos EditingIndicators
 */
class EditingTrackerManager {
  private editingUsers: EditingState = {};
  private editingTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
  private lastActivity = new Map<number, number>();
  private subscribers = new Set<() => void>();
  private unsubscribeSocket: (() => void) | null = null;
  private currentUserId: number | null = null;
  private readonly EDITING_TIMEOUT_MS = 30000;

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback());
  }

  private clearEditingUser(orderId: number) {
    delete this.editingUsers[orderId];
    
    const timeout = this.editingTimeouts.get(orderId);
    if (timeout) {
      clearTimeout(timeout);
      this.editingTimeouts.delete(orderId);
    }
    
    this.lastActivity.delete(orderId);
    this.notifySubscribers();
  }

  private setEditingUser(orderId: number, userId: number, username: string) {
    // Não mostrar a si mesmo como editando
    if (userId === this.currentUserId) {
      return;
    }

    const now = Date.now();
    this.lastActivity.set(orderId, now);

    this.editingUsers[orderId] = {
      userId,
      username,
      orderId,
      timestamp: now,
    };

    // Limpar timeout anterior se existir
    const existingTimeout = this.editingTimeouts.get(orderId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Criar novo timeout para remover após inatividade
    const timeout = setTimeout(() => {
      this.clearEditingUser(orderId);
    }, this.EDITING_TIMEOUT_MS);

    this.editingTimeouts.set(orderId, timeout);
    this.notifySubscribers();
  }

  initialize(userId: number) {
    this.currentUserId = userId;
    
    // Inicializar assinatura WebSocket apenas uma vez
    if (this.unsubscribeSocket) {
      return; // Já inicializado
    }

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
        this.setEditingUser(orderId, userId, username);
      }
    };

    this.unsubscribeSocket = ordersSocket.subscribe(handleMessage);
  }

  cleanup() {
    if (this.unsubscribeSocket) {
      this.unsubscribeSocket();
      this.unsubscribeSocket = null;
    }
    this.editingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.editingTimeouts.clear();
    this.lastActivity.clear();
    this.editingUsers = {};
    this.subscribers.clear();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getEditingUser(orderId: number): EditingUser | null {
    return this.editingUsers[orderId] || null;
  }

  isBeingEdited(orderId: number): boolean {
    return orderId in this.editingUsers;
  }

  getState(): EditingState {
    return { ...this.editingUsers };
  }
}

// Singleton global
const editingTrackerManager = new EditingTrackerManager();

/**
 * Hook para rastrear quais usuários estão editando quais pedidos em tempo real
 * Agora usa um singleton para evitar múltiplas assinaturas WebSocket
 */
export const useEditingTracker = () => {
  const { userId: currentUserId } = useAuthStore();
  const [editingUsers, setEditingUsers] = useState<EditingState>(editingTrackerManager.getState());

  // Inicializar o manager quando o userId estiver disponível
  useEffect(() => {
    if (currentUserId) {
      editingTrackerManager.initialize(currentUserId);
    }

    // Cleanup ao desmontar (apenas se não houver mais componentes usando)
    return () => {
      // Não fazer cleanup aqui - deixar o manager ativo para outros componentes
      // O cleanup será feito quando a aplicação fechar
    };
  }, [currentUserId]);

  // Subscrever para mudanças no estado
  useEffect(() => {
    const unsubscribe = editingTrackerManager.subscribe(() => {
      setEditingUsers(editingTrackerManager.getState());
    });

    // Atualizar estado inicial
    setEditingUsers(editingTrackerManager.getState());

    return unsubscribe;
  }, []);

  const getEditingUser = useCallback((orderId: number): EditingUser | null => {
    return editingTrackerManager.getEditingUser(orderId);
  }, []);

  const isBeingEdited = useCallback((orderId: number): boolean => {
    return editingTrackerManager.isBeingEdited(orderId);
  }, []);

  const clearEditingUser = useCallback((_orderId: number) => {
    // Não expor clearEditingUser - deixar o manager gerenciar automaticamente
    // O manager já gerencia a limpeza automaticamente via timeouts
  }, []);

  return {
    editingUsers,
    getEditingUser,
    isBeingEdited,
    clearEditingUser,
  };
};
