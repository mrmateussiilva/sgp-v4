import { useState, useEffect, useRef } from 'react';
import { useDesignerPanel } from '@/hooks/useDesignerPanel';
import { RemoteImage } from '@/components/RemoteImage';
import { useAuthStore } from '@/store/authStore';

import { DesignerArteItem } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Loader2, RefreshCw, Clock, Package, CheckCircle2,
    Maximize2, FileText, AlertTriangle,
    MessageSquare, Send, Calendar, ListFilter,
    PlusCircle, MoreVertical, Eye, Play, Undo2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper de formatação de data nativo (Intl)
const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length !== 3) return '-';
        const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
        }).format(date);
    } catch (e) {
        return '-';
    }
};

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
};

type Urgency = 'ATRASADO' | 'HOJE' | 'AMANHA' | 'FUTURO' | 'SEM_DATA';

const getUrgency = (dataEntrega?: string): Urgency => {
    if (!dataEntrega) return 'SEM_DATA';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const parts = dataEntrega.split('T')[0].split('-');
    if (parts.length !== 3) return 'SEM_DATA';
    const entrega = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    entrega.setHours(0, 0, 0, 0);
    
    const diffTime = entrega.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'ATRASADO';
    if (diffDays === 0) return 'HOJE';
    if (diffDays === 1) return 'AMANHA';
    return 'FUTURO';
};

const getUrgencyText = (urgency: Urgency, dataEntrega?: string) => {
    if (urgency === 'ATRASADO') {
        const parts = dataEntrega!.split('T')[0].split('-');
        const entrega = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        entrega.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.round((today.getTime() - entrega.getTime()) / (1000 * 60 * 60 * 24));
        return `ATRASADO — ${diff} DIA${diff > 1 ? 'S' : ''}`;
    }
    if (urgency === 'HOJE') return 'ENTREGA HOJE';
    if (urgency === 'AMANHA') return 'ENTREGA AMANHÃ';
    if (urgency === 'FUTURO') return `ENTREGA ${formatDate(dataEntrega!)}`;
    return 'SEM DATA';
};

const getUrgencyColors = (urgency: Urgency) => {
    switch (urgency) {
        case 'ATRASADO': return 'bg-red-100 text-red-700 border-red-200 ring-red-500/30';
        case 'HOJE': return 'bg-orange-100 text-orange-700 border-orange-200 ring-orange-500/30';
        case 'AMANHA': return 'bg-yellow-100 text-yellow-700 border-yellow-200 ring-yellow-500/30';
        default: return 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/30';
    }
};

