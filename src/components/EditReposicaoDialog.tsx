import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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

interface EditReposicaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reposicao: Reposicao | null;
  onSuccess?: () => void;
}

export function EditReposicaoDialog({
  open,
  onOpenChange,
  reposicao,
  onSuccess,
}: EditReposicaoDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateReposicaoRequest>({
    id: 0,
    motivo: '',
    descricao: '',
    data_solicitacao: '',
    data_entrega_prevista: '',
    status: 'Pendente',
    prioridade: 'NORMAL',
    observacao: '',
    financeiro: false,
    conferencia: false,
    sublimacao: false,
    costura: false,
    expedicao: false,
    pronto: false,
  });

  useEffect(() => {
    if (reposicao && open) {
      setFormData({
        id: reposicao.id,
        motivo: reposicao.motivo || '',
        descricao: reposicao.descricao || '',
        data_solicitacao: reposicao.data_solicitacao || '',
        data_entrega_prevista: reposicao.data_entrega_prevista || '',
        status: reposicao.status || 'Pendente',
        prioridade: reposicao.prioridade || 'NORMAL',
        observacao: reposicao.observacao || '',
        financeiro: reposicao.financeiro || false,
        conferencia: reposicao.conferencia || false,
        sublimacao: reposicao.sublimacao || false,
        costura: reposicao.costura || false,
        expedicao: reposicao.expedicao || false,
        pronto: reposicao.pronto || false,
      });
    }
  }, [reposicao, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reposicao) {
      toast({
        title: 'Erro',
        description: 'Reposição não selecionada',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.motivo?.trim()) {
      toast({
        title: 'Erro',
        description: 'O motivo da reposição é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await api.updateReposicao(formData);
      
      toast({
        title: 'Sucesso',
        description: 'Reposição atualizada com sucesso',
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar reposição',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!reposicao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Reposição {reposicao.numero || `REP-${String(reposicao.id).padStart(6, '0')}`}</DialogTitle>
          <DialogDescription>
            Atualize as informações da reposição
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'Pendente' | 'Em Processamento' | 'Concluída' | 'Cancelada') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Processamento">Em Processamento</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>

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
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>

            <Separator />

            <div>
              <Label className="text-base font-semibold mb-3 block">Status de Produção</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="financeiro"
                    checked={formData.financeiro}
                    onCheckedChange={(checked) => setFormData({ ...formData, financeiro: !!checked })}
                  />
                  <Label htmlFor="financeiro" className="cursor-pointer">Financeiro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="conferencia"
                    checked={formData.conferencia}
                    onCheckedChange={(checked) => setFormData({ ...formData, conferencia: !!checked })}
                  />
                  <Label htmlFor="conferencia" className="cursor-pointer">Conferência</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sublimacao"
                    checked={formData.sublimacao}
                    onCheckedChange={(checked) => setFormData({ ...formData, sublimacao: !!checked })}
                  />
                  <Label htmlFor="sublimacao" className="cursor-pointer">Sublimação</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="costura"
                    checked={formData.costura}
                    onCheckedChange={(checked) => setFormData({ ...formData, costura: !!checked })}
                  />
                  <Label htmlFor="costura" className="cursor-pointer">Costura</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="expedicao"
                    checked={formData.expedicao}
                    onCheckedChange={(checked) => setFormData({ ...formData, expedicao: !!checked })}
                  />
                  <Label htmlFor="expedicao" className="cursor-pointer">Expedição</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pronto"
                    checked={formData.pronto}
                    onCheckedChange={(checked) => setFormData({ ...formData, pronto: !!checked })}
                  />
                  <Label htmlFor="pronto" className="cursor-pointer">Pronto</Label>
                </div>
              </div>
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
