-- Admin and support tables required by the application UI

-- Helper function to keep updated_at in sync
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Clientes
-- ========================================

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY
);

ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS nome VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
    ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
    ADD COLUMN IF NOT EXISTS estado VARCHAR(2),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE clientes
    ALTER COLUMN nome SET NOT NULL;

UPDATE clientes
SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);

-- ========================================
-- Materiais
-- ========================================

CREATE TABLE IF NOT EXISTS materiais (
    id SERIAL PRIMARY KEY
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'materiais' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'materiais' AND column_name = 'nome'
    ) THEN
        EXECUTE 'ALTER TABLE materiais RENAME COLUMN name TO nome';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'materiais' AND column_name = 'description'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'materiais' AND column_name = 'observacao'
    ) THEN
        EXECUTE 'ALTER TABLE materiais RENAME COLUMN description TO observacao';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'materiais' AND column_name = 'tipo_producao'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'materiais' AND column_name = 'tipo'
    ) THEN
        EXECUTE 'ALTER TABLE materiais RENAME COLUMN tipo_producao TO tipo';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'materiais' AND column_name = 'active'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'materiais' AND column_name = 'ativo'
    ) THEN
        EXECUTE 'ALTER TABLE materiais RENAME COLUMN active TO ativo';
    END IF;
END $$;

ALTER TABLE materiais
    ADD COLUMN IF NOT EXISTS nome VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(50),
    ADD COLUMN IF NOT EXISTS valor_metro DECIMAL(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS estoque_metros DECIMAL(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS observacao TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE materiais
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN tipo SET NOT NULL;

UPDATE materiais
SET valor_metro = COALESCE(valor_metro, 0.00),
    estoque_metros = COALESCE(estoque_metros, 0.00),
    ativo = COALESCE(ativo, TRUE),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

DROP TRIGGER IF EXISTS update_materiais_updated_at ON materiais;
CREATE TRIGGER update_materiais_updated_at
    BEFORE UPDATE ON materiais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
DECLARE
    duplicates_exist BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM materiais GROUP BY nome HAVING COUNT(*) > 1
    ) INTO duplicates_exist;

    IF duplicates_exist THEN
        RAISE NOTICE 'Materiais possuem nomes duplicados; criando índice não único.';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_materiais_nome ON materiais(nome)';
    ELSE
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_materiais_nome ON materiais(nome)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON materiais(tipo);
CREATE INDEX IF NOT EXISTS idx_materiais_ativo ON materiais(ativo);

INSERT INTO materiais (nome, tipo, valor_metro, estoque_metros)
SELECT 'Lona Frontlit 440g', 'LONA', 12.50, 500.00
WHERE NOT EXISTS (SELECT 1 FROM materiais WHERE nome = 'Lona Frontlit 440g');

INSERT INTO materiais (nome, tipo, valor_metro, estoque_metros)
SELECT 'Lona Backlit 440g', 'LONA', 15.00, 300.00
WHERE NOT EXISTS (SELECT 1 FROM materiais WHERE nome = 'Lona Backlit 440g');

INSERT INTO materiais (nome, tipo, valor_metro, estoque_metros)
SELECT 'Tecido Duralon', 'TECIDO', 8.50, 800.00
WHERE NOT EXISTS (SELECT 1 FROM materiais WHERE nome = 'Tecido Duralon');

INSERT INTO materiais (nome, tipo, valor_metro, estoque_metros)
SELECT 'Tecido Oxford', 'TECIDO', 10.00, 600.00
WHERE NOT EXISTS (SELECT 1 FROM materiais WHERE nome = 'Tecido Oxford');

INSERT INTO materiais (nome, tipo, valor_metro, estoque_metros)
SELECT 'Vinil Adesivo', 'VINIL', 18.00, 200.00
WHERE NOT EXISTS (SELECT 1 FROM materiais WHERE nome = 'Vinil Adesivo');

-- ========================================
-- Designers
-- ========================================

CREATE TABLE IF NOT EXISTS designers (
    id SERIAL PRIMARY KEY
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'designers' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'designers' AND column_name = 'nome'
    ) THEN
        EXECUTE 'ALTER TABLE designers RENAME COLUMN name TO nome';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'designers' AND column_name = 'phone'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'designers' AND column_name = 'telefone'
    ) THEN
        EXECUTE 'ALTER TABLE designers RENAME COLUMN phone TO telefone';
    END IF;
