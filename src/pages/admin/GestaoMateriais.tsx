import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Material {
  id: number;
  nome: string;
  tipo: string;
  valor_metro: number;
  estoque_metros: number;
  ativo: boolean;
  observacao?: string;
}

const TIPOS_MATERIAL = [
  'LONA',
  'TECIDO',
  'VINIL',
  'PAPEL',
  'ACM',
  'PVC',
  'OUTRO'
];

export default function GestaoMateriais() {
  const { toast } = useToast();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const [form, setForm] = useState({
    id: 0,
    nome: '',
    tipo: 'LONA',
    valor_metro: '0.00',
    estoque_metros: '0.00',
    ativo: true,
    observacao: '',
  });

  useEffect(() => {
    loadMateriais();
  }, []);

  const loadMateriais = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<Material[]>('get_materiais');
      setMateriais(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os materiais.',
        variant: 'destructive',
      });
      console.error('Erro ao carregar materiais:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (material?: Material) => {
    if (material) {
      setIsEditing(true);
      setForm({
        id: material.id,
        nome: material.nome,
        tipo: material.tipo,
        valor_metro: material.valor_metro.toString().replace('.', ','),
        estoque_metros: material.estoque_metros.toString().replace('.', ','),
        ativo: material.ativo,
        observacao: material.observacao || '',
      });
    } else {
      setIsEditing(false);
      setForm({
        id: 0,
        nome: '',
        tipo: 'LONA',
        valor_metro: '0,00',
        estoque_metros: '0,00',
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
      tipo: 'LONA',
      valor_metro: '0,00',
      estoque_metros: '0,00',
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
        description: 'Nome do material é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const valor_metro = parseFloat(form.valor_metro.replace(',', '.')) || 0;
      const estoque_metros = parseFloat(form.estoque_metros.replace(',', '.')) || 0;

      if (isEditing) {
        await invoke('update_material', {
          request: {
            id: form.id,
            nome: form.nome,
            tipo: form.tipo,
            valor_metro,
            estoque_metros,
            ativo: form.ativo,
            observacao: form.observacao || null,
          },
        });
        toast({
          title: 'Sucesso',
          description: 'Material atualizado com sucesso!',
        });
      } else {
        await invoke('create_material', {
          request: {
            nome: form.nome,
            tipo: form.tipo,
            valor_metro,
            estoque_metros,
            ativo: form.ativo,
            observacao: form.observacao || null,
          },
        });
        toast({
          title: 'Sucesso',
          description: 'Material cadastrado com sucesso!',
        });
      }

      handleCloseModal();
      loadMateriais();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao salvar material:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;

    setIsLoading(true);
    try {
      await invoke('delete_material', { materialId: materialToDelete.id });
      toast({
        title: 'Sucesso',
        description: 'Material excluído com sucesso!',
      });
      setShowDeleteModal(false);
      setMaterialToDelete(null);
      loadMateriais();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.toString(),
        variant: 'destructive',
      });
      console.error('Erro ao excluir material:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMateriais = materiais.filter(material =>
    material.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Gestão de Materiais
          </h1>
          <p className="text-muted-foreground">Gerencie materiais, tecidos e lonas</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Material
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && materiais.length === 0 ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor/m²</TableHead>
                  <TableHead className="text-right">Estoque (m)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMateriais.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum material encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMateriais.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {material.valor_metro.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="text-right">
                        {material.estoque_metros.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="text-center">
                        {material.ativo ? (
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
                            onClick={() => handleOpenModal(material)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => {
                              setMaterialToDelete(material);
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Material' : 'Novo Material'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize' : 'Cadastre'} as informações do material
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Material *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: Lona Frontlit 440g"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={form.tipo} onValueChange={(value) => handleChange('tipo', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_MATERIAL.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_metro">Valor por m² (R$)</Label>
                <Input
                  id="valor_metro"
                  value={form.valor_metro}
                  onChange={(e) => handleChange('valor_metro', e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estoque_metros">Estoque (metros)</Label>
                <Input
                  id="estoque_metros"
                  value={form.estoque_metros}
                  onChange={(e) => handleChange('estoque_metros', e.target.value)}
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
                Material ativo
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
              Tem certeza que deseja excluir o material "{materialToDelete?.nome}"?
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

