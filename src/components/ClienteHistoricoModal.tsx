import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  ShoppingBag,
  Calendar,
  Search,
  Layers,
  Sparkles,
  Phone,
  MapPin,
  ExternalLink,
  TrendingUp,
  Tag,
  Palette,
  Box,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Cliente, OrderWithItems, OrderStatus } from '@/types';
import { api } from '@/services/api';
import { formatCurrency } from '@/utils/currency';
import { formatDateForDisplay } from '@/utils/date';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface ClienteHistoricoModalProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'resumo' | 'pedidos' | 'cadastro';
}

interface ItemAggregated {
  tipo: string;
  label: string;
  totalQty: number;
  totalValor: number;
  icon: typeof Package;
  color: string;
  bgLight: string;
  borderColor: string;
  items: {
    descricao: string;
    qty: number;
    medidas?: string;
    tecido?: string;
  }[];
}

const TIPO_LABELS: Record<string, { label: string; icon: typeof Package; color: string; bgLight: string; borderColor: string }> = {
  painel: {
    label: 'Painéis',
    icon: Palette,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
  },
  totem: {
    label: 'Totens',
    icon: Box,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  mesa: {
    label: 'Mesas & Toalhas',
    icon: Layers,
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  toalha: {
    label: 'Mesas & Toalhas',
    icon: Layers,
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  toalha_mesa: {
    label: 'Mesas & Toalhas',
    icon: Layers,
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  adesivo: {
    label: 'Adesivos',
    icon: Tag,
    color: 'text-pink-600 dark:text-pink-400',
    bgLight: 'bg-pink-50 dark:bg-pink-950/40',
    borderColor: 'border-pink-200 dark:border-pink-800',
  },
  lona: {
    label: 'Lonas',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  bolsinha: {
    label: 'Bolsinhas / Brindes',
    icon: ShoppingBag,
    color: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  generica: {
    label: 'Outros / Diversos',
    icon: Package,
    color: 'text-slate-600 dark:text-slate-400',
    bgLight: 'bg-slate-50 dark:bg-slate-900/40',
    borderColor: 'border-slate-200 dark:border-slate-800',
  },
};

export function ClienteHistoricoModal({
  cliente,
  isOpen,
  onClose,
  defaultTab = 'resumo',
}: ClienteHistoricoModalProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pedidos' | 'cadastro'>(defaultTab);
  const [searchHistory, setSearchHistory] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSearchHistory('');
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    let active = true;

    if (isOpen && cliente?.nome) {
      setLoading(true);
      api.getOrdersPaginated(1, 100, undefined, cliente.nome)
        .then((res) => {
          if (active) {
            setOrders(res.orders || []);
          }
        })
        .catch((err) => {
          logger.error('[ClienteHistoricoModal] Erro ao carregar pedidos do cliente:', err);
          if (active) setOrders([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setOrders([]);
    }

    return () => {
      active = false;
    };
  }, [isOpen, cliente?.nome]);

  // Estatísticas consolidadas do cliente
  const metrics = useMemo(() => {
    const totalOrdersCount = orders.length;
    let totalSpent = 0;
    let totalItemsCount = 0;
    let firstDate: string | null = null;
    let lastDate: string | null = null;

    orders.forEach((o) => {
      const val = typeof o.valor_total === 'string' ? parseFloat(o.valor_total) : (o.valor_total || 0);
      if (!isNaN(val)) totalSpent += val;

      const dateStr = o.data_entrada || o.data_criacao;
      if (dateStr) {
        if (!firstDate || dateStr < firstDate) firstDate = dateStr;
        if (!lastDate || dateStr > lastDate) lastDate = dateStr;
      }

      (o.items || []).forEach((item) => {
        const q =
          Number(item.quantidade_paineis) ||
          Number(item.quantidade_totem) ||
          Number(item.quantidade_lona) ||
          Number(item.quantidade_adesivo) ||
          Number(item.quantity) ||
          1;
        totalItemsCount += q;
      });
    });

    const averageTicket = totalOrdersCount > 0 ? totalSpent / totalOrdersCount : 0;

    return {
      totalOrdersCount,
      totalSpent,
      totalItemsCount,
      averageTicket,
      firstDate,
      lastDate,
    };
  }, [orders]);

  // Agrupamento consolidado de produtos ("O que o cliente pede")
  const produtosConsolidados = useMemo(() => {
    const map = new Map<string, ItemAggregated>();
    const productCountMap = new Map<string, { descricao: string; tipo: string; count: number }>();

    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const rawTipo = (item.tipo_producao || 'generica').toLowerCase();
        let normalizedTipo = rawTipo;

        if (rawTipo.includes('painel')) normalizedTipo = 'painel';
        else if (rawTipo.includes('totem')) normalizedTipo = 'totem';
        else if (rawTipo.includes('mesa') || rawTipo.includes('toalha')) normalizedTipo = 'mesa';
        else if (rawTipo.includes('adesivo')) normalizedTipo = 'adesivo';
        else if (rawTipo.includes('lona')) normalizedTipo = 'lona';
        else if (rawTipo.includes('bolsa') || rawTipo.includes('bolsinha')) normalizedTipo = 'bolsinha';
        else if (!TIPO_LABELS[normalizedTipo]) normalizedTipo = 'generica';

        const config = TIPO_LABELS[normalizedTipo] || TIPO_LABELS.generica;

        const qty =
          Number(item.quantidade_paineis) ||
          Number(item.quantidade_totem) ||
          Number(item.quantidade_lona) ||
          Number(item.quantidade_adesivo) ||
          Number(item.quantity) ||
          1;

        const unitVal =
          typeof item.valor_unitario === 'string'
            ? parseFloat(item.valor_unitario)
            : (item.unit_price || 0);

        const subtotal = !isNaN(unitVal) ? unitVal * qty : 0;

        // Medidas formatadas
        const medidas =
          item.largura && item.altura
            ? `${item.largura}m × ${item.altura}m`
            : undefined;

        const descricao = (item.descricao || item.item_name || 'Item sem descrição').trim();

        if (!map.has(normalizedTipo)) {
          map.set(normalizedTipo, {
            tipo: normalizedTipo,
            label: config.label,
            totalQty: 0,
            totalValor: 0,
            icon: config.icon,
            color: config.color,
            bgLight: config.bgLight,
            borderColor: config.borderColor,
            items: [],
          });
        }

        const entry = map.get(normalizedTipo)!;
        entry.totalQty += qty;
        entry.totalValor += subtotal;

        // Procura se já temos item com essa descrição no grupo
        const existingSub = entry.items.find((i) => i.descricao.toLowerCase() === descricao.toLowerCase());
        if (existingSub) {
          existingSub.qty += qty;
        } else {
          entry.items.push({
            descricao,
            qty,
            medidas,
            tecido: item.tecido,
          });
        }

        // Contador individual de produtos
        const pKey = `${normalizedTipo}::${descricao.toLowerCase()}`;
        if (!productCountMap.has(pKey)) {
          productCountMap.set(pKey, { descricao, tipo: normalizedTipo, count: 0 });
        }
        productCountMap.get(pKey)!.count += qty;
      });
    });

    const categories = Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
    categories.forEach((cat) => cat.items.sort((a, b) => b.qty - a.qty));

    const topProducts = Array.from(productCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { categories, topProducts };
  }, [orders]);

  // Histórico de pedidos filtrado pela busca interna
  const filteredOrders = useMemo(() => {
    if (!searchHistory.trim()) return orders;
    const term = searchHistory.toLowerCase().trim();

    return orders.filter((o) => {
      const matchNum = String(o.numero || o.id).toLowerCase().includes(term);
      const matchObs = (o.observacao || '').toLowerCase().includes(term);
      const matchStatus = (o.status || '').toLowerCase().includes(term);
      const matchItems = (o.items || []).some((item) =>
        (item.descricao || item.item_name || '').toLowerCase().includes(term) ||
        (item.tipo_producao || '').toLowerCase().includes(term) ||
        (item.tecido || '').toLowerCase().includes(term)
      );

      return matchNum || matchObs || matchStatus || matchItems;
    });
  }, [orders, searchHistory]);

  const cleanWhatsappNumber = (phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return digits.startsWith('55') ? digits : `55${digits}`;
    }
    return null;
  };

  const getStatusBadge = (order: OrderWithItems) => {
    if (order.pronto) {
      return <Badge variant="success" className="gap-1 font-semibold"><CheckCircle2 className="w-3 h-3" /> Pronto</Badge>;
    }
    if (order.status === OrderStatus.EmProducao || order.status === 'em_producao') {
      return <Badge variant="info" className="gap-1 font-semibold"><Clock className="w-3 h-3" /> Em Produção</Badge>;
    }
    if (order.status === OrderStatus.Cancelado || order.status === 'cancelado') {
      return <Badge variant="destructive" className="gap-1 font-semibold">Cancelado</Badge>;
    }
    return <Badge variant="warning" className="gap-1 font-semibold"><AlertCircle className="w-3 h-3" /> Pendente</Badge>;
  };

  const initials = cliente?.nome
    ? cliente.nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('')
    : 'CL';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
        {/* Header Premium do Cliente */}
        <DialogHeader className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-md ring-2 ring-white/20 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl sm:text-2xl font-bold truncate text-white tracking-tight">
                    {cliente?.nome || 'Cliente'}
                  </DialogTitle>
                  {cliente?.id && (
                    <Badge variant="outline" className="text-slate-300 border-white/20 text-[10px] shrink-0">
                      ID #{cliente.id}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                  {cliente?.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-blue-400" />
                      {cliente.telefone}
                      {cleanWhatsappNumber(cliente.telefone) && (
                        <a
                          href={`https://wa.me/${cleanWhatsappNumber(cliente.telefone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-0.5 underline underline-offset-2"
                        >
                          WhatsApp <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </span>
                  )}
                  {(cliente?.cidade || cliente?.estado) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      {cliente.cidade || ''}{cliente.cidade && cliente.estado ? ' - ' : ''}{cliente.estado || ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total LTV no Topo */}
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 self-start sm:self-auto shrink-0 text-right">
              <p className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">Total em Pedidos</p>
              <p className="text-xl font-black text-emerald-400">
                {formatCurrency(metrics.totalSpent)}
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Histórico completo e produtos pedidos pelo cliente {cliente?.nome}
          </DialogDescription>
        </DialogHeader>

        {/* Corpo com Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'resumo' | 'pedidos' | 'cadastro')}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="border-b px-6 py-2 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
            <TabsList className="bg-muted/70 p-1">
              <TabsTrigger value="resumo" className="gap-2 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                O que o cliente pede ({produtosConsolidados.categories.length})
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="gap-2 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Histórico de Pedidos ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="cadastro" className="gap-2 text-xs font-semibold">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Dados Cadastrais
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ─────────────────────────────────────────────────────────────
                ABA 1: RESUMO DO QUE O CLIENTE JÁ PEDIU
            ───────────────────────────────────────────────────────────── */}
            <TabsContent value="resumo" className="m-0 space-y-6 focus-visible:outline-none">
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 mb-1">
                    <span className="text-xs font-medium">Total de Pedidos</span>
                    <Package className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-indigo-950 dark:text-indigo-100">
                    {metrics.totalOrdersCount}
                  </p>
                  <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
                    {metrics.firstDate ? `Desde ${formatDateForDisplay(metrics.firstDate)}` : 'Nenhum pedido'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                    <span className="text-xs font-medium">Itens Produzidos</span>
                    <Layers className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
                    {metrics.totalItemsCount}
                  </p>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                    peças no total
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 border border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-1">
                    <span className="text-xs font-medium">Ticket Médio</span>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-blue-950 dark:text-blue-100">
                    {formatCurrency(metrics.averageTicket)}
                  </p>
                  <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                    por pedido
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20 border border-purple-100 dark:border-purple-900/40">
                  <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 mb-1">
                    <span className="text-xs font-medium">Última Compra</span>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold text-purple-950 dark:text-purple-100 truncate">
                    {metrics.lastDate ? formatDateForDisplay(metrics.lastDate) : '—'}
                  </p>
                  <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">
                    {orders[0] ? `Pedido #${orders[0].numero || orders[0].id}` : 'Sem registro'}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
              ) : produtosConsolidados.categories.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-muted/20">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <h4 className="font-semibold text-foreground text-base">Nenhum pedido encontrado</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                    Este cliente ainda não possui pedidos registrados no sistema com itens associados.
                  </p>
                </div>
              ) : (
                <>
                  {/* Resumo em Blocos Coloridos de Destaque */}
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Totalização por Categoria de Produto
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {produtosConsolidados.categories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <div
                            key={cat.tipo}
                            className={cn(
                              'p-4 rounded-xl border transition-all hover:shadow-sm flex items-start justify-between',
                              cat.bgLight,
                              cat.borderColor
                            )}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={cn('w-4 h-4', cat.color)} />
                                <span className="text-xs font-semibold text-foreground">{cat.label}</span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-foreground">
                                  {cat.totalQty}
                                </span>
                                <span className="text-xs text-muted-foreground">unidades</span>
                              </div>
                              {cat.totalValor > 0 && (
                                <p className="text-xs font-medium text-muted-foreground mt-1">
                                  {formatCurrency(cat.totalValor)} investidos
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn('bg-white/80 dark:bg-black/30 font-bold', cat.color)}
                            >
                              {cat.items.length} variações
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detalhes dos Itens Pedidos agrupados */}
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      Discriminação Completa do que o Cliente Já Pediu
                    </h3>
                    <div className="space-y-4">
                      {produtosConsolidados.categories.map((cat) => (
                        <div
                          key={cat.tipo}
                          className="rounded-xl border border-border/80 overflow-hidden bg-card"
                        >
                          <div className={cn('px-4 py-2.5 flex items-center justify-between border-b', cat.bgLight)}>
                            <div className="flex items-center gap-2">
                              <cat.icon className={cn('w-4 h-4', cat.color)} />
                              <span className="font-bold text-sm text-foreground">{cat.label}</span>
                            </div>
                            <span className="text-xs font-bold text-foreground bg-background/80 px-2.5 py-0.5 rounded-full border">
                              Total: {cat.totalQty} un
                            </span>
                          </div>

                          <div className="divide-y divide-border/60">
                            {cat.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-xs"
                              >
                                <div className="space-y-0.5 pr-2">
                                  <p className="font-semibold text-foreground text-sm">
                                    {item.descricao}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-[11px]">
                                    {item.medidas && (
                                      <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                                        {item.medidas}
                                      </span>
                                    )}
                                    {item.tecido && (
                                      <span className="bg-muted px-1.5 py-0.5 rounded">
                                        Tecido: {item.tecido}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-sm border border-indigo-200 dark:border-indigo-800">
                                    {item.qty}x
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ─────────────────────────────────────────────────────────────
                ABA 2: HISTÓRICO CRONOLÓGICO DE PEDIDOS (LOG)
            ───────────────────────────────────────────────────────────── */}
            <TabsContent value="pedidos" className="m-0 space-y-4 focus-visible:outline-none">
              {/* Barra de Busca Rápida no Histórico */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por número do pedido, item, tecido ou observação..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-muted/20">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <h4 className="font-semibold text-foreground text-base">
                    {searchHistory ? 'Nenhum pedido encontrado com este termo' : 'Nenhum pedido cadastrado'}
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                    {searchHistory
                      ? 'Tente buscar por outro número, descrição ou tecido.'
                      : 'Este cliente ainda não possui histórico de pedidos.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => {
                    const orderVal =
                      typeof order.valor_total === 'string'
                        ? parseFloat(order.valor_total)
                        : (order.valor_total || 0);

                    return (
                      <div
                        key={order.id}
                        className="rounded-xl border border-border/80 bg-card p-4 hover:shadow-md transition-all space-y-3"
                      >
                        {/* Header do Pedido */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-sm text-foreground bg-muted px-2 py-0.5 rounded">
                              #{order.numero || order.id}
                            </span>
                            {getStatusBadge(order)}
                            {order.data_entrada && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDateForDisplay(order.data_entrada)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            {order.data_entrega && (
                              <span className="text-xs text-muted-foreground">
                                Entrega: <strong className="text-foreground">{formatDateForDisplay(order.data_entrega)}</strong>
                              </span>
                            )}
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(orderVal)}
                            </span>
                          </div>
                        </div>

                        {/* Itens do Pedido */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            Itens do Pedido ({(order.items || []).length}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(order.items || []).map((item, idx) => {
                              const qty =
                                Number(item.quantidade_paineis) ||
                                Number(item.quantidade_totem) ||
                                Number(item.quantidade_lona) ||
                                Number(item.quantidade_adesivo) ||
                                Number(item.quantity) ||
                                1;

                              return (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs flex items-start justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">
                                      {item.descricao || item.item_name || 'Sem descrição'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                                      <span className="capitalize">{item.tipo_producao || 'item'}</span>
                                      {item.largura && item.altura && (
                                        <span>• {item.largura}x{item.altura}m</span>
                                      )}
                                      {item.tecido && <span>• {item.tecido}</span>}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="font-bold shrink-0">
                                    {qty}x
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Informações Complementares (Vendedor, Forma de Envio, Obs) */}
                        {(order.observacao || order.forma_envio || order.items?.[0]?.vendedor) && (
                          <div className="pt-2 text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/40">
                            {order.items?.[0]?.vendedor && (
                              <span>Vendedor: <strong className="text-foreground">{order.items[0].vendedor}</strong></span>
                            )}
                            {order.forma_envio && (
                              <span>Envio: <strong className="text-foreground">{order.forma_envio}</strong></span>
                            )}
                            {order.observacao && (
                              <span className="truncate max-w-md italic">Obs: {order.observacao}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ─────────────────────────────────────────────────────────────
                ABA 3: DADOS CADASTRAIS
            ───────────────────────────────────────────────────────────── */}
            <TabsContent value="cadastro" className="m-0 space-y-4 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Nome Completo</p>
                  <p className="text-base font-semibold text-foreground">{cliente?.nome || '—'}</p>
                </div>

                <div className="p-4 rounded-xl bg-card border space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Telefone / WhatsApp</p>
                  <p className="text-base font-semibold text-foreground flex items-center gap-2">
                    {cliente?.telefone || '—'}
                    {cleanWhatsappNumber(cliente?.telefone) && (
                      <a
                        href={`https://wa.me/${cleanWhatsappNumber(cliente?.telefone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-500 font-bold inline-flex items-center gap-1"
                      >
                        Abrir WhatsApp <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-card border space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">CEP</p>
                  <p className="text-base font-semibold text-foreground">{cliente?.cep || '—'}</p>
                </div>

                <div className="p-4 rounded-xl bg-card border space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Cidade / Estado</p>
                  <p className="text-base font-semibold text-foreground">
                    {cliente?.cidade || ''}{cliente?.cidade && cliente?.estado ? ' - ' : ''}{cliente?.estado || '—'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>

          {/* Footer */}
          <div className="border-t p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end shrink-0">
            <Button onClick={onClose} variant="default" className="min-w-[100px]">
              Fechar
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
