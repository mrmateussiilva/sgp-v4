import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
            className="group relative flex items-center justify-between p-4 transition-all duration-200 hover:border-primary cursor-pointer border-2"
            onClick={() => navigate(module.path)}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-5 w-5 ${module.color}`} />
                </div>
                <div>
                    <h3 className="font-bold text-sm tracking-tight">{module.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className={`h-2 w-2 rounded-full ${statusColors[module.status]}`} />
                        {module.stats && (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                {module.stats}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    GERENCIAR
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </div>
        </Card>
    );
}

