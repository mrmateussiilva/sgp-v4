import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  userId: number | null;
  username: string | null;
  isAdmin: boolean;
  sessionToken: string | null;
  login: (payload: { userId: number; username: string; sessionToken: string; isAdmin?: boolean }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      username: null,
      isAdmin: false,
      sessionToken: null,
      login: ({ userId, username, sessionToken, isAdmin = false }) =>
        set({ isAuthenticated: true, userId, username, isAdmin, sessionToken }),
      logout: () =>
        set({
          isAuthenticated: false,
          userId: null,
          username: null,
          isAdmin: false,
          sessionToken: null,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
