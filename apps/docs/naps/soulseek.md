# SOULSEEK

## Discovery and downloads through the runtime

This non-normative guide follows the living [NAP-SOULSEEK proposal](https://github.com/napplet/naps/pull/135). When the runtime exposes `window.napplet.soulseek`, a napplet can search the Soulseek network, browse one peer's shared files, and request downloads. The shell owns the account, peer networking, storage, content disclosure, and saving; the napplet works with bounded result pages and opaque, endpoint-owned handles. Domain presence does not imply a connected account or a policy grant: check `info().state` and handle refusals.

Import `soulseek` from `@napplet/sdk` or `@napplet/sdk/soulseek`; root exports include prefixed helpers such as `soulseekSearch` and `soulseekRead`. The dedicated subpath also provides bare aliases such as `search` and `read`.

```ts
import { soulseek, isSoulseekFailure } from '@napplet/sdk/soulseek';

if (window.napplet?.soulseek) {
  const info = await soulseek.info();
  if (info.state !== 'online') return showAccountHint(info.state);
  const query = await soulseek.search({ text: 'field recording' });
  const page = await soulseek.results(query.queryId, 0, info.maxPageSize);
  for (const file of page.files) render(file.username, file.path, file.size);
}
```

## Results and failures

Each method resolves with the record named in the proposal's API table. When the runtime answers with a `Failure`, the promise rejects with an `Error` whose `code` is one of the fourteen specification codes (`invalid_request`, `denied`, `unavailable`, `unsupported`, `not_found`, `invalid_state`, `limit_exceeded`, `peer_unavailable`, `peer_denied`, `source_changed`, `timeout`, `cancelled`, `revoked`, `backend_error`) and whose `message` is a diagnostic for people, not for matching. Use `isSoulseekFailure(error)` to recognize one across bundle boundaries. A lost response is different from an explicit error: the binding's own transport timeout rejects with a plain `Error` and no `code`. After a timed-out `download`, call `transfers()` to reconcile before retrying.

```ts
try {
  await soulseek.read(transferId, '0', 65536);
} catch (error) {
  if (isSoulseekFailure(error) && error.code === 'denied') explainContentConsent();
  else throw error;
}
```

| Method | Result |
| --- | --- |
| `info()` | `SoulseekInfo` |
| `search(request)` | `SoulseekQuery` |
| `browse(username)` | `SoulseekQuery` |
| `results(queryId, after?, limit?)` | `SoulseekQueryPage` |
| `stop(queryId)` | `SoulseekQuery` |
| `download(fileId)` | `SoulseekTransfer` |
| `transfers()` | `SoulseekTransfer[]` |
| `status(transferId)` | `SoulseekTransfer` |
| `pause(transferId)` | `SoulseekTransfer` |
| `resume(transferId)` | `SoulseekTransfer` |
| `cancel(transferId)` | `SoulseekTransfer` |
| `read(transferId, offset, length)` | `SoulseekChunk` |
| `save(transferId)` | `SoulseekSaved` |
| `release(kind, handle)` | `SoulseekReleased` |

Byte counts (`File.size`, `Transfer.received`, read offsets) are canonical unsigned decimal text such as `"3"` or `"18446744073709551615"`, never numbers, so 64-bit Soulseek sizes survive JSON. Other integers are safe nonnegative integers. Optional fields are omitted when unavailable; the binding never sends `null`.

## Queries and pagination

`search` and `browse` return after admission with `state: "collecting"` and `count: 0`; they do not wait for peers. Poll `results` no more often than `info().pollIntervalMs`. Each page carries the query snapshot taken with it, entries in arrival order starting at `after` (default 0), and `next`. Request another page while `next < query.count`; when they are equal, poll again if the query is still collecting or stop when it is terminal. An empty page from a collecting query does not mean the search finished.

A search ends `complete` with reason `deadline` when the runtime's collection window closes, or `limit` when it reached `maxResults`, which is an explicitly truncated set. A browse ends `complete` with `peer_complete` only after the peer's full accessible listing arrived; an unreachable peer surfaces as `state: "failed"` with `error.code` in the snapshot, and reading that snapshot is still a successful `results` call. `stop` freezes a collecting query as `stopped` with reason `cancelled` and retains its entries; its file handles stay usable for a separately authorized download until you `release` the query.

Treat `username`, `path`, and the optional metadata hints as untrusted text from a peer. Render them as text, never as markup, and do not turn a Soulseek username into a Nostr identity. `locked: false` does not promise download permission.

## Transfers

`download(fileId)` admits a transfer for a live file handle you were issued; the runtime freezes the peer, remote path, size, and account context, and you cannot supply a destination. Queue admission does not promise peer availability, position, or completion. Downloads are serialized per `fileId`: a second `download` for the same handle returns the existing transfer, including a terminal one, until you release it.

| Current state | Call | Outcome |
| --- | --- | --- |
| `queued` or `transferring` | `pause` | `paused` |
| `paused` | `resume` | `queued` |
| `paused` | `pause` | unchanged |
| `queued` or `transferring` | `resume` | unchanged |
| any nonterminal state | `cancel` | `cancelled`, partial bytes discarded |
| `complete`, `cancelled`, or `failed` | `cancel` | unchanged |
| `complete`, `cancelled`, or `failed` | `pause` or `resume` | rejects with `invalid_state` |

`transfers()` lists every non-released transfer you own in admission order, including terminal records; `status` returns one snapshot. `complete` means all advertised bytes were received, not that the content is verified, authentic, or safe. `received` may decrease if the runtime restarts a transfer; a changed advertised size fails with `source_changed`.

## Reading, saving, and releasing

`read(transferId, offset, length)` needs a `complete` transfer and a separate shell grant to disclose bytes to your napplet; transfer permission alone does not authorize reads. Keep `length` within the transfer's captured `maxReadBytes`, and expect exactly the smaller of `length` and the remaining bytes as standard padded base64 in `data`, with `eof: true` once offset plus length reaches the file size. An offset beyond the size rejects with `invalid_request`.

```ts
const chunks: Uint8Array[] = [];
let offset = 0n;
for (;;) {
  const chunk = await soulseek.read(transferId, offset.toString(), transfer.maxReadBytes);
  if (chunk.length > 0) chunks.push(Uint8Array.from(atob(chunk.data), (c) => c.charCodeAt(0)));
  offset += BigInt(chunk.length);
  if (chunk.eof) break;
}
```

`save(transferId)` asks the shell to export a complete transfer through its own destination picker without exposing local paths. It resolves `{ saved: true }` only after the bytes were exported; a dismissed prompt rejects with `cancelled`, and a runtime that reports `canSave: false` rejects with `unsupported`. Saving does not disclose bytes to the napplet, launch anything, or change the user's shares.

`release(kind, handle)` stops work and removes a query or transfer you own; releasing a query invalidates its file handles, and releasing a transfer deletes its temporary bytes. Unknown or unowned handles return `{ released: false }`. Handles are endpoint-scoped and never survive reload, so release what you no longer need and expect `not_found` for anything another endpoint or a previous load created. On revocation or an account change, pending calls reject with `revoked` and later handle calls with `not_found`.

## Declaring the domain

Declare `soulseek` as required (`R`) only when discovery or downloads are the napplet's core task; otherwise declare it optional (`O`) and check `window.napplet?.soulseek` before use. The vite plugin infers the bare domain from `@napplet/sdk/soulseek` and `@napplet/nap/soulseek` imports and from direct `window.napplet.soulseek` reads. Declaring the domain starts no searches and grants no consent.

## Conformance scope

Conformance validates the fourteen request schemas, rejects result envelopes emitted by napplets, and runs the reference shell's deterministic mock: an online account with one canned peer (`reference-peer`) sharing three small text files, queries that settle on the next `results` poll, transfers that complete on the next `status` or `transfers` poll, bounded base64 reads, `canSave: false`, endpoint-scoped handles, and request-id replay. It exercises protocol shape, not live Soulseek interoperability, consent prompts, storage isolation, or export. No implementation of this NAP has been verified against the live network; verify those behaviors in a SOULSEEK-capable host.
