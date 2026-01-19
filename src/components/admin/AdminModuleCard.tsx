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
            className="group flex items-center justify-between p-3 transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-900 border cursor-pointer"
            onClick={() => navigate(module.path)}
        >
            <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${module.color}`} />
                <div>
                    <h3 className="text-sm font-semibold">{module.title}</h3>
                    {module.stats && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${statusColors[module.status]}`} />
                            <span className="text-[10px] font-bold text-muted-foreground">
                                {module.stats}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Card>
    );
}


