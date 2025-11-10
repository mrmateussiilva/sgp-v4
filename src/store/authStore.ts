import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas

interface AuthState {
  isAuthenticated: boolean;
  userId: number | null;
  username: string | null;
  isAdmin: boolean;
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  login: (payload: {
    userId: number;
    username: string;
    sessionToken: string;
    isAdmin?: boolean;
    expiresInSeconds?: number;
  }) => void;
  logout: () => void;
}

const createInitialState = (): Omit<AuthState, 'login' | 'logout'> => ({
  isAuthenticated: false,
  userId: null,
  username: null,
  isAdmin: false,
  sessionToken: null,
  sessionExpiresAt: null,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...createInitialState(),
      login: ({ userId, username, sessionToken, isAdmin = false, expiresInSeconds }) => {
        const ttlMs =
          typeof expiresInSeconds === 'number' && expiresInSeconds > 0
            ? expiresInSeconds * 1000
            : DEFAULT_SESSION_TTL_MS;
        set({
          isAuthenticated: true,
          userId,
          username,
          isAdmin,
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
          }
        });
      },
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        username: state.username,
        isAdmin: state.isAdmin,
        sessionToken: state.sessionToken,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
    }
  )
);
