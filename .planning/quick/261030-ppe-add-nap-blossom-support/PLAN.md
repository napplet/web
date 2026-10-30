---
status: in-progress
---

# Add NAP-BLOSSOM package support

Implement the published draft at https://github.com/napplet/naps/pull/71 (reviewed head `5e74daa4808290a3efb8de117502d52ba2e0d2a5`) under current NIP-5D PR 2303. This plan is non-normative; the living specifications govern wire fields and behavior.

1. Add core types and the NAP module, including all thirteen request/result operations and local BUD-10 URI helpers. Reuse boundary transport. Test exact envelopes, binary preservation, correlation, errors, timeouts, teardown and URI vectors.
2. Wire optional runtime injection, SDK exports and deterministic reference-shell responses. Test exposed/absent domains, request routing and package export surfaces. Reference hosts do not gain live Blossom network or signing authority.
3. Update capability inventories, public docs and relevant agent guidance. Add changesets for shipped packages. Verify build, types, recursive unit tests, JSR exports, documentation links and the pinned AI-slop gate. Review changes and open a PR from this isolated worktree.

Ownership: core/nap module agent; shim/sdk/conformance integration agent; leader owns toolchain inventories, docs, release metadata, final verification and PR. Preserve the unrelated source checkout.
