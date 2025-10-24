@echo off
REM Script para testar a funcionalidade DevTools no build de produção no Windows
REM Este script compila o projeto e testa se o DevTools está funcionando

echo 🔧 Testando funcionalidade DevTools no build de produção para Windows...

REM Verificar se estamos no diretório correto
if not exist "Cargo.toml" (
    echo ❌ Este script deve ser executado no diretório src-tauri
    pause
    exit /b 1
)

echo ✅ Diretório correto encontrado

REM Verificar se o Cargo.toml tem a feature devtools
findstr /C:"devtools" Cargo.toml >nul
if %errorlevel% equ 0 (
    echo ✅ Feature 'devtools' encontrada no Cargo.toml
) else (
    echo ❌ Feature 'devtools' não encontrada no Cargo.toml
    pause
    exit /b 1
)

REM Verificar se o arquivo devtools.rs existe
if exist "src\commands\devtools.rs" (
    echo ✅ Arquivo devtools.rs encontrado
) else (
    echo ❌ Arquivo devtools.rs não encontrado
    pause
    exit /b 1
)

REM Verificar se o tauri.conf.json tem as configurações corretas
findstr /C:"keyboardShortcuts" tauri.conf.json >nul
if %errorlevel% equ 0 (
    echo ✅ Atalhos de teclado configurados no tauri.conf.json
) else (
    echo ❌ Atalhos de teclado não configurados no tauri.conf.json
    pause
    exit /b 1
)

REM Verificar se a janela tem label "main"
findstr /C:"label.*main" tauri.conf.json >nul
if %errorlevel% equ 0 (
    echo ✅ Janela principal configurada com label 'main'
) else (
    echo ❌ Janela principal não configurada com label 'main'
    pause
    exit /b 1
)

REM Compilar o projeto em modo debug primeiro
echo ⚠️  Compilando projeto em modo debug...
cargo build
if %errorlevel% equ 0 (
    echo ✅ Compilação debug bem-sucedida
) else (
    echo ❌ Falha na compilação debug
    pause
    exit /b 1
)

REM Compilar o projeto em modo release
echo ⚠️  Compilando projeto em modo release...
cargo build --release
if %errorlevel% equ 0 (
    echo ✅ Compilação release bem-sucedida
) else (
    echo ❌ Falha na compilação release
    pause
    exit /b 1
)

REM Verificar se o binário foi criado
if exist "target\release\sgp-v4.exe" (
    echo ✅ Binário de produção Windows criado com sucesso
) else (
    echo ❌ Binário de produção não encontrado
    pause
    exit /b 1
)

echo ✅ 🎉 Todas as verificações passaram!
echo.
echo ⚠️  Para testar o DevTools no Windows:
echo   1. Execute o aplicativo: target\release\sgp-v4.exe
echo   2. Pressione F12 ou Ctrl+Shift+I para abrir o DevTools
echo   3. Ou use os comandos Tauri no frontend:
echo      - invoke('open_devtools')
echo      - invoke('close_devtools')
echo      - invoke('toggle_devtools')
echo.
echo ⚠️  Nota: O DevTools funcionará tanto em desenvolvimento quanto em produção
echo    no Windows, desde que o aplicativo seja executado com as permissões adequadas.
echo.
echo 🚀 Para executar o aplicativo agora, pressione qualquer tecla...
pause >nul

REM Opcional: executar o aplicativo automaticamente
echo 🚀 Executando o aplicativo...
start "" "target\release\sgp-v4.exe"
