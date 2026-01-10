import { useToast } from './use-toast';
import { NotificationType, OrderNotification } from './useRealtimeNotifications';

// ========================================
// SISTEMA DE PRIORIDADES
// ========================================

export enum NotificationPriority {
  CRITICAL = 0,  // Delete - sempre mostra imediatamente
  HIGH = 1,      // Created - sempre mostra, mas agrupa
  MEDIUM = 2,    // StatusChanged - mostra com throttle
  LOW = 3        // Updated - não mostra toast (apenas atualiza)
}

const PRIORITY_MAP: Record<NotificationType, NotificationPriority> = {
  [NotificationType.OrderDeleted]: NotificationPriority.CRITICAL,
  [NotificationType.OrderCreated]: NotificationPriority.HIGH,
  [NotificationType.OrderStatusChanged]: NotificationPriority.MEDIUM,
  [NotificationType.OrderUpdated]: NotificationPriority.LOW,
};

// ========================================
// CONFIGURAÇÕES
// ========================================

const GROUP_WINDOW_MS = 5000; // 5 segundos para agrupar notificações similares
const THROTTLE_MS = 10000; // 10 segundos entre notificações do mesmo tipo
const DEBOUNCE_MS = 2000; // 2 segundos para debounce

// ========================================
// TIPOS
// ========================================

interface GroupedNotification {
  type: NotificationType;
  notifications: OrderNotification[];
  firstTimestamp: number;
  lastTimestamp: number;
}

interface NotificationQueueItem {
  notification: OrderNotification;
  timestamp: number;
  priority: NotificationPriority;
}

interface ThrottleState {
  lastShown: Map<NotificationType, number>;
  groups: Map<NotificationType, GroupedNotification>;
}

// ========================================
// GERENCIADOR DE NOTIFICAÇÕES
// ========================================

export class NotificationManager {
  private throttleState: ThrottleState = {
    lastShown: new Map(),
    groups: new Map(),
  };
  private debounceTimer: NodeJS.Timeout | null = null;
  private queue: NotificationQueueItem[] = [];

  constructor(private toastFn: ReturnType<typeof useToast>['toast']) {}

  /**
   * Processa uma notificação usando o sistema inteligente
   */
  processNotification(notification: OrderNotification): boolean {
    const priority = PRIORITY_MAP[notification.notification_type];
    
    // Notificações LOW (Updated) nunca mostram toast
    if (priority === NotificationPriority.LOW) {
      return false;
    }

    // Notificações CRITICAL (Deleted) sempre mostram imediatamente
    if (priority === NotificationPriority.CRITICAL) {
      this.showNotification(notification);
      return true;
    }

    // Adicionar à fila com debounce
    this.queue.push({
      notification,
      timestamp: Date.now(),
      priority,
    });

    // Debounce: aguardar um pouco antes de processar
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, DEBOUNCE_MS);

