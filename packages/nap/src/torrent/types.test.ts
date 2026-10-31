import { expectTypeOf, it } from 'vitest';
import type {
  TorrentApi, TorrentHashes, TorrentSource, TorrentJobStatus, TorrentReadResult,
  TorrentMetadataResult, TorrentCancelResult, TorrentSettings, TorrentPendingRequest,
} from './types.js';

it('models generic sources and conditional result records', () => {
  const hash: TorrentHashes = { v2: 'a'.repeat(64) };
  const source: TorrentSource = { sourceType: 'infohash', hashes: hash };
  expectTypeOf(source).toExtend<TorrentSource>();
  // @ts-expect-error A selected infohash source requires hashes.
  const missingSource: TorrentSource = { sourceType: 'infohash' };
  // @ts-expect-error Source fields must not be combined.
  const mixedSource: TorrentSource = { sourceType: 'magnet', magnet: 'magnet:', hashes: hash };
  // @ts-expect-error Hash sets require at least one identity.
  const emptyHashes: TorrentHashes = {};
  // @ts-expect-error Typed failures require a machine-readable error.
  const missingError: TorrentReadResult = { ok: false };
  // @ts-expect-error Successful reads require all content/range fields.
  const incompleteRead: TorrentReadResult = { ok: true, dataBase64: '' };
  // @ts-expect-error Failures do not disclose success-only file bytes.
  const leakedBytes: TorrentReadResult = { ok: false, error: 'user-denied', dataBase64: 'aGVsbG8=' };
  // @ts-expect-error Metadata success requires verified identities and policy indicators.
  const incompleteMetadata: TorrentMetadataResult = { ok: true, format: 'v2' };
  // @ts-expect-error Cancellation success requires its outcome.
  const incompleteCancel: TorrentCancelResult = { ok: true };
  void [missingSource, mixedSource, emptyHashes, missingError, incompleteRead, leakedBytes, incompleteMetadata, incompleteCancel];
});

it('permits unknown status fields to stay absent and keeps read cancellation accessible', () => {
  const settings: TorrentSettings = { revision: 0, downloadLimitBytesPerSecond: 0,
    uploadLimitBytesPerSecond: 0, seedAfterComplete: false, endpointsRedacted: true };
  const status: TorrentJobStatus = { ok: true, jobId: 'job', state: 'queued', mode: 'download', transport: 'auto',
    downloadedBytes: 0, uploadedBytes: 0, downloadRate: 0, uploadRate: 0, ratio: 0,
    peers: { peers: 0, seeds: 0, leeches: 0 }, settings, retention: 'session' };
  expectTypeOf(status.hashes).toEqualTypeOf<TorrentHashes | undefined>();
  expectTypeOf<TorrentApi['read']>().returns.toEqualTypeOf<TorrentPendingRequest<TorrentReadResult>>();
});
