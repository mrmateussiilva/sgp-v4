import { apiClient, getApiUrl } from '../services/apiClient';
import { getLocalImagePath, loadLocalImageAsBase64, cacheImageFromUrl } from './localImageManager';
import { isTauri } from './isTauri';

/**
 * Cache de URLs de blob para evitar recarregar a mesma imagem múltiplas vezes
 */
const blobUrlCache = new Map<string, string>();

/**
 * Cache de blobs para evitar recarregar a mesma imagem múltiplas vezes
 */
const blobCache = new Map<string, Blob>();

/**
 * Exporta o cache de blobs para uso externo (ex: validação de tamanho)
 */
export { blobCache };

/**
 * Detecta se é um local_path de outro sistema (não do sistema atual)
 * @param path - Caminho a verificar
 * @returns true se for local_path de outro sistema
 */
function isOtherSystemLocalPath(path: string): boolean {
  // Se contém caminho absoluto do Windows (C:\, D:\, etc)
  if (/^[A-Z]:[\\/]/.test(path)) {
    return true;
  }
  // Se contém caminho absoluto do Linux/Mac começando com /
  // mas não é URL
  if (path.startsWith('/') && !path.startsWith('http')) {
    // Verificar se é um caminho de sistema (não relativo da API)
    const systemPaths = [
      /^\/Users\//,
      /^\/home\//,
      /^\/root\//,
      /^C:[\\/]/,
      /^D:[\\/]/,
    ];
    return systemPaths.some(regex => regex.test(path));
  }
  return false;
}

/**
 * Normaliza uma URL de imagem, substituindo localhost pela URL da API configurada
 * @param imagePath - Caminho ou URL da imagem
 * @returns URL normalizada
 */
export function normalizeImageUrl(imagePath: string): string {
  const apiUrl = getApiUrl();
  
  // Se for base64, retornar diretamente
  if (imagePath.startsWith('data:image/')) {
    return imagePath;
  }

  // Normalizar o caminho
  let normalized = imagePath.replace(/\\/g, '/').trim();
  
  // Se for local_path de outro sistema, extrair apenas o nome do arquivo
  // e tentar buscar no servidor (assumindo que o servidor salva pelo nome do arquivo)
  if (isOtherSystemLocalPath(normalized)) {
    console.warn('[normalizeImageUrl] ⚠️ Local path de outro sistema detectado:', normalized);
    // Extrair apenas o nome do arquivo
    const fileName = normalized.split(/[\\/]/).pop();
    if (fileName) {
      // Tentar buscar como caminho relativo da API
      // Ajustar conforme a estrutura de diretórios da API
      normalized = `/images/${fileName}`; // ou o caminho correto da API
      console.log('[normalizeImageUrl] 🔄 Convertendo para caminho do servidor:', normalized);
    }
  }
  
  // Se for protocolo tauri://localhost, converter para http usando a API configurada
  if (normalized.startsWith('tauri://localhost/') && apiUrl) {
    try {
      // Extrair o caminho após tauri://localhost/
      const path = normalized.replace(/^tauri:\/\/localhost\/?/, '');
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      // Construir nova URL usando a base da API configurada
      const apiBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      normalized = apiBase + cleanPath;
      console.log('[normalizeImageUrl] 🔄 Convertendo tauri://localhost:', {
        original: imagePath,
        normalized
      });
      return normalized;
    } catch (e) {
      console.warn('[normalizeImageUrl] ⚠️ Erro ao converter tauri://localhost:', e);
    }
  }
  
  // Se já for URL completa (http/https)
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    // Se contém localhost, substituir pela URL da API configurada
    if (normalized.includes('localhost') && apiUrl) {
      // Extrair o caminho da URL original
      try {
        const urlObj = new URL(normalized);
        const path = urlObj.pathname + urlObj.search;
        // Construir nova URL usando a base da API configurada
        const apiBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        normalized = apiBase + path;
        console.log('[normalizeImageUrl] 🔄 Substituindo localhost:', {
          original: imagePath,
          normalized
        });
      } catch (e) {
        console.warn('[normalizeImageUrl] ⚠️ Erro ao normalizar URL:', e);
      }
    }
    return normalized;
  }

  // Para caminhos relativos, retornar como está (será tratado depois)
  return normalized;
}

