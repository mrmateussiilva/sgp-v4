-- Script para criar todas as tabelas do sistema Admin
-- Execute este script no PostgreSQL

-- Tabela de Materiais/Tecidos
CREATE TABLE IF NOT EXISTS materiais (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(50) NOT NULL, -- 'TECIDO', 'LONA', 'VINIL', etc
    valor_metro DECIMAL(10, 2) DEFAULT 0.00,
    estoque_metros DECIMAL(10, 2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Designers
CREATE TABLE IF NOT EXISTS designers (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT true,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Vendedores
CREATE TABLE IF NOT EXISTS vendedores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150),
    telefone VARCHAR(20),
    comissao_percentual DECIMAL(5, 2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Formas de Envio
CREATE TABLE IF NOT EXISTS formas_envio (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    valor DECIMAL(10, 2) DEFAULT 0.00,
    prazo_dias INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Formas de Pagamento
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    parcelas_max INTEGER DEFAULT 1,
    taxa_percentual DECIMAL(5, 2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados iniciais de exemplo

-- Materiais
INSERT INTO materiais (nome, tipo, valor_metro, estoque_metros) VALUES
    ('Lona Frontlit 440g', 'LONA', 12.50, 500.00),
    ('Lona Backlit 440g', 'LONA', 15.00, 300.00),
    ('Tecido Duralon', 'TECIDO', 8.50, 800.00),
    ('Tecido Oxford', 'TECIDO', 10.00, 600.00),
    ('Vinil Adesivo', 'VINIL', 18.00, 200.00)
ON CONFLICT (nome) DO NOTHING;

-- Designers
INSERT INTO designers (nome, email, telefone) VALUES
    ('João Silva', 'joao@example.com', '(11) 98765-4321'),
    ('Maria Santos', 'maria@example.com', '(11) 91234-5678'),
    ('Pedro Costa', 'pedro@example.com', '(11) 99999-8888')
ON CONFLICT (nome) DO NOTHING;

-- Vendedores
INSERT INTO vendedores (nome, email, telefone, comissao_percentual) VALUES
    ('Carlos Vendas', 'carlos@example.com', '(11) 97777-6666', 5.00),
    ('Ana Comercial', 'ana@example.com', '(11) 96666-5555', 4.50),
    ('Bruno Externo', 'bruno@example.com', '(11) 95555-4444', 6.00)
ON CONFLICT (nome) DO NOTHING;

-- Formas de Envio
INSERT INTO formas_envio (nome, valor, prazo_dias) VALUES
    ('Retirada no Local', 0.00, 0),
    ('Entrega Expressa', 50.00, 1),
    ('Entrega Normal', 25.00, 3),
    ('Correios - PAC', 35.00, 7),
    ('Correios - SEDEX', 55.00, 3),
    ('Transportadora', 80.00, 5)
ON CONFLICT (nome) DO NOTHING;

-- Formas de Pagamento
INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual) VALUES
    ('Dinheiro', 1, 0.00),
    ('PIX', 1, 0.00),
    ('Débito', 1, 1.50),
    ('Crédito à Vista', 1, 2.50),
    ('Crédito 2x', 2, 3.00),
    ('Crédito 3x', 3, 3.50),
    ('Crédito 6x', 6, 4.50),
    ('Crédito 12x', 12, 6.00),
    ('Boleto', 1, 1.00),
    ('Transferência', 1, 0.00)
ON CONFLICT (nome) DO NOTHING;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON materiais(tipo);
CREATE INDEX IF NOT EXISTS idx_materiais_ativo ON materiais(ativo);
CREATE INDEX IF NOT EXISTS idx_designers_ativo ON designers(ativo);
CREATE INDEX IF NOT EXISTS idx_vendedores_ativo ON vendedores(ativo);
CREATE INDEX IF NOT EXISTS idx_formas_envio_ativo ON formas_envio(ativo);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_ativo ON formas_pagamento(ativo);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_materiais_updated_at BEFORE UPDATE ON materiais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designers_updated_at BEFORE UPDATE ON designers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendedores_updated_at BEFORE UPDATE ON vendedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formas_envio_updated_at BEFORE UPDATE ON formas_envio
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formas_pagamento_updated_at BEFORE UPDATE ON formas_pagamento
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

