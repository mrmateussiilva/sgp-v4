import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { isTauri } from '@/utils/isTauri';
import {
  LayoutDashboard,
  ShoppingCart,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  BarChart,
  Settings,
  Truck,
  RefreshCw,
  Loader2,
  Printer
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUpdaterStore } from '../store/updaterStore';
import { api } from '../services/api';
import ProtectedRoute from '../components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardMenuItem } from '@/components/DashboardMenuItem';
import { cn } from '@/lib/utils';

// Lazy load de todas as rotas para code-splitting
const OrderList = lazy(() => import('../components/OrderList'));
const PedidoCreateView = lazy(() => import('../views/PedidoCreateView'));
const PedidoEditView = lazy(() => import('../views/PedidoEditView'));
const DashboardOverview = lazy(() => import('./DashboardOverview'));
const Clientes = lazy(() => import('./Clientes'));
const RelatoriosEnvios = lazy(() => import('./RelatoriosEnvios'));
const Fechamentos = lazy(() => import('./Fechamentos'));
const PainelDesempenho = lazy(() => import('./PainelDesempenho'));
const Admin = lazy(() => import('./Admin'));
const GestaoMateriais = lazy(() => import('./admin/GestaoMateriais'));
const GestaoDesigners = lazy(() => import('./admin/GestaoDesigners'));
const GestaoVendedores = lazy(() => import('./admin/GestaoVendedores'));
const GestaoTiposProducao = lazy(() => import('./admin/GestaoTiposProducao'));
const GestaoFormasEnvio = lazy(() => import('./admin/GestaoFormasEnvio'));
const GestaoFormasPagamento = lazy(() => import('./admin/GestaoFormasPagamento'));
const GestaoUsuarios = lazy(() => import('./admin/GestaoUsuarios'));
const GestaoMaquinas = lazy(() => import('./admin/GestaoMaquinas'));
const ProducaoMaquinas = lazy(() => import('./ProducaoMaquinas').then(module => ({ default: module.ProducaoMaquinas })));
const PrintLogs = lazy(() => import('./PrintLogs'));
// Temporarily disabled - template editing via UI is disabled
// const GestaoTemplateFicha = lazy(() => import('./admin/GestaoTemplateFicha'));
const GestaoTemplateRelatorios = lazy(() => import('./admin/GestaoTemplateRelatorios'));

// Componente de loading para rotas lazy
const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

