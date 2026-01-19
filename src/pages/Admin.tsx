import { Package, Palette, Users, Truck, CreditCard, Settings, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  ];


  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto mb-10">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Configurações</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Controle Administrativo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest gap-2">
            <FileText className="h-3.5 w-3.5" />
            Relatórios Avançados
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest gap-2">
            <Settings className="h-3.5 w-3.5" />
            Auditoria
          </Button>
        </div>
      </div>

      <AdminStatusBanner />

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AdminModuleSection title="Produção" modules={productionModules} />
          <AdminModuleSection title="Financeiro & Logística" modules={financeLogisticsModules} />
        </div>

        <AdminModuleSection title="Equipes e Usuários" modules={peopleModules} />

        <div className="pt-4 border-t">
          <AdminModuleSection title="Sistema e Documentos" modules={systemModules} />
        </div>
      </div>
    </div>
  );
}





