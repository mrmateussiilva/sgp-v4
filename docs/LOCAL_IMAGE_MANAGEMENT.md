# Gerenciamento Local de Imagens - Status Completo

## 📋 Objetivo

Implementar infraestrutura para persistência local de imagens de pedidos, eliminando dependência de base64 em estado e blobs temporários.

## ✅ Implementações Concluídas

### Fase 1: Infraestrutura ✅

**Comandos Rust** (`src-tauri/src/commands/images.rs`):
- ✅ `save_image_locally` - Salva imagem no diretório do app
- ✅ `get_local_image_path` - Busca imagem em cache local
- ✅ `load_local_image_as_base64` - Carrega para preview (não para estado)
- ✅ `read_image_file` - Lê bytes para upload
- ✅ `cache_image_from_url` - Cacheia imagens baixadas
- ✅ `process_and_save_image` - Processa e redimensiona imagens

**Utilitários TypeScript**:
- ✅ `localImageManager.ts` - Funções para gerenciar imagens locais
- ✅ `imagePreview.ts` - Helper para preview compatível (base64 + local_path)
- ✅ `imageUploadHelper.ts` - Helper reutilizável para upload

### Fase 2: Migração dos Formulários ✅

**Formulários Migrados**:
- ✅ `FormPainelCompleto` - Usa `saveImageLocally` e armazena `local_path`
- ✅ `FormLonaProducao` - Usa `saveImageLocally` e armazena `local_path`
- ✅ `FormTotemProducao` - Usa `saveImageLocally` e armazena `local_path`
- ✅ `FormAdesivoProducao` - Usa `saveImageLocally` e armazena `local_path`

**Mudanças Aplicadas**:
- ✅ Substituição de `resizeImage` por `processAndSaveImage`
- ✅ Armazenamento de `local_path` no estado (não base64)
- ✅ Preview via `getImagePreviewUrl` (compatível com base64 e local_path)
- ✅ Loading states durante processamento
- ✅ Compatibilidade com base64 existente (fallback)
- ✅ Fallback para ambiente web (não Tauri)

### Prioridade 1: Cache Local no imageLoader ✅

**Melhorias Implementadas**:
- ✅ Verificar cache local antes de fazer requisições HTTP
- ✅ Cachear automaticamente imagens baixadas via HTTP
- ✅ Melhorar UX ao abrir pedidos existentes
- ✅ Reduzir dependência de rede para renderização

**Fluxo**:
1. Verifica cache local primeiro
2. Se encontrar, carrega do cache
3. Se não encontrar, baixa via HTTP
4. Cacheia automaticamente após download

### Prioridade 2: Upload Assíncrono ✅

**Implementações**:
- ✅ `imageUploader.ts` - Utilitário para upload de imagens
- ✅ `uploadImageToServer` - Faz upload de imagem local para API
- ✅ `uploadMultipleImages` - Upload em paralelo
- ✅ `needsUpload` - Detecta se imagem precisa upload

**Integração em CreateOrderComplete**:
- ✅ Upload assíncrono após salvar pedido
- ✅ Não bloqueia fluxo principal
- ✅ Atualiza referências no banco após upload bem-sucedido
- ✅ Tratamento de erros sem quebrar UX

### Prioridade 3: Integração CreateOrderComplete ✅

**Mudanças**:
- ✅ Função `uploadImagesAsync` para gerenciar uploads
- ✅ Detecção automática de imagens que precisam upload
- ✅ Upload em paralelo de múltiplas imagens
- ✅ Atualização de referências no banco após sucesso
- ✅ Compatibilidade com base64 existente

## 📁 Estrutura de Diretórios

As imagens são salvas em:
- **Linux:** `~/.local/share/sgp-v4/images/`
- **Windows:** `%APPDATA%\sgp-v4\images\`
- **macOS:** `~/Library/Application Support/sgp-v4/images/`

## 🔒 Segurança

- Todas as operações verificam que os caminhos estão dentro do diretório permitido
- Não é possível acessar arquivos fora do diretório de imagens do app
- Validação de tipos MIME

## 🔄 Fluxo Completo

### Criação/Edição de Pedido

1. **Usuário seleciona imagem** → Salva localmente via `processAndSaveImage`
2. **Armazena `local_path` no estado** (não base64)
3. **Preview temporário** via `getImagePreviewUrl` (base64 apenas para exibição)
4. **Salva pedido** → API recebe `local_path` temporariamente
5. **Upload assíncrono** → Envia imagens para servidor em background
6. **Atualiza referências** → Substitui `local_path` por referência do servidor

### Visualização de Pedido

1. **Carrega pedido** → Recebe referência de imagem (URL ou local_path)
2. **Verifica cache local** → Se encontrar, carrega do cache
3. **Se não encontrar** → Baixa via HTTP e cacheia
4. **Exibe imagem** → Usa blob URL temporária para renderização

## ⚠️ Diretrizes Importantes

1. **NUNCA** armazenar base64 em estado do React
2. **SEMPRE** salvar localmente antes de qualquer upload
3. **SEMPRE** usar `local_path` no estado, não base64
4. Base64 apenas para preview temporário ou impressão
5. Upload assíncrono após salvar pedido (não bloqueia UX)

## 🎯 Benefícios Alcançados

1. ✅ **Sem base64 em estado** - Apenas `local_path`
2. ✅ **Processamento no cliente** - Redimensionamento em Rust
3. ✅ **Preview compatível** - Funciona com imagens antigas (base64) e novas (local_path)
4. ✅ **UX melhorada** - Loading states e feedback visual
5. ✅ **Compatibilidade** - Não quebra funcionalidades existentes
6. ✅ **Cache local** - Reduz requisições HTTP
7. ✅ **Upload assíncrono** - Não bloqueia salvamento de pedidos
8. ✅ **Confiabilidade** - Falhas de upload não quebram o fluxo

## 📝 Próximos Passos (Opcional)

### Melhorias Futuras

1. **Sistema de fila para uploads pendentes**
   - Persistir uploads pendentes em caso de falha
   - Retry automático
   - Indicador de status de upload

2. **Otimizações adicionais**
   - Compressão mais agressiva
   - Lazy loading de imagens
   - Limpeza automática de cache antigo

3. **Monitoramento**
   - Logs de upload
   - Métricas de sucesso/falha
   - Dashboard de status

## 🧪 Testes

Para testar a funcionalidade:

```typescript
import { saveImageLocally, loadLocalImageAsBase64 } from '@/utils/localImageManager';
import { uploadImageToServer } from '@/utils/imageUploader';

// Em um componente de teste
const handleFileSelect = async (file: File) => {
  // Salvar localmente
  const metadata = await saveImageLocally(file);
  console.log('Imagem salva em:', metadata.local_path);
  
  // Carregar para preview (temporário)
  const preview = await loadLocalImageAsBase64(metadata.local_path);
  // Usar preview apenas para exibição, não para estado
  
  // Upload assíncrono (após salvar pedido)
  const result = await uploadImageToServer(metadata.local_path, orderItemId);
  if (result.success) {
    console.log('Imagem enviada:', result.server_reference);
  }
};
```

## 🔄 Migração Gradual

Todas as fases foram implementadas sem quebrar funcionalidades existentes. O sistema atual continua funcionando enquanto o novo sistema é usado gradualmente.
