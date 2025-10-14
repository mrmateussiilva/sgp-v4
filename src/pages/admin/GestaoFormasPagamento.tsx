import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, CreditCard, ArrowLeft } from 'lucide-react';
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

interface FormaPagamento {
  id: number;
  nome: string;
  parcelas_max: number;
  taxa_percentual: number | string;
  ativo: boolean;
  observacao?: string;
}

export default function GestaoFormasPagamento() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formaToDelete, setFormaToDelete] = useState<FormaPagamento | null>(null);

  const [form, setForm] = useState({
    id: 0,
    nome: '',
    parcelas_max: '1',
    taxa_percentual: '0,00',
    ativo: true,
    observacao: '',
  });

  useEffect(() => {
    loadFormas();
  }, []);

  const loadFormas = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<FormaPagamento[]>('get_formas_pagamento');
      setFormas(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as formas de pagamento.',
        variant: 'destructive',
      });
      console.error('Erro ao carregar formas de pagamento:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (forma?: FormaPagamento) => {
    if (forma) {
      setIsEditing(true);
      setForm({
        id: forma.id,
        nome: forma.nome,
        parcelas_max: forma.parcelas_max.toString(),
        taxa_percentual: Number(forma.taxa_percentual).toFixed(2).replace('.', ','),
        ativo: forma.ativo,
        observacao: forma.observacao || '',
      });
    } else {
      setIsEditing(false);
      setForm({
        id: 0,
        nome: '',
        parcelas_max: '1',
        taxa_percentual: '0,00',
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
      parcelas_max: '1',
      taxa_percentual: '0,00',
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
        description: 'Nome da forma de pagamento é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const taxa = parseFloat(form.taxa_percentual.replace(',', '.')) || 0;
      const parcelas = parseInt(form.parcelas_max) || 1;

      if (isEditing) {
        await invoke('update_forma_pagamento', {
          request: {
            id: form.id,
            nome: form.nome,
            parcelas_max: parcelas,
            taxa_percentual: taxa,
            ativo: form.ativo,
            observacao: form.observacao || null,
          },
        });
        toast({
          title: 'Sucesso',
          description: 'Forma de pagamento atualizada com sucesso!',
        });
      } else {
        await invoke('create_forma_pagamento', {
          request: {
            nome: form.nome,
            parcelas_max: parcelas,
            taxa_percentual: taxa,
            ativo: form.ativo,
            observacao: form.observacao || null,
          },
        });
        toast({
          title: 'Sucesso',
          description: 'Forma de pagamento cadastrada com sucesso!',
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
      console.error('Erro ao salvar forma de pagamento:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!formaToDelete) return;

    setIsLoading(true);
    try {
      await invoke('delete_forma_pagamento', { formaId: formaToDelete.id });
      toast({
        title: 'Sucesso',
        description: 'Forma de pagamento excluída com sucesso!',
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
      console.error('Erro ao excluir forma de pagamento:', error);
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
            <CreditCard className="h-8 w-8 text-primary" />
            Gestão de Formas de Pagamento
          </h1>
          <p className="text-muted-foreground">Configure formas de pagamento e taxas</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Forma de Pagamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar forma de pagamento..."
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
                  <TableHead className="text-center">Parcelas Máx.</TableHead>
                  <TableHead className="text-right">Taxa (%)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFormas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma forma de pagamento encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFormas.map((forma) => (
                    <TableRow key={forma.id}>
                      <TableCell className="font-medium">{forma.nome}</TableCell>
                      <TableCell className="text-center">{forma.parcelas_max}x</TableCell>
                      <TableCell className="text-right">
                        {Number(forma.taxa_percentual).toFixed(2).replace('.', ',')}%
                      </TableCell>
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
            <DialogTitle>{isEditing ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize' : 'Cadastre'} as informações da forma de pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Crédito à Vista"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parcelas">Parcelas Máximas</Label>
                <Input
                  id="parcelas"
                  type="number"
                  value={form.parcelas_max}
                  onChange={(e) => handleChange('parcelas_max', e.target.value)}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxa">Taxa (%)</Label>
                <Input
                  id="taxa"
                  value={form.taxa_percentual}
                  onChange={(e) => handleChange('taxa_percentual', e.target.value)}
                  placeholder="0,00"
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
                Forma de pagamento ativa
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
              Tem certeza que deseja excluir a forma de pagamento "{formaToDelete?.nome}"?
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

