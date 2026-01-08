import { useNavigate } from 'react-router-dom';
import { Package, Palette, Users, Truck, CreditCard, Settings, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Admin() {
  const navigate = useNavigate();

  const adminModules = [
    {
      title: 'Materiais',
      description: 'Gerencie materiais, tecidos e lonas',
      icon: Package,
      path: '/dashboard/admin/materiais',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      title: 'Designers',
      description: 'Cadastro de designers e arte-finalistas',
      icon: Palette,
      path: '/dashboard/admin/designers',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
    },
    {
      title: 'Vendedores',
      description: 'Gerencie vendedores e comissões',
      icon: Users,
      path: '/dashboard/admin/vendedores',
      color: 'text-green-500',
      bgColor: 'bg-green-50 hover:bg-green-100',
    },
    {
      title: 'Tipos de Produção',
      description: 'Gerencie tipos de produção disponíveis',
      icon: Package,
      path: '/dashboard/admin/tipos-producao',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 hover:bg-amber-100',
    },
    {
      title: 'Formas de Envio',
      description: 'Configure formas e valores de envio',
      icon: Truck,
      path: '/dashboard/admin/formas-envio',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
    },
    {
      title: 'Formas de Pagamento',
      description: 'Configure formas de pagamento e taxas',
      icon: CreditCard,
      path: '/dashboard/admin/formas-pagamento',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100',
    },
    {
      title: 'Usuários',
      description: 'Gerencie usuários e permissões',
      icon: Settings,
      path: '/dashboard/admin/usuarios',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
    },
    // Desativado temporariamente
    // {
    //   title: 'Template de Ficha',
    //   description: 'Configure o template global da ficha de serviço',
    //   icon: FileText,
    //   path: '/dashboard/admin/template-ficha',
    //   color: 'text-indigo-500',
    //   bgColor: 'bg-indigo-50 hover:bg-indigo-100',
    // },
    {
      title: 'Templates de Relatórios',
      description: 'Configure templates de relatórios de envios e fechamentos',
      icon: FileText,
      path: '/dashboard/admin/template-relatorios',
      color: 'text-teal-500',
      bgColor: 'bg-teal-50 hover:bg-teal-100',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground">Gerencie configurações e dados do sistema</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminModules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.path}
              className={`cursor-pointer transition-all hover:shadow-lg ${module.bgColor} border-2`}
              onClick={() => navigate(module.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-6 w-6 ${module.color}`} />
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

