import { expect, it } from 'vitest';
import { loadPaja } from './screenshot-preview.js';

it('explains the optional Paja peer when it is not installed', async () => {
  const missing = Object.assign(new Error("Cannot find package '@kehto/paja'"), { code: 'ERR_MODULE_NOT_FOUND' });
  await expect(loadPaja(() => Promise.reject(missing))).rejects.toThrow(
    /optional peer @kehto\/paja.*pass a preview URL/,
  );
});

it('rethrows other Paja load failures unchanged', async () => {
  const broken = new SyntaxError('bad export');
  await expect(loadPaja(() => Promise.reject(broken))).rejects.toBe(broken);
});
