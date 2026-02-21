import { useChatStore } from '@/store/chatStore';
import { ChatWindow } from './ChatWindow';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

export function ChatBubble() {
    const { isOpen, unreadCount, toggleChat } = useChatStore();

    return (
        <>
            {/* Botão flutuante */}
            <button
                onClick={toggleChat}
                className={cn(
                    'fixed bottom-4 right-4 z-50',
                    'h-12 w-12 rounded-full shadow-lg',
                    'flex items-center justify-center',
                    'transition-all duration-300 ease-in-out',
                    'hover:scale-110 active:scale-95',
                    isOpen
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
                title={isOpen ? 'Fechar chat' : 'Abrir chat'}
                aria-label={isOpen ? 'Fechar chat' : 'Abrir chat'}
            >
                <MessageCircle className="h-5 w-5" />

                {/* Badge de não lidas */}
                {!isOpen && unreadCount > 0 && (
                    <span
                        className={cn(
                            'absolute -top-1 -right-1',
                            'min-w-[20px] h-5 px-1.5',
                            'flex items-center justify-center',
                            'bg-red-500 text-white text-[10px] font-bold rounded-full',
                            'animate-in zoom-in-50 fade-in-0',
                            unreadCount > 0 && 'animate-pulse'
                        )}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Janela do chat */}
            <ChatWindow />
        </>
    );
}
