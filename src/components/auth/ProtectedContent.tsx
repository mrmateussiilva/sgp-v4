import { ReactNode } from 'react';
import { useHasRole, useHasAnyRole, useHasAllRoles } from '@/utils/authHelpers';

interface ProtectedContentProps {
  children: ReactNode;
  role?: string;
  anyRole?: string[];
  allRoles?: string[];
  fallback?: ReactNode;
}

/**
 * Componente que renderiza children apenas se o usuário tiver a role necessária
 * 
 * @example
 * <ProtectedContent role="ADMIN">
 *   <Button>Deletar</Button>
 * </ProtectedContent>
 * 
 * @example
 * <ProtectedContent anyRole={['ADMIN', 'FINANCEIRO']}>
 *   <Button>Ver Relatórios</Button>
 * </ProtectedContent>
 */
export function ProtectedContent({
  children,
  role,
  anyRole,
  allRoles,
  fallback = null,
}: ProtectedContentProps) {
  const hasRole = useHasRole(role || '');
  const hasAny = useHasAnyRole(anyRole || []);
  const hasAll = useHasAllRoles(allRoles || []);

  // Se especificou role, verificar role específica
  if (role) {
    return hasRole ? <>{children}</> : <>{fallback}</>;
  }

  // Se especificou anyRole, verificar se tem pelo menos uma
  if (anyRole && anyRole.length > 0) {
    return hasAny ? <>{children}</> : <>{fallback}</>;
  }

  // Se especificou allRoles, verificar se tem todas
  if (allRoles && allRoles.length > 0) {
    return hasAll ? <>{children}</> : <>{fallback}</>;
  }

  // Se não especificou nenhum critério, renderizar tudo (comportamento padrão)
  return <>{children}</>;
}