END $$;

ALTER TABLE designers
    ADD COLUMN IF NOT EXISTS nome VARCHAR(100),
    ADD COLUMN IF NOT EXISTS email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS observacao TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE designers
    ALTER COLUMN nome SET NOT NULL;

UPDATE designers
SET ativo = COALESCE(ativo, TRUE),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

DROP TRIGGER IF EXISTS update_designers_updated_at ON designers;
CREATE TRIGGER update_designers_updated_at
    BEFORE UPDATE ON designers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
DECLARE
    duplicates_exist BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM designers GROUP BY nome HAVING COUNT(*) > 1
    ) INTO duplicates_exist;

    IF duplicates_exist THEN
        RAISE NOTICE 'Designers possuem nomes duplicados; criando índice não único.';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_designers_nome ON designers(nome)';
    ELSE
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_designers_nome ON designers(nome)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_designers_ativo ON designers(ativo);

INSERT INTO designers (nome, email, telefone, ativo)
SELECT 'João Silva', 'joao@example.com', '(11) 98765-4321', TRUE
WHERE NOT EXISTS (SELECT 1 FROM designers WHERE nome = 'João Silva');

INSERT INTO designers (nome, email, telefone, ativo)
SELECT 'Maria Santos', 'maria@example.com', '(11) 91234-5678', TRUE
WHERE NOT EXISTS (SELECT 1 FROM designers WHERE nome = 'Maria Santos');

INSERT INTO designers (nome, email, telefone, ativo)
SELECT 'Pedro Costa', 'pedro@example.com', '(11) 99999-8888', TRUE
WHERE NOT EXISTS (SELECT 1 FROM designers WHERE nome = 'Pedro Costa');

-- ========================================
-- Vendedores
-- ========================================

CREATE TABLE IF NOT EXISTS vendedores (
    id SERIAL PRIMARY KEY
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'vendedores' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'vendedores' AND column_name = 'nome'
    ) THEN
        EXECUTE 'ALTER TABLE vendedores RENAME COLUMN name TO nome';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'vendedores' AND column_name = 'phone'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'vendedores' AND column_name = 'telefone'
    ) THEN
        EXECUTE 'ALTER TABLE vendedores RENAME COLUMN phone TO telefone';
    END IF;
END $$;

ALTER TABLE vendedores
    ADD COLUMN IF NOT EXISTS nome VARCHAR(100),
    ADD COLUMN IF NOT EXISTS email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS comissao_percentual DECIMAL(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS observacao TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE vendedores
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN comissao_percentual SET DEFAULT 0.00;

UPDATE vendedores
SET comissao_percentual = COALESCE(comissao_percentual, 0.00),
    ativo = COALESCE(ativo, TRUE),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

DROP TRIGGER IF EXISTS update_vendedores_updated_at ON vendedores;
CREATE TRIGGER update_vendedores_updated_at
    BEFORE UPDATE ON vendedores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
DECLARE
    duplicates_exist BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM vendedores GROUP BY nome HAVING COUNT(*) > 1
    ) INTO duplicates_exist;

    IF duplicates_exist THEN
        RAISE NOTICE 'Vendedores possuem nomes duplicados; criando índice não único.';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vendedores_nome ON vendedores(nome)';
    ELSE
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_vendedores_nome ON vendedores(nome)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendedores_ativo ON vendedores(ativo);

INSERT INTO vendedores (nome, email, telefone, comissao_percentual, ativo)
SELECT 'Carlos Vendas', 'carlos@example.com', '(11) 97777-6666', 5.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM vendedores WHERE nome = 'Carlos Vendas');

