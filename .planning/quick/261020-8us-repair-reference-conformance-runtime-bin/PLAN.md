---
type: quick
status: in-progress
description: Repair reference runtime bindings and signed-manifest evidence for unchanged Dryft napplets
---

# Reference conformance repair

Base: origin/main82b29d17. Run inline. The existing Napplet checkout remains on its unrelated CLI branch with its package/lock edits and generated directories intact. Dryft's full UX goal remains active; its current runtime artifacts and user services are preserved.

## Evidence and contract

The released0.3.4 runner creates empty advertised INC/INTENT/THEME domain objects, derives installedGlobal from absence of any boot error, and never supplies a manifest to buildContext. The current main source retains those mechanisms. These are reference-host defects, not reasons to change application protocols.

Canonical sources: [NIP-5D at the live PR head](https://github.com/dskvr/nips/blob/5560820fa4f37f45b8ab742a11aeb3001b17dc67/5D.md), especially Runtime Domain Availability, Required and Optional Capabilities, Identity and Security Considerations; [NAP-INC](https://github.com/napplet/naps/blob/master/naps/NAP-INC.md), [NAP-THEME](https://github.com/napplet/naps/blob/master/naps/NAP-THEME.md), [NAP-INTENT](https://github.com/napplet/naps/blob/master/naps/NAP-INTENT.md). This plan is implementation guidance, not a normative protocol copy.

## Tasks

1. Reproduce actual missing binding methods and conflated injection/subject-error observation. Reuse the maintained @napplet/shim/prelude.global artifact in CLI/web hosts with an explicit domain allowlist; keep the browser-safe/JSR engine free of Node/raw-asset imports. Hosts can provide runtime source through a library option; its legacy fallback must advertise only methods it implements. Preserve existing resource/gamepad behavior and source checks.
2. Observe successful namespace installation independently from later subject errors, keep internal harness telemetry out of wire records, and avoid counting an initial blank-frame load. Add real browser coverage plus focused unit regressions; preserve allow-scripts-only isolation and untouched subject hashes.
3. Add an explicit CLI manifest-event input. Verify structure, signature and the exact raw HTML hash before execution, feed the verified event into checks, and reject invalid/mismatched inputs. Keep missing-event checks honestly skipped. Sync CLI/web docs and build-side dependency declarations. Do not fabricate manifests or relax degraded checks to turn failures green.
4. Exercise unchanged Dryft artifacts with current signed catalog events and report all real results. Any surviving application failure is a distinct follow-up, not a reason to weaken the reference fixture. Run package and required monorepo build/type/unit/doc/slop gates, add appropriate changesets, and ship a review under this repo's explicit workflow authorization. Never publish npm locally or merge automatically.
5. Record source/evidence/cleanup back in Dryft GSD. Preserve user5173/8080/network/old native, stopped VMs, all unrelated source work and prior failing evidence. Full physical/public/project acceptance remains open.
