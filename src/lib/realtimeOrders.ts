import { getApiUrl } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';

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
  private maxReconnectAttempts = 10; // Limitar tentativas para evitar spam de erros
  private consecutiveFailures = 0;
  private isConnecting = false; // Flag para evitar múltiplas conexões simultâneas
  private lastReconnectAttempt = 0; // Timestamp da última tentativa de reconexão
  private minReconnectInterval = 2000; // Mínimo de 2 segundos entre tentativas

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
    // Evitar múltiplas conexões simultâneas
    if (this.isConnecting && !forceReconnect) {
      return;
    }

    // Debounce: verificar se passou tempo suficiente desde a última tentativa
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastReconnectAttempt;
    if (timeSinceLastAttempt < this.minReconnectInterval && !forceReconnect && this.lastReconnectAttempt > 0) {
      if (import.meta.env.DEV) {
        console.log(`⏳ Aguardando ${this.minReconnectInterval - timeSinceLastAttempt}ms antes de reconectar...`);
      }
      this.scheduleReconnect();
      return;
    }

    const wsUrl = this.buildWebSocketUrl();
    if (!wsUrl) {
      this.updateStatus({
        isConnected: false,
        lastError: 'API base URL não configurada',
      });
      return;
    }

    // Se já existe um socket, verificar o estado
    if (this.socket) {
      const currentState = this.socket.readyState;
      
      // Se está conectado ou conectando, não fazer nada (a menos que force reconnect)
      if (!forceReconnect && (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING)) {
        // Se a URL mudou, precisamos reconectar
        if (this.currentUrl && this.currentUrl !== wsUrl) {
          forceReconnect = true;
        } else {
          return; // Já está conectando ou conectado com a URL correta
        }
      }
      
      // Se precisa reconectar, fechar o socket antigo de forma segura
      if (forceReconnect || (this.currentUrl && this.currentUrl !== wsUrl)) {
        // Se está conectando, aguardar um pouco antes de fechar
        if (currentState === WebSocket.CONNECTING) {
          // Aguardar até que o estado mude ou timeout
          setTimeout(() => {
            if (this.socket) {
              try {
                const state = this.socket.readyState;
                if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
                  this.socket.close(1000, 'Reconnecting');
                }
              } catch (error) {
                // Ignorar erros ao fechar
              }
              this.socket = null;
              this.isConnecting = false;
              // Tentar conectar novamente após fechar
              if (this.shouldStayConnected) {
                this.ensureConnection(false);
              }
            }
          }, 200);
          return;
        }
        
        // Se está aberto, pode fechar normalmente
        try {
          if (currentState === WebSocket.OPEN) {
            this.socket.close(1000, 'Reconnecting');
          }
        } catch (error) {
          // Ignorar erros ao fechar
        }
        this.socket = null;
      } else if (currentState === WebSocket.CLOSED || currentState === WebSocket.CLOSING) {
        // Socket já está fechado ou fechando, apenas limpar referência
        this.socket = null;
      }
    }

    this.currentUrl = wsUrl;
    this.clearReconnectTimer();
    this.isConnecting = true;

    try {
      if (import.meta.env.DEV) {
        console.log('🔌 Tentando conectar WebSocket:', wsUrl);
      }
      
      this.socket = new WebSocket(wsUrl);
    } catch (error) {
      // Resetar flag de conexão em caso de erro
      this.isConnecting = false;
      
      // Silenciar erros esperados de criação de WebSocket
      if (import.meta.env.DEV) {
        console.warn('⚠️ Não foi possível criar conexão WebSocket:', error);
      }
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      // Resetar flag de conexão e contador de falhas
      this.isConnecting = false;
      this.consecutiveFailures = 0;
      
      if (import.meta.env.DEV) {
        console.log('✅ WebSocket conectado com sucesso:', this.currentUrl);
      }
      
      // Tentar autenticar enviando token como mensagem (caso o servidor espere dessa forma)
      // Alguns servidores podem esperar autenticação após a conexão ser estabelecida
      const authState = useAuthStore.getState();
      const token = authState.sessionToken;
      
      if (token && this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          // Enviar mensagem de autenticação (alguns servidores esperam isso)
          // O servidor pode esperar: { type: 'auth', token: '...' } ou similar
          this.socket.send(JSON.stringify({ 
            type: 'authenticate', 
            token: token 
          }));
          
          if (import.meta.env.DEV) {
            console.log('🔐 Token de autenticação enviado via mensagem');
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Erro ao enviar token de autenticação:', error);
          }
        }
      }
      
      this.updateStatus({
        isConnected: true,
        reconnectAttempts: 0,
        lastError: undefined,
      });
      this.startPing();
    };

    this.socket.onclose = (event) => {
      const wasConnected = this.status.isConnected;
      
      // Resetar flag de conexão
      this.isConnecting = false;
      
      // CORREÇÃO 1: Não reconectar se foi fechamento intencional do servidor
      // (código 1000 com razão "Nova conexão do mesmo usuário")
      if (event.code === 1000 && event.reason === "Nova conexão do mesmo usuário") {
        if (import.meta.env.DEV) {
          console.log('ℹ️ WebSocket: Conexão fechada - outra sessão ativa. Não reconectando.');
        }
        this.updateStatus({
          isConnected: false,
          lastError: 'Outra sessão ativa - conexão fechada pelo servidor',
        });
        this.stopPing();
        this.socket = null;
        // Resetar contadores pois não é uma falha
        this.consecutiveFailures = 0;
        return; // NÃO reconectar
      }
      
      // Incrementar contador de falhas se não foi um fechamento limpo
      if (!event.wasClean) {
        this.consecutiveFailures++;
      } else {
        // Resetar se foi fechamento limpo (mas não o caso especial acima)
        this.consecutiveFailures = 0;
      }
      
      // Log detalhado em desenvolvimento para debug
      if (import.meta.env.DEV) {
        if (!event.wasClean) {
          console.warn('⚠️ WebSocket fechado:', {
            code: event.code,
            reason: event.reason || 'Sem razão fornecida',
            wasClean: event.wasClean,
            wasConnected,
            url: this.currentUrl,
          });
          
          // Mensagens específicas por código de erro
          if (event.code === 1006) {
            console.warn('💡 Dica: Código 1006 geralmente indica que o servidor rejeitou a conexão. Verifique se o token de autenticação está sendo enviado corretamente.');
          }
        }
      }
      
      this.updateStatus({
        isConnected: false,
        lastError: event.wasClean 
          ? undefined 
          : event.reason || `Conexão fechada (código: ${event.code})`,
      });
      this.stopPing();
      this.socket = null;

      if (this.shouldStayConnected && (forceReconnect || wasConnected || this.listeners.size > 0)) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (event) => {
      // Silenciar erros de conexão esperados (servidor não disponível)
      // Apenas logar em modo debug
      if (import.meta.env.DEV) {
        console.warn('⚠️ Erro no WebSocket:', event);
      }
      
      // Não fechar imediatamente - deixar o onclose lidar com isso
      // Isso evita o erro "closed before connection is established"
      this.updateStatus({
        lastError: 'Erro na conexão WebSocket',
      });
    };

    this.socket.onmessage = (event) => {
      this.updateStatus({
        lastEventAt: Date.now(),
        lastError: undefined,
      });

      try {
        const payload = typeof event.data === 'string' ? event.data : '';
        if (!payload) {
          console.warn('⚠️ WebSocket recebeu mensagem vazia');
          return;
        }
        
        const message = JSON.parse(payload) as OrderEventMessage;
        
        // Log detalhado em desenvolvimento
        if (import.meta.env.DEV) {
          console.log('📨 WebSocket mensagem recebida:', {
            type: message.type,
            order_id: message.order_id,
            has_order: !!message.order,
            listeners_count: this.listeners.size,
          });
        }
        
        // Notificar todos os listeners
        let processedCount = 0;
        this.listeners.forEach((listener) => {
          try {
            listener(message);
            processedCount++;
          } catch (error) {
            console.error('❌ Erro ao processar listener do WebSocket:', error);
          }
        });
        
        if (import.meta.env.DEV) {
          console.log(`✅ Mensagem processada por ${processedCount} listener(s)`);
        }
      } catch (error) {
        console.error('❌ Erro ao decodificar mensagem do WebSocket:', error);
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
      
      // Obter token de autenticação do store
      // Como estamos em uma classe, precisamos acessar o store de forma estática
      const authState = useAuthStore.getState();
      const token = authState.sessionToken;
      
      // Adicionar token como query parameter se disponível
      if (token) {
        url.searchParams.set('token', token);
      }
      
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
    
    // CORREÇÃO 4: Limitar número de tentativas de reconexão
    if (this.consecutiveFailures >= this.maxReconnectAttempts) {
      if (import.meta.env.DEV) {
        console.info(`ℹ️ WebSocket: Parando tentativas de reconexão após ${this.maxReconnectAttempts} tentativas. O sistema continuará funcionando normalmente sem atualizações em tempo real.`);
      }
      this.updateStatus({
        lastError: `WebSocket não disponível após ${this.maxReconnectAttempts} tentativas - funcionando sem tempo real`,
      });
      return;
    }
    
    // CORREÇÃO 3: Implementar exponential backoff
    // Calcular delay: 1s, 2s, 4s, 8s... máximo 30s
    const baseDelay = 1000; // 1 segundo base
    const maxDelay = 30000; // 30 segundos máximo
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, this.consecutiveFailures - 1),
      maxDelay
    );
    
    // CORREÇÃO 2: Garantir delay mínimo de 2-3 segundos
    const finalDelay = Math.max(exponentialDelay, this.minReconnectInterval);
    
    this.updateStatus({
      reconnectAttempts: this.status.reconnectAttempts + 1,
    });
    
    if (import.meta.env.DEV) {
      console.log(`🔄 WebSocket: Agendando reconexão em ${finalDelay}ms (tentativa ${this.consecutiveFailures + 1}/${this.maxReconnectAttempts})`);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.lastReconnectAttempt = Date.now();
      if (this.shouldStayConnected || this.listeners.size > 0) {
        this.ensureConnection();
      }
    }, finalDelay);
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

  /**
   * Envia uma mensagem via WebSocket para broadcast para outros clientes
   * @param message - Mensagem a ser enviada (será convertida para JSON)
   * @returns true se a mensagem foi enviada, false caso contrário
   */
  sendMessage(message: OrderEventMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ WebSocket não conectado, não foi possível enviar mensagem:', message);
      }
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      if (import.meta.env.DEV) {
        console.log('📤 Mensagem WebSocket enviada:', message);
      }
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem WebSocket:', error);
      return false;
    }
  }

  /**
   * Notifica outros clientes sobre atualização de status de pedido
   * @param orderId - ID do pedido atualizado
   * @param order - Dados do pedido (opcional, para incluir na notificação)
   */
  broadcastOrderStatusUpdate(orderId: number, order?: unknown): void {
    const message: OrderEventMessage = {
      type: 'order_status_updated',
      order_id: orderId,
      order: order,
      timestamp: Date.now(),
      broadcast: true, // Flag para indicar que é um broadcast do cliente
    };
    this.sendMessage(message);
  }

  /**
   * Notifica outros clientes sobre atualização de pedido
   * @param orderId - ID do pedido atualizado
   * @param order - Dados do pedido (opcional)
   */
  broadcastOrderUpdate(orderId: number, order?: unknown): void {
    const message: OrderEventMessage = {
      type: 'order_updated',
      order_id: orderId,
      order: order,
      timestamp: Date.now(),
      broadcast: true,
    };
    this.sendMessage(message);
  }

  /**
   * Notifica outros clientes sobre criação de pedido
   * @param orderId - ID do pedido criado
   * @param order - Dados do pedido (opcional)
   */
  broadcastOrderCreated(orderId: number, order?: unknown): void {
    const message: OrderEventMessage = {
      type: 'order_created',
      order_id: orderId,
      order: order,
      timestamp: Date.now(),
      broadcast: true,
    };
    this.sendMessage(message);
  }

  /**
   * Notifica outros clientes sobre exclusão de pedido
   * @param orderId - ID do pedido excluído
   */
  broadcastOrderDeleted(orderId: number): void {
    const message: OrderEventMessage = {
      type: 'order_deleted',
      order_id: orderId,
      timestamp: Date.now(),
      broadcast: true,
    };
    this.sendMessage(message);
  }
}

export const ordersSocket = new OrdersWebSocketManager();
