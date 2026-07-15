import { useState, useEffect, useCallback, useRef } from 'react';
import { designersApi } from '@/api/endpoints/designers';
import { DesignerArteItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

const LIMIT = 50;

export function useDesignerPanel() {
    const [designers, setDesigners] = useState<{ id: number; nome: string }[]>([]);
    const [activeDesigner, setActiveDesigner] = useState<string>('');
    const [items, setItems] = useState<DesignerArteItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<DesignerArteItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    const getTodayStr = () => new Date().toISOString().split('T')[0];
    const getDaysAgoStr = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState<string>(getDaysAgoStr(7));
    const [endDate, setEndDate] = useState<string>(getTodayStr());
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const { toast } = useToast();

    // Referências para manter valores atualizados sem disparar recriação de callbacks estáveis
    const offsetRef = useRef(offset);
    const startDateRef = useRef(startDate);
    const endDateRef = useRef(endDate);
    const itemsRef = useRef(items);
    const isRefreshingRef = useRef(isRefreshing);

    useEffect(() => { offsetRef.current = offset; }, [offset]);
    useEffect(() => { startDateRef.current = startDate; }, [startDate]);
    useEffect(() => { endDateRef.current = endDate; }, [endDate]);
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { isRefreshingRef.current = isRefreshing; }, [isRefreshing]);

    // Busca inicial de designers ativos
    useEffect(() => {
        let isMounted = true;
        async function fetchDesigners() {
            setIsLoading(true);
            try {
                const activeDesigners = await designersApi.getDesignersAtivos();
                if (isMounted) {
                    setDesigners(activeDesigners);
                    if (activeDesigners.length > 0) {
                        setActiveDesigner(activeDesigners[0].nome);
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar designers:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchDesigners();
        return () => { isMounted = false; };
    }, []);

    // Callback de atualização estável (sem dependência de offset, startDate ou endDate que causam loop)
    const refreshItems = useCallback(async (
        designerName: string,
        isLoadMore = false,
        dateOverrides?: { start?: string; end?: string }
    ) => {
        if (!designerName || isRefreshingRef.current) return;

        const currentOffset = isLoadMore ? offsetRef.current + LIMIT : 0;
        const sDate = dateOverrides?.start ?? startDateRef.current;
        const eDate = dateOverrides?.end ?? endDateRef.current;

        setIsRefreshing(true);
        try {
            const designerItems = await designersApi.getItensPorDesigner(designerName, {
                start_date: sDate,
                end_date: eDate,
                limit: LIMIT,
                offset: currentOffset,
            });

            if (isLoadMore) {
                setItems(prev => {
                    const existingIds = new Set(prev.map(i => i.item_id));
                    const filteredNew = designerItems.filter(i => !existingIds.has(i.item_id));
                    return [...prev, ...filteredNew];
                });
                setOffset(currentOffset);
            } else {
                setItems(prev => {
                    // Correção defensiva para o Bug 1: preservar o status local temporariamente
                    // caso o backend ainda não tenha retornado a alteração
                    const localStatusMap = new Map(prev.map(i => [i.item_id, i.status_arte]));
                    return designerItems.map(item => ({
                        ...item,
                        status_arte: localStatusMap.get(item.item_id) ?? item.status_arte
                    }));
                });
                setOffset(0);
            }

            setHasMore(designerItems.length === LIMIT);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Erro ao buscar itens do designer:', error);
            toast({
                title: 'Erro ao carregar',
                description: 'Não foi possível buscar as artes.',
                variant: 'destructive'
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [toast]);

    // Busca itens quando activeDesigner muda
    useEffect(() => {
        if (activeDesigner) {
            refreshItems(activeDesigner, false);
        }
    }, [activeDesigner, refreshItems]);

    // Polling a cada 30 segundos
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (autoRefreshEnabled && activeDesigner) {
            timer = setInterval(() => {
                refreshItems(activeDesigner, false);
            }, 30000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [autoRefreshEnabled, activeDesigner, refreshItems]);

    // Atualização otimista com rollback
    const toggleStatusArte = async (item: DesignerArteItem) => {
        const newStatus = item.status_arte === 'liberado' ? 'aguardando' : 'liberado';
        
        // Atualiza imediatamente local
        setItems(prev => prev.map(i =>
            i.item_id === item.item_id ? { ...i, status_arte: newStatus } : i
        ));
        
        // Atualiza se estiver aberto no modal
        setSelectedItem(prev => prev?.item_id === item.item_id ? { ...prev, status_arte: newStatus } : prev);

        try {
            await designersApi.patchStatusArte(item.item_id, newStatus);
            toast({
                title: newStatus === 'liberado' ? 'Arte liberada!' : 'Arte aguardando',
                description: newStatus === 'liberado' ? 'A arte foi movida para a coluna de liberados.' : 'A arte voltou para a fila de espera.',
            });
        } catch (error) {
            console.error('Erro ao atualizar status da arte:', error);
            // Rollback em caso de falha
            setItems(prev => prev.map(i =>
                i.item_id === item.item_id ? { ...i, status_arte: item.status_arte } : i
            ));
            setSelectedItem(prev => prev?.item_id === item.item_id ? { ...prev, status_arte: item.status_arte } : prev);
            
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
            setItems(prev => prev.map(i => i.item_id === itemId ? updatedItem : i));
            setSelectedItem(prev => prev?.item_id === itemId ? updatedItem : prev);
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

    return {
        designers,
        activeDesigner,
        setActiveDesigner,
        items,
        setItems,
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
        getTodayStr,
        getDaysAgoStr,
        LIMIT
    };
}
