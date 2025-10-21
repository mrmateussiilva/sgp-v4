-- Tabela para registrar histórico de alterações em pedidos
CREATE TABLE IF NOT EXISTS order_audit_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    changed_by INTEGER,
    changed_by_name VARCHAR(255),
    changes JSONB NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_audit_log_order_id ON order_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_audit_log_created_at ON order_audit_log(created_at DESC);
