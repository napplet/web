# Optional application metadata publishing

User scope: add opt-in Zapstore application metadata publishing with screenshot support, correct stale protocol context, and open a PR.

1. Read the current NIP-5D file at the upstream PR head and the proposed software application event schema. Treat PR descriptions and historical planning notes as non-normative.
2. Add an explicit deploy opt-in for kind 32267 application metadata, validated configuration, local screenshot uploads and URL images, signing, dry-run previews, and publication results. Preserve the existing NIP-5D deployment format and identity.
3. Update agent context and CLI documentation. Verify disabled defaults, media handling, event schema, publish failures, and dry-run behavior. Run repository gates, prepare CLI release metadata, commit, push, and open the PR.

Protocol sources: [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303/files), [software application events](https://github.com/nostr-protocol/nips/pull/1336), and [Zapstore publisher](https://github.com/zapstore/zsp#nostr-events). This plan is non-normative.
