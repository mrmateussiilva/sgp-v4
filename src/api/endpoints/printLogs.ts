import { apiClient } from '../client';
import { PrintLog, PrintLogCreate, PrintLogStatus, PrinterStats } from '@/types';

export const printLogsApi = {
    async getPrinterLogs(
        printerId: number,
        limit: number = 50,
        offset: number = 0,
        statusFilter?: PrintLogStatus
    ): Promise<PrintLog[]> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
        });

        if (statusFilter) {
            params.append('status_filter', statusFilter);
        }

        const response = await apiClient.get<PrintLog[]>(
            `/print-logs/printers/${printerId}?${params.toString()}`
        );
        return response.data;
    },

    async createPrintLog(logData: PrintLogCreate): Promise<PrintLog> {
        const response = await apiClient.post<PrintLog>('/print-logs/', logData);
        return response.data;
    },

    async getPrinterStats(printerId: number): Promise<PrinterStats> {
        const response = await apiClient.get<PrinterStats>(`/print-logs/stats/${printerId}`);
        return response.data;
    },
};
