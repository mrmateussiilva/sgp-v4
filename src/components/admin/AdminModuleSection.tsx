import { AdminModule, AdminModuleCard } from './AdminModuleCard';

interface AdminModuleSectionProps {
    title: string;
    description?: string;
    modules: AdminModule[];
}

export function AdminModuleSection({ title, modules }: AdminModuleSectionProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{title}</h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {modules.map((module) => (
                    <AdminModuleCard key={module.path} module={module} />
                ))}
            </div>
        </div>
    );
}

