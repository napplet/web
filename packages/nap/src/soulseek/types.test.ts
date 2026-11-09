import { expectTypeOf, it } from 'vitest';
import type {
  SoulseekApi, SoulseekFailure, SoulseekInfoResultMessage, SoulseekQuery, SoulseekReadMessage,
  SoulseekResultsMessage, SoulseekSaved, SoulseekTransfer,
} from './types.js';
import { DOMAIN, SOULSEEK_ERROR_CODES } from './types.js';

it('models exactly-one-of value/error results and decimal-text byte counts', () => {
  const success: SoulseekInfoResultMessage = { type: 'soulseek.info.result', id: 'b0', value: {
    state: 'online', canSave: true, maxQueries: 4, maxTransfers: 8, maxResults: 500, maxPageSize: 100,
    maxReadBytes: 65536, maxTextBytes: 1024, queryTimeoutMs: 30000, pollIntervalMs: 1000,
  } };
  const failure: SoulseekInfoResultMessage = { type: 'soulseek.info.result', id: 'b0', error: { code: 'denied', message: 'Policy refused' } };
  // @ts-expect-error A result must not carry both value and error.
  const both: SoulseekInfoResultMessage = { ...success, error: { code: 'denied', message: 'Policy refused' } };
  // @ts-expect-error A failure needs a specification code.
  const unknownCode: SoulseekFailure = { code: 'oops', message: 'Unknown' };
  const numericSize: SoulseekTransfer = { transferId: 't', state: 'queued', maxReadBytes: 1, received: '0',
    // @ts-expect-error File sizes are decimal text, not numbers.
    file: { fileId: 'f', username: 'peer', path: 'p', size: 3, locked: false } };
  // @ts-expect-error Read offsets are decimal text.
  const numericOffset: SoulseekReadMessage = { type: 'soulseek.read', id: 'q', transferId: 't', offset: 0, length: 1 };
  // @ts-expect-error Saved is always true.
  const notSaved: SoulseekSaved = { saved: false };
  // @ts-expect-error Optional page parameters are omitted, never null.
  const nullAfter: SoulseekResultsMessage = { type: 'soulseek.results', id: 'q', queryId: 's', after: null };
  void [success, failure, both, unknownCode, numericSize, numericOffset, notSaved, nullAfter];
});

it('keeps the domain constant, the closed error code set, and promise-returning operations', () => {
  expectTypeOf(DOMAIN).toEqualTypeOf<'soulseek'>();
  expectTypeOf(SOULSEEK_ERROR_CODES).toHaveProperty('length').toEqualTypeOf<14>();
  expectTypeOf<SoulseekApi['results']>().returns.toEqualTypeOf<Promise<{ query: SoulseekQuery; files: import('./types.js').SoulseekFile[]; next: number }>>();
  expectTypeOf<SoulseekApi['release']>().parameter(0).toEqualTypeOf<'query' | 'transfer'>();
  expectTypeOf<keyof SoulseekApi>().toEqualTypeOf<
    'info' | 'search' | 'browse' | 'results' | 'stop' | 'download' | 'transfers'
    | 'status' | 'pause' | 'resume' | 'cancel' | 'read' | 'save' | 'release'
  >();
});
