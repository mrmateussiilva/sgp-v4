-- Fix timestamp type incompatibility between Rust and PostgreSQL
-- This migration converts all TIMESTAMP columns to TIMESTAMPTZ to match Rust's DateTime<Utc>

-- ========================================
-- Orders table
-- ========================================

-- Convert created_at and updated_at to TIMESTAMPTZ
ALTER TABLE orders
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE orders
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- ========================================
-- Order Items table
-- ========================================

-- Convert created_at to TIMESTAMPTZ
ALTER TABLE order_items
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- ========================================
-- Order Audit Log table
-- ========================================

-- Convert created_at to TIMESTAMPTZ
ALTER TABLE order_audit_log
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- ========================================
-- Clientes table
-- ========================================

-- Convert created_at and updated_at to TIMESTAMPTZ
ALTER TABLE clientes
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE clientes
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- ========================================
-- Materiais table
-- ========================================

-- Convert created_at and updated_at to TIMESTAMPTZ
ALTER TABLE materiais
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE materiais
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- ========================================
-- Designers table
-- ========================================

-- Convert created_at and updated_at to TIMESTAMPTZ
ALTER TABLE designers
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE designers
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- ========================================
-- Vendedores table
-- ========================================

-- Convert created_at and updated_at to TIMESTAMPTZ
ALTER TABLE vendedores
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE vendedores
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- ========================================
-- Formas de Envio table
-- ========================================

-- Convert created_at and updated_at to TIMESTAMPTZ
ALTER TABLE formas_envio
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE formas_envio
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- ========================================
-- Formas de Pagamento table
-- ========================================

-- Convert created_at and updated_at to TIMESTAMPTZ
ALTER TABLE formas_pagamento
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE formas_pagamento
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- ========================================
-- Users table
-- ========================================

-- Convert created_at to TIMESTAMPTZ
ALTER TABLE users
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- ========================================
-- Update trigger function to use TIMESTAMPTZ
-- ========================================

-- Update the trigger function to use TIMESTAMPTZ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Use CURRENT_TIMESTAMP which returns TIMESTAMPTZ by default in PostgreSQL 12+
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Comments explaining the change
-- ========================================

COMMENT ON COLUMN orders.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN orders.updated_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN order_items.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN order_audit_log.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN clientes.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN clientes.updated_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN materiais.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN materiais.updated_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN designers.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN designers.updated_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN vendedores.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN vendedores.updated_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN formas_envio.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN formas_envio.updated_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN formas_pagamento.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN formas_pagamento.updated_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
COMMENT ON COLUMN users.created_at IS 'Timestamp with timezone - compatible with Rust DateTime<Utc>';
