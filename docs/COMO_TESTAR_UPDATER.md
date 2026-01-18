# 🧪 Como Testar o Updater - Guia Rápido

## ⚠️ PROBLEMA IDENTIFICADO

O arquivo `updater/latest.json` tem o campo `signature` como **URL**, mas o Tauri espera uma **string base64** da assinatura minisign.

**Formato atual (INCORRETO):**
```json
"signature": "https://github.com/.../arquivo.sig"
```

**Formato correto:**
```json
"signature": "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5..."
```

## 🔧 Correção Necessária

1. Baixe o arquivo `.sig` do release
2. Leia o conteúdo do arquivo `.sig` (é texto base64)
3. Cole o conteúdo no campo `signature` do `latest.json`

## 🧪 Métodos de Teste

### Método 1: Teste Automático (Mais Fácil)

1. **Inicie o app versão 1.0.5**
2. **Abra o DevTools** (F12)
3. **Aguarde 3 segundos** - a verificação automática vai executar
4. **Verifique o console** - você deve ver:
   ```
   [Updater] Verificando atualizações...
   [Updater] Nova versão disponível: 1.0.6
   ```

### Método 2: Teste Manual na Página

1. No app, vá para: **Configurações > Verificar Atualização**
2. Ou acesse: `#/update-status`
3. Clique em **"Verificar Novamente"**
4. Se houver atualização, aparecerá um botão **"Baixar e Instalar Atualização"**

### Método 3: Teste via Console (Avançado)

1. Abra o DevTools (F12)
2. Cole o script do arquivo `test-updater-console.js` no console
3. Pressione Enter
4. Veja os resultados

## 📋 Checklist de Validação

Antes de testar, verifique:

- [ ] App versão **1.0.5** instalada
- [ ] Release **1.0.6** publicada no GitHub
- [ ] Arquivos MSI e .sig disponíveis no release
- [ ] `latest.json` com versão **1.0.6**
- [ ] Campo `signature` é **base64** (não URL!)
- [ ] Endpoint acessível: https://raw.githubusercontent.com/mrmateussiilva/sgp-v4/main/updater/latest.json

## 🐛 Troubleshooting

### "Aplicação está atualizada" mesmo com 1.0.6 disponível

**Causas:**
- Versão no `latest.json` não é maior que 1.0.5
- Formato do JSON incorreto
- Assinatura inválida (URL em vez de base64)

**Solução:**
- Verifique se `version` é `"1.0.6"` (string, não número)
- Verifique se `signature` é base64, não URL

### "Erro ao verificar atualizações"

**Causas:**
- Endpoint inacessível
- JSON inválido
- Problema de rede

**Solução:**
- Teste a URL no navegador
- Valide o JSON em https://jsonlint.com
- Verifique conexão com internet

### "Erro ao instalar atualização"

**Causas:**
- Assinatura inválida
- MSI corrompido
- Permissões insuficientes

**Solução:**
- Verifique se a assinatura foi gerada com a chave privada correta
- Baixe o MSI manualmente e teste
- Execute como administrador se necessário

## 🚀 Teste Rápido (1 minuto)

1. Abra o app 1.0.5
2. Pressione F12
3. Vá na aba "Console"
4. Aguarde 3 segundos
5. Procure por: `[Updater] Verificando atualizações...`

Se aparecer `[Updater] Nova versão disponível: 1.0.6` = ✅ Funcionando!
Se aparecer `[Updater] Aplicação está atualizada` = ⚠️ Verifique o `latest.json`
