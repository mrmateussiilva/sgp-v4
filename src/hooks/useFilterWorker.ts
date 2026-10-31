import { useState, useEffect, useRef } from 'react';
import { OrderWithItems } from '../types';

export function useFilterWorker(orders: OrderWithItems[], filters: any) {
    const [filteredOrders, setFilteredOrders] = useState<OrderWithItems[]>([]);
    const [isFiltering, setIsFiltering] = useState(false);
    const workerRef = useRef<Worker | null>(null);
    const isFirstDispatchRef = useRef(true);

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

    // Aciona a repassagem de dados: imediata na montagem inicial e com debounce em mudanças subsequentes
    useEffect(() => {
        if (!workerRef.current) return;

        setIsFiltering(true);

        if (isFirstDispatchRef.current) {
            isFirstDispatchRef.current = false;
            workerRef.current.postMessage({
                orders,
                filters
            });
            return;
        }

        const timerId = setTimeout(() => {
            workerRef.current?.postMessage({
                orders,
                filters
            });
        }, 80);

        return () => clearTimeout(timerId);
    }, [orders, filters]);

    return { filteredOrders, isFiltering };
}
