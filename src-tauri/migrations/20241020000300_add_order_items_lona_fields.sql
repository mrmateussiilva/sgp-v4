-- Adiciona campos específicos de lona aos itens do pedido
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS terceirizado BOOLEAN,
    ADD COLUMN IF NOT EXISTS acabamento_lona VARCHAR(100),
    ADD COLUMN IF NOT EXISTS valor_lona VARCHAR(20),
    ADD COLUMN IF NOT EXISTS quantidade_lona VARCHAR(20),
    ADD COLUMN IF NOT EXISTS outros_valores_lona VARCHAR(20);
