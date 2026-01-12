# 🧪 Guia de Teste do Updater Oficial do Tauri

## 📋 Pré-requisitos

1. **App versão 1.0.5** instalada e funcionando
2. **Release 1.0.6** publicada no GitHub com:
   - MSI: `SGP.-.Sistema.de.Gerenciamento.de.Pedidos_1.0.6_x64_en-US.msi`
   - Assinatura: `SGP.-.Sistema.de.Gerenciamento.de.Pedidos_1.0.6_x64_en-US.msi.sig`
3. **latest.json** atualizado no repositório apontando para 1.0.6

## 🔍 Verificação Rápida (Console do App)

### 1. Abrir o Console do Desenvolvimento

No app, pressione `F12` ou `Ctrl+Shift+I` para abrir o DevTools.

### 2. Verificar Logs Automáticos

Após 3 segundos do app iniciar, você deve ver no console:

```
[Updater] Verificando atualizações...
```

Se houver atualização disponível:
```
[Updater] Nova versão disponível: 1.0.6
[Updater] Versão atual: 1.0.5
[Updater] Notas: Pequena melhoria e ajustes internos
```

Se não houver atualização:
```
[Updater] Aplicação está atualizada
```

### 3. Testar Manualmente via Console

No console do DevTools, execute:

```javascript
// Importar a função check
import { check } from '@tauri-apps/plugin-updater';

// Verificar atualizações
const update = await check({ target: undefined });

if (update) {
  console.log('Atualização disponível:', update.version);
  console.log('Versão atual:', update.currentVersion);
  console.log('Notas:', update.body);
  
  // Para instalar (cuidado: vai reiniciar o app!)
  // await update.downloadAndInstall();
  // await relaunch();
} else {
  console.log('Aplicação está atualizada');
}
```

## 🧪 Teste Completo (Passo a Passo)

### Passo 1: Verificar Configuração

1. Abra `src-tauri/tauri.conf.json`
2. Verifique:
   - `plugins.updater.active` = `true` ✅
   - `plugins.updater.endpoints` aponta para GitHub Raw ✅
   - `plugins.updater.dialog` = `true` ✅
   - `plugins.updater.pubkey` está configurada ✅

### Passo 2: Verificar latest.json

1. Acesse: https://raw.githubusercontent.com/mrmateussiilva/sgp-v4/main/updater/latest.json
2. Verifique se:
   - `version` = `"1.0.6"` (maior que 1.0.5)
   - `platforms.windows-x86_64.url` aponta para o MSI correto
   - `platforms.windows-x86_64.signature` contém a assinatura base64 (não URL!)

### Passo 3: Testar no App

1. **Iniciar o app versão 1.0.5**
2. **Abrir DevTools** (F12)
3. **Aguardar 3 segundos** - verificação automática
4. **Verificar logs no console**

### Passo 4: Testar Página de Atualização

1. No app, navegue para: **Configurações > Verificar Atualização**
2. Ou acesse diretamente: `#/update-status`
3. Clique em **"Verificar Novamente"**
4. Se houver atualização, clique em **"Baixar e Instalar Atualização"**

### Passo 5: Verificar Diálogo Automático

Com `dialog: true`, quando uma atualização é detectada, o Tauri deve exibir automaticamente um diálogo perguntando se deseja atualizar.

## 🐛 Troubleshooting

### Problema: "Aplicação está atualizada" mesmo com versão nova

**Causas possíveis:**
1. Versão no `latest.json` não é maior que a atual
2. Formato do `latest.json` incorreto
3. Endpoint inacessível
4. Assinatura inválida

**Solução:**
- Verifique se `version` no `latest.json` é `"1.0.6"` (maior que `"1.0.5"`)
- Verifique se o endpoint está acessível no navegador
- Verifique os logs do console para erros

### Problema: "Erro ao verificar atualizações"

**Causas possíveis:**
1. Endpoint inacessível
2. Formato JSON inválido
3. Problema de rede

**Solução:**
- Teste a URL no navegador: https://raw.githubusercontent.com/mrmateussiilva/sgp-v4/main/updater/latest.json
- Verifique se o JSON é válido
- Verifique conexão com internet

### Problema: "Erro ao instalar atualização"

**Causas possíveis:**
1. Assinatura inválida
2. Arquivo MSI corrompido
3. Permissões insuficientes

**Solução:**
- Verifique se a assinatura foi gerada com a chave privada correta
- Verifique se o MSI está acessível e não corrompido
- Tente executar como administrador

## 📝 Formato Correto do latest.json

```json
{
  "version": "1.0.6",
  "notes": "Pequena melhoria e ajustes internos",
  "pub_date": "2026-01-10T22:30:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/mrmateussiilva/sgp-v4/releases/download/1.0.6/SGP.-.Sistema.de.Gerenciamento.de.Pedidos_1.0.6_x64_en-US.msi",
      "signature": "BASE64_SIGNATURE_AQUI"
    }
  }
}
```

**⚠️ IMPORTANTE:** O campo `signature` deve ser uma **string base64**, não uma URL!

## 🔧 Teste Rápido via Script

Crie um arquivo `test-updater.js` no console do DevTools:

```javascript
(async () => {
  const { check } = await import('@tauri-apps/plugin-updater');
  
  console.log('🔍 Verificando atualizações...');
  const update = await check({ target: undefined });
  
  if (update) {
    console.log('✅ Atualização encontrada!');
    console.log('Versão:', update.version);
    console.log('Versão atual:', update.currentVersion);
    console.log('Notas:', update.body);
    console.log('\nPara instalar, execute:');
    console.log('await update.downloadAndInstall();');
  } else {
    console.log('✅ Aplicação está atualizada');
  }
})();
```

## 📊 Checklist de Validação

- [ ] App versão 1.0.5 instalada
- [ ] Release 1.0.6 publicada no GitHub
- [ ] MSI e .sig disponíveis no release
- [ ] latest.json atualizado com versão 1.0.6
- [ ] signature no latest.json é base64 (não URL)
- [ ] Endpoint acessível no navegador
- [ ] Console mostra verificação após 3 segundos
- [ ] Diálogo aparece quando atualização disponível
- [ ] Download e instalação funcionam
- [ ] App reinicia após atualização