/**
 * Carrega uma imagem autenticada e retorna uma blob URL
 * @param imagePath - Caminho da imagem (pode ser relativo ou absoluto, local_path, base64 ou URL)
 * @returns Promise com a blob URL da imagem
 */
export async function loadAuthenticatedImage(imagePath: string): Promise<string> {
  // Normalizar SEMPRE primeiro - usar como chave única consistente do cache
  const normalized = normalizeImageUrl(imagePath);
  
  // Verificar cache usando apenas caminho normalizado
  if (blobUrlCache.has(normalized)) {
    return blobUrlCache.get(normalized)!;
  }

  try {
    // Se for base64, retornar diretamente
    if (normalized.startsWith('data:image/')) {
      return normalized;
    }

    // NOVO: Se estiver em Tauri, verificar cache local primeiro
    // Mas apenas se NÃO for local_path de outro sistema
    if (isTauri() && !isOtherSystemLocalPath(normalized)) {
      const localPath = await getLocalImagePath(normalized);
      if (localPath) {
        console.log('[loadAuthenticatedImage] ✅ Imagem encontrada no cache local:', localPath);
        // Carregar do cache local e converter para blob URL para compatibilidade
        const base64 = await loadLocalImageAsBase64(localPath);
        // Converter base64 para blob URL
        const response = await fetch(base64);
        const blob = await response.blob();
        
        // Validação de tamanho: avisar se a imagem for muito grande (50MB - limite do backend)
        const MAX_IMAGE_SIZE_MB = 50;
        const sizeMB = blob.size / (1024 * 1024);
        if (sizeMB > MAX_IMAGE_SIZE_MB) {
          console.warn(`[loadAuthenticatedImage] ⚠️ Imagem muito grande detectada: ${sizeMB.toFixed(2)}MB (máximo recomendado: ${MAX_IMAGE_SIZE_MB}MB). Isso pode causar problemas de performance.`);
        }
        
        const blobUrl = URL.createObjectURL(blob);
        // Salvar usando apenas caminho normalizado (chave única)
        blobUrlCache.set(normalized, blobUrl);
        blobCache.set(normalized, blob);
        return blobUrl;
      }
    }

    // Se já for URL completa (http/https), usar diretamente sem baseURL
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      console.log('[loadAuthenticatedImage] 📥 Carregando imagem de URL completa:', normalized);
      const response = await apiClient.get(normalized, {
        responseType: 'blob',
        baseURL: '', // Não usar baseURL para URLs completas
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
      
      // Validação de tamanho: avisar se a imagem for muito grande (10MB)
      const MAX_IMAGE_SIZE_MB = 10;
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB > MAX_IMAGE_SIZE_MB) {
        console.warn(`[loadAuthenticatedImage] ⚠️ Imagem muito grande detectada: ${sizeMB.toFixed(2)}MB (máximo recomendado: ${MAX_IMAGE_SIZE_MB}MB). Isso pode causar problemas de performance.`);
      }
      
      const blobUrl = URL.createObjectURL(blob);
      // Salvar usando apenas caminho normalizado (chave única)
      blobUrlCache.set(normalized, blobUrl);
      blobCache.set(normalized, blob);
      
      // NOVO: Se estiver em Tauri, cachear a imagem localmente para próximas vezes
      if (isTauri() && response.data) {
        try {
          // Converter blob para Uint8Array
          const arrayBuffer = await blob.arrayBuffer();
          const imageData = new Uint8Array(arrayBuffer);
          
          // Cachear localmente usando caminho normalizado
          await cacheImageFromUrl(normalized, imageData);
          console.log('[loadAuthenticatedImage] 💾 Imagem cacheada localmente:', normalized);
        } catch (cacheError) {
          // Não falhar se o cache falhar, apenas logar
          console.warn('[loadAuthenticatedImage] ⚠️ Erro ao cachear imagem localmente:', cacheError);
        }
      }
      
      return blobUrl;
    }

    // Para caminhos relativos, usar o apiClient com baseURL configurado
    // O apiClient já tem baseURL configurado, então passamos apenas o caminho relativo
    let relativePath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    
    // Se o caminho começa com /pedidos/tmp/ ou /pedidos/ seguido de número, usar endpoint /media/
    // O endpoint /pedidos/media/{file_path:path} serve arquivos do diretório media
    // IMPORTANTE: Verificar tanto o normalized quanto o relativePath para capturar todos os casos
    const isPedidosTmp = relativePath.startsWith('/pedidos/tmp/') || normalized.startsWith('pedidos/tmp/');
    const isPedidosId = /^\/pedidos\/\d+\//.test(relativePath) || /^pedidos\/\d+\//.test(normalized);
    
    if (isPedidosTmp || isPedidosId) {
      // Construir caminho para o endpoint /pedidos/media/{file_path}
      // O file_path deve ser o caminho relativo dentro do diretório media (ex: pedidos/tmp/xxx.jpg)
      // Garantir que o caminho comece com / para construir corretamente
      const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
      relativePath = `/pedidos/media${cleanPath}`;
      console.log('[loadAuthenticatedImage] 🔄 Convertendo para endpoint /media/:', {
        original: imagePath,
        normalized,
        cleanPath,
        relativePath
      });
    }
    
    console.log('[loadAuthenticatedImage] 🔧 Construindo URL relativa:', {
      originalPath: imagePath,
      normalized,
      relativePath,
      baseURL: getApiUrl()
    });

    console.log('[loadAuthenticatedImage] 📥 Carregando imagem de:', relativePath);

    // Carregar imagem com autenticação usando apiClient (que já tem baseURL configurado)
    const response = await apiClient.get(relativePath, {
      responseType: 'blob',
    });

    // Criar blob URL
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
    
    // Validação de tamanho: avisar se a imagem for muito grande (50MB - limite do backend)
    const MAX_IMAGE_SIZE_MB = 50;
    const sizeMB = blob.size / (1024 * 1024);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      console.warn(`[loadAuthenticatedImage] ⚠️ Imagem muito grande detectada: ${sizeMB.toFixed(2)}MB (máximo recomendado: ${MAX_IMAGE_SIZE_MB}MB). Isso pode causar problemas de performance.`);
    }
    
    const blobUrl = URL.createObjectURL(blob);

    // Armazenar no cache usando apenas caminho normalizado (chave única)
    blobUrlCache.set(normalized, blobUrl);
    blobCache.set(normalized, blob);

    // NOVO: Se estiver em Tauri, cachear a imagem localmente para próximas vezes
    if (isTauri() && response.data) {
      try {
        // Converter blob para Uint8Array
        const arrayBuffer = await blob.arrayBuffer();
        const imageData = new Uint8Array(arrayBuffer);
        
        // Cachear localmente usando caminho normalizado
        await cacheImageFromUrl(normalized, imageData);
        console.log('[loadAuthenticatedImage] 💾 Imagem cacheada localmente:', normalized);
      } catch (cacheError) {
        // Não falhar se o cache falhar, apenas logar
        console.warn('[loadAuthenticatedImage] ⚠️ Erro ao cachear imagem localmente:', cacheError);
      }
    }

    console.log('[loadAuthenticatedImage] ✅ Imagem carregada:', {
      originalPath: imagePath,
      normalized,
      blobUrl
    });

    return blobUrl;
  } catch (error) {
    console.error('[loadAuthenticatedImage] ❌ Erro ao carregar imagem:', {
      imagePath,
      error
    });
    throw error;
  }
}

