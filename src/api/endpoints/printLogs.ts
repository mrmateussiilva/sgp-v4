import { apiClient } from '../client';
import { PrintLog, PrintLogCreate, PrintLogStatus, PrinterStats } from '@/types';

const ALL_LOGS_CACHE_TTL_MS = 45_000;
let allLogsCache: { key: string; data: PrintLog[]; timestamp: number } | null = null;
let inFlightAllLogs: { key: string; promise: Promise<PrintLog[]> } | null = null;

export const printLogsApi = {
    async getPrinterLogs(
        printerId: number,
        limit: number = 1000,
        offset: number = 0,
        statusFilter?: PrintLogStatus,
        dataInicio?: string,
        dataFim?: string
    ): Promise<PrintLog[]> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
        });

        if (statusFilter) {
            params.append('status_filter', statusFilter);
        }

        if (dataInicio) {
            params.append('data_inicio', dataInicio);
        }

        if (dataFim) {
            params.append('data_fim', dataFim);
        }

        const response = await apiClient.get<PrintLog[]>(
            `/print-logs/printers/${printerId}?${params.toString()}`
        );
        return response.data;
    },

    async getAllLogs(
        limit: number = 1000,
        offset: number = 0,
        statusFilter?: PrintLogStatus,
        dataInicio?: string,
        dataFim?: string
    ): Promise<PrintLog[]> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
        });

        if (statusFilter) {
            params.append('status_filter', statusFilter);
        }

        if (dataInicio) {
            params.append('data_inicio', dataInicio);
        }

        if (dataFim) {
            params.append('data_fim', dataFim);
        }

        const cacheKey = params.toString();

        if (
            allLogsCache &&
            allLogsCache.key === cacheKey &&
            Date.now() - allLogsCache.timestamp < ALL_LOGS_CACHE_TTL_MS
        ) {
            return allLogsCache.data;
        }

        if (inFlightAllLogs && inFlightAllLogs.key === cacheKey) {
            return inFlightAllLogs.promise;
        }

        const promise = (async () => {
            try {
                const response = await apiClient.get<PrintLog[]>(
                    `/print-logs/?${cacheKey}`
                );
                const data = response.data ?? [];
                allLogsCache = { key: cacheKey, data, timestamp: Date.now() };
                return data;
            } finally {
                if (inFlightAllLogs?.key === cacheKey) {
                    inFlightAllLogs = null;
                }
            }
        })();

        inFlightAllLogs = { key: cacheKey, promise };
        return promise;
    },

    async createPrintLog(logData: PrintLogCreate): Promise<PrintLog> {
        const response = await apiClient.post<PrintLog>('/print-logs/', logData);
        allLogsCache = null;
        return response.data;
    },

    async getPrinterStats(printerId: number): Promise<PrinterStats> {
        const response = await apiClient.get<PrinterStats>(`/print-logs/stats/${printerId}`);
        return response.data;
    },
};
