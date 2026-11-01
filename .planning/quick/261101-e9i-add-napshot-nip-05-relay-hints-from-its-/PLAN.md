# Add Napshot NIP-05 relay hints

Add the recommended public-key-to-relay-URL mapping from [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) to the existing static document. Use Napshot's signed [NIP-65](https://github.com/nostr-protocol/nips/blob/master/65.md) event `ab47c2c3d95696ef4bfc88e2edd06986757b63580dfedbe331b88fccfce16a42` (created_at `1793459127`), retrieved and signature-verified from `wss://relay.napplet.soy/` and `wss://relay.primal.net/` on 2026-11-01. Both unmarked `r` tags advertise read/write relays.

1. Extend the published-document regression test to require the exact signed relay hints; prove it fails before changing the document.
2. Add the relay mapping and document its NIP-65 source and maintenance in the web README.
3. Run the assembly tests, build, type checking, recursive unit tests, and pinned slop scan; verify the built public copy. Commit, push, and open a PR.

The user is handling Bunny tooling separately; HTTP CORS configuration is outside this change. This static web change has no npm/JSR package output and needs no changeset. This plan is non-normative; the linked specifications govern the document formats.
