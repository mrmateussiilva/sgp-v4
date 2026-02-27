import { useState } from 'react';
import { useUpdaterStore } from '@/store/updaterStore';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isTauri } from '@/utils/isTauri';

/**
 * Componente que exibe um banner no topo da aplicação quando uma nova versão está disponível.
 * Apenas na versão desktop Tauri.
 */
export function UpdateBanner() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isUpdateAvailable, updateVersion } = useUpdaterStore();
    const [isVisible, setIsVisible] = useState(true);

    if (!isTauri()) return null;

    // Se o usuário fechar o banner, ele fica oculto apenas nesta sessão
    // a menos que ele mude de página de configuração ou reinicie.
    // Como é "sistema inteiro", vamos manter persistente a menos que ele feche.

    // Ocultar se:
    // 1. Não houver atualização
    // 2. Não tivermos a versão (segurança)
    // 3. O usuário fechou manualmente
    // 4. Estamos na própria página de atualização
    const isUpdatePage = location.pathname === '/update-status';

    if (!isUpdateAvailable || !updateVersion || !isVisible || isUpdatePage) {
        return null;
    }

    return (
        <div
            className={cn(
                "bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg z-[100] border-b border-blue-500/50",
                "animate-in slide-in-from-top duration-500 fill-mode-forwards"
            )}
        >
            <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 shrink-0">
                    <RefreshCw className="h-4 w-4 animate-spin-slow" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2">
                    <span className="text-sm font-semibold tracking-wide">
                        ATUALIZAÇÃO DISPONÍVEL
                    </span>
                    <span className="hidden md:block opacity-40">|</span>
                    <span className="text-sm opacity-95">
                        Uma nova versão (<span className="font-bold">v{updateVersion}</span>) está pronta para ser instalada no sistema.
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white text-blue-700 hover:bg-blue-50 font-bold h-8 px-4 flex items-center gap-2 whitespace-nowrap shadow-sm transition-all border-none"
                    onClick={() => navigate('/update-status')}
                >
                    <span>Atualizar Agora</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>

                <button
                    onClick={() => setIsVisible(false)}
                    className="p-1.5 rounded-full hover:bg-black/10 transition-colors text-white/80 hover:text-white"
                    title="Fechar notificação"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
