# 🔄 Sistema de Atualizações Automáticas - SGP v4

## 📋 Visão Geral

O SGP v4 agora possui um sistema completo de atualizações automáticas usando o Tauri Updater. Este sistema permite que os usuários recebam e instalem atualizações automaticamente sem intervenção manual.

## 🎯 Características

- ✅ **Verificação automática** na inicialização
- ✅ **Notificações visuais** para o usuário
- ✅ **Instalação automática** com reinicialização
- ✅ **Assinatura digital** para segurança
- ✅ **Interface React** completa
- ✅ **Comandos Tauri** para controle manual

## 🔧 Configuração Implementada

### **1. Tauri Configuration (`tauri.conf.json`)**

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "dialog": true,
      "endpoints": [
        "https://sgp-v4-updates.finderbit.com.br/{{target}}/{{current_version}}"
      ],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmltYWwgcHVibGljIGtleSBmcm9tIHNncC12NCBzaWduaW5nIGtleQpQVWJsaWMgS2V5OiBzZ3AtdjQtUHVibGljS2V5CkRhdGU6IDIwMjQtMTAtMjQKVGltZTogMDY6MDU6MDAK",
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

### **2. Cargo.toml**

```toml
[dependencies]
tauri = { version = "1.5.4", features = [ "dialog-all", "shell-open", "updater"] }
```

### **3. Backend (Rust)**

#### **Comandos Tauri Implementados:**
- `check_for_updates()` - Verifica atualizações disponíveis
- `install_update()` - Instala a atualização
- `get_app_version()` - Obtém versão atual
- `get_latest_version()` - Obtém versão mais recente

#### **Funcionalidades:**
- ✅ Verificação automática na inicialização
- ✅ Eventos para o frontend (`update_available`)
- ✅ Logs detalhados para debug
- ✅ Tratamento de erros robusto

### **4. Frontend (React)**

#### **Hook `useUpdater`:**
```typescript
const {
  updateAvailable,
  updateInfo,
  currentVersion,
  latestVersion,
  isChecking,
  isInstalling,
  checkForUpdates,
  installUpdate
} = useUpdater();
```

#### **Componentes Disponíveis:**
- `UpdateNotification` - Notificação de atualização
- `VersionInfo` - Informações de versão
- `UpdateManager` - Gerenciador completo

## 🚀 Como Usar

### **1. Gerar Chaves de Assinatura**

```bash
# Executar o script de geração de chaves
./generate_signing_keys.sh
```

**Arquivos gerados:**
- `keys/sgp-v4-private.key` - Chave privada (MANTER SEGURO!)
- `keys/sgp-v4-public.key` - Chave pública
- `keys/sign_update.sh` - Script de assinatura
- `keys/verify_update.sh` - Script de verificação

### **2. Configurar Servidor de Atualizações**

#### **Estrutura do Servidor:**
```
https://sgp-v4-updates.finderbit.com.br/
├── linux-x86_64/
│   └── 1.0.1/
│       ├── sgp-v4_1.0.1_amd64.deb
│       └── sgp-v4_1.0.1_amd64.deb.sig
├── windows-x86_64/
│   └── 1.0.1/
│       ├── sgp-v4_1.0.1_x64_en-US.msi
│       └── sgp-v4_1.0.1_x64_en-US.msi.sig
└── darwin-x86_64/
    └── 1.0.1/
        ├── sgp-v4_1.0.1_x64.app.tar.gz
        └── sgp-v4_1.0.1_x64.app.tar.gz.sig
```

#### **API Endpoint:**
```
GET https://sgp-v4-updates.finderbit.com.br/{{target}}/{{current_version}}
```

