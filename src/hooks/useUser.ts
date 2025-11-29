import { useAuthStore } from '@/store/authStore';

export interface UserInfo {
  userId: number | null;
  username: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook para acessar informações do usuário atual
 * @returns Informações do usuário logado
 */
export function useUser(): UserInfo {
  const userId = useAuthStore((state) => state.userId);
  const username = useAuthStore((state) => state.username);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return {
    userId,
    username,
    isAdmin,
    isAuthenticated,
  };
}

