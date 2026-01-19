import { AdminModule, AdminModuleCard } from './AdminModuleCard';

interface AdminModuleSectionProps {
    title: string;
    description?: string;
    modules: AdminModule[];
}

export function AdminModuleSection({ title, modules }: AdminModuleSectionProps) {
    return (
        <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {modules.map((module) => (
                    <AdminModuleCard key={module.path} module={module} />
                ))}
            </div>
        </div>
    );
}