    return true;
  }

  /**
   * Processa a fila de notificações
   */
  private processQueue(): void {
    if (this.queue.length === 0) return;

    // Separar por tipo
    const byType = new Map<NotificationType, NotificationQueueItem[]>();
    
    for (const item of this.queue) {
      if (!byType.has(item.notification.notification_type)) {
        byType.set(item.notification.notification_type, []);
      }
      byType.get(item.notification.notification_type)!.push(item);
    }

    // Processar cada tipo
    for (const [type, items] of byType) {
      const priority = PRIORITY_MAP[type];
      const now = Date.now();
      
      // Verificar throttle apenas para MEDIUM
      const lastShown = this.throttleState.lastShown.get(type) || 0;
      
      if (priority === NotificationPriority.MEDIUM && now - lastShown < THROTTLE_MS) {
        // Throttle: agrupar em grupo temporário
        this.addToGroup(type, items);
        continue;
      }

      // Para HIGH (Created): agrupar se houver múltiplas
      if (priority === NotificationPriority.HIGH && this.shouldGroup(items)) {
        this.showGrouped(type, items);
      } else if (items.length > 0) {
        // Mostrar a mais recente (primeira na lista)
        this.showNotification(items[0].notification);
      }
      
      this.throttleState.lastShown.set(type, now);
    }

    // Limpar fila
    this.queue = [];
    this.debounceTimer = null;
  }

  /**
   * Verifica se notificações devem ser agrupadas
   */
  private shouldGroup(items: NotificationQueueItem[]): boolean {
    if (items.length <= 1) return false;
    
    const priority = PRIORITY_MAP[items[0].notification.notification_type];
    
    // Agrupar apenas notificações HIGH (Created)
    return priority === NotificationPriority.HIGH && items.length > 1;
  }

  /**
   * Adiciona notificações a um grupo (throttled)
   */
  private addToGroup(type: NotificationType, items: NotificationQueueItem[]): void {
    const existing = this.throttleState.groups.get(type);
    const now = Date.now();

    if (existing) {
      // Adicionar ao grupo existente
      existing.notifications.push(...items.map(i => i.notification));
      existing.lastTimestamp = now;
    } else {
      // Criar novo grupo
      this.throttleState.groups.set(type, {
        type,
        notifications: items.map(i => i.notification),
        firstTimestamp: items[0]?.timestamp || now,
        lastTimestamp: now,
      });

      // Mostrar grupo após GROUP_WINDOW_MS se não houver novas notificações
      setTimeout(() => {
        const group = this.throttleState.groups.get(type);
        if (group && group.lastTimestamp === now) {
          // Converter para items para mostrar agrupado
          const groupItems: NotificationQueueItem[] = group.notifications.map(n => ({
            notification: n,
            timestamp: group.firstTimestamp,
            priority: PRIORITY_MAP[n.notification_type],
          }));
          
          if (groupItems.length > 1) {
            this.showGrouped(type, groupItems);
          } else if (groupItems.length === 1) {
            this.showNotification(groupItems[0].notification);
          }
          
          this.throttleState.groups.delete(type);
          this.throttleState.lastShown.set(type, Date.now());
        }
      }, GROUP_WINDOW_MS);
    }
  }

  /**
   * Mostra uma notificação agrupada
   */
  private showGrouped(type: NotificationType, items: NotificationQueueItem[]): void {
    const notifications = items.map(i => i.notification);
    const count = notifications.length;

    if (count === 0) return;

    // Buscar informações do primeiro pedido para título
    const first = notifications[0];

    // Criar descrição agrupada
    let description = '';
    let title = '';
    let variant: "success" | "warning" | "info" | "destructive" = "success";
    
    if (count === 1) {
      // Não deveria acontecer quando agrupando, mas por segurança
      this.showNotification(first);
      return;
    } else if (type === NotificationType.OrderStatusChanged) {
      variant = "warning";
      title = "Status Atualizados";
      if (count <= 3) {
        const orderNums = notifications
          .map(n => `#${n.order_numero || n.order_id}`)
          .join(', ');
        description = `${count} pedidos: ${orderNums}`;
      } else {
        description = `${count} pedidos atualizados`;
      }
    } else {
      // OrderCreated
      variant = "success";
      title = "Novos Pedidos";
      if (count <= 3) {
        const orderNums = notifications
          .map(n => `#${n.order_numero || n.order_id}`)
          .join(', ');
        description = `${count} novos pedidos: ${orderNums}`;
      } else {
        description = `${count} novos pedidos`;
      }
    }

    this.toastFn({
      title,
      description,
      variant,
      duration: count > 3 ? 4000 : 3000, // Mais tempo se tiver muitos pedidos
    });
  }

  /**
   * Mostra uma notificação individual
   */
  private showNotification(notification: OrderNotification): void {
    const priority = PRIORITY_MAP[notification.notification_type];
    
    // Não mostrar LOW
    if (priority === NotificationPriority.LOW) {
      return;
    }

    const orderNum = notification.order_numero || notification.order_id;
    let title = '';
    let description = '';
    let variant: "success" | "warning" | "info" | "destructive" = "success";
    let duration = 3000;

    switch (notification.notification_type) {
      case NotificationType.OrderCreated:
        title = "Novo Pedido";
        description = `#${orderNum}`;
        variant = "success";
        break;

      case NotificationType.OrderDeleted:
        title = "Pedido Excluído";
        description = `#${orderNum}`;
        variant = "destructive";
        break;

      case NotificationType.OrderStatusChanged:
        title = "Status Atualizado";
        description = notification.details 
          ? `#${orderNum} - ${notification.details}` 
          : `#${orderNum}`;
        variant = "warning";
        break;

      default:
        return; // Não mostrar outros tipos
    }

    this.toastFn({
      title,
      description,
      variant,
      duration,
    });
  }

  /**
   * Limpa o estado do gerenciador
   */
  clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.queue = [];
    this.throttleState = {
      lastShown: new Map(),
      groups: new Map(),
    };
  }
}

