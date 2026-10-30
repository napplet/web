import { expect, expectTypeOf, it } from 'vitest';
import type { MeshBlobsResultMessage, MeshInfoResultMessage, MeshNapMessage, MeshSubscribeMessage } from './types.js';

it('represents error-only result envelopes and both filter input forms', () => {
  const info: MeshInfoResultMessage = { type: 'mesh.info.result', id: 'i1', error: 'cannot query circle' };
  const blobs: MeshBlobsResultMessage = { type: 'mesh.blobs.result', id: 'b1', error: 'cannot ask members' };
  const subscribe: MeshSubscribeMessage = { type: 'mesh.subscribe', id: 's1', subId: 'room', filters: { kinds: [9] } };
  expectTypeOf(info).toExtend<MeshNapMessage>();
  expectTypeOf(blobs).toExtend<MeshNapMessage>();
  expectTypeOf(subscribe).toExtend<MeshNapMessage>();
  expect([info, blobs]).toEqual([
    { type: 'mesh.info.result', id: 'i1', error: 'cannot query circle' },
    { type: 'mesh.blobs.result', id: 'b1', error: 'cannot ask members' },
  ]);
});
