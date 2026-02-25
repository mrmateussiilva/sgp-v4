import { Package, Palette, Users, Truck, CreditCard, Settings, FileText, Monitor, Plug } from 'lucide-react';
import { AdminStatusBanner } from '@/components/admin/AdminStatusBanner';
import { AdminModuleSection } from '@/components/admin/AdminModuleSection';
import { AdminModule } from '@/components/admin/AdminModuleCard';

export default function Admin() {
  const productionModules: AdminModule[] = [
    {
      title: 'Materiais',
      icon: Package,
      path: '/dashboard/admin/materiais',
      color: 'text-blue-600',
      stats: '12 ativos',
      status: 'ok',
    },
    {
      title: 'Tipos de Produção',
      icon: Package,
      path: '/dashboard/admin/tipos-producao',
      color: 'text-amber-600',
      stats: '8 ativos',
      status: 'ok',
    },
    {
      title: 'Máquinas',
      icon: Monitor,
      path: '/dashboard/admin/maquinas',
      color: 'text-indigo-600',
      stats: 'Gerenciar',
      status: 'ok',
    },
  ];

  const peopleModules: AdminModule[] = [
    {
      title: 'Designers',
      icon: Palette,
      path: '/dashboard/admin/designers',
      color: 'text-purple-600',
      stats: '5 ativos',
      status: 'ok',
    },
    {
      title: 'Vendedores',
      icon: Users,
      path: '/dashboard/admin/vendedores',
      color: 'text-green-600',
      stats: '8 ativos',
      status: 'ok',
    },
    {
      title: 'Usuários',
      icon: Settings,
      path: '/dashboard/admin/usuarios',
      color: 'text-slate-600',
      stats: '15 ativos',
      status: 'ok',
    },
  ];

  const financeLogisticsModules: AdminModule[] = [
    {
      title: 'Formas de Envio',
      icon: Truck,
      path: '/dashboard/admin/formas-envio',
      color: 'text-orange-600',
      stats: '3 ativos',
      status: 'attention',
    },
    {
      title: 'Formas de Pagamento',
      icon: CreditCard,
      path: '/dashboard/admin/formas-pagamento',
      color: 'text-emerald-600',
      stats: '5 ativos',
      status: 'ok',
    },
  ];

  const systemModules: AdminModule[] = [
    {
      title: 'Modelos de Relatórios',
      icon: FileText,
      path: '/dashboard/admin/template-relatorios',
      color: 'text-teal-600',
      stats: 'padrão',
      status: 'ok',
    },
    {
      title: 'Integrar com sistema de estoque de terceiros',
      icon: Plug,
      path: '/dashboard/admin/integracao-estoque',
      color: 'text-sky-600',
      stats: 'integração',
      status: 'attention',
    },
  ];


  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">Configurações</h1>
      </div>

      <AdminStatusBanner />

      <div className="space-y-10">
        <AdminModuleSection title="Produção" modules={productionModules} />
        <div className="border-t border-muted/30" />
        <AdminModuleSection title="Financeiro & Logística" modules={financeLogisticsModules} />
        <div className="border-t border-muted/30" />
        <AdminModuleSection title="Usuários" modules={peopleModules} />
        <div className="border-t border-muted/30" />
        <AdminModuleSection title="Sistema" modules={systemModules} />
      </div>

    </div>
  );
}






