-- Adicionar campo pronto na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pronto BOOLEAN DEFAULT FALSE;

