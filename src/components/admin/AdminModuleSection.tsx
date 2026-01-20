import { AdminModule, AdminModuleCard } from './AdminModuleCard';

interface AdminModuleSectionProps {
    title: string;
    description?: string;
    modules: AdminModule[];
}

export function AdminModuleSection({ title, modules }: AdminModuleSectionProps) {
    return (
        <div className="space-y-2">
            <h2 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.15em] pl-1">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {modules.map((module) => (
                    <AdminModuleCard key={module.path} module={module} />
                ))}
            </div>
        </div>
    );
}





