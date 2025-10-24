#!/bin/bash

# Script para aplicar solução simples de notificações
# Remove toda a complexidade desnecessária do sistema de eventos

set -e

echo "🔧 Aplicando solução simples de notificações..."

# Verificar se estamos no diretório correto
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Erro: Execute este script no diretório src-tauri"
    exit 1
fi

# Backup do arquivo de notificações complexo
if [ -f "src/notifications.rs" ]; then
    echo "📦 Fazendo backup do sistema complexo..."
    cp src/notifications.rs src/notifications_complex_backup.rs
    echo "✅ Backup criado: src/notifications_complex_backup.rs"
fi

# Renomear o arquivo complexo para desabilitar
if [ -f "src/notifications.rs" ]; then
    mv src/notifications.rs src/notifications_disabled.rs
    echo "✅ Sistema complexo desabilitado"
fi

# Verificar se o arquivo simples existe
if [ ! -f "src/notifications_simple.rs" ]; then
    echo "❌ Erro: Arquivo src/notifications_simple.rs não encontrado"
    exit 1
fi

# Renomear o arquivo simples para ser usado
mv src/notifications_simple.rs src/notifications.rs
echo "✅ Sistema simples ativado"

# Compilar para verificar se não há erros
echo "🔨 Compilando projeto..."
cargo check

if [ $? -eq 0 ]; then
    echo "✅ Compilação bem-sucedida"
else
    echo "❌ Erro na compilação - revertendo mudanças..."
    
    # Reverter mudanças
    mv src/notifications.rs src/notifications_simple.rs
    mv src/notifications_disabled.rs src/notifications.rs
    
    echo "❌ Mudanças revertidas"
    exit 1
fi

echo ""
echo "🎉 Solução simples aplicada com sucesso!"
echo ""
echo "📋 O que foi feito:"
echo "   ✅ Sistema complexo de notificações desabilitado"
echo "   ✅ Sistema simples ativado"
echo "   ✅ Removidos broadcasts globais complexos"
echo "   ✅ Removido sistema de heartbeat automático"
echo "   ✅ Removido throttling complicado"
echo "   ✅ Removidas múltiplas conexões desnecessárias"
echo ""
echo "🚀 Benefícios da solução simples:"
echo "   ✅ Menos bugs e instabilidade"
echo "   ✅ Sistema mais previsível"
echo "   ✅ Logs mais limpos"
echo "   ✅ Menor overhead de CPU/memória"
echo "   ✅ Mais fácil de debugar"
echo ""
echo "💡 Como funciona agora:"
echo "   - Eventos simples: order_created, order_updated, order_deleted, order_status_changed"
echo "   - Sem conexões complexas"
echo "   - Sem heartbeat automático"
echo "   - Sem throttling complicado"
echo "   - Apenas notificações diretas quando necessário"
echo ""
echo "🔄 Para reverter (se necessário):"
echo "   mv src/notifications.rs src/notifications_simple.rs"
echo "   mv src/notifications_disabled.rs src/notifications.rs"
echo ""
echo "🚀 Reinicie a aplicação para aplicar as mudanças!"

