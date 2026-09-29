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
  items: {
    descricao: string;
    qty: number;
    medidas?: string;
    tecido?: string;
  }[];
}

const TIPO_LABELS: Record<string, { label: string; icon: typeof Package }> = {
  painel: {
    label: 'Painéis',
    icon: Palette,
  },
  totem: {
    label: 'Totens',
    icon: Box,
  },
  mesa: {
    label: 'Mesas & Toalhas',
    icon: Layers,
  },
  toalha: {
    label: 'Mesas & Toalhas',
    icon: Layers,
  },
  toalha_mesa: {
    label: 'Mesas & Toalhas',
    icon: Layers,
  },
  adesivo: {
    label: 'Adesivos',
    icon: Tag,
  },
  lona: {
    label: 'Lonas',
    icon: FileText,
  },
  bolsinha: {
    label: 'Mochilinhas & Bolsinhas',
    icon: ShoppingBag,
  },
  generica: {
    label: 'Outros / Diversos',
    icon: Package,
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
        const rawDesc = (item.descricao || item.item_name || '').toLowerCase();
        let normalizedTipo = rawTipo;

        // Classificação inteligente considerando o tipo ou a descrição digitada
        if (rawTipo.includes('painel') || rawDesc.includes('painel')) {
          normalizedTipo = 'painel';
        } else if (rawTipo.includes('totem') || rawDesc.includes('totem')) {
          normalizedTipo = 'totem';
        } else if (
          rawTipo.includes('mesa') ||
          rawDesc.includes('mesa') ||
          rawDesc.includes('babado') ||
          rawDesc.includes('toalha')
        ) {
          normalizedTipo = 'mesa';
        } else if (rawTipo.includes('adesivo') || rawDesc.includes('adesivo')) {
          normalizedTipo = 'adesivo';
        } else if (rawTipo.includes('lona') || rawDesc.includes('lona')) {
          normalizedTipo = 'lona';
        } else if (
          rawTipo.includes('bolsa') ||
          rawDesc.includes('bolsa') ||
          rawDesc.includes('mochila') ||
          rawDesc.includes('mochilinha') ||
          rawDesc.includes('saco') ||
          rawDesc.includes('necessaire') ||
          rawDesc.includes('brinde')
        ) {
          normalizedTipo = 'bolsinha';
        } else if (!TIPO_LABELS[normalizedTipo]) {
          normalizedTipo = 'generica';
        }

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
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Header Padrão do Sistema: Limpo, Claro e Alinhado com o Design SGP */}
        <DialogHeader className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg sm:text-xl font-bold truncate text-slate-900 dark:text-slate-100">
                    {cliente?.nome || 'Cliente'}
                  </DialogTitle>
                  {cliente?.id && (
                    <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-[10px] shrink-0">
                      ID #{cliente.id}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {cliente?.telefone && (
                    <span className="flex items-center gap-1 font-medium">
                      <Phone className="w-3 h-3 text-blue-600" />
                      {cliente.telefone}
                      {cleanWhatsappNumber(cliente.telefone) && (
                        <a
                          href={`https://wa.me/${cleanWhatsappNumber(cliente.telefone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5 underline underline-offset-2"
                        >
                          WhatsApp <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </span>
                  )}
                  {(cliente?.cidade || cliente?.estado) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {cliente.cidade || ''}{cliente.cidade && cliente.estado ? ' - ' : ''}{cliente.estado || ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total LTV no Topo em Cartão Discreto */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-lg shadow-sm self-start sm:self-auto shrink-0 text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total em Pedidos</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">
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
          <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-2 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
            <TabsList className="bg-slate-200/70 dark:bg-slate-800/70 p-1">
              <TabsTrigger value="resumo" className="gap-2 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                O que o cliente pede ({produtosConsolidados.categories.length})
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="gap-2 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                Histórico de Pedidos ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="cadastro" className="gap-2 text-xs font-semibold">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                Dados Cadastrais
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/30 dark:bg-slate-950/20">
            {/* ─────────────────────────────────────────────────────────────
                ABA 1: RESUMO DO QUE O CLIENTE JÁ PEDIU
            ───────────────────────────────────────────────────────────── */}
            <TabsContent value="resumo" className="m-0 space-y-5 focus-visible:outline-none">
              {/* Cards de Métricas Principais (Padrão SGP: Fundo Branco, Borda Fina, Cores Neutras) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total de Pedidos</span>
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {metrics.totalOrdersCount}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {metrics.firstDate ? `Desde ${formatDateForDisplay(metrics.firstDate)}` : 'Nenhum pedido'}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Itens Produzidos</span>
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {metrics.totalItemsCount}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    peças no total
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Ticket Médio</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {formatCurrency(metrics.averageTicket)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    por pedido
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Última Compra</span>
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                    {metrics.lastDate ? formatDateForDisplay(metrics.lastDate) : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {orders[0] ? `Pedido #${orders[0].numero || orders[0].id}` : 'Sem registro'}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-36 w-full rounded-lg" />
                </div>
              ) : produtosConsolidados.categories.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-white dark:bg-slate-800">
                  <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Nenhum pedido encontrado</h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                    Este cliente ainda não possui pedidos com itens cadastrados no sistema.
                  </p>
                </div>
              ) : (
                <>
                  {/* Resumo em Blocos por Categoria */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Totalização por Categoria de Produto
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {produtosConsolidados.categories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <div
                            key={cat.tipo}
                            className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 transition-all flex items-start justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{cat.label}</span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                                  {cat.totalQty}
                                </span>
                                <span className="text-xs font-medium text-slate-500">unidades</span>
                              </div>
                              {cat.totalValor > 0 && (
                                <p className="text-xs font-medium text-slate-500 mt-1">
                                  {formatCurrency(cat.totalValor)} investidos
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-bold text-[11px]"
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
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Discriminação Completa do que o Cliente Já Pediu
                    </h3>
                    <div className="space-y-3">
                      {produtosConsolidados.categories.map((cat) => (
                        <div
                          key={cat.tipo}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-sm"
                        >
                          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <cat.icon className="w-4 h-4 text-blue-600" />
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{cat.label}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Total: {cat.totalQty} un
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {cat.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors text-xs"
                              >
                                <div className="space-y-0.5 pr-2">
                                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                    {item.descricao}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11px]">
                                    {item.medidas && (
                                      <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-600">
                                        {item.medidas}
                                      </span>
                                    )}
                                    {item.tecido && (
                                      <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                        Tecido: {item.tecido}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-sm border border-blue-200 dark:border-blue-800">
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
            <TabsContent value="pedidos" className="m-0 space-y-3.5 focus-visible:outline-none">
              {/* Barra de Busca Rápida no Histórico */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar por número do pedido, item, tecido ou observação..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-white dark:bg-slate-800">
                  <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                    {searchHistory ? 'Nenhum pedido encontrado com este termo' : 'Nenhum pedido cadastrado'}
                  </h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
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
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow transition-all space-y-3"
                      >
                        {/* Header do Pedido */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                              #{order.numero || order.id}
                            </span>
                            {getStatusBadge(order)}
                            {order.data_entrada && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {formatDateForDisplay(order.data_entrada)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            {order.data_entrega && (
                              <span className="text-xs text-slate-500">
                                Entrega: <strong className="text-slate-800 dark:text-slate-200">{formatDateForDisplay(order.data_entrega)}</strong>
                              </span>
                            )}
                            <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                              {formatCurrency(orderVal)}
                            </span>
                          </div>
                        </div>

                        {/* Itens do Pedido */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                                  className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-start justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                      {item.descricao || item.item_name || 'Sem descrição'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                      <span className="capitalize font-medium">{item.tipo_producao || 'item'}</span>
                                      {item.largura && item.altura && (
                                        <span>• {item.largura}x{item.altura}m</span>
                                      )}
                                      {item.tecido && <span>• {item.tecido}</span>}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="bg-white dark:bg-slate-800 font-bold shrink-0 border-slate-300">
                                    {qty}x
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Informações Complementares (Vendedor, Forma de Envio, Obs) */}
                        {(order.observacao || order.forma_envio || order.items?.[0]?.vendedor) && (
                          <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 dark:border-slate-700/60">
                            {order.items?.[0]?.vendedor && (
                              <span>Vendedor: <strong className="text-slate-700 dark:text-slate-300">{order.items[0].vendedor}</strong></span>
                            )}
                            {order.forma_envio && (
                              <span>Envio: <strong className="text-slate-700 dark:text-slate-300">{order.forma_envio}</strong></span>
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
            <TabsContent value="cadastro" className="m-0 space-y-3.5 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <p className="text-xs text-slate-500 font-medium">Nome Completo</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{cliente?.nome || '—'}</p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <p className="text-xs text-slate-500 font-medium">Telefone / WhatsApp</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {cliente?.telefone || '—'}
                    {cleanWhatsappNumber(cliente?.telefone) && (
                      <a
                        href={`https://wa.me/${cleanWhatsappNumber(cliente?.telefone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1"
                      >
                        Abrir WhatsApp <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <p className="text-xs text-slate-500 font-medium">CEP</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{cliente?.cep || '—'}</p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <p className="text-xs text-slate-500 font-medium">Cidade / Estado</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {cliente?.cidade || ''}{cliente?.cidade && cliente?.estado ? ' - ' : ''}{cliente?.estado || '—'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>

          {/* Footer Padrão SGP */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/80 flex justify-end shrink-0">
            <Button onClick={onClose} variant="default" className="min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white">
              Fechar
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
