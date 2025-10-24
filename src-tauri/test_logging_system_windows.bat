@echo off
REM Script para testar o sistema de logs no Windows
REM Este script compila o projeto e testa o sistema de logs

echo 📋 Testando sistema de logs para Windows...

REM Verificar se estamos no diretório correto
if not exist "Cargo.toml" (
    echo ❌ Este script deve ser executado no diretório src-tauri
    pause
    exit /b 1
)

echo ✅ Diretório correto encontrado

REM Verificar dependências de logging
echo ℹ️  Verificando dependências de logging...

findstr /C:"tracing-appender" Cargo.toml >nul
if %errorlevel% equ 0 (
    echo ✅ tracing-appender encontrado
) else (
    echo ❌ tracing-appender não encontrado no Cargo.toml
    pause
    exit /b 1
)

findstr /C:"env_logger" Cargo.toml >nul
if %errorlevel% equ 0 (
    echo ✅ env_logger encontrado
) else (
    echo ❌ env_logger não encontrado no Cargo.toml
    pause
    exit /b 1
)

REM Verificar arquivos de logging
if exist "src\logging.rs" (
    echo ✅ Arquivo logging.rs encontrado
) else (
    echo ❌ Arquivo logging.rs não encontrado
    pause
    exit /b 1
)

if exist "src\commands\logs.rs" (
    echo ✅ Arquivo commands\logs.rs encontrado
) else (
    echo ❌ Arquivo commands\logs.rs não encontrado
    pause
    exit /b 1
)

if exist "logging.env.example" (
    echo ✅ Arquivo logging.env.example encontrado
) else (
    echo ❌ Arquivo logging.env.example não encontrado
    pause
    exit /b 1
)

REM Criar arquivo de configuração de logs para teste
echo ℹ️  Criando configuração de logs para teste...
(
echo LOG_LEVEL=debug
echo LOG_FILE_PATH=logs\sgp_test.log
echo LOG_MAX_FILES=5
echo LOG_MAX_SIZE_MB=5
echo LOG_ENABLE_CONSOLE=true
echo LOG_ENABLE_FILE=true
echo LOG_ENABLE_JSON=false
) > logging.env

echo ✅ Arquivo logging.env criado

REM Compilar o projeto
echo ⚠️  Compilando projeto...
cargo build --release
if %errorlevel% equ 0 (
    echo ✅ Compilação bem-sucedida
) else (
    echo ❌ Falha na compilação
    pause
    exit /b 1
)

REM Verificar se o binário foi criado
if exist "target\release\sgp-v4.exe" (
    echo ✅ Binário de produção criado
) else (
    echo ❌ Binário de produção não encontrado
    pause
    exit /b 1
)

REM Criar diretório de logs se não existir
if not exist "logs" mkdir logs
echo ✅ Diretório de logs criado

echo ✅ 🎉 Sistema de logs configurado com sucesso!
echo.
echo ℹ️  📋 Funcionalidades disponíveis:
echo    • Logs estruturados com diferentes níveis (debug, info, warn, error^)
echo    • Rotação automática de logs por dia
echo    • Limite de arquivos e tamanho configurável
echo    • Logs tanto no console quanto em arquivo
echo    • Formato JSON opcional
echo    • Comandos Tauri para gerenciar logs
echo.
echo ℹ️  🚀 Comandos Tauri disponíveis:
echo    • get_log_stats^(^) - Estatísticas dos logs
echo    • get_log_files^(^) - Lista arquivos de log
echo    • get_log_content^(file^) - Conteúdo de arquivo específico
echo    • get_recent_logs^(lines^) - Últimas N linhas
echo    • search_logs^(query^) - Pesquisar nos logs
echo    • clear_logs^(^) - Limpar todos os logs
echo    • test_logging_system^(^) - Testar sistema
echo.
echo ℹ️  📁 Arquivos de log serão salvos em: logs\
echo ℹ️  ⚙️  Configure LOG_LEVEL, LOG_FILE_PATH, etc. no arquivo logging.env
echo.
echo ⚠️  Para testar:
echo   1. Execute: target\release\sgp-v4.exe
echo   2. Use os comandos Tauri no frontend
echo   3. Verifique os arquivos em logs\
echo.
echo ⚠️  Para desenvolvimento, use LOG_LEVEL=debug
echo ⚠️  Para produção, use LOG_LEVEL=info e LOG_ENABLE_CONSOLE=false
echo.
echo 🚀 Para executar o aplicativo agora, pressione qualquer tecla...
pause >nul

REM Opcional: executar o aplicativo automaticamente
echo 🚀 Executando o aplicativo...
start "" "target\release\sgp-v4.exe"
