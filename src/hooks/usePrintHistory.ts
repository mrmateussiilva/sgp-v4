import { useState, useEffect, useCallback } from 'react';
import { printLogsApi } from '../api/endpoints/printLogs';
import { PrintLog } from '../types';
import { logger } from '../utils/logger';

export function usePrintHistory(orderId: number | null) {
    const [lastPrint, setLastPrint] = useState<PrintLog | null>(null);
    const [alreadyPrinted, setAlreadyPrinted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const checkHistory = useCallback(async () => {
        if (!orderId) return;

        setIsLoading(true);
        try {
            // Como não temos um endpoint direto por pedido, pegamos os logs recentes
            // e filtramos. Aumentamos o limite para garantir que pegamos o log se existir.
            const logs = await printLogsApi.getAllLogs(2000);

            const orderLogs = logs.filter(log => log.pedido_id === orderId);

            if (orderLogs.length > 0) {
                // Ordenar por data decrescente (o mais recente primeiro)
                const sortedLogs = orderLogs.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                setLastPrint(sortedLogs[0]);
                setAlreadyPrinted(true);
            } else {
                setLastPrint(null);
                setAlreadyPrinted(false);
            }
        } catch (error) {
            logger.error(`[usePrintHistory] Erro ao buscar histórico para pedido ${orderId}:`, error);
        } finally {
            setIsLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        if (orderId) {
            checkHistory();
        } else {
            setLastPrint(null);
            setAlreadyPrinted(false);
        }
    }, [orderId, checkHistory]);

    return {
        lastPrint,
        alreadyPrinted,
        isLoading,
        refreshHistory: checkHistory
    };
}
