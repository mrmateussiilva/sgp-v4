# 🔧 Correção do Erro de Atualização - Minisign

## ❌ Problema Identificado

O erro `Invalid encoding in minisign data` ocorre porque:

1. **Tauri v2 usa minisign** (não RSA) para assinatura de atualizações
2. A chave pública estava configurada como `"INSERIR_PUBKEY_AQUI"` (inválida)
3. O script `generate_signing_keys.sh` gera chaves RSA, que não são compatíveis com Tauri v2

## ✅ Solução Aplicada

### 1. Updater Temporariamente Desabilitado

O updater foi desabilitado temporariamente no `tauri.conf.json`:
```json
"updater": {
    "active": false,
    ...
}
```

Isso evita o erro ao tentar usar o verificador de atualizações.

### 2. Script para Gerar Chaves Minisign

Foi criado o script `generate_minisign_keys.sh` que gera as chaves corretas para Tauri v2.

## 🚀 Como Configurar Corretamente

### Opção 1: Usar o Script (Recomendado)

```bash
cd src-tauri

# Instalar minisign (se necessário)
# Linux:
sudo apt install minisign
# ou
sudo pacman -S minisign

# macOS:
brew install minisign

# Gerar as chaves
./generate_minisign_keys.sh
```

O script irá:
1. Gerar chaves minisign (`sgp-v4-secret.key` e `sgp-v4-public.key`)
2. Extrair a chave pública no formato correto
3. Criar um arquivo de configuração com a chave pública

### Opção 2: Usar Tauri CLI

```bash
# Instalar Tauri CLI (se necessário)
cargo install tauri-cli

# Gerar chaves
cargo tauri signer generate -w keys/sgp-v4-secret.key

# A chave pública será gerada em keys/sgp-v4-secret.key.pub
```

### 3. Configurar o tauri.conf.json

Após gerar as chaves, atualize o `tauri.conf.json`:

```json
"plugins": {
    "updater": {
        "active": true,
        "dialog": true,
        "endpoints": [
            "https://sgp.finderbit.com.br/update"
        ],
        "pubkey": "COLE_A_CHAVE_PUBLICA_AQUI"
    }
}
```

**Importante:** A chave pública minisign tem o formato:
```
RWT... (base64, sem quebras de linha)
```

### 4. Configurar Assinatura Durante o Build

Para assinar automaticamente as atualizações durante o build:

```bash
# Linux/macOS
export TAURI_SIGNING_PRIVATE_KEY="$(cat keys/sgp-v4-secret.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""  # Se a chave tiver senha

# Windows (PowerShell)
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content keys/sgp-v4-secret.key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

# Fazer o build
cargo tauri build
```

## 📋 Formato da Chave Pública Minisign

A chave pública minisign tem este formato:
```
untrusted comment: minisign public key: ...
RWT... (linha base64)
```

Para o `tauri.conf.json`, use **apenas a linha base64** (sem o comentário).

## ⚠️ Importante

- **Mantenha a chave privada (`sgp-v4-secret.key`) SEGURA**
- **NÃO compartilhe a chave privada**
- A chave pública pode ser compartilhada e incluída no código
- Use a chave privada apenas durante o build para assinar atualizações

## 🔍 Verificação

Após configurar, teste o updater:

1. Ative o updater no `tauri.conf.json`: `"active": true`
2. Faça um novo build
3. Teste a verificação de atualizações no aplicativo

## 📚 Referências

- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater)
- [Minisign Documentation](https://github.com/jedisct1/minisign)

