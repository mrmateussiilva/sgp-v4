import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface AdminModule {
    title: string;
    path: string;
    icon: React.ElementType;
    color: string;
    stats?: string;
    status: 'ok' | 'attention' | 'inactive';
}

interface AdminModuleCardProps {
    module: AdminModule;
}

export function AdminModuleCard({ module }: AdminModuleCardProps) {
    const navigate = useNavigate();
    const Icon = module.icon;

    const statusColors = {
        ok: 'bg-emerald-500',
        attention: 'bg-amber-500',
        inactive: 'bg-slate-300',
    };

    return (
        <Card
            className="group flex items-center justify-between px-3.5 py-3 transition-all duration-75 hover:bg-muted/50 border border-border shadow-none rounded-md cursor-pointer"
            onClick={() => navigate(module.path)}
        >
            <div className="flex items-center gap-4">
                <Icon className={`h-3.5 w-3.5 ${module.color} flex-shrink-0 opacity-80`} />
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-foreground leading-snug tracking-tight uppercase">{module.title}</h3>
                    {module.stats && (
                        <div className="flex items-center gap-1.5">
                            <div className={`h-1 w-1 rounded-full ${statusColors[module.status]}`} />
                            <span className="text-[11px] text-muted-foreground font-black uppercase tracking-wider">
                                {module.stats}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </Card>
    );
}