export default function Dashboard() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [appVersion, setAppVersion] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { username, isAdmin } = useAuthStore();
  const isUpdateAvailable = useUpdaterStore((state) => state.isUpdateAvailable);

  // Obter versão do app
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        if (isTauri()) {
          const { invoke } = await import('@tauri-apps/api/core');
          const version = await invoke<string>('get_app_version');
          setAppVersion(version);
        } else {
          setAppVersion(import.meta.env.VITE_APP_VERSION || 'web');
        }
      } catch (error) {
        console.error('Erro ao obter versão:', error);
        setAppVersion(import.meta.env.VITE_APP_VERSION || 'web');
      }
    };
    fetchVersion();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, redirecionar para login
      navigate('/login');
    }
  }, [navigate]);

  interface MenuItem {
    icon: any;
    label: string;
    path: string;
    exact?: boolean;
    adminOnly: boolean;
    section: string;
  }

  const allMenuItems: MenuItem[] = useMemo(() => [
    {
      icon: LayoutDashboard,
      label: 'Início',
      path: '/dashboard',
      exact: true,
      adminOnly: false,
      section: 'OPERACIONAL'
    },
    {
      icon: ShoppingCart,
      label: 'Pedidos',
      path: '/dashboard/orders',
      adminOnly: false,
      section: 'OPERACIONAL'
    },
    {
      icon: Plus,
      label: 'Novo Pedido',
      path: '/dashboard/pedido/novo',
      adminOnly: false,
      section: 'OPERACIONAL'
    },
    {
      icon: Users,
      label: 'Clientes',
      path: '/dashboard/clientes',
      adminOnly: false,
      section: 'OPERACIONAL'
    },
    {
      icon: Truck,
      label: 'Envios',
      path: '/dashboard/relatorios-envios',
      adminOnly: false,
      section: 'OPERACIONAL'
    },
    {
      icon: Printer,
      label: 'Logs de Impressão',
      path: '/dashboard/print-logs',
      adminOnly: false,
      section: 'OPERACIONAL'
    },
    {
      icon: BarChart,
      label: 'Desempenho',
      path: '/dashboard/painel-desempenho',
      adminOnly: true,
      section: 'GESTÃO'
    },
    // {
    //   icon: MonitorPlay,
    //   label: 'Produção',
    //   path: '/dashboard/painel-producao',
    //   adminOnly: false,
    //   section: 'OPERACIONAL'
    // },
    {
      icon: FileText,
      label: 'Fechamentos',
      path: '/dashboard/fechamentos',
      adminOnly: true,
      section: 'GESTÃO'
    },
    {
      icon: Settings,
      label: 'Admin',
      path: '/dashboard/admin',
      adminOnly: true,
      section: 'SISTEMA'
    },
    {
      icon: RefreshCw,
      label: 'Atualizações',
      path: '/update-status',
      adminOnly: false,
      section: 'SISTEMA'
    },
  ], []);

  // Filtrar menu baseado em permissões (memoizado)
  // Ocultar "Atualizações" na web - apenas desktop Tauri
  const menuItems = useMemo(() =>
    allMenuItems.filter(item =>
      (!item.adminOnly || isAdmin) && !(item.path === '/update-status' && !isTauri())
    ),
    [isAdmin, allMenuItems]
  );

  const isActive = useCallback((path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar Desktop */}
        <aside className={cn(
          "hidden md:flex md:flex-col border-r bg-card transition-all duration-300",
          sidebarExpanded ? "md:w-64" : "md:w-20"
        )}>
          <div className={cn("p-6 flex items-center", !sidebarExpanded && "justify-center p-4")}>
            {sidebarExpanded ? (
              <div>
                <h1 className="text-4xl font-bold text-primary">SGP</h1>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-primary">S</h1>
            )}
          </div>

          <Separator />

          {/* Botão de Toggle */}
          <div className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className={cn("w-full", !sidebarExpanded && "justify-center px-0")}
              aria-label={sidebarExpanded ? "Recolher menu" : "Expandir menu"}
              aria-expanded={sidebarExpanded}
            >
              {sidebarExpanded ? (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                  Recolher
                </>
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>

          <Separator />

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Menu principal">
            {menuItems.map((item, index) => {
              const active = isActive(item.path, item.exact);
              const previousItem = menuItems[index - 1];
              const isFirstInSection = !previousItem || previousItem.section !== item.section;

              return (
                <DashboardMenuItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  active={active}
                  expanded={sidebarExpanded}
                  needsSeparator={isFirstInSection}
                  separatorLabel={isFirstInSection ? item.section : undefined}
                  showBadge={item.path === '/update-status' && isUpdateAvailable}
                  isFirst={index === 0}
                />
              );
            })}
          </nav>

          <Separator />

          {/* Versão do App */}
          {appVersion && (
            <div className={cn("px-4 py-2", !sidebarExpanded && "flex justify-center")}>
              {sidebarExpanded ? (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Versão</p>
                  <p className="text-xs font-semibold text-primary">v{appVersion}</p>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-primary">v{appVersion}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Versão {appVersion}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          <Separator />

          <div className="p-4">
            {sidebarExpanded && (
              <div className="mb-3 px-3">
                <p className="text-sm font-medium">Usuário</p>
                <p className="text-sm text-muted-foreground truncate">{username}</p>
              </div>
            )}
            {!sidebarExpanded ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-all justify-center px-0"
                    onClick={handleLogout}
                    aria-label={`Sair (${username})`}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Sair ({username})
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-all justify-start"
                onClick={handleLogout}
                aria-label={`Sair (${username})`}
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Sair</span>
              </Button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-6" role="main">
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<DashboardOverview />} />
                <Route path="orders" element={<OrderList />} />
                <Route path="orders/new" element={<Navigate to="/dashboard/pedido/novo" replace />} />
                <Route path="orders/edit/:id" element={<PedidoEditView />} />
                {/* Rota canônica para novo pedido */}
                <Route path="pedido/novo" element={<PedidoCreateView />} />
                <Route path="pedido/editar/:id" element={<PedidoEditView />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="painel-producao" element={<ProducaoMaquinas />} />
                <Route path="relatorios-envios" element={<RelatoriosEnvios />} />
                <Route
                  path="painel-desempenho"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <PainelDesempenho />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fechamentos"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <Fechamentos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/materiais"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoMateriais />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/designers"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoDesigners />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/vendedores"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoVendedores />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/tipos-producao"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoTiposProducao />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/formas-envio"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoFormasEnvio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/formas-pagamento"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoFormasPagamento />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/usuarios"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoUsuarios />
                    </ProtectedRoute>
                  }
                />
                {/* Desativado temporariamente */}
                {/* <Route 
                path="/admin/template-ficha" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <GestaoTemplateFicha />
                  </ProtectedRoute>
                } 
              /> */}
                <Route
                  path="/admin/template-relatorios"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoTemplateRelatorios />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/maquinas"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <GestaoMaquinas />
                    </ProtectedRoute>
                  }
                />
                <Route path="print-logs" element={<PrintLogs />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
