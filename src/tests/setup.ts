
import '@testing-library/jest-dom/vitest';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';
import { setApiUrl } from '../api/client';

// Configura URL base padrão para os testes do Axios
setApiUrl('http://localhost:8000/api');

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

// Mock do PointerEvent para compatibilidade com Radix UI em JSDOM
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class MockPointerEvent extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
    }
  }
  (window as any).PointerEvent = MockPointerEvent;
}

afterEach(() => server.resetHandlers());
afterAll(() => server.close());


const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(),
});

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;

  postMessage(message: { orders?: unknown[] }) {
    setTimeout(() => {
      this.onmessage?.({
        data: { filteredOrders: message.orders ?? [] },
      } as MessageEvent);
    }, 0);
  }

  terminate() {}
}

Object.defineProperty(window, 'Worker', {
  writable: true,
  value: MockWorker,
});

Object.defineProperty(globalThis, 'Worker', {
  writable: true,
  value: MockWorker,
});
