import { useState, useEffect, useRef } from 'react';
import { OrderWithItems } from '../types';

export function useFilterWorker(orders: OrderWithItems[], filters: any) {
    const [filteredOrders, setFilteredOrders] = useState<OrderWithItems[]>([]);
    const [isFiltering, setIsFiltering] = useState(false);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Inicializa o instanciamento do Worker uma unica vez por componente montado
        workerRef.current = new Worker(new URL('../workers/orderFilter.worker.ts', import.meta.url), {
            type: 'module',
        });

        workerRef.current.onmessage = (e) => {
            setFilteredOrders(e.data.filteredOrders);
            setIsFiltering(false);
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // Aciona a repassagem de dados de forma assincrona quando as condicoes mudam
    useEffect(() => {
        if (workerRef.current) {
            setIsFiltering(true);
            workerRef.current.postMessage({
                orders,
                filters
            });
        }
    }, [orders, filters]);

    return { filteredOrders, isFiltering };
}
