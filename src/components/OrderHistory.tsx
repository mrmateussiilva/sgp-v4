import React, { useEffect, useState } from 'react';
import { OrderWithItems } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ScrollArea simples inline
const ScrollArea = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-y-auto ${className}`}>{children}</div>
);
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, FileText, AlertCircle } from 'lucide-react';
// Função simples para formatar tempo relativo
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'agora';
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface OrderHistoryEntry {
  id: string;
  timestamp: string;
  user_id?: number;
  username?: string;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  description: string;
}

interface OrderHistoryProps {
  order: OrderWithItems;
  onClose?: () => void;
}

export function OrderHistory({ order }: OrderHistoryProps) {
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [order.id]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Por enquanto, vamos criar um histórico baseado nas informações disponíveis
      // Em produção, isso viria de um endpoint específico de histórico
      const entries = generateHistoryFromOrder(order);
      setHistory(entries);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setError('Não foi possível carregar o histórico de alterações.');
    } finally {
      setLoading(false);
    }
  };

  const generateHistoryFromOrder = (order: OrderWithItems): OrderHistoryEntry[] => {
    const entries: OrderHistoryEntry[] = [];
    const now = new Date();

    // Entrada de criação
    if (order.created_at) {
      entries.push({
        id: 'created',
        timestamp: order.created_at,
        action: 'created',
        description: `Pedido criado`,
      });
    }

    // Entrada de última atualização
    if (order.updated_at && order.updated_at !== order.created_at) {
      entries.push({
        id: 'updated',
        timestamp: order.updated_at,
        action: 'updated',
        description: `Pedido atualizado`,
      });
    }

    // Status atual
    entries.push({
      id: 'status',
      timestamp: order.updated_at || order.created_at || now.toISOString(),
      action: 'status',
      field: 'status',
      new_value: order.status,
      description: `Status: ${getStatusLabel(order.status)}`,
    });

    // Etapas de produção
    const productionSteps = [
      { field: 'financeiro', label: 'Financeiro', value: order.financeiro },
      { field: 'conferencia', label: 'Conferência', value: order.conferencia },
      { field: 'sublimacao', label: 'Sublimação', value: order.sublimacao },
      { field: 'costura', label: 'Costura', value: order.costura },
      { field: 'expedicao', label: 'Expedição', value: order.expedicao },
    ];

    productionSteps.forEach((step) => {
      if (step.value) {
        entries.push({
          id: `step-${step.field}`,
          timestamp: order.updated_at || order.created_at || now.toISOString(),
          action: 'status_change',
          field: step.field,
          new_value: 'true',
          description: `${step.label} concluído`,
        });
      }
    });

    // Ordenar por timestamp (mais recente primeiro)
    return entries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'Pendente': 'Pendente',
      'EmProcessamento': 'Em Produção',
      'Concluido': 'Concluído',
      'Cancelado': 'Cancelado',
      'pendente': 'Pendente',
      'em_producao': 'Em Produção',
      'pronto': 'Pronto',
      'entregue': 'Entregue',
      'cancelado': 'Cancelado',
    };
    return statusMap[status] || status;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'status':
      case 'status_change':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Criado</Badge>;
      case 'updated':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Atualizado</Badge>;
      case 'status':
      case 'status_change':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Status</Badge>;
      default:
        return <Badge variant="outline">Alteração</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alterações</CardTitle>
          <CardDescription>Carregando histórico do pedido...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alterações</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Alterações
        </CardTitle>
        <CardDescription>
          Pedido #{order.numero || order.id} • {order.cliente || order.customer_name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum histórico disponível</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id || index}>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getActionIcon(entry.action)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getActionBadge(entry.action)}
                          <span className="text-sm font-medium">{entry.description}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(new Date(entry.timestamp))}
                        </span>
                      </div>
                      {entry.field && entry.new_value && (
                        <div className="text-xs text-muted-foreground ml-7">
                          {entry.field}: {entry.new_value}
                        </div>
                      )}
                      {entry.username && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-7">
                          <User className="h-3 w-3" />
                          {entry.username}
                        </div>
                      )}
                    </div>
                  </div>
                  {index < history.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

