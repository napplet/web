# @napplet/build-tools

Shared platform-neutral helpers for build-time NIP-46 signer reuse, verified NIP-65/BUD-03 Blossom discovery, direct exact-byte BUD uploads, and non-normative endpoint hardening.

```ts
import { discoverBlossomServers, uploadExactBlobs } from '@napplet/build-tools';

const discovery = await discoverBlossomServers({ pubkey }, { query });
if (discovery.status === 'found') console.log(discovery.servers[0]);
```

```ts
const result = await uploadExactBlobs({ primary, blobs: [{ bytes, contentType }], signer }, services);
if (result.status === 'complete' && result.deletionAuthorized) console.log(result.evidence);
```

The helpers are implementation plumbing, not a new napplet wire capability. Refer to [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md), [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md), [NIP-B7](https://github.com/nostr-protocol/nips/blob/master/B7.md), and the [Blossom BUDs](https://github.com/hzrd149/blossom) for canonical protocol behavior.
