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

  // Se for URL relativa que começa com "/" (ex: /pedidos/imagens/1, /api/v1/pedidos/imagens/1), construir URL completa
  const normalized = path.replace(/\\/g, '/').trim();
  if (normalized.startsWith('/')) {
    try {
      // Importar dinamicamente para evitar dependência circular
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const apiClientModule = require('../services/apiClient');
      const baseUrl = apiClientModule.getApiUrl();

      if (baseUrl && baseUrl.trim()) {
        // Garantir que a baseUrl não tenha barra final e o caminho já começa com /
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const fullUrl = `${cleanBaseUrl}${normalized}`;
        return fullUrl;
      } else {
        // Se baseUrl não estiver configurado, verificar se é Tauri antes de usar window.location
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { isTauri } = require('./isTauri');
        if (!isTauri() && typeof window !== 'undefined') {
          const protocol = window.location.protocol;
          const hostname = window.location.hostname;
          const port = window.location.port;
          // Tentar detectar a porta padrão da API (8000 ou 8001)
          // Se estiver em localhost:1420 (dev do Tauri), usar 8000 como padrão
          const apiPort = port === '1420' ? '8000' : (port || (protocol === 'https:' ? '443' : '8000'));
          const fallbackUrl = `${protocol}//${hostname}:${apiPort}`;
          const fullUrl = `${fallbackUrl}${normalized}`;
          return fullUrl;
        }
        return normalized;
      }
    } catch {
      return normalized;
    }
  }

  // Se for caminho relativo que começa com "media/", construir URL completa
  // Isso é usado para imagens de fichas salvas no backend
  if (normalized.startsWith('media/')) {
    // Importar dinamicamente para evitar dependência circular
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getApiUrl } = require('../services/apiClient');
      const baseUrl = getApiUrl();
      if (baseUrl) {
        // Construir URL completa: baseUrl + /fichas/imagens/{ficha_id}
        // Extrair o ID da ficha do caminho (media/fichas/{id}/...)
        const match = normalized.match(/^media\/fichas\/(\d+)\//);
        if (match) {
          const fichaId = match[1];
          // Garantir que a baseUrl não tenha barra final e o caminho comece com /
          const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
          return `${cleanBaseUrl}/fichas/imagens/${fichaId}`;
        }
        // Se não conseguir extrair o ID, retornar o caminho normalizado
        return normalized;
      }
    } catch {
      // Se houver erro ao importar, retornar o caminho normalizado
    }
  }

  // Se for caminho de arquivo, normalizar separadores
  // Windows usa \, outros sistemas usam /
  // Remover espaços extras e normalizar
  return normalized;
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

  // URLs relativas que começam com "/" são válidas
  // (ex: /pedidos/imagens/1 - serão convertidas para URLs completas)
  const normalized = path.replace(/\\/g, '/').trim();
  if (normalized.startsWith('/')) {
    return true;
  }

  // Caminhos relativos que começam com "media/" são válidos
  // (serão convertidos para URLs completas pelo normalizeImagePath)
  if (normalized.startsWith('media/')) {
    return true;
  }

  // Caminhos de arquivo devem ter pelo menos alguns caracteres
  return path.trim().length > 0;
}