INSERT INTO vendedores (nome, email, telefone, comissao_percentual, ativo)
SELECT 'Ana Comercial', 'ana@example.com', '(11) 96666-5555', 4.50, TRUE
WHERE NOT EXISTS (SELECT 1 FROM vendedores WHERE nome = 'Ana Comercial');

INSERT INTO vendedores (nome, email, telefone, comissao_percentual, ativo)
SELECT 'Bruno Externo', 'bruno@example.com', '(11) 95555-4444', 6.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM vendedores WHERE nome = 'Bruno Externo');

-- ========================================
-- Formas de Envio
-- ========================================

CREATE TABLE IF NOT EXISTS formas_envio (
    id SERIAL PRIMARY KEY
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'formas_envio' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'formas_envio' AND column_name = 'nome'
    ) THEN
        EXECUTE 'ALTER TABLE formas_envio RENAME COLUMN name TO nome';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'formas_envio' AND column_name = 'value'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'formas_envio' AND column_name = 'valor'
    ) THEN
        EXECUTE 'ALTER TABLE formas_envio RENAME COLUMN value TO valor';
    END IF;
END $$;

ALTER TABLE formas_envio
    ADD COLUMN IF NOT EXISTS nome VARCHAR(100),
    ADD COLUMN IF NOT EXISTS valor DECIMAL(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS prazo_dias INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS observacao TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE formas_envio
    ALTER COLUMN nome SET NOT NULL;

UPDATE formas_envio
SET valor = COALESCE(valor, 0.00),
    prazo_dias = COALESCE(prazo_dias, 0),
    ativo = COALESCE(ativo, TRUE),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

DROP TRIGGER IF EXISTS update_formas_envio_updated_at ON formas_envio;
CREATE TRIGGER update_formas_envio_updated_at
    BEFORE UPDATE ON formas_envio
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
DECLARE
    duplicates_exist BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM formas_envio GROUP BY nome HAVING COUNT(*) > 1
    ) INTO duplicates_exist;

    IF duplicates_exist THEN
        RAISE NOTICE 'Formas de envio possuem nomes duplicados; criando índice não único.';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_formas_envio_nome ON formas_envio(nome)';
    ELSE
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_formas_envio_nome ON formas_envio(nome)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_formas_envio_ativo ON formas_envio(ativo);

INSERT INTO formas_envio (nome, valor, prazo_dias, ativo)
SELECT 'Retirada no Local', 0.00, 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_envio WHERE nome = 'Retirada no Local');

INSERT INTO formas_envio (nome, valor, prazo_dias, ativo)
SELECT 'Entrega Expressa', 50.00, 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_envio WHERE nome = 'Entrega Expressa');

INSERT INTO formas_envio (nome, valor, prazo_dias, ativo)
SELECT 'Entrega Normal', 25.00, 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_envio WHERE nome = 'Entrega Normal');

INSERT INTO formas_envio (nome, valor, prazo_dias, ativo)
SELECT 'Correios - PAC', 35.00, 7, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_envio WHERE nome = 'Correios - PAC');

INSERT INTO formas_envio (nome, valor, prazo_dias, ativo)
SELECT 'Correios - SEDEX', 55.00, 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_envio WHERE nome = 'Correios - SEDEX');

INSERT INTO formas_envio (nome, valor, prazo_dias, ativo)
SELECT 'Transportadora', 80.00, 5, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_envio WHERE nome = 'Transportadora');

-- ========================================
-- Formas de Pagamento
-- ========================================

CREATE TABLE IF NOT EXISTS formas_pagamento (
    id SERIAL PRIMARY KEY
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'formas_pagamento' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'formas_pagamento' AND column_name = 'nome'
    ) THEN
        EXECUTE 'ALTER TABLE formas_pagamento RENAME COLUMN name TO nome';
    END IF;
END $$;

