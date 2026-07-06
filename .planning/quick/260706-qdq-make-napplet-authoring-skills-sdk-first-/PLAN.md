---
status: in-progress
created: 2026-07-06
---

# Make Napplet Authoring Skills SDK-First

Task: make napplet authoring skills prefer `@napplet/sdk` wrappers for implementation calls when SDK helpers exist, while keeping direct `window.napplet?.domain` checks for capability availability.

## Plan

1. Verify the assertion against the current `@napplet/sdk` export surface.
2. Update authoring skills and package docs so implementation code is SDK-first and direct domain access is reserved for availability checks or genuine SDK gaps.
3. Add regression tests that keep the SDK-first guidance from drifting back to direct-call equivalence.
4. Add a changeset for `@napplet/skills`.
5. Run package and workspace verification, then commit, push, and open a PR.

## Acceptance

- `build-napplet` examples use `@napplet/sdk` for resource/config/theme calls.
- Top-level skills state SDK-first implementation guidance.
- Tests assert SDK-first language and reject the old direct-equivalence phrasing.
- PR is opened from `fix/skills-sdk-first`.
