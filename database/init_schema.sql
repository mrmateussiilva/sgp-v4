-- Script para criar todas as tabelas do sistema
-- Execute este script no PostgreSQL

-- Criar tipo ENUM para status de pedidos
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('Pendente', 'Em Processamento', 'Concluído', 'Cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50),
    customer_name VARCHAR(255),
    cliente VARCHAR(255),
    address TEXT,
    cidade_cliente VARCHAR(100),
    telefone_cliente VARCHAR(20),
    data_entrada DATE,
    data_entrega DATE,
    total_value DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) DEFAULT 0,
    status order_status DEFAULT 'Pendente',
    prioridade VARCHAR(20) DEFAULT 'NORMAL',
    observacao TEXT,
    
    -- Status de produção (checkboxes)
    financeiro BOOLEAN DEFAULT false,
    conferencia BOOLEAN DEFAULT false,
    sublimacao BOOLEAN DEFAULT false,
    costura BOOLEAN DEFAULT false,
    expedicao BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens de Pedidos
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cep VARCHAR(10),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    telefone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário admin padrão (senha: admin)
INSERT INTO users (username, password_hash, is_admin) 
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7JDy3CpT/W', true)
ON CONFLICT (username) DO NOTHING;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_data_entrega ON orders(data_entrega);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

