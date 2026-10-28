---
name: napplet-port-napp
description: Port an eskema/nostrapps NAPP (metadata.json, window.napp, window.nostrdb and launcher NIP-07 bridge) into a working NIP-5D + NAP napplet in one request. Covers bridge semantics, action delivery, UI-kit replacement, store-to-outbox migration, assets, permissions, metadata and behavior parity through build and runtime verification.
---

# Port a NAPP to a napplet

Use for apps built against [eskema/nostrapps NAPP.md](https://github.com/eskema/nostrapps/blob/main/NAPP.md), including loosely related versions identified by their actual code. The outcome is an implemented, verified port of the requested product. Continue through implementation and testing in the same request; an inventory or handoff alone is unfinished work unless the user asked only for analysis.

This skill and its references are **non-normative migration guidance**. Protocol authority belongs to the living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) and [NAPs track](https://github.com/napplet/naps). Read the current `5D.md` at the PR's head, not its description or old comments. Read each relevant NAP's current document or proposal head before relying on its operations. Recheck the source NAPP documentation and declarations too: bridge versions vary. Record source revisions and package versions in the port notes so another agent can reproduce the choices; never turn those notes into a frozen specification.

## 1. Establish the source and preserve the job

Inspect the supplied repository, folder, archive or published NAPP and its `metadata.json`, entry HTML, imported modules, styles, assets and bridge typings. If only a published event is supplied, inspect its file manifest and use the source launcher's documented retrieval mechanism; verify retrieved files by that format's rules. Do not assume a NAPP has the napplet artifact schema. Request a source location only if it cannot be obtained from available inputs.

Read the real entry points and follow aliases, destructured helpers, dynamic calls and vendored bridge/UI scripts. Search for `window.napp`, `window.nostrdb`, `window.nostr`, `napp.ready`, `registerAction`, `popstate`, `window.name`, `serviceWorker`, direct networking and browser storage. A search result is an inventory lead, not proof of absence. Include workers, relative URLs, CSS `url()`/`@import`, `srcset`, WASM loaders and lazily imported code.

Run or inspect the original app to capture its primary flows, received actions, outgoing actions, filtering/sorting, result shapes, loading/error/empty states, storage lifetime and visuals. Record what could not be exercised. Preserve the user's requested features, useful visual identity, accessibility, license and attribution. Retain pure rendering, parsing and domain logic where compatible. Remove redundant site chrome using `napplet-ui`; do not rewrite the product just because its host changes.

Create a concise migration ledger in the destination project's normal docs location:

```text
source revision / entry point / bridge version:
target package versions / target runtime:
feature or action | source file:line | observable behavior | target NAP + operation and spec link | required/optional | parity test
assets | original path/URL | bundled or mediated | replacement/use
state | key/schema | lifetime/account sensitivity | shared/instance/memory | import/export plan
unsupported semantics | essential or optional | protocol/package/runtime gap | disposition
```

Read [references/bridge-map.md](references/bridge-map.md) for each source bridge family used. Read [references/actions-metadata.md](references/actions-metadata.md) when the source has action handlers, action dispatch, history state or deployment metadata. These tables guide semantic decisions; they are not rename recipes.

## 2. Resolve capability and parity decisions before editing

For every privileged feature, establish all three independently: the canonical NAP defines it, the installed SDK provides a compatible callable API, and the target runtime implements it. A proposal being open does not imply either availability or unavailability. Domain presence signals availability after injection; an individual operation can still be denied or unsupported. Handle its documented result/error contract.

Use normal social reads/publishes through OUTBOX; use COMMON, LISTS, COUNT and DM when their semantics fit. Reserve RELAY for a named requirement that actually needs explicit relay-local behavior. Keep this reason in the ledger. Inspect installed SDK exports and types while implementing; `napplet-sdk` helps locate them but does not override a living NAP. Treat an expected missing export as a possible package implementation gap before changing the intended API. Do not write a private bridge or compatibility global to hide a missing contract.

Classify each mismatch:

- **Protocol gap:** no canonical target operation supports the essential behavior. Flag the exact source behavior and missing contract; do not invent a domain, envelope, handshake, permission, lifecycle or manifest field.
- **Package gap:** the NAP defines it but the installed SDK lacks it. Check supported versions/intended exports and report or repair within the authorized scope; do not pretend a private adapter is the standard.
- **Runtime gap:** the API exists but the chosen host cannot perform it. Use a compatible runtime or expose the documented fallback. Report which flow remains unverified.
- **Optional integration:** retain a usable fallback and record the difference. Do not relabel an essential feature optional just to get a green build.

Keep one focused napplet for a focused NAPP. If the source is a monolith, propose a coherent split using `napplet-design`, but account for every requested flow; do not silently discard tabs or turn a requested full port into a smaller demonstration. A preserved compound product can be appropriate when explicitly requested. Keep progressing on independent supported work if a gap blocks one feature; identify the incomplete scope honestly.

## 3. Build the destination and replace the host boundary

Use `napplet-design` to turn the ledger into the build spec, `napplet-ui` for markup/layout, `napplet-build` for tooling, and `napplet-test` for conformance and preview. Use `napplet-interop` when actions cross napplet boundaries. Load these companion skills if installed; otherwise read their maintained sources under [napplet/napplet/skills](https://github.com/napplet/napplet/tree/main/skills) and the package documentation. Missing skill installation alone does not block the port.

Prefer a sibling destination or the user's chosen worktree. Keep the source runnable for comparison. For a fresh destination, use the maintained CLI scaffold:

```bash
napplet create <destination>
cd <destination>
napplet init
pnpm install
```

Check the installed CLI's help for current flags. If it is unavailable, use the repository's documented local tooling or report the exact prerequisite; never claim a command ran. For a requested in-place retrofit, preserve compatible project configuration and add the equivalent current build/metadata/conformance wiring rather than overwriting existing product work.

Implement in this order so the app never depends on a recreated launcher:

1. Port pure UI/domain code; replace injected NAPP UI controls and theme assumptions with bundled components/styles and optional NAP-THEME. Keep a local readable theme when it is absent. `napplet-ui` owns compact layout, removal of the title header and four-frame behavior.
2. Replace identity, event reads and subscriptions, mutations and publishing using the ledger. Unwrap target event results deliberately; preserve incomplete/error results and signed-out behavior. Replace async iterators/callbacks with the actual SDK subscription lifecycle. Prevent stale results from repainting a different author or account.
3. Replace incoming/outgoing actions with declared conventions and NAP-INTENT delivery/dispatch. Validate payloads and distinguish dispatch acceptance from application-level return values. Keep handlers for arrivals after startup and release subscriptions on teardown.
4. Make storage async and choose memory/shared/instance scope by the intended lifetime. Replace resource URLs, remote fonts, downloads, media and uploads with bundled bytes or the matching mediated NAP. Release object URLs, listeners, subscriptions and key bindings.
5. Translate metadata through the current publishing toolchain. Derive required/optional domains from real flows and fallbacks, not the old `requires` array. Remove the NAPP bootstrap, kit CDN fallback, service worker, origin setup and bridge dependencies from the destination runtime.

Call SDK wrappers through `@napplet/sdk` or its documented subpaths. Use `window.napplet?.<domain>` for optional availability checks. The shell injects the namespace before app scripts run: do not retain `napp.ready`, wait on optional `shell.ready()`, import the runtime shim, or install a `window.napp`/`window.nostr` facade. See [NIP-5D Transport and Runtime Domain Availability](https://github.com/nostr-protocol/nips/pull/2303/files).

For the portable shell-mediated target, remove dependencies on direct browser network/storage/signing authority. Opaque origin alone does not block every network request: inspect the [NIP-5D CSP advisory](https://github.com/nostr-protocol/nips/pull/2303/files) and target policy rather than making that assumption. An intentional host-specific permission does not make a direct-network fallback portable. Audit generated output as well as source.

## 4. Prove behavior in the target runtime

Run the generated project gates (or documented retrofit equivalents):

```bash
pnpm verify
pnpm test:conformance
napplet deploy --dry-run --json --format current
napplet paja -- pnpm vite --host 127.0.0.1
```

Inspect current CLI help and prerequisites before invoking commands. A publishing dry run inspects metadata; it is not permission to upload or publish. Use an existing runtime preview if appropriate. Report its actual URL, never the raw asset-server URL as a working napplet preview. A missing preview runtime leaves runtime parity open even when conformance passes.

Exercise each ledger row against source observations, including these relevant regressions:

| Scenario | Evidence to collect |
| --- | --- |
| Boot without the NAPP launcher | No source bridge/kit bootstrap or origin/service-worker dependency; app renders in the real sandbox |
| Identity absent, signed out, then account changed | Reads and private state match the active account; no stale events/drafts leak across accounts |
| Initial reads and live stream | Correct event extraction, filter bounds, ordering, partial results, replacement behavior and close/reopen cleanup; no assumed global-store side effects |
| Publish/list/DM operation | Denial/failure keeps user input and does not show success; successful action happens once and preserves the intended recipient/routing/list fields |
| Actions | Initial and later deliveries, invalid payload, missing target, reused view, rapid replacement; any original return-value behavior accounted for |
| Optional domain removed | Usable stated fallback; required-domain mismatch handled by host, never a private bootstrap probe |
| Storage | Async hydration, malformed values, quota/error, two instances and reopen; old-origin data transfer tested if promised |
| Resources and UI | Local and mediated assets render; errors use placeholders; dark/light at `200×160`, `320×560`, `900×600`, and largest available (or `2400×1200`) |
| Disposal | Late async results ignored, subscriptions closed, URLs revoked; navigation/reopen does not multiply callbacks |

Run source/dependency and built-artifact searches for the original bridge identifiers, networking/storage APIs and external asset paths, then inspect each hit. Explain harmless text/fixtures and tooling false positives rather than deleting legitimate features or weakening conformance. A conformant artifact is a self-contained `/index.html`; inspect its actual emitted bytes and side-file references. Check the final dry-run manifest, embedded descriptive metadata if used, artifact hash and declared domains against the ledger using [NIP-5D Manifest](https://github.com/nostr-protocol/nips/pull/2303/files). Conformance is evidence about protocol checks; it does not prove feature parity, list merge correctness or production runtime support.

## 5. Finish with evidence

Deliver the destination source, build artifact, usage/preview instructions and migration ledger. Report retained flows, explicit differences, required/optional domains, relay escape hatches, commands/results, tested runtime and source/target parity evidence. State all blocked, untested or unsupported behavior precisely. Publishing or opening a PR follows the user's/project's authorization; migrating an app does not itself authorize signing or publishing it.

Completion requires every requested essential flow to work through canonical target contracts, the source launcher dependency to be gone, the emitted artifact and metadata to pass current checks, and parity scenarios to have actual evidence. A passing build with a removed feature, a global bridge mock, or untested action handler does not satisfy a complete port. If a genuine spec/package/runtime gap remains, deliver the supported work and the concrete gap without calling the full port complete.
