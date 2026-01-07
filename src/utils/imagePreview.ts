import { loadLocalImageAsBase64 } from './localImageManager';
import { loadAuthenticatedImage } from './imageLoader';
import { isTauri } from './isTauri';

/**
 * Verifica se uma string é uma data URL base64
 */
function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:image/');
}

/**
 * Verifica se uma string é um caminho de arquivo local
 */
function isLocalPath(str: string): boolean {
  // Caminhos locais não começam com http/https nem são base64
  return !str.startsWith('http://') && 
         !str.startsWith('https://') && 
         !isBase64DataUrl(str) &&
         (str.includes('/') || str.includes('\\'));
}

/**
 * Obtém URL para preview de imagem
 * Suporta base64 (compatibilidade), local_path (novo sistema) e referências do servidor
 * 
 * @param imageReference - Pode ser base64, local_path ou URL do servidor
 * @returns Promise com URL para usar em src de <img>
 */
export async function getImagePreviewUrl(
  imageReference: string | null | undefined
): Promise<string | null> {
  if (!imageReference || imageReference.trim() === '') {
    return null;
  }

  // Se já for base64, retornar diretamente (compatibilidade)
  if (isBase64DataUrl(imageReference)) {
    return imageReference;
  }

  // Se for caminho local e estiver em Tauri, carregar como base64 temporário
  if (isTauri() && isLocalPath(imageReference)) {
    try {
      const base64 = await loadLocalImageAsBase64(imageReference);
      return base64;
    } catch (error) {
      console.error('Erro ao carregar imagem local para preview:', error);
      return null;
    }
  }

  // CORREÇÃO: Detectar caminhos relativos que começam com "pedidos/"
  // Esses caminhos precisam ser tratados como referências do servidor
  const isPedidosPath = imageReference.startsWith('pedidos/') || 
                        imageReference.startsWith('/pedidos/');
  
  // Se for URL HTTP/HTTPS, caminho absoluto ou caminho de pedidos, usar loadAuthenticatedImage
  // Isso carrega a imagem com autenticação e retorna uma blob URL
  if (imageReference.startsWith('http://') || 
      imageReference.startsWith('https://') || 
      imageReference.startsWith('/') ||
      isPedidosPath) {
    try {
      const blobUrl = await loadAuthenticatedImage(imageReference);
      return blobUrl;
    } catch (error) {
      console.error('Erro ao carregar imagem do servidor para preview:', error);
      return null;
    }
  }

  // Fallback: tentar carregar como referência do servidor
  try {
    const blobUrl = await loadAuthenticatedImage(imageReference);
    return blobUrl;
  } catch (error) {
    console.error('Erro ao carregar imagem para preview:', error);
    return null;
  }
}

// Versão síncrona para casos simples (retorna base64 se já for, ou null)
export function getImagePreviewUrlSync(
  imageReference: string | null | undefined
): string | null {
  if (!imageReference || imageReference.trim() === '') {
    return null;
  }

  // Se já for base64 ou URL, retornar diretamente
  if (isBase64DataUrl(imageReference) || 
      imageReference.startsWith('http://') || 
      imageReference.startsWith('https://')) {
    return imageReference;
  }

  // Para caminhos locais, retornar null (precisa carregar assincronamente)
  return null;
}

