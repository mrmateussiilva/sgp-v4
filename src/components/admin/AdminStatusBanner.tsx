import { Circle } from 'lucide-react';

export function AdminStatusBanner() {
    const isHealthy = true;

    return (
        <div className="flex items-center gap-2 py-1 text-xs border-b border-border/50 mb-6 font-medium">
            <span className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Status:</span>
            <div className="flex items-center gap-1.5">
                <Circle className={`h-2 w-2 fill-current ${isHealthy ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className="text-foreground">{isHealthy ? 'Sincronizado' : 'Atenção'}</span>
            </div>
            <span className="text-muted-foreground">há 5 min</span>
            <button className="ml-auto text-primary hover:underline font-semibold">
                Ver logs
            </button>
        </div>
    );
}


