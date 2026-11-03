import { isTauri } from './isTauri';
import { processAndSaveImage } from './localImageManager';
import { getImagePreviewUrl } from './imagePreview';

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
export const WEB_MAX_DIMENSION = 1920; // 1080p/Full HD para evitar estouro de payload no Web/PWA
export const WEB_IMAGE_QUALITY = 0.85;

export interface ValidationImageResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida o tipo MIME, extensão e tamanho de um arquivo de imagem selecionado.
 */
export function validateImageFile(file: File): ValidationImageResult {
  if (!file) {
    return { valid: false, error: 'Nenhum arquivo selecionado.' };
  }

  const fileName = (file.name || '').toLowerCase();
  const mimeType = (file.type || '').toLowerCase();

  const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const hasValidMime =
    ALLOWED_IMAGE_MIME_TYPES.includes(mimeType) || mimeType.startsWith('image/');

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: 'Formato não suportado. Por favor, envie uma imagem JPEG, PNG, WEBP ou GIF.',
    };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `A imagem selecionada possui ${sizeInMB} MB. O tamanho máximo permitido é de 10 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Redimensiona e comprime uma imagem no ambiente Web/PWA usando HTML5 Canvas.
 * Reduz imagens gigantes (ex: fotos de 15-30 MB) para strings Base64 otimizadas de ~200-400 KB,
 * prevenindo estouro de payload na Vercel (limite 4.5 MB) e travamento de abas no celular.
 */
export async function processWebImage(
  file: File,
  maxDimension: number = WEB_MAX_DIMENSION,
  quality: number = WEB_IMAGE_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // Fallback simples se createObjectURL falhar
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;

        if (width <= 0 || height <= 0) {
          // Imagem sem dimensões válidas, fallback
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Falha ao processar arquivo de imagem.'));
          reader.readAsDataURL(file);
          return;
        }

        // Redimensiona proporcionalmente se exceder a dimensão máxima
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Não foi possível inicializar o canvas.'));
          reader.readAsDataURL(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Se for PNG e menor que 2MB original, preserva PNG (para transparências de arte)
        const isPng = file.type === 'image/png';
        const outputMime = isPng ? 'image/png' : 'image/jpeg';
        const outputQuality = isPng ? undefined : quality;

        const base64 = canvas.toDataURL(outputMime, outputQuality);
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Erro ao processar imagem para visualização.'));
    };

    img.src = objectUrl;
  });
}

export interface ProcessedImageResult {
  localPathOrBase64: string;
  previewUrl: string;
  metadata?: unknown;
}

/**
 * Trata o fluxo unificado de upload e validação de imagem tanto para Desktop (Tauri) quanto Web/PWA.
 */
export async function handleImageUpload(file: File): Promise<ProcessedImageResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Arquivo de imagem inválido.');
  }

  if (isTauri()) {
    const arrayBuffer = await file.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);
    const metadata = await processAndSaveImage(imageData, 5000, 400, 85);
    const preview = await getImagePreviewUrl(metadata.local_path);
    return {
      localPathOrBase64: metadata.local_path,
      previewUrl: preview || metadata.local_path,
      metadata,
    };
  } else {
    const optimizedBase64 = await processWebImage(file);
    return {
      localPathOrBase64: optimizedBase64,
      previewUrl: optimizedBase64,
    };
  }
}

