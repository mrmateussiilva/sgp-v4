import { readImageFile } from './localImageManager';
import { apiClient } from '../services/apiClient';
import { isTauri } from './isTauri';

/**
 * Resultado de um upload de imagem
 */
export interface UploadResult {
  success: boolean;
  server_reference: string | null;
  error?: string;
}

/**
 * Faz upload assíncrono de imagem para a API
 * Retorna referência do servidor
 * 
 * @param localPath - Caminho local da imagem
 * @param orderItemId - ID do item do pedido (opcional, para associar)
 * @returns Resultado do upload com referência do servidor
 */
export async function uploadImageToServer(
  localPath: string,
  orderItemId?: number
): Promise<UploadResult> {
  if (!isTauri()) {
    // Em ambiente web, não fazer upload (já deve estar como base64)
    return {
      success: false,
      server_reference: null,
      error: 'Upload apenas disponível em ambiente Tauri',
    };
  }

  try {
    // Ler arquivo do disco
    const imageData = await readImageFile(localPath);
    
    // Converter para FormData
    const blob = new Blob([imageData]);
    const formData = new FormData();
    
    // Gerar nome de arquivo baseado no orderItemId ou timestamp
    const fileName = orderItemId 
      ? `item_${orderItemId}_${Date.now()}.jpg`
      : `image_${Date.now()}.jpg`;
    
    formData.append('image', blob, fileName);
    
    if (orderItemId) {
      formData.append('order_item_id', orderItemId.toString());
    }
    
    // Upload para API
    const response = await apiClient.post('/order-items/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return {
      success: true,
      server_reference: response.data.image_reference || response.data.path || response.data.url,
    };
  } catch (error: any) {
    console.error('Erro no upload de imagem:', error);
    return {
      success: false,
      server_reference: null,
      error: error?.response?.data?.detail || error?.message || 'Erro desconhecido no upload',
    };
  }
}

/**
 * Faz upload de múltiplas imagens em paralelo
 * 
 * @param uploads - Array de objetos com localPath e orderItemId
 * @returns Array de resultados de upload
 */
export async function uploadMultipleImages(
  uploads: Array<{ localPath: string; orderItemId?: number }>
): Promise<UploadResult[]> {
  const promises = uploads.map(({ localPath, orderItemId }) =>
    uploadImageToServer(localPath, orderItemId)
  );
  
  return Promise.all(promises);
}

/**
 * Verifica se uma imagem precisa ser enviada para o servidor
 * (se for local_path e ainda não foi enviada)
 * 
 * @param imageReference - Referência da imagem (pode ser local_path, base64 ou URL)
 * @returns true se precisa fazer upload
 */
export function needsUpload(imageReference: string | null | undefined): boolean {
  if (!imageReference || !isTauri()) {
    return false;
  }
  
  // Se for base64 ou URL, não precisa upload
  if (
    imageReference.startsWith('data:image/') ||
    imageReference.startsWith('http://') ||
    imageReference.startsWith('https://')
  ) {
    return false;
  }
  
  // Se for caminho local (contém / ou \), precisa upload
  return imageReference.includes('/') || imageReference.includes('\\');
}

