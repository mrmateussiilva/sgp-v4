import { PrintLogCreate, PrintLogStatus, OrderWithItems } from '@/types';
import { printLogsApi } from '@/api/endpoints/printLogs';
import { logger } from '@/utils/logger';

export const buildPrintLogPayloads = (
    orders: OrderWithItems[],
    status: PrintLogStatus,
    errorMessage?: string
): PrintLogCreate[] => {
    const payloads: PrintLogCreate[] = [];
    const normalizedError = status === PrintLogStatus.ERROR ? (errorMessage || 'Falha ao imprimir') : null;

    for (const order of orders) {
        if (!order?.items?.length) continue;
        for (const item of order.items) {
            const printerId = item.machine_id;
            if (typeof printerId !== 'number' || Number.isNaN(printerId)) {
                continue;
            }
            payloads.push({
                printer_id: printerId,
                pedido_id: order.id,
                item_id: item.id ?? null,
                status,
                error_message: normalizedError,
            });
        }
    }

    return payloads;
};

export const logPrintForOrders = async (
    orders: OrderWithItems[],
    status: PrintLogStatus,
    errorMessage?: string
): Promise<void> => {
    const payloads = buildPrintLogPayloads(orders, status, errorMessage);

    if (payloads.length === 0) {
        logger.debug('[printLogs] Nenhum item com machine_id para registrar.');
        return;
    }

    const results = await Promise.allSettled(
        payloads.map((payload) => printLogsApi.createPrintLog(payload))
    );
    const failures = results.filter((result) => result.status === 'rejected');

    if (failures.length > 0) {
        logger.warn('[printLogs] Falha ao criar logs de impressão:', {
            total: payloads.length,
            failed: failures.length,
        });
    } else {
        logger.debug('[printLogs] Logs de impressão criados com sucesso.', {
            total: payloads.length,
        });
    }
};