ALTER TABLE formas_pagamento
    ADD COLUMN IF NOT EXISTS nome VARCHAR(100),
    ADD COLUMN IF NOT EXISTS parcelas_max INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS taxa_percentual DECIMAL(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS observacao TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE formas_pagamento
    ALTER COLUMN nome SET NOT NULL;

UPDATE formas_pagamento
SET parcelas_max = COALESCE(parcelas_max, 1),
    taxa_percentual = COALESCE(taxa_percentual, 0.00),
    ativo = COALESCE(ativo, TRUE),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

DROP TRIGGER IF EXISTS update_formas_pagamento_updated_at ON formas_pagamento;
CREATE TRIGGER update_formas_pagamento_updated_at
    BEFORE UPDATE ON formas_pagamento
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
DECLARE
    duplicates_exist BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM formas_pagamento GROUP BY nome HAVING COUNT(*) > 1
    ) INTO duplicates_exist;

    IF duplicates_exist THEN
        RAISE NOTICE 'Formas de pagamento possuem nomes duplicados; criando índice não único.';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_formas_pagamento_nome ON formas_pagamento(nome)';
    ELSE
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_formas_pagamento_nome ON formas_pagamento(nome)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_formas_pagamento_ativo ON formas_pagamento(ativo);

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Dinheiro', 1, 0.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Dinheiro');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'PIX', 1, 0.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'PIX');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Débito', 1, 1.50, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Débito');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Crédito à Vista', 1, 2.50, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Crédito à Vista');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Crédito 2x', 2, 3.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Crédito 2x');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Crédito 3x', 3, 3.50, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Crédito 3x');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Crédito 6x', 6, 4.50, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Crédito 6x');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Crédito 12x', 12, 6.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Crédito 12x');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Boleto', 1, 1.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Boleto');

INSERT INTO formas_pagamento (nome, parcelas_max, taxa_percentual, ativo)
SELECT 'Transferência', 1, 0.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Transferência');

-- ========================================
-- Users
-- ========================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
    ALTER COLUMN is_admin SET DEFAULT FALSE,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

UPDATE users
SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    is_admin = COALESCE(is_admin, FALSE);

-- Garantir usuário admin padrão
INSERT INTO users (username, password_hash, is_admin)
SELECT 'admin', '$2y$12$A7dNsbpT6UL4PUiR0RduO.DCjTiMQuuLHfoalGexiLRNvKcJste1S', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- ========================================
-- Ajustes na tabela de pedidos
-- ========================================

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS numero VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cliente VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cidade_cliente VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telefone_cliente VARCHAR(50),
    ADD COLUMN IF NOT EXISTS data_entrada DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS data_entrega DATE,
    ADD COLUMN IF NOT EXISTS valor_frete DECIMAL(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS valor_itens DECIMAL(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS forma_envio VARCHAR(100),
    ADD COLUMN IF NOT EXISTS forma_envio_id INTEGER,
    ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'NORMAL',
    ADD COLUMN IF NOT EXISTS observacao TEXT,
    ADD COLUMN IF NOT EXISTS financeiro BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS conferencia BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sublimacao BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS costura BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS expedicao BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cliente'
    ) THEN
        EXECUTE 'ALTER TABLE orders RENAME COLUMN customer_name TO cliente';
    END IF;
END $$;

UPDATE orders
SET data_entrada = COALESCE(data_entrada, CURRENT_DATE),
    prioridade = COALESCE(prioridade, 'NORMAL'),
    valor_frete = COALESCE(valor_frete, 0.00),
    valor_itens = COALESCE(valor_itens, 0.00),
    financeiro = COALESCE(financeiro, FALSE),
    conferencia = COALESCE(conferencia, FALSE),
    sublimacao = COALESCE(sublimacao, FALSE),
    costura = COALESCE(costura, FALSE),
    expedicao = COALESCE(expedicao, FALSE),
    updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'orders' AND constraint_name = 'orders_forma_envio_id_fkey'
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE orders ADD CONSTRAINT orders_forma_envio_id_fkey FOREIGN KEY (forma_envio_id) REFERENCES formas_envio(id)';
        EXCEPTION WHEN duplicate_object THEN
            -- constraint already exists under different name
            NULL;
        END;
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
