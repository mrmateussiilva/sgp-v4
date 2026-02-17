import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Truck, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PwaLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS: Array<{
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { path: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
  { path: '/dashboard/orders', label: 'Pedidos', icon: ShoppingCart },
  { path: '/dashboard/relatorios-envios', label: 'Envios', icon: Truck },
];

export function PwaLayout({ children }: PwaLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { username } = useAuthStore();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header fixo no topo */}
      <header
        className={cn(
          'flex-shrink-0 h-14 px-4 flex items-center justify-between',
          'bg-card border-b border-border shadow-sm',
          'sticky top-0 z-50'
        )}
      >
        {/* Logo */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-bold text-primary text-xl hover:opacity-90 transition-opacity"
          aria-label="SGP - Início"
        >
          SGP
        </Link>

        {/* Nav - desktop: linha, mobile: hamburger */}
        <nav className="hidden sm:flex items-center gap-1" role="navigation" aria-label="Menu principal">
          {NAV_ITEMS.map(({ path, label, icon: Icon, exact }) => {
            const active = isActive(path, exact);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile: menu hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {NAV_ITEMS.map(({ path, label, icon: Icon, exact }) => {
                const active = isActive(path, exact);
                return (
                  <DropdownMenuItem key={path} asChild>
                    <Link
                      to={path}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer',
                        active && 'bg-accent font-medium'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User + Logout */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[120px]">
            {username}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Área de conteúdo */}
      <main className="flex-1 overflow-auto p-4 md:p-6" role="main">
        {children}
      </main>
    </div>
  );
}
