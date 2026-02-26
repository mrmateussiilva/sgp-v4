import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    Users,
    MoreHorizontal,
    Truck,
    BarChart,
    FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTauri } from '@/utils/isTauri';
import { useAuthStore } from '@/store/authStore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function BottomNavBar() {
    const location = useLocation();
    const { isAdmin } = useAuthStore();
    const tauri = isTauri();

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const navItems = [
        { path: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
        { path: '/dashboard/orders', label: 'Pedidos', icon: ShoppingCart },
        { path: '/dashboard/clientes', label: 'Clientes', icon: Users },
    ];

    const moreItems = [
        { path: '/dashboard/relatorios-envios', label: 'Envios', icon: Truck },
        { path: '/dashboard/painel-desempenho', label: 'Desempenho', icon: BarChart, adminOnly: true },
        { path: '/dashboard/fechamentos', label: 'Fechamentos', icon: FileText, adminOnly: true },
        // Apenas mostrar Novo Pedido no menu "Mais" se estiver no Tauri
        ...(tauri ? [{ path: '/dashboard/pedido/novo', label: 'Novo Pedido', icon: ShoppingCart }] : []),
    ].filter((item) => !item.adminOnly || isAdmin);

    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-2 pb-safe-bottom">
            <div className="flex items-center justify-around h-16">
                {navItems.map(({ path, label, icon: Icon, exact }) => {
                    const active = isActive(path, exact);
                    return (
                        <Link
                            key={path}
                            to={path}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 w-full h-full transition-colors',
                                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                            <span className="text-[10px] font-medium leading-none">{label}</span>
                        </Link>
                    );
                })}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <MoreHorizontal className="h-5 w-5" />
                            <span className="text-[10px] font-medium leading-none">Mais</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
                        {moreItems.map(({ path, label, icon: Icon }) => (
                            <DropdownMenuItem key={path} asChild>
                                <Link to={path} className="flex items-center gap-2 cursor-pointer py-2.5">
                                    <Icon className="h-4 w-4" />
                                    <span className="text-sm font-medium">{label}</span>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
}
