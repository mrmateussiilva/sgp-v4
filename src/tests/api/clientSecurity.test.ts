import { describe, it, expect, beforeEach } from 'vitest';
import { isSameOriginAsApi, setAuthToken, setApiUrl, apiClient } from '../../api/client';

describe('clientSecurity - Proteção contra vazamento de token', () => {
  beforeEach(() => {
    setApiUrl('http://localhost:8000');
    setAuthToken(null);
  });

  describe('isSameOriginAsApi', () => {
    it('deve retornar true para caminhos relativos', () => {
      expect(isSameOriginAsApi('/pedidos/', 'http://localhost:8000')).toBe(true);
      expect(isSameOriginAsApi('media/foto.jpg', 'http://localhost:8000')).toBe(true);
      expect(isSameOriginAsApi(undefined, 'http://localhost:8000')).toBe(true);
    });

    it('deve retornar true para URLs da mesma origem da API', () => {
      expect(isSameOriginAsApi('http://localhost:8000/media/1.jpg', 'http://localhost:8000')).toBe(true);
      expect(isSameOriginAsApi('http://localhost:8000/api/v1', 'http://localhost:8000/api')).toBe(true);
      expect(isSameOriginAsApi('https://api.empresa.com.br/fotos', 'https://api.empresa.com.br')).toBe(true);
    });

    it('deve retornar false para URLs de hosts ou portas diferentes', () => {
      expect(isSameOriginAsApi('https://s3.amazonaws.com/bucket/img.png', 'http://localhost:8000')).toBe(false);
      expect(isSameOriginAsApi('https://imgur.com/gallery/123.jpg', 'http://localhost:8000')).toBe(false);
      expect(isSameOriginAsApi('http://localhost:3000/other', 'http://localhost:8000')).toBe(false);
      expect(isSameOriginAsApi('http://malicious-site.com', 'http://localhost:8000')).toBe(false);
    });
  });

  describe('Interceptor de requisição do apiClient', () => {
    it('deve injetar Authorization somente para a mesma origem', async () => {
      setAuthToken('secret-session-token');

      // Teste com URL relativa (mesma origem)
      const configInternal: any = { url: '/pedidos/1', headers: {} };
      // Simular chamada do interceptor
      // @ts-expect-error acessando handlers do interceptor
      const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;

      const resultInternal = await requestInterceptor(configInternal);
      expect(resultInternal.headers.Authorization).toBe('Bearer secret-session-token');

      // Teste com URL externa (host diferente)
      const configExternal: any = { url: 'https://cdn.externo.com/imagem.png', headers: {} };
      const resultExternal = await requestInterceptor(configExternal);
      expect(resultExternal.headers.Authorization).toBeUndefined();
    });

    it('deve respeitar a flag X-No-Auth e não injetar Authorization', async () => {
      setAuthToken('secret-session-token');

      const config: any = {
        url: '/health',
        headers: { 'X-No-Auth': 'true' },
      };

      // @ts-expect-error acessando handlers do interceptor
      const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;
      const result = await requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
      expect(result.headers['X-No-Auth']).toBeUndefined();
    });
  });

  describe('Interceptor de resposta do apiClient', () => {
    it('deve efetuar logout e limpar token ao receber status 401', async () => {
      setAuthToken('token-prestest');

      // @ts-expect-error acessando handlers do interceptor
      const responseErrorInterceptor = apiClient.interceptors.response.handlers[0].rejected;

      const error401: any = {
        config: { url: '/pedidos/100', headers: {} },
        response: { status: 401, data: { detail: 'Unauthorized' } },
      };

      await expect(responseErrorInterceptor(error401)).rejects.toBe(error401);

      // O token deve ter sido limpo para null
      const configAfter: any = { url: '/pedidos/1', headers: {} };
      // @ts-expect-error acessando handlers do interceptor
      const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;
      const result = await requestInterceptor(configAfter);
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('não deve efetuar logout quando o 401 for do endpoint de login', async () => {
      setAuthToken('token-login-tentativa');

      // @ts-expect-error acessando handlers do interceptor
      const responseErrorInterceptor = apiClient.interceptors.response.handlers[0].rejected;

      const errorLogin: any = {
        config: { url: '/auth/login', headers: {} },
        response: { status: 401, data: { detail: 'Senha incorreta' } },
      };

      await expect(responseErrorInterceptor(errorLogin)).rejects.toBe(errorLogin);
    });
  });
});
