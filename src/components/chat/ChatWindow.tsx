import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { chatSocket } from '@/lib/realtimeChat';
import { ChatWsMessage } from '@/types/chat';
import { ChatMessageItem } from './ChatMessage';
import { ChatUserList } from './ChatUserList';
import { cn } from '@/lib/utils';
import { X, Send, Wifi, WifiOff, Minus } from 'lucide-react';

export function ChatWindow() {
    const { messages, isOpen, closeChat, addMessage, setOnlineUsers, addUser, removeUser } =
        useChatStore();
    const { userId, username, sessionToken } = useAuthStore();
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll automático para novas mensagens
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Focus no input quando abrir
    useEffect(() => {
        if (isOpen && !isMinimized) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isMinimized]);

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

        // Adicionar localmente (otimista)
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

    if (!isOpen) return null;

    return (
        <div
            className={cn(
                'fixed bottom-20 right-4 z-50 flex flex-col',
                'bg-background border border-border rounded-xl shadow-2xl',
                'transition-all duration-300 ease-in-out',
                'animate-in slide-in-from-bottom-4 fade-in-0',
                isMinimized ? 'w-72 h-12' : 'w-[380px] h-[520px]'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            'h-2 w-2 rounded-full transition-colors',
                            isConnected ? 'bg-emerald-500' : 'bg-red-400'
                        )}
                    />
                    <h3 className="text-sm font-semibold">Chat da Rede</h3>
                </div>
                <div className="flex items-center gap-0.5">
                    {!isMinimized && <ChatUserList />}
                    {!isMinimized && (
                        <button
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            title={isConnected ? 'Conectado' : 'Desconectado'}
                        >
                            {isConnected ? (
                                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                                <WifiOff className="h-3.5 w-3.5 text-red-400" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        title={isMinimized ? 'Expandir' : 'Minimizar'}
                    >
                        <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={closeChat}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        title="Fechar"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scroll-smooth">
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
                    <div className="border-t p-3">
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
                                    'flex-1 text-sm bg-muted/50 border border-border rounded-lg px-3 py-2',
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
                                    'p-2 rounded-lg transition-all',
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
                </>
            )}
        </div>
    );
}
