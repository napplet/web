# GAMEPAD coverage

Non-normative implementation evidence for phase 163. The living [NAP-GAMEPAD](https://github.com/napplet/naps/pull/108) and [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) govern protocol behavior.

## Organization repositories

| Repository | Work and evidence |
| --- | --- |
| napplet/web | Cached NAP binding, core types, SDK subpaths, shim injection, manifest inference, conformance envelopes/reference injection, managed CLI pins, site/package/skill docs, release metadata. |
| napplet/naps | PR 108 is the canonical proposed contract; implementation follows its actual head. No duplicate or private normative specification is added. |
| napplet/boilerplate | Optional controller presence row and guide, updated SDK/toolchain compatibility, current manifest schema, single-file build, type/guidance/browser conformance tests. |
| napplet/cvm | GAMEPAD generation evidence/schema, required/optional declaration checks, publication compatibility regression, toolchain promotion guidance. Existing protected-authority baseline failures remain surfaced. |
| napplet/nappagochi | SDK/Paja/toolchain compatibility updates; controller support stays optional and existing interactions and pet lifecycle remain intact. Existing app unit/build/type/browser conformance checks. |
| napplet/migrate | Regression proves required/optional GAMEPAD domain preservation without adding a domain whitelist; migration guidance, full types/tests/build. |
| napplet/.github | Organization repository inventory and controller guidance; retired app-owned shim/social relay examples corrected. No executable controller surface. |
| kehto/web (runtime dependency) | Host broker, focus/visibility reader, Permissions-Policy denial across Paja/playground frames, cached parent-bound namespace, source sessions independent of SHELL, lifecycle/rate controls, units and Chromium focus/native-denial proof. |

## Package and fixture coverage

| Package | Surface | Coverage |
| --- | --- | --- |
| `@napplet/core` | `packages/core` | Implementation, exports, tests, docs and release metadata. |
| `@napplet/vite-plugin` | `packages/vite-plugin` | Implementation, exports, tests, docs and release metadata. |
| `@napplet/cli` | `packages/cli` | Implementation, exports, tests, docs and release metadata. |
| `@napplet/sdk` | `packages/sdk` | Implementation, exports, tests, docs and release metadata. |
| `@napplet/boilerplate` | `packages/boilerplate` | Existing build/tests or browser consumers audited; no new hard controller requirement. See repository proof below. |
| `@napplet/shim` | `packages/shim` | Implementation, exports, tests, docs and release metadata. |
| `@napplet/nap` | `packages/nap` | Implementation, exports, tests, docs and release metadata. |
| `@napplet/conformance-cli` | `packages/conformance-cli` | Implementation, exports, tests, docs and release metadata. |
| `@napplet/conformance` | `packages/conformance` | Implementation, exports, tests, docs and release metadata. |
| `@napplet/web` | `apps/web` | Existing build/tests or browser consumers audited; no new hard controller requirement. See repository proof below. |
| `@napplet/docs` | `apps/docs` | Existing build/tests or browser consumers audited; no new hard controller requirement. See repository proof below. |
| `@napplet/conformance-web` | `apps/conformance` | Existing build/tests or browser consumers audited; no new hard controller requirement. See repository proof below. |
| `@napplet/conformance-e2e` | `tests/e2e/harness` | Existing build/tests or browser consumers audited; no new hard controller requirement. See repository proof below. |
| `@napplet-fixture/broken` | `tests/fixtures/napplets/broken` | Existing build/tests or browser consumers audited; no new hard controller requirement. See repository proof below. |
| `@napplet-fixture/conformant` | `tests/fixtures/napplets/conformant` | Existing build/tests or browser consumers audited; no new hard controller requirement. See repository proof below. |
| `@napplet-fixture/resource-data` | `tests/fixtures/napplets/resource-data` | Existing build/tests or browser consumers audited; no new hard controller requirement. See repository proof below. |

## Release ordering and limits

Kehto CLI 0.5.5 must be published before napplet CLI 0.9.1 selects it as the private Paja runner. The napplet package set includes conformance CLI 0.3.4 and SDK 0.30.0. Consumer ranges accept the currently published base release and the coordinated GAMEPAD release; installing the base release does not supply new SDK exports. CVM's sealed image remains subject to its existing candidate-promotion gates; this change does not promote a production image.

Native Gamepad API replacement remains deferred: the GAMEPAD proposal permits an optional replacement while NIP-5D currently limits runtime injection to window.napplet. Required domain support and physical-access denial do not depend on that replacement. Reference mocks intentionally report unavailable controllers; live host isolation is demonstrated separately in Kehto Chromium tests with test-supplied host samples.

Verification results and PR links will be filled after final gates. Original dirty worktrees and unrelated changes remain untouched.
