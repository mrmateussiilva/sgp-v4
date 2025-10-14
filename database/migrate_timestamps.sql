-- ========================================
-- Migração: Corrigir tipos de TIMESTAMP para TIMESTAMPTZ
-- ========================================
-- Execute este script se você receber erro:
-- "mismatched types; Rust type ... is not compatible with SQL type TIMESTAMP"
-- ========================================

-- Alterar tabela users
ALTER TABLE users 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Alterar tabela orders
ALTER TABLE orders 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ,
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- Verificar mudanças
\d users
\d orders

-- Mensagem de sucesso
SELECT 'Migração concluída com sucesso!' AS status;

