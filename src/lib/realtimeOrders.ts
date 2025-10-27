import { getApiUrl } from '@/services/apiClient';

export interface OrdersSocketStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  lastEventAt: number | null;
  lastError?: string;
}

export interface OrderEventMessage {
  type: string;
  order?: unknown;
  order_id?: number;
  [key: string]: unknown;
}

type MessageListener = (message: OrderEventMessage) => void;
type StatusListener = (status: OrdersSocketStatus) => void;

const INITIAL_STATUS: OrdersSocketStatus = {
  isConnected: false,
  reconnectAttempts: 0,
  lastEventAt: null,
};

class OrdersWebSocketManager {
  private socket: WebSocket | null = null;
  private currentUrl: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private status: OrdersSocketStatus = { ...INITIAL_STATUS };
  private shouldStayConnected = false;
  private reconnectDelayMs = 2000;

  subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    this.shouldStayConnected = true;
    this.ensureConnection();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.teardownIfIdle();
      }
    };
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  connect(): void {
    this.shouldStayConnected = true;
    this.ensureConnection(true);
  }

  disconnect(): void {
    this.shouldStayConnected = false;
    this.clearReconnectTimer();
    this.stopPing();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000, 'Manual disconnect');
    }
    this.socket = null;
    this.currentUrl = null;
    this.updateStatus({ ...INITIAL_STATUS });
  }

  getListenerCount(): number {
    return this.listeners.size;
  }

  getCurrentStatus(): OrdersSocketStatus {
    return this.status;
  }

  private ensureConnection(forceReconnect = false): void {
    const wsUrl = this.buildWebSocketUrl();
    if (!wsUrl) {
      this.updateStatus({
        isConnected: false,
        lastError: 'API base URL não configurada',
      });
      return;
    }

    if (this.socket) {
      if (forceReconnect || (this.currentUrl && this.currentUrl !== wsUrl)) {
        try {
          this.socket.close(1000, 'Reconnecting');
        } catch (error) {
          console.warn('Falha ao fechar WebSocket antigo:', error);
        }
        this.socket = null;
      } else if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    this.currentUrl = wsUrl;
    this.clearReconnectTimer();

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.updateStatus({
        isConnected: true,
        reconnectAttempts: 0,
        lastError: undefined,
      });
      this.startPing();
    };

    this.socket.onclose = (event) => {
      const wasConnected = this.status.isConnected;
      this.updateStatus({
        isConnected: false,
        lastError: event.reason || (event.wasClean ? undefined : 'Conexão encerrada inesperadamente'),
      });
      this.stopPing();
      this.socket = null;

      if (this.shouldStayConnected && (forceReconnect || wasConnected || this.listeners.size > 0)) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (event) => {
      console.error('Erro no WebSocket de pedidos:', event);
      this.updateStatus({
        lastError: 'Erro na conexão do WebSocket',
      });
      try {
        this.socket?.close();
      } catch (error) {
        console.warn('Falha ao fechar WebSocket após erro:', error);
      }
    };

    this.socket.onmessage = (event) => {
      this.updateStatus({
        lastEventAt: Date.now(),
        lastError: undefined,
      });

      try {
        const payload = typeof event.data === 'string' ? event.data : '';
        if (!payload) {
          return;
        }
        const message = JSON.parse(payload) as OrderEventMessage;
        this.listeners.forEach((listener) => {
          try {
            listener(message);
          } catch (error) {
            console.error('Erro ao processar listener do WebSocket:', error);
          }
        });
      } catch (error) {
        console.error('Erro ao decodificar mensagem do WebSocket:', error);
        this.updateStatus({
          lastError: 'Mensagem inválida recebida do WebSocket',
        });
      }
    };
  }

  private buildWebSocketUrl(): string | null {
    const apiBase = getApiUrl();
    if (!apiBase) {
      return null;
    }

    try {
      const url = new URL(apiBase);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/ws/orders';
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch (error) {
      console.error('API base URL inválida para WebSocket:', apiBase, error);
      return null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldStayConnected || this.reconnectTimer) {
      return;
    }
    this.updateStatus({
      reconnectAttempts: this.status.reconnectAttempts + 1,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldStayConnected || this.listeners.size > 0) {
        this.ensureConnection();
      }
    }, this.reconnectDelayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.warn('Falha ao enviar ping do WebSocket:', error);
        }
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private teardownIfIdle(): void {
    if (this.listeners.size > 0) {
      return;
    }
    this.shouldStayConnected = false;
    this.disconnect();
  }

  private updateStatus(patch: Partial<OrdersSocketStatus>): void {
    this.status = {
      ...this.status,
      ...patch,
    };
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('Erro ao notificar listener de status do WebSocket:', error);
      }
    });
  }
}

export const ordersSocket = new OrdersWebSocketManager();
