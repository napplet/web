---
phase: quick
plan: 261030-poe
status: complete
requirements_completed: [GOAL-MOTION, GOAL-DOCS, GOAL-TESTS]
---

# NAP-MOTION package support

Implemented against [NAP-MOTION proposal #124](https://github.com/napplet/naps/pull/124), inspected at `3069a945271f6ff20ff9aadb2ec00ee5b62fe683`. This is an implementation record, not a normative specification.

## Changes

- Added core motion schemas, the domain registry entry, and optional global typing.
- Added layered NAP exports, SDK root/subpath helpers, and npm/JSR/build entries.
- Added lazy subscriptions, correlated permission outcomes, synchronous copied caches, independent listeners, focus/absolute-grant gating, and teardown/reinstallation.
- Added Vite inference that preserves explicit optional declarations, six conformance envelope types, unavailable reference-shell replies, fallback runtime behavior, and sensor denial on the conformance iframe.
- Updated docs, READMEs, and agent guidance. Changeset covers the six directly changed packages and the conformance CLI's bundled runtime.

## Verification

Initial tests failed for missing runtime installation, wire recognition, and fallback methods. A real Chromium smoke test then exposed a secure-context assumption in request IDs. A regression test failed with `crypto.randomUUID` absent; monotonic binding-local correlation IDs removed that dependency and remain distinct across cleanup/reinstallation.

Validation commands: `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, `pnpm test`, `pnpm test:workflow-contracts`, `pnpm check:jsr`, `pnpm test:skills-contracts`, `pnpm exec changeset status`, and `git diff --check`. The full unit run has 841 passing tests and three pre-existing ignored CLI tests. The tutorial conformance run also passes with its documented non-applicable checks skipped.

Headless Chromium exercises both the fallback and maintained IIFE in `sandbox="allow-scripts"` frames: default state, correlated unavailable permission errors, parent messaging, injected samples, independent cache copies, and clearing on focus loss. Read-only code review found no actionable introduced defects.

AI-slop 0.12.0 score: 98, above the existing CI threshold of 70. Format, lint, code-quality, and AI-slop engines report zero issues. The existing low-severity `deepmerge` advisory has no available fix.

## Limits

No physical sensor acquisition or OS permission prompts were tested. Those belong to a motion-capable host. The reference shell truthfully reports unavailable sensors. Native sensor isolation depends on browser enforcement; no native event replacement is installed. No dependencies were added, and no unrelated cleanup was performed.

## Delivery

Feature branch: `feat/nap-motion`, isolated from the active checkout. The closing PR links this record; publishing and merging remain outside this task.
