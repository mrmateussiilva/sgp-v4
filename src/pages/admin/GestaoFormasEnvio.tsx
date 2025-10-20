import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Truck, ArrowLeft } from 'lucide-react';
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
import { invoke } from '@tauri-apps/api/tauri';
import { useAuthStore } from '../../store/authStore';

interface FormaEnvio {
  id: number;
  nome: string;
  valor: number | string;
  prazo_dias: number;
  ativo: boolean;
  observacao?: string;
}

export default function GestaoFormasEnvio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formas, setFormas] = useState<FormaEnvio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formaToDelete, setFormaToDelete] = useState<FormaEnvio | null>(null);
  const sessionToken = useAuthStore((state) => state.sessionToken);

  const [form, setForm] = useState({
    id: 0,
    nome: '',
    valor: '0,00',
    prazo_dias: '0',
    ativo: true,
    observacao: '',
  });

  useEffect(() => {
    loadFormas();
  }, []);

  const loadFormas = async () => {
    setIsLoading(true);
    try {
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      const data = await invoke<FormaEnvio[]>('get_formas_envio', { sessionToken });
      setFormas(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as formas de envio.',
        variant: 'destructive',
      });
      console.error('Erro ao carregar formas de envio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (forma?: FormaEnvio) => {
    if (forma) {
      setIsEditing(true);
      setForm({
        id: forma.id,
        nome: forma.nome,
        valor: Number(forma.valor).toFixed(2).replace('.', ','),
        prazo_dias: forma.prazo_dias.toString(),
        ativo: forma.ativo,
        observacao: forma.observacao || '',
      });
    } else {
      setIsEditing(false);
      setForm({
        id: 0,
        nome: '',
        valor: '0,00',
        prazo_dias: '0',
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
      valor: '0,00',
      prazo_dias: '0',
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
        description: 'Nome da forma de envio é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const valor = parseFloat(form.valor.replace(',', '.')) || 0;
      const prazo = parseInt(form.prazo_dias) || 0;

      if (isEditing) {
        if (!sessionToken) {
          navigate('/login');
          return;
        }

        await invoke('update_forma_envio', {
          sessionToken,
          request: {
            id: form.id,
            nome: form.nome,
            valor,
            prazo_dias: prazo,
            ativo: form.ativo,
            observacao: form.observacao || null,
          },
        });
        toast({
          title: 'Sucesso',
          description: 'Forma de envio atualizada com sucesso!',
        });
      } else {
        if (!sessionToken) {
          navigate('/login');
          return;
        }

        await invoke('create_forma_envio', {
          sessionToken,
          request: {
            nome: form.nome,
            valor,
            prazo_dias: prazo,
            ativo: form.ativo,
            observacao: form.observacao || null,
          },
        });
        toast({
          title: 'Sucesso',
          description: 'Forma de envio cadastrada com sucesso!',
        });
      }

      handleCloseModal();
      loadFormas();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao salvar forma de envio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!formaToDelete) return;

    setIsLoading(true);
    try {
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      await invoke('delete_forma_envio', { sessionToken, formaId: formaToDelete.id });
      toast({
        title: 'Sucesso',
        description: 'Forma de envio excluída com sucesso!',
      });
      setShowDeleteModal(false);
      setFormaToDelete(null);
      loadFormas();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao excluir forma de envio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFormas = formas.filter(forma =>
    forma.nome.toLowerCase().includes(searchTerm.toLowerCase())
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
            <Truck className="h-8 w-8 text-primary" />
            Gestão de Formas de Envio
          </h1>
          <p className="text-muted-foreground">Configure formas e valores de envio</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Forma de Envio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar forma de envio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && formas.length === 0 ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Prazo (dias)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFormas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma forma de envio encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFormas.map((forma) => (
                    <TableRow key={forma.id}>
                      <TableCell className="font-medium">{forma.nome}</TableCell>
                      <TableCell className="text-right">
                        R$ {Number(forma.valor).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="text-center">{forma.prazo_dias} dias</TableCell>
                      <TableCell className="text-center">
                        {forma.ativo ? (
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
                            onClick={() => handleOpenModal(forma)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => {
                              setFormaToDelete(forma);
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
            <DialogTitle>{isEditing ? 'Editar Forma de Envio' : 'Nova Forma de Envio'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize' : 'Cadastre'} as informações da forma de envio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Entrega Expressa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  value={form.valor}
                  onChange={(e) => handleChange('valor', e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo (dias)</Label>
                <Input
                  id="prazo"
                  type="number"
                  value={form.prazo_dias}
                  onChange={(e) => handleChange('prazo_dias', e.target.value)}
                  placeholder="0"
                />
              </div>
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
                Forma de envio ativa
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
              Tem certeza que deseja excluir a forma de envio "{formaToDelete?.nome}"?
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
