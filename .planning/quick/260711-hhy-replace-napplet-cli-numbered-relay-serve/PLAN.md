# Replace numbered relay selection with autocomplete

## Target

- Keep deploy relays and Nostr Connect bunker relays separate.
- Prompt for bunker relays before rendering the QR code, defaulting to wss://bucket.coracle.social.
- Replace numbered relay / Blossom selection with prompt autocomplete.
- Expand relay and Blossom discovery pools for autocomplete instead of truncating to a tiny menu.

## Validation

- Deno tests for CLI prompt autocomplete, init wizard URL entry, suggestion discovery limits, and deploy signer bunker relay selection.
- Build/typecheck for packages/cli if available.
