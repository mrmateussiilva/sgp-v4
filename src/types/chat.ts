// ========================================
// TIPOS DO CHAT EM REDE
// ========================================

export interface ChatMessage {
    id: string;
    userId: number;
    username: string;
    content: string;
    timestamp: string; // ISO 8601
    type: 'message' | 'system';
}

export interface ChatUser {
    userId: number;
    username: string;
    connectedAt: string;
}

export interface ChatSocketStatus {
    isConnected: boolean;
    reconnectAttempts: number;
    lastEventAt: number | null;
    lastError?: string;
}

// Mensagens enviadas/recebidas via WebSocket
export interface ChatWsMessage {
    type: 'chat_message' | 'user_joined' | 'user_left' | 'users_list' | 'ping' | 'pong' | 'authenticate';
    // chat_message
    id?: string;
    content?: string;
    userId?: number;
    username?: string;
    timestamp?: string;
    // user_joined / user_left
    user?: ChatUser;
    // users_list
    users?: ChatUser[];
    // authenticate
    token?: string;
}
