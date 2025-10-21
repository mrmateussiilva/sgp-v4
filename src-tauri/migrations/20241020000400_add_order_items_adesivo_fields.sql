-- Adiciona campos específicos para itens do tipo adesivo
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS tipo_adesivo VARCHAR(100),
    ADD COLUMN IF NOT EXISTS valor_adesivo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS quantidade_adesivo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS outros_valores_adesivo VARCHAR(20);
