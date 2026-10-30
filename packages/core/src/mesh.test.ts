import { describe, expect, expectTypeOf, it } from 'vitest';
import { NAP_DOMAINS } from './index.js';
import type { EventTemplate, MeshApi, NappletGlobal } from './index.js';

describe('mesh public contract', () => {
  it('supports canonical unsigned templates without shell-owned timestamp or optional tags', () => {
    const template: EventTemplate = { kind: 1, content: 'hello' };
    expect(template).toEqual({ kind: 1, content: 'hello' });
    expectTypeOf<NappletGlobal['mesh']>().toEqualTypeOf<MeshApi | undefined>();
    expect(NAP_DOMAINS).toContain('mesh');
  });
});
