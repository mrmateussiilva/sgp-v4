-- Adicionar campo forma_envio à tabela orders

ALTER TABLE orders ADD COLUMN IF NOT EXISTS forma_envio VARCHAR(100);
