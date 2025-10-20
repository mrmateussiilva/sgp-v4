-- Script para adicionar o campo estado_cliente diretamente no banco
-- Execute este script diretamente no PostgreSQL se as migrações estiverem com problema

-- Conectar ao banco sgp_v4 e executar:
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estado_cliente VARCHAR(2);

-- Verificar se o campo foi adicionado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'estado_cliente';
