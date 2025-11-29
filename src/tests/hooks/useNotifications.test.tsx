/**
 * Testes para o hook useNotifications
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';
import { emit } from '@tauri-apps/api/event';
import { setApiUrl } from '@/services/apiClient';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock do Tauri emit
vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(),
}));

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiUrl('http://localhost:8000');
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it('deve iniciar polling quando API está configurada', async () => {
    let ultimoId = 0;
    
    server.use(
      http.get('*/api/notificacoes/ultimos', () => {
        return HttpResponse.json({
          ultimo_id: ++ultimoId,
          timestamp: new Date().toISOString(),
        });
      })
    );

    renderHook(() => useNotifications());

    // Avançar timer para disparar polling
    await vi.advanceTimersByTimeAsync(5000);

    // Verificar que a chamada foi feita
    expect(ultimoId).toBeGreaterThan(0);
  });

  it('deve emitir evento quando ultimo_id muda', async () => {
    let ultimoId = 0;
    
    server.use(
      http.get('*/api/notificacoes/ultimos', () => {
        return HttpResponse.json({
          ultimo_id: ++ultimoId,
          timestamp: new Date().toISOString(),
        });
      })
    );

    renderHook(() => useNotifications());

    // Avançar timer para primeiro polling
    await vi.advanceTimersByTimeAsync(5000);
    
    // Avançar timer para segundo polling (ultimo_id mudou)
    await vi.advanceTimersByTimeAsync(5000);

    // Verificar que evento foi emitido
    await waitFor(() => {
      expect(emit).toHaveBeenCalledWith('novo_pedido', expect.objectContaining({
        id: expect.any(Number),
        timestamp: expect.any(String),
      }));
    });
  });

  it('não deve emitir evento se ultimo_id não mudou', async () => {
    const ultimoId = 1;
    
    server.use(
      http.get('*/api/notificacoes/ultimos', () => {
        return HttpResponse.json({
          ultimo_id: ultimoId,
          timestamp: new Date().toISOString(),
        });
      })
    );

    renderHook(() => useNotifications());

    // Avançar timer múltiplas vezes
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);

    // Não deve emitir evento se ultimo_id não mudou
    expect(emit).not.toHaveBeenCalled();
  });

  it('não deve quebrar app se API falhar', async () => {
    server.use(
      http.get('*/api/notificacoes/ultimos', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useNotifications());

    // Avançar timer
    await vi.advanceTimersByTimeAsync(5000);

    // App não deve quebrar
    expect(result.current).toBeNull();
  });

  it('não deve iniciar polling se API não está configurada', async () => {
    setApiUrl('');
    
    const { result: _result } = renderHook(() => useNotifications());

    // Avançar timer
    await vi.advanceTimersByTimeAsync(5000);

    // Não deve fazer chamadas
    expect(emit).not.toHaveBeenCalled();
  });
});

