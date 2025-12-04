import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, 
  ShoppingCart,
  Plus, 
  LogOut, 
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  BarChart,
  Settings,
  Truck
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import OrderList from '../components/OrderList';
import ProtectedRoute from '../components/ProtectedRoute';
import PedidoCreateView from '../views/PedidoCreateView';
import PedidoEditView from '../views/PedidoEditView';
import DashboardOverview from './DashboardOverview';
import Clientes from './Clientes';
import RelatoriosEnvios from './RelatoriosEnvios';
import Fechamentos from './Fechamentos';
import PainelDesempenho from './PainelDesempenho';
import Admin from './Admin';
import GestaoMateriais from './admin/GestaoMateriais';
import GestaoDesigners from './admin/GestaoDesigners';
import GestaoVendedores from './admin/GestaoVendedores';
import GestaoFormasEnvio from './admin/GestaoFormasEnvio';
import GestaoFormasPagamento from './admin/GestaoFormasPagamento';
import GestaoUsuarios from './admin/GestaoUsuarios';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { username, isAdmin } = useAuthStore();

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
        {/* Header */}
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-semibold">Sistema de Gerenciamento de Pedidos</h2>
                <p className="text-sm text-muted-foreground">Olá, {username}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
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
          </Routes>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
