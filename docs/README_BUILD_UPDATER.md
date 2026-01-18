# 🚀 Guia de Build com Updater - PowerShell

Este guia explica como usar o script PowerShell `build-with-updater.ps1` para fazer build do SGP v4 com assinatura de atualizações.

## 📋 Pré-requisitos

- **Windows** (PowerShell 5.1 ou superior)
- **Node.js** e **pnpm** (ou npm) instalados
- **Rust** e **Cargo** instalados
- **Chave privada minisign** para assinatura (opcional)

## 🎯 Uso Básico

### Opção 1: Executar o script interativo (Recomendado)

```powershell
.\build-with-updater.ps1
```

O script irá:
1. Solicitar o caminho da chave privada (ou usar a padrão se existir)
2. Solicitar a senha da chave (se necessário)
3. Configurar as variáveis de ambiente automaticamente
4. Executar o build completo (frontend + Tauri)

### Opção 2: Especificar parâmetros

```powershell
# Com caminho da chave
.\build-with-updater.ps1 -KeyPath "src-tauri\keys\sgp-v4-secret.key"

# Com caminho e senha
.\build-with-updater.ps1 -KeyPath "src-tauri\keys\sgp-v4-secret.key" -Password "sua-senha"

# Apenas configurar variáveis (sem build)
.\build-with-updater.ps1 -KeyPath "src-tauri\keys\sgp-v4-secret.key" -SkipBuild
```

### Opção 3: Build sem assinatura

Se você não tiver a chave privada, pode executar o build sem assinatura:

```powershell
.\build-with-updater.ps1 -KeyPath ""
# Ou simplesmente pressione Enter quando solicitado
```

## 🔑 Configuração de Chaves

### Gerar chaves (se necessário)

Se você ainda não tem as chaves minisign, pode gerá-las:

**Linux/macOS:**
```bash
cd src-tauri
./generate_minisign_keys.sh
```

**Windows (usando Git Bash ou WSL):**
```bash
cd src-tauri
bash generate_minisign_keys.sh
```

**Ou usando Tauri CLI:**
```powershell
cargo install tauri-cli
cargo tauri signer generate -w src-tauri/keys/sgp-v4-secret.key
```

### Caminho padrão das chaves

O script procura automaticamente por chaves em:
- `src-tauri\keys\sgp-v4-secret.key` (chave privada)
- `src-tauri\keys\sgp-v4-public.key` (chave pública)

## 📝 Fluxo do Script

1. **Verificação de ambiente**
   - Verifica se está no diretório correto
   - Verifica/cria arquivo `.env` se necessário

2. **Configuração de chaves**
   - Solicita caminho da chave privada
   - Lê a chave do arquivo
   - Solicita senha (se necessário)

3. **Configuração de variáveis**
   - Configura `TAURI_SIGNING_PRIVATE_KEY`
   - Configura `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

4. **Build**
   - Instala dependências do frontend (pnpm/npm install)
   - Build do frontend (pnpm/npm run build)
   - Build do Tauri com assinatura (cargo tauri build)

## 🔒 Segurança

- A senha é solicitada de forma segura (não aparece na tela)
- As variáveis de ambiente são limpas após o build
- ⚠️ **NUNCA compartilhe a chave privada**
- ⚠️ **NUNCA faça commit da chave privada no Git**

## 📁 Estrutura de Arquivos

```
sgp_v4/
├── build-with-updater.ps1    # Script PowerShell
├── src-tauri/
│   ├── keys/
│   │   ├── sgp-v4-secret.key    # Chave privada (NÃO compartilhar!)
│   │   └── sgp-v4-public.key    # Chave pública (pode compartilhar)
│   └── tauri.conf.json          # Configuração do updater
└── .env                         # Variáveis de ambiente
```

## 🐛 Troubleshooting

### Erro: "Execute este script a partir do diretório raiz do projeto"
- Certifique-se de executar o script na raiz do projeto (onde está `src-tauri/`)

### Erro: "pnpm ou npm não encontrado"
- Instale Node.js: https://nodejs.org/
- Instale pnpm: `npm install -g pnpm`

### Erro: "cargo não encontrado"
- Instale Rust: https://www.rust-lang.org/tools/install
- Reinicie o terminal após instalação

### Build sem assinatura
- Se você não tem a chave privada, pode fazer build sem assinatura
- O updater não funcionará, mas o app será gerado normalmente

## 📚 Referências

- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater)
- [Minisign Documentation](https://github.com/jedisct1/minisign)
- [Documentação do Updater no projeto](src-tauri/UPDATER_FIX_MINISIGN.md)
