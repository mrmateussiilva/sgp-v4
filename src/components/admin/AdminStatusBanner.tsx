import { Circle, Clock } from 'lucide-react';

export function AdminStatusBanner() {
    const systemStatus = {
        state: 'healthy',
        message: 'Sistema operacional',
        lastUpdate: 'há 5 min',
    };

    const isHealthy = systemStatus.state === 'healthy';

    return (
        <div className="flex items-center gap-4 py-2 border-b border-dashed border-border mb-4">
            <div className="flex items-center gap-1.5">
                <Circle className={`h-2 w-2 fill-current ${isHealthy ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className="text-sm text-foreground font-medium">{systemStatus.message}</span>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Sincronizado {systemStatus.lastUpdate}</span>
            </div>

            <button className="text-xs text-primary hover:underline ml-auto">
                Ver logs
            </button>
        </div>
    );
}

