import '@testing-library/jest-dom';

/*
 * Node v22+ / v26+ with jsdom doesn't always initialize window.localStorage by default.
 * Provide an in-memory Storage implementation for test environments that call localStorage.
 */
let storageStore: Record<string, string> = {};
const mockStorage = {
  getItem: (key: string) => (key in storageStore ? storageStore[key] : null),
  setItem: (key: string, value: string) => {
    storageStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storageStore[key];
  },
  clear: () => {
    storageStore = {};
  },
  get length() {
    return Object.keys(storageStore).length;
  },
  key: (index: number) => Object.keys(storageStore)[index] ?? null,
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}