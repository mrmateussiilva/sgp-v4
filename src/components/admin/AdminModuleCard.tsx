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
            className="group flex items-center justify-between p-3.5 transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer shadow-sm"
            onClick={() => navigate(module.path)}
        >
            <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    <Icon className={`h-5 w-5 ${module.color}`} />
                </div>
                <div>
                    <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">{module.title}</h3>
                    {module.stats && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${statusColors[module.status]}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {module.stats}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Card>
    );
}



