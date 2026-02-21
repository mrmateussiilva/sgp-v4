import { create } from 'zustand';
import { ChatMessage, ChatUser } from '@/types/chat';

const MAX_MESSAGES = 200;

interface ChatState {
    messages: ChatMessage[];
    onlineUsers: ChatUser[];
    isOpen: boolean;
    unreadCount: number;

    addMessage: (message: ChatMessage) => void;
    setOnlineUsers: (users: ChatUser[]) => void;
    addUser: (user: ChatUser) => void;
    removeUser: (userId: number) => void;
    toggleChat: () => void;
    openChat: () => void;
    closeChat: () => void;
    resetUnread: () => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
    messages: [],
    onlineUsers: [],
    isOpen: false,
    unreadCount: 0,

    addMessage: (message) => {
        set((state) => {
            const messages = [...state.messages, message].slice(-MAX_MESSAGES);
            const unreadCount = state.isOpen ? 0 : state.unreadCount + 1;
            return { messages, unreadCount };
        });
    },

    setOnlineUsers: (users) => set({ onlineUsers: users }),

    addUser: (user) => {
        set((state) => {
            // Não duplicar
            if (state.onlineUsers.some((u) => u.userId === user.userId)) {
                return state;
            }
            return { onlineUsers: [...state.onlineUsers, user] };
        });
    },

    removeUser: (userId) => {
        set((state) => ({
            onlineUsers: state.onlineUsers.filter((u) => u.userId !== userId),
        }));
    },

    toggleChat: () => {
        const isOpen = !get().isOpen;
        set({ isOpen, unreadCount: isOpen ? 0 : get().unreadCount });
    },

    openChat: () => set({ isOpen: true, unreadCount: 0 }),
    closeChat: () => set({ isOpen: false }),
    resetUnread: () => set({ unreadCount: 0 }),
    clearMessages: () => set({ messages: [] }),
}));
