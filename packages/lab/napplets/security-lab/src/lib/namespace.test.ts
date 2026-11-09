import { describe, expect, it } from 'vitest';
import { inspectNamespace, findReachablePorts, checkDeclaredDomains } from './namespace';

class FakePort {}

describe('inspectNamespace', () => {
  it('reports absence when window.napplet is missing', () => {
    const result = inspectNamespace({}, { portCtor: FakePort });
    expect(result.present).toBe(false);
    expect(result.domains).toEqual([]);
    expect(result.reachablePorts).toEqual([]);
  });

  it('lists domain objects and flags non-object members and malformed names', () => {
    const win = {
      napplet: {
        relay: { query() {} },
        identity: { getPublicKey() {} },
        ready: () => undefined,
        version: '1.0',
        'NAP-THEME': {},
        'perm:relay': {},
      },
    };
    const result = inspectNamespace(win, { portCtor: FakePort });
    expect(result.present).toBe(true);
    expect(result.domains).toEqual(['relay', 'identity', 'ready', 'NAP-THEME', 'perm:relay']);
    expect(result.invalidKeys).toEqual(['version']);
    expect(result.malformedNames).toEqual(['NAP-THEME', 'perm:relay']);
  });

  it('finds a MessagePort hidden inside the namespace', () => {
    const port = new FakePort();
    const win = { napplet: { relay: { internals: { port } } } };
    const result = inspectNamespace(win, { portCtor: FakePort });
    expect(result.reachablePorts).toEqual(['window.napplet.relay.internals.port']);
  });

  it('finds a MessagePort leaked as a window global', () => {
    const win = { __port: new FakePort(), napplet: { relay: {} } };
    const result = inspectNamespace(win, { portCtor: FakePort });
    expect(result.reachablePorts).toEqual(['window.__port']);
  });

  it('skips throwing getters and survives cycles', () => {
    const cyclic: Record<string, unknown> = { relay: {} };
    cyclic.self = cyclic;
    Object.defineProperty(cyclic, 'boom', { get() { throw new Error('nope'); }, enumerable: true });
    const result = inspectNamespace({ napplet: cyclic }, { portCtor: FakePort });
    expect(result.present).toBe(true);
    expect(result.reachablePorts).toEqual([]);
    expect(result.domains).toContain('self');
  });

  it('treats a missing MessagePort constructor as nothing to find', () => {
    expect(findReachablePorts({ a: {} }, 'x', undefined)).toEqual([]);
  });
});

describe('checkDeclaredDomains', () => {
  it('splits declared domains into present and missing, preserving declaration order', () => {
    const result = checkDeclaredDomains({ domains: ['storage', 'relay'] }, ['relay', 'identity', 'storage']);
    expect(result.present).toEqual(['relay', 'storage']);
    expect(result.missing).toEqual(['identity']);
  });
});
