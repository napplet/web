---
"@napplet/core": minor
"@napplet/nap": minor
"@napplet/sdk": minor
"@napplet/shim": minor
"@napplet/conformance": minor
---

Align NAP-RESOURCE bulk reads and Blossom hints with the current draft: `resource.bytesMany` carries `urls`, and server hints ride inside BUD-10 `blossom:` URIs.

**Breaking:**

- `ResourceBytesManyMessage` carries `urls: string[]` instead of `requests`, and `bytesMany(urls, opts?)` takes URL strings in `window.napplet.resource`, `@napplet/sdk`, and `@napplet/nap/resource`. Passing request objects now rejects with `invalid-request` before anything is posted.
- The out-of-band Blossom server list is retired. `ResourceBytesMessage.servers`, the `servers` option on `bytes(url, opts?)`, `ResourceBytesRequest`, and `ResourceInfo.maxServers` are removed. Put BUD-10 `xs` / `as` / `sz` hints in the `blossom:<sha256>.<ext>` URI instead.
- The conformance validator requires a non-empty `urls` list of strings on `resource.bytesMany`, so a `requests` envelope fails with `missing-field`. The reference shell answers from `urls` and no longer reports `maxServers`.

Migration: `bytesMany([{ url: a }, { url: b, servers: ['https://cdn.example'] }])` becomes `bytesMany([a, 'blossom:<sha256>.<ext>?xs=cdn.example'])`.
