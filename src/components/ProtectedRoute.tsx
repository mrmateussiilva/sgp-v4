import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useHasRole, useHasAnyRole } from '@/utils/authHelpers';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean; // Mantido para compatibilidade com código existente
  requireRole?: string; // Nova: requer role específica
  requireAnyRole?: string[]; // Nova: requer pelo menos uma das roles
}

/**
 * Componente que protege rotas baseado em autenticação e roles
 * 
 * @example
 * // Usando requireAdmin (compatibilidade)
 * <ProtectedRoute requireAdmin={true}>
 *   <AdminPage />
 * </ProtectedRoute>
 * 
 * @example
 * // Usando requireRole
 * <ProtectedRoute requireRole="FINANCEIRO">
 *   <FinanceiroPage />
 * </ProtectedRoute>
 * 
 * @example
 * // Usando requireAnyRole
 * <ProtectedRoute requireAnyRole={['ADMIN', 'FINANCEIRO']}>
 *   <ReportsPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireRole,
  requireAnyRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin } = useAuthStore();
  const hasRole = useHasRole(requireRole || '');
  const hasAnyRole = useHasAnyRole(requireAnyRole || []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se requireAdmin for true, verificar isAdmin (compatibilidade)
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  // Se requireRole for especificado, verificar role específica
  if (requireRole && !hasRole) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não possui a role necessária ({requireRole}) para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  // Se requireAnyRole for especificado, verificar se tem pelo menos uma role
  if (requireAnyRole && requireAnyRole.length > 0 && !hasAnyRole) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não possui nenhuma das roles necessárias para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

