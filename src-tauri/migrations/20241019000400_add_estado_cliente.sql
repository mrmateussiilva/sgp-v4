-- Adicionar campo estado_cliente na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estado_cliente VARCHAR(2);
