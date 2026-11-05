import type { NappletGlobal } from '@napplet/core';
import { expect, it, vi } from 'vitest';

it('imports the safe prelude without implicitly installing any namespace', async () => {
  vi.resetModules();
  delete (window as Window & { napplet?: unknown }).napplet;
  const { installNappletRuntimePrelude } = await import('./prelude.js');
  expect((window as Window & { napplet?: NappletGlobal }).napplet).toBeUndefined();
  installNappletRuntimePrelude({ domains: ['storage', 'llm'], maturity: {} });
  expect(Object.keys((window as Window & { napplet?: NappletGlobal }).napplet ?? {})).toEqual(['storage']);
});
