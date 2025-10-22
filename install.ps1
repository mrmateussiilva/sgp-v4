# Script de instalação e configuração do SGP v4 para Windows (PowerShell)
# Este script instala o aplicativo e configura o arquivo .env

Write-Host "🚀 Instalando SGP v4..." -ForegroundColor Green

# Verificar se estamos executando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if ($isAdmin) {
    Write-Host "📦 Instalando aplicativo no sistema..." -ForegroundColor Yellow
    
    # Instalar o pacote MSI
    $msiFile = "sgp-sistema-de-gerenciamento-de-pedidos_1.0.0_x64_en-US.msi"
    if (Test-Path $msiFile) {
        Write-Host "Instalando $msiFile..." -ForegroundColor Cyan
        Start-Process msiexec -ArgumentList "/i `"$msiFile`" /quiet" -Wait
        Write-Host "✅ Aplicativo instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Arquivo .msi não encontrado!" -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit 1
    }
    
    # Criar diretório de configuração do sistema
    $systemConfigDir = "C:\Program Files\SGP Sistema de Gerenciamento de Pedidos"
    if (!(Test-Path $systemConfigDir)) {
        New-Item -ItemType Directory -Path $systemConfigDir -Force | Out-Null
    }
    
    Write-Host "📋 Configuração do banco de dados:" -ForegroundColor Cyan
    Write-Host "   O arquivo .env deve ser colocado em um dos seguintes locais:" -ForegroundColor White
    Write-Host "   1. $systemConfigDir\.env" -ForegroundColor Gray
    Write-Host "   2. `$env:APPDATA\sgp\.env" -ForegroundColor Gray
    Write-Host "   3. `$env:LOCALAPPDATA\sgp\.env" -ForegroundColor Gray
    Write-Host "   4. `$env:USERPROFILE\Documents\sgp\.env" -ForegroundColor Gray
    Write-Host "   5. Diretório onde o aplicativo é executado" -ForegroundColor Gray
    
} else {
    Write-Host "👤 Instalação para usuário atual..." -ForegroundColor Yellow
    
    # Criar diretórios de configuração do usuário
    $userConfigDirs = @(
        "$env:APPDATA\sgp",
        "$env:LOCALAPPDATA\sgp",
        "$env:USERPROFILE\Documents\sgp"
    )
    
    foreach ($dir in $userConfigDirs) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "Criado diretório: $dir" -ForegroundColor Green
        }
    }
    
    Write-Host "📋 Configuração do banco de dados:" -ForegroundColor Cyan
    Write-Host "   O arquivo .env deve ser colocado em um dos seguintes locais:" -ForegroundColor White
    Write-Host "   1. `$env:APPDATA\sgp\.env" -ForegroundColor Gray
    Write-Host "   2. `$env:LOCALAPPDATA\sgp\.env" -ForegroundColor Gray
    Write-Host "   3. `$env:USERPROFILE\Documents\sgp\.env" -ForegroundColor Gray
    Write-Host "   4. Diretório onde o aplicativo é executado" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔧 Para configurar o banco de dados:" -ForegroundColor Cyan
Write-Host "   1. Copie o arquivo env.example para .env" -ForegroundColor White
Write-Host "   2. Configure suas credenciais do PostgreSQL" -ForegroundColor White
Write-Host "   3. Coloque o arquivo .env em um dos locais listados acima" -ForegroundColor White
Write-Host ""
Write-Host "📄 Exemplo de configuração (.env):" -ForegroundColor Cyan
Write-Host "   DATABASE_URL=postgresql://usuario:senha@localhost:5432/sgp_v4" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Instalação concluída!" -ForegroundColor Green
Write-Host "🚀 Execute: SGP Sistema de Gerenciamento de Pedidos" -ForegroundColor Green
Write-Host ""
Read-Host "Pressione Enter para sair"
