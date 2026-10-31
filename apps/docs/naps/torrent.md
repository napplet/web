# TORRENT

## Transfers and content

This non-normative guide follows the living [NAP-TORRENT proposal](https://github.com/napplet/naps/blob/nap-torrent/naps/NAP-TORRENT.md). Import `torrent` from `@napplet/sdk` or `@napplet/sdk/torrent`; root exports include prefixed helpers such as `torrentAdd` and `torrentRead`. The dedicated subpath also provides bare aliases such as `add` and `read`.

The API exposes `capabilities`, `pickFiles`, `add`, `status`, `jobs`, `files`, `selectFiles`, `pause`, `resume`, `remove`, `metadata`, `read`, `exportMetainfo`, `saveFile`, `openFile`, `cancel`, and `update`. Listen with `onState`, `onProgress`, and `onError`; close subscriptions when their owning view is disposed. Typed `ok: false` refusals resolve as results; top-level errors and request timeouts reject.

```ts
import { torrent } from '@napplet/sdk/torrent';

if (window.napplet?.torrent) {
  const ack = await torrent.add({
    source: {
      sourceType: 'infohash',
      hashes: { v1: '0123456789abcdef0123456789abcdef01234567' },
    },
    options: { mode: 'download', startPaused: true },
  });
  if (!ack.ok) console.error(ack.error, ack.reason);
  else console.log(await torrent.status(ack.jobId));
}
```

`add` acknowledges job creation, not completion. The runtime owns the engine, consent, storage, and network policy. A file-picker grant authorizes seeding only; reading, saving, or opening that data needs separate authorization. Discovery, Nostr event conversion, publishing, and comments belong to other capabilities or napplet libraries, outside `torrent`.

## API reference

All operations return promises. The SDK forwards calls to the injected runtime; capability discovery describes support and limits without granting permission.

| Method | Result |
| --- | --- |
| `capabilities()` | `TorrentCapabilities` |
| `pickFiles(options?)` | `TorrentFileSetResult` |
| `add(request)` | `TorrentJobAck` |
| `status(jobId)` | `TorrentJobStatus` |
| `jobs(filter?)` | `TorrentJobSummary[]` |
| `files(jobId)` | `TorrentFileStatus[]` |
| `selectFiles(jobId, selection)` | `TorrentJobStatus` |
| `pause(jobId)` | `TorrentJobStatus` |
| `resume(jobId)` | `TorrentJobStatus` |
| `remove(jobId, options?)` | `TorrentRemoveResult` |
| `metadata(jobId)` | `TorrentMetadataResult` |
| `read(request)` | `TorrentReadResult` |
| `exportMetainfo(jobId)` | `TorrentMetainfoResult` |
| `saveFile(jobId, fileIndex)` | `TorrentFileActionResult` |
| `openFile(jobId, fileIndex)` | `TorrentFileActionResult` |
| `cancel(requestId)` | `TorrentCancelResult` |
| `update(request)` | `TorrentSettingsResult` |

Sources select exactly one of `magnet`, `hashes`, `metainfo`, or `runtimeFileSetId`. An `infohash` source uses `hashes: { v1 }`, `hashes: { v2 }`, or both for a hybrid identity. V1 hashes contain 40 lowercase hexadecimal characters; full v2 hashes contain 64. A claimed source identity is not proof that metadata has been verified. `metadata()` reports verified format and hashes once available. Unknown hashes, totals, and progress are omitted from status rather than represented by zero.

## Verified reads and cancellation

Read a file index returned by `files()`, using limits advertised by `capabilities()`. `read` returns the entire requested range clipped to the file length, or a typed failure. Successful bytes use standard padded base64 in `dataBase64`. The runtime verifies bytes, bounds pending work, and separately authorizes disclosure. The napplet handles decoding and playback; no direct network URL or decoder is supplied.

```ts
const limits = await torrent.capabilities();
const result = await torrent.read({
  jobId,
  fileIndex: 0,
  offset: 0,
  length: Math.min(65536, limits.maxReadBytes),
  waitMs: Math.min(1000, limits.maxReadWaitMs),
});
if (result.ok) {
  console.log(result.byteLength, result.eof, result.dataBase64);
} else {
  console.error(result.error, result.reason);
}
```

With no wait, unavailable data returns `not-ready`; a positive wait can return `timeout`. Unselected files return `file-not-selected`. Paused jobs can serve verified local bytes without resuming networking. Range prioritization is temporary and does not change persistent file selection. An offset at the file length succeeds with empty bytes and `eof: true`; an offset beyond it fails with `invalid-range`.

The package binding returns a `TorrentPendingRequest<T>` from `read`, `exportMetainfo`, and `saveFile`. This is a promise with a readonly `requestId` for use with `cancel`; it is a local binding convenience, not an extra wire field.

```ts
const pending = torrent.read({ jobId, fileIndex: 0, offset: 0, length: 65536, waitMs: 1000 });
const cancellation = await torrent.cancel(pending.requestId);
const result = await pending;
if (cancellation.ok && cancellation.cancelled) {
  console.log(result); // { ok: false, error: 'cancelled' }
}
```

Cancellation competes with completion. `cancelled: false` means cancellation did not win; it does not undo a completed save. Requests and cancellation are endpoint-scoped. The binding discards duplicate terminal messages and late bytes after successful cancellation.

## Metadata, export, and file actions

`metadata(jobId)` reports verified v1/v2/hybrid identity and permitted discovery hints. Tracker and web-seed lists are effective settings, not authenticated content. Omitted lists with `endpointsRedacted: true` indicate withheld URLs; an empty list means known empty. Treat names and paths as untrusted display data.

`exportMetainfo(jobId)` returns a complete, bounded `.torrent` file as `dataBase64`, with its decoded byte count and hashes. An unavailable or incomplete info dictionary returns `metadata-unavailable`. Export preserves identity and includes required format metadata under disclosure policy. Input `MetainfoBytes` remains projection-defined and opaque (`unknown`) in these packages; the export's defined base64 encoding does not define the input representation.

`saveFile(jobId, fileIndex)` uses the runtime's destination picker for a complete verified file. Success reports `outcome: 'saved'`; it does not expose a filesystem path. `openFile` reports `outcome: 'accepted'` when the runtime accepts opening or handoff responsibility, not when playback finishes. Check `canSaveFiles` and `canOpenFiles`, handle `unsupported` or refusal, and request separate authorization even for files selected for seeding. Neither action returns a reusable URL or a cross-napplet grant.

## Settings and retained jobs

Use the latest `status.settings.revision` when updating a job. Supplied arrays replace their whole lists; `[]` clears a list. Omitted fields stay unchanged. A stale revision returns `revision-conflict` with current settings, and any failure leaves the patch unapplied.

```ts
const status = await torrent.status(jobId);
const updated = await torrent.update({
  jobId,
  expectedRevision: status.settings.revision,
  patch: { uploadLimitBytesPerSecond: 500000 },
});
if (!updated.ok) console.error(updated.error, updated.settings);
```

Settings changes can affect the reported mode and seeding state. A paused job stays paused; changing `seedAfterComplete` does not grant transport authority. Use `mutableSettings` to discover supported fields and inspect returned effective settings after shell policy is applied.

`retention` defaults to `session`, independently of the storage choice. Session jobs end with their creating endpoint. Request `retention: 'persistent'` only when advertised and admitted by runtime policy. After reconnecting, recover authorized retained jobs with `jobs()` and refresh them with `status()`; there is no event replay. Stable job IDs identify jobs without granting access. File-set handles remain endpoint-scoped, while an admitted persistent job retains its own authorized source lease. Artifact upgrades and profile ownership continuity are runtime decisions.

## Seeding and job events

```ts
const picked = await torrent.pickFiles({ multiple: true });
if (picked.ok) {
  const ack = await torrent.add({
    source: { sourceType: 'runtime-file-set', runtimeFileSetId: picked.fileSet.runtimeFileSetId },
    options: { mode: 'seed', createFormat: 'v1' },
  });
  if (!ack.ok) console.error(ack.error, ack.reason);
}
```

Use `formats` and `createFormats` to discover format support. A picker handle authorizes a seed source without exposing local paths or granting content reads. `remove(jobId, { deleteData: true })` requests deletion; the runtime can refuse deletion of user-owned or shared data.

```ts
const progress = torrent.onProgress(({ jobId, status }) => {
  console.log(jobId, status.progress, status.downloadRate);
});
const failures = torrent.onError(({ jobId, error, reason }) => {
  console.error(jobId, error, reason);
});
// Close both subscriptions when the owning view is disposed.
```

Progress, when known, is a fraction from 0 to 1; rates are bytes per second. Pushes identify jobs by `jobId`, while request/result envelopes correlate by `id`. A successful `add` only acknowledges creation.

## Discovery and runtime verification

Discovery, event conversion, publishing, and comments are outside the torrent domain. A NIP-35 napplet can use `outbox` for Nostr reads and publication, convert metadata locally, then pass a magnet or hash set to `add`. `relay` remains an explicit escape hatch under its own policy. These integrations do not create torrent dependencies on Nostr capability domains.

The conformance reference shell uses a mock `reference` transport and session-scoped jobs, with empty `formats` and `createFormats`. Metadata, reads, and export return `metadata-unavailable`; picking, saving, and opening files are unsupported. It does not transfer content or provide persistent backend recovery. Passing mock conformance does not prove byte verification, live tracker/DHT behavior, consent, file handoff, or storage isolation in a real host. Verify those with a TORRENT-capable runtime.
