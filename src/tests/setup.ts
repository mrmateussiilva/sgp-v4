
import '@testing-library/jest-dom/vitest';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));
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

import { ordersSocket } from '../lib/realtimeOrders';

// Mock do WebSocket para evitar conexões de rede reais durante os testes
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readyState = 1;
  url: string;
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }
  send(_data: any) {}
  close() {
    this.readyState = 3;
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'WebSocket', {
    writable: true,
    value: MockWebSocket,
  });
}
Object.defineProperty(globalThis, 'WebSocket', {
  writable: true,
  value: MockWebSocket,
});

afterEach(() => {
  try {
    ordersSocket.disconnect();
  } catch {
    // ignore
  }
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

afterAll(() => server.close());

const sessionStorageMock = (() => {
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

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});


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
