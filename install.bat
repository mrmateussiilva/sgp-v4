@echo off
REM Script de instalação e configuração do SGP v4 para Windows
REM Este script instala o aplicativo e configura o arquivo .env

echo 🚀 Instalando SGP v4...

REM Verificar se estamos executando como administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo 📦 Instalando aplicativo no sistema...
    
    REM Instalar o pacote MSI
    if exist "sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_x64_en-US.msi" (
        msiexec /i "sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_x64_en-US.msi" /quiet
        echo ✅ Aplicativo instalado com sucesso!
    ) else (
        echo ❌ Arquivo .msi não encontrado!
        pause
        exit /b 1
    )
    
    REM Criar diretório de configuração do sistema
    if not exist "C:\Program Files\SGP Sistema de Gerenciamento de Pedidos" (
        mkdir "C:\Program Files\SGP Sistema de Gerenciamento de Pedidos"
    )
    
    echo 📋 Configuração do banco de dados:
    echo    O arquivo .env deve ser colocado em um dos seguintes locais:
    echo    1. C:\Program Files\SGP Sistema de Gerenciamento de Pedidos\.env
    echo    2. %%APPDATA%%\sgp\.env
    echo    3. %%LOCALAPPDATA%%\sgp\.env
    echo    4. %%USERPROFILE%%\Documents\sgp\.env
    echo    5. Diretório onde o aplicativo é executado
    
) else (
    echo 👤 Instalação para usuário atual...
    
    REM Criar diretórios de configuração do usuário
    if not exist "%APPDATA%\sgp" mkdir "%APPDATA%\sgp"
    if not exist "%LOCALAPPDATA%\sgp" mkdir "%LOCALAPPDATA%\sgp"
    if not exist "%USERPROFILE%\Documents\sgp" mkdir "%USERPROFILE%\Documents\sgp"
    
    echo 📋 Configuração do banco de dados:
    echo    O arquivo .env deve ser colocado em um dos seguintes locais:
    echo    1. %%APPDATA%%\sgp\.env
    echo    2. %%LOCALAPPDATA%%\sgp\.env
    echo    3. %%USERPROFILE%%\Documents\sgp\.env
    echo    4. Diretório onde o aplicativo é executado
)

echo.
echo 🔧 Para configurar o banco de dados:
echo    1. Copie o arquivo env.example para .env
echo    2. Configure suas credenciais do PostgreSQL
echo    3. Coloque o arquivo .env em um dos locais listados acima
echo.
echo 📄 Exemplo de configuração (.env):
echo    DATABASE_URL=postgresql://usuario:senha@localhost:5432/sgp_v4
echo.
echo ✅ Instalação concluída!
echo 🚀 Execute: SGP Sistema de Gerenciamento de Pedidos
echo.
pause
