import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedSetores?: string[];
  blockedSetores?: string[];
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  allowedSetores,
  blockedSetores,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, setor } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  const currentSetor = setor || 'geral';

  if (allowedSetores && !allowedSetores.includes(currentSetor)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Seu setor ({currentSetor}) não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (blockedSetores && blockedSetores.includes(currentSetor)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Seu setor ({currentSetor}) não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

