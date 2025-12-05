import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Users, ArrowLeft, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '../../store/authStore';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  UserEntity,
} from '../../services/api';
import { formatDateForDisplay } from '@/utils/date';

type Usuario = UserEntity;

export default function GestaoUsuarios() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const sessionToken = useAuthStore((state) => state.sessionToken);

  const [form, setForm] = useState({
    id: 0,
    username: '',
    password: '',
    confirmPassword: '',
    is_admin: false,
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setIsLoading(true);
    try {
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      const data = await getUsers(sessionToken);
      setUsuarios(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (usuario?: Usuario) => {
    if (usuario) {
      setIsEditing(true);
      setForm({
        id: usuario.id,
        username: usuario.username,
        password: '',
        confirmPassword: '',
        is_admin: usuario.is_admin,
      });
    } else {
      setIsEditing(false);
      setForm({
        id: 0,
        username: '',
        password: '',
        confirmPassword: '',
        is_admin: false,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({
      id: 0,
      username: '',
      password: '',
      confirmPassword: '',
      is_admin: false,
    });
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validações
    if (!form.username.trim()) {
      toast({
        title: 'Atenção',
        description: 'Nome de usuário é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (!isEditing && !form.password) {
      toast({
        title: 'Atenção',
        description: 'Senha é obrigatória para novos usuários.',
        variant: 'destructive',
      });
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      toast({
        title: 'Atenção',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    if (form.password && form.password.length < 4) {
      toast({
        title: 'Atenção',
        description: 'A senha deve ter pelo menos 4 caracteres.',
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

        await updateUser(sessionToken, {
          id: form.id,
          username: form.username,
          password: form.password || undefined,
          is_admin: form.is_admin,
          is_active: true,
        });
        toast({
          title: 'Sucesso',
          description: 'Usuário atualizado com sucesso!',
        });
      } else {
        if (!sessionToken) {
          navigate('/login');
          return;
        }

        await createUser(sessionToken, {
          username: form.username,
          password: form.password,
          is_admin: form.is_admin,
          is_active: true,
        });
        toast({
          title: 'Sucesso',
          description: 'Usuário cadastrado com sucesso!',
        });
      }

      handleCloseModal();
      loadUsuarios();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao salvar usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!usuarioToDelete) return;

    setIsLoading(true);
    try {
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      await deleteUser(sessionToken, usuarioToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso!',
      });
      setShowDeleteModal(false);
      setUsuarioToDelete(null);
      loadUsuarios();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao excluir usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.username.toLowerCase().includes(searchTerm.toLowerCase())
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
            <Users className="h-8 w-8 text-primary" />
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && usuarios.length === 0 ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {usuario.is_admin ? (
                          <Shield className="h-4 w-4 text-orange-500" />
                        ) : (
                          <User className="h-4 w-4 text-gray-500" />
                        )}
                        {usuario.username}
                      </TableCell>
                      <TableCell className="text-center">
                        {usuario.is_admin ? (
                          <Badge className="bg-orange-500">Administrador</Badge>
                        ) : (
                          <Badge variant="secondary">Usuário</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDateForDisplay(usuario.created_at ?? null, '-')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenModal(usuario)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => {
                              setUsuarioToDelete(usuario);
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
            <DialogTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize' : 'Cadastre'} as informações do usuário
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário *</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="Ex: joao.silva"
                noUppercase
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {isEditing ? 'Nova Senha (deixe vazio para não alterar)' : 'Senha *'}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Digite a senha"
              />
            </div>

            {form.password && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Digite a senha novamente"
                />
              </div>
            )}

            <div className="flex items-center space-x-2 p-4 bg-orange-50 rounded border border-orange-200">
              <Checkbox
                id="is_admin"
                checked={form.is_admin}
                onCheckedChange={(checked) => handleChange('is_admin', checked)}
              />
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                <label
                  htmlFor="is_admin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Conceder permissões de Administrador
                </label>
              </div>
            </div>

            {form.is_admin && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                ⚠️ Usuários administradores têm acesso completo ao sistema, incluindo configurações e gestão de outros usuários.
              </div>
            )}
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
              Tem certeza que deseja excluir o usuário "{usuarioToDelete?.username}"?
              Esta ação não pode ser desfeita.
              {usuarioToDelete?.is_admin && (
                <div className="mt-2 text-orange-600 font-semibold">
                  ⚠️ Este é um usuário administrador!
                </div>
              )}
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
