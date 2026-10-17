# Phase 164 research

## Evidence

The graph has no packages/cli nodes; source inspection was the fallback. Existing init prompts fill a new config, and deploy bootstraps only when the entire default config is absent. Existing partial configurations bypass that wizard. `collectFlags` treats `-i` as positional; init checks only stdin TTY. Key passwords, relay entry, signer mismatch confirmation, and keys commands have independent prompt paths. Deploy uses JSON when stdout is redirected; that compatibility contract should remain.

Nsyte main was read from a shallow reference checkout. Its deploy command declares `-i, --non-interactive`; interactive configuration, preview, status rows, per-server progress, error and partial-success summaries, and a colorful ASCII header provide the relevant patterns. Napplet already emits structured upload and publish progress events and distinguishes complete mirrors from redundant failures. Reuse those events rather than inventing percentages.

Reference revision: [nsyte 855669c](https://github.com/sandwichfarm/nsyte/tree/855669c833655c70c82508d25deffe42cc6e14cd), especially `src/commands/deploy.ts`, `src/ui/header.ts`, `src/ui/progress.ts`, and `src/ui/output-helpers.ts`. Protocol review used the actual `5D.md` at PR 2303 head `020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7`; the [living NIP-5D proposal](https://github.com/nostr-protocol/nips/pull/2303) remains authoritative. This phase changes command input and display, not the protocol or artifact shape.

## Approach

Centralize prompt permission and terminal styling; make missing-value completion a preflight before signer/network operations. Reuse config normalization, URL validation, existing secret entry, and native key providers. Preserve public exports. Split display helpers by responsibility to avoid expanding the existing output and CLI hotspots. Record and render real PTY sessions for visual proof. Exercise full local deployment against a loopback Blossom/relay fixture, never a production account.

## Validation architecture

Deno tests cover parsing, TTY/CI/JSON gates, missing-value recovery, saved config preservation, cancellation, secret handling, output statuses and progress event totals. PTY subprocess checks prove no blocking prompts under -i even with TTY input, readable color and no-color behavior, and authentic screenshots. Root build, type-check, recursive units, full tests and unchanged slop rules must pass before shipping. Five-platform standalone CI proves portability.