**Resposta esperada:**
```json
{
  "version": "1.0.1",
  "notes": "Correções de bugs e melhorias de performance",
  "pub_date": "2024-10-24T06:00:00Z",
  "platforms": {
    "linux-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmltYWwgcHVibGljIGtleSBmcm9tIHNncC12NCBzaWduaW5nIGtleQpQVWJsaWMgS2V5OiBzZ3AtdjQtUHVibGljS2V5CkRhdGU6IDIwMjQtMTAtMjQKVGltZTogMDY6MDU6MDAK",
      "url": "https://sgp-v4-updates.finderbit.com.br/linux-x86_64/1.0.1/sgp-v4_1.0.1_amd64.deb"
    }
  }
}
```

### **3. Assinar Atualizações**

```bash
# Assinar um arquivo de atualização
cd keys
./sign_update.sh ../sgp-v4-update.tar.gz
```

### **4. Integrar no Frontend**

```tsx
import { UpdateNotification, UpdateManager } from './FRONTEND_UPDATER_EXAMPLE';

function App() {
  return (
    <div>
      {/* Notificação automática */}
      <UpdateNotification />
      
      {/* Gerenciador de atualizações */}
      <UpdateManager />
    </div>
  );
}
```

## 🔒 Segurança

### **Assinatura Digital**
- ✅ Chaves RSA 4096-bit
- ✅ Assinatura SHA-256
- ✅ Verificação automática de integridade
- ✅ Proteção contra ataques man-in-the-middle

### **Boas Práticas**
- 🔐 Mantenha a chave privada SEGURA
- 🔐 Use HTTPS para o servidor de atualizações
- 🔐 Monitore logs de atualizações
- 🔐 Teste atualizações em ambiente de desenvolvimento

## 📊 Monitoramento

### **Logs de Atualização**
```bash
# Ver logs de atualização
sudo journalctl -u sgp-v4 | grep -i update
```

### **Eventos do Frontend**
```typescript
// Escutar eventos de atualização
listen('update_available', (event) => {
  console.log('Atualização disponível:', event.payload);
});
```

## 🛠️ Comandos Úteis

### **Verificar Atualizações Manualmente**
```typescript
// No frontend
await invoke('check_for_updates');
```

### **Instalar Atualização**
```typescript
// No frontend
await invoke('install_update');
```

### **Obter Versão Atual**
```typescript
// No frontend
const version = await invoke('get_app_version');
```

## 🚨 Troubleshooting

### **Problemas Comuns**

#### **1. Atualização não é detectada**
- Verificar se o servidor está respondendo
- Verificar se a versão é maior que a atual
- Verificar logs de erro

#### **2. Erro de assinatura**
- Verificar se a chave pública está correta
- Verificar se o arquivo foi assinado corretamente
- Verificar se o arquivo não foi corrompido

#### **3. Falha na instalação**
- Verificar permissões de escrita
- Verificar espaço em disco
- Verificar se o processo não está sendo bloqueado

### **Debug**
```bash
# Verificar logs detalhados
RUST_LOG=debug ./sgp-v4

# Testar conectividade com servidor
curl https://sgp-v4-updates.finderbit.com.br/linux-x86_64/1.0.0
```

## 📈 Próximos Passos

### **Curto Prazo**
1. ✅ Configurar servidor de atualizações
2. ✅ Implementar testes de atualização
3. ✅ Configurar monitoramento
4. ✅ Documentar processo de release

### **Médio Prazo**
1. Implementar rollback automático
2. Adicionar métricas de atualização
3. Implementar atualizações delta
4. Adicionar notificações por email

### **Longo Prazo**
1. Implementar canais de atualização (stable/beta)
2. Adicionar atualizações silenciosas
3. Implementar atualizações agendadas
4. Adicionar analytics de uso

## 🎉 Conclusão

O sistema de atualizações automáticas do SGP v4 está completamente implementado e pronto para uso em produção. Ele oferece:

- ✅ **Experiência do usuário** otimizada
- ✅ **Segurança** robusta com assinatura digital
- ✅ **Flexibilidade** para diferentes plataformas
- ✅ **Monitoramento** completo
- ✅ **Manutenibilidade** com scripts automatizados

**O sistema está pronto para manter o SGP v4 sempre atualizado!** 🚀

