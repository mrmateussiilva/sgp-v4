import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '../test-utils';
import { useDesignerPanel } from '@/hooks/useDesignerPanel';
import { designersApi } from '@/api/endpoints/designers';
import { useAuthStore } from '@/store/authStore';

// Mock do isTauri helper
vi.mock('@/utils/isTauri', () => ({
  isTauri: () => false,
}));

// Setup Mock do Tauri/Axios adapter ou qualquer global necessário
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve('1.0.0')),
}));

describe('useDesignerPanel Hook', () => {
  beforeEach(() => {
    // Setup da store para evitar erro de token de sessão
    useAuthStore.setState({
      isAuthenticated: true,
      username: 'testuser',
      isAdmin: false,
      userId: 1,
      sessionToken: 'valid-session-token',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve carregar designers ativos e itens do primeiro designer na inicialização', async () => {
    const getDesignersSpy = vi.spyOn(designersApi, 'getDesignersAtivos');
    const getItensSpy = vi.spyOn(designersApi, 'getItensPorDesigner');

    const { result } = renderHook(() => useDesignerPanel());

    // Inicialmente carregando
    expect(result.current.isLoading).toBe(true);

    // Aguarda carregar os designers
    await waitFor(() => {
      expect(result.current.designers).toHaveLength(2); // Designer 1 e Designer 2 vindos do mock
    });

    expect(getDesignersSpy).toHaveBeenCalledTimes(1);
    expect(result.current.activeDesigner).toBe('Designer 1');

    // Aguarda carregar os itens do primeiro designer
    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(getItensSpy).toHaveBeenCalledWith('Designer 1', expect.any(Object));
    expect(result.current.isLoading).toBe(false);
  });

  it('deve alternar status da arte de forma otimista', async () => {
    const patchStatusSpy = vi.spyOn(designersApi, 'patchStatusArte').mockResolvedValue(true);

    const { result } = renderHook(() => useDesignerPanel());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    const item = result.current.items[0]; // item 101, status_arte: 'aguardando'
    expect(item.status_arte).toBe('aguardando');

    // Executa a alteração
    await act(async () => {
      await result.current.toggleStatusArte(item);
    });

    // Deve mudar para liberado imediatamente (otimista)
    expect(result.current.items[0].status_arte).toBe('liberado');
    expect(patchStatusSpy).toHaveBeenCalledWith(item.item_id, 'liberado');
  });

  it('deve fazer rollback do status da arte em caso de erro na API', async () => {
    // Mock para rejeitar a requisição
    const patchStatusSpy = vi.spyOn(designersApi, 'patchStatusArte').mockRejectedValue(new Error('Erro de rede'));

    const { result } = renderHook(() => useDesignerPanel());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    const item = result.current.items[0]; // status_arte: 'aguardando'

    // Executa a alteração
    await act(async () => {
      try {
        await result.current.toggleStatusArte(item);
      } catch (e) {
        // Ignora erro esperado
      }
    });

    // Deve voltar para aguardando após a falha
    await waitFor(() => {
      expect(result.current.items[0].status_arte).toBe('aguardando');
    });

    expect(patchStatusSpy).toHaveBeenCalledWith(item.item_id, 'liberado');
  });

  it('deve configurar o polling de 30 segundos', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    renderHook(() => useDesignerPanel());

    await waitFor(() => {
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
    });
  });

  it('deve fazer append de itens ao carregar mais (paginaçao)', async () => {
    const { result } = renderHook(() => useDesignerPanel());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    // Simula carregar mais registros
    await act(async () => {
      await result.current.refreshItems('Designer 1', true);
    });

    // Como o mock retorna vazio para offset > 0 (nao tem mais páginas), o número de itens deve continuar sendo 2
    // e não deve duplicar os itens existentes
    expect(result.current.items).toHaveLength(2);
  });

});
