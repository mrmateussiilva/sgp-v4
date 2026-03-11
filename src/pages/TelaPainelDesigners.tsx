import { useState, useEffect, useCallback, useRef } from 'react';
import { designersApi } from '@/api/endpoints/designers';
import { RemoteImage } from '@/components/RemoteImage';
import { DesignerArteItem } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Loader2, RefreshCw, Clock, Package, CheckCircle2, Circle,
    Maximize2, FileText, AlertTriangle,
    MessageSquare, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

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
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
        }).format(date);
    } catch (e) {
        return '-';
    }
};

export default function TelaPainelDesigners() {
    const [designers, setDesigners] = useState<{ id: number; nome: string }[]>([]);
    const [activeDesigner, setActiveDesigner] = useState<string>('');
    const [items, setItems] = useState<DesignerArteItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<DesignerArteItem | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    const toggleStatusArte = async (item: DesignerArteItem) => {
        const newStatus = item.status_arte === 'liberado' ? 'aguardando' : 'liberado';
        try {
            await designersApi.patchStatusArte(item.item_id, newStatus);

            setItems(prev => prev.map(i =>
                i.item_id === item.item_id ? { ...i, status_arte: newStatus } : i
            ));

            toast({
                title: newStatus === 'liberado' ? 'Arte liberada!' : 'Arte aguardando',
                description: newStatus === 'liberado' ? 'A arte foi movida para a coluna de liberados.' : 'A arte voltou para a fila de espera.',
            });
        } catch (error) {
            console.error('Erro ao atualizar status da arte:', error);
            toast({
                title: 'Erro ao atualizar',
                description: 'Não foi possível mudar o status da arte.',
                variant: 'destructive',
            });
        }
    };

    const handlePostComentario = async (itemId: number, texto: string) => {
        const username = useAuthStore.getState().username;
        const autor = username || 'Usuário';

        try {
            const updatedItem = await designersApi.postComentario(itemId, texto, autor);

            // Atualizar na lista local
            setItems(prev => prev.map(i => i.item_id === itemId ? updatedItem : i));

            // Se modal aberto, atualizar item selecionado
            if (selectedItem?.item_id === itemId) {
                setSelectedItem(updatedItem);
            }

            return true;
        } catch (error) {
            console.error('Erro ao postar comentário:', error);
            toast({
                title: 'Erro ao enviar',
                description: 'Não foi possível salvar seu comentário.',
                variant: 'destructive',
            });
            return false;
        }
    };

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const activeDesigners = await designersApi.getDesignersAtivos();
            setDesigners(activeDesigners);
            if (activeDesigners.length > 0) {
                setActiveDesigner(activeDesigners[0].nome);
            }
        } catch (error) {
            console.error('Erro ao buscar designers:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refreshItems = useCallback(async (designerName: string) => {
        if (!designerName) return;
        setIsRefreshing(true);
        try {
            const designerItems = await designersApi.getItensPorDesigner(designerName);
            setItems(designerItems);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Erro ao buscar itens do designer:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (activeDesigner) {
            refreshItems(activeDesigner);
        }
    }, [activeDesigner, refreshItems]);

    // Polling a cada 30 segundos
    useEffect(() => {
        if (autoRefreshEnabled && activeDesigner) {
            timerRef.current = setInterval(() => {
                refreshItems(activeDesigner);
            }, 30000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [autoRefreshEnabled, activeDesigner, refreshItems]);

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Painel de Designers</h1>
                    <p className="text-muted-foreground">Visualize e gerencie as artes atribuídas a cada designer.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground flex items-center justify-end">
                            <Clock className="h-3 w-3 mr-1" />
                            Atualizado às {formatTime(lastUpdated)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                            {autoRefreshEnabled ? 'Atualização automática ligada' : 'Atualização automática desligada'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshItems(activeDesigner)}
                        disabled={isRefreshing}
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
                            "text-xs h-8",
                            autoRefreshEnabled ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        )}
                    >
                        {autoRefreshEnabled ? 'AUTO ON' : 'AUTO OFF'}
                    </Button>
                </div>
            </div>

            {designers.length === 0 ? (
                <Card className="p-8 text-center bg-muted/50">
                    <p className="text-muted-foreground">Nenhum designer ativo encontrado no sistema.</p>
                </Card>
            ) : (
                <Tabs
                    value={activeDesigner}
                    onValueChange={setActiveDesigner}
                    className="w-full"
                >
                    <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/40">
                        {designers.map((designer) => (
                            <TabsTrigger
                                key={designer.id}
                                value={designer.nome}
                                className="px-4 py-2"
                            >
                                {designer.nome}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {designers.map((designer) => (
                        <TabsContent
                            key={designer.id}
                            value={designer.nome}
                            className="mt-6 focus-visible:outline-none h-[calc(100vh-230px)]"
                        >
                            <div className="h-full overflow-hidden">
                                {items.length === 0 ? (
                                    <div className="py-20 text-center border-2 border-dashed rounded-lg bg-muted/20">
                                        <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                        <p className="text-muted-foreground font-medium italic">Nenhuma arte atribuída a {designer.nome} no momento.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden pb-4">
                                        {/* Coluna: Aguardando Liberação */}
                                        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm">
                                            <div className="p-4 flex items-center justify-between bg-white/50 dark:bg-black/10 border-b border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
                                                <h2 className="text-xs font-bold flex items-center text-amber-600 uppercase tracking-widest leading-none">
                                                    <Circle className="h-4 w-4 mr-2" />
                                                    Aguardando
                                                    <Badge variant="secondary" className="ml-2 bg-amber-100/50 text-amber-700 hover:bg-amber-100/50 border-none h-5 px-1.5 text-[10px]">
                                                        {activeDesigner === designer.nome ? items.filter(i => i.status_arte !== 'liberado').length : 0}
                                                    </Badge>
                                                </h2>
                                            </div>

                                            <ScrollArea className="flex-1 p-4">
                                                <div className="space-y-4 pr-3">
                                                    {activeDesigner === designer.nome && items.filter(i => i.status_arte !== 'liberado').map((item) => (
                                                        <CardArteDesigner
                                                            key={item.item_id}
                                                            item={item}
                                                            onToggleStatus={() => toggleStatusArte(item)}
                                                            onOpen={() => setSelectedItem(item)}
                                                        />
                                                    ))}
                                                    {(activeDesigner !== designer.nome || items.filter(i => i.status_arte !== 'liberado').length === 0) && (
                                                        <div className="text-center py-12 opacity-40">
                                                            <Package className="h-8 w-8 mx-auto mb-2" />
                                                            <p className="text-xs italic">Nenhuma arte pendente</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>

                                        {/* Coluna: Liberado */}
                                        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm">
                                            <div className="p-4 flex items-center justify-between bg-white/50 dark:bg-black/10 border-b border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
                                                <h2 className="text-xs font-bold flex items-center text-green-600 uppercase tracking-widest leading-none">
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Liberado
                                                    <Badge variant="secondary" className="ml-2 bg-green-100/50 text-green-700 hover:bg-green-100/50 border-none h-5 px-1.5 text-[10px]">
                                                        {items.filter(i => i.status_arte === 'liberado').length}
                                                    </Badge>
                                                </h2>
                                            </div>

                                            <ScrollArea className="flex-1 p-4">
                                                <div className="space-y-4 pr-3">
                                                    {activeDesigner === designer.nome && items.filter(i => i.status_arte === 'liberado').map((item) => (
                                                        <CardArteDesigner
                                                            key={item.item_id}
                                                            item={item}
                                                            onToggleStatus={() => toggleStatusArte(item)}
                                                            onOpen={() => setSelectedItem(item)}
                                                        />
                                                    ))}
                                                    {(activeDesigner !== designer.nome || items.filter(i => i.status_arte === 'liberado').length === 0) && (
                                                        <div className="text-center py-12 opacity-40">
                                                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                                            <p className="text-xs italic">Nada liberado ainda</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
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
                onToggleStatus={() => {
                    if (selectedItem) {
                        toggleStatusArte(selectedItem);
                        setSelectedItem(null);
                    }
                }}
            />
        </div>
    );
}

function CardArteDesigner({ item, onOpen, onToggleStatus }: {
    item: DesignerArteItem,
    onOpen: () => void,
    onToggleStatus: () => void
}) {
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

    return (
        <Card
            className={cn(
                "group cursor-pointer border-none shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white mb-3",
                item.prioridade === 'ALTA' && "ring-1 ring-red-500/30"
            )}
            onClick={onOpen}
        >
            {/* Top Bar: IDs e Status */}
            <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">#{item.numero_pedido}</span>
                    {item.prioridade === 'ALTA' && (
                        <span className="text-[9px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded animate-pulse">URGENTE</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {item.comentarios && item.comentarios.length > 0 && (
                        <div className="flex items-center gap-0.5 text-blue-500 font-bold text-[10px]">
                            <MessageSquare className="h-3 w-3" />
                            {item.comentarios.length}
                        </div>
                    )}
                    <div
                        className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center border transition-colors",
                            item.status_arte === 'liberado' ? "bg-green-600 border-green-700 text-white" : "bg-white border-amber-300 text-amber-500"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus();
                        }}
                    >
                        {item.status_arte === 'liberado' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                    </div>
                </div>
            </div>

            <div className="flex gap-3 p-3">
                {/* Lado A: Imagem Compacta */}
                <div className="w-24 h-24 bg-slate-100 rounded border flex items-center justify-center overflow-hidden shrink-0">
                    {item.imagem ? (
                        <RemoteImage src={item.imagem} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" />
                    ) : (
                        <Package className="h-8 w-8 text-slate-300" />
                    )}
                </div>

                {/* Lado B: Dados Principais */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                    <div className="flex items-start justify-between">
                        <h3 className="font-black text-sm text-slate-800 leading-none truncate flex-1 pr-2">
                            {item.cliente}
                        </h3>
                        {item.vendedor && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{item.vendedor}</span>
                        )}
                    </div>

                    {/* Dimensões em Linha (Glanceable) */}
                    <div className="flex items-center gap-2 text-slate-900">
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded">
                            <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm font-black tracking-tight leading-none">
                                {item.largura || '-'}m <span className="text-slate-400 font-bold">x</span> {item.altura || '-'}m
                            </span>
                        </div>
                        <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded font-black text-xs leading-none">
                            {getQuantidade()}
                        </div>
                    </div>

                    {/* Material e Tipo */}
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] h-4 border-slate-200 text-slate-500 font-black px-1.5 uppercase leading-none">
                            {item.tipo_producao}
                        </Badge>
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter truncate">
                            {item.tecido || 'LONA/ADESIVO'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Acabamentos e Crítico */}
            <div className="px-3 pb-3 space-y-2">
                {hasAnyFinishing && (
                    <div className="flex flex-wrap gap-1 border-t pt-2">
                        {item.acabamento?.overloque && <Badge className="bg-slate-100 text-slate-600 text-[9px] font-bold border-none h-4 px-1.5">OVERLOQUE</Badge>}
                        {item.acabamento?.elastico && <Badge className="bg-slate-100 text-slate-600 text-[9px] font-bold border-none h-4 px-1.5">ELÁSTICO</Badge>}
                        {item.acabamento?.ilhos && <Badge className="bg-amber-500 text-white text-[9px] font-black border-none h-4 px-1.5">ILHÓS: {item.quantidade_ilhos}</Badge>}
                        {item.emenda && <Badge className="bg-blue-600 text-white text-[9px] font-black border-none h-4 px-1.5">EMENDA: {item.emenda_qtd}</Badge>}
                    </div>
                )}

                {/* OBSERVAÇÃO TÉCNICA (DESTAQUE MÁXIMO) */}
                {item.observacao && (
                    <div className="bg-red-50 border border-red-100 p-2 rounded flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-black text-red-700 leading-tight uppercase italic">
                            OBS: {item.observacao}
                        </p>
                    </div>
                )}

                {/* Rodapé Interno */}
                <div className="flex items-center justify-between pt-1 text-[10px] font-bold">
                    <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        ENTREGA:
                    </div>
                    <span className={cn(
                        "font-black",
                        item.data_entrega && new Date(item.data_entrega) < new Date() ? "text-red-500" : "text-slate-600"
                    )}>
                        {formatDate(item.data_entrega || '')}
                    </span>
                </div>
            </div>
        </Card>
    );
}

function ModalDetalhesArte({ item, onClose, onToggleStatus, onPostComentario }: {
    item: DesignerArteItem | null,
    onClose: () => void,
    onToggleStatus: () => void,
    onPostComentario: (itemId: number, texto: string) => Promise<boolean>
}) {
    const [newComment, setNewComment] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll para o fim dos comentários quando abrir ou mudar
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [item?.comentarios]);

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
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 border rounded-lg shadow-xl bg-white">
                {/* Header Compacto e Identificadores */}
                <DialogHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-500 tracking-tighter">#{item.numero_pedido}</span>
                            <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary bg-white">{item.tipo_producao?.toUpperCase()}</Badge>
                            {item.prioridade === 'ALTA' && (
                                <Badge className="bg-red-600 text-white font-black text-[10px] h-5 animate-pulse">URGENTE</Badge>
                            )}
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-900 leading-tight">
                            {item.cliente}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Lado Esquerdo: Imagem (Visualização técnica) */}
                    <div className="lg:w-[40%] bg-slate-100 p-4 flex flex-col gap-3 border-b lg:border-b-0 lg:border-r overflow-y-auto">
                        <div className="relative aspect-square bg-white rounded border flex items-center justify-center overflow-hidden group">
                            {item.imagem ? (
                                <>
                                    <RemoteImage
                                        src={item.imagem}
                                        alt={item.descricao || 'Arte'}
                                        className="w-full h-full object-contain p-2"
                                    />
                                    <div className="absolute top-2 right-2">
                                        <a
                                            href={item.imagem}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white/90 p-1.5 rounded border shadow-sm hover:bg-primary hover:text-white transition-colors block"
                                            title="Tamanho real"
                                        >
                                            <Maximize2 className="h-4 w-4" />
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <div className="text-slate-300 font-bold text-xs uppercase text-center p-4">Sem imagem de visualização</div>
                            )}
                        </div>

                        {/* Informação secundária */}
                        <div className="text-[10px] font-bold text-slate-500 bg-white/50 p-2 rounded border border-dashed flex items-center justify-between">
                            <span>VENDEDOR: {item.vendedor?.toUpperCase() || '-'}</span>
                            <span>ITEM ID: {item.item_id}</span>
                        </div>
                    </div>

                    {/* Lado Direito: Dados Técnicos e Instruções (Prioridade Máxima) */}
                    <div className="lg:w-[60%] flex flex-col h-full bg-white divide-y overflow-y-auto">

                        {/* 1. SEÇÃO DE INSTRUÇÕES (DESTAQUE NO TOPO) */}
                        {(item.descricao || item.observacao) && (
                            <div className="p-5 bg-yellow-50/50 space-y-3">
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

                        {/* 2. DADOS TÉCNICOS (GRID DENSO) */}
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

                        {/* 3. CHAT SIMPLIFICADO (ESTILO LOG) */}
                        <div className="flex-1 flex flex-col min-h-[300px]">
                            <div className="px-5 py-2 bg-slate-50 border-y flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chat / Histórico</span>
                                <MessageSquare className="h-3 w-3 text-slate-300" />
                            </div>

                            <div
                                ref={scrollRef}
                                className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[300px] bg-slate-50/30"
                            >
                                {item.comentarios && item.comentarios.length > 0 ? (
                                    item.comentarios.map((c) => {
                                        const isMe = c.autor === currentUser;
                                        return (
                                            <div key={c.id} className="text-xs leading-relaxed border-b border-slate-100 last:border-none pb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("font-black tracking-tighter uppercase text-[9px]", isMe ? "text-primary" : "text-slate-500")}>
                                                        {c.autor}:
                                                    </span>
                                                    <span className="text-slate-400 text-[8px] font-medium">
                                                        {new Date(c.data).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="text-slate-700 font-medium pl-2 border-l-2 border-slate-200 mt-0.5">
                                                    {c.texto}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-full flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase italic tracking-widest">
                                        Nenhuma mensagem
                                    </div>
                                )}
                            </div>

                            {/* Campo de Envio Compacto */}
                            <div className="p-3 border-t bg-white">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enviar mensagem..."
                                        className="h-9 text-xs font-semibold focus-visible:ring-1"
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
                                        size="sm"
                                        className="px-3"
                                        onClick={handleSend}
                                        disabled={!newComment.trim() || isSending}
                                    >
                                        {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer de Ação Direta */}
                <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">Entrega:</span>
                        <span className={cn(
                            "text-sm font-black",
                            item.data_entrega && new Date(item.data_entrega) < new Date() ? "text-red-600" : "text-slate-700"
                        )}>
                            {formatDate(item.data_entrega || '')}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose} className="font-bold text-xs h-9 px-4">
                            FECHAR [ESC]
                        </Button>
                        <Button
                            size="sm"
                            className={cn(
                                "font-black text-xs px-6 h-9 transition-all active:scale-95 shadow-md",
                                item.status_arte === 'liberado'
                                    ? "bg-amber-500 hover:bg-amber-600"
                                    : "bg-green-600 hover:bg-green-700"
                            )}
                            onClick={onToggleStatus}
                        >
                            {item.status_arte === 'liberado' ? (
                                <>REVERTER STATUS</>
                            ) : (
                                <><CheckCircle2 className="h-4 w-4 mr-2" /> CONCLUIR E LIBERAR</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

