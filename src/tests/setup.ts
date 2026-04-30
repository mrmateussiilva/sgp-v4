
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

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
