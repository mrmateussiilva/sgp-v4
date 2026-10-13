import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  FileText,
  BarChart,
  AlertTriangle,
  Search,
  X,
  Copy,
  Check,
  Pencil,
  Undo2,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  MaterialConfigMap,
  FichaItemDetail,
  SortField,
  SortDirection
} from '@/types/materialAnalysis';
import {
  calculateSmartLinearMeters,
  parseDecimalVal,
  calculateItemAreaM2,
  getItemQuantidade,
  getItemAcabamentos,
  exportMaterialFichasCSV
} from '@/utils/materialAnalysisUtils';
import { RankingItem } from '@/api/types';

interface CategoriaDetalhesModalProps {
  category: { nome: string; itens: RankingItem[]; tipoFiltro?: 'material' | 'tipo_producao' | 'todos' } | null;
  onClose: () => void;
  configs: MaterialConfigMap;
  dataInicio: string;
  dataFim: string;
  tipoProducaoFiltro?: string;
  onUpdateConfig?: (nome: string, measure: 'm2' | 'linear' | 'unidade', width: number) => void;
}

export const CategoriaDetalhesModal: React.FC<CategoriaDetalhesModalProps> = ({
  category,
  onClose,
  configs,
  dataInicio,
  dataFim,
  tipoProducaoFiltro,
  onUpdateConfig
}) => {
  const [fichas, setFichas] = useState<FichaItemDetail[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState<'fichas' | 'resumo' | 'diagnostico'>('fichas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedTipo, setSelectedTipo] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 40;

  // Ordenação interativa das colunas
  const [sortField, setSortField] = useState<SortField>('pedido');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Manual linear meters overrides stored in localStorage
  const [linearOverrides, setLinearOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sgp_linear_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [calcMode, setCalcMode] = useState<'encaixe' | 'area'>('encaixe');
  const [onlyOverrides, setOnlyOverrides] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>('');

  const handleSaveOverride = (itemId: string, val: number) => {
    if (isNaN(val) || val < 0) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um número válido maior ou igual a zero.',
        variant: 'destructive',
      });
      return;
    }
    const updated = { ...linearOverrides, [itemId]: val };
    setLinearOverrides(updated);
    try {
      localStorage.setItem('sgp_linear_overrides', JSON.stringify(updated));
    } catch (e) {
      logger.error('Erro ao salvar override no localStorage', e);
    }
    toast({
      title: 'Metragem linear ajustada!',
      description: `Item definido manualmente como ${val.toFixed(2)} m linear.`,
    });
    setEditingItemId(null);
  };

  const handleResetOverride = (itemId: string) => {
    const updated = { ...linearOverrides };
    delete updated[itemId];
    setLinearOverrides(updated);
    try {
      localStorage.setItem('sgp_linear_overrides', JSON.stringify(updated));
    } catch (e) {
      logger.error('Erro ao atualizar localStorage', e);
    }
    toast({
      title: 'Cálculo restaurado',
      description: 'O item voltou a usar o cálculo automático.',
    });
  };

  const handleClearAllOverrides = () => {
    setLinearOverrides({});
    try {
      localStorage.removeItem('sgp_linear_overrides');
    } catch {}
    toast({
      title: 'Ajustes limpos',
      description: 'Todos os itens voltaram ao cálculo automático.',
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'cliente' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!category) {
      setFichas([]);
      setSearchQuery('');
      setCurrentPage(1);
      return;
    }

    // Determine initial material & production type filters
    if (category.tipoFiltro === 'material') {
      if (category.nome.toUpperCase() === 'OUTROS') {
        setSelectedMaterial('all');
      } else {
        setSelectedMaterial(category.nome.toUpperCase());
      }
      setSelectedTipo('all');
    } else if (category.tipoFiltro === 'tipo_producao') {
      setSelectedTipo(category.nome.toUpperCase());
      setSelectedMaterial('all');
    } else {
      setSelectedMaterial('all');
      if (tipoProducaoFiltro && tipoProducaoFiltro !== 'all') {
        setSelectedTipo(tipoProducaoFiltro.toUpperCase());
      } else {
        setSelectedTipo('all');
      }
    }

    let active = true;
    setLoadingOrders(true);

    const loadOrders = async () => {
      try {
        const params: Record<string, any> = {
          data_inicio: dataInicio,
          data_fim: dataFim,
          limit: 2000,
        };

        const response = await apiClient.get<any>('/pedidos/', { params });
        if (!active) return;

        const rawData: any = response?.data;
        const pedidosList: any[] = Array.isArray(rawData) ? rawData : (rawData?.pedidos || rawData?.items || []);
        const parsed: FichaItemDetail[] = [];

        for (const ped of pedidosList) {
          const statusLower = (ped.status || '').toLowerCase();
          if (statusLower === 'cancelado') continue;

          const num = ped.numero ? String(ped.numero).padStart(6, '0') : (ped.id ? String(ped.id) : 'S/N');
          const cliente = ped.cliente || 'Sem Cliente';
          const dataEntrada = ped.data_entrada || '';
          const dataEntrega = ped.data_entrega || '';

          const rawItems = ped.items || ped.itens || [];
          let items: any[] = [];
          try {
            if (typeof rawItems === 'string') {
              items = JSON.parse(rawItems);
            } else if (Array.isArray(rawItems)) {
              items = rawItems;
            }
          } catch {
            items = [];
          }

          items.forEach((it: any, idx: number) => {
            const tecRaw = (it.tecido || '').trim();
            const tecNorm = (tecRaw || 'NÃO INFORMADO').toUpperCase();
            const tpRaw = (it.tipo_producao || 'GERAL').trim().toUpperCase();
            const qtd = getItemQuantidade(it);
            const areaItem = calculateItemAreaM2(it);
            const areaTot = areaItem * qtd;
            const largNum = parseDecimalVal(it.largura);
            const altNum = parseDecimalVal(it.altura);

            let isAlerta = false;
            let alertaMotivo = '';
            if (!tecRaw || tecNorm === 'NÃO INFORMADO') {
              isAlerta = true;
              alertaMotivo = 'Material/tecido não preenchido';
            } else if (areaItem <= 0) {
              isAlerta = true;
              alertaMotivo = 'Área do item zerada ou inválida';
            } else if (largNum > 50 || altNum > 50) {
              isAlerta = true;
              alertaMotivo = 'Dimensão atípica (> 50m)';
            }

            parsed.push({
              id: `${num}-${idx}-${it.id || ''}`,
              pedidoNumero: num,
              cliente,
              dataEntrada,
              dataEntrega,
              tipoProducao: tpRaw,
              material: tecNorm,
              materialRaw: tecRaw,
              descricao: it.descricao || 'Sem descrição',
              largura: it.largura || '',
              altura: it.altura || '',
              larguraNum: largNum,
              alturaNum: altNum,
              quantidade: qtd,
              areaItemM2: areaItem,
              areaTotalM2: areaTot,
              acabamentos: getItemAcabamentos(it),
              designer: it.designer,
              observacao: it.observacao,
              isAlerta,
              alertaMotivo,
            });
          });
        }

        setFichas(parsed);
      } catch (err) {
        logger.error('Erro ao carregar fichas detalhadas:', err);
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os detalhes dos pedidos.',
          variant: 'destructive',
        });
      } finally {
        if (active) setLoadingOrders(false);
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [category, dataInicio, dataFim, tipoProducaoFiltro]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMaterial, selectedTipo, searchQuery, onlyOverrides]);

  // Active roll width for selected material
  const currentMaterialConfig = useMemo(() => {
    if (selectedMaterial === 'all') return null;
    return configs[selectedMaterial] || configs[selectedMaterial.toUpperCase()] || { medida: 'm2', larguraRolo: 1.5 };
  }, [configs, selectedMaterial]);

  const activeRollWidth = currentMaterialConfig?.larguraRolo || 1.5;

  const handleUpdateRollWidth = (newWidth: number) => {
    if (selectedMaterial !== 'all' && onUpdateConfig) {
      const currentMedida = currentMaterialConfig?.medida || 'linear';
      onUpdateConfig(selectedMaterial, currentMedida, newWidth);
      toast({
        title: 'Largura do rolo atualizada',
        description: `${selectedMaterial}: rolo configurado para ${newWidth}m.`,
      });
    }
  };

  // Helper to compute metrics for any item
  const getItemMetrics = (item: FichaItemDetail) => {
    const matConfig = configs[item.material] || configs[item.material.toUpperCase()] || { medida: 'm2', larguraRolo: 1.5 };
    const rWidth = (selectedMaterial === item.material && currentMaterialConfig) ? activeRollWidth : (matConfig.larguraRolo || 1.5);
    const autoLinear = calculateSmartLinearMeters(item.larguraNum, item.alturaNum, item.quantidade, item.areaTotalM2, rWidth, calcMode);

    const isOverridden = linearOverrides[item.id] !== undefined;
    const effectiveLinear = isOverridden ? linearOverrides[item.id] : autoLinear;

    return {
      autoLinear,
      effectiveLinear,
      isOverridden,
      rollWidth: rWidth,
      medida: matConfig.medida,
    };
  };

  // Aggregate stats across all loaded fichas
  const materialAggregates = useMemo(() => {
    const map: Record<string, { count: number; area: number; pecas: number; linear: number; overrides: number }> = {};
    for (const f of fichas) {
      if (!map[f.material]) {
        map[f.material] = { count: 0, area: 0, pecas: 0, linear: 0, overrides: 0 };
      }
      const { effectiveLinear, isOverridden } = getItemMetrics(f);
      map[f.material].count++;
      map[f.material].area += f.areaTotalM2;
      map[f.material].pecas += f.quantidade;
      map[f.material].linear += effectiveLinear;
      if (isOverridden) map[f.material].overrides++;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].area - a[1].area)
      .map(([nome, d]) => ({ nome, ...d }));
  }, [fichas, linearOverrides, calcMode, configs, activeRollWidth]);

  const tipoProducaoList = useMemo(() => {
    const set = new Set<string>();
    for (const f of fichas) {
      if (f.tipoProducao) set.add(f.tipoProducao);
    }
    return Array.from(set).sort();
  }, [fichas]);

  // Filtered and sorted fichas
  const filteredFichas = useMemo(() => {
    const filtered = fichas.filter((f) => {
      if (onlyOverrides && linearOverrides[f.id] === undefined) {
        return false;
      }
      if (selectedMaterial !== 'all') {
        const mat = (f.material || '').toUpperCase().trim();
        const sel = selectedMaterial.toUpperCase().trim();
        if (mat !== sel && !mat.includes(sel) && !sel.includes(mat)) {
          return false;
        }
      }
      if (selectedTipo !== 'all') {
        const norm = (s: string) => (s || '').toUpperCase().replace(/[\s_-]+/g, '');
        if (norm(f.tipoProducao) !== norm(selectedTipo)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mNum = f.pedidoNumero.toLowerCase().includes(q);
        const mCli = f.cliente.toLowerCase().includes(q);
        const mDesc = f.descricao.toLowerCase().includes(q);
        const mMat = f.material.toLowerCase().includes(q);
        const mAcab = f.acabamentos.some(a => a.toLowerCase().includes(q));
        if (!mNum && !mCli && !mDesc && !mMat && !mAcab) {
          return false;
        }
      }
      return true;
    });

    // Sort items
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'pedido') {
        comparison = a.pedidoNumero.localeCompare(b.pedidoNumero, undefined, { numeric: true });
      } else if (sortField === 'cliente') {
        comparison = a.cliente.localeCompare(b.cliente);
      } else if (sortField === 'area') {
        comparison = a.areaTotalM2 - b.areaTotalM2;
      } else if (sortField === 'linear') {
        const lA = getItemMetrics(a).effectiveLinear;
        const lB = getItemMetrics(b).effectiveLinear;
        comparison = lA - lB;
      } else if (sortField === 'data') {
        comparison = (a.dataEntrada || '').localeCompare(b.dataEntrada || '');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [fichas, selectedMaterial, selectedTipo, searchQuery, onlyOverrides, linearOverrides, sortField, sortDirection]);

  const filteredAlertas = useMemo(() => {
    return filteredFichas.filter(f => f.isAlerta);
  }, [filteredFichas]);

  // KPIs for filtered fichas
  const kpis = useMemo(() => {
    let area = 0;
    let pecas = 0;
    let totalLinear = 0;
    let overridesCount = 0;

    for (const f of filteredFichas) {
      area += f.areaTotalM2;
      pecas += f.quantidade;
      const { effectiveLinear, isOverridden } = getItemMetrics(f);
      totalLinear += effectiveLinear;
      if (isOverridden) overridesCount++;
    }

    return {
      fichasCount: filteredFichas.length,
      pecasCount: pecas,
      areaTotalM2: area,
      totalLinearMeters: totalLinear,
      overridesCount,
    };
  }, [filteredFichas, linearOverrides, calcMode, configs, activeRollWidth]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFichas.length / pageSize));
  const paginatedFichas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFichas.slice(start, start + pageSize);
  }, [filteredFichas, currentPage, pageSize]);

  // Download directly to CSV file
  const handleDownloadCSV = () => {
    if (filteredFichas.length === 0) return;
    const cleanCategoryName = (category?.nome || 'materiais').toLowerCase().replace(/\s+/g, '_');
    exportMaterialFichasCSV(filteredFichas, getItemMetrics, calcMode, `relatorio_fichas_${cleanCategoryName}`);
    toast({
      title: 'Arquivo CSV gerado!',
      description: `Download de ${filteredFichas.length} fichas iniciado com sucesso.`,
    });
  };

  // Export to TSV / Clipboard
  const handleCopyTSV = () => {
    if (filteredFichas.length === 0) return;
    const headers = [
      'Pedido', 'Cliente', 'Data Entrada', 'Tipo Produção',
      'Material', 'Descrição', 'Largura (m)', 'Altura (m)',
      'Quantidade', 'Área Item (m²)', 'Área Total (m²)',
      'Metros Lineares (m)', 'Cálculo Linear', 'Acabamentos'
    ];
    const rows = filteredFichas.map(f => {
      const { effectiveLinear, isOverridden } = getItemMetrics(f);
      return [
        f.pedidoNumero,
        `"${f.cliente.replace(/"/g, '""')}"`,
        f.dataEntrada,
        f.tipoProducao,
        f.material,
        `"${f.descricao.replace(/"/g, '""')}"`,
        f.largura,
        f.altura,
        f.quantidade,
        f.areaItemM2.toFixed(2),
        f.areaTotalM2.toFixed(2),
        effectiveLinear.toFixed(2),
        isOverridden ? 'Manual (Ajustado)' : `Automático (${calcMode === 'encaixe' ? 'Encaixe Real' : 'Área ÷ Rolo'})`,
        `"${f.acabamentos.join(', ')}"`
      ];
    });

    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      toast({
        title: 'Tabela copiada!',
        description: `${filteredFichas.length} registros copiados com as metragens lineares ajustadas.`,
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!category) return null;

  const totalAreaGeral = category.itens.reduce((acc: number, curr: any) => acc + curr.area_total_m2, 0);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground opacity-40 ml-1 inline" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary font-bold ml-1 inline" />
      : <ArrowDown className="w-3 h-3 text-primary font-bold ml-1 inline" />;
  };

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950 border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 bg-zinc-900 text-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-primary border-primary/30 uppercase text-[10px] font-black tracking-widest px-2 py-0.5">
                  Conferência & Edição de Metragem
                </Badge>
                <span className="text-zinc-400 text-xs font-mono">
                  {dataInicio.split('-').reverse().join('/')} → {dataFim.split('-').reverse().join('/')}
                </span>
                {kpis.overridesCount > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">
                    {kpis.overridesCount} {kpis.overridesCount === 1 ? 'item ajustado manualmente' : 'itens ajustados manualmente'}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                {category.nome}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                Valide e edite diretamente a metragem linear das fichas. Clique no lápis em qualquer linha para ajustar.
              </DialogDescription>
            </div>

            {/* Quick KPI Strip in Header */}
            <div className="flex items-center gap-3 bg-zinc-800/80 p-2.5 rounded-xl border border-zinc-700/50">
              <div className="text-right px-2 border-r border-zinc-700">
                <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Fichas</span>
                <span className="text-lg font-black text-white">{kpis.fichasCount}</span>
              </div>
              <div className="text-right px-2 border-r border-zinc-700">
                <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider">Área Total</span>
                <span className="text-lg font-black text-white">{kpis.areaTotalM2.toFixed(1)} <span className="text-xs font-normal">m²</span></span>
              </div>
              <div className="text-right px-2">
                <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                  M. Linear Total
                </span>
                <span className="text-lg font-black text-amber-400">
                  {kpis.totalLinearMeters.toFixed(2)} <span className="text-xs font-normal">m lin.</span>
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs Bar */}
        <div className="border-b bg-zinc-50 dark:bg-zinc-900/60 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full sm:w-auto">
            <TabsList className="bg-zinc-200/70 dark:bg-zinc-800">
              <TabsTrigger value="fichas" className="gap-2 text-xs font-bold">
                <FileText className="w-3.5 h-3.5" />
                Fichas Detalhadas ({filteredFichas.length})
              </TabsTrigger>
              <TabsTrigger value="resumo" className="gap-2 text-xs font-bold">
                <BarChart className="w-3.5 h-3.5" />
                Resumo por Material ({materialAggregates.length})
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="gap-2 text-xs font-bold">
                <AlertTriangle className={cn("w-3.5 h-3.5", filteredAlertas.length > 0 ? "text-amber-500" : "text-zinc-400")} />
                Diagnóstico {filteredAlertas.length > 0 && `(${filteredAlertas.length})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              disabled={filteredFichas.length === 0}
              className="h-8 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              title="Baixar arquivo .csv formatado para o Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTSV}
              disabled={filteredFichas.length === 0}
              className="h-8 text-xs font-bold gap-1.5 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar p/ Excel'}
            </Button>
          </div>
        </div>

        {/* Tab 1: Fichas Detalhadas */}
        {activeTab === 'fichas' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
            {/* Search and Filters Bar */}
            <div className="p-4 border-b bg-white dark:bg-zinc-950 space-y-2.5 shrink-0">
              {/* Row 1: Primary Search & Selects */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por pedido #, cliente, descrição, acabamento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-zinc-50/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Material Dropdown Filter */}
                <div className="w-[200px] shrink-0">
                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Material / Tecido" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      <SelectItem value="all" className="text-xs font-bold">
                        Todos os Materiais ({fichas.length})
                      </SelectItem>
                      {materialAggregates.map(mat => (
                        <SelectItem key={mat.nome} value={mat.nome} className="text-xs">
                          <span className="font-semibold">{mat.nome}</span>
                          <span className="text-muted-foreground ml-1.5 text-[11px]">({mat.count})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo Produção Filter */}
                <div className="w-[170px] shrink-0">
                  <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Tipo de Produção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs font-bold">Todos os Tipos ({fichas.length})</SelectItem>
                      {tipoProducaoList.map(tp => (
                        <SelectItem key={tp} value={tp} className="text-xs">
                          {tp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manual Overrides Quick Filter */}
                {Object.keys(linearOverrides).length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={onlyOverrides ? "default" : "outline"}
                      onClick={() => setOnlyOverrides(!onlyOverrides)}
                      className={cn(
                        "cursor-pointer font-bold px-2.5 py-1.5 text-xs transition-colors gap-1.5 border-amber-500/40 select-none",
                        onlyOverrides ? "bg-amber-600 text-white" : "text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                      )}
                    >
                      <Pencil className="w-3 h-3" />
                      Apenas Ajustados ({Object.keys(linearOverrides).length})
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllOverrides}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-rose-600 font-medium gap-1"
                      title="Restaurar todos para cálculo automático"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Restaurar
                    </Button>
                  </div>
                )}
              </div>

              {/* Row 2: Secondary Settings Strip (Calculation Mode + Roll Width) */}
              <div className="bg-zinc-50/90 dark:bg-zinc-900/60 rounded-lg px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Calculation Engine Mode */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Cálculo:
                  </span>
                  <div className="inline-flex rounded-md bg-zinc-200/70 dark:bg-zinc-800 p-0.5 text-xs">
                    <button
                      onClick={() => setCalcMode('encaixe')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1",
                        calcMode === 'encaixe'
                          ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Cálculo de avanço real de rolo (considera rotação para minimizar perda)"
                    >
                      ⚡ Encaixe Real (Avanço)
                    </button>
                    <button
                      onClick={() => setCalcMode('area')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                        calcMode === 'area'
                          ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Fórmula clássica: Área Total ÷ Largura do Rolo"
                    >
                      Área ÷ Rolo
                    </button>
                  </div>
                </div>

                {/* Roll Width Quick Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {selectedMaterial !== 'all' ? `Largura Rolo (${selectedMaterial}):` : 'Largura Padrão do Rolo:'}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1.50, 1.60, 1.80, 3.20].map((w) => (
                      <Button
                        key={w}
                        variant={activeRollWidth === w ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUpdateRollWidth(w)}
                        className={cn(
                          "h-6 px-2 text-[10px] font-bold",
                          activeRollWidth === w && "bg-primary text-primary-foreground font-black shadow-xs"
                        )}
                      >
                        {w.toFixed(2)}m
                      </Button>
                    ))}
                    <div className="flex items-center gap-1 ml-1 bg-white dark:bg-zinc-900 border rounded px-1.5 py-0.5">
                      <Input
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={activeRollWidth}
                        onChange={(e) => handleUpdateRollWidth(parseFloat(e.target.value) || 1.5)}
                        className="h-5 w-12 text-center font-bold text-xs p-0 border-none focus-visible:ring-0"
                      />
                      <span className="text-[10px] font-bold text-muted-foreground">m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick shortcuts for Top 5 Materials only */}
              {materialAggregates.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar pt-0.5">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 shrink-0">Top Materiais:</span>
                  <Badge
                    variant={selectedMaterial === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedMaterial('all')}
                    className={cn(
                      "cursor-pointer font-bold px-2 py-0.5 text-[10px] shrink-0 transition-colors",
                      selectedMaterial === 'all' ? "bg-primary text-primary-foreground" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    TODOS ({fichas.length})
                  </Badge>
                  {materialAggregates.slice(0, 5).map(mat => (
                    <Badge
                      key={mat.nome}
                      variant={selectedMaterial === mat.nome ? 'default' : 'outline'}
                      onClick={() => setSelectedMaterial(mat.nome)}
                      className={cn(
                        "cursor-pointer font-bold px-2 py-0.5 text-[10px] shrink-0 transition-colors gap-1 max-w-[170px] truncate",
                        selectedMaterial === mat.nome
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                      title={mat.nome}
                    >
                      <span className="truncate">{mat.nome}</span>
                      <span className="opacity-70 text-[9px]">({mat.count})</span>
                    </Badge>
                  ))}
                  {materialAggregates.length > 5 && (
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      +{materialAggregates.length - 5} outros no menu acima
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
              {loadingOrders ? (
                <div className="p-8 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm font-medium">Carregando itens de fichas dos pedidos...</span>
                  </div>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : filteredFichas.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground space-y-2">
                  <Package className="w-10 h-10 mx-auto opacity-30" />
                  <p className="font-bold text-sm">Nenhum item de ficha encontrado com os filtros atuais.</p>
                  <p className="text-xs">Tente alterar os termos de busca ou remover o filtro de material.</p>
                </div>
              ) : (
                <Table className="w-full">
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10 shadow-xs border-b">
                    <TableRow className="hover:bg-transparent">
                      <TableHead
                        onClick={() => toggleSort('pedido')}
                        className="w-[105px] text-xs font-black text-zinc-700 dark:text-zinc-300 cursor-pointer select-none hover:bg-zinc-100/80 transition-colors"
                      >
                        Pedido {renderSortIcon('pedido')}
                      </TableHead>
                      <TableHead
                        onClick={() => toggleSort('cliente')}
                        className="w-[180px] max-w-[210px] text-xs font-black text-zinc-700 dark:text-zinc-300 cursor-pointer select-none hover:bg-zinc-100/80 transition-colors"
                      >
                        Cliente / Tipo {renderSortIcon('cliente')}
                      </TableHead>
                      <TableHead className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                        Descrição da Ficha
                      </TableHead>
                      <TableHead className="w-[125px] text-xs font-black text-center text-zinc-700 dark:text-zinc-300">
                        Medidas & Qtd
                      </TableHead>
                      <TableHead
                        onClick={() => toggleSort('linear')}
                        className="w-[170px] text-xs font-black text-right text-zinc-700 dark:text-zinc-300 cursor-pointer select-none hover:bg-zinc-100/80 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>M. Linear & Área</span>
                          {renderSortIcon('linear')}
                          <Pencil className="w-3 h-3 text-muted-foreground ml-1" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[130px] text-xs font-black text-zinc-700 dark:text-zinc-300">
                        Acabamentos
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFichas.map((item) => {
                      const metrics = getItemMetrics(item);
                      const isEditing = editingItemId === item.id;

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors text-xs border-b border-zinc-100 dark:border-zinc-800/60",
                            item.isAlerta && "bg-amber-500/5 hover:bg-amber-500/10",
                            metrics.isOverridden && "bg-amber-500/[0.03]"
                          )}
                        >
                          {/* Pedido & Data */}
                          <TableCell className="font-mono font-bold text-zinc-900 dark:text-zinc-100 py-2.5">
                            <div>#{item.pedidoNumero}</div>
                            {item.dataEntrada && (
                              <div className="text-[10px] text-muted-foreground font-normal">
                                {item.dataEntrada.split('-').reverse().join('/')}
                              </div>
                            )}
                          </TableCell>

                          {/* Cliente & Tipo Produção */}
                          <TableCell className="py-2.5 max-w-[210px]">
                            <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate text-xs" title={item.cliente}>
                              {item.cliente}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {item.tipoProducao}
                              </Badge>
                              {selectedMaterial === 'all' && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] font-bold uppercase px-1 py-0 border-zinc-200 text-zinc-500",
                                    item.material === 'TACTEL' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                                    item.material === 'MALHA' && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                                    item.material.startsWith('MDF') && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                  )}
                                >
                                  {item.material}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Descrição da Ficha */}
                          <TableCell className="py-2.5">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 text-xs leading-snug" title={item.descricao}>
                              {item.descricao}
                            </div>
                            {item.observacao && (
                              <div className="text-[10px] text-muted-foreground italic truncate max-w-[320px] mt-0.5" title={item.observacao}>
                                Obs: {item.observacao}
                              </div>
                            )}
                            {item.isAlerta && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {item.alertaMotivo}
                              </div>
                            )}
                          </TableCell>

                          {/* Medidas & Quantidade */}
                          <TableCell className="text-center font-mono py-2.5">
                            {item.largura && item.altura ? (
                              <span className="inline-block bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px] font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                {item.largura} × {item.altura}m
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">-</span>
                            )}
                            <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              {item.quantidade} {item.quantidade === 1 ? 'peça' : 'peças'}
                            </div>
                          </TableCell>

                          {/* Editable Linear Meters & Area Cell */}
                          <TableCell className="text-right font-mono py-2.5">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={tempEditValue}
                                  onChange={(e) => setTempEditValue(e.target.value)}
                                  className="h-7 w-20 text-xs text-right font-bold font-mono px-1.5 bg-white dark:bg-zinc-900 border-primary"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveOverride(item.id, parseFloat(tempEditValue) || 0);
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                                />
                                <span className="text-[10px] text-muted-foreground font-bold">m</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                  onClick={() => handleSaveOverride(item.id, parseFloat(tempEditValue) || 0)}
                                  title="Salvar metragem linear"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  onClick={() => setEditingItemId(null)}
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="group/cell relative flex items-center justify-end gap-1.5">
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {metrics.isOverridden && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-black">
                                        Manual
                                      </Badge>
                                    )}
                                    <span className={cn(
                                      "font-black text-[13px]",
                                      metrics.isOverridden ? "text-amber-600 dark:text-amber-400 font-extrabold" : "text-primary"
                                    )}>
                                      {metrics.effectiveLinear.toFixed(2)} m lin.
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-medium">
                                    {item.areaTotalM2.toFixed(2)} m²
                                  </div>
                                </div>

                                <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setTempEditValue(String(metrics.effectiveLinear.toFixed(2)));
                                    }}
                                    title="Editar metragem linear deste item"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  {metrics.isOverridden && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                                      onClick={() => handleResetOverride(item.id)}
                                      title={`Restaurar cálculo automático (${metrics.autoLinear.toFixed(2)}m)`}
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </TableCell>

                          {/* Acabamentos */}
                          <TableCell className="py-2.5">
                            <div className="flex flex-wrap gap-1 max-w-[130px]">
                              {item.acabamentos.length > 0 ? (
                                item.acabamentos.map((acab, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 text-zinc-600 dark:text-zinc-400 font-medium">
                                    {acab}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-normal">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination & Summary Footer */}
            <div className="p-3 border-t bg-zinc-50 dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
              <div className="text-muted-foreground font-medium">
                Mostrando <span className="font-bold text-foreground">{Math.min(filteredFichas.length, (currentPage - 1) * pageSize + 1)}</span> até{' '}
                <span className="font-bold text-foreground">{Math.min(filteredFichas.length, currentPage * pageSize)}</span> de{' '}
                <span className="font-bold text-foreground">{filteredFichas.length}</span> fichas
                {' • '}
                <span className="font-bold text-foreground">{kpis.totalLinearMeters.toFixed(2)} m lineares</span> totalizados
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-xs font-bold"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
                </Button>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-xs font-bold"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Resumo por Material */}
        {activeTab === 'resumo' && (
          <ScrollArea className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Consolidação dos Materiais ({materialAggregates.length} encontrados)
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Modo ativo: <strong className="text-primary">{calcMode === 'encaixe' ? 'Encaixe Real' : 'Área ÷ Rolo'}</strong>
                  </span>
                </div>
                <div className="space-y-3">
                  {materialAggregates.map((mat, i) => {
                    const percent = totalAreaGeral > 0 ? (mat.area / totalAreaGeral * 100) : 0;
                    return (
                      <div
                        key={mat.nome}
                        onClick={() => {
                          setSelectedMaterial(mat.nome);
                          setActiveTab('fichas');
                        }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border hover:border-primary/50 cursor-pointer hover:shadow-sm transition-all gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-sm">{mat.nome}</p>
                              {mat.overrides > 0 && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                  {mat.overrides} {mat.overrides === 1 ? 'ajuste manual' : 'ajustes manuais'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">
                              {mat.count} fichas registradas • {mat.pecas} peças produzidas
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center justify-between sm:justify-end gap-4">
                          <div>
                            <p className="text-sm font-black text-amber-500">
                              {mat.linear.toFixed(2)} m lin.
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground">
                              {mat.area.toFixed(2)} m² ({percent.toFixed(1)}% da área total)
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-bold hover:bg-primary hover:text-white transition-colors">
                            Ver Fichas →
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {/* Tab 3: Diagnóstico de Alertas */}
        {activeTab === 'diagnostico' && (
          <ScrollArea className="flex-1 p-6 bg-white dark:bg-zinc-950">
            <div className="max-w-4xl mx-auto space-y-4">
              {filteredAlertas.length === 0 ? (
                <div className="p-12 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
                  <h4 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                    Tudo certo com os dados!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto">
                    Todas as {filteredFichas.length} fichas do período possuem material/tecido especificado, metragens válidas e dimensões normais.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      {filteredAlertas.length} fichas precisam de atenção ou conferência
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Itens com metragem zerada, material ausente ou dimensões anormais podem distorcer o consumo total de m².
                    </p>
                  </div>

                  {filteredAlertas.map(alerta => (
                    <Card key={alerta.id} className="p-4 border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-zinc-900">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">Pedido #{alerta.pedidoNumero}</span>
                            <Badge variant="destructive" className="text-[10px] font-bold">
                              {alerta.alertaMotivo}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Cliente: {alerta.cliente}</p>
                          <p className="text-xs font-medium text-foreground mt-1">{alerta.descricao}</p>
                        </div>
                        <div className="text-right font-mono text-xs">
                          <p className="font-bold">Medidas: {alerta.largura || '?'} × {alerta.altura || '?'}</p>
                          <p className="text-muted-foreground">Qtd: {alerta.quantidade} un</p>
                          <p className="text-primary font-bold">{alerta.areaTotalM2.toFixed(2)} m²</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Você pode ordenar as fichas clicando no cabeçalho ou ajustar manualmente a metragem com o lápis.
          </div>
          <Button onClick={onClose} variant="secondary" className="font-bold px-6">
            Fechar Detalhes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
