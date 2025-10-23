-- Performance optimization indexes for SGP v4
-- This migration adds critical indexes to improve query performance

-- Indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_pronto ON orders (pronto);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_data_entrega ON orders (data_entrega);
CREATE INDEX IF NOT EXISTS idx_orders_cliente ON orders (cliente);
CREATE INDEX IF NOT EXISTS idx_orders_financeiro ON orders (financeiro);
CREATE INDEX IF NOT EXISTS idx_orders_conferencia ON orders (conferencia);
CREATE INDEX IF NOT EXISTS idx_orders_sublimacao ON orders (sublimacao);
CREATE INDEX IF NOT EXISTS idx_orders_costura ON orders (costura);
CREATE INDEX IF NOT EXISTS idx_orders_expedicao ON orders (expedicao);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_pronto_created_at ON orders (pronto, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at DESC);

-- Indexes for order_items table
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_name ON order_items (item_name);

-- Indexes for clientes table
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cidade ON clientes (cidade);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes (estado);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_order_audit_log_order_id ON order_audit_log (order_id);
CREATE INDEX IF NOT EXISTS idx_order_audit_log_created_at ON order_audit_log (created_at DESC);

-- Analyze tables to update statistics
ANALYZE orders;
ANALYZE order_items;
ANALYZE clientes;
ANALYZE order_audit_log;
