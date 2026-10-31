// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { TorrentApi } from '@napplet/core';
import { runtimePrelude } from './boot.js';
import { createReferenceShell } from '../shell/reference-shell.js';

const infoHash = '0123456789abcdef0123456789abcdef01234567';

describe('embedded torrent binding', () => {
  it('installs only when granted, exchanges job envelopes, and routes only parent pushes', async () => {
    const parent = window.parent;
    const shell = createReferenceShell();
    const posted: Record<string, unknown>[] = [];
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage(message: Record<string, unknown>) {
      if (!String(message.type).startsWith('torrent.')) return;
      posted.push(message);
      for (const data of shell.handle(message)) queueMicrotask(() => {
        window.dispatchEvent(new MessageEvent('message', { source: window.parent, data }));
      });
    } } });
    try {
      Function(runtimePrelude([]))();
      expect((window as unknown as { napplet: { torrent?: TorrentApi } }).napplet.torrent).toBeUndefined();
      Function(runtimePrelude(['torrent']))();
      const api = (window as unknown as { napplet: { torrent: TorrentApi } }).napplet.torrent;
      expect(api).toBeDefined();
      expect((await api.capabilities()).transports).toEqual(['reference']);
      for (const retired of ['fromEvent', 'toMagnet', 'search', 'publish', 'comment']) expect(api).not.toHaveProperty(retired);
      expect((await api.pickFiles()).ok).toBe(false);
      const state = vi.fn();
      const progress = vi.fn();
      const error = vi.fn();
      const subscriptions = [api.onState(state), api.onProgress(progress), api.onError(error)];
      const ack = await api.add({ source: { sourceType: 'infohash', hashes: { v1: infoHash } }, jobId: 'job' });
      expect(ack).toEqual({ ok: true, jobId: 'job', state: 'metadata' });
      expect(state).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'job', state: 'metadata' }));
      expect(state.mock.calls[0][0]).not.toHaveProperty('type');
      const status = await api.status('job');
      expect(posted.find((message) => message.type === 'torrent.status')).toEqual({ type: 'torrent.status', id: expect.any(String), jobId: 'job' });
      expect(await api.jobs()).toHaveLength(1);
      expect(await api.files('job')).toEqual([]);
      expect((await api.pause('job')).state).toBe('paused');
      expect((await api.resume('job')).state).toBe('metadata');
      expect((await api.selectFiles('job', {})).jobId).toBe('job');
      expect((await api.metadata('job')).ok).toBe(false);
      expect((await api.read({ jobId: 'job', fileIndex: 0, offset: 0, length: 5 })).ok).toBe(false);
      expect((await api.exportMetainfo('job')).ok).toBe(false);
      expect((await api.saveFile('job', 0)).ok).toBe(false);
      expect((await api.openFile('job', 0)).ok).toBe(false);
      expect(await api.cancel('finished')).toEqual({ ok: true, cancelled: false });
      expect(await api.update({ jobId: 'job', expectedRevision: 0, patch: { uploadLimitBytesPerSecond: 10 } }))
        .toMatchObject({ ok: true, settings: { revision: 1, uploadLimitBytesPerSecond: 10 } });
      for (const source of [{} as MessageEventSource, window.parent]) {
        window.dispatchEvent(new MessageEvent('message', { source, data: { type: 'torrent.progress', jobId: 'job', status } }));
        window.dispatchEvent(new MessageEvent('message', { source, data: { type: 'torrent.error', jobId: 'job', error: 'no-peers' } }));
      }
      expect(progress).toHaveBeenCalledExactlyOnceWith({ jobId: 'job', status });
      expect(error).toHaveBeenCalledExactlyOnceWith({ jobId: 'job', error: 'no-peers' });
      subscriptions.forEach((subscription) => subscription.close());
      window.dispatchEvent(new MessageEvent('message', { source: window.parent,
        data: { type: 'torrent.error', jobId: 'job', error: 'no-peers' } }));
      expect(error).toHaveBeenCalledTimes(1);
      expect((await api.remove('job')).ok).toBe(true);
      await expect(api.status('job')).rejects.toThrow('job-not-found');
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: parent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });
  it('ignores matching ids without the exact result type', async () => {
    const parent = window.parent;
    let posted: Record<string, unknown> = {};
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage(message: Record<string, unknown>) {
      if (message.type === 'torrent.jobs') posted = message;
    } } });
    try {
      Function(runtimePrelude(['torrent']))();
      const api = (window as unknown as { napplet: { torrent: TorrentApi } }).napplet.torrent;
      const result = api.jobs();
      const resolved = vi.fn();
      void result.then(resolved);
      for (const type of [undefined, 'torrent.files.result']) {
        window.dispatchEvent(new MessageEvent('message', { source: window.parent, data: { type, id: posted.id, jobs: [] } }));
      }
      await Promise.resolve();
      expect(resolved).not.toHaveBeenCalled();
      window.dispatchEvent(new MessageEvent('message', { source: window.parent,
        data: { type: 'torrent.jobs.result', id: posted.id, jobs: [] } }));
      expect(await result).toEqual([]);
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: parent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });
  it('cancels a buffering read before late bytes and preserves the request id', async () => {
    const parent = window.parent;
    const posted: Record<string, any>[] = [];
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage(message: Record<string, unknown>) {
      if (String(message.type).startsWith('torrent.')) posted.push(message);
    } } });
    const deliver = (data: unknown) => window.dispatchEvent(new MessageEvent('message', { source: window.parent, data }));
    try {
      Function(runtimePrelude(['torrent']))();
      const api = (window as unknown as { napplet: { torrent: TorrentApi } }).napplet.torrent;
      const pendingRead = api.read({ jobId: 'job', fileIndex: 0, offset: 0, length: 5, waitMs: 30000 });
      expect(pendingRead.requestId).toBe(posted[0].id);
      const cancelled = api.cancel(pendingRead.requestId);
      expect(posted[1]).toMatchObject({ type: 'torrent.cancel', requestId: pendingRead.requestId });
      deliver({ type: 'torrent.cancel.result', id: posted[1].id, result: { ok: true, cancelled: true } });
      deliver({ type: 'torrent.read.result', id: pendingRead.requestId,
        result: { ok: true, offset: 0, dataBase64: 'aGVsbG8=', byteLength: 5, totalBytes: 5, eof: true } });
      expect(await pendingRead).toEqual({ ok: false, error: 'cancelled' });
      expect(await cancelled).toEqual({ ok: true, cancelled: true });
      deliver({ type: 'torrent.read.result', id: pendingRead.requestId, result: { ok: false, error: 'cancelled' } });
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: parent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });

  it('allows a full read wait before the binding timeout', async () => {
    vi.useFakeTimers();
    const parent = window.parent;
    let posted: Record<string, unknown> = {};
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage(message: Record<string, unknown>) {
      posted = message;
    } } });
    try {
      Function(runtimePrelude(['torrent']))();
      const api = (window as unknown as { napplet: { torrent: TorrentApi } }).napplet.torrent;
      const read = api.read({ jobId: 'job', fileIndex: 0, offset: 0, length: 5, waitMs: 30000 });
      const settled = vi.fn();
      void read.then(settled, settled);
      await vi.advanceTimersByTimeAsync(30000);
      expect(settled).not.toHaveBeenCalled();
      window.dispatchEvent(new MessageEvent('message', { source: window.parent,
        data: { type: 'torrent.read.result', id: posted.id, result: { ok: false, error: 'timeout' } } }));
      expect(await read).toEqual({ ok: false, error: 'timeout' });
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: parent });
      delete (window as unknown as { napplet?: unknown }).napplet;
      vi.useRealTimers();
    }
  });

});
