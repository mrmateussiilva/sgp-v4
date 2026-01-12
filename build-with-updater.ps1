# ========================================
# Script PowerShell para Build com Updater
# SGP v4 - Tauri v2
# ========================================

param(
    [string]$KeyPath = "",
    [string]$Password = "",
    [switch]$SkipBuild = $false
)

# Cores para output
function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

# Banner
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build com Updater - SGP v4" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "src-tauri\Cargo.toml")) {
    Write-Error-Message "❌ Erro: Execute este script a partir do diretório raiz do projeto"
    exit 1
}

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Warning-Message "⚠️  Aviso: Arquivo .env não encontrado"
    Write-Info "📋 Copiando arquivo de exemplo..."
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Success "✅ Arquivo .env criado a partir do exemplo"
        Write-Warning-Message "🔧 Configure o arquivo .env com suas credenciais antes de executar o aplicativo"
    }
}

# Solicitar caminho da chave privada se não foi fornecido
if ([string]::IsNullOrWhiteSpace($KeyPath)) {
    Write-Host ""
    Write-Info "🔑 Configuração da Chave Privada para Assinatura"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    # Verificar se existe uma chave padrão
    $defaultKeyPath = "src-tauri\keys\sgp-v4-secret.key"
    if (Test-Path $defaultKeyPath) {
        Write-Host "📁 Chave padrão encontrada: $defaultKeyPath" -ForegroundColor Gray
        $useDefault = Read-Host "Deseja usar a chave padrão? (S/N) [S]"
        if ([string]::IsNullOrWhiteSpace($useDefault) -or $useDefault -eq "S" -or $useDefault -eq "s") {
            $KeyPath = $defaultKeyPath
        } else {
            $KeyPath = Read-Host "Digite o caminho completo para a chave privada (ou pressione Enter para pular)"
        }
    } else {
        Write-Host "📁 Caminho padrão não encontrado: $defaultKeyPath" -ForegroundColor Gray
        $KeyPath = Read-Host "Digite o caminho completo para a chave privada (ou pressione Enter para pular)"
    }
}

# Se o usuário forneceu um caminho, ler a chave
$privateKey = $null
if (-not [string]::IsNullOrWhiteSpace($KeyPath)) {
    if (Test-Path $KeyPath) {
        try {
            Write-Info "📖 Lendo chave privada de: $KeyPath"
            $privateKey = Get-Content $KeyPath -Raw -Encoding UTF8
            Write-Success "✅ Chave privada carregada com sucesso"
        } catch {
            Write-Error-Message "❌ Erro ao ler a chave privada: $_"
            exit 1
        }
    } else {
        Write-Warning-Message "⚠️  Arquivo de chave não encontrado: $KeyPath"
        Write-Host "💡 Você pode continuar sem assinatura ou fornecer o caminho correto" -ForegroundColor Gray
        $continue = Read-Host "Deseja continuar sem assinatura? (S/N) [N]"
        if ($continue -ne "S" -and $continue -ne "s") {
            exit 1
        }
    }
}

# Solicitar senha se não foi fornecida
if ($null -ne $privateKey -and [string]::IsNullOrWhiteSpace($Password)) {
    Write-Host ""
    Write-Info "🔐 Configuração de Senha"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "💡 Se a chave privada não tiver senha, pressione Enter" -ForegroundColor Gray
    $securePassword = Read-Host "Digite a senha da chave privada (não será exibida)" -AsSecureString
    if ($securePassword.Length -gt 0) {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }
}

# Configurar variáveis de ambiente
Write-Host ""
Write-Info "🔧 Configurando variáveis de ambiente..."
if ($null -ne $privateKey) {
    $env:TAURI_SIGNING_PRIVATE_KEY = $privateKey
    Write-Success "✅ TAURI_SIGNING_PRIVATE_KEY configurada"
} else {
    Write-Warning-Message "⚠️  TAURI_SIGNING_PRIVATE_KEY não configurada (build sem assinatura)"
}

if (-not [string]::IsNullOrWhiteSpace($Password)) {
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $Password
    Write-Success "✅ TAURI_SIGNING_PRIVATE_KEY_PASSWORD configurada"
} else {
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
    Write-Info "ℹ️  TAURI_SIGNING_PRIVATE_KEY_PASSWORD vazia (chave sem senha)"
}

# Limpar variável de senha da memória
if (-not [string]::IsNullOrWhiteSpace($Password)) {
    $Password = $null
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Se SkipBuild foi especificado, apenas configurar as variáveis
if ($SkipBuild) {
    Write-Info "⏭️  Build pulado (apenas configuração de variáveis)"
    Write-Host ""
    Write-Info "📋 Variáveis configuradas. Execute manualmente:"
    Write-Host "   cargo tauri build" -ForegroundColor Yellow
    exit 0
}

# Instalar dependências do frontend
Write-Info "📦 Instalando dependências do frontend..."
if (Test-Path "package.json") {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm install
    } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install
    } else {
        Write-Error-Message "❌ Erro: pnpm ou npm não encontrado. Instale Node.js primeiro."
        exit 1
    }
} else {
    Write-Warning-Message "⚠️  package.json não encontrado. Pulando instalação de dependências."
}

# Build do frontend
Write-Host ""
Write-Info "🏗️  Fazendo build do frontend..."
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm run build
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    npm run build
} else {
    Write-Error-Message "❌ Erro: pnpm ou npm não encontrado."
    exit 1
}

# Build do Tauri
Write-Host ""
Write-Info "🔨 Compilando aplicativo Tauri (com assinatura)..."
Set-Location src-tauri

try {
    cargo tauri build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Success "✅ Build concluído com sucesso!"
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Info "📁 Arquivos gerados em: src-tauri\target\release\"
        
        # Verificar se foi gerado um instalador
        $installerPaths = @(
            "target\release\bundle\msi\*.msi",
            "target\release\bundle\nsis\*.exe",
            "target\release\bundle\nsis\*.msi"
        )
        
        foreach ($pattern in $installerPaths) {
            $installers = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
            if ($installers) {
                Write-Host ""
                Write-Info "📦 Instaladores gerados:"
                foreach ($installer in $installers) {
                    Write-Host "   - $($installer.FullName)" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Error-Message "❌ Erro durante o build"
        Set-Location ..
        exit 1
    }
} catch {
    Write-Error-Message "❌ Erro durante o build: $_"
    Set-Location ..
    exit 1
} finally {
    Set-Location ..
    
    # Limpar variáveis de ambiente (opcional, mas recomendado)
    $env:TAURI_SIGNING_PRIVATE_KEY = $null
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $null
}

Write-Host ""
Write-Info "🎉 Processo concluído!"
