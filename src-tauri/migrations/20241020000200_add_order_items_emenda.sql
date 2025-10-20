-- Adicionar campos de emenda aos itens do pedido
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS emenda VARCHAR(50),
    ADD COLUMN IF NOT EXISTS emenda_qtd VARCHAR(50);
