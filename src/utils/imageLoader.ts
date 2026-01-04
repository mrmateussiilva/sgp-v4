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
 * Normaliza uma URL de imagem, substituindo localhost pela URL da API configurada
 * @param imagePath - Caminho ou URL da imagem
 * @returns URL normalizada
 */
function normalizeImageUrl(imagePath: string): string {
  const apiUrl = getApiUrl();
  
  // Se for base64, retornar diretamente
  if (imagePath.startsWith('data:image/')) {
    return imagePath;
  }

  // Normalizar o caminho
  let normalized = imagePath.replace(/\\/g, '/').trim();
  
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
  // Se já está em cache de blob URL, retornar
  if (blobUrlCache.has(imagePath)) {
    return blobUrlCache.get(imagePath)!;
  }

  try {
    // Normalizar a URL (substituir localhost se necessário)
    const normalized = normalizeImageUrl(imagePath);
    
    // Se for base64, retornar diretamente
    if (normalized.startsWith('data:image/')) {
      return normalized;
    }

    // NOVO: Se estiver em Tauri, verificar cache local primeiro
    if (isTauri()) {
      const localPath = await getLocalImagePath(normalized);
      if (localPath) {
        console.log('[loadAuthenticatedImage] ✅ Imagem encontrada no cache local:', localPath);
        // Carregar do cache local e converter para blob URL para compatibilidade
        const base64 = await loadLocalImageAsBase64(localPath);
        // Converter base64 para blob URL
        const response = await fetch(base64);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlCache.set(imagePath, blobUrl);
        blobCache.set(imagePath, blob);
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
      const blobUrl = URL.createObjectURL(blob);
      blobUrlCache.set(imagePath, blobUrl);
      blobCache.set(imagePath, blob);
      
      // NOVO: Se estiver em Tauri, cachear a imagem localmente para próximas vezes
      if (isTauri() && response.data) {
        try {
          // Converter blob para Uint8Array
          const arrayBuffer = await blob.arrayBuffer();
          const imageData = new Uint8Array(arrayBuffer);
          
          // Cachear localmente
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
    const relativePath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    
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
    const blobUrl = URL.createObjectURL(blob);

    // Armazenar no cache (tanto blob URL quanto blob)
    blobUrlCache.set(imagePath, blobUrl);
    blobCache.set(imagePath, blob);

    // NOVO: Se estiver em Tauri, cachear a imagem localmente para próximas vezes
    if (isTauri() && response.data) {
      try {
        // Converter blob para Uint8Array
        const arrayBuffer = await blob.arrayBuffer();
        const imageData = new Uint8Array(arrayBuffer);
        
        // Cachear localmente
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
  const blobUrl = blobUrlCache.get(imagePath);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrlCache.delete(imagePath);
    blobCache.delete(imagePath);
  }
}

/**
 * Converte uma imagem para base64 (útil para impressão)
 * @param imagePath - Caminho da imagem (pode ser relativo ou absoluto)
 * @returns Promise com a string base64 da imagem
 */
export async function imageToBase64(imagePath: string): Promise<string> {
  try {
    // Se já for base64, retornar diretamente
    if (imagePath.startsWith('data:image/')) {
      return imagePath;
    }

    // Verificar se já temos o blob em cache
    let blob: Blob | undefined = blobCache.get(imagePath);
    
    if (!blob) {
      // Carregar a imagem autenticada (retorna blob URL)
      const blobUrl = await loadAuthenticatedImage(imagePath);
      
      // Se for base64, retornar diretamente
      if (blobUrl.startsWith('data:image/')) {
        return blobUrl;
      }

      // Tentar obter o blob do cache novamente (pode ter sido adicionado durante loadAuthenticatedImage)
      blob = blobCache.get(imagePath);
      
      // Se ainda não temos o blob, fazer fetch da blob URL (fallback)
      if (!blob) {
        const response = await fetch(blobUrl);
        blob = await response.blob();
        blobCache.set(imagePath, blob);
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

