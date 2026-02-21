import { useChatStore } from '@/store/chatStore';
import { chatSocket } from '@/lib/realtimeChat';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MessageCircleOff, Power } from 'lucide-react';

export default function ChatPage() {
    const { isChatEnabled, setChatEnabled } = useChatStore();

    if (!isChatEnabled) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-muted-foreground gap-4">
                <MessageCircleOff className="h-16 w-16 opacity-30" />
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground mb-1">Chat desativado</h2>
                    <p className="text-sm">O chat da rede está desativado para esta sessão.</p>
                </div>
                <button
                    onClick={() => {
                        setChatEnabled(true);
                        chatSocket.connect();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                    <Power className="h-4 w-4" />
                    Ativar Chat
                </button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Barra de ações */}
            <div className="flex items-center justify-end mb-3">
                <button
                    onClick={() => {
                        setChatEnabled(false);
                        chatSocket.disconnect();
                    }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive px-3 py-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                    title="Desativar chat"
                >
                    <Power className="h-3.5 w-3.5" />
                    Desativar Chat
                </button>
            </div>

            {/* Chat */}
            <div className="flex-1 min-h-0">
                <ChatWindow />
            </div>
        </div>
    );
}
