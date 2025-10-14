-- ========================================
-- Script de Correção de Senhas
-- ========================================
-- Use este script se estiver tendo problemas de autenticação
-- ========================================

-- Habilitar extensão pgcrypto (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Resetar senhas dos usuários de teste
UPDATE users SET password_hash = crypt('admin123', gen_salt('bf')) 
WHERE username = 'admin';

UPDATE users SET password_hash = crypt('user123', gen_salt('bf')) 
WHERE username = 'usuario';

-- Verificar hashes atualizados
SELECT 
    username, 
    LEFT(password_hash, 7) as hash_type,
    LENGTH(password_hash) as hash_length,
    created_at
FROM users
ORDER BY username;

-- Mensagem de sucesso
SELECT '✅ Senhas resetadas com sucesso!' as status;
SELECT 'Login: admin / Senha: admin123' as credencial_1;
SELECT 'Login: usuario / Senha: user123' as credencial_2;

