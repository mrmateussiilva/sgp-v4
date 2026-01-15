/**
 * Redimensiona uma imagem mantendo a proporção
 * Considera altura E largura máximas para garantir que a imagem sempre caiba sem ser cortada
 * @param imageSrc - Blob URL ou data URL da imagem
 * @param maxHeight - Altura máxima em mm (padrão: 80mm)
 * @param maxWidth - Largura máxima em mm (opcional, calcula automaticamente se não fornecido)
 * @returns Promise com a string base64 da imagem redimensionada
 */
export async function resizeImageToBase64(
  imageSrc: string,
  maxHeight: number = 80,
  maxWidth?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // NÃO definir crossOrigin para blob URLs (causa erro de CORS)
    
    img.onload = () => {
      try {
        // Converter mm para pixels (1mm ≈ 3.779527559 pixels a 96dpi)
        const mmToPx = 3.779527559;
        
        // Se maxWidth não foi fornecido, calcular baseado na coluna direita (63% de ~187mm = ~117mm)
        // Mas deixar um pouco de margem para padding/margens: usar ~110mm
        const calculatedMaxWidth = maxWidth || 110;
        
        const maxHeightPx = maxHeight * mmToPx;
        const maxWidthPx = calculatedMaxWidth * mmToPx;
        
        // Calcular proporção original da imagem
        const aspectRatio = img.width / img.height;
        
        // Calcular dimensões se limitássemos apenas pela altura
        const widthByHeight = maxHeightPx * aspectRatio;
        const heightByHeight = maxHeightPx;
        
        // Calcular dimensões se limitássemos apenas pela largura
        const widthByWidth = maxWidthPx;
        const heightByWidth = maxWidthPx / aspectRatio;
        
        // Escolher a dimensão mais restritiva (a menor)
        let newWidth: number;
        let newHeight: number;
        
        if (widthByHeight <= maxWidthPx && heightByHeight <= maxHeightPx) {
          // Cabe limitando pela altura
          newWidth = widthByHeight;
          newHeight = heightByHeight;
        } else if (widthByWidth <= maxWidthPx && heightByWidth <= maxHeightPx) {
          // Cabe limitando pela largura
          newWidth = widthByWidth;
          newHeight = heightByWidth;
        } else {
          // Precisa limitar por ambos - usar o mais restritivo
          if (widthByHeight > maxWidthPx) {
            // Largura é o limitante
            newWidth = maxWidthPx;
            newHeight = heightByWidth;
          } else {
            // Altura é o limitante
            newWidth = widthByHeight;
            newHeight = maxHeightPx;
          }
        }
        
        console.log(`[resizeImageToBase64] Original: ${img.width}x${img.height}, Limites: ${maxWidth || 110}mm x ${maxHeight}mm, Redimensionado: ${Math.round(newWidth)}x${Math.round(newHeight)}px (${Math.round(newWidth/mmToPx)}x${Math.round(newHeight/mmToPx)}mm)`);
        
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
