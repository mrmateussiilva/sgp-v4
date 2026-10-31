import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import {
    LayoutDashboard,
    ShoppingCart,
    Plus,
    Users,
    Settings,
    RefreshCw,
    FileText,
    BarChart,
    Truck,
    LogOut,
    Sun,
    Moon,
    Monitor,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/ThemeProvider';
import { isTauri } from '@/utils/isTauri';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const isAdmin = useAuthStore((state) => state.isAdmin);
    const logout = useAuthStore((state) => state.logout);
    const { resolvedTheme, setTheme } = useTheme();

    // Atalho global Ctrl+K para abrir a palette
    useKeyboardShortcuts([
        {
            key: 'k',
            ctrl: true,
            action: () => setOpen((open) => !open),
            description: 'Abrir Command Palette',
        },
    ]);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Digite um comando ou pesquise..." />
            <CommandList>
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

                <CommandGroup heading="Navegação">
                    <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Ir para Início</span>
                        <CommandShortcut>Ctrl+1</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/orders'))}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        <span>Ir para Pedidos</span>
                        <CommandShortcut>Ctrl+2</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/clientes'))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Ir para Clientes</span>
                        <CommandShortcut>Ctrl+4</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/relatorios-envios'))}>
                        <Truck className="mr-2 h-4 w-4" />
                        <span>Ir para Envios</span>
                    </CommandItem>
                    {isAdmin && (
                        <>
                            <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/fechamentos'))}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Ir para Fechamentos</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/painel-desempenho'))}>
                                <BarChart className="mr-2 h-4 w-4" />
                                <span>Ir para Desempenho</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/admin'))}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Ir para Admin</span>
                            </CommandItem>
                        </>
                    )}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Ações">
                    <CommandItem onSelect={() => runCommand(() => navigate('/dashboard/pedido/novo'))}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Novo Pedido</span>
                        <CommandShortcut>Ctrl+3</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => {
                        // Recarregar a página atual
                        window.location.reload();
                    })}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        <span>Atualizar Sistema</span>
                        <CommandShortcut>Ctrl+R</CommandShortcut>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Aparência">
                    <CommandItem onSelect={() => runCommand(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}>
                        {resolvedTheme === 'dark' ? (
                            <Sun className="mr-2 h-4 w-4 text-amber-500" />
                        ) : (
                            <Moon className="mr-2 h-4 w-4 text-blue-400" />
                        )}
                        <span>Alternar Modo Claro / Escuro</span>
                        <CommandShortcut>Ctrl+Shift+L</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
                        <Sun className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Tema Claro</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
                        <Moon className="mr-2 h-4 w-4 text-blue-400" />
                        <span>Tema Escuro</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
                        <Monitor className="mr-2 h-4 w-4" />
                        <span>Tema do Sistema</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Sistema">
                    {isTauri() && (
                        <CommandItem onSelect={() => runCommand(() => navigate('/update-status'))}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            <span>Verificar Atualizações</span>
                        </CommandItem>
                    )}
                    <CommandItem onSelect={() => runCommand(() => {
                        logout();
                        navigate('/login');
                    })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair do Sistema</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
