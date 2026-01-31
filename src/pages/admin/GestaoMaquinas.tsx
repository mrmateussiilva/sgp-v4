import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Monitor, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { maquinasApi } from '../../api/endpoints/maquinas';
import { MachineEntity } from '../../api/types';
import { useAuthStore } from '../../store/authStore';

export default function GestaoMaquinas() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [maquinas, setMaquinas] = useState<MachineEntity[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [maquinaToDelete, setMaquinaToDelete] = useState<MachineEntity | null>(null);
    const sessionToken = useAuthStore((state) => state.sessionToken);

    const [form, setForm] = useState({
        id: 0,
        name: '',
        active: true,
    });

    useEffect(() => {
        loadMaquinas();
    }, []);

    const loadMaquinas = async () => {
        setIsLoading(true);
        try {
            if (!sessionToken) {
                navigate('/login');
                return;
            }

            const data = await maquinasApi.getAll();
            setMaquinas(data);
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar as máquinas.',
                variant: 'destructive',
            });
            console.error('Erro ao carregar máquinas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (maquina?: MachineEntity) => {
        if (maquina) {
            setIsEditing(true);
            setForm({
                id: maquina.id,
                name: maquina.name,
                active: maquina.active,
            });
        } else {
            setIsEditing(false);
            setForm({
                id: 0,
                name: '',
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
                description: 'Nome da máquina é obrigatório.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            if (!sessionToken) {
                navigate('/login');
                return;
            }

            if (isEditing) {
                await maquinasApi.update(form.id, {
                    name: form.name,
                    active: form.active,
                });
                toast({
                    title: 'Sucesso',
                    description: 'Máquina atualizada com sucesso!',
                });
            } else {
                await maquinasApi.create({
                    name: form.name,
                    active: form.active,
                });
                toast({
                    title: 'Sucesso',
                    description: 'Máquina cadastrada com sucesso!',
                });
            }

            handleCloseModal();
            loadMaquinas();
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.toString(),
                variant: 'destructive',
            });
            console.error('Erro ao salvar máquina:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!maquinaToDelete) return;

        setIsLoading(true);
        try {
            if (!sessionToken) {
                navigate('/login');
                return;
            }

            await maquinasApi.delete(maquinaToDelete.id);
            toast({
                title: 'Sucesso',
                description: 'Máquina excluída com sucesso!',
            });
            setShowDeleteModal(false);
            setMaquinaToDelete(null);
            loadMaquinas();
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.toString(),
                variant: 'destructive',
            });
            console.error('Erro ao excluir máquina:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredMaquinas = maquinas.filter(maquina =>
        maquina.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                        <Monitor className="h-8 w-8 text-primary" />
                        Gestão de Máquinas
                    </h1>
                    <p className="text-muted-foreground">Gerencie as máquinas de produção disponíveis no sistema</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Máquina
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar máquina..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading && maquinas.length === 0 ? (
                        <div className="text-center py-8">Carregando...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaquinas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            Nenhuma máquina encontrada
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMaquinas.map((maquina) => (
                                        <TableRow key={maquina.id}>
                                            <TableCell className="font-medium">{maquina.name}</TableCell>
                                            <TableCell className="text-center">
                                                {maquina.active ? (
                                                    <Badge className="bg-green-500">Ativa</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inativa</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenModal(maquina)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-destructive hover:bg-destructive hover:text-white"
                                                        onClick={() => {
                                                            setMaquinaToDelete(maquina);
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
                        <DialogTitle>{isEditing ? 'Editar Máquina' : 'Nova Máquina'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Atualize' : 'Cadastre'} as informações da máquina
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="Ex: Impressora Roland 01"
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
                                Máquina ativa
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
                            Tem certeza que deseja excluir a máquina "{maquinaToDelete?.name}"?
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