/**
 * Limpa o cache de blob URLs (útil para liberar memória)
 */
export function clearImageCache(): void {
  blobUrlCache.forEach((blobUrl) => {
    URL.revokeObjectURL(blobUrl);
  });
  blobUrlCache.clear();
  blobCache.clear();
}

/**
 * Revoga uma blob URL específica do cache
 */
export function revokeImageUrl(imagePath: string): void {
  // Normalizar caminho para usar chave consistente do cache
  const normalized = normalizeImageUrl(imagePath);
  const blobUrl = blobUrlCache.get(normalized);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrlCache.delete(normalized);
    blobCache.delete(normalized);
  }
}

/**
 * Converte uma imagem para base64 (útil para impressão)
 * @param imagePath - Caminho da imagem (pode ser relativo ou absoluto)
 * @param options - Opções de redimensionamento (opcional)
 * @returns Promise com a string base64 da imagem
 */
export async function imageToBase64(
  imagePath: string,
  options?: { resize?: boolean; fixedHeight?: number }
): Promise<string> {
  try {
    // Normalizar caminho para usar chave consistente do cache
    const normalized = normalizeImageUrl(imagePath);
    
    // Se já for base64, retornar diretamente
    if (normalized.startsWith('data:image/')) {
      return normalized;
    }

    // Verificar se já temos o blob em cache usando caminho normalizado
    let blob: Blob | undefined = blobCache.get(normalized);
    
    if (!blob) {
      // Carregar a imagem autenticada (retorna blob URL)
      // loadAuthenticatedImage já normaliza internamente, então pode passar imagePath original
      const blobUrl = await loadAuthenticatedImage(imagePath);
      
      // Se for base64, retornar diretamente
      if (blobUrl.startsWith('data:image/')) {
        return blobUrl;
      }

      // Tentar obter o blob do cache novamente usando caminho normalizado
      // (pode ter sido adicionado durante loadAuthenticatedImage)
      blob = blobCache.get(normalized);
      
      // Se ainda não temos o blob, fazer fetch da blob URL (fallback)
      if (!blob) {
        const response = await fetch(blobUrl);
        blob = await response.blob();
        // Salvar no cache usando caminho normalizado
        blobCache.set(normalized, blob);
      }
    }
    
    // Se redimensionamento foi solicitado, processar antes de converter para base64
    if (options?.resize && blob) {
      try {
        const blobUrl = URL.createObjectURL(blob);
        const resizedBase64 = await resizeImageToBase64(blobUrl, options.fixedHeight || 75);
        URL.revokeObjectURL(blobUrl);
        return resizedBase64;
      } catch (resizeError) {
        console.warn('[imageToBase64] ⚠️ Erro ao redimensionar, usando original:', resizeError);
        // Continuar com conversão normal se redimensionamento falhar
      }
    }
    
    // Converter blob para base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob!);
    });
  } catch (error) {
    console.error('[imageToBase64] ❌ Erro ao converter imagem para base64:', {
      imagePath,
      error
    });
    throw error;
  }
}

