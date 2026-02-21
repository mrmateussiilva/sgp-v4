import { getApiUrl } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { ChatSocketStatus, ChatWsMessage } from '@/types/chat';

// ========================================
// CHAT WEBSOCKET MANAGER
// Segue o mesmo padrão de OrdersWebSocketManager
// ========================================

type ChatMessageListener = (message: ChatWsMessage) => void;
type ChatStatusListener = (status: ChatSocketStatus) => void;

const INITIAL_STATUS: ChatSocketStatus = {
    isConnected: false,
    reconnectAttempts: 0,
    lastEventAt: null,
};

class ChatWebSocketManager {
    private socket: WebSocket | null = null;
    private currentUrl: string | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private listeners = new Set<ChatMessageListener>();
    private statusListeners = new Set<ChatStatusListener>();
    private status: ChatSocketStatus = { ...INITIAL_STATUS };
    private shouldStayConnected = false;
    private maxReconnectAttempts = 10;
    private consecutiveFailures = 0;
    private isConnecting = false;
    private lastReconnectAttempt = 0;
    private minReconnectInterval = 2000;

    subscribe(listener: ChatMessageListener): () => void {
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

    onStatus(listener: ChatStatusListener): () => void {
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

    getCurrentStatus(): ChatSocketStatus {
        return this.status;
    }

    /**
     * Envia uma mensagem de chat para todos os clientes conectados
     */
    sendChatMessage(content: string): boolean {
        const authState = useAuthStore.getState();
        const message: ChatWsMessage = {
            type: 'chat_message',
            id: crypto.randomUUID(),
            content,
            userId: authState.userId ?? 0,
            username: authState.username ?? 'Anônimo',
            timestamp: new Date().toISOString(),
        };
        return this.send(message);
    }

    private send(message: ChatWsMessage): boolean {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            if (import.meta.env.DEV) {
                logger.warn('⚠️ Chat WebSocket não conectado, mensagem não enviada');
            }
            return false;
        }

        try {
            this.socket.send(JSON.stringify(message));
            if (import.meta.env.DEV) {
                logger.debug('📤 Chat mensagem enviada:', message.type);
            }
            return true;
        } catch (error) {
            logger.error('❌ Erro ao enviar mensagem de chat:', error);
            return false;
        }
    }

    // ========================================
    // CONEXÃO WebSocket (mesma lógica de realtimeOrders.ts)
    // ========================================

    private ensureConnection(forceReconnect = false): void {
        if (this.isConnecting && !forceReconnect) {
            return;
        }

        const now = Date.now();
        const timeSinceLastAttempt = now - this.lastReconnectAttempt;
        if (timeSinceLastAttempt < this.minReconnectInterval && !forceReconnect && this.lastReconnectAttempt > 0) {
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

        if (this.socket) {
            const currentState = this.socket.readyState;

            if (!forceReconnect && (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING)) {
                if (this.currentUrl && this.currentUrl !== wsUrl) {
                    forceReconnect = true;
                } else {
                    return;
                }
            }

            if (forceReconnect || (this.currentUrl && this.currentUrl !== wsUrl)) {
                if (currentState === WebSocket.CONNECTING) {
                    setTimeout(() => {
                        if (this.socket) {
                            try {
                                const state = this.socket.readyState;
                                if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
                                    this.socket.close(1000, 'Reconnecting');
                                }
                            } catch (_e) {
                                // Ignorar erros ao fechar
                            }
                            this.socket = null;
                            this.isConnecting = false;
                            if (this.shouldStayConnected) {
                                this.ensureConnection(false);
                            }
                        }
                    }, 200);
                    return;
                }

                try {
                    if (currentState === WebSocket.OPEN) {
                        this.socket.close(1000, 'Reconnecting');
                    }
                } catch (_e) {
                    // Ignorar
                }
                this.socket = null;
            } else if (currentState === WebSocket.CLOSED || currentState === WebSocket.CLOSING) {
                this.socket = null;
            }
        }

        this.currentUrl = wsUrl;
        this.clearReconnectTimer();
        this.isConnecting = true;

        try {
            if (import.meta.env.DEV) {
                logger.debug('🔌 Chat: Conectando WebSocket:', wsUrl);
            }
            this.socket = new WebSocket(wsUrl);
        } catch (error) {
            this.isConnecting = false;
            if (import.meta.env.DEV) {
                logger.warn('⚠️ Chat: Erro ao criar WebSocket:', error);
            }
            this.scheduleReconnect();
            return;
        }

        this.socket.onopen = () => {
            this.isConnecting = false;
            this.consecutiveFailures = 0;

            if (import.meta.env.DEV) {
                logger.debug('✅ Chat WebSocket conectado');
            }

            // Enviar autenticação
            const authState = useAuthStore.getState();
            const token = authState.sessionToken;
            if (token && this.socket && this.socket.readyState === WebSocket.OPEN) {
                try {
                    this.socket.send(JSON.stringify({
                        type: 'authenticate',
                        token,
                    }));
                } catch (error) {
                    if (import.meta.env.DEV) {
                        logger.warn('⚠️ Chat: Erro ao enviar autenticação:', error);
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
            this.isConnecting = false;

            if (import.meta.env.DEV) {
                logger.debug('🔌 Chat WebSocket fechado:', {
                    code: event.code,
                    reason: event.reason || 'Sem razão',
                    wasClean: event.wasClean,
                });
            }

            // Fechamento por outra sessão
            if (event.code === 1000 && event.reason === 'Nova conexão do mesmo usuário') {
                this.updateStatus({
                    isConnected: false,
                    lastError: 'Outra sessão ativa',
                });
                this.stopPing();
                this.socket = null;
                this.consecutiveFailures = 0;
                return;
            }

            // Token inválido
            if (event.code === 1008) {
                this.updateStatus({
                    isConnected: false,
                    lastError: event.reason || 'Token inválido',
                });
                this.stopPing();
                this.socket = null;
                this.consecutiveFailures = 0;
                return;
            }

            if (!event.wasClean) {
                this.consecutiveFailures++;
            } else {
                this.consecutiveFailures = 0;
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

        this.socket.onerror = () => {
            if (import.meta.env.DEV) {
                logger.error('❌ Chat: Erro no WebSocket');
            }
            this.updateStatus({ lastError: 'Erro na conexão WebSocket' });
        };

        this.socket.onmessage = (event) => {
            this.updateStatus({ lastEventAt: Date.now(), lastError: undefined });

            try {
                const payload = typeof event.data === 'string' ? event.data : '';
                if (!payload) return;

                const message = JSON.parse(payload) as ChatWsMessage;

                if (import.meta.env.DEV) {
                    logger.debug('📨 Chat mensagem recebida:', message.type);
                }

                this.listeners.forEach((listener) => {
                    try {
                        listener(message);
                    } catch (error) {
                        logger.error('❌ Chat: Erro em listener:', error);
                    }
                });
            } catch (error) {
                logger.error('❌ Chat: Erro ao decodificar mensagem:', error);
            }
        };
    }

    private buildWebSocketUrl(): string | null {
        const apiBase = getApiUrl();
        if (!apiBase) return null;

        try {
            const url = new URL(apiBase);
            url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            url.pathname = '/ws/chat';

            const authState = useAuthStore.getState();
            const token = authState.sessionToken;
            if (token) {
                url.searchParams.set('token', token);
            }

            url.hash = '';
            return url.toString();
        } catch (error) {
            logger.error('Chat: URL inválida para WebSocket:', apiBase, error);
            return null;
        }
    }

    private scheduleReconnect(): void {
        if (!this.shouldStayConnected || this.reconnectTimer) return;

        if (this.consecutiveFailures >= this.maxReconnectAttempts) {
            if (import.meta.env.DEV) {
                logger.info(`ℹ️ Chat: Parando reconexão após ${this.maxReconnectAttempts} tentativas`);
            }
            this.updateStatus({
                lastError: `Chat indisponível após ${this.maxReconnectAttempts} tentativas`,
            });
            return;
        }

        const baseDelay = 1000;
        const maxDelay = 30000;
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, this.consecutiveFailures - 1), maxDelay);
        const finalDelay = Math.max(exponentialDelay, this.minReconnectInterval);

        this.updateStatus({ reconnectAttempts: this.status.reconnectAttempts + 1 });

        if (import.meta.env.DEV) {
            logger.debug(`🔄 Chat: Reconectando em ${finalDelay}ms (${this.consecutiveFailures + 1}/${this.maxReconnectAttempts})`);
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
                    logger.warn('Chat: Falha ao enviar ping:', error);
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
        if (this.listeners.size > 0) return;
        this.shouldStayConnected = false;
        this.disconnect();
    }

    private updateStatus(patch: Partial<ChatSocketStatus>): void {
        this.status = { ...this.status, ...patch };
        this.statusListeners.forEach((listener) => {
            try {
                listener(this.status);
            } catch (error) {
                logger.error('Chat: Erro em listener de status:', error);
            }
        });
    }
}

export const chatSocket = new ChatWebSocketManager();
