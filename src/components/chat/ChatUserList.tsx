import { useChatStore } from '@/store/chatStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatUserList() {
    const onlineUsers = useChatStore((s) => s.onlineUsers);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                    title="Usuários online"
                >
                    <Users className="h-3.5 w-3.5" />
                    <span>{onlineUsers.length}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-56 p-2"
                side="bottom"
                align="end"
            >
                <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                    Online ({onlineUsers.length})
                </p>
                {onlineUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-1">
                        Nenhum usuário conectado
                    </p>
                ) : (
                    <ul className="space-y-0.5">
                        {onlineUsers.map((user) => (
                            <li
                                key={user.userId}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                            >
                                <div
                                    className={cn(
                                        'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold',
                                        'bg-primary/10 text-primary'
                                    )}
                                >
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {user.username}
                                    </p>
                                </div>
                                <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            </li>
                        ))}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    );
}
