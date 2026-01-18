import { processAndSaveImage } from './localImageManager';
import { getImagePreviewUrl } from './imagePreview';
import { isTauri } from './isTauri';

/**
 * Helper para processar e salvar imagem de forma unificada
 * Retorna local_path (novo sistema) ou base64 (fallback web)
 */
export async function handleImageUpload(
  file: File,
  onSuccess: (imagePath: string, previewUrl: string | null) => void,
  onError: (error: Error) => void
): Promise<void> {
  if (!file) {
    onError(new Error('Nenhum arquivo selecionado'));
    return;
  }

  // Se estiver em Tauri, salvar localmente
  if (isTauri()) {
    try {
      // Converter File para Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const imageData = new Uint8Array(arrayBuffer);

      // Processar e salvar localmente (redimensiona se necessário)
      const metadata = await processAndSaveImage(
        imageData,
        5000, // maxWidth
        400, // maxHeight
        85    // quality
      );

      // Carregar preview temporário para exibição
      const preview = await getImagePreviewUrl(metadata.local_path);

      // Callback com local_path (não base64!)
      onSuccess(metadata.local_path, preview);
    } catch (error) {
      console.error('Erro ao salvar imagem localmente:', error);
      onError(error instanceof Error ? error : new Error('Erro desconhecido ao salvar imagem'));
    }
  } else {
    // Fallback para ambiente web (não Tauri): usar base64 temporariamente
    // Isso mantém compatibilidade durante desenvolvimento
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onSuccess(base64, base64); // Em web, base64 é tanto o path quanto o preview
      };
      reader.onerror = () => {
        onError(new Error('Erro ao ler arquivo'));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      onError(error instanceof Error ? error : new Error('Erro desconhecido ao ler arquivo'));
    }
  }
}

