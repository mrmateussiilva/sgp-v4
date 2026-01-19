import { CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminStatusBanner() {
    const systemStatus = {
        state: 'healthy', // 'healthy' | 'warning'
        message: 'SISTEMA OK',
        lastUpdate: 'há 5 min',
    };

    const isHealthy = systemStatus.state === 'healthy';

    return (
        <div className={`
      flex items-center justify-between px-4 py-2.5 rounded-lg border-2 mb-2
      ${isHealthy
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/50'}
    `}>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {isHealthy ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                    )}
                    <span className="text-sm font-black tracking-tighter">{systemStatus.message}</span>
                </div>

                <div className="h-4 w-px bg-current opacity-20 hidden sm:block" />

                <div className="flex items-center gap-1.5 opacity-70 hidden sm:flex">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-wide">Sincronizado {systemStatus.lastUpdate}</span>
                </div>
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-black uppercase tracking-widest hover:bg-white/50 dark:hover:bg-black/20 gap-1.5 px-3"
            >
                Ver logs
                <ExternalLink className="h-3 w-3" />
            </Button>
        </div>
    );
}
