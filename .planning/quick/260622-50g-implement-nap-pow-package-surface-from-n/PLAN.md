# Plan

## Scope

Implement NAP-POW from `napplet/naps` PR #39 as a typed shell-mediated POW job
surface. This adds the `pow` domain, package exports, shim/API helpers,
conformance envelope coverage, reference-shell canned responses, docs, tests,
changeset, commit, push, and PR.

## Constraints

- Treat PR #39 as the canonical source for this implementation.
- Do not implement a miner in the napplet packages. The shell owns CPU work,
  scheduling, stamping, signing, publishing, consent, and policy.
- Preserve the spec distinction that `mine` returns an unsigned mined event while
  `mineAndPublish` may return a signed/published event.
- Keep the PR independent from the LINK branch.

## Steps

1. Add core POW types and include `pow` in the domain/capability unions.
2. Add `@napplet/nap/pow` `types`, `shim`, `sdk`, `index`, and focused shim tests.
3. Mount `window.napplet.pow` in `@napplet/shim` and re-export helpers from
   `@napplet/sdk`.
4. Extend conformance validators, representative tests, drift counts, and
   reference-shell responders.
5. Update docs, package export maps, JSR map, tsup entries, and changeset.
6. Run focused package checks, full build/type/test gates, docs link check,
   slop gate, and diff check.
7. Commit with lore trailers, push, open PR, and wait for GitHub checks.
