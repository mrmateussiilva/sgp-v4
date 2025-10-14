import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Users, ArrowLeft } from 'lucide-react';
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

interface Vendedor {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  comissao_percentual: number | string;
  ativo: boolean;
  observacao?: string;
}

export default function GestaoVendedores() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendedorToDelete, setVendedorToDelete] = useState<Vendedor | null>(null);

  const [form, setForm] = useState({
    id: 0,
    nome: '',
    email: '',
    telefone: '',
    comissao_percentual: '0,00',
    ativo: true,
    observacao: '',
  });

  useEffect(() => {
    loadVendedores();
  }, []);

  const loadVendedores = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<Vendedor[]>('get_vendedores');
      setVendedores(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os vendedores.',
        variant: 'destructive',
      });
      console.error('Erro ao carregar vendedores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (vendedor?: Vendedor) => {
    if (vendedor) {
      setIsEditing(true);
      setForm({
        id: vendedor.id,
        nome: vendedor.nome,
        email: vendedor.email || '',
        telefone: vendedor.telefone || '',
        comissao_percentual: Number(vendedor.comissao_percentual).toFixed(2).replace('.', ','),
        ativo: vendedor.ativo,
        observacao: vendedor.observacao || '',
      });
    } else {
      setIsEditing(false);
      setForm({
        id: 0,
        nome: '',
        email: '',
        telefone: '',
        comissao_percentual: '0,00',
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
      comissao_percentual: '0,00',
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
        description: 'Nome do vendedor é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const comissao = parseFloat(form.comissao_percentual.replace(',', '.')) || 0;

      if (isEditing) {
        await invoke('update_vendedor', {
          request: {
            id: form.id,
            nome: form.nome,
            email: form.email || null,
            telefone: form.telefone || null,
            comissao_percentual: comissao,
            ativo: form.ativo,
            observacao: form.observacao || null,
          },
        });
        toast({
          title: 'Sucesso',
          description: 'Vendedor atualizado com sucesso!',
        });
      } else {
        await invoke('create_vendedor', {
          request: {
            nome: form.nome,
            email: form.email || null,
            telefone: form.telefone || null,
            comissao_percentual: comissao,
            ativo: form.ativo,
            observacao: form.observacao || null,
          },
        });
        toast({
          title: 'Sucesso',
          description: 'Vendedor cadastrado com sucesso!',
        });
      }

      handleCloseModal();
      loadVendedores();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao salvar vendedor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vendedorToDelete) return;

    setIsLoading(true);
    try {
      await invoke('delete_vendedor', { vendedorId: vendedorToDelete.id });
      toast({
        title: 'Sucesso',
        description: 'Vendedor excluído com sucesso!',
      });
      setShowDeleteModal(false);
      setVendedorToDelete(null);
      loadVendedores();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao excluir vendedor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendedores = vendedores.filter(vendedor =>
    vendedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendedor.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Gestão de Vendedores
          </h1>
          <p className="text-muted-foreground">Gerencie vendedores e comissões</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Vendedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && vendedores.length === 0 ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Comissão (%)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum vendedor encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendedores.map((vendedor) => (
                    <TableRow key={vendedor.id}>
                      <TableCell className="font-medium">{vendedor.nome}</TableCell>
                      <TableCell>{vendedor.email || '-'}</TableCell>
                      <TableCell>{vendedor.telefone || '-'}</TableCell>
                      <TableCell className="text-right">
                        {Number(vendedor.comissao_percentual).toFixed(2).replace('.', ',')}%
                      </TableCell>
                      <TableCell className="text-center">
                        {vendedor.ativo ? (
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
                            onClick={() => handleOpenModal(vendedor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => {
                              setVendedorToDelete(vendedor);
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
            <DialogTitle>{isEditing ? 'Editar Vendedor' : 'Novo Vendedor'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize' : 'Cadastre'} as informações do vendedor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Carlos Vendas"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="carlos@example.com"
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="comissao">Comissão (%)</Label>
              <Input
                id="comissao"
                value={form.comissao_percentual}
                onChange={(e) => handleChange('comissao_percentual', e.target.value)}
                placeholder="5,00"
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
                Vendedor ativo
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
              Tem certeza que deseja excluir o vendedor "{vendedorToDelete?.nome}"?
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

