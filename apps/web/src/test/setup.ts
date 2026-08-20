import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
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
