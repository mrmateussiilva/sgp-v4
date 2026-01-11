import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useHasRole, useHasAnyRole } from '@/utils/authHelpers';

/**
 * Hook para proteger rotas baseado em roles
 * Redireciona para uma rota padrão se o usuário não tiver a role necessária
 * 
 * @example
 * useRequireRole('ADMIN', '/dashboard');
 * useRequireRole(['ADMIN', 'FINANCEIRO'], '/unauthorized');
 */
export function useRequireRole(
  roleOrRoles: string | string[],
  redirectTo: string = '/dashboard'
) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const hasRole = useHasRole(typeof roleOrRoles === 'string' ? roleOrRoles : '');
  const hasAnyRole = useHasAnyRole(Array.isArray(roleOrRoles) ? roleOrRoles : []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const hasRequiredRole = typeof roleOrRoles === 'string'
      ? hasRole
      : hasAnyRole;

    if (!hasRequiredRole) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, hasRole, hasAnyRole, roleOrRoles, redirectTo, navigate]);
}
