import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Eye, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Cliente {
  id: number;
  nome: string;
  cep: string;
  cidade: string;
  estado: string;
  telefone: string;
}

export default function Clientes() {
  const { toast } = useToast();
  
  // Lista de clientes
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de criar/editar
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState({
    nome: '',
    cep: '',
    cidade: '',
    estado: '',
    telefone: '',
  });
  const [buscandoCep, setBuscandoCep] = useState(false);
  
  // Modal de visualização
  const [showViewModal, setShowViewModal] = useState(false);
  const [clienteParaVisualizar, setClienteParaVisualizar] = useState<Cliente | null>(null);
  
  // Modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    setLoading(true);
    try {
      // TODO: Implementar chamada à API
      // const res = await api.getAllClientes();
      // setClientes(res.data);
      
      // Dados de exemplo
      setClientes([
        { id: 1, nome: 'Cliente Teste 1', cep: '01310-100', cidade: 'São Paulo', estado: 'SP', telefone: '(11) 99999-9999' },
        { id: 2, nome: 'Cliente Teste 2', cep: '20040-020', cidade: 'Rio de Janeiro', estado: 'RJ', telefone: '(21) 98888-8888' },
      ]);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          cidade: data.localidade,
          estado: data.uf,
        }));
        
        toast({
          title: "CEP encontrado!",
          description: `${data.localidade} - ${data.uf}`,
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setBuscandoCep(false);
    }
  };

  const abrirModal = (cliente?: Cliente) => {
    if (cliente) {
      setForm({
        nome: cliente.nome,
        cep: cliente.cep,
        cidade: cliente.cidade,
        estado: cliente.estado,
        telefone: cliente.telefone,
      });
      setEditando(cliente.id);
    } else {
      setForm({
        nome: '',
        cep: '',
        cidade: '',
        estado: '',
        telefone: '',
      });
      setEditando(null);
    }
    setShowModal(true);
  };

  const salvarCliente = async () => {
    // Validações
    if (!form.nome.trim() || !form.cidade.trim() || !form.estado.trim() || !form.telefone.trim()) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios!",
        variant: "destructive",
      });
      return;
    }

    if (!/^\([0-9]{2}\)\s[0-9]{5}-[0-9]{4}$/.test(form.telefone)) {
      toast({
        title: "Erro",
        description: "Telefone inválido. Use o formato (11) 99999-9999",
        variant: "destructive",
      });
      return;
    }

    if (!/^[A-Z]{2}$/.test(form.estado)) {
      toast({
        title: "Erro",
        description: "Estado deve conter exatamente 2 letras maiúsculas (ex: SP)",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implementar chamada à API
      if (editando) {
        // await api.updateCliente(editando, form);
        toast({
          title: "Cliente atualizado!",
          description: "Cliente atualizado com sucesso!",
        });
      } else {
        // await api.postCliente(form);
        toast({
          title: "Cliente cadastrado!",
          description: "Cliente cadastrado com sucesso!",
        });
      }
      
      setShowModal(false);
      setForm({ nome: '', cep: '', cidade: '', estado: '', telefone: '' });
      setEditando(null);
      carregarClientes();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cliente.",
        variant: "destructive",
      });
    }
  };

  const confirmarExclusao = async () => {
    if (!clienteParaExcluir) return;

    try {
      // TODO: Implementar chamada à API
      // await api.deleteCliente(clienteParaExcluir.id);
      
      toast({
        title: "Cliente excluído!",
        description: "Cliente excluído com sucesso!",
      });
      
      setShowDeleteModal(false);
      setClienteParaExcluir(null);
      carregarClientes();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    }
  };

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone?.includes(searchTerm)
  );

  // Paginação
  const totalPages = Math.ceil(clientesFiltrados.length / itemsPerPage);
  const clientesPaginados = clientesFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Clientes</h1>
          <p className="text-muted-foreground">Gerencie os clientes do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => abrirModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Busca */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/20">
        <CardHeader className="bg-blue-50/50">
          <CardTitle className="text-blue-900">Buscar Clientes</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CEP</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="w-[80px]">UF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : clientesPaginados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesPaginados.map((cliente) => (
                    <TableRow key={cliente.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">#{cliente.id}</TableCell>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.cep}</TableCell>
                      <TableCell>{cliente.cidade}</TableCell>
                      <TableCell>{cliente.estado}</TableCell>
                      <TableCell>{cliente.telefone}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setClienteParaVisualizar(cliente);
                              setShowViewModal(true);
                            }}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => abrirModal(cliente)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setClienteParaExcluir(cliente);
                              setShowDeleteModal(true);
                            }}
                            className="h-8 w-8 text-destructive hover:text-destructive"
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
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, clientesFiltrados.length)} de {clientesFiltrados.length} clientes
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar Cliente */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editando ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente abaixo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="font-medium">Nome Completo *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Digite o nome completo"
                className="bg-white"
              />
            </div>

            {/* CEP */}
            <div className="space-y-2">
              <Label htmlFor="cep" className="font-medium">CEP *</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  value={form.cep}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setForm({ ...form, cep: valor });
                    
                    // Buscar CEP automaticamente quando completo
                    const cepLimpo = valor.replace(/\D/g, '');
                    if (cepLimpo.length === 8) {
                      buscarCep(valor);
                    }
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                  className="bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => buscarCep(form.cep)}
                  disabled={buscandoCep}
                >
                  {buscandoCep ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
            </div>

            {/* Cidade e Estado */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cidade" className="font-medium">Cidade *</Label>
                <Input
                  id="cidade"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  placeholder="São Paulo"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado" className="font-medium">UF *</Label>
                <Input
                  id="estado"
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                  placeholder="SP"
                  maxLength={2}
                  className="bg-white uppercase"
                />
              </div>
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="telefone" className="font-medium">Telefone *</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarCliente}>
              {editando ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>

          {clienteParaVisualizar && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">ID:</span>
                <span className="font-medium">#{clienteParaVisualizar.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">Nome:</span>
                <span className="font-medium">{clienteParaVisualizar.nome}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">CEP:</span>
                <span className="font-medium">{clienteParaVisualizar.cep}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">Cidade/UF:</span>
                <span className="font-medium">{clienteParaVisualizar.cidade} - {clienteParaVisualizar.estado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Telefone:</span>
                <span className="font-medium">{clienteParaVisualizar.telefone}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowViewModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{clienteParaExcluir?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
