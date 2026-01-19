import { Package, Palette, Users, Truck, CreditCard, Settings, FileText } from 'lucide-react';
import { AdminStatusBanner } from '@/components/admin/AdminStatusBanner';
import { AdminModuleSection } from '@/components/admin/AdminModuleSection';
import { AdminModule } from '@/components/admin/AdminModuleCard';

export default function Admin() {
  const productionModules: AdminModule[] = [
    {
      title: 'Materiais',
      icon: Package,
      path: '/dashboard/admin/materiais',
      color: 'text-blue-500',
      stats: '12 MATERIAIS',
      status: 'ok',
    },
    {
      title: 'Tipos de Produção',
      icon: Package,
      path: '/dashboard/admin/tipos-producao',
      color: 'text-amber-500',
      stats: '8 TIPOS',
      status: 'ok',
    },
  ];

  const peopleModules: AdminModule[] = [
    {
      title: 'Designers',
      icon: Palette,
      path: '/dashboard/admin/designers',
      color: 'text-purple-500',
      stats: '5 ATIVOS',
      status: 'ok',
    },
    {
      title: 'Vendedores',
      icon: Users,
      path: '/dashboard/admin/vendedores',
      color: 'text-green-500',
      stats: '8 VENDEDORES',
      status: 'ok',
    },
    {
      title: 'Usuários',
      icon: Settings,
      path: '/dashboard/admin/usuarios',
      color: 'text-slate-500',
      stats: '15 CONTAS',
      status: 'ok',
    },
  ];

  const financeLogisticsModules: AdminModule[] = [
    {
      title: 'Formas de Envio',
      icon: Truck,
      path: '/dashboard/admin/formas-envio',
      color: 'text-orange-500',
      stats: '3 ATIVAS',
      status: 'attention',
    },
    {
      title: 'Formas de Pagamento',
      icon: CreditCard,
      path: '/dashboard/admin/formas-pagamento',
      color: 'text-emerald-500',
      stats: '5 MÉTODOS',
      status: 'ok',
    },
  ];

  const systemModules: AdminModule[] = [
    {
      title: 'Templates de Relatórios',
      icon: FileText,
      path: '/dashboard/admin/template-relatorios',
      color: 'text-teal-500',
      stats: 'PADRÃO',
      status: 'ok',
    },
  ];

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto mb-10">
      <div className="flex items-end justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">ADMINISTRAÇÃO</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Painel de Controle</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase italic">v1.2.0-stable</p>
        </div>
      </div>

      <AdminStatusBanner />

      <div className="space-y-8">
        <AdminModuleSection title="Fluxo de Produção" modules={productionModules} />
        <AdminModuleSection title="Gestão de Equipe" modules={peopleModules} />
        <AdminModuleSection title="Financeiro & Entregas" modules={financeLogisticsModules} />
        <AdminModuleSection title="Configurações Globais" modules={systemModules} />
      </div>
    </div>
  );
}



