import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Package, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { getTiposProducao, createTipoProducao, updateTipoProducao, deleteTipoProducao, type TipoProducaoEntity } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface TipoProducao {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  created_at?: string;
}

export default function GestaoTiposProducao() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tiposProducao, setTiposProducao] = useState<TipoProducao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<TipoProducao | null>(null);
  const sessionToken = useAuthStore((state) => state.sessionToken);

  const [form, setForm] = useState({
    id: 0,
    name: '',
    description: '',
    active: true,
  });

  useEffect(() => {
    loadTiposProducao();
  }, []);

  const loadTiposProducao = async () => {
    setIsLoading(true);
    try {
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      const data = await getTiposProducao(sessionToken);
      setTiposProducao(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tipos de produção.',
        variant: 'destructive',
      });
      console.error('Erro ao carregar tipos de produção:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (tipo?: TipoProducaoEntity) => {
    if (tipo) {
      setIsEditing(true);
      setForm({
        id: tipo.id,
        name: tipo.name,
        description: tipo.description || '',
        active: tipo.active,
      });
    } else {
      setIsEditing(false);
      setForm({
        id: 0,
        name: '',
        description: '',
        active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({
      id: 0,
      name: '',
      description: '',
      active: true,
    });
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome do tipo de produção é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        if (!sessionToken) {
          navigate('/login');
          return;
        }

        await updateTipoProducao(sessionToken, {
          id: form.id,
          name: form.name,
          description: form.description || null,
          active: form.active,
        });
        toast({
          title: 'Sucesso',
          description: 'Tipo de produção atualizado com sucesso!',
        });
      } else {
        if (!sessionToken) {
          navigate('/login');
          return;
        }

        await createTipoProducao(sessionToken, {
          name: form.name,
          description: form.description || null,
          active: form.active,
        });
        toast({
          title: 'Sucesso',
          description: 'Tipo de produção cadastrado com sucesso!',
        });
      }

      handleCloseModal();
      loadTiposProducao();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao salvar tipo de produção:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tipoToDelete) return;

    setIsLoading(true);
    try {
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      await deleteTipoProducao(sessionToken, tipoToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Tipo de produção excluído com sucesso!',
      });
      setShowDeleteModal(false);
      setTipoToDelete(null);
      loadTiposProducao();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao excluir tipo de produção:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTipos = tiposProducao.filter(tipo =>
    tipo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/admin')}
        className="gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Admin
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Gestão de Tipos de Produção
          </h1>
          <p className="text-muted-foreground">Gerencie os tipos de produção disponíveis no sistema</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Tipo de Produção
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar tipo de produção..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && tiposProducao.length === 0 ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum tipo de produção encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTipos.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium">{tipo.name}</TableCell>
                      <TableCell>{tipo.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        {tipo.active ? (
                          <Badge className="bg-green-500">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenModal(tipo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => {
                              setTipoToDelete(tipo);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Tipo de Produção' : 'Novo Tipo de Produção'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize' : 'Cadastre'} as informações do tipo de produção
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: painel, totem, lona"
              />
              <p className="text-xs text-muted-foreground">
                Use letras minúsculas, sem espaços. Ex: painel, totem, lona, adesivo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Descrição do tipo de produção (será exibida no sistema)"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={form.active}
                onCheckedChange={(checked) => handleChange('active', checked)}
              />
              <label
                htmlFor="active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Tipo de produção ativo
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o tipo de produção "{tipoToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

