import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  userId: number | null;
  username: string | null;
  isAdmin: boolean;
  login: (userId: number, username: string, isAdmin?: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      username: null,
      isAdmin: false,
      login: (userId: number, username: string, isAdmin: boolean = false) =>
        set({ isAuthenticated: true, userId, username, isAdmin }),
      logout: () => set({ isAuthenticated: false, userId: null, username: null, isAdmin: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

