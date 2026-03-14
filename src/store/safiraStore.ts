import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface SafiraState {
  isOpen: boolean;
  messages: Message[];
  setIsOpen: (isOpen: boolean) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useSafiraStore = create<SafiraState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [], // Começa vazio, adicionaremos a mensagem inicial no componente se necessário
      setIsOpen: (isOpen) => set({ isOpen }),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      clearMessages: () => set({ 
        messages: [
          { 
            role: 'assistant', 
            content: 'Olá, eu sou a SAFIRA.\n\nPosso responder perguntas sobre pedidos, materiais, vendedores e produção.' 
          }
        ] 
      }),
    }),
    {
      name: 'safira-chat-history', // Nome mais claro conforme solicitado
      storage: createJSONStorage(() => localStorage), // Persistência real
    }
  )
);
