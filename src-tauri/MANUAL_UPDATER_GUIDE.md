# 🔄 Sistema de Atualização Manual (Alternativo)

## 📋 Visão Geral

Este é um sistema de atualização **alternativo e pouco convencional** que permite baixar e instalar atualizações **sem verificação de assinatura minisign**. Útil quando você não tem as chaves configuradas ou quer uma solução mais simples.

## ⚠️ Aviso de Segurança

**Este método NÃO verifica assinaturas digitais**, o que significa menor segurança. Use apenas em ambientes controlados ou quando a segurança não é crítica.

## 🎯 Como Funciona

O sistema manual funciona em 3 etapas:

1. **Verificar atualizações** - Busca um arquivo JSON com informações da versão
2. **Baixar atualização** - Baixa o arquivo de instalação diretamente via HTTP
3. **Instalar atualização** - Executa o instalador apropriado para cada sistema operacional

## 🚀 Uso

### 1. Configurar Servidor de Atualizações

Garanta que o endpoint `https://sgp.finderbit.com.br/update` retorne o manifesto abaixo (formato compatível com o Tauri Updater, mas também aceito pelo modo manual):

```json
{
  "version": "1.0.1",
  "notes": "Correções gerais.",
  "pub_date": "2025-01-01T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5...",
      "url": "https://sgp.finderbit.com.br/update/releases/windows/SGP_1.0.1_x64.msi"
    }
  }
}
```

> Ainda suportamos o manifesto simples (`version`, `url`, `notes`, `date`), mas o formato acima é o oficial em produção.

### 2. No Frontend (React/TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Verificar atualizações
async function checkForUpdates() {
  try {
    const result = await invoke('check_update_manual', {
      manifestUrl: 'https://sgp.finderbit.com.br/update'
    });
    
    if (result.available) {
      console.log('Nova versão disponível:', result.latest_version);
      console.log('URL:', result.url);
      
      // Baixar atualização
      const filePath = await invoke('download_update_manual', {
        updateUrl: result.url
      });
      
      console.log('Arquivo baixado para:', filePath);
      
      // Instalar atualização
      const installResult = await invoke('install_update_manual', {
        filePath: filePath
      });
      
      console.log(installResult);
    }
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
  }
}
```

### 3. Exemplo Completo com UI

```tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';

export function ManualUpdater() {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  const checkUpdates = async () => {
    setIsChecking(true);
    try {
      const result = await invoke('check_update_manual', {
      manifestUrl: 'https://sgp.finderbit.com.br/update'
      });
      
      if (result.available) {
        setUpdateInfo(result);
      } else {
        alert('Você está na versão mais recente!');
      }
    } catch (error) {
      alert(`Erro: ${error}`);
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    if (!updateInfo) return;
    
    setIsDownloading(true);
    try {
      // Baixar
      const filePath = await invoke('download_update_manual', {
        updateUrl: updateInfo.url
      });
      
      setIsDownloading(false);
      setIsInstalling(true);
      
      // Instalar
      await invoke('install_update_manual', {
        filePath: filePath
      });
      
      alert('Atualização instalada! O aplicativo será reiniciado.');
    } catch (error) {
      alert(`Erro: ${error}`);
      setIsDownloading(false);
      setIsInstalling(false);
    }
  };

  return (
    <div>
      <Button onClick={checkUpdates} disabled={isChecking}>
        {isChecking ? 'Verificando...' : 'Verificar Atualizações'}
      </Button>
      
      {updateInfo && (
        <div>
          <p>Nova versão disponível: {updateInfo.latest_version}</p>
          <p>Versão atual: {updateInfo.current_version}</p>
          {updateInfo.notes && <p>Notas: {updateInfo.notes}</p>}
          
          <Button 
            onClick={downloadAndInstall} 
            disabled={isDownloading || isInstalling}
          >
            {isDownloading && 'Baixando...'}
            {isInstalling && 'Instalando...'}
            {!isDownloading && !isInstalling && 'Baixar e Instalar'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

## 📋 Comandos Disponíveis

### `check_update_manual`
Verifica se há atualizações disponíveis.

**Parâmetros:**
- `manifestUrl: string` - URL do arquivo JSON com informações da atualização

**Retorna:**
```json
{
  "available": true,
  "current_version": "1.0.0",
  "latest_version": "1.0.1",
  "url": "https://...",
  "notes": "...",
  "date": "...",
  "signature": "..." 
}
```

### `download_update_manual`
Baixa o arquivo de atualização.

**Parâmetros:**
- `updateUrl: string` - URL do arquivo de atualização

**Retorna:**
- `string` - Caminho do arquivo baixado

### `install_update_manual`
Instala o arquivo baixado.

**Parâmetros:**
- `filePath: string` - Caminho do arquivo baixado

**Retorna:**
- `string` - Mensagem de sucesso

## 🔧 Formatos Suportados

- **Windows**: `.msi` (instalado via `msiexec`)
- **Linux**: `.deb` (instalado via `dpkg` ou `apt`)
- **macOS**: `.tar.gz` (extraído e copiado)

## ⚙️ Configuração do Servidor

### Estrutura de Diretórios Recomendada

```
https://seu-servidor.com/update/
├── manifest.json          # Informações da versão
├── windows-x86_64/
│   └── sgp-v4_1.0.1_x64_en-US.msi
├── linux-x86_64/
│   └── sgp-v4_1.0.1_amd64.deb
└── darwin-x86_64/
    └── sgp-v4_1.0.1_x64.app.tar.gz
```

### Exemplo de manifesto (compatível com Tauri)

```json
{
  "version": "1.0.1",
  "notes": "Correções importantes",
  "pub_date": "2024-01-15T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://seu-servidor.com/update/releases/windows/SGP_1.0.1_x64.msi",
      "signature": "..."
    },
    "linux-x86_64": {
      "url": "https://seu-servidor.com/update/releases/linux/sgp-v4_1.0.1_amd64.deb"
    }
  }
}
```

> Caso você prefira o formato simples (`version`, `url`, `notes`, `date`), ele ainda funciona, mas priorize o formato acima para compartilhar a mesma API do updater oficial.

## 🔒 Considerações de Segurança

1. **Sem verificação de assinatura**: Arquivos podem ser modificados
2. **Use HTTPS**: Sempre use HTTPS para downloads
3. **Valide no servidor**: Implemente validações no servidor
4. **Logs**: Monitore downloads e instalações

## 🆚 Comparação com Tauri Updater Oficial

| Característica | Manual Updater | Tauri Updater |
|---------------|----------------|--------------|
| Verificação de assinatura | ❌ Não | ✅ Sim (minisign) |
| Segurança | ⚠️ Baixa | ✅ Alta |
| Configuração | ✅ Simples | ⚠️ Complexa (chaves) |
| Funcionalidade | ✅ Completa | ✅ Completa |
| Uso recomendado | Desenvolvimento/Testes | Produção |

## 🐛 Troubleshooting

### Erro ao baixar
- Verifique a URL do arquivo
- Confirme que o servidor está acessível
- Verifique permissões de rede

### Erro ao instalar (Windows)
- Execute como administrador
- Verifique se o MSI não está corrompido

### Erro ao instalar (Linux)
- Pode precisar de `sudo`
- Verifique dependências do DEB

## 📚 Próximos Passos

1. Implementar verificação de hash (SHA256) para maior segurança
2. Adicionar progresso de download
3. Implementar rollback em caso de falha
4. Adicionar notificações visuais
