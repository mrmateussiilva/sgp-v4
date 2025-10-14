-- ========================================
-- Sistema de Gerenciamento de Pedidos (SGP)
-- Script de Inicialização do Banco de Dados
-- ========================================

-- Criar banco de dados (executar separadamente se necessário)
-- CREATE DATABASE sgp_database;
-- \c sgp_database;

-- Criar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABELAS
-- ========================================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tipo ENUM para Status do Pedido
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('Pendente', 'Em Processamento', 'Concluído', 'Cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    total_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status order_status DEFAULT 'Pendente'
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- ========================================
-- ÍNDICES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ========================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE
    ON orders FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DADOS DE TESTE
-- ========================================

-- Habilitar extensão pgcrypto para hashes bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Usuários de teste (senha: admin123 e user123)
-- Usando pgcrypto para gerar hashes bcrypt compatíveis
INSERT INTO users (username, password_hash) VALUES
('admin', crypt('admin123', gen_salt('bf'))),
('usuario', crypt('user123', gen_salt('bf')))
ON CONFLICT (username) DO NOTHING;

-- Pedidos de teste
INSERT INTO orders (customer_name, address, total_value, status, created_at) VALUES
('João Silva', 'Rua das Flores, 123 - São Paulo, SP', 350.50, 'Pendente', '2024-10-10 09:00:00'),
('Maria Santos', 'Av. Paulista, 1000 - São Paulo, SP', 1200.00, 'Em Processamento', '2024-10-11 14:30:00'),
('Pedro Oliveira', 'Rua da Consolação, 500 - São Paulo, SP', 89.90, 'Concluído', '2024-10-12 10:15:00'),
('Ana Costa', 'Rua Augusta, 250 - São Paulo, SP', 2500.00, 'Em Processamento', '2024-10-13 16:45:00'),
('Carlos Pereira', 'Rua Oscar Freire, 789 - São Paulo, SP', 150.00, 'Cancelado', '2024-10-14 11:00:00')
ON CONFLICT DO NOTHING;

-- Itens dos pedidos de teste
INSERT INTO order_items (order_id, item_name, quantity, unit_price, subtotal) VALUES
-- Pedido 1 (João Silva)
(1, 'Notebook Lenovo', 1, 300.00, 300.00),
(1, 'Mouse Wireless', 1, 50.50, 50.50),

-- Pedido 2 (Maria Santos)
(2, 'Monitor LG 27"', 2, 500.00, 1000.00),
(2, 'Teclado Mecânico', 1, 200.00, 200.00),

-- Pedido 3 (Pedro Oliveira)
(3, 'Webcam Full HD', 1, 89.90, 89.90),

-- Pedido 4 (Ana Costa)
(4, 'Impressora Multifuncional', 1, 1500.00, 1500.00),
(4, 'Papel A4 (Resma)', 20, 25.00, 500.00),
(4, 'Cartucho de Tinta', 10, 50.00, 500.00),

-- Pedido 5 (Carlos Pereira)
(5, 'Mousepad Gamer', 3, 50.00, 150.00)
ON CONFLICT DO NOTHING;

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Exibir resumo dos dados inseridos
SELECT 'Usuários cadastrados:' as info, COUNT(*) as total FROM users
UNION ALL
SELECT 'Pedidos cadastrados:', COUNT(*) FROM orders
UNION ALL
SELECT 'Itens de pedidos:', COUNT(*) FROM order_items;

-- Exibir todos os pedidos com seus itens
SELECT 
    o.id as pedido_id,
    o.customer_name as cliente,
    o.status,
    o.total_value as valor_total,
    COUNT(oi.id) as qtd_itens
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.customer_name, o.status, o.total_value
ORDER BY o.id;

COMMIT;

