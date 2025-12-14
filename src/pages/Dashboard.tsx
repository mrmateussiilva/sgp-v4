import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  LayoutDashboard, 
  ShoppingCart,
  Plus, 
  LogOut, 
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  BarChart,
  Settings,
  Truck,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import ProtectedRoute from '../components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
const GestaoFormasEnvio = lazy(() => import('./admin/GestaoFormasEnvio'));
const GestaoFormasPagamento = lazy(() => import('./admin/GestaoFormasPagamento'));
const GestaoUsuarios = lazy(() => import('./admin/GestaoUsuarios'));
const GestaoTemplateFicha = lazy(() => import('./admin/GestaoTemplateFicha'));

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [appVersion, setAppVersion] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { username, isAdmin } = useAuthStore();

  // Obter versão do app
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await invoke<string>('get_app_version');
        setAppVersion(version);
      } catch (error) {
        console.error('Erro ao obter versão:', error);
      }
    };
    fetchVersion();
  }, []);

  const handleLogout = async () => {
    await api.logout();
    navigate('/login');
  };

  const allMenuItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Início', 
      path: '/dashboard',
      exact: true,
      adminOnly: false
    },
    { 
      icon: ShoppingCart, 
      label: 'Pedidos', 
      path: '/dashboard/orders',
      adminOnly: false
    },
    { 
      icon: Plus, 
      label: 'Novo Pedido', 
      path: '/dashboard/orders/new',
      adminOnly: false
    },
    { 
      icon: Users, 
      label: 'Clientes', 
      path: '/dashboard/clientes',
      adminOnly: false
    },
    { 
      icon: Truck, 
      label: 'Relatório de Envios', 
      path: '/dashboard/relatorios-envios',
      adminOnly: false
    },
    {
      icon: BarChart,
      label: 'Painel de Desempenho',
      path: '/dashboard/painel-desempenho',
      adminOnly: true,
    },
    { 
      icon: FileText, 
      label: 'Fechamentos', 
      path: '/dashboard/fechamentos',
      adminOnly: true
    },
    { 
      icon: Settings, 
      label: 'Admin', 
      path: '/dashboard/admin',
      adminOnly: true
    },
    { 
      icon: RefreshCw, 
      label: 'Verificar Atualização', 
      path: '/update-status',
      adminOnly: false
    },
  ];

  // Filtrar menu baseado em permissões
  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen bg-background">
        {/* Sidebar Desktop */}
        <aside className={cn(
          "hidden md:flex md:flex-col border-r bg-card transition-all duration-300",
          sidebarExpanded ? "md:w-64" : "md:w-20"
        )}>
        <div className={cn("p-6 flex items-center", !sidebarExpanded && "justify-center p-4")}>
          {sidebarExpanded ? (
    <div>
              <h1 className="text-4xl font-bold text-primary">SGP</h1>
              <p className="text-sm text-muted-foreground mt-1">Sistema de Gerenciamento</p>
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
          >
            {sidebarExpanded ? (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Recolher
              </>
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
    </div>

        <Separator />
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            
            // Verificar se precisa adicionar separador antes de itens admin
            const previousItem = menuItems[index - 1];
            const needsSeparator = !previousItem?.adminOnly && item.adminOnly;
            
            const button = (
              <Button
                key={item.path}
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full transition-all",
                  sidebarExpanded ? "justify-start" : "justify-center px-0",
                  active && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                onClick={() => navigate(item.path)}
              >
                <Icon className={cn("h-4 w-4", sidebarExpanded && "mr-2")} />
                {sidebarExpanded && <span>{item.label}</span>}
              </Button>
  );

  return (
              <div key={item.path}>
                {needsSeparator && (
                  <div className="py-2">
                    <Separator />
                    {sidebarExpanded && (
                      <p className="text-xs text-muted-foreground px-3 mt-2">Admin</p>
                    )}
                  </div>
                )}
                {!sidebarExpanded ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {button}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  button
                )}
              </div>
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
                >
                  <LogOut className="h-4 w-4" />
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
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sair</span>
            </Button>
          )}
        </div>
      </aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r shadow-lg">
            <div className="p-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">SGP v4</h1>
                <p className="text-sm text-muted-foreground mt-1">Sistema de Gerenciamento</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <Separator />
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                
                // Verificar se precisa adicionar separador antes de itens admin
                const previousItem = menuItems[index - 1];
                const needsSeparator = !previousItem?.adminOnly && item.adminOnly;
                
                return (
                  <div key={item.path}>
                    {needsSeparator && (
                      <div className="py-2">
                        <Separator />
                        <p className="text-xs text-muted-foreground px-3 mt-2">Admin</p>
                      </div>
                    )}
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        active && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </div>
                );
              })}
            </nav>

            <Separator />

            <div className="p-4">
              <div className="mb-3 px-3">
                <p className="text-sm font-medium">Usuário</p>
                <p className="text-sm text-muted-foreground">{username}</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="orders" element={<OrderList />} />
              <Route path="orders/new" element={<PedidoCreateView />} />
              <Route path="orders/edit/:id" element={<PedidoEditView />} />
              {/* Novas rotas conforme solicitado */}
              <Route path="pedido/novo" element={<PedidoCreateView />} />
              <Route path="pedido/editar/:id" element={<PedidoEditView />} />
              <Route path="clientes" element={<Clientes />} />
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
              <Route 
                path="/admin/template-ficha" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <GestaoTemplateFicha />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
