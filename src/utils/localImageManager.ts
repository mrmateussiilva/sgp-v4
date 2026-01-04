import { invoke } from '@tauri-apps/api/core';

/**
 * Metadados de uma imagem salva localmente
 */
export interface LocalImageMetadata {
  local_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded: boolean;
  server_reference: string | null;
}

/**
 * Salva uma imagem localmente antes de qualquer upload
 * Converte File para bytes e envia para Rust
 * 
 * @param file - Arquivo de imagem selecionado pelo usuário
 * @returns Metadados da imagem salva localmente
 */
export async function saveImageLocally(file: File): Promise<LocalImageMetadata> {
  // Converter File para ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const bytes = Array.from(new Uint8Array(arrayBuffer));
  
  const metadata = await invoke<LocalImageMetadata>('save_image_locally', {
    imageData: bytes,
    mimeType: file.type || 'image/jpeg',
  });
  
  return metadata;
}

/**
 * Obtém caminho local de uma imagem (cache ou caminho direto)
 * 
 * @param imageReference - Referência da imagem (caminho local ou referência do servidor)
 * @returns Caminho local da imagem se encontrada, null caso contrário
 */
export async function getLocalImagePath(
  imageReference: string
): Promise<string | null> {
  if (!imageReference || imageReference.trim() === '') {
    return null;
  }
  
  return await invoke<string | null>('get_local_image_path', {
    imageReference,
  });
}

/**
 * Carrega imagem local como base64 (apenas para preview/impressão)
 * NÃO usar para armazenar em estado
 * 
 * @param localPath - Caminho local da imagem
 * @returns Data URL base64 da imagem
 */
export async function loadLocalImageAsBase64(
  localPath: string
): Promise<string> {
  return await invoke<string>('load_local_image_as_base64', {
    localPath,
  });
}

/**
 * Lê arquivo de imagem como array de bytes
 * Útil para upload para servidor
 * 
 * @param localPath - Caminho local da imagem
 * @returns Array de bytes da imagem
 */
export async function readImageFile(localPath: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_image_file', {
    localPath,
  });
  
  return new Uint8Array(bytes);
}

/**
 * Cacheia uma imagem baixada da URL no diretório local
 * 
 * @param imageUrl - URL da imagem
 * @param imageData - Dados binários da imagem
 * @returns Metadados da imagem cacheada
 */
export async function cacheImageFromUrl(
  imageUrl: string,
  imageData: Uint8Array
): Promise<LocalImageMetadata> {
  const bytes = Array.from(imageData);
  
  return await invoke<LocalImageMetadata>('cache_image_from_url', {
    imageUrl,
    imageData: bytes,
  });
}

/**
 * Processa e salva uma imagem (redimensiona se necessário)
 * 
 * @param imageData - Dados binários da imagem
 * @param maxWidth - Largura máxima (opcional)
 * @param maxHeight - Altura máxima (opcional)
 * @param quality - Qualidade JPEG (0-100, opcional, padrão: 85)
 * @returns Metadados da imagem processada
 */
export async function processAndSaveImage(
  imageData: Uint8Array,
  maxWidth?: number,
  maxHeight?: number,
  quality?: number
): Promise<LocalImageMetadata> {
  const bytes = Array.from(imageData);
  
  return await invoke<LocalImageMetadata>('process_and_save_image', {
    imageData: bytes,
    maxWidth: maxWidth || null,
    maxHeight: maxHeight || null,
    quality: quality || null,
  });
}

/**
 * Verifica se uma imagem existe localmente
 * 
 * @param imageReference - Referência da imagem
 * @returns true se a imagem existe localmente
 */
export async function imageExistsLocally(
  imageReference: string
): Promise<boolean> {
  const path = await getLocalImagePath(imageReference);
  return path !== null;
}

