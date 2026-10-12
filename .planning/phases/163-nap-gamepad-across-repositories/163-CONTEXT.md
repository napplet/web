# Phase 163 context

Non-normative implementation planning. The living sources govern; this document creates no protocol requirements.

User objective: implement NAP-GAMEPAD with coverage across every napplet repository and package, including boilerplate. Canonical proposal: https://github.com/napplet/naps/pull/108 (current head inspected: 0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e). Canonical NIP-5D: https://github.com/nostr-protocol/nips/pull/2303 (current head inspected: 020cb8b33a9e4c6b8ca4b2f9d0ed0a67843b68f7). Recheck heads before shipping.

Implementation acceptance references:

- GP-API: implement the four operations and initial cached state from NAP-GAMEPAD API Surface, with exported types and npm/JSR subpaths.
- GP-WIRE: implement exactly the three fire-and-forget envelopes from Wire Protocol; reject malformed state without adding requests, results or ids.
- GP-ISOLATION: implement Shell Behavior focus, neutral snapshots, visibility, connections, unavailable reasons, unsubscribe and session teardown; test native denial in a real browser.
- GP-TRUST: preserve NIP-5D Transport parent/source checks, domain presence and injection timing.
- GP-REPOS: audit every napplet organization repo and every web monorepo package; implement relevant integration and document evidence for surfaces needing no change. Include Kehto because it supplies runtime/Paja services consumed by these packages.
- GP-DOCS: update package, site, skills and boilerplate guidance with optional availability, focus transitions and keyboard/pointer fallback.
- GP-SHIP: meaningful unit/browser/package export tests; required repository build/type/unit/doc/slop checks; changesets/release metadata; atomic commits and open PRs for changed repos.

Native API replacement is an unresolved spec conflict: NAP-GAMEPAD Web Projection Guidance permits navigator.getGamepads replacement, whereas current NIP-5D Security Rationale item 5 limits runtime injection to window.napplet. Preserve the native operation and deny physical access through Permissions-Policy; the required domain API does not need that optional replacement. Surface this conflict in PRs and coverage evidence.

Existing unrelated work in the original worktrees remains untouched. Work happens on feat/nap-gamepad in separate clones/worktrees based on each repository default branch.
