import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatSocket } from '@/lib/realtimeChat';
import { ChatWsMessage } from '@/types/chat';
import { ChatMessageItem } from './ChatMessage';
import { ChatUserList } from './ChatUserList';
import { cn } from '@/lib/utils';
import { Send, Wifi, WifiOff } from 'lucide-react';

export function ChatWindow() {
    const { messages, addMessage, setOnlineUsers, addUser, removeUser, resetUnread } =
        useChatStore();
    const { userId, username, sessionToken } = useAuthStore();
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll automático para novas mensagens
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Reset unread ao montar (página aberta = lendo)
    useEffect(() => {
        resetUnread();
    }, [resetUnread]);

    // Focus no input
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Conectar ao chat WebSocket
    useEffect(() => {
        if (!sessionToken) return;

        const handleMessage = (msg: ChatWsMessage) => {
            switch (msg.type) {
                case 'chat_message':
                    if (msg.id && msg.content && msg.userId !== undefined && msg.username) {
                        addMessage({
                            id: msg.id,
                            userId: msg.userId,
                            username: msg.username,
                            content: msg.content,
                            timestamp: msg.timestamp || new Date().toISOString(),
                            type: 'message',
                        });
                    }
                    break;

                case 'user_joined':
                    if (msg.user) {
                        addUser(msg.user);
                        addMessage({
                            id: crypto.randomUUID(),
                            userId: 0,
                            username: 'Sistema',
                            content: `${msg.user.username} entrou no chat`,
                            timestamp: new Date().toISOString(),
                            type: 'system',
                        });
                    }
                    break;

                case 'user_left':
                    if (msg.user) {
                        removeUser(msg.user.userId);
                        addMessage({
                            id: crypto.randomUUID(),
                            userId: 0,
                            username: 'Sistema',
                            content: `${msg.user.username} saiu do chat`,
                            timestamp: new Date().toISOString(),
                            type: 'system',
                        });
                    }
                    break;

                case 'users_list':
                    if (msg.users) {
                        setOnlineUsers(msg.users);
                    }
                    break;
            }
        };

        const unsubscribe = chatSocket.subscribe(handleMessage);
        const unsubscribeStatus = chatSocket.onStatus((status) => {
            setIsConnected(status.isConnected);
        });

        return () => {
            unsubscribe();
            unsubscribeStatus();
        };
    }, [sessionToken, addMessage, setOnlineUsers, addUser, removeUser]);

    const handleSend = useCallback(() => {
        const content = inputValue.trim();
        if (!content) return;

        const message = {
            id: crypto.randomUUID(),
            userId: userId ?? 0,
            username: username ?? 'Anônimo',
            content,
            timestamp: new Date().toISOString(),
            type: 'message' as const,
        };

        addMessage(message);
        chatSocket.sendChatMessage(content);
        setInputValue('');
        inputRef.current?.focus();
    }, [inputValue, userId, username, addMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background rounded-lg border border-border shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'h-2.5 w-2.5 rounded-full transition-colors',
                            isConnected ? 'bg-emerald-500' : 'bg-red-400'
                        )}
                    />
                    <h2 className="text-base font-semibold">Chat da Rede</h2>
                    <span className="text-xs text-muted-foreground">
                        {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <ChatUserList />
                    <div className="p-1.5 rounded-md text-muted-foreground" title={isConnected ? 'Conectado' : 'Desconectado'}>
                        {isConnected ? (
                            <Wifi className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <WifiOff className="h-4 w-4 text-red-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-0.5 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <p className="text-sm">Nenhuma mensagem ainda</p>
                        <p className="text-xs mt-1">Envie a primeira mensagem!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <ChatMessageItem key={msg.id} message={msg} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isConnected ? 'Digite sua mensagem...' : 'Conectando...'}
                        disabled={!isConnected}
                        className={cn(
                            'flex-1 text-sm bg-muted/50 border border-border rounded-lg px-4 py-2.5',
                            'placeholder:text-muted-foreground/60',
                            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'transition-all'
                        )}
                        maxLength={500}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!isConnected || !inputValue.trim()}
                        className={cn(
                            'p-2.5 rounded-lg transition-all',
                            'bg-primary text-primary-foreground',
                            'hover:bg-primary/90 active:scale-95',
                            'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
                        )}
                        title="Enviar (Enter)"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
