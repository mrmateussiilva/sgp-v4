import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// Tipos para as notificações
export interface OrderNotification {
  notification_type: 'OrderCreated' | 'OrderUpdated' | 'OrderDeleted' | 'OrderStatusChanged' | 'OrderStatusFlagsUpdated' | 'Heartbeat' | 'ClientConnected' | 'ClientDisconnected';
  order_id: number;
  order_numero?: string;
  timestamp: string;
  user_id?: number;
  details?: string;
  client_id?: string;
  broadcast_to_all: boolean;
}

// Gerenciador global de notificações (Singleton)
class GlobalNotificationManager {
  private static instance: GlobalNotificationManager;
  private clientId: string;
  private isConnected: boolean = false;
  private unlistenRef: UnlistenFn | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private eventName: string = '';
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // ID único baseado no timestamp da aplicação
    this.clientId = 'sgp_app_' + Date.now().toString(36);
    this.eventName = `order-notification-${this.clientId}`;
  }

  public static getInstance(): GlobalNotificationManager {
    if (!GlobalNotificationManager.instance) {
      GlobalNotificationManager.instance = new GlobalNotificationManager();
    }
    return GlobalNotificationManager.instance;
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public async connect(): Promise<void> {
    // Evitar múltiplas conexões simultâneas
    if (this.isConnected) {
      console.log(`Cliente ${this.clientId} já está conectado, ignorando nova tentativa`);
      return;
    }

    try {
      // Tentar inscrever no sistema de notificações
      const result = await invoke<string>('subscribe_to_notifications', { clientId: this.clientId });
      console.log(`Tentativa de conexão: ${result}`);
      
      // Se a conexão foi bem-sucedida ou o cliente já estava conectado
      if (result.includes('conectado') || result.includes('inscrito')) {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Configurar listener único para este cliente (apenas se não existir)
        if (!this.unlistenRef) {
          const unlisten = await listen<OrderNotification>(this.eventName, (event) => {
            const notification = event.payload;
            
            // Logs reduzidos - apenas para eventos importantes
            switch (notification.notification_type) {
              case 'OrderStatusChanged':
              case 'OrderStatusFlagsUpdated':
                console.log(`📡 Evento crítico recebido:`, notification);
                // Aqui você pode disparar callbacks específicos ou atualizar estado
                break;
              case 'Heartbeat':
                // Não logar heartbeats para reduzir spam
                break;
              default:
                console.log(`📡 Evento recebido:`, notification.notification_type);
            }
          });
          
          this.unlistenRef = unlisten;
        }

        // Iniciar heartbeat automático
        this.startHeartbeat();
        
      } else {
        console.warn(`Falha na conexão: ${result}`);
        this.reconnectAttempts++;
      }
      
    } catch (error) {
      console.error('Erro ao conectar ao sistema de notificações:', error);
      this.reconnectAttempts++;
      
      // Tentar reconectar apenas se não excedeu o limite
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => {
          this.connect();
        }, 2000); // Aguardar 2 segundos antes de tentar novamente
      } else {
        console.error('Máximo de tentativas de reconexão atingido');
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      // Cancelar inscrição no backend
      await invoke<string>('unsubscribe_from_notifications', { clientId: this.clientId });
      
      // Remover listener do frontend
      if (this.unlistenRef) {
        this.unlistenRef();
        this.unlistenRef = null;
      }

      // Parar heartbeat
      this.stopHeartbeat();
      
      this.isConnected = false;
      console.log(`Cliente ${this.clientId} desconectado do sistema de notificações`);
      
    } catch (error) {
      console.error('Erro ao desconectar do sistema de notificações:', error);
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await invoke<string>('send_heartbeat', { clientId: this.clientId });
    } catch (error) {
      console.error('Erro ao enviar heartbeat:', error);
      // Se o heartbeat falhar, tentar reconectar
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log('Heartbeat falhou, tentando reconectar...');
        this.isConnected = false;
        this.connect();
      }
    }
  }

  private startHeartbeat(): void {
    // Parar heartbeat anterior se existir
    this.stopHeartbeat();
    
    // Iniciar novo heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30 segundos
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Método para reconectar manualmente
  public async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  // Método para obter status da conexão
  public getStatus(): { clientId: string; isConnected: boolean; reconnectAttempts: number } {
    return {
      clientId: this.clientId,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Hook global único para toda a aplicação
export function useGlobalNotifications() {
  const manager = GlobalNotificationManager.getInstance();
  
  // Conectar automaticamente quando o hook é usado
  React.useEffect(() => {
    manager.connect();
    
    // Cleanup quando o componente desmonta
    return () => {
      manager.disconnect();
    };
  }, []);
  
  return {
    clientId: manager.getClientId(),
    isConnected: manager.getIsConnected(),
    status: manager.getStatus(),
    reconnect: () => manager.reconnect(),
    connect: () => manager.connect(),
    disconnect: () => manager.disconnect(),
  };
}

// Exportar o gerenciador para uso direto
export { GlobalNotificationManager };

// Exemplo de uso em um componente
export function GlobalNotificationExample() {
  const { clientId, isConnected, status, reconnect } = useGlobalNotifications();

  const handleTestConnection = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  const handleReconnect = async () => {
    await reconnect();
  };

  return (
    <div>
      <h3>Sistema de Notificações Global</h3>
      <p>Client ID: {clientId}</p>
      <p>Status: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      <p>Tentativas de reconexão: {status.reconnectAttempts}</p>
      
      <button onClick={handleTestConnection}>
        {isConnected ? 'Desconectar' : 'Conectar'}
      </button>
      
      <button onClick={handleReconnect}>
        Reconectar
      </button>
    </div>
  );
}
