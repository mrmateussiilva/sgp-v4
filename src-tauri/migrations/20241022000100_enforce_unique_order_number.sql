-- Ensure deterministic and unique order numbers generated server-side

-- 1. Create sequence to back order numbers (safe to run multiple times)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'order_number_seq'
    ) THEN
        EXECUTE 'CREATE SEQUENCE order_number_seq START WITH 1';
    END IF;
END $$;

-- 2. Normalize existing numbers so the unique constraint can be applied
UPDATE orders
SET numero = LPAD(id::text, 10, '0')
WHERE numero IS NULL
   OR numero = ''
   OR numero !~ '^\d{10}$';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'order_number_seq') THEN
        PERFORM setval('order_number_seq', GREATEST(COALESCE((SELECT MAX(numero::int) FROM orders), 1), 1));
    ELSE
        CREATE SEQUENCE order_number_seq START WITH 1 INCREMENT BY 1;
        PERFORM setval('order_number_seq', 1);
    END IF;
END$$;

-- 4. Enforce default, not-null and uniqueness on numero
ALTER TABLE orders
    ALTER COLUMN numero SET NOT NULL;

ALTER TABLE orders
    ALTER COLUMN numero SET DEFAULT LPAD(nextval('order_number_seq')::text, 10, '0');

-- Drop legacy non-unique index if it exists to avoid duplication
DROP INDEX IF EXISTS idx_orders_numero;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'orders'
          AND constraint_name = 'orders_numero_unique'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_numero_unique UNIQUE (numero);
    END IF;
END $$;
