/**
 * Sistema de Cache no localStorage
 * 
 * Gerencia cache de dados com TTL (Time To Live) para reduzir
 * requisições desnecessárias à API.
 */

const CACHE_PREFIX = 'sgp_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos em milissegundos
const STATIC_DATA_TTL = 30 * 60 * 1000; // 30 minutos para dados estáticos (vendedores, designers)
// TTL estendido para reduzir carga no servidor com múltiplos clientes
const EXTENDED_TTL = 60 * 60 * 1000; // 60 minutos para dados que raramente mudam

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Obtém dados do cache se ainda válidos
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Cache expirado, remover
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error(`Erro ao ler cache para ${key}:`, error);
    return null;
  }
}

/**
 * Armazena dados no cache
 */
export function setCachedData<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error(`Erro ao salvar cache para ${key}:`, error);
    // Se o localStorage estiver cheio, tentar limpar caches antigos
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearExpiredCache();
      // Tentar novamente
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl,
        };
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
      } catch (retryError) {
        console.error(`Erro ao salvar cache após limpeza:`, retryError);
      }
    }
  }
}

/**
 * Remove um item específico do cache
 */
export function removeCachedData(key: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.error(`Erro ao remover cache para ${key}:`, error);
  }
}

/**
 * Limpa todos os caches expirados
 */
export function clearExpiredCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let cleared = 0;

    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry<unknown> = JSON.parse(cached);
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (error) {
          // Se não conseguir parsear, remover
          localStorage.removeItem(key);
          cleared++;
        }
      }
    });

    if (cleared > 0) {
      console.log(`Limpeza de cache: ${cleared} itens removidos`);
    }
  } catch (error) {
    console.error('Erro ao limpar cache expirado:', error);
  }
}

/**
 * Limpa todo o cache (incluindo válidos)
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('Todo o cache foi limpo');
  } catch (error) {
    console.error('Erro ao limpar todo o cache:', error);
  }
}

/**
 * Obtém dados do cache ou executa função assíncrona
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // Tentar obter do cache primeiro
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Se não estiver em cache, buscar e armazenar
  const data = await fetchFn();
  setCachedData(key, data, ttl);
  return data;
}

/**
 * TTL para dados estáticos (vendedores, designers, etc.)
 */
export const STATIC_TTL = STATIC_DATA_TTL;

/**
 * TTL estendido para dados que raramente mudam
 * Útil para reduzir carga no servidor com múltiplos clientes
 */
export const EXTENDED_CACHE_TTL = EXTENDED_TTL;

/**
 * TTL padrão para dados dinâmicos
 */
export const DEFAULT_CACHE_TTL = DEFAULT_TTL;

