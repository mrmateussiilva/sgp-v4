import { CheckCircle2, Clock, Info } from 'lucide-react';

export function AdminStatusBanner() {
    const systemStatus = {
        message: 'Sistema operacional',
        lastUpdate: 'há 5 min',
        version: 'v1.2.0-stable'
    };

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-muted-foreground border-b pb-4 mt-2">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wider font-bold">{systemStatus.message}</span>
            </div>

            <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Sincronizado {systemStatus.lastUpdate}</span>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
                <Info className="h-3.5 w-3.5" />
                <span>Versão {systemStatus.version}</span>
            </div>
        </div>
    );
}
