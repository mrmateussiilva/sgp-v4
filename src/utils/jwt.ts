/**
 * Decodifica um JWT e retorna o payload
 * Não valida a assinatura - apenas decodifica para uso no frontend
 * A validação real deve ser feita no backend
 */
export function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decodificar o payload (segunda parte)
    const payload = parts[1];
    // Adicionar padding se necessário
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Erro ao decodificar JWT:', error);
    return null;
  }
}

/**
 * Extrai roles do payload do JWT
 * Suporta diferentes formatos: roles, role, user_roles, etc.
 */
export function extractRolesFromJWT(token: string): string[] {
  const payload = decodeJWT(token);
  if (!payload) {
    return [];
  }

  // Tentar diferentes formatos de roles
  if (Array.isArray(payload.roles)) {
    return payload.roles;
  }
  
  if (typeof payload.role === 'string') {
    return [payload.role];
  }
  
  if (Array.isArray(payload.role)) {
    return payload.role;
  }
  
  if (typeof payload.user_roles === 'string') {
    return [payload.user_roles];
  }
  
  if (Array.isArray(payload.user_roles)) {
    return payload.user_roles;
  }

  // Se não encontrou roles, retornar array vazio
  return [];
}

/**
 * Extrai o userId do payload do JWT
 */
export function extractUserIdFromJWT(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload) {
    return null;
  }

  // Tentar diferentes formatos de userId
  if (typeof payload.user_id === 'number') {
    return payload.user_id;
  }
  
  if (typeof payload.sub === 'number') {
    return payload.sub;
  }
  
  if (typeof payload.id === 'number') {
    return payload.id;
  }

  return null;
}

/**
 * Verifica se o token JWT está expirado
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const expirationTime = payload.exp * 1000; // exp está em segundos
  return Date.now() >= expirationTime;
}
