import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithMask } from '@/components/ui/input-mask';
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
import { cn } from '@/lib/utils';

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
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [salvando, setSalvando] = useState(false);
  
  // Validações em tempo real
  const [erros, setErros] = useState({
    nome: '',
    cep: '',
    cidade: '',
    estado: '',
    telefone: '',
  });
  
  // Modal de visualização
  const [showViewModal, setShowViewModal] = useState(false);
  const [clienteParaVisualizar, setClienteParaVisualizar] = useState<Cliente | null>(null);
  
  // Modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    setLoading(true);
    try {
      // TODO: Implementar chamada à API Rust
      // const res = await invoke('get_clientes');
      // setClientes(res);
      
      // Dados de exemplo por enquanto
      setClientes([
        { id: 1, nome: 'João Silva', cep: '01310-100', cidade: 'São Paulo', estado: 'SP', telefone: '(11) 99999-9999' },
        { id: 2, nome: 'Maria Santos', cep: '20040-020', cidade: 'Rio de Janeiro', estado: 'RJ', telefone: '(21) 98888-8888' },
        { id: 3, nome: 'Pedro Oliveira', cep: '30130-100', cidade: 'Belo Horizonte', estado: 'MG', telefone: '(31) 97777-7777' },
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
    
    if (cepLimpo.length !== 8) {
      setErros(prev => ({ ...prev, cep: 'CEP deve ter 8 dígitos' }));
      return;
    }

    setBuscandoCep(true);
    setErros(prev => ({ ...prev, cep: '' }));
    
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
        setErros(prev => ({ ...prev, cep: 'CEP não encontrado' }));
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setErros(prev => ({ ...prev, cep: 'Erro ao buscar CEP' }));
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setBuscandoCep(false);
    }
  };

  const validarCampo = (campo: string, valor: string) => {
    let erro = '';

    switch (campo) {
      case 'nome':
        if (!valor.trim()) {
          erro = 'Nome é obrigatório';
        } else if (valor.trim().length < 3) {
          erro = 'Nome deve ter no mínimo 3 caracteres';
        }
        break;
      
      case 'cep':
        const cepLimpo = valor.replace(/\D/g, '');
        if (!cepLimpo) {
          erro = 'CEP é obrigatório';
        } else if (cepLimpo.length !== 8) {
          erro = 'CEP deve ter 8 dígitos';
        }
        break;
      
      case 'cidade':
        if (!valor.trim()) {
          erro = 'Cidade é obrigatória';
        }
        break;
      
      case 'estado':
        if (!valor.trim()) {
          erro = 'Estado é obrigatório';
        } else if (!/^[A-Z]{2}$/.test(valor)) {
          erro = 'Estado deve ter 2 letras maiúsculas (ex: SP)';
        }
        break;
      
      case 'telefone':
        const telLimpo = valor.replace(/\D/g, '');
        if (!telLimpo) {
          erro = 'Telefone é obrigatório';
        } else if (telLimpo.length !== 11) {
          erro = 'Telefone deve ter 11 dígitos';
        }
        break;
    }

    setErros(prev => ({ ...prev, [campo]: erro }));
    return erro === '';
  };

  const handleFormChange = (campo: string, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    
    // Validar em tempo real
    if (valor) {
      validarCampo(campo, valor);
    } else {
      setErros(prev => ({ ...prev, [campo]: '' }));
    }

    // Buscar CEP automaticamente quando completo
    if (campo === 'cep') {
      const cepLimpo = valor.replace(/\D/g, '');
      if (cepLimpo.length === 8) {
        buscarCep(valor);
      }
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
    setErros({ nome: '', cep: '', cidade: '', estado: '', telefone: '' });
    setShowModal(true);
  };

  const salvarCliente = async () => {
    // Validar todos os campos
    const nomeValido = validarCampo('nome', form.nome);
    const cepValido = validarCampo('cep', form.cep);
    const cidadeValida = validarCampo('cidade', form.cidade);
    const estadoValido = validarCampo('estado', form.estado);
    const telefoneValido = validarCampo('telefone', form.telefone);

    if (!nomeValido || !cepValido || !cidadeValida || !estadoValido || !telefoneValido) {
      toast({
        title: "Erro de validação",
        description: "Corrija os erros antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    setSalvando(true);

    try {
      if (editando) {
        // TODO: Implementar API Rust
        // await invoke('update_cliente', { id: editando, cliente: form });
        
        // Atualizar localmente
        setClientes(prev => prev.map(c => 
          c.id === editando ? { ...c, ...form } : c
        ));
        
        toast({
          title: "Cliente atualizado!",
          description: "Cliente atualizado com sucesso!",
        });
      } else {
        // TODO: Implementar API Rust
        // const novoCliente = await invoke('create_cliente', { cliente: form });
        
        // Criar localmente (temporário)
        const novoCliente = { 
          id: Math.max(...clientes.map(c => c.id), 0) + 1, 
          ...form 
        };
        setClientes(prev => [novoCliente, ...prev]);
        
        toast({
          title: "Cliente cadastrado!",
          description: "Cliente cadastrado com sucesso!",
        });
      }
      
      setShowModal(false);
      setForm({ nome: '', cep: '', cidade: '', estado: '', telefone: '' });
      setEditando(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cliente.",
        variant: "destructive",
      });
      console.error('Erro ao salvar cliente:', error);
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!clienteParaExcluir) return;

    setExcluindo(true);

    try {
      // TODO: Implementar API Rust
      // await invoke('delete_cliente', { id: clienteParaExcluir.id });
      
      // Excluir localmente
      setClientes(prev => prev.filter(c => c.id !== clienteParaExcluir.id));
      
      toast({
        title: "Cliente excluído!",
        description: "Cliente excluído com sucesso!",
      });
      
      setShowDeleteModal(false);
      setClienteParaExcluir(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    } finally {
      setExcluindo(false);
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
        <Button onClick={() => abrirModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Busca */}
      <Card className="border-l-4 border-l-blue-500 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50">
          <CardTitle className="text-blue-900">Buscar Clientes</CardTitle>
          <CardDescription>Pesquise por nome, cidade ou telefone</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 bg-blue-50/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-blue-200"
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
                  <TableHead className="w-[120px]">CEP</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="w-[60px]">UF</TableHead>
                  <TableHead className="w-[150px]">Telefone</TableHead>
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
                      {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesPaginados.map((cliente) => (
                    <TableRow key={cliente.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">#{cliente.id}</TableCell>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.cep}</TableCell>
                      <TableCell>{cliente.cidade}</TableCell>
                      <TableCell className="font-semibold">{cliente.estado}</TableCell>
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
            <span className="flex items-center px-3 text-sm">
              Página {currentPage} de {totalPages}
            </span>
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
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) {
          setErros({ nome: '', cep: '', cidade: '', estado: '', telefone: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editando ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editando ? 'Atualize os dados do cliente' : 'Preencha os dados do novo cliente'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="font-medium">
                Nome Completo *
              </Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleFormChange('nome', e.target.value)}
                onBlur={() => validarCampo('nome', form.nome)}
                placeholder="Digite o nome completo"
                className={cn(
                  "bg-white",
                  erros.nome && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {erros.nome && (
                <p className="text-sm text-destructive">{erros.nome}</p>
              )}
            </div>

            {/* CEP */}
            <div className="space-y-2">
              <Label htmlFor="cep" className="font-medium">CEP *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <InputWithMask
                    id="cep"
                    mask="99999-999"
                    value={form.cep}
                    onChange={(e) => handleFormChange('cep', e.target.value)}
                    onBlur={() => validarCampo('cep', form.cep)}
                    placeholder="00000-000"
                    className={cn(
                      "bg-white",
                      erros.cep && "border-destructive"
                    )}
                  />
                  {erros.cep && (
                    <p className="text-sm text-destructive mt-1">{erros.cep}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => buscarCep(form.cep)}
                  disabled={buscandoCep}
                  className="min-w-[100px]"
                >
                  {buscandoCep ? 'Buscando...' : 'Buscar CEP'}
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
                  onChange={(e) => handleFormChange('cidade', e.target.value)}
                  onBlur={() => validarCampo('cidade', form.cidade)}
                  placeholder="São Paulo"
                  className={cn(
                    "bg-white",
                    erros.cidade && "border-destructive"
                  )}
                />
                {erros.cidade && (
                  <p className="text-sm text-destructive">{erros.cidade}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado" className="font-medium">UF *</Label>
                <Input
                  id="estado"
                  value={form.estado}
                  onChange={(e) => handleFormChange('estado', e.target.value.toUpperCase())}
                  onBlur={() => validarCampo('estado', form.estado)}
                  placeholder="SP"
                  maxLength={2}
                  className={cn(
                    "bg-white uppercase",
                    erros.estado && "border-destructive"
                  )}
                />
                {erros.estado && (
                  <p className="text-sm text-destructive">{erros.estado}</p>
                )}
              </div>
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="telefone" className="font-medium">Telefone *</Label>
              <InputWithMask
                id="telefone"
                mask="(99) 99999-9999"
                value={form.telefone}
                onChange={(e) => handleFormChange('telefone', e.target.value)}
                onBlur={() => validarCampo('telefone', form.telefone)}
                placeholder="(00) 00000-0000"
                className={cn(
                  "bg-white",
                  erros.telefone && "border-destructive"
                )}
              />
              {erros.telefone && (
                <p className="text-sm text-destructive">{erros.telefone}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarCliente} disabled={salvando}>
              {salvando ? 'Salvando...' : (editando ? 'Atualizar' : 'Cadastrar')}
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
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="col-span-3">
                  <p className="text-xs text-muted-foreground">ID</p>
                  <p className="font-semibold">#{clienteParaVisualizar.id}</p>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">NOME</p>
                <p className="font-semibold text-lg">{clienteParaVisualizar.nome}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">CEP</p>
                  <p className="font-semibold">{clienteParaVisualizar.cep}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-semibold">{clienteParaVisualizar.telefone}</p>
                </div>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Localização</p>
                <p className="font-semibold">{clienteParaVisualizar.cidade} - {clienteParaVisualizar.estado}</p>
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
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
