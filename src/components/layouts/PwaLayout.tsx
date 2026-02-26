import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  LogOut,
  Menu,
  BarChart,
  Users,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { isTauri } from '@/utils/isTauri';
import { BottomNavBar } from './BottomNavBar';
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
  adminOnly?: boolean;
}> = [
    { path: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
    { path: '/dashboard/orders', label: 'Pedidos', icon: ShoppingCart },
    { path: '/dashboard/pedido/novo', label: 'Novo', icon: ShoppingCart },
    { path: '/dashboard/clientes', label: 'Clientes', icon: Users },
    { path: '/dashboard/relatorios-envios', label: 'Envios', icon: Truck },
    { path: '/dashboard/painel-desempenho', label: 'Desempenho', icon: BarChart, adminOnly: true },
    { path: '/dashboard/fechamentos', label: 'Fechamentos', icon: FileText, adminOnly: true },
  ];

export function PwaLayout({ children }: PwaLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, isAdmin } = useAuthStore();
  const tauri = isTauri();

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.path === '/dashboard/pedido/novo' && !tauri) return false;
    return true;
  });

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
          'flex-shrink-0 h-14 px-3 sm:px-4 flex items-center justify-between',
          'bg-card border-b border-border shadow-sm',
          'sticky top-0 z-50'
        )}
      >
        {/* Logo */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-bold text-primary text-lg hover:opacity-90 transition-opacity min-h-[44px] items-center"
          aria-label="SGP - Início"
        >
          SGP
        </Link>

        {/* Nav - desktop: linha, mobile: hamburger */}
        <nav
          className="hidden sm:flex items-center gap-1"
          role="navigation"
          aria-label="Menu principal"
        >
          {filteredNavItems.map(({ path, label, icon: Icon, exact }) => {
            const active = isActive(path, exact);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px]',
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

        {/* Mobile: menu hamburger - Oculto em favor da BottomNavBar */}
        <div className="hidden items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {filteredNavItems.map(({ path, label, icon: Icon, exact }) => {
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
            className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
            onClick={handleLogout}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Área de conteúdo */}
      <main
        className="flex-1 overflow-auto p-4 md:p-6 pb-20 sm:pb-4 custom-scrollbar max-w-7xl mx-auto w-full"
        role="main"
      >
        {children}
      </main>

      {/* Barra de Navegação Inferior - Mobile only */}
      <BottomNavBar />
    </div>
  );
}
