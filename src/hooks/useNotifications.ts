import { useEffect, useRef } from "react";
import { getApiUrl } from "../services/apiClient";
import { useAuthStore } from "../store/authStore";
import { useOrderStore } from "../store/orderStore";
import { api } from "../services/api";
import { OrderWithItems } from "../types";
import { toast } from "@/hooks/use-toast";

interface WebSocketMessage {
  type: 'order_created' | 'order_updated' | 'order_status_updated' | 'order_deleted';
  order?: OrderWithItems;
  order_id?: number;
  user_id?: number;
  username?: string;
}

export function useNotifications() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const { updateOrder, addOrder, removeOrder } = useOrderStore();
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000; // 3 segundos

  useEffect(() => {
    const apiUrl = getApiUrl();
    
    // Só conectar se API estiver configurada e usuário estiver autenticado
    if (!apiUrl || !isAuthenticated || !sessionToken) {
      // Fechar conexão existente se houver
      if (wsRef.current) {
        wsRef.current.close(1000, 'API not configured or not authenticated');
        wsRef.current = null;
      }
      return;
    }

    // Função para conectar ao WebSocket
    const connectWebSocket = () => {
      try {
        // Converter http:// para ws:// ou https:// para wss://
        let wsUrl = apiUrl;
        if (wsUrl.startsWith('https://')) {
          wsUrl = wsUrl.replace(/^https:/, 'wss:');
        } else if (wsUrl.startsWith('http://')) {
          wsUrl = wsUrl.replace(/^http:/, 'ws:');
        } else {
          // Se não começar com http/https, assumir ws://
          wsUrl = 'ws://' + wsUrl;
        }
        wsUrl = wsUrl + '/ws/orders?token=' + encodeURIComponent(sessionToken);
        
        console.log('[WebSocket] Conectando ao WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('[WebSocket] Conectado com sucesso');
          reconnectAttempts.current = 0;
        };
        
        ws.onmessage = async (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('[WebSocket] Mensagem recebida:', message.type, message.order_id);
            
            switch (message.type) {
              case 'order_created':
                if (message.order) {
                  addOrder(message.order);
                  toast({
                    title: "Novo pedido criado",
                    description: `Pedido #${message.order.numero || message.order.id} foi criado${message.username ? ` por ${message.username}` : ''}`,
                  });
                }
                break;
                
              case 'order_updated':
              case 'order_status_updated':
                if (message.order) {
                  updateOrder(message.order);
                  if (message.type === 'order_status_updated') {
                    toast({
                      title: "Status atualizado",
                      description: `Status do pedido #${message.order.numero || message.order.id} foi atualizado${message.username ? ` por ${message.username}` : ''}`,
                    });
                  }
                } else if (message.order_id) {
                  // Se não veio o pedido completo, buscar do servidor
                  try {
                    const updatedOrder = await api.getOrderById(message.order_id);
                    updateOrder(updatedOrder);
                  } catch (error) {
                    console.error('[WebSocket] Erro ao buscar pedido atualizado:', error);
                  }
                }
                break;
                
              case 'order_deleted':
                if (message.order_id) {
                  removeOrder(message.order_id);
                  toast({
                    title: "Pedido excluído",
                    description: `Pedido #${message.order_id} foi excluído${message.username ? ` por ${message.username}` : ''}`,
                  });
                }
                break;
            }
          } catch (error) {
            console.error('[WebSocket] Erro ao processar mensagem:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('[WebSocket] Erro na conexão:', error);
        };
        
        ws.onclose = (event) => {
          console.log('[WebSocket] Conexão fechada:', event.code, event.reason);
          
          // Tentar reconectar se não foi um fechamento intencional
          if (event.code !== 1000 && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts.current++;
            console.log(`[WebSocket] Tentando reconectar (tentativa ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, RECONNECT_DELAY);
          } else if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.error('[WebSocket] Máximo de tentativas de reconexão atingido');
          }
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error('[WebSocket] Erro ao criar conexão:', error);
      }
    };

    // Conectar ao WebSocket
    connectWebSocket();

    // Cleanup: fechar conexão e limpar timeout de reconexão
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, sessionToken, updateOrder, addOrder, removeOrder]);

  return null;
}

