// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { LlmApi } from '@napplet/core';
import { runtimePrelude } from './boot.js';
import { createReferenceShell } from '../shell/reference-shell.js';

type Host = { napplet: { llm?: LlmApi } };
const prompt = (handle: string, text: string) => ({ handle, messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text }] }] });

describe('embedded llm binding', () => {
  it('installs only when granted and exchanges request, delta, and result envelopes with the reference shell', async () => {
    const parent = window.parent;
    const shell = createReferenceShell();
    const posted: Record<string, unknown>[] = [];
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage(message: Record<string, unknown>) {
      if (!String(message.type).startsWith('llm.')) return;
      posted.push(message);
      for (const data of shell.handle(message)) queueMicrotask(() => {
        window.dispatchEvent(new MessageEvent('message', { source: window.parent, data }));
      });
    } } });
    try {
      Function(runtimePrelude([]))();
      expect((window as unknown as Host).napplet.llm).toBeUndefined();
      Function(runtimePrelude(['llm']))();
      const api = (window as unknown as Host).napplet.llm!;
      expect(Object.keys(api).sort()).toEqual(['cancel', 'describe', 'generate', 'select']);
      const model = await api.select({ json: true });
      expect(posted.at(-1)).toEqual({ type: 'llm.select', id: expect.any(String), requirements: { json: true } });
      expect(model.model).toBe('reference-model');
      await api.select();
      expect(posted.at(-1)).toEqual({ type: 'llm.select', id: expect.any(String) });
      expect((await api.describe(model.handle)).handle).toBe(model.handle);
      const deltas: string[] = [];
      const pending = api.generate({ ...prompt(model.handle, 'Say hello.') }, { onDelta: (delta) => deltas.push(delta.text) });
      expect(posted.at(-1)).toEqual({ type: 'llm.generate', id: pending.requestId, request: prompt(model.handle, 'Say hello.') });
      const generation = await pending;
      expect(generation).toMatchObject({ text: 'Echo: Say hello.', finish: 'stop' });
      expect(deltas).toHaveLength(1);
      expect(generation.text.startsWith(deltas[0])).toBe(true);
      expect(await api.cancel(pending.requestId)).toBe(false);
      const controller = new AbortController();
      const stalled = api.generate(prompt(model.handle, 'wait [[stall]]'), { signal: controller.signal });
      await Promise.resolve();
      controller.abort();
      const failure = await stalled.catch((error: Error & { code?: string }) => error) as Error & { code: string };
      expect(failure).toBeInstanceOf(Error);
      expect(failure.name).toBe('LlmError');
      expect(failure.code).toBe('cancelled');
      expect(posted.at(-1)).toEqual({ type: 'llm.cancel', id: expect.any(String), requestId: stalled.requestId });
      const expired = await api.describe('unknown').catch((error: unknown) => error) as Error & { code?: string };
      expect(expired.code).toBe('selection-expired');
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: parent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });

  it('ignores forged sources, mismatched result types, foreign deltas, and malformed one-of results', async () => {
    const parent = window.parent;
    let posted: Record<string, unknown> = {};
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage(message: Record<string, unknown>) {
      if (String(message.type).startsWith('llm.')) posted = message;
    } } });
    const deliver = (data: unknown, source: MessageEventSource = window.parent) =>
      window.dispatchEvent(new MessageEvent('message', { source, data }));
    try {
      Function(runtimePrelude(['llm']))();
      const api = (window as unknown as Host).napplet.llm!;
      const model = { handle: 'h1', name: 'n', model: 'm', route: 'r', images: false, json: false };
      const selected = api.select();
      const resolved = vi.fn();
      void selected.then(resolved);
      deliver({ type: 'llm.select.result', id: posted.id, model }, {} as MessageEventSource);
      deliver({ type: 'llm.describe.result', id: posted.id, model });
      deliver({ type: 'llm.select.result', id: 'other', model });
      await Promise.resolve();
      expect(resolved).not.toHaveBeenCalled();
      deliver({ type: 'llm.select.result', id: posted.id, model });
      expect(await selected).toEqual(model);
      const deltas: unknown[] = [];
      const pending = api.generate(prompt('h1', 'x'), { onDelta: (delta) => deltas.push(delta) });
      deliver({ type: 'llm.delta', requestId: pending.requestId, sequence: 0, text: 'a' }, {} as MessageEventSource);
      deliver({ type: 'llm.delta', requestId: 'other', sequence: 0, text: 'b' });
      deliver({ type: 'llm.delta', requestId: pending.requestId, sequence: 1, text: 'gap' });
      deliver({ type: 'llm.delta', requestId: pending.requestId, sequence: 0, text: 'late' });
      expect(deltas).toEqual([]);
      deliver({ type: 'llm.generate.result', id: pending.requestId, result: { text: 'done', finish: 'stop' } });
      expect(await pending).toEqual({ text: 'done', finish: 'stop' });
      const both = api.describe('h1');
      deliver({ type: 'llm.describe.result', id: posted.id, model, error: { code: 'unsupported', message: 'x' } });
      await expect(both).rejects.toThrow('exactly one of model or error');
      const neither = api.cancel('g1');
      deliver({ type: 'llm.cancel.result', id: posted.id });
      await expect(neither).rejects.toThrow('exactly one of cancelled or error');
    } finally {
      Object.defineProperty(window, 'parent', { configurable: true, value: parent });
      delete (window as unknown as { napplet?: unknown }).napplet;
    }
  });
});
