/**
 * Redimensiona uma imagem mantendo a proporção
 * Define altura fixa de 75mm e calcula largura proporcionalmente
 * @param imageSrc - Blob URL ou data URL da imagem
 * @param fixedHeight - Altura fixa em mm (padrão: 75mm)
 * @returns Promise com a string base64 da imagem redimensionada
 */
export async function resizeImageToBase64(
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
