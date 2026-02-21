import { ChatMessage as ChatMessageType } from '@/types/chat';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
    message: ChatMessageType;
}

export function ChatMessageItem({ message }: ChatMessageProps) {
    const userId = useAuthStore((s) => s.userId);
    const isOwn = message.userId === userId;
    const isSystem = message.type === 'system';

    if (isSystem) {
        return (
            <div className="flex justify-center my-2">
                <span className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                    {message.content}
                </span>
            </div>
        );
    }

    const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className={cn('flex mb-2', isOwn ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm',
                    isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                )}
            >
                {!isOwn && (
                    <p className="text-[11px] font-semibold mb-0.5 opacity-80">
                        {message.username}
                    </p>
                )}
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {message.content}
                </p>
                <p
                    className={cn(
                        'text-[10px] mt-1 text-right',
                        isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                    )}
                >
                    {time}
                </p>
            </div>
        </div>
    );
}
