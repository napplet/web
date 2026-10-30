# TORRENT

## Torrent indexes and jobs

This non-normative guide follows the living [NAP-TORRENT proposal](https://github.com/napplet/naps/blob/nap-torrent/naps/NAP-TORRENT.md). Import the `torrent` namespace from `@napplet/sdk` or `@napplet/sdk/torrent`; root exports also include prefixed helpers such as `torrentSearch` and `torrentAdd`. The dedicated subpath provides bare aliases such as `search` and `add`.

The API exposes `capabilities`, `fromEvent`, `toMagnet`, `search`, `publish`, `comment`, `pickFiles`, `add`, `status`, `jobs`, `files`, `selectFiles`, `pause`, `resume`, and `remove`. Listen with `onState`, `onProgress`, and `onError`; each returns a `Subscription` with `close()`. Push callbacks retain `jobId` so callers can filter their jobs. Typed `ok: false` refusals resolve as results; top-level errors and request timeouts reject.

```ts
import { torrent } from '@napplet/sdk/torrent';

if (window.napplet?.torrent) {
  const matches = await torrent.search({ tags: ['dataset'], limit: 10 });
  if (matches[0]) {
    const ack = await torrent.add({
      source: { sourceType: 'nip35', descriptor: matches[0].descriptor },
      options: { mode: 'download', startPaused: true },
    });
    if (!ack.ok) console.error(ack.error, ack.reason);
    else if (ack.jobId) console.log(await torrent.status(ack.jobId));
  }
}
```

`add` acknowledges creation, not completion. Register push listeners before starting a job and close them when their owning view is disposed. A runtime file picker returns an opaque `runtimeFileSetId` for seeding; it does not expose local paths or file bytes. Use `publish: false` to request a signed preview without relay publication. The runtime supplies the torrent engine, consent, storage, signing, and tracker/DHT policy. Gate an optional integration on domain presence; declaring `torrent` in a manifest does not grant transfer permission.

## API reference

All operations return promises. The SDK forwards arguments to the injected runtime without choosing an engine or granting access.

| Method | Result |
| --- | --- |
| `capabilities()` | `TorrentCapabilities` |
| `fromEvent(event)` | `TorrentDescriptorResult` |
| `toMagnet(descriptor)` | `TorrentMagnetResult` |
| `search(query)` | `TorrentSearchResult[]` |
| `publish(request)` | `TorrentPublishResult` |
| `comment(request)` | `TorrentPublishResult` |
| `pickFiles(options?)` | `TorrentFileSetResult` |
| `add(request)` | `TorrentJobAck` |
| `status(jobId)` | `TorrentJobStatus` |
| `jobs(filter?)` | `TorrentJobSummary[]` |
| `files(jobId)` | `TorrentFileStatus[]` |
| `selectFiles(jobId, selection)` | `TorrentJobStatus` |
| `pause(jobId)` | `TorrentJobStatus` |
| `resume(jobId)` | `TorrentJobStatus` |
| `remove(jobId, options?)` | `TorrentRemoveResult` |

For seeding, request a runtime file set and pass its handle to `add`. Handle cancellation or refusal before using the handle:

```ts
const picked = await torrent.pickFiles({ multiple: true });
if (picked.ok && picked.fileSet) {
  const ack = await torrent.add({
    source: {
      sourceType: 'runtime-file-set',
      runtimeFileSetId: picked.fileSet.runtimeFileSetId,
    },
    options: { mode: 'seed' },
  });
  if (!ack.ok) console.error(ack.error, ack.reason);
}
```

Listeners are local subscriptions, not new wire operations. Their callbacks receive state, progress, or error data with the job identifier:

```ts
const progress = torrent.onProgress(({ jobId, status }) => {
  console.log(jobId, status.progress, status.downloadRate);
});
const failures = torrent.onError(({ jobId, error, reason }) => {
  console.error(jobId, error, reason);
});
// Close both subscriptions when the owning view is disposed.
```

Progress is a fraction from 0 to 1; transfer rates are bytes per second. `remove(jobId, { deleteData: true })` requests deletion, but the runtime can refuse deletion of user-owned or shared data. Inspect the result before updating the UI.

## Metainfo encoding

The draft declares `TorrentSource.metainfo` as an abstract byte string but does not define its JSON web encoding. The SDK leaves that field opaque (`unknown`) rather than choosing base64 or a byte-array convention. Use another source form until the target runtime and proposal define an interoperable representation.

## Runtime and test boundaries

Search and descriptor conversion preserve raw Nostr source events in relay-owned `RelayEventResult` records. NIP-35 publication uses kind `2003`; comments use kind `2004`. Napplet code asks the runtime to perform these operations rather than constructing signing or network clients.

The conformance reference shell advertises a mock `reference` transport with download mode and simulates scoped job controls. Publishing, comments, and file picking return `unsupported`. Real transfers require a host with a torrent backend; verify its consent, file selection, storage isolation, pause/resume, and removal behavior separately.