/**
 * Redimensiona uma imagem e converte para base64
 * Define altura fixa de 75mm e calcula largura proporcionalmente
 * @param imageSrc - Blob URL ou data URL da imagem
 * @param fixedHeight - Altura fixa em mm (padrão: 75mm)
 * @returns Promise com a string base64 da imagem redimensionada
 */
async function resizeImageToBase64(
  imageSrc: string,
  fixedHeight: number = 75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // NÃO definir crossOrigin para blob URLs (causa erro de CORS)
    
    img.onload = () => {
      try {
        // Converter mm para pixels (1mm ≈ 3.779527559 pixels a 96dpi)
        const mmToPx = 3.779527559;
        const fixedHeightPx = fixedHeight * mmToPx;
        
        // Calcular largura proporcional baseada na altura fixa
        const aspectRatio = img.width / img.height;
        const newWidth = fixedHeightPx * aspectRatio;
        const newHeight = fixedHeightPx;
        
        console.log(`[resizeImageToBase64] Original: ${img.width}x${img.height}, Redimensionado: ${Math.round(newWidth)}x${Math.round(newHeight)}`);
        
        // Criar canvas e redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(newWidth);
        canvas.height = Math.round(newHeight);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }
        
        // Melhorar qualidade da imagem redimensionada
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Converter para data URL (JPEG com qualidade 0.9)
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log(`[resizeImageToBase64] ✅ Imagem redimensionada com sucesso (${resizedDataUrl.length} bytes)`);
        resolve(resizedDataUrl);
      } catch (error) {
        console.error('[resizeImageToBase64] ❌ Erro ao redimensionar:', error);
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      console.error('[resizeImageToBase64] ❌ Erro ao carregar imagem:', error);
      reject(new Error('Erro ao carregar imagem para redimensionamento'));
    };
    
    img.src = imageSrc;
  });
}

/**
 * Valida o tamanho de um blob de imagem
 * @param blob - Blob da imagem
 * @param maxSizeMB - Tamanho máximo em MB (padrão: 10MB para impressão)
 * @returns Objeto com informações de validação
 */
export function validateImageSize(
  blob: Blob,
  maxSizeMB: number = 10
): { valid: boolean; sizeMB: number; maxSizeMB: number; message?: string } {
  const sizeMB = blob.size / (1024 * 1024);
  const valid = sizeMB <= maxSizeMB;
  
  return {
    valid,
    sizeMB: parseFloat(sizeMB.toFixed(2)),
    maxSizeMB,
    message: valid
      ? undefined
      : `Imagem muito grande (${sizeMB.toFixed(2)}MB). Tamanho máximo permitido: ${maxSizeMB}MB`
  };
}
