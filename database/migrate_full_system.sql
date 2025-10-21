-- ================================================
-- MIGRAÇÃO COMPLETA DO SISTEMA DE FICHAS
-- Adiciona todas as tabelas do sistema antigo
-- ================================================

-- 1. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cep VARCHAR(10),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    telefone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MATERIAIS
CREATE TABLE IF NOT EXISTS materiais (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tipo_producao VARCHAR(50) NOT NULL, -- 'painel', 'totem', 'lona', 'almofada', 'bolsinha'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DESIGNERS
CREATE TABLE IF NOT EXISTS designers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. VENDEDORES
CREATE TABLE IF NOT EXISTS vendedores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TECIDOS
CREATE TABLE IF NOT EXISTS tecidos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    gsm INTEGER, -- gramatura
    composition TEXT, -- composição
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. FORMAS DE ENVIO
CREATE TABLE IF NOT EXISTS envios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. FORMAS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS pagamentos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2), -- desconto/acréscimo se aplicável
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. DESCONTOS
CREATE TABLE IF NOT EXISTS descontos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- 'percentual', 'valor_fixo'
    value DECIMAL(10, 2),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TIPOS DE PRODUÇÃO
CREATE TABLE IF NOT EXISTS producoes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequência para geração de números de pedido
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'order_number_seq'
    ) THEN
        EXECUTE 'CREATE SEQUENCE order_number_seq START WITH 1';
    END IF;
END $$;

-- 10. EXPANDIR TABELA ORDERS (adicionar novos campos)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS data_entrada DATE,
ADD COLUMN IF NOT EXISTS data_entrega DATE,
ADD COLUMN IF NOT EXISTS observacao TEXT,
ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS telefone_cliente VARCHAR(50),
ADD COLUMN IF NOT EXISTS cidade_cliente VARCHAR(100),
ADD COLUMN IF NOT EXISTS valor_frete DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_itens DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_pagamento VARCHAR(100),
ADD COLUMN IF NOT EXISTS obs_pagamento TEXT,
ADD COLUMN IF NOT EXISTS forma_envio VARCHAR(100),
ADD COLUMN IF NOT EXISTS forma_envio_id INTEGER REFERENCES envios(id),
ADD COLUMN IF NOT EXISTS financeiro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conferencia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sublimacao BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS costura BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS expedicao BOOLEAN DEFAULT FALSE;

-- Renomear customer_name para cliente se necessário
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns 
              WHERE table_name='orders' AND column_name='customer_name') THEN
        ALTER TABLE orders RENAME COLUMN customer_name TO cliente;
    END IF;
END $$;

-- Remover address se existir (cidade já está em cidade_cliente)
ALTER TABLE orders DROP COLUMN IF EXISTS address;

-- Normalizar valores existentes para garantir unicidade
UPDATE orders
SET numero = LPAD(id::text, 10, '0')
WHERE numero IS NULL
   OR numero = ''
   OR numero !~ '^\d{10}$';

-- Garantir que a sequência continue do maior ID existente
SELECT setval(
    'order_number_seq',
    COALESCE((SELECT MAX(id) FROM orders), 0)
);

-- Enforce default, not-null e unicidade no número do pedido
ALTER TABLE orders
    ALTER COLUMN numero SET NOT NULL,
    ALTER COLUMN numero SET DEFAULT LPAD(nextval('order_number_seq')::text, 10, '0');

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

-- 11. CRIAR TABELA DE ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tipo_producao VARCHAR(50) NOT NULL, -- 'painel', 'totem', 'lona', 'almofada', 'bolsinha'
    descricao TEXT NOT NULL,
    largura VARCHAR(20),
    altura VARCHAR(20),
    metro_quadrado VARCHAR(20),
    vendedor VARCHAR(100),
    designer VARCHAR(100),
    tecido VARCHAR(100),
    
    -- Acabamento
    overloque BOOLEAN DEFAULT FALSE,
    elastico BOOLEAN DEFAULT FALSE,
    ilhos BOOLEAN DEFAULT FALSE,
    
    emenda VARCHAR(20), -- 'sem-emenda', 'com-emenda'
    observacao TEXT,
    valor_unitario DECIMAL(10, 2),
    imagem TEXT, -- base64 ou caminho
    
    -- Campos específicos para totem
    ilhos_qtd VARCHAR(20),
    ilhos_valor_unitario DECIMAL(10, 2),
    ilhos_distancia VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ziper BOOLEAN DEFAULT FALSE,
    cordinha_extra BOOLEAN DEFAULT FALSE,
    alcinha BOOLEAN DEFAULT FALSE,
    toalha_pronta BOOLEAN DEFAULT FALSE
);

-- 11.1 Histórico de alterações de pedidos
CREATE TABLE IF NOT EXISTS order_audit_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    changed_by INTEGER,
    changed_by_name VARCHAR(255),
    changes JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_audit_log_order_id ON order_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_audit_log_created_at ON order_audit_log(created_at DESC);

-- 12. MIGRAR DADOS EXISTENTES order_items (antiga) para order_items (nova)
-- Apenas se a tabela antiga existir
DO $$
BEGIN
    -- Se existir uma tabela order_items antiga com estrutura diferente
    -- fazer migração de dados aqui
    NULL;
END $$;

-- 13. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_data_entrada ON orders(data_entrada);
CREATE INDEX IF NOT EXISTS idx_orders_data_entrega ON orders(data_entrega);
CREATE INDEX IF NOT EXISTS idx_orders_cliente ON orders(cliente);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tipo_producao ON order_items(tipo_producao);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);

-- 14. TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger em clientes
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 15. POPULAR DADOS INICIAIS

-- Formas de Envio padrão
INSERT INTO envios (name, value) VALUES 
('Retirada', 0.00),
('Entrega Local', 15.00),
('PAC', 25.00),
('SEDEX', 45.00),
('Transportadora', 80.00)
ON CONFLICT DO NOTHING;

-- Formas de Pagamento padrão
INSERT INTO pagamentos (name, value) VALUES 
('Dinheiro', 0.00),
('PIX', 0.00),
('Cartão Débito', 0.00),
('Cartão Crédito', 2.50), -- 2.5% de taxa
('Boleto', 0.00)
ON CONFLICT DO NOTHING;

-- Tipos de Produção padrão
INSERT INTO producoes (name, description) VALUES 
('Painel', 'Painéis publicitários'),
('Totem', 'Totens de divulgação'),
('Lona', 'Lonas personalizadas'),
('Almofada', 'Almofadas personalizadas'),
('Bolsinha', 'Bolsinhas personalizadas')
ON CONFLICT DO NOTHING;

-- Materiais de exemplo
INSERT INTO materiais (name, description, tipo_producao) VALUES 
('Lona Blackout', 'Lona com bloqueio de luz', 'painel'),
('Lona Brilho', 'Lona com acabamento brilhante', 'painel'),
('Tecido Oxford', 'Tecido resistente', 'totem'),
('Tecido Cetim', 'Tecido acetinado', 'almofada')
ON CONFLICT DO NOTHING;

-- Tecidos de exemplo
INSERT INTO tecidos (name, description, gsm, composition) VALUES 
('Oxford 600D', 'Tecido Oxford alta resistência', 600, '100% Poliéster'),
('Cetim 230', 'Tecido cetim leve', 230, '100% Poliéster'),
('Blackout 280', 'Tecido bloqueador de luz', 280, 'Poliéster + PVC')
ON CONFLICT DO NOTHING;

-- ================================================
-- CONCLUÍDO
-- ================================================

-- Verificar tabelas criadas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

COMMIT;
