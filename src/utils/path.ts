/**
 * Normaliza paths de imagens para compatibilidade com Windows e outros sistemas
 * @param path - Caminho da imagem (pode ser base64, URL, ou caminho de arquivo)
 * @returns Path normalizado
 */
export function normalizeImagePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  // Se for base64, retornar como está
  if (path.startsWith('data:image/')) {
    return path;
  }

  // Se for URL HTTP/HTTPS, retornar como está
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Se for caminho de arquivo, normalizar separadores
  // Windows usa \, outros sistemas usam /
  const normalized = path.replace(/\\/g, '/');
  
  // Remover espaços extras e normalizar
  return normalized.trim();
}

/**
 * Verifica se uma imagem existe (para base64 e URLs)
 * @param path - Caminho da imagem
 * @returns true se a imagem parece válida
 */
export function isValidImagePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Base64 é sempre válido se começar com data:image/
  if (path.startsWith('data:image/')) {
    return true;
  }

  // URLs HTTP/HTTPS são válidas
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return true;
  }

  // Caminhos de arquivo devem ter pelo menos alguns caracteres
  return path.trim().length > 0;
}

