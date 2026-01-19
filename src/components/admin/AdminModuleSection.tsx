import { AdminModule, AdminModuleCard } from './AdminModuleCard';

interface AdminModuleSectionProps {
    title: string;
    description?: string;
    modules: AdminModule[];
}

export function AdminModuleSection({ title, modules }: AdminModuleSectionProps) {
    return (
        <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {modules.map((module) => (
                    <AdminModuleCard key={module.path} module={module} />
                ))}
            </div>
        </div>
    );
}


