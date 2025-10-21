-- Adicionar campo forma_pagamento_id na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS forma_pagamento_id INTEGER;

-- Adicionar constraint de foreign key se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'orders' AND constraint_name = 'orders_forma_pagamento_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE orders ADD CONSTRAINT orders_forma_pagamento_id_fkey FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id);
        EXCEPTION WHEN duplicate_object THEN
            -- constraint already exists under different name
            NULL;
        END;
    END IF;
END $$;

