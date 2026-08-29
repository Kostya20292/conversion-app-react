import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { useAuthStore } from '@/app/authStore';
import '@testing-library/jest-dom/vitest';

const resetAuthStore = () => {
  useAuthStore.setState({
    user: null,
    status: 'anonymous',
    issuedApiKey: null,
  });
};

beforeEach(() => {
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