export default function TelaPainelDesigners() {
    const {
        designers,
        activeDesigner,
        setActiveDesigner,
        items,
        selectedItem,
        setSelectedItem,
        isLoading,
        isRefreshing,
        lastUpdated,
        autoRefreshEnabled,
        setAutoRefreshEnabled,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        hasMore,
        refreshItems,
        toggleStatusArte,
        handlePostComentario,
    } = useDesignerPanel();

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Carregando Painel de Designers...</p>
                </div>
            </div>
        );
    }

    // Cálculos para o summary
    const activeDesignerItems = items;
    const pendentes = activeDesignerItems.filter(i => i.status_arte !== 'liberado');
    const liberados = activeDesignerItems.filter(i => i.status_arte === 'liberado');
    const atrasadosCount = pendentes.filter(i => getUrgency(i.data_entrega) === 'ATRASADO').length;

    // Ordenar pendentes por urgência (atrasados primeiro, hoje, amanhã, futuros)
    const sortedPendentes = [...pendentes].sort((a, b) => {
        const uA = getUrgency(a.data_entrega);
        const uB = getUrgency(b.data_entrega);
        const order = { 'ATRASADO': 0, 'HOJE': 1, 'AMANHA': 2, 'FUTURO': 3, 'SEM_DATA': 4 };
        return order[uA] - order[uB];
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Painel de Designers</h1>
                    <div className="flex items-center gap-2 mt-1.5 text-sm">
                        <Badge variant="outline" className="font-extrabold bg-slate-50 text-slate-600 border-slate-200">{pendentes.length} pendentes</Badge>
                        {atrasadosCount > 0 && <Badge variant="outline" className="font-extrabold bg-red-50 text-red-600 border-red-200">{atrasadosCount} atrasados</Badge>}
                        <Badge variant="outline" className="font-extrabold bg-green-50 text-green-600 border-green-200">{liberados.length} liberados</Badge>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground flex items-center justify-end font-medium">
                            <Clock className="h-3 w-3 mr-1 text-slate-450" />
                            Atualizado às {formatTime(lastUpdated)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/75 font-medium">
                            {autoRefreshEnabled ? 'Atualização automática ativa' : 'Atualização automática inativa'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshItems(activeDesigner)}
                        disabled={isRefreshing}
                        className="h-9 border-slate-200 shadow-sm hover:bg-slate-50 font-bold"
                    >
                        {isRefreshing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Atualizar
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        className={cn(
                            "text-xs h-9 font-bold px-3 transition-colors",
                            autoRefreshEnabled ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        )}
                    >
                        {autoRefreshEnabled ? 'AUTO ON' : 'AUTO OFF'}
                    </Button>
                </div>
            </div>

            {/* Barra de Filtros */}
            <Card className="p-4 bg-slate-50/50 border-slate-150 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-end gap-6">
                    <div className="grid grid-cols-2 sm:flex items-end gap-3 flex-1">
                        <div className="space-y-1.5 flex-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                <Calendar className="h-3 w-3 text-primary" /> Data Inicial
                            </label>
                            <Input
                                type="date"
                                className="h-9 text-xs font-bold border-slate-250 bg-white"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                <Calendar className="h-3 w-3 text-primary" /> Data Final
                            </label>
                            <Input
                                type="date"
                                className="h-9 text-xs font-bold border-slate-250 bg-white"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <Button
                            onClick={() => refreshItems(activeDesigner)}
                            className="h-9 font-black text-xs px-6 shadow-sm"
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <ListFilter className="h-3 w-3 mr-2" />}
                            FILTRAR
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Atalhos rápidos</label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[10px] font-bold border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                                onClick={() => {
                                    const today = getTodayStr();
                                    setStartDate(today);
                                    setEndDate(today);
                                    refreshItems(activeDesigner, false, { start: today, end: today });
                                }}
                            >
                                HOJE
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[10px] font-bold border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                                onClick={() => {
                                    const start = getDaysAgoStr(7);
                                    const end = getTodayStr();
                                    setStartDate(start);
                                    setEndDate(end);
                                    refreshItems(activeDesigner, false, { start, end });
                                }}
                            >
                                7 DIAS
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[10px] font-bold border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                                onClick={() => {
                                    const start = getDaysAgoStr(30);
                                    const end = getTodayStr();
                                    setStartDate(start);
                                    setEndDate(end);
                                    refreshItems(activeDesigner, false, { start, end });
                                }}
                            >
                                30 DIAS
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {designers.length === 0 ? (
                <Card className="p-8 text-center bg-muted/30 border-slate-200">
                    <p className="text-muted-foreground font-medium">Nenhum designer ativo encontrado no sistema.</p>
                </Card>
            ) : (
                <Tabs
                    value={activeDesigner}
                    onValueChange={setActiveDesigner}
                    className="w-full space-y-4"
                >
                    <TabsList className="w-full justify-start overflow-x-auto h-auto p-1.5 bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200/50 rounded-xl gap-1.5">
                        {designers.map((designer) => {
                            const initials = designer.nome
                                ? designer.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                                : 'DS';
                            const isActive = activeDesigner === designer.nome;
                            return (
                                <TabsTrigger
                                    key={designer.id}
                                    value={designer.nome}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold tracking-tight rounded-lg transition-all flex items-center gap-2",
                                        "data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 transition-colors",
                                        isActive ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                                    )}>
                                        {initials}
                                    </div>
                                    {designer.nome}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {designers.map((designer) => (
                        <TabsContent
                            key={designer.id}
                            value={designer.nome}
                            className="mt-0 focus-visible:outline-none h-[calc(100vh-250px)]"
                        >
                            <div className="h-full flex flex-col overflow-hidden">
                                {items.length === 0 ? (
                                    <div className="py-20 text-center border border-dashed rounded-xl bg-muted/10">
                                        <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-muted-foreground font-semibold text-sm italic">Nenhum pedido encontrado no período selecionado.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col lg:flex-row gap-5 flex-1 overflow-hidden pb-4">
                                            {/* Coluna Principal: Fila Operacional */}
                                            <div className="flex-[2.5] flex flex-col bg-slate-50/30 rounded-2xl border border-slate-200/50 overflow-hidden shadow-sm">
                                                <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-200/50 bg-slate-50/80 backdrop-blur-sm">
                                                    <h2 className="text-xs font-black flex items-center text-slate-700 uppercase tracking-widest leading-none">
                                                        Fila Operacional
                                                        <Badge variant="secondary" className="ml-2 bg-slate-200/70 text-slate-700 hover:bg-slate-200/70 border-none h-5 px-2 text-[10px] font-black">
                                                            {sortedPendentes.length}
                                                        </Badge>
                                                    </h2>
                                                </div>

                                                <ScrollArea className="flex-1 p-4">
                                                    <div className="space-y-3 pr-2">
                                                        {activeDesigner === designer.nome && sortedPendentes.map((item) => (
                                                            <CardArteDesigner
                                                                key={item.item_id}
                                                                item={item}
                                                                onToggleStatus={toggleStatusArte}
                                                                onOpen={() => setSelectedItem(item)}
                                                            />
                                                        ))}
                                                        {(activeDesigner !== designer.nome || sortedPendentes.length === 0) && (
                                                            <div className="text-center py-12 opacity-50">
                                                                <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                                                                <p className="text-xs font-semibold italic text-slate-500">Nenhuma arte pendente</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>

                                            {/* Coluna Secundária: Liberados */}
                                            <div className="flex-1 flex flex-col bg-slate-50/20 rounded-2xl border border-slate-200/40 overflow-hidden shadow-sm opacity-95">
                                                <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-200/40 bg-slate-50/50 backdrop-blur-sm">
                                                    <h2 className="text-xs font-black flex items-center text-green-600 uppercase tracking-widest leading-none">
                                                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                                        Liberados
                                                        <Badge variant="secondary" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50 border border-green-100 h-5 px-2 text-[10px] font-black">
                                                            {liberados.length}
                                                        </Badge>
                                                    </h2>
                                                </div>

                                                <ScrollArea className="flex-1 p-4">
                                                    <div className="space-y-3 pr-2">
                                                        {activeDesigner === designer.nome && liberados.map((item) => (
                                                            <CardArteDesigner
                                                                key={item.item_id}
                                                                item={item}
                                                                onToggleStatus={toggleStatusArte}
                                                                onOpen={() => setSelectedItem(item)}
                                                                compact
                                                            />
                                                        ))}
                                                        {(activeDesigner !== designer.nome || liberados.length === 0) && (
                                                            <div className="text-center py-12 opacity-50">
                                                                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-slate-350" />
                                                                <p className="text-xs font-semibold italic text-slate-400">Nenhuma arte liberada ainda</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>

                                        {hasMore && (
                                            <div className="flex justify-center py-2 shrink-0">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => refreshItems(activeDesigner, true)}
                                                    disabled={isRefreshing}
                                                    className="font-black text-[10px] h-8 gap-1.5 border-slate-200 shadow-sm hover:bg-slate-50 rounded-lg px-4"
                                                >
                                                    {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5 text-primary" />}
                                                    CARREGAR MAIS ARTES
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            )}

            {/* Modal de Detalhes da Arte */}
            <ModalDetalhesArte
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onPostComentario={handlePostComentario}
                onToggleStatus={toggleStatusArte}
            />
        </div>
    );
}

function CardArteDesigner({ item, onOpen, onToggleStatus, compact = false }: {
    item: DesignerArteItem,
    onOpen: () => void,
    onToggleStatus: (item: DesignerArteItem) => Promise<void>,
    compact?: boolean
}) {
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await onToggleStatus(item);
        } finally {
            setIsProcessing(false);
        }
    };

    const hasAnyFinishing = item.acabamento?.overloque ||
        item.acabamento?.elastico ||
        item.acabamento?.ilhos ||
        item.emenda ||
        item.ziper ||
        item.cordinha_extra ||
        item.alcinha;

    const getQuantidade = () => {
        const val = item.quantidade_paineis || item.quantidade_totem || item.quantidade_lona || item.quantidade_adesivo || '1';
        return `${val} un`;
    };

    const urgency = getUrgency(item.data_entrega);
    const urgencyText = getUrgencyText(urgency, item.data_entrega);

    const borderColors = {
        'ATRASADO': 'border-l-red-500',
        'HOJE': 'border-l-orange-500',
        'AMANHA': 'border-l-yellow-500',
        'FUTURO': 'border-l-slate-300',
        'SEM_DATA': 'border-l-slate-200'
    };

    const leftBorderClass = borderColors[urgency] || 'border-l-slate-200';

    return (
        <Card
            className={cn(
                "group relative cursor-pointer border-y border-r border-l-4 shadow-sm hover:shadow-md transition-all duration-200 bg-white mb-2 hover:translate-x-0.5 rounded-xl",
                leftBorderClass,
                item.prioridade === 'ALTA' ? "border-red-200 ring-1 ring-red-150" : "border-slate-100"
            )}
            onClick={onOpen}
        >
            <div className="p-3.5 space-y-3">
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase leading-none">
                            Pedido #{item.numero_pedido} · Item #{item.item_id}
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-snug truncate">
                            {item.cliente}
                        </h3>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                        {item.prioridade === 'ALTA' && (
                            <span className="bg-red-50 text-red-650 text-[8px] font-black rounded px-1.5 py-0.5 uppercase tracking-wider border border-red-100 animate-pulse">
                                URGENTE
                            </span>
                        )}
                        <span className={cn(
                            "text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                            urgency === 'ATRASADO' && "bg-red-50 text-red-600 border-red-100",
                            urgency === 'HOJE' && "bg-orange-50 text-orange-600 border-orange-100",
                            urgency === 'AMANHA' && "bg-yellow-50 text-yellow-600 border-yellow-100",
                            urgency === 'FUTURO' && "bg-slate-50 text-slate-650 border-slate-150",
                            urgency === 'SEM_DATA' && "bg-slate-50 text-slate-400 border-slate-150"
                        )}>
                            {urgencyText}
                        </span>
                    </div>
                </div>

                {/* Conteúdo Principal (Layout Horizontal com Imagem) */}
                <div className="flex gap-3">
                    {/* Imagem */}
                    <div className="w-16 h-16 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 relative group/img shadow-inner">
                        {item.imagem ? (
                            <>
                                <RemoteImage src={item.imagem} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply transition-transform duration-250 group-hover/img:scale-105" />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div 
                                            className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Eye className="text-white h-4 w-4 drop-shadow-md" />
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                        className="w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] p-1 border border-slate-200 shadow-2xl z-[100] rounded-xl bg-white"
                                        side="right"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <RemoteImage src={item.imagem} alt="" className="w-full h-full object-contain bg-slate-50 rounded-lg" />
                                    </PopoverContent>
                                </Popover>
                            </>
                        ) : (
                            <Package className="h-6 w-6 text-slate-300" />
                        )}
                    </div>

                    {/* Dados do Pedido */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                                    {item.tecido || 'LONA/ADESIVO'}
                                </span>
                                <span className="text-slate-350 text-[9px] font-light">•</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight bg-slate-100 px-1.5 py-0.5 rounded">
                                    {item.tipo_producao}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                                    <Maximize2 className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span>{item.largura || '-'}m × {item.altura || '-'}m</span>
                                </div>
                                <span className="text-slate-300 text-xs">•</span>
                                <div className="text-[11px] font-extrabold text-slate-700">
                                    {getQuantidade()}
                                </div>
                            </div>
                        </div>

                        {item.vendedor && (
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center mt-1">
                                Vendedor: <span className="text-slate-650 font-extrabold ml-1">{item.vendedor}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Acabamentos & Observação */}
                {(hasAnyFinishing || item.observacao || (item.comentarios && item.comentarios.length > 0)) && (
                    <div className="space-y-2 border-t border-slate-100/70 pt-2.5">
                        {/* Acabamentos */}
                        {hasAnyFinishing && !compact && (
                            <div className="flex flex-wrap gap-1">
                                {item.acabamento?.overloque && <span className="bg-slate-50 text-slate-650 text-[9px] font-bold border border-slate-200/50 rounded px-1.5 py-0.5 leading-none">OVERLOQUE</span>}
                                {item.acabamento?.elastico && <span className="bg-slate-50 text-slate-650 text-[9px] font-bold border border-slate-200/50 rounded px-1.5 py-0.5 leading-none">ELÁSTICO</span>}
                                {item.acabamento?.ilhos && <span className="bg-amber-50 text-amber-700 text-[9px] font-extrabold border border-amber-200/50 rounded px-1.5 py-0.5 leading-none">ILHÓS: {item.quantidade_ilhos}</span>}
                                {item.emenda && <span className="bg-blue-50 text-blue-700 text-[9px] font-extrabold border border-blue-200/50 rounded px-1.5 py-0.5 leading-none">EMENDA: {item.emenda_qtd}</span>}
                            </div>
                        )}

                        {/* Observação Técnica */}
                        {item.observacao && (
                            <div className="bg-red-50/60 border border-red-100 p-2 rounded-lg flex items-start gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-red-505 shrink-0 mt-0.5" />
                                <p className="text-[9px] font-extrabold text-red-700 leading-tight uppercase italic line-clamp-2">
                                    OBS: {item.observacao}
                                </p>
                            </div>
                        )}

                        {/* Comentários count indicator */}
                        {item.comentarios && item.comentarios.length > 0 && (
                            <div className="flex items-center gap-1 text-slate-400 font-bold text-[9px] leading-none">
                                <MessageSquare className="h-3 w-3" />
                                <span>{item.comentarios.length} {item.comentarios.length === 1 ? 'comentário' : 'comentários'}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Ações no Rodapé */}
            <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-900/10 border-t border-slate-100 rounded-b-xl flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                {item.status_arte === 'liberado' ? (
                    <>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold px-3 border-slate-200 hover:bg-slate-100 shadow-sm bg-white" onClick={onOpen}>
                            <Eye className="h-3 w-3 mr-1.5 text-slate-450" /> ABRIR
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-650 hover:bg-slate-200/50">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 font-bold text-xs p-1">
                                <DropdownMenuItem onClick={handleToggle} disabled={isProcessing} className="text-amber-600 cursor-pointer focus:bg-amber-50">
                                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Undo2 className="h-3 w-3 mr-2" />}
                                    Reverter status
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                ) : (
                    <>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold px-3 border-slate-200 bg-white hover:bg-slate-50 shadow-sm" onClick={onOpen}>
                            <Eye className="h-3 w-3 mr-1.5 text-slate-450" /> ABRIR
                        </Button>
                        <Button size="sm" className="h-7 text-[10px] font-black px-4 bg-green-600 hover:bg-green-700 text-white shadow-sm transition-transform active:scale-[0.98]" onClick={handleToggle} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Play className="h-3 w-3 mr-1.5" />}
                            LIBERAR
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
}

function ModalDetalhesArte({ item, onClose, onToggleStatus, onPostComentario }: {
    item: DesignerArteItem | null,
    onClose: () => void,
    onToggleStatus: (item: DesignerArteItem) => Promise<void>,
    onPostComentario: (itemId: number, texto: string) => Promise<boolean>
}) {
    const [newComment, setNewComment] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState('detalhes');

    useEffect(() => {
        if (item) setActiveTab('detalhes');
    }, [item]);

    // Auto-scroll para o fim dos comentários quando abrir ou mudar a aba
    useEffect(() => {
        if (activeTab === 'historico' && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [item?.comentarios, activeTab]);

    if (!item) return null;

    const handleSend = async () => {
        if (!newComment.trim() || isSending) return;
        setIsSending(true);
        const success = await onPostComentario(item.item_id, newComment.trim());
        if (success) {
            setNewComment('');
        }
        setIsSending(false);
    };

    const handleToggle = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await onToggleStatus(item);
            onClose();
        } finally {
            setIsProcessing(false);
        }
    };

    const hasAnyFinishing = item.acabamento?.overloque ||
        item.acabamento?.elastico ||
        item.acabamento?.ilhos ||
        item.emenda ||
        item.ziper ||
        item.cordinha_extra ||
        item.alcinha;

    const currentUser = useAuthStore.getState().username || 'Usuário';

    return (
        <Dialog open={!!item} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-0 gap-0 border rounded-lg shadow-xl bg-slate-50">
                {/* Header Compacto e Identificadores */}
                <DialogHeader className="p-4 border-b bg-white flex flex-row items-start justify-between shrink-0">
                    <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-500 tracking-tighter">P. #{item.numero_pedido}</span>
                            <span className="text-xs font-black text-slate-300">|</span>
                            <Badge variant="outline" className="text-[9px] h-5 border-primary/30 text-primary bg-white">{item.tipo_producao?.toUpperCase()}</Badge>
                            {item.prioridade === 'ALTA' && (
                                <Badge className="bg-red-600 text-white font-black text-[9px] h-5 animate-pulse border-none">URGENTE</Badge>
                            )}
                            <Badge className={cn("text-[9px] font-black uppercase rounded-sm border px-1.5 py-0.5 leading-none h-5", getUrgencyColors(getUrgency(item.data_entrega)))}>
                                {getUrgencyText(getUrgency(item.data_entrega), item.data_entrega)}
                            </Badge>
                            <Badge variant="secondary" className={cn(
                                "text-[9px] h-5 font-black uppercase border-none",
                                item.status_arte === 'liberado' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            )}>
                                STATUS: {item.status_arte}
                            </Badge>
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-900 leading-tight">
                            {item.cliente}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden w-full">
                    <div className="bg-white border-b px-4 shrink-0">
                        <TabsList className="h-10 bg-transparent p-0 space-x-4">
                            <TabsTrigger 
                                value="detalhes" 
                                className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold text-xs uppercase"
                            >
                                Detalhes Técnicos
                            </TabsTrigger>
                            <TabsTrigger 
                                value="historico" 
                                className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold text-xs uppercase flex items-center gap-2"
                            >
                                Histórico / Chat
                                {item.comentarios && item.comentarios.length > 0 && (
                                    <Badge className="bg-slate-200 text-slate-700 h-4 px-1 text-[9px]">{item.comentarios.length}</Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="detalhes" className="flex-1 overflow-hidden flex flex-col lg:flex-row m-0 border-none data-[state=inactive]:hidden">
                        {/* Lado Esquerdo: Imagem (Visualização técnica) */}
                        <div className="lg:w-[40%] bg-slate-100/50 p-4 flex flex-col gap-3 border-b lg:border-b-0 lg:border-r overflow-y-auto">
                            <div className="relative aspect-square bg-white rounded border flex items-center justify-center overflow-hidden">
                                {item.imagem ? (
                                    <RemoteImage
                                        src={item.imagem}
                                        alt={item.descricao || 'Arte'}
                                        className="w-full h-full object-contain p-2"
                                    />
                                ) : (
                                    <div className="text-slate-300 font-bold text-xs uppercase text-center p-4">Sem imagem de visualização</div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-[10px] font-bold text-slate-500 bg-white p-2 rounded border flex flex-col">
                                    <span className="text-[8px] uppercase text-slate-400">Vendedor</span>
                                    <span className="text-slate-700 truncate">{item.vendedor?.toUpperCase() || '-'}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 bg-white p-2 rounded border flex flex-col">
                                    <span className="text-[8px] uppercase text-slate-400">Item ID</span>
                                    <span className="text-slate-700">#{item.item_id}</span>
                                </div>
                            </div>
                        </div>

                        {/* Lado Direito: Dados Técnicos e Instruções */}
                        <div className="lg:w-[60%] flex flex-col h-full bg-white divide-y overflow-y-auto">
                            {/* 1. SEÇÃO DE INSTRUÇÕES */}
                            {(item.descricao || item.observacao) && (
                                <div className="p-5 bg-yellow-50/50 space-y-3 shrink-0">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ring-1 ring-slate-200 w-fit px-2 py-0.5 bg-white rounded shadow-sm">
                                        <FileText className="h-3 w-3" /> INSTRUÇÕES DO PEDIDO
                                    </h4>
                                    <div className="space-y-2">
                                        {item.descricao && (
                                            <div className="bg-white border-l-4 border-l-blue-500 p-3 text-sm font-bold text-slate-800 leading-snug shadow-sm">
                                                {item.descricao}
                                            </div>
                                        )}
                                        {item.observacao && (
                                            <div className="bg-red-600 text-white p-3 rounded-md shadow-lg border-2 border-red-800">
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase mb-1 drop-shadow-md">
                                                    <AlertTriangle className="h-4 w-4" /> ATENÇÃO: OBSERVAÇÃO TÉCNICA
                                                </div>
                                                <p className="text-sm font-black leading-tight">
                                                    {item.observacao}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 2. DADOS TÉCNICOS */}
                            <div className="p-5 space-y-5">
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="bg-slate-50 border rounded p-2">
                                        <span className="text-[8px] font-bold text-slate-400 block uppercase mb-1">Largura</span>
                                        <span className="text-lg font-black text-slate-900">{item.largura || '-'}m</span>
                                    </div>
                                    <div className="bg-slate-50 border rounded p-2">
                                        <span className="text-[8px] font-bold text-slate-400 block uppercase mb-1">Altura</span>
                                        <span className="text-lg font-black text-slate-900">{item.altura || '-'}m</span>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded p-2">
                                        <span className="text-[8px] font-bold text-blue-500 block uppercase mb-1">Área M²</span>
                                        <span className="text-lg font-black text-blue-700">{item.metro_quadrado || '-'}</span>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded p-2">
                                        <span className="text-[8px] font-bold text-amber-500 block uppercase mb-1">Qtd</span>
                                        <span className="text-lg font-black text-amber-700">
                                            {item.quantidade_paineis || item.quantidade_totem || item.quantidade_lona || item.quantidade_adesivo || '1'}un
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">MATERIAL BASE</span>
                                        <div className="bg-slate-900 text-white px-3 py-2 rounded font-black text-sm uppercase">
                                            {item.tecido || 'LONA / ADESIVO'}
                                        </div>
                                        {item.composicao_tecidos && (
                                            <div className="text-[10px] font-bold text-slate-500 italic mt-1">
                                                {item.composicao_tecidos}
                                            </div>
                                        )}
                                    </div>
                                    {hasAnyFinishing && (
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">ACABAMENTOS</span>
                                            <div className="flex flex-wrap gap-1">
                                                {item.acabamento?.overloque && (
                                                    <Badge className="bg-slate-200 text-slate-800 text-[9px] font-black border-none h-6">OVERLOQUE</Badge>
                                                )}
                                                {item.acabamento?.elastico && (
                                                    <Badge className="bg-slate-200 text-slate-800 text-[9px] font-black border-none h-6">ELÁSTICO</Badge>
                                                )}
                                                {item.acabamento?.ilhos && (
                                                    <Badge className="bg-amber-500 text-white text-[9px] font-black border-none h-6">ILHÓS: {item.quantidade_ilhos || 'S'}</Badge>
                                                )}
                                                {item.emenda && (
                                                    <Badge className="bg-blue-600 text-white text-[9px] font-black border-none h-6">EMENDA: {item.emenda_qtd || '1'}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="historico" className="flex-1 flex flex-col m-0 p-0 overflow-hidden bg-white data-[state=inactive]:hidden">
                        <div
                            ref={scrollRef}
                            className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/50"
                        >
                            {item.comentarios && item.comentarios.length > 0 ? (
                                item.comentarios.map((c) => {
                                    const isMe = c.autor === currentUser;
                                    return (
                                        <div key={c.id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                                            <div className="flex items-center gap-1.5 mb-1 px-1">
                                                <span className={cn("font-black tracking-tighter uppercase text-[9px]", isMe ? "text-primary" : "text-slate-500")}>
                                                    {c.autor}
                                                </span>
                                                <span className="text-slate-400 text-[8px] font-medium">
                                                    {new Date(c.data).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className={cn(
                                                "text-xs font-medium p-2.5 rounded-lg shadow-sm whitespace-pre-wrap",
                                                isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white border text-slate-800 rounded-tl-none"
                                            )}>
                                                {c.texto}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <MessageSquare className="h-10 w-10 mb-3" />
                                    <div className="text-xs font-bold uppercase tracking-widest">Sem histórico</div>
                                    <div className="text-[10px] mt-1">Nenhuma mensagem registrada neste item.</div>
                                </div>
                            )}
                        </div>

                        {/* Campo de Envio */}
                        <div className="p-4 border-t bg-white shrink-0">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Adicionar um comentário..."
                                    className="h-10 text-xs font-semibold focus-visible:ring-1 bg-slate-50"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <Button
                                    className="px-4 h-10 font-black text-xs"
                                    onClick={handleSend}
                                    disabled={!newComment.trim() || isSending}
                                >
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                    {isSending ? '' : 'ENVIAR'}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Footer de Ação Direta */}
                <div className="p-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
                    <div>
                        {item.status_arte === 'liberado' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="font-bold text-xs h-9 border-dashed text-slate-500">
                                        Mais ações...
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48 font-bold text-xs p-1">
                                    <DropdownMenuItem onClick={handleToggle} disabled={isProcessing} className="text-amber-600 cursor-pointer focus:bg-amber-50">
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Undo2 className="h-4 w-4 mr-2" />}
                                        Reverter para aguardando
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose} className="font-bold text-xs h-9 px-4 border-slate-300 bg-white">
                            FECHAR
                        </Button>
                        {item.status_arte !== 'liberado' && (
                            <Button
                                size="sm"
                                disabled={isProcessing}
                                className="font-black text-xs px-6 h-9 transition-all active:scale-95 shadow-md bg-green-600 hover:bg-green-700"
                                onClick={handleToggle}
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                )}
                                LIBERAR ARTE
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
