import { useState, useEffect, useMemo } from 'react';
import { OrderWithItems, OrderStatus } from '../types';
import { api } from '../services/api';
import { useOrderRefresh } from '../hooks/useRealtimeNotifications';
import { useToast } from '@/hooks/use-toast';
import ExpedicaoCard from '../components/ExpedicaoCard';
import ExpedicaoDrawer from '../components/ExpedicaoDrawer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { ToastAction } from '../components/ui/toast';
import {
  Truck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { logger } from '@/utils/logger';

type DatePreset = 'hoje' | 'semana' | 'todos' | 'customizado';

export default function Expedicao() {
  const refreshTrigger = useOrderRefresh();
  const { toast } = useToast();

  // Estados dos filtros
  const [datePreset, setDatePreset] = useState<DatePreset>('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [apenasProntos, setApenasProntos] = useState(false);
  const [ocultarExpedidos, setOcultarExpedidos] = useState(true);
  const [showFiltros, setShowFiltros] = useState(false);

  // Estados dos dados e UI
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [isExpeditingGroup, setIsExpeditingGroup] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Estados do Drawer de Detalhes
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isConfirmingExpedition, setIsConfirmingExpedition] = useState(false);



  // Sincronizar datas com base no preset selecionado
  useEffect(() => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    if (datePreset === 'hoje') {
      setDataInicio(hojeStr);
      setDataFim(hojeStr);
    } else if (datePreset === 'semana') {
      const diaDaSemana = hoje.getDay();
      const diffParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + diffParaSegunda);
      
      const domingo = new Date(segunda);
      domingo.setDate(segunda.getDate() + 6);

      setDataInicio(segunda.toISOString().split('T')[0]);
      setDataFim(domingo.toISOString().split('T')[0]);
    } else if (datePreset === 'todos') {
      setDataInicio('');
      setDataFim('');
    }
  }, [datePreset]);

  // Carregar pedidos
  const loadOrders = async () => {
    setLoading(true);
    try {
      let start: string | undefined = dataInicio || undefined;
      let end: string | undefined = dataFim || undefined;

      if (datePreset === 'todos') {
        start = undefined;
        end = undefined;
      }

      const response = await api.getOrdersPaginated(
        1,
        1000,
        undefined,
        undefined,
        start,
        end,
        undefined,
        apenasProntos ? true : undefined,
        'entrega'
      );

      setOrders(response.orders);
    } catch (err) {
      logger.error('Erro ao buscar pedidos para expedição:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos da expedição.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [dataInicio, dataFim, apenasProntos, refreshTrigger]);

  // Estatísticas/Cards Resumo
  const stats = useMemo(() => {
    const hojeStr = new Date().toISOString().split('T')[0];
    
    const totalAguardando = orders.filter((o) => !o.expedicao).length;
    const expedidosHoje = orders.filter((o) => {
      if (!o.expedicao) return false;
      return o.data_entrega && o.data_entrega.split('T')[0] === hojeStr;
    }).length;

    const atrasados = orders.filter((o) => {
      if (o.expedicao) return false;
      if (!o.data_entrega) return false;
      const entrega = o.data_entrega.split('T')[0];
      return entrega < hojeStr;
    }).length;

    const aguardandoHoje = orders.filter((o) => {
      if (o.expedicao) return false;
      return o.data_entrega && o.data_entrega.split('T')[0] === hojeStr;
    }).length;

    return { totalAguardando, expedidosHoje, atrasados, aguardandoHoje };
  }, [orders]);

  // Filtrar e agrupar pedidos por forma de envio
  const groupedOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      if (ocultarExpedidos && order.expedicao) return false;

      const clienteName = (order.cliente || order.customer_name || '').toLowerCase();
      const numStr = String(order.numero || order.id || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      return clienteName.includes(query) || numStr.includes(query);
    });

    const groups: Record<string, OrderWithItems[]> = {};
    filtered.forEach((order) => {
      const envioKey = (order.forma_envio || 'SEM FORMA DE ENVIO').trim().toUpperCase();
      if (!groups[envioKey]) {
        groups[envioKey] = [];
      }
      groups[envioKey].push(order);
    });

    const sortedGroups: Record<string, OrderWithItems[]> = {};
    Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .forEach((key) => {
        sortedGroups[key] = groups[key].sort((a, b) => {
          const dateA = a.data_entrega ? new Date(a.data_entrega).getTime() : 0;
          const dateB = b.data_entrega ? new Date(b.data_entrega).getTime() : 0;
          return dateA - dateB;
        });
      });

    return sortedGroups;
  }, [orders, searchQuery, ocultarExpedidos]);

  // Ação de Toggle Expedição (Marcar / Desmarcar)
  const handleToggleExpedition = async (orderId: number, currentStatus: boolean, isUndo = false) => {
    setUpdatingOrderId(orderId);
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      const newStatus = !currentStatus;

      const updated = await api.updateOrderStatus({
        id: orderId,
        conferencia: order.conferencia || false,
        sublimacao: order.sublimacao || false,
        costura: order.costura || false,
        expedicao: newStatus,
        pronto: newStatus ? true : (order.pronto || false),
        status: newStatus ? OrderStatus.Concluido : order.status,
      });

      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));

      if (!isUndo && newStatus) {
        toast({
          title: 'Pedido expedido!',
          description: `Pedido #${order.numero || order.id} foi marcado como expedido.`,
          variant: 'success',
          duration: 7000,
          action: (
            <ToastAction altText="Desfazer" onClick={() => handleToggleExpedition(orderId, true, true)}>
              Desfazer
            </ToastAction>
          ),
        });
      } else {
        toast({
          title: newStatus ? 'Pedido expedido!' : 'Expedição desfeita!',
          description: `O pedido #${order.numero || order.id} foi atualizado com sucesso.`,
          variant: 'success',
        });
      }
    } catch (err) {
      logger.error('Erro ao atualizar expedição:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status de expedição.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleExpedirGrupo = async (groupName: string, groupOrdersList: OrderWithItems[]) => {
    const pendentes = groupOrdersList.filter((o) => !o.expedicao);
    if (pendentes.length === 0) return;

    setIsExpeditingGroup(groupName);
    try {
      const updates = pendentes.map(order => 
        api.updateOrderStatus({
          id: order.id,
          conferencia: order.conferencia || false,
          sublimacao: order.sublimacao || false,
          costura: order.costura || false,
          expedicao: true,
          pronto: true,
          status: OrderStatus.Concluido,
        }).then(updated => ({ id: order.id, updated }))
      );

      const results = await Promise.allSettled(updates);
      const successUpdates: any[] = [];
      
      results.forEach(res => {
        if (res.status === 'fulfilled') {
          successUpdates.push(res.value);
        }
      });

      if (successUpdates.length > 0) {
        setOrders(prev => prev.map(o => {
          const found = successUpdates.find(u => u.id === o.id);
          return found ? { ...o, ...found.updated } : o;
        }));

        toast({
          title: 'Grupo expedido!',
          description: `${successUpdates.length} pedidos expedidos com sucesso.`,
          variant: 'success',
          duration: 7000,
        });
      }

      if (successUpdates.length < pendentes.length) {
         toast({
          title: 'Atenção',
          description: `Apenas ${successUpdates.length} de ${pendentes.length} pedidos foram expedidos.`,
          variant: 'destructive',
        });
      }

    } catch (err) {
      logger.error('Erro ao expedir grupo:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível expedir todos os pedidos do grupo.',
        variant: 'destructive',
      });
    } finally {
      setIsExpeditingGroup(null);
    }
  };

  const handleConfirmExpeditionFromDrawer = async (orderId: number) => {
    setIsConfirmingExpedition(true);
    await handleToggleExpedition(orderId, false);
    setIsConfirmingExpedition(false);
    setDrawerOpen(false);
  };

  const handleOpenDetails = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-4">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Expedição
          </h1>
          <p className="text-muted-foreground text-sm">
            Conferência e expedição de pedidos aguardando entrega (otimizado para tablets)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            disabled={loading}
            className="h-10 px-4 font-semibold text-xs gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Para Hoje
              </span>
              <span className="text-2xl font-black text-foreground">{stats.aguardandoHoje}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Total Aguardando
              </span>
              <span className="text-2xl font-black text-foreground">{stats.totalAguardando}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Expedidos Hoje
              </span>
              <span className="text-2xl font-black text-foreground">{stats.expedidosHoje}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Atrasados
              </span>
              <span className="text-2xl font-black text-foreground">{stats.atrasados}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Busca e Filtro (Minimalistas) */}
      <Card className="border border-border/80 shadow-sm">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Busca textual */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="searchQuery"
                placeholder="Buscar cliente, cidade ou número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base md:text-lg bg-muted/30 shadow-inner rounded-xl border-border focus-visible:ring-emerald-500"
              />
            </div>

            {/* Filtro Principal: Data de Entrega */}
            <div className="flex gap-1 bg-muted p-1 rounded-xl border w-fit shrink-0 items-center">
              {(['hoje', 'semana', 'todos', 'customizado'] as DatePreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant={datePreset === preset ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setDatePreset(preset)}
                  className={`h-11 px-4 text-xs font-bold capitalize rounded-lg ${
                    datePreset === preset ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {preset === 'todos' ? 'Todos' : preset}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 h-12 rounded-xl border">
                <Checkbox
                  id="ocultarExpedidos"
                  checked={ocultarExpedidos}
                  onCheckedChange={(checked) => setOcultarExpedidos(checked === true)}
                  className="w-5 h-5"
                />
                <Label htmlFor="ocultarExpedidos" className="text-sm font-semibold cursor-pointer">
                  Ocultar Expedidos
                </Label>
              </div>

              {/* Removido botão de "Filtros" colapsável se não tiver mais filtros úteis lá, mas vamos manter os customizados abaixo */}
            </div>
          </div>

          {/* Filtros Customizados que aparecem apenas quando "Customizado" está selecionado */}
          {datePreset === 'customizado' && (
            <div className="pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="space-y-1.5">
                    <Label htmlFor="dataInicio" className="text-[10px] font-bold text-muted-foreground">DE</Label>
                    <Input
                      id="dataInicio"
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="h-10 text-sm min-w-[130px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dataFim" className="text-[10px] font-bold text-muted-foreground">ATÉ</Label>
                    <Input
                      id="dataFim"
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="h-10 text-sm min-w-[130px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listagem de Grupos */}
      <div className="space-y-6 pb-20">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground font-semibold">Carregando pedidos...</p>
          </div>
        ) : Object.keys(groupedOrders).length === 0 ? (
          <Card className="border border-dashed border-border/80">
            <CardContent className="py-12 text-center space-y-2">
              <Truck className="h-12 w-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-lg text-foreground">Nenhum pedido encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Não há pedidos que correspondam aos filtros ativos.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedOrders).map(([groupName, list]) => {
            const isCollapsed = collapsedGroups[groupName] || false;
            const pendentesGrupo = list.filter((o) => !o.expedicao).length;
            const expedidosGrupo = list.length - pendentesGrupo;
            const progresso = list.length > 0 ? (expedidosGrupo / list.length) * 100 : 0;

            return (
              <div key={groupName} className="space-y-3 bg-slate-50/50 dark:bg-slate-900/10 p-3 md:p-4 rounded-xl border border-border/60 shadow-sm">
                {/* Header do Grupo */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div
                    onClick={() => toggleGroupCollapse(groupName)}
                    className="flex items-center gap-2 cursor-pointer select-none group w-full sm:w-auto"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                    ) : (
                      <ChevronUp className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                    )}
                    
                    <div className="flex flex-col">
                      <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tight flex items-center gap-2">
                        {groupName}
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {list.length} itens
                        </span>
                      </h3>
                      
                      {/* Barra de Progresso do Grupo */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                          {expedidosGrupo} de {list.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto pl-8 sm:pl-0">
                    {pendentesGrupo > 0 && (
                      <Button
                        size="sm"
                        disabled={isExpeditingGroup === groupName}
                        onClick={() => handleExpedirGrupo(groupName, list)}
                        className="h-10 px-4 gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shrink-0 w-full sm:w-auto transition-transform active:scale-95"
                      >
                        {isExpeditingGroup === groupName ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Expedir Restantes ({pendentesGrupo})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Grid de Pedidos do Grupo */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    {list.map((order) => (
                      <ExpedicaoCard
                        key={order.id}
                        order={order}
                        onOpenDetails={handleOpenDetails}
                        onToggleExpedition={handleToggleExpedition}
                        isUpdating={updatingOrderId === order.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Drawer de Detalhes e Conferência */}
      <ExpedicaoDrawer
        order={selectedOrder}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onConfirmExpedition={handleConfirmExpeditionFromDrawer}
        isConfirming={isConfirmingExpedition}
      />

    </div>
  );
}
