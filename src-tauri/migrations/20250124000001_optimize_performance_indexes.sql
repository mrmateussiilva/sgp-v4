-- Otimização crítica de performance para SGP v4
-- Esta migração adiciona índices compostos específicos para as consultas mais lentas

-- Índice composto otimizado para consulta de pedidos pendentes
-- Esta é a consulta mais crítica que estava levando 2-8 segundos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_pending_optimized 
ON orders (pronto, created_at DESC) 
WHERE pronto IS NULL OR pronto = false;

-- Índice composto para pedidos prontos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_ready_optimized 
ON orders (pronto, created_at DESC) 
WHERE pronto = true;

-- Índice otimizado para order_items com order_id (usado em WHERE order_id = ANY($1))
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id_optimized 
ON order_items (order_id, id);

-- Índice para consultas por data de entrega
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_delivery_date_optimized 
ON orders (data_entrega, forma_envio, cliente) 
WHERE data_entrega IS NOT NULL;

-- Índice para filtros combinados (status + cliente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_cliente_optimized 
ON orders (status, cliente, created_at DESC);

-- Atualizar estatísticas do banco para otimizar o planejador de consultas
ANALYZE orders;
ANALYZE order_items;

-- Verificar se os índices foram criados corretamente
DO $$
BEGIN
    -- Log dos índices criados
    RAISE NOTICE 'Índices de performance criados com sucesso:';
    RAISE NOTICE '- idx_orders_pending_optimized: Para consultas de pedidos pendentes';
    RAISE NOTICE '- idx_orders_ready_optimized: Para consultas de pedidos prontos';
    RAISE NOTICE '- idx_order_items_order_id_optimized: Para consultas de itens por pedido';
    RAISE NOTICE '- idx_orders_delivery_date_optimized: Para consultas por data de entrega';
    RAISE NOTICE '- idx_orders_status_cliente_optimized: Para filtros combinados';
END $$;

