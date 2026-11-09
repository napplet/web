import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeShell, type FakeShell } from '../test-support/fake-shell.js';

let shell: FakeShell;
let uuidCounter: number;
let originalCryptoDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  uuidCounter = 0;
  originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => `fs-test-${++uuidCounter}`,
    },
  });

  shell = installFakeShell();

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'crypto');
  }
  vi.unstubAllGlobals();
});

describe('@napplet/nap/fs shim', () => {
  it('discovers roots and limits', async () => {
    const { handleFsMessage, info } = await import('./shim.js');

    const result = info();

    expect(shell.sent).toEqual([
      { type: 'fs.info', id: 'fs-test-1' },
    ]);
    expect(shell.windowMessages).toEqual([]);

    handleFsMessage({
      type: 'fs.info.result',
      id: 'fs-test-1',
      info: {
        roots: [{ path: '/shared', name: 'Shared files', permissions: ['read', 'list'] }],
        limits: { maxReadBytes: 1048576, maxWriteBytes: 1048576, maxWatchCount: 16 },
      },
    });

    await expect(result).resolves.toEqual({
      roots: [{ path: '/shared', name: 'Shared files', permissions: ['read', 'list'] }],
      limits: { maxReadBytes: 1048576, maxWriteBytes: 1048576, maxWatchCount: 16 },
    });
  });

  it('asks the runtime to pick one file with advisory options', async () => {
    const { handleFsMessage, pickFile } = await import('./shim.js');

    const result = pickFile({
      permissions: ['read'],
      accept: [{ mime: 'text/plain' }, { extension: '.md' }],
      description: 'Choose a text file',
    });

    expect(shell.sent).toEqual([
      {
        type: 'fs.pickFile',
        id: 'fs-test-1',
        options: {
          permissions: ['read'],
          accept: [{ mime: 'text/plain' }, { extension: '.md' }],
          description: 'Choose a text file',
        },
      },
    ]);

    handleFsMessage({
      type: 'fs.pickFile.result',
      id: 'fs-test-1',
      result: {
        entries: [{
          path: '/picked/report.md',
          kind: 'file',
          name: 'report.md',
          permissions: ['read'],
          size: 1200,
        }],
      },
    });

    await expect(result).resolves.toEqual({
      entries: [{
        path: '/picked/report.md',
        kind: 'file',
        name: 'report.md',
        permissions: ['read'],
        size: 1200,
      }],
    });
  });

  it('asks the runtime to pick multiple files without options', async () => {
    const { handleFsMessage, pickFiles } = await import('./shim.js');

    const result = pickFiles();

    expect(shell.sent).toEqual([
      { type: 'fs.pickFiles', id: 'fs-test-1' },
    ]);

    handleFsMessage({
      type: 'fs.pickFiles.result',
      id: 'fs-test-1',
      result: {
        entries: [
          { path: '/picked/a.txt', kind: 'file', name: 'a.txt', permissions: ['read'] },
          { path: '/picked/b.txt', kind: 'file', name: 'b.txt', permissions: ['read'] },
        ],
      },
    });

    await expect(result).resolves.toEqual({
      entries: [
        { path: '/picked/a.txt', kind: 'file', name: 'a.txt', permissions: ['read'] },
        { path: '/picked/b.txt', kind: 'file', name: 'b.txt', permissions: ['read'] },
      ],
    });
  });

  it('asks the runtime to pick a directory', async () => {
    const { handleFsMessage, pickDirectory } = await import('./shim.js');

    const result = pickDirectory({ permissions: ['read', 'list', 'watch'] });

    expect(shell.sent).toEqual([
      {
        type: 'fs.pickDirectory',
        id: 'fs-test-1',
        options: { permissions: ['read', 'list', 'watch'] },
      },
    ]);

    handleFsMessage({
      type: 'fs.pickDirectory.result',
      id: 'fs-test-1',
      result: {
        entries: [{
          path: '/picked/media',
          kind: 'directory',
          name: 'media',
          permissions: ['read', 'list'],
        }],
      },
    });

    await expect(result).resolves.toEqual({
      entries: [{
        path: '/picked/media',
        kind: 'directory',
        name: 'media',
        permissions: ['read', 'list'],
      }],
    });
  });

  it('asks the runtime to pick a save destination', async () => {
    const { handleFsMessage, pickSaveFile } = await import('./shim.js');

    const result = pickSaveFile({
      permissions: ['write', 'create'],
      suggestedName: 'export.json',
      accept: [{ mime: 'application/json' }],
    });

    expect(shell.sent).toEqual([
      {
        type: 'fs.pickSaveFile',
        id: 'fs-test-1',
        options: {
          permissions: ['write', 'create'],
          suggestedName: 'export.json',
          accept: [{ mime: 'application/json' }],
        },
      },
    ]);

    handleFsMessage({
      type: 'fs.pickSaveFile.result',
      id: 'fs-test-1',
      result: {
        entries: [{
          path: '/picked/export.json',
          kind: 'file',
          name: 'export.json',
          permissions: ['write', 'create'],
        }],
      },
    });

    await expect(result).resolves.toEqual({
      entries: [{
        path: '/picked/export.json',
        kind: 'file',
        name: 'export.json',
        permissions: ['write', 'create'],
      }],
    });
  });

  it('rejects picker cancellation as an error', async () => {
    const { handleFsMessage, pickFile } = await import('./shim.js');

    const result = pickFile();

    handleFsMessage({ type: 'fs.pickFile.result', id: 'fs-test-1', error: 'cancelled' });

    await expect(result).rejects.toThrow('cancelled');
  });

  it('stats a visible entry', async () => {
    const { handleFsMessage, stat } = await import('./shim.js');

    const result = stat('/shared/note.txt');

    expect(shell.sent).toEqual([
      { type: 'fs.stat', id: 'fs-test-1', path: '/shared/note.txt' },
    ]);

    handleFsMessage({
      type: 'fs.stat.result',
      id: 'fs-test-1',
      metadata: { path: '/shared/note.txt', kind: 'file', size: 12 },
    });

    await expect(result).resolves.toEqual({ path: '/shared/note.txt', kind: 'file', size: 12 });
  });

  it('lists directory entries', async () => {
    const { handleFsMessage, list } = await import('./shim.js');

    const result = list('/shared');

    expect(shell.sent).toEqual([
      { type: 'fs.list', id: 'fs-test-1', path: '/shared' },
    ]);

    handleFsMessage({
      type: 'fs.list.result',
      id: 'fs-test-1',
      entries: [{ name: 'note.txt', path: '/shared/note.txt', kind: 'file', size: 12 }],
    });

    await expect(result).resolves.toEqual([
      { name: 'note.txt', path: '/shared/note.txt', kind: 'file', size: 12 },
    ]);
  });

  it('reads a byte range from a visible file', async () => {
    const { handleFsMessage, read } = await import('./shim.js');

    const result = read('/shared/video.bin', { offset: 1048576, length: 65536 });

    expect(shell.sent).toEqual([
      {
        type: 'fs.read',
        id: 'fs-test-1',
        path: '/shared/video.bin',
        options: { offset: 1048576, length: 65536 },
      },
    ]);

    handleFsMessage({
      type: 'fs.read.result',
      id: 'fs-test-1',
      result: {
        data: 'SGVsbG8gd29ybGQh',
        offset: 1048576,
        bytesRead: 12,
        eof: false,
        size: 9000000,
      },
    });

    await expect(result).resolves.toEqual({
      data: 'SGVsbG8gd29ybGQh',
      offset: 1048576,
      bytesRead: 12,
      eof: false,
      size: 9000000,
    });
  });

  it('omits the options key when read options are not supplied', async () => {
    const { handleFsMessage, read } = await import('./shim.js');

    const result = read('/shared/note.txt');

    expect(shell.sent).toEqual([
      { type: 'fs.read', id: 'fs-test-1', path: '/shared/note.txt' },
    ]);

    handleFsMessage({
      type: 'fs.read.result',
      id: 'fs-test-1',
      result: { data: '', offset: 0, bytesRead: 0, eof: true, size: 0 },
    });

    await expect(result).resolves.toEqual({ data: '', offset: 0, bytesRead: 0, eof: true, size: 0 });
  });

  it('writes base64 file bytes with write options', async () => {
    const { handleFsMessage, write } = await import('./shim.js');

    const result = write('/shared/db.bin', 'AAECAw==', { mode: 'patch', offset: 4096 });

    expect(shell.sent).toEqual([
      {
        type: 'fs.write',
        id: 'fs-test-1',
        path: '/shared/db.bin',
        data: 'AAECAw==',
        options: { mode: 'patch', offset: 4096 },
      },
    ]);

    handleFsMessage({
      type: 'fs.write.result',
      id: 'fs-test-1',
      result: { bytesWritten: 4, size: 8192 },
    });

    await expect(result).resolves.toEqual({ bytesWritten: 4, size: 8192 });
  });

  it('omits the options key when write options are not supplied', async () => {
    const { handleFsMessage, write } = await import('./shim.js');

    const result = write('/shared/note.txt', 'SGVsbG8gd29ybGQh');

    expect(shell.sent).toEqual([
      {
        type: 'fs.write',
        id: 'fs-test-1',
        path: '/shared/note.txt',
        data: 'SGVsbG8gd29ybGQh',
      },
    ]);

    handleFsMessage({
      type: 'fs.write.result',
      id: 'fs-test-1',
      result: { bytesWritten: 12, size: 12 },
    });

    await expect(result).resolves.toEqual({ bytesWritten: 12, size: 12 });
  });

  it('creates directories with recursive options', async () => {
    const { handleFsMessage, mkdir } = await import('./shim.js');

    const result = mkdir('/shared/projects/new', { recursive: true });

    expect(shell.sent).toEqual([
      {
        type: 'fs.mkdir',
        id: 'fs-test-1',
        path: '/shared/projects/new',
        options: { recursive: true },
      },
    ]);

    handleFsMessage({ type: 'fs.mkdir.result', id: 'fs-test-1' });

    await expect(result).resolves.toBeUndefined();
  });

  it('omits the options key when mkdir options are not supplied', async () => {
    const { handleFsMessage, mkdir } = await import('./shim.js');

    const result = mkdir('/shared/projects');

    expect(shell.sent).toEqual([
      { type: 'fs.mkdir', id: 'fs-test-1', path: '/shared/projects' },
    ]);

    handleFsMessage({ type: 'fs.mkdir.result', id: 'fs-test-1' });

    await expect(result).resolves.toBeUndefined();
  });

  it('sends remove recursive as a top-level field, never nested in options', async () => {
    const { handleFsMessage, remove } = await import('./shim.js');

    const result = remove('/shared/projects', true);

    expect(shell.sent).toEqual([
      {
        type: 'fs.remove',
        id: 'fs-test-1',
        path: '/shared/projects',
        recursive: true,
      },
    ]);

    const posted = shell.sent[0] as Record<string, unknown>;
    expect(Object.keys(posted)).toContain('recursive');
    expect(Object.keys(posted)).not.toContain('options');

    handleFsMessage({ type: 'fs.remove.result', id: 'fs-test-1' });

    await expect(result).resolves.toBeUndefined();
  });

  it('moves entries with fromPath and toPath', async () => {
    const { handleFsMessage, move } = await import('./shim.js');

    const result = move('/shared/a.txt', '/shared/b.txt');

    expect(shell.sent).toEqual([
      {
        type: 'fs.move',
        id: 'fs-test-1',
        fromPath: '/shared/a.txt',
        toPath: '/shared/b.txt',
      },
    ]);

    handleFsMessage({ type: 'fs.move.result', id: 'fs-test-1' });

    await expect(result).resolves.toBeUndefined();
  });

  it('resolves watch with the runtime-generated watchId', async () => {
    const { handleFsMessage, watch } = await import('./shim.js');

    const result = watch('/shared', { recursive: true });

    expect(shell.sent).toEqual([
      {
        type: 'fs.watch',
        id: 'fs-test-1',
        path: '/shared',
        options: { recursive: true },
      },
    ]);

    handleFsMessage({ type: 'fs.watch.result', id: 'fs-test-1', watchId: 'watch-1' });

    await expect(result).resolves.toBe('watch-1');
  });

  it('stops watches by id', async () => {
    const { handleFsMessage, unwatch } = await import('./shim.js');

    const result = unwatch('watch-1');

    expect(shell.sent).toEqual([
      { type: 'fs.unwatch', id: 'fs-test-1', watchId: 'watch-1' },
    ]);

    handleFsMessage({ type: 'fs.unwatch.result', id: 'fs-test-1' });

    await expect(result).resolves.toBeUndefined();
  });

  it('rejects results carrying an error reason', async () => {
    const { handleFsMessage, stat } = await import('./shim.js');

    const result = stat('/hidden/private.txt');

    handleFsMessage({ type: 'fs.stat.result', id: 'fs-test-1', error: 'not-found' });

    await expect(result).rejects.toThrow('not-found');
  });

  it('rejects rather than resolving undefined when a success field is missing', async () => {
    const { handleFsMessage, list } = await import('./shim.js');

    const result = list('/shared');

    handleFsMessage({ type: 'fs.list.result', id: 'fs-test-1' });

    await expect(result).rejects.toThrow('fs.list returned no entries');
  });

  it('rejects read and write successes without result fields', async () => {
    const { handleFsMessage, read, write } = await import('./shim.js');

    const readResult = read('/shared/note.txt');
    handleFsMessage({ type: 'fs.read.result', id: 'fs-test-1' });

    await expect(readResult).rejects.toThrow('fs.read returned no result');

    const writeResult = write('/shared/note.txt', 'SGVsbG8gd29ybGQh');
    handleFsMessage({ type: 'fs.write.result', id: 'fs-test-2' });

    await expect(writeResult).rejects.toThrow('fs.write returned no result');
  });

  it('fans out runtime-pushed changes until subscriptions close', async () => {
    const { handleFsMessage, onChanged } = await import('./shim.js');
    const first = vi.fn();
    const second = vi.fn();

    const firstSub = onChanged(first);
    onChanged(second);

    handleFsMessage({
      type: 'fs.changed',
      change: { watchId: 'watch-1', path: '/shared/note.txt', kind: 'modified' },
    });
    firstSub.close();
    handleFsMessage({
      type: 'fs.changed',
      change: { watchId: 'watch-1', path: '/shared/old.txt', kind: 'moved', fromPath: '/shared/new.txt' },
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith({
      watchId: 'watch-1',
      path: '/shared/note.txt',
      kind: 'modified',
    });
    expect(second).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenNthCalledWith(2, {
      watchId: 'watch-1',
      path: '/shared/old.txt',
      kind: 'moved',
      fromPath: '/shared/new.txt',
    });
  });

  it('ignores foreign domains, unknown ids, and malformed envelopes without throwing', async () => {
    const { handleFsMessage, onChanged } = await import('./shim.js');
    const handler = vi.fn();
    onChanged(handler);

    expect(() => handleFsMessage({ type: 'unknown.domain' })).not.toThrow();
    expect(() => handleFsMessage({ type: 'fs.stat.result', id: 'never-sent' })).not.toThrow();
    expect(() => handleFsMessage({ type: 'fs.stat.result' })).not.toThrow();
    expect(() => handleFsMessage({ type: 'fs.changed' })).not.toThrow();

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not resolve a pending request from a fs.changed push', async () => {
    const { handleFsMessage, stat } = await import('./shim.js');

    const result = stat('/shared/note.txt');
    let settled = false;
    void result.then(() => { settled = true; }, () => { settled = true; });

    handleFsMessage({
      type: 'fs.changed',
      change: { watchId: 'watch-1', path: '/shared/note.txt', kind: 'modified' },
    });
    await Promise.resolve();

    expect(settled).toBe(false);

    handleFsMessage({
      type: 'fs.stat.result',
      id: 'fs-test-1',
      metadata: { path: '/shared/note.txt', kind: 'file' },
    });

    await expect(result).resolves.toEqual({ path: '/shared/note.txt', kind: 'file' });
  });

  it('clears pending requests and handlers on cleanup', async () => {
    const { installFsShim, handleFsMessage, onChanged } = await import('./shim.js');
    const handler = vi.fn();

    const cleanup = installFsShim();
    onChanged(handler);
    cleanup();

    handleFsMessage({
      type: 'fs.changed',
      change: { watchId: 'watch-1', path: '/shared/note.txt', kind: 'modified' },
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
