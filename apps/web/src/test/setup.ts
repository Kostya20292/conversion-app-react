import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { useAuthStore } from '@/app/authStore';
import '@testing-library/jest-dom/vitest';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

const installWebStorage = (name: 'localStorage' | 'sessionStorage'): void => {
  const current = globalThis[name];
  if (current && typeof current.clear === 'function') {
    return;
  }

  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    value: new MemoryStorage(),
  });
};

installWebStorage('localStorage');
installWebStorage('sessionStorage');

const resetAuthStore = () => {
  useAuthStore.setState({
    user: null,
    status: 'anonymous',
    issuedApiKey: null,
  });
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  resetAuthStore();
});

afterEach(() => {
  cleanup();
  resetAuthStore();
});

const dialogPrototype = HTMLDialogElement.prototype;

if (!dialogPrototype.showModal) {
  dialogPrototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
}

if (!dialogPrototype.close) {
  dialogPrototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
