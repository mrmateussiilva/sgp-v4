import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Edit, Plus, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Reposicao, UpdateReposicaoRequest } from '@/types';
import { api } from '@/services/api';
import { formatDateForDisplay } from '@/utils/date';
import { CreateReposicaoDialog } from './CreateReposicaoDialog';
import { EditReposicaoDialog } from './EditReposicaoDialog';
import { OrderWithItems } from '@/types';

interface ReposicoesListProps {
  order: OrderWithItems;
  onRefresh?: () => void;
}

export function ReposicoesList({ order, onRefresh }: ReposicoesListProps) {
  const { toast } = useToast();
  const [reposicoes, setReposicoes] = useState<Reposicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reposicaoToEdit, setReposicaoToEdit] = useState<Reposicao | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reposicaoToDelete, setReposicaoToDelete] = useState<Reposicao | null>(null);

  const loadReposicoes = async () => {
    setLoading(true);
    try {
      const data = await api.getReposicoesByOrder(order.id);
      // Ordenar por created_at desc (mais recente primeiro)
      const sorted = [...data].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setReposicoes(sorted);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar reposições',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (order?.id) {
      loadReposicoes();
    }
  }, [order?.id]);

  const handleDelete = async () => {
    if (!reposicaoToDelete) return;

    try {
      await api.deleteReposicao(reposicaoToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Reposição excluída com sucesso',
      });
      setDeleteDialogOpen(false);
      setReposicaoToDelete(null);
      loadReposicoes();
      onRefresh?.();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir reposição',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Concluída':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'Em Processamento':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'Cancelada':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Concluída':
        return 'default';
      case 'Em Processamento':
        return 'secondary';
      case 'Cancelada':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading && reposicoes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reposições</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Reposições</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadReposicoes}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Reposição
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reposicoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma reposição encontrada para este pedido.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data Solicitação</TableHead>
                  <TableHead>Data Entrega Prevista</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reposicoes.map((reposicao) => (
                  <TableRow key={reposicao.id}>
                    <TableCell className="font-medium">
                      {reposicao.numero || `REP-${String(reposicao.id).padStart(6, '0')}`}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {reposicao.motivo}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(reposicao.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(reposicao.status)}
                        {reposicao.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={reposicao.prioridade === 'ALTA' ? 'destructive' : 'outline'}>
                        {reposicao.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {reposicao.data_solicitacao ? formatDateForDisplay(reposicao.data_solicitacao) : '-'}
                    </TableCell>
                    <TableCell>
                      {reposicao.data_entrega_prevista ? formatDateForDisplay(reposicao.data_entrega_prevista) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReposicaoToDelete(reposicao);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateReposicaoDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        order={order}
        onSuccess={() => {
          loadReposicoes();
          onRefresh?.();
        }}
      />

      <EditReposicaoDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setReposicaoToEdit(null);
          }
        }}
        reposicao={reposicaoToEdit}
        onSuccess={() => {
          loadReposicoes();
          onRefresh?.();
        }}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Reposição</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a reposição {reposicaoToDelete?.numero || `REP-${String(reposicaoToDelete?.id || '').padStart(6, '0')}`}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setReposicaoToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
