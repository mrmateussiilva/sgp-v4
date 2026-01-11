import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/roles';

/**
 * Verifica se o usuário possui uma role específica
 */
export function hasRole(role: string): boolean {
  const { roles } = useAuthStore.getState();
  if (!roles || roles.length === 0) {
    return false;
  }
  return roles.includes(role);
}

/**
 * Verifica se o usuário possui pelo menos uma das roles especificadas
 */
export function hasAnyRole(allowedRoles: string[]): boolean {
  const { roles } = useAuthStore.getState();
  if (!roles || roles.length === 0 || allowedRoles.length === 0) {
    return false;
  }
  return allowedRoles.some(role => roles.includes(role));
}

/**
 * Verifica se o usuário possui todas as roles especificadas
 */
export function hasAllRoles(requiredRoles: string[]): boolean {
  const { roles } = useAuthStore.getState();
  if (!roles || roles.length === 0 || requiredRoles.length === 0) {
    return false;
  }
  return requiredRoles.every(role => roles.includes(role));
}

/**
 * Hook para usar hasRole em componentes React
 */
export function useHasRole(role: string): boolean {
  const roles = useAuthStore((state) => state.roles);
  if (!roles || roles.length === 0) {
    return false;
  }
  return roles.includes(role);
}

/**
 * Hook para usar hasAnyRole em componentes React
 */
export function useHasAnyRole(allowedRoles: string[]): boolean {
  const roles = useAuthStore((state) => state.roles);
  if (!roles || roles.length === 0 || allowedRoles.length === 0) {
    return false;
  }
  return allowedRoles.some(role => roles.includes(role));
}

/**
 * Hook para usar hasAllRoles em componentes React
 */
export function useHasAllRoles(requiredRoles: string[]): boolean {
  const roles = useAuthStore((state) => state.roles);
  if (!roles || roles.length === 0 || requiredRoles.length === 0) {
    return false;
  }
  return requiredRoles.every(role => roles.includes(role));
}
