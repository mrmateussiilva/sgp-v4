import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, ChatUser } from '@/types/chat';

const MAX_MESSAGES = 200;

interface ChatState {
    messages: ChatMessage[];
    onlineUsers: ChatUser[];
    unreadCount: number;
    isChatEnabled: boolean;

    addMessage: (message: ChatMessage) => void;
    setOnlineUsers: (users: ChatUser[]) => void;
    addUser: (user: ChatUser) => void;
    removeUser: (userId: number) => void;
    resetUnread: () => void;
    clearMessages: () => void;
    toggleChatEnabled: () => void;
    setChatEnabled: (enabled: boolean) => void;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            messages: [],
            onlineUsers: [],
            unreadCount: 0,
            isChatEnabled: true,

            addMessage: (message) => {
                set((state) => {
                    const messages = [...state.messages, message].slice(-MAX_MESSAGES);
                    return { messages, unreadCount: state.unreadCount + 1 };
                });
            },

            setOnlineUsers: (users) => set({ onlineUsers: users }),

            addUser: (user) => {
                set((state) => {
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

            resetUnread: () => set({ unreadCount: 0 }),
            clearMessages: () => set({ messages: [] }),
            toggleChatEnabled: () => set((state) => ({ isChatEnabled: !state.isChatEnabled })),
            setChatEnabled: (enabled) => set({ isChatEnabled: enabled }),
        }),
        {
            name: 'sgp-chat-preferences',
            partialize: (state) => ({
                isChatEnabled: state.isChatEnabled,
            }),
        }
    )
);
