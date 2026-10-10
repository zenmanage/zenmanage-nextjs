import { afterEach, vi } from 'vitest';
import { clearServerClients } from '../src/server';

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  clearServerClients();

  if (typeof document !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
    document.body.innerHTML = '';
  }
});
