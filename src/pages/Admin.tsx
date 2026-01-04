import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Package, Palette, Users, Truck, CreditCard, Settings, Trash2, RotateCcw, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useOrderStore } from '@/store/orderStore';

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setOrders } = useOrderStore();
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [resetIdsDialogOpen, setResetIdsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleDeleteAllOrders = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAllOrders();
      setOrders([]);
      toast({
        title: 'Pedidos excluídos',
        description: 'Todos os pedidos foram excluídos com sucesso.',
        variant: 'info',
      });
      setDeleteAllDialogOpen(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Não foi possível deletar todos os pedidos.';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetIds = async () => {
    setIsResetting(true);
    try {
      await api.resetOrderIds();
      toast({
        title: 'Sucesso',
        description: 'Sequência de IDs foi resetada. Próximos pedidos começarão do ID 1.',
        variant: 'success',
      });
      setResetIdsDialogOpen(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Não foi possível resetar a sequência de IDs.';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

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
    {
      title: 'Template de Ficha',
      description: 'Configure o template global da ficha de serviço',
      icon: FileText,
      path: '/dashboard/admin/template-ficha',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100',
    },
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

      {/* Seção de Gerenciamento de Pedidos */}
      <div className="mt-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Gerenciamento de Pedidos</CardTitle>
            <CardDescription>
              Ações administrativas para gerenciar pedidos e IDs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="destructive"
                onClick={() => setDeleteAllDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Apagar Todos os Pedidos
              </Button>
              <Button
                variant="outline"
                onClick={() => setResetIdsDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Resetar IDs (Começar do 1)
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              ⚠️ <strong>Atenção:</strong> Essas ações são irreversíveis. Use com cuidado.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação - Deletar Todos */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão de Todos os Pedidos</DialogTitle>
            <DialogDescription>
              Esta ação irá <strong>deletar permanentemente</strong> todos os pedidos do sistema.
              Esta ação <strong>NÃO pode ser desfeita</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Todos os pedidos serão perdidos permanentemente!
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAllDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllOrders}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deletando...' : 'Sim, Deletar Todos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação - Resetar IDs */}
      <Dialog open={resetIdsDialogOpen} onOpenChange={setResetIdsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Sequência de IDs</DialogTitle>
            <DialogDescription>
              Esta ação irá resetar a sequência de IDs dos pedidos para começar do 1.
              Isso significa que o próximo pedido criado terá ID = 1.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Atenção:</strong> Esta ação só deve ser feita após deletar todos os pedidos.
              Se houver pedidos no sistema, pode causar conflitos de ID.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetIdsDialogOpen(false)}
              disabled={isResetting}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleResetIds}
              disabled={isResetting}
            >
              {isResetting ? 'Resetando...' : 'Sim, Resetar IDs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

