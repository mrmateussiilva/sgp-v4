import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { OrderWithItems, CreateReposicaoRequest } from '@/types';
import { api } from '@/services/api';

interface CreateReposicaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithItems | null;
  onSuccess?: () => void;
}

export function CreateReposicaoDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: CreateReposicaoDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateReposicaoRequest>({
    order_id: 0,
    motivo: '',
    descricao: '',
    data_solicitacao: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    prioridade: 'NORMAL',
    observacao: '',
  });

  useEffect(() => {
    if (order && open) {
      setFormData({
        order_id: order.id,
        motivo: '',
        descricao: '',
        data_solicitacao: new Date().toISOString().split('T')[0],
        data_entrega_prevista: '',
        prioridade: 'NORMAL',
        observacao: '',
      });
    }
  }, [order, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order) {
      toast({
        title: 'Erro',
        description: 'Pedido não selecionado',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.motivo.trim()) {
      toast({
        title: 'Erro',
        description: 'O motivo da reposição é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await api.createReposicao({
        ...formData,
        order_id: order.id,
      });
      
      toast({
        title: 'Sucesso',
        description: 'Reposição criada com sucesso',
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar reposição',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Criar Reposição</DialogTitle>
          <DialogDescription>
            Criar uma reposição para o pedido #{order.numero || order.id} - {order.cliente}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Reposição *</Label>
              <Textarea
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Descreva o motivo da reposição..."
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada da reposição..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_solicitacao">Data de Solicitação *</Label>
                <Input
                  id="data_solicitacao"
                  type="date"
                  value={formData.data_solicitacao}
                  onChange={(e) => setFormData({ ...formData, data_solicitacao: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_entrega_prevista">Data de Entrega Prevista</Label>
                <Input
                  id="data_entrega_prevista"
                  type="date"
                  value={formData.data_entrega_prevista}
                  onChange={(e) => setFormData({ ...formData, data_entrega_prevista: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value: 'NORMAL' | 'ALTA') => 
                  setFormData({ ...formData, prioridade: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Reposição'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
