import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Palette, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getDesigners, createDesigner, updateDesigner, deleteDesigner } from '../../services/api';
import type { DesignerEntity } from '../../services/api';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '../../store/authStore';

export default function GestaoDesigners() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [designers, setDesigners] = useState<DesignerEntity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [designerToDelete, setDesignerToDelete] = useState<DesignerEntity | null>(null);
  const sessionToken = useAuthStore((state) => state.sessionToken);

  const [form, setForm] = useState({
    id: 0,
    nome: '',
    email: '',
    telefone: '',
    ativo: true,
    observacao: '',
  });

  useEffect(() => {
    loadDesigners();
  }, []);

  const loadDesigners = async () => {
    setIsLoading(true);
    try {
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      const data = await getDesigners(sessionToken);
      setDesigners(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os designers.',
        variant: 'destructive',
      });
      console.error('Erro ao carregar designers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (designer?: DesignerEntity) => {
    if (designer) {
      setIsEditing(true);
      setForm({
        id: designer.id,
        nome: designer.nome,
        email: designer.email || '',
        telefone: designer.telefone || '',
        ativo: designer.ativo,
        observacao: designer.observacao || '',
      });
    } else {
      setIsEditing(false);
      setForm({
        id: 0,
        nome: '',
        email: '',
        telefone: '',
        ativo: true,
        observacao: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({
      id: 0,
      nome: '',
      email: '',
      telefone: '',
      ativo: true,
      observacao: '',
    });
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome do designer é obrigatório.',
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

        await updateDesigner(sessionToken, {
            id: form.id,
            nome: form.nome,
            email: form.email || null,
            telefone: form.telefone || null,
            ativo: form.ativo,
            observacao: form.observacao || null,
          });
        toast({
          title: 'Sucesso',
          description: 'Designer atualizado com sucesso!',
        });
      } else {
        if (!sessionToken) {
          navigate('/login');
          return;
        }

        await createDesigner(sessionToken, {
            nome: form.nome,
            email: form.email || null,
            telefone: form.telefone || null,
            ativo: form.ativo,
            observacao: form.observacao || null,
          });
        toast({
          title: 'Sucesso',
          description: 'Designer cadastrado com sucesso!',
        });
      }

      handleCloseModal();
      loadDesigners();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao salvar designer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!designerToDelete) return;

    setIsLoading(true);
    try {
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      await deleteDesigner(sessionToken, designerToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Designer excluído com sucesso!',
      });
      setShowDeleteModal(false);
      setDesignerToDelete(null);
      loadDesigners();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao excluir designer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDesigners = designers.filter(designer =>
    designer.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    designer.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <Palette className="h-8 w-8 text-primary" />
            Gestão de Designers
          </h1>
          <p className="text-muted-foreground">Gerencie designers e arte-finalistas</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Designer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar designer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && designers.length === 0 ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDesigners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum designer encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDesigners.map((designer) => (
                    <TableRow key={designer.id}>
                      <TableCell className="font-medium">{designer.nome}</TableCell>
                      <TableCell>{designer.email || '-'}</TableCell>
                      <TableCell>{designer.telefone || '-'}</TableCell>
                      <TableCell className="text-center">
                        {designer.ativo ? (
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
                            onClick={() => handleOpenModal(designer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => {
                              setDesignerToDelete(designer);
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
            <DialogTitle>{isEditing ? 'Editar Designer' : 'Novo Designer'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize' : 'Cadastre'} as informações do designer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="joao@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={form.observacao}
                onChange={(e) => handleChange('observacao', e.target.value)}
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(checked) => handleChange('ativo', checked)}
              />
              <label
                htmlFor="ativo"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Designer ativo
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
              Tem certeza que deseja excluir o designer "{designerToDelete?.nome}"?
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
