/**
 * Utilitário para tratamento e formatação de erros
 * Fornece mensagens amigáveis para diferentes tipos de erros
 */

import { AxiosError } from 'axios';

/**
 * Obtém uma mensagem de erro amigável baseada no tipo de erro
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // Erros de conexão
    if (error.code === 'ECONNREFUSED') {
      return 'Servidor não está acessível. Verifique se a API está rodando e se o endereço está correto.';
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return 'Tempo de conexão esgotado. Verifique sua conexão de rede e tente novamente.';
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return 'Não foi possível resolver o endereço do servidor. Verifique a URL da API.';
    }
    
    if (!error.response) {
      // Erro de rede sem resposta
      return 'Erro de conexão com o servidor. Verifique sua conexão de rede.';
    }
    
    // Erros HTTP
    const status = error.response.status;
    
    if (status === 401) {
      return 'Sessão expirada ou credenciais inválidas. Faça login novamente.';
    }
    
    if (status === 403) {
      return 'Você não tem permissão para realizar esta ação.';
    }
    
    if (status === 404) {
      return 'Recurso não encontrado. O item pode ter sido removido.';
    }
    
    if (status === 422) {
      // Erro de validação - tentar pegar mensagem do servidor
      const data = error.response.data;
      if (data?.message) {
        return data.message;
      }
      if (data?.detail) {
        return Array.isArray(data.detail) 
          ? data.detail.map((d: { msg?: string; message?: string } | string) => {
              if (typeof d === 'string') return d;
              return d.msg || d.message || JSON.stringify(d);
            }).join(', ')
          : String(data.detail);
      }
      return 'Dados inválidos. Verifique os campos preenchidos.';
    }
    
    if (status >= 500) {
      return 'Erro no servidor. Tente novamente mais tarde ou entre em contato com o suporte.';
    }
    
    // Mensagem do servidor se disponível
    if (error.response.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response.data?.detail) {
      return String(error.response.data.detail);
    }
    
    return `Erro do servidor (${status}). Tente novamente.`;
  }
  
  // Erro genérico
  if (error instanceof Error) {
    return error.message || 'Erro inesperado. Tente novamente.';
  }
  
  return 'Erro desconhecido. Tente novamente.';
}

/**
 * Verifica se o erro é um erro de rede (sem resposta do servidor)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response && (error.code === 'ECONNREFUSED' || 
                               error.code === 'ETIMEDOUT' || 
                               error.code === 'ENOTFOUND' ||
                               error.code === 'ECONNABORTED' ||
                               error.message.includes('Network Error'));
  }
  return false;
}

/**
 * Verifica se o erro é um erro de autenticação
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401 || error.response?.status === 403;
  }
  return false;
}

