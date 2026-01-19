import { CheckCircle2, AlertTriangle, Activity } from 'lucide-react';

export function AdminStatusBanner() {
    // Placeholder for real health check
    const systemStatus = {
        state: 'healthy', // 'healthy' | 'warning' | 'error'
        message: 'Sistema operacional',
        details: '12 usuários ativos • sem pendências críticas',
        lastUpdate: 'há 5 min',
    };

    const isHealthy = systemStatus.state === 'healthy';

    return (
        <div className={`
      relative overflow-hidden rounded-xl border-2 p-5 transition-all
      ${isHealthy
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                : 'bg-amber-50/50 border-amber-100 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/50'}
    `}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`
            rounded-full p-2.5 
            ${isHealthy ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}
          `}>
                        {isHealthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold tracking-tight">{systemStatus.message}</h2>
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-30" />
                            <p className="text-sm font-medium opacity-80">{systemStatus.details}</p>
                        </div>
                        <p className="text-xs opacity-60 flex items-center gap-1 mt-0.5">
                            <Activity className="h-3 w-3" />
                            Última sincronização: {systemStatus.lastUpdate}
                        </p>
                    </div>
                </div>

                <button className="text-sm font-semibold underline-offset-4 hover:underline opacity-80">
                    Ver logs do sistema
                </button>
            </div>

            {/* Subtle decoration */}
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-current opacity-[0.03]" />
        </div>
    );
}
