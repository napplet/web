// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { SoulseekApi } from '@napplet/core';
import { runtimePrelude } from './boot.js';
import { createReferenceShell } from '../shell/reference-shell.js';
import { REFERENCE_SOULSEEK_PEER } from '../shell/reference-soulseek.js';

type Host = { napplet: { soulseek?: SoulseekApi } };

describe('embedded soulseek binding', () => {
  it('installs only when granted and exchanges request/result envelopes with the reference shell', async () => {
    const parent = window.parent;
    const shell = createReferenceShell();
    const posted: Record<string, unknown>[] = [];
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage(message: Record<string, unknown>) {
      if (!String(message.type).startsWith('soulseek.')) return;
      posted.push(message);
      for (const data of shell.handle(message)) queueMicrotask(() => {
        window.dispatchEvent(new MessageEvent('message', { source: window.parent, data }));
      });
    } } });
    try {
      Function(runtimePrelude([]))();
      expect((window as unknown as Host).napplet.soulseek).toBeUndefined();
      Function(runtimePrelude(['soulseek']))();
      const api = (window as unknown as Host).napplet.soulseek!;
      expect(Object.keys(api).sort()).toEqual(['browse', 'cancel', 'download', 'info', 'pause', 'read', 'release', 'results',
        'resume', 'save', 'search', 'status', 'stop', 'transfers']);
      expect((await api.info()).state).toBe('online');
      const query = await api.search({ text: 'rain' });
      expect(posted.at(-1)).toEqual({ type: 'soulseek.search', id: expect.any(String), request: { text: 'rain' } });
      const page = await api.results(query.queryId);
      expect(posted.at(-1)).toEqual({ type: 'soulseek.results', id: expect.any(String), queryId: query.queryId });
      expect(page.query.count).toBe(1);
      await api.results(query.queryId, 0, 1);
      expect(posted.at(-1)).toMatchObject({ after: 0, limit: 1 });
      const transfer = await api.download(page.files[0].fileId);
      expect(transfer.state).toBe('queued');
      expect((await api.status(transfer.transferId)).state).toBe('complete');
      expect(await api.read(transfer.transferId, '0', 3)).toEqual({ offset: '0', data: 'YWJj', length: 3, eof: true });
      expect((await api.transfers()).map((item) => item.transferId)).toEqual([transfer.transferId]);
      const paused = await api.pause(transfer.transferId).catch((error: unknown) => error) as Error & { code?: string };
      expect(paused.code).toBe('invalid_state');
      const unsupported = await api.save(transfer.transferId).catch((error: Error & { code?: string }) => error) as Error & { code: string };
      expect(unsupported).toBeInstanceOf(Error);
      expect(unsupported.name).toBe('SoulseekError');
      expect(unsupported.code).toBe('unsupported');
      expect(unsupported.message).toEqual(expect.any(String));
      expect((await api.stop(query.queryId)).state).toBe('complete');
      expect(await api.release('query', query.queryId)).toEqual({ released: true });
      expect(await api.release('transfer', transfer.transferId)).toEqual({ released: true });
      await expect(api.browse(REFERENCE_SOULSEEK_PEER)).resolves.toMatchObject({ kind: 'browse' });
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: parent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });

  it('ignores forged sources, mismatched result types, and malformed one-of results', async () => {
    const parent = window.parent;
    let posted: Record<string, unknown> = {};
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage(message: Record<string, unknown>) {
      if (String(message.type).startsWith('soulseek.')) posted = message;
    } } });
    const deliver = (data: unknown, source: MessageEventSource = window.parent) =>
      window.dispatchEvent(new MessageEvent('message', { source, data }));
    try {
      Function(runtimePrelude(['soulseek']))();
      const api = (window as unknown as Host).napplet.soulseek!;
      const transfers = api.transfers();
      const resolved = vi.fn();
      void transfers.then(resolved);
      deliver({ type: 'soulseek.transfers.result', id: posted.id, value: [] }, {} as MessageEventSource);
      deliver({ type: 'soulseek.status.result', id: posted.id, value: [] });
      deliver({ type: 'soulseek.transfers.result', id: 'other', value: [] });
      await Promise.resolve();
      expect(resolved).not.toHaveBeenCalled();
      deliver({ type: 'soulseek.transfers.result', id: posted.id, value: [] });
      expect(await transfers).toEqual([]);
      const both = api.info();
      deliver({ type: 'soulseek.info.result', id: posted.id, value: { state: 'online' }, error: { code: 'denied', message: 'x' } });
      await expect(both).rejects.toThrow('exactly one of value or error');
      const neither = api.info();
      deliver({ type: 'soulseek.info.result', id: posted.id });
      await expect(neither).rejects.toThrow('exactly one of value or error');
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: parent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });
});
