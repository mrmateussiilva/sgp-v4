import { loadLocalImageAsBase64 } from './localImageManager';
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
 * Suporta base64 (compatibilidade) e local_path (novo sistema)
 * 
 * @param imageReference - Pode ser base64, local_path ou URL
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

  // Se for URL HTTP/HTTPS, retornar diretamente
  if (imageReference.startsWith('http://') || imageReference.startsWith('https://')) {
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

  // Fallback: retornar como está (pode ser referência do servidor)
  return imageReference;
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

