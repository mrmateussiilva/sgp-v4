import { apiClient, getApiUrl } from '../services/apiClient';

/**
 * Cache de URLs de blob para evitar recarregar a mesma imagem múltiplas vezes
 */
const blobUrlCache = new Map<string, string>();

/**
 * Carrega uma imagem autenticada e retorna uma blob URL
 * @param imagePath - Caminho da imagem (pode ser relativo ou absoluto)
 * @returns Promise com a blob URL da imagem
 */
export async function loadAuthenticatedImage(imagePath: string): Promise<string> {
  // Se já está em cache, retornar
  if (blobUrlCache.has(imagePath)) {
    return blobUrlCache.get(imagePath)!;
  }

  try {
    // Normalizar o caminho
    let url = imagePath;
    
    // Se for base64, retornar diretamente
    if (imagePath.startsWith('data:image/')) {
      return imagePath;
    }

    // Se já for URL completa, usar diretamente
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      url = imagePath;
    } else {
      // Construir URL completa
      const baseUrl = getApiUrl();
      if (!baseUrl) {
        throw new Error('API base URL não configurada');
      }
      
      const normalized = imagePath.replace(/\\/g, '/').trim();
      const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
      url = normalized.startsWith('/') 
        ? `${cleanBaseUrl}${normalized}`
        : `${cleanBaseUrl}/${normalized}`;
    }

    // Carregar imagem com autenticação usando apiClient
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    // Criar blob URL
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
    const blobUrl = URL.createObjectURL(blob);

    // Armazenar no cache
    blobUrlCache.set(imagePath, blobUrl);

    console.log('[loadAuthenticatedImage] ✅ Imagem carregada:', {
      originalPath: imagePath,
      url,
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
}

/**
 * Revoga uma blob URL específica do cache
 */
export function revokeImageUrl(imagePath: string): void {
  const blobUrl = blobUrlCache.get(imagePath);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrlCache.delete(imagePath);
  }
}

