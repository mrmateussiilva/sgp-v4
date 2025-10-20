-- Base schema for integration tests

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('Pendente', 'Em Processamento', 'Concluído', 'Cancelado');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50),
    customer_name VARCHAR(255) NOT NULL,
    cliente VARCHAR(255),
    address TEXT NOT NULL,
    cidade_cliente VARCHAR(100),
    telefone_cliente VARCHAR(20),
    data_entrada DATE,
    data_entrega DATE,
    total_value DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) DEFAULT 0,
    status order_status DEFAULT 'Pendente',
    prioridade VARCHAR(20) DEFAULT 'NORMAL',
    observacao TEXT,
    financeiro BOOLEAN DEFAULT false,
    conferencia BOOLEAN DEFAULT false,
    sublimacao BOOLEAN DEFAULT false,
    costura BOOLEAN DEFAULT false,
    expedicao BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
