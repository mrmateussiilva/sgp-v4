import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas

interface AuthState {
  isAuthenticated: boolean;
  userId: number | null;
  username: string | null;
  isAdmin: boolean; // Mantido para compatibilidade com código existente
  roles: string[]; // Novos roles vindos do JWT
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  login: (payload: {
    userId: number;
    username: string;
    sessionToken: string;
    isAdmin?: boolean;
    roles?: string[];
    expiresInSeconds?: number;
  }) => void;
  logout: () => void;
}

const createInitialState = (): Omit<AuthState, 'login' | 'logout'> => ({
  isAuthenticated: false,
  userId: null,
  username: null,
  isAdmin: false,
  roles: [],
  sessionToken: null,
  sessionExpiresAt: null,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...createInitialState(),
      login: ({ userId, username, sessionToken, isAdmin = false, roles = [], expiresInSeconds }) => {
        const ttlMs =
          typeof expiresInSeconds === 'number' && expiresInSeconds > 0
            ? expiresInSeconds * 1000
            : DEFAULT_SESSION_TTL_MS;
        
        // Se isAdmin for true mas não estiver em roles, adicionar 'ADMIN' para compatibilidade
        const normalizedRoles = [...roles];
        if (isAdmin && !normalizedRoles.includes('ADMIN')) {
          normalizedRoles.push('ADMIN');
        }
        
        set({
          isAuthenticated: true,
          userId,
          username,
          isAdmin,
          roles: normalizedRoles,
          sessionToken,
          sessionExpiresAt: Date.now() + ttlMs,
        });
      },
      logout: () => set(createInitialState()),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        queueMicrotask(() => {
          const { sessionToken, sessionExpiresAt, logout } = state;
          if (!sessionToken || !sessionExpiresAt || sessionExpiresAt <= Date.now()) {
            logout();
          } else {
            // Migração: garantir que roles existe para usuários antigos
            if (!state.roles) {
              state.roles = [];
              // Se isAdmin é true, adicionar ADMIN às roles
              if (state.isAdmin) {
                state.roles.push('ADMIN');
              }
            }
          }
        });
      },
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        username: state.username,
        isAdmin: state.isAdmin,
        roles: state.roles,
        sessionToken: state.sessionToken,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
    }
  )
);
