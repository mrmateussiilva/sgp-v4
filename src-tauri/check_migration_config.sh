#!/bin/bash

# Script para verificar a configuração atual das migrações
# Mostra como o sistema decide se deve executar migrações ou não

echo "🔍 Verificando Configuração das Migrações do SGP v4"
echo ""

# Função para mostrar seção
show_section() {
    echo "═══════════════════════════════════════════════════════════════"
    echo "$1"
    echo "═══════════════════════════════════════════════════════════════"
}

# Função para mostrar status
show_status() {
    if [ "$1" = "true" ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
    fi
}

show_section "📁 ARQUIVOS DE CONFIGURAÇÃO"

echo "🔍 Verificando arquivo .env..."
if [ -f ".env" ]; then
    echo "✅ Arquivo .env encontrado"
    echo ""
    echo "📋 Conteúdo do .env:"
    echo "───────────────────────────────────────────────────────────────"
    cat .env | while read line; do
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
            continue
        fi
        echo "   $line"
    done
    echo "───────────────────────────────────────────────────────────────"
else
    echo "❌ Arquivo .env não encontrado"
fi

echo ""
echo "🔍 Verificando arquivo db_config.json..."
if [ -f "db_config.json" ]; then
    echo "✅ Arquivo db_config.json encontrado"
    echo ""
    echo "📋 Conteúdo do db_config.json:"
    echo "───────────────────────────────────────────────────────────────"
    cat db_config.json | while read line; do
        echo "   $line"
    done
    echo "───────────────────────────────────────────────────────────────"
else
    echo "❌ Arquivo db_config.json não encontrado"
fi

show_section "🔧 VARIÁVEIS DE AMBIENTE"

echo "🔍 Verificando variáveis de ambiente..."
echo ""

# Carregar .env se existir
if [ -f ".env" ]; then
    source .env
fi

# Verificar variáveis importantes
echo "📊 Variáveis de Ambiente:"
echo "───────────────────────────────────────────────────────────────"

if [ -n "$RUN_MIGRATIONS" ]; then
    echo "   RUN_MIGRATIONS: $RUN_MIGRATIONS"
else
    echo "   RUN_MIGRATIONS: (não definida)"
fi

if [ -n "$APP_ENV" ]; then
    echo "   APP_ENV: $APP_ENV"
else
    echo "   APP_ENV: (não definida)"
fi

if [ -n "$DATABASE_URL" ]; then
    echo "   DATABASE_URL: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
else
    echo "   DATABASE_URL: (não definida)"
fi

echo "───────────────────────────────────────────────────────────────"

show_section "🎯 DECISÃO DE EXECUÇÃO DAS MIGRAÇÕES"

echo "🔍 Analisando configuração atual..."
echo ""

# Lógica de decisão baseada no código Rust
RUN_MIGRATIONS_VALUE=""
APP_ENV_VALUE=""

if [ -n "$RUN_MIGRATIONS" ]; then
    RUN_MIGRATIONS_VALUE="$RUN_MIGRATIONS"
else
    if [ -n "$APP_ENV" ]; then
        APP_ENV_VALUE="$APP_ENV"
    else
        APP_ENV_VALUE="development"  # Padrão do código
    fi
fi

echo "📊 Análise da Configuração:"
echo "───────────────────────────────────────────────────────────────"

if [ -n "$RUN_MIGRATIONS_VALUE" ]; then
    echo "   1. RUN_MIGRATIONS está definida: $RUN_MIGRATIONS_VALUE"
    if [ "$RUN_MIGRATIONS_VALUE" = "true" ]; then
        echo "      → DECISÃO: EXECUTAR MIGRAÇÕES ✅"
        MIGRATIONS_WILL_RUN=true
    else
        echo "      → DECISÃO: NÃO EXECUTAR MIGRAÇÕES ❌"
        MIGRATIONS_WILL_RUN=false
    fi
else
    echo "   1. RUN_MIGRATIONS não está definida"
    echo "   2. APP_ENV: $APP_ENV_VALUE"
    if [ "$APP_ENV_VALUE" = "production" ]; then
        echo "      → DECISÃO: NÃO EXECUTAR MIGRAÇÕES ❌"
        MIGRATIONS_WILL_RUN=false
    else
        echo "      → DECISÃO: EXECUTAR MIGRAÇÕES ✅"
        MIGRATIONS_WILL_RUN=true
    fi
fi

echo "───────────────────────────────────────────────────────────────"

show_section "📈 RESULTADO FINAL"

if [ "$MIGRATIONS_WILL_RUN" = "true" ]; then
    echo "🚀 STATUS: MIGRAÇÕES SERÃO EXECUTADAS"
    echo ""
    echo "✅ O sistema está configurado para executar migrações automaticamente"
    echo "✅ Isso significa que as migrações serão aplicadas na inicialização"
    echo "✅ O banco de dados será atualizado com as últimas mudanças"
else
    echo "⏸️  STATUS: MIGRAÇÕES NÃO SERÃO EXECUTADAS"
    echo ""
    echo "❌ O sistema está configurado para NÃO executar migrações"
    echo "❌ Isso significa que as migrações serão puladas na inicialização"
    echo "❌ O banco de dados NÃO será atualizado automaticamente"
fi

echo ""
echo "🔧 Para alterar o comportamento:"
echo "───────────────────────────────────────────────────────────────"
if [ "$MIGRATIONS_WILL_RUN" = "true" ]; then
    echo "   Para NÃO executar migrações:"
    echo "   1. Editar .env: RUN_MIGRATIONS=false"
    echo "   2. Ou alterar: APP_ENV=production"
    echo "   3. Ou comentar a linha RUN_MIGRATIONS"
else
    echo "   Para executar migrações:"
    echo "   1. Editar .env: RUN_MIGRATIONS=true"
    echo "   2. Ou alterar: APP_ENV=development"
    echo "   3. Ou definir: APP_ENV=test"
fi

show_section "📚 INFORMAÇÕES ADICIONAIS"

echo "📖 Como funciona o sistema:"
echo "───────────────────────────────────────────────────────────────"
echo "   1. O sistema carrega configurações do .env ou db_config.json"
echo "   2. Verifica a variável RUN_MIGRATIONS"
echo "   3. Se não definida, verifica APP_ENV"
echo "   4. Decide se executa migrações baseado na lógica:"
echo "      - RUN_MIGRATIONS=true → Executa migrações"
echo "      - RUN_MIGRATIONS=false → Não executa migrações"
echo "      - RUN_MIGRATIONS não definida + APP_ENV=production → Não executa"
echo "      - RUN_MIGRATIONS não definida + APP_ENV≠production → Executa"
echo "───────────────────────────────────────────────────────────────"

echo ""
echo "🎯 Configuração atual do seu sistema:"
echo "   RUN_MIGRATIONS: $RUN_MIGRATIONS_VALUE"
echo "   APP_ENV: $APP_ENV_VALUE"
echo "   Resultado: $([ "$MIGRATIONS_WILL_RUN" = "true" ] && echo "EXECUTA MIGRAÇÕES" || echo "NÃO EXECUTA MIGRAÇÕES")"

