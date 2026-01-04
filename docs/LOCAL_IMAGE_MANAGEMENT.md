# Gerenciamento Local de Imagens - Fase 1

## 📋 Objetivo

Implementar infraestrutura para persistência local de imagens de pedidos, eliminando dependência de base64 em estado e blobs temporários.

## ✅ Implementação Fase 1

### Comandos Rust Implementados

Localização: `src-tauri/src/commands/images.rs`

#### 1. `save_image_locally`
Salva uma imagem localmente no diretório de dados do app.

**Parâmetros:**
- `image_data: Vec<u8>` - Bytes da imagem (não base64)
- `mime_type: String` - Tipo MIME da imagem

**Retorna:** `ImageMetadata` com informações da imagem salva

**Uso:**
```typescript
const metadata = await saveImageLocally(file);
// metadata.local_path contém o caminho local
```

#### 2. `get_local_image_path`
Obtém o caminho local de uma imagem (cache ou caminho direto).

**Parâmetros:**
- `image_reference: String` - Referência da imagem (caminho local ou referência do servidor)

**Retorna:** `Option<String>` - Caminho local se encontrado

#### 3. `load_local_image_as_base64`
Carrega imagem local como base64 (apenas para preview/impressão).

**⚠️ IMPORTANTE:** NÃO usar para armazenar em estado, apenas para renderização temporária.

**Parâmetros:**
- `local_path: String` - Caminho local da imagem

**Retorna:** Data URL base64 da imagem

#### 4. `read_image_file`
Lê arquivo de imagem como array de bytes (útil para upload).

**Parâmetros:**
- `local_path: String` - Caminho local da imagem

**Retorna:** `Vec<u8>` - Bytes da imagem

#### 5. `cache_image_from_url`
Cacheia uma imagem baixada da URL no diretório local.

**Parâmetros:**
- `image_url: String` - URL da imagem
- `image_data: Vec<u8>` - Dados binários da imagem

**Retorna:** `ImageMetadata` da imagem cacheada

#### 6. `process_and_save_image`
Processa e salva uma imagem (redimensiona se necessário).

**Parâmetros:**
- `image_data: Vec<u8>` - Dados binários da imagem
- `max_width: Option<u32>` - Largura máxima
- `max_height: Option<u32>` - Altura máxima
- `quality: Option<u8>` - Qualidade JPEG (0-100)

**Retorna:** `ImageMetadata` da imagem processada

### Utilitário TypeScript

Localização: `src/utils/localImageManager.ts`

#### Funções Disponíveis

- `saveImageLocally(file: File): Promise<LocalImageMetadata>`
- `getLocalImagePath(imageReference: string): Promise<string | null>`
- `loadLocalImageAsBase64(localPath: string): Promise<string>`
- `readImageFile(localPath: string): Promise<Uint8Array>`
- `cacheImageFromUrl(imageUrl: string, imageData: Uint8Array): Promise<LocalImageMetadata>`
- `processAndSaveImage(...): Promise<LocalImageMetadata>`
- `imageExistsLocally(imageReference: string): Promise<boolean>`

## 📁 Estrutura de Diretórios

As imagens são salvas em:
- **Linux:** `~/.local/share/sgp-v4/images/`
- **Windows:** `%APPDATA%\sgp-v4\images\`
- **macOS:** `~/Library/Application Support/sgp-v4/images/`

## 🔒 Segurança

- Todas as operações verificam que os caminhos estão dentro do diretório permitido
- Não é possível acessar arquivos fora do diretório de imagens do app
- Validação de tipos MIME

## 📝 Próximos Passos (Fase 2)

1. Modificar `FormPainelCompleto` para usar `saveImageLocally` em vez de base64
2. Armazenar `local_path` no estado em vez de base64
3. Manter compatibilidade com base64 durante transição

## 🧪 Testes

Para testar a funcionalidade:

```typescript
import { saveImageLocally, loadLocalImageAsBase64 } from '@/utils/localImageManager';

// Em um componente de teste
const handleFileSelect = async (file: File) => {
  // Salvar localmente
  const metadata = await saveImageLocally(file);
  console.log('Imagem salva em:', metadata.local_path);
  
  // Carregar para preview (temporário)
  const preview = await loadLocalImageAsBase64(metadata.local_path);
  // Usar preview apenas para exibição, não para estado
};
```

## ⚠️ Diretrizes Importantes

1. **NUNCA** armazenar base64 em estado do React
2. **SEMPRE** salvar localmente antes de qualquer upload
3. **SEMPRE** usar `local_path` no estado, não base64
4. Base64 apenas para preview temporário ou impressão
5. Upload assíncrono após salvar pedido

## 🔄 Migração Gradual

A Fase 1 não quebra funcionalidades existentes. O sistema atual continua funcionando enquanto preparamos a Fase 2.

