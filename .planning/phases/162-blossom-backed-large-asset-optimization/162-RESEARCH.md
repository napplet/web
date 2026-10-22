# Phase 162: Blossom-backed large-asset optimization - Research

**Researched:** 2026-08-21
**Domain:** Vite single-file artifact optimization, NIP-46 signing, Blossom upload, and NAP-RESOURCE loading
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Optimization trigger and ordering

- Measure the would-be single-file `/index.html`; optimization activates only when that representation exceeds exactly `2 * 1024 * 1024` bytes.
- Preserve Vite asset boundaries through selection, order candidate blobs by byte size descending with a deterministic tie-breaker, and externalize candidates in that order.
- Stop selecting once the fully rendered HTML including the embedded resource metadata is below 2 MiB.
- If every eligible blob is externalized and the HTML remains above 2 MiB, finish successfully with a visible report; the threshold is an optimization target, not a conformance or build-failure rule.

### Signer session and secret storage

- Optimization obtains a session signer through NIP-46 in the terminal, showing a `nostrconnect://` QR flow and accepting the existing pasted `bunker://` fallback.
- Persist the resulting `nbunksec` through a secret-store abstraction and reuse it on later builds when reconnect succeeds.
- Never put `nbunksec`, the ephemeral client private key, or any signer secret into `/index.html`, the resource manifest, build logs, Vite cache, or committed project configuration.
- Reuse or extract the repo's tested NIP-46/key-store implementation instead of independently reimplementing the NIP-46 wire protocol inside the Vite plugin.

### Relay and Blossom discovery

- Query a bounded default set of directory/index relays including `wss://purplepag.es` plus other established public relays for the signer's replaceable kind `10002` event.
- Verify candidate Nostr events and keep the newest valid replaceable kind `10002` by `created_at` with a deterministic tie-breaker.
- Query the user's advertised read/both relays for kind `10063`, the NIP-B7/BUD-03 Blossom server-list event; keep the newest valid event found and preserve its valid `server` tag order after URL normalization/deduplication.
- Kind `10002` is relay discovery only. Do not treat its `r` tags as Blossom servers.
- Provide a deliberate fallback/error path when no valid user Blossom server list is available; do not silently upload to an unrelated server as if it were the user's preference.

### Blob upload and metadata

- Hash the exact emitted blob bytes with lowercase SHA-256 and upload those same bytes to the selected Blossom servers using the existing tested BUD authorization/upload compatibility behavior.
- A selected resource reference is exactly `blossom:sha256:<64 lowercase hex characters>` as defined by the published NAP-RESOURCE proposal.
- Embed a deterministic, tool-owned JSON mapping of original emitted asset identity to canonical URI, SHA-256, byte length, and MIME classification in `/index.html`.
- The embedded mapping is explicitly non-normative implementation metadata. It must not be presented as a NIP-5A tag, NIP-5D requirement, NAP wire message, shell handshake, or condition of general napplet conformance.
- Only remove emitted asset files after every required upload succeeds on at least one selected server and the final HTML references and hashes have been verified.

### NAP-RESOURCE runtime path

- Browser-native loading of `blossom:` is not assumed. Generated napplet-side loading code must call the existing `window.napplet.resource.bytes`/`bytesMany` contract and must not grant raw fetch/socket access.
- The build must arrange for each automatically replaced resource path to be resolved through NAP-RESOURCE without adding a new protocol message. The exact internal loader/module design is the agent's discretion, but it must cover the game-oriented browser consumers proven by tests and document unsupported URL-consumer shapes honestly.
- Runtime hash verification remains mandatory at the NAP-RESOURCE boundary; build-time upload success is not a substitute.

### Demonstration and release

- Keep a deterministic integration fixture at least 50 MiB before optimization without committing large binary blobs; generate them during the test.
- The demonstration must prove the measured pre-optimization size, descending selection order, final artifact size, embedded mapping, authenticated uploads, reference replacement, and NAP-RESOURCE recovery of byte-identical blobs.
- Update package docs and add a changeset for every package whose shipped output changes.
- Completion requires full repository gates, atomic commits, a pushed branch, and an open PR.

### the agent's Discretion

- Public option naming and detailed TypeScript types, provided the default/automatic trigger remains clear and testable.
- Whether shared Node-compatible signer/discovery/upload code lives in a new internal package or an existing package export, provided no package cycle or Deno-only import leaks into the Vite plugin.
- Exact deterministic JSON element/constant shape and loader bootstrap arrangement, provided they remain private tooling metadata and do not impersonate protocol surface.
- Concurrency, retry, timeout, and mirror strategy within the existing BUD compatibility behavior, provided failures are fail-closed before asset deletion.

### Deferred Ideas (OUT OF SCOPE)

None — the phase covers the complete requested optimization path. Unsupported browser URL-consumer shapes must be documented as limitations rather than silently deferred.
</user_constraints>

> **Resolution recorded after the verbatim constraint:** CONTEXT.md was corrected in commit `b9bcd32a`. The implementation plans query the user's write/unmarked relays for signer-authored kind `10063`, because NIP-65 directs clients retrieving events from a user to that user's write relays, including unmarked `r` tags. The stale line above remains only as the research workflow's verbatim historical capture and is not executable or canonical guidance. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md]

## Project Constraints (from AGENTS.md)

- The living NIP-5D, NAP track, and NIP-5A documents are authoritative; no protocol message, manifest tag, handshake, loading rule, or conformance/build hard error may be invented. [VERIFIED: AGENTS.md]
- The NIP-5D artifact remains a single `/index.html` executed via `srcdoc` in `sandbox="allow-scripts"`; the optimizer must not add `allow-same-origin`, a network grant, or a shell-specific requirement. [CITED: https://github.com/nostr-protocol/nips/pull/2303]
- Any genuine protocol gap must be reported rather than filled with private wire surface. Tool-owned HTML data is permissible only when it does not impose a shell contract or impersonate a NIP/NAP field. [VERIFIED: AGENTS.md]
- Use strict ESM TypeScript, named exports and public JSDoc; update tests and all relevant docs, run the repository quality gates and AI-slop gate, add changesets for changed shipped packages, then push and open a PR. [VERIFIED: AGENTS.md]
- Preserve unrelated dirty changes and stage only explicit paths. [VERIFIED: AGENTS.md]

## Summary

Implement the optimizer as an extension of the existing `single-file` pipeline, not as an alternative napplet protocol. Preserve Vite's emitted binary assets (`assetsInlineLimit: 0`) long enough to hash and select them; render a fully self-contained candidate in memory; upload selected exact byte sequences; then atomically write the final sole `index.html` and generate the existing manifest sidecar. The current plugin already owns the configuration, close-bundle manifest ordering, HTML JS/CSS inlining, and Vitest fixture pattern. [VERIFIED: codebase: packages/vite-plugin/src/index.ts, html.ts, manifest.ts, index.test.ts]

Use the currently implemented/proposed NAP-RESOURCE API for runtime bytes, never a browser fetch of `blossom:`. The canonical resource URI is `blossom:sha256:<hex>`; `bytesMany` returns ordered independent results, and the runtime verifies the hash before delivering a Blob. The proposal does not define a build manifest or browser-native custom-scheme loader, so the embedded mapping and loader are private, signed artifact bytes rather than protocol surface. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]

Extract the CLI's NIP-46, secret-store, event-validation, and Blossom-upload logic behind Node and Deno platform adapters before Vite consumes it. The existing CLI implementation is Deno-specific (`Deno.Command`, `Deno.stdin`, JSR imports), while the Vite package is a Node/tsup package; direct importing would leak Deno-only code into the Vite runtime. [VERIFIED: codebase: packages/cli/src/nostr-connect.ts, key-store.ts, process.ts, blossom-upload.ts, packages/vite-plugin/package.json]

**Primary recommendation:** add a Node-compatible internal build-services seam, use Vite's documented `experimental.renderBuiltUrl` only to emit optimizer-owned JS lookup sentinels, use a CSS value parser for CSS `url()` rewriting, and inject a private resource loader that resolves only the supported consumer forms through `window.napplet.resource.bytesMany`. [CITED: https://vite.dev/guide/build.html] [CITED: https://github.com/postcss/postcss-value-parser]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Asset measurement, selection, rewrite, and final artifact commit | Build / Node | Static artifact storage | Vite emits and the plugin owns `dist/`; no browser or shell behavior is needed to decide byte size. [VERIFIED: codebase: packages/vite-plugin/src/html.ts, manifest.ts] |
| NIP-46 pairing, `nbunksec` storage, relay discovery, and BUD uploads | Build / Node | OS credential service and Nostr/Blossom network | These occur in the developer terminal before artifact finalization and must never enter artifact bytes. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/46.md] |
| Blossom URI retrieval and integrity validation | Shell/runtime NAP-RESOURCE | Browser client loader | NAP-RESOURCE assigns scheme dispatch and Blossom hash verification to the runtime; the napplet loader only turns verified Blobs into browser-consumable values. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md] |
| Image/audio/fetch adaptation | Browser client | NAP-RESOURCE | Browser APIs do not natively dereference `blossom:`; the generated loader adapts selected consumers to Blob/object-URL or Response values. [VERIFIED: spike: .planning/spikes/001-blossom-build-optimization/README.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@napplet/vite-plugin` internals | workspace 0.14.1 | Existing lifecycle, manifest generation, `single-file` inliner, and Vitest tests | Extend the owner of this artifact contract rather than add a second build pipeline. [VERIFIED: codebase: packages/vite-plugin/package.json, src/index.ts] |
| `nostr-tools` | `^2.23.3` already direct | Nostr event verification, relay pool, hashes/keys used by build services | Already the Vite plugin's direct dependency and CLI's Nostr foundation. [VERIFIED: codebase: packages/vite-plugin/package.json, packages/cli/package.json] |
| Node built-ins | Node 26.7.0 available | `crypto`, `fs`, `path`, `child_process`, `readline`, and `dns` adapters | Keeps filesystem, process, and SHA-256 work in the Node package boundary. [VERIFIED: environment: node --version] |
| `qrcode` | `1.5.4` | Terminal QR rendering for the client-initiated NIP-46 URI | The project-owned `node-qrcode` documentation exposes terminal string rendering; registry legitimacy is `OK` with no postinstall. [VERIFIED: npm registry] [CITED: https://github.com/soldair/node-qrcode] |
| `postcss-value-parser` | `4.2.0` | Parse and rewrite CSS `url()` values without a regex grammar | Its official API parses quoted and unquoted `url()` nodes and serializes edited values; registry legitimacy is `OK` with no postinstall. [VERIFIED: npm registry] [CITED: https://github.com/postcss/postcss-value-parser] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/qrcode` | `1.5.6` | Type declarations for the `qrcode` terminal API | Add as a Vite-plugin dev dependency if the package's declarations remain absent; its use is recommended by the `qrcode` project and legitimacy is `OK`. [VERIFIED: npm registry] [CITED: https://github.com/soldair/node-qrcode] |
| Existing CLI `KeyStoreProvider` contract | workspace | OS-keychain behavior and test vectors | Extract its interface and provider behavior behind process adapters; do not import its Deno implementation from Vite. [VERIFIED: codebase: packages/cli/src/key-store.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite runtime URL sentinel | Post-bundle search/replace of arbitrary JS literals | Reject this: Vite emits both chunk-relative `new URL(...)` and other URL forms, so arbitrary string replacement is not a safe asset-reference contract. [VERIFIED: spike: .planning/spikes/001-blossom-build-optimization/README.md] |
| CSS value parser | Regex over CSS | Reject this: quoted/unquoted `url()` and nested value syntax require a parser. [CITED: https://github.com/postcss/postcss-value-parser] |
| Extracted cross-runtime NIP-46 services | Import `@napplet/cli` from Vite | Reject this: CLI source imports Deno APIs and JSR modules, whereas Vite builds in Node. [VERIFIED: codebase: packages/cli/src/nostr-connect.ts, process.ts, packages/vite-plugin/package.json] |
| NAP-RESOURCE loader | Browser-native `blossom:` navigation | Reject this: NAP-RESOURCE defines `blossom:` as a runtime-dispatched scheme and returns Blobs; it does not grant native browser scheme handling. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md] |

**Installation:**

```bash
pnpm --filter @napplet/vite-plugin add qrcode postcss-value-parser
pnpm --filter @napplet/vite-plugin add -D @types/qrcode
```

## Package Legitimacy Audit

| Package | Registry | Age / signal | Source Repo | Verdict | Disposition |
|---------|----------|--------------|-------------|---------|-------------|
| `qrcode` | npm | 18.4M weekly downloads; latest `1.5.4` published 2024-08-05 | `soldair/node-qrcode` | OK | Approved. [VERIFIED: npm registry] |
| `@types/qrcode` | npm | 9.7M weekly downloads; latest `1.5.6` published 2025-10-24 | `DefinitelyTyped/DefinitelyTyped` | OK | Approved as a development type dependency. [VERIFIED: npm registry] |
| `postcss-value-parser` | npm | 81.7M weekly downloads; latest `4.2.0` published 2021-11-29 | `postcss/postcss-value-parser` | OK | Approved. [VERIFIED: npm registry] |

**Packages removed due to [SLOP] verdict:** none.

**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```text
Vite output with asset boundaries
        |
        v
would-be single-file renderer ---- <= 2 MiB ----> existing single-file write + manifest
        | > 2 MiB
        v
stable candidate table (bytes, hash, MIME, emitted identity)
        |
        +--> reused/stored NIP-46 signer -- reconnect fails --> terminal QR or bunker://
        |                                           |
        |                                           v
        |                              OS secret store (nbunksec only)
        |
        +--> verified kind 10002 on bounded indexes --> user's write/unmarked relays
                                                        |
                                                        v
                                      verified newest kind 10063 server order
                                                        |
                                                        v
                         BUD-11 authorized exact-byte uploads + descriptor validation
                                                        |
                               upload failure ----------+----------> preserve original dist; fail visibly
                                                        |
                                                        v
          rendered HTML + private resource table + resource loader + final reference checks
                                                        |
                              atomic index write; then delete consumed emitted assets; manifest sidecar
                                                        v
srcdoc napplet -> private loader -> resource.bytesMany -> shell NAP-RESOURCE -> verified Blob/object URL
```

### Recommended Project Structure

```text
packages/
├── vite-plugin/src/
│   ├── optimizer/                 # Node-only asset planning, final rendering, loader injection
│   ├── html.ts                    # Retain entry JS/CSS inlining and call optimizer renderer
│   ├── manifest.ts                # Finalize only after optimizer commit, then hash/write sidecar
│   └── index.test.ts              # Unit and deterministic 50 MiB integration coverage
├── cli/src/
│   └── ...                        # Replace duplicated protocol logic with shared adapters where extracted
└── <internal shared package>/src/  # Cross-runtime NIP-46, event validation, BUD operations, interfaces
```

The exact shared-package name is discretionary, but it must expose platform-neutral interfaces (`Terminal`, `SecretStore`, `RelayClient`, `Fetcher`, and `ProcessRunner`) and have Node and Deno adapters. It must not make the browser artifact depend on it. [VERIFIED: codebase: packages/cli/src/nostr-connect.ts, key-store.ts, process.ts]

### Pattern 1: Preserve then render, never destructively inline first

**What:** Change `singleFileBuildConfig()` so Vite emits asset files during the optimizer pass, retain `inlineDynamicImports` and `cssCodeSplit: false`, and generate the all-inline HTML only in memory before the threshold decision. [VERIFIED: codebase: packages/vite-plugin/src/html.ts]

**When to use:** Every `artifactMode: 'single-file'` build; the optimizer takes the no-op branch when the rendered size is at or below 2 MiB. [VERIFIED: CONTEXT.md]

**Implementation rule:** Do not call the current destructive `inlineSingleFileBuildAssets()` before selection. Refactor it into a pure render/plan operation plus a commit operation so all local files survive until remote uploads and final-reference validation succeed. [VERIFIED: codebase: packages/vite-plugin/src/html.ts]

### Pattern 2: Produce controlled JS references through Vite, not by guessing output text

**What:** In optimizer-enabled builds, compose Vite's documented `experimental.renderBuiltUrl` callback so JS assets emit a plugin-owned call such as `globalThis.__nappletAssetUrl("assets/file.ext")`; after selection, replace only these known sentinels with a data URL or a `blossom:` URI. [CITED: https://vite.dev/guide/build.html]

**When to use:** JS asset imports and Vite-generated `new URL(..., import.meta.url)` output. The callback's runtime expression is a Vite feature, but it is explicitly experimental; compose any user callback where semantics remain preserved. If composition cannot be made safe, retain the ordinary inline artifact and emit a visible optimization-skipped report rather than adding a tool-private build rejection that could reject a spec-faithful napplet. [CITED: https://vite.dev/guide/build.html] [VERIFIED: AGENTS.md]

**Example:**

```ts
// Source: https://vite.dev/guide/build.html
experimental: {
  renderBuiltUrl(filename, { hostType }) {
    if (hostType === 'js') {
      return { runtime: `globalThis.__nappletAssetUrl(${JSON.stringify(filename)})` };
    }
    return { relative: true };
  },
}
```

The final renderer owns that sentinel and can deterministically substitute a selected URI; it must not rewrite arbitrary string literals that happen to resemble a filename. [VERIFIED: spike: .planning/spikes/001-blossom-build-optimization/README.md]

### Pattern 3: Private loader and metadata, with a canonical NAP requirement only

**What:** Add a deterministic `<script type="application/json" data-napplet-resource-manifest>` table and an inline loader before the application entry code. The table contains only emitted identity, canonical URI, SHA-256, byte count, and build MIME classification. The loader batches all offloaded URIs through `window.napplet.resource.bytesMany`, verifies every returned item belongs to the requested URI, turns Blobs into object URLs, and installs scoped adapters before application code executes. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]

**When to use:** Only when at least one resource is offloaded. Add the already-defined `['requires', 'resource']` manifest tag for that build because the generated artifact calls the `resource` NAP; do not add a bespoke metadata tag or new resource message. [CITED: https://raw.githubusercontent.com/dskvr/nips/nip/5d/5D.md] [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]

**Important boundary:** This data attribute is private artifact plumbing and is hashed as part of `/index.html`; it is neither a NIP-5A/NIP-5D manifest field nor something a shell must inspect. Runtime injection remains outside the signed artifact. [CITED: https://raw.githubusercontent.com/dskvr/nips/nip/5d/5D.md]

### Supported browser consumer contract

| Consumer form | Build transformation | Loader behavior | Status |
|---------------|----------------------|-----------------|--------|
| Vite JS asset import and generated `new URL(..., import.meta.url)` | Controlled `renderBuiltUrl` JS sentinel becomes data URL or `blossom:` string | `fetch`, `Image.src`, and `HTMLMediaElement.src` adapters materialize a Blob/object URL when they receive the canonical URI | Support and test. [CITED: https://vite.dev/guide/build.html] [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md] |
| `fetch('blossom:...')` or `fetch(new URL(...))` | URI value supplied by selected JS asset | Return a `Response` over the NAP-delivered Blob; leave non-Blossom fetch unchanged | Support and test. [VERIFIED: codebase: packages/nap/src/resource/sdk.ts] |
| `new Image().src` / `new Audio().src` / `new Video().src` | URI value supplied by selected JS asset | Replace only a `blossom:` assignment with a managed Blob URL and revoke after load/error/cleanup | Support and test; complete Blob delivery means this is not streaming. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md] |
| Static inlined CSS `url(...)` and `@font-face src: url(...)` | Parse with `postcss-value-parser`, replace selected asset URLs after byte planning | Bootstrap batches URIs then substitutes Blob URLs into the known inline `<style>` blocks before the entry module begins | Support and test. [CITED: https://github.com/postcss/postcss-value-parser] |
| Direct static HTML `img`, `audio`, or `video` `src` | No source-safe Vite sentinel guaranteed by the planned contract | Do not claim support in v1; document it unless an explicit parser-backed implementation and test are added | Unsupported initially. [CITED: https://vite.dev/guide/build.html] |
| `srcset`, CSS written after bootstrap, inline style attributes, `Worker`, `import()`, module/script URLs, WebAssembly streaming, or any arbitrary string concatenation | No generic synchronous browser URL resolver exists for `blossom:` | Do not rewrite/offload those references; retain them inline or report an unsupported emitted-reference diagnostic | Unsupported; document. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md] |

This is intentionally a bounded compatibility contract. NAP-RESOURCE returns complete Blobs and does not define streams, ranges, or progress; the optimizer cannot honestly make `blossom:` universally transparent to every browser URL consumer. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]

### Pattern 4: Validated signer, discovery, upload, then atomic commit

**What:** Reconnect a stored `nbunksec` first. If it fails or is absent, present a `nostrconnect://` QR and pasteable `bunker://` fallback, requesting only `get_public_key` and `sign_event:24242`; validate the NIP-46 connect secret and obtain the user key before discovery. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/46.md]

Then query bounded index relays for valid signer-authored kind `10002` events, deterministically choose the newest, derive the user's write/unmarked relay set, and query that set for valid signer-authored kind `10063` events. Choose the newest valid server list, normalize/dedupe server URLs while preserving first-occurrence order, and attempt the first listed server before optional mirrors. CONTEXT.md was corrected in commit `b9bcd32a`, and the plans follow NIP-65's write-relay direction for retrieving the user's authored event. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md] [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/B7.md] [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/03.md]

For each candidate, compute SHA-256 from the exact `Buffer`, upload those bytes with BUD-11 kind `24242` authorization (`t=upload`, expiring `expiration`, lowercase `x` hash, server-domain scope), provide `X-SHA-256`, and accept success only after the BUD-02 descriptor repeats the expected lowercase hash. [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/02.md] [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/11.md]

No asset is deleted until every selected hash succeeds on at least one server and the fully rendered HTML passes mapping/reference/hash checks. On any failure preserve the original `dist/` output and fail with a redacted diagnostic; remote successful uploads may remain as harmless content-addressed orphan blobs and must be reported as such. [VERIFIED: CONTEXT.md]

## Code Touchpoints and Task Sequence

| Touchpoint | Required change |
|------------|-----------------|
| `packages/vite-plugin/src/types.ts` | Add the public optimizer option/type and internal optimizer state; keep automatic `> 2 MiB` semantics clear and add JSDoc. [VERIFIED: codebase] |
| `packages/vite-plugin/src/index.ts` | Compose optimizer Vite config, initialize state, and preserve config hook ordering. [VERIFIED: codebase] |
| `packages/vite-plugin/src/html.ts` | Split current destructive inlining into render/validate/commit operations and keep entry JS/CSS inline. [VERIFIED: codebase] |
| `packages/vite-plugin/src/manifest.ts` | Run optimization before hashing/writing `.nip5a-manifest.json`; add canonical `resource` requirement only when loader bytes are present. [VERIFIED: codebase] |
| New `packages/vite-plugin/src/optimizer/*` | Candidate extraction, controlled-sentinel rendering, CSS rewrite, private metadata/loader generation, selection report, and atomic filesystem commit. [ASSUMED] |
| New/extracted internal shared services | Move NIP-46 connection, `nbunksec` encoding/reconnect, event validation, BUD auth/upload, and key-store interfaces out of Deno-only CLI code; provide Node and Deno adapters. [VERIFIED: codebase: packages/cli/src/nostr-connect.ts, remote-signer.ts, key-store.ts, blossom-upload.ts] |
| `packages/cli/src/*` and Deno tests | Redirect existing CLI code to the extracted service without behavior regression; retain existing QR, signer, key-store, and upload vectors. [VERIFIED: codebase: packages/cli/tests/nostr_connect_test.ts, deploy_signer_test.ts, deploy_network_test.ts] |
| `packages/vite-plugin/src/index.test.ts` plus new optimizer tests | Add deterministic byte, order, failure/rollback, source-reference, loader, and 50 MiB generated fixture coverage. [VERIFIED: codebase: packages/vite-plugin/src/index.test.ts] |
| `packages/vite-plugin/README.md`, `apps/docs/packages/vite-plugin.md`, package index/root references | Document options, NAP-RESOURCE prerequisite, security/session UX, supported consumers, limits, and non-normative metadata. [VERIFIED: codebase] |
| `.changeset/*` | Add a changeset for `@napplet/vite-plugin` and every new/extracted shipped package. [VERIFIED: AGENTS.md] |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS URL grammar | Regex replacement | `postcss-value-parser` | It handles quoted/unquoted nested CSS value nodes and serializes changes. [CITED: https://github.com/postcss/postcss-value-parser] |
| QR matrix / terminal rendering | A new QR encoder | `qrcode` terminal output | A maintained Node QR renderer already supports terminal strings. [CITED: https://github.com/soldair/node-qrcode] |
| NIP-46 session wire | Separate Vite-only handshake | Extract the existing tested CLI connection/remote-signer implementation | Reuse the already-tested QR, bunker, session encoding, cleanup, and signer behavior. [VERIFIED: codebase: packages/cli/src/nostr-connect.ts, remote-signer.ts] |
| OS secret persistence | Plain config, env file, or Vite cache | Extract CLI key-store providers with Node process adapters | The `nbunksec` contains the local NIP-46 client key/session secret and needs credential-store storage. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/46.md] |
| Blossom auth/upload | Ad-hoc `fetch` without descriptor validation | Extract `createUploadAuthorization` and upload compatibility behavior | BUD-02/BUD-11 require exact bytes, hash scoping, expiration, and descriptor validation. [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/02.md] [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/11.md] |

## Common Pitfalls

### Pitfall 1: Destroying candidate boundaries before measuring

**What goes wrong:** `assetsInlineLimit: Number.MAX_SAFE_INTEGER` turns assets into data URLs before the plugin can rank them. [VERIFIED: codebase: packages/vite-plugin/src/html.ts]

**How to avoid:** Emit assets for the optimizer pass, calculate the would-be inline HTML from retained files, and commit deletion only after selected uploads succeed. [VERIFIED: spike: .planning/spikes/001-blossom-build-optimization/prototype.mjs]

### Pitfall 2: Treating kind 10002 as a Blossom list

**What goes wrong:** The build uploads to relay URLs or a generic public service rather than user-selected Blossom servers. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md]

**How to avoid:** Kind 10002 provides relay metadata; kind 10063 `server` tags provide the ordered Blossom list. Verify signatures, pubkey, kind, timestamp, event id, tag shape, and URL policy before selection. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/B7.md] [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/03.md]

### Pitfall 3: Reintroducing the superseded relay-direction decision

**What goes wrong:** A consumer mistakes the verbatim historical constraint for current guidance and queries read/both relays for kind `10063`, whereas NIP-65 says clients downloading events *from* a user should use the user's write/unmarked relays. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md]

**How to avoid:** Follow corrected CONTEXT.md commit `b9bcd32a` and the Phase 162 plans: query the user's write/unmarked relays and retain a visible no-server result if no valid kind `10063` is found. Canonical protocol text overrides the preserved historical line. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md] [VERIFIED: AGENTS.md]

### Pitfall 4: Calling browser `fetch` on `blossom:`

**What goes wrong:** A custom scheme remains a string; browsers do not acquire a Blob merely because a URL was rewritten. [VERIFIED: spike: .planning/spikes/001-blossom-build-optimization/README.md]

**How to avoid:** Inject a bounded loader over the existing `resource.bytes`/`bytesMany` API and test every supported consumer. Do not add raw sockets, a service worker, or a new NAP message. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]

### Pitfall 5: Promising 50 MiB single Blob portability

**What goes wrong:** NAP-RESOURCE delivers complete Blobs only and recommends a 10 MiB per-URL cap and 50 MiB outstanding quota; a runtime can reject an oversized game blob with `too-large`. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]

**How to avoid:** The demo may be 50 MiB in total, but produce multiple individually modest generated blobs for the portable path. The runtime loader may read advisory `resource.info`, but it must not require it before `bytes`/`bytesMany`; document oversized media/streaming as unsupported. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]

### Pitfall 6: Secret or SSRF leakage during build

**What goes wrong:** Logs, config, cache, or a user-published server URL expose session credentials or make the build process contact loopback/private hosts. [VERIFIED: CONTEXT.md]

**How to avoid:** Redact secrets from errors/progress, persist only in an OS key store, never use a plaintext fallback, require HTTPS and a normalized no-credential server base for automated uploads, block literal/private and DNS-resolved private destinations, use manual redirects with revalidation, and inject a fake fetch/key-store in tests. The HTTPS/private-network policy is build-tool security hardening, not a claimed NIP/BUD requirement. [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | An internal shared package is the least disruptive extraction location for cross-runtime services. | Code Touchpoints | The planner may instead need a smaller shared module layout. |
| A2 | Automated uploads should require HTTPS and deny private targets even though BUD-03 accepts full `http://` or `https://` server URLs. | Common Pitfalls | Could exclude a developer's self-hosted HTTP Blossom server; a documented explicit test adapter is needed. |

## Open Questions (RESOLVED)

1. **RESOLVED — Relay direction for kind `10063`**
   - CONTEXT.md was corrected in commit `b9bcd32a`; implementation and plans use NIP-65 write/unmarked relays to retrieve the signer's authored kind `10063`. The verbatim historical constraint above is not current guidance. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md]

2. **RESOLVED — Runtime limit for individual game assets**
   - The final demonstration uses multiple individually bounded generated assets totaling more than 50 MiB. It does not claim portable recovery of one 50 MiB Blob or invent stream/range support; NAP-RESOURCE remains whole-Blob and its per-URL bound is advisory. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]

3. **RESOLVED — User `renderBuiltUrl` callback collision**
   - Tests cover the existing callback. The optimizer composes only when semantics are demonstrably safe; otherwise it visibly skips optimization and preserves the ordinary inline artifact without a private hard rejection. [CITED: https://vite.dev/guide/build.html]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node | Vite plugin and Node build services | ✓ | `v26.7.0` | none. [VERIFIED: environment] |
| pnpm | workspace install/test | ✓ | `10.8.0` | none. [VERIFIED: environment] |
| Deno | existing CLI regression suite | ✓ | `2.9.5` | none. [VERIFIED: environment] |
| macOS `security` | local OS-secret integration | ✓ | system tool | fake process/key-store adapter in tests. [VERIFIED: environment] |
| Nostr relays / Blossom servers | live developer build | network-dependent | — | deterministic fake relay/fetch server for tests; live interaction is manual only. [VERIFIED: spike: .planning/spikes/001-blossom-build-optimization/prototype.mjs] |

**Missing dependencies with no fallback:** none for deterministic implementation/testing.

**Missing dependencies with fallback:** live signer, relay, and Blossom access use dependency-injected local fixtures for automated tests.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 for `@napplet/vite-plugin`; Deno test for existing CLI regressions. [VERIFIED: codebase: packages/vite-plugin/package.json, packages/cli/package.json] |
| Config file | `packages/vite-plugin/vitest.config.ts`; CLI `packages/cli/deno.json`. [VERIFIED: codebase] |
| Quick run command | `pnpm --filter @napplet/vite-plugin test:unit` |
| Shared-service regression | `deno test --allow-read --allow-write --allow-run --allow-env packages/cli/tests/nostr_connect_test.ts packages/cli/tests/deploy_signer_test.ts packages/cli/tests/deploy_network_test.ts` |
| Full suite command | `pnpm -r test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TBD-01 | Exact 2 MiB trigger; no signer/network call at or below threshold | Vitest unit | `pnpm --filter @napplet/vite-plugin test:unit` | ❌ Wave 0 optimizer tests |
| TBD-02 | Stable largest-first selection and nonfatal all-external-above-target report | Vitest unit | same | ❌ Wave 0 optimizer tests |
| TBD-03 | QR/paste NIP-46, `nbunksec` reuse, no secret logging | shared-service unit + existing Deno regression | Vitest targeted plus CLI command above | ⚠ existing CLI coverage; Node adapter tests needed |
| TBD-04 | Verified newest 10002 then newest 10063 selection, write/unmarked filtering, URL dedupe/order | Vitest unit | `pnpm --filter @napplet/vite-plugin test:unit` | ❌ Wave 0 discovery tests |
| TBD-05 | BUD-11 auth, exact hash/descriptor, first-server attempt, mirror failure and rollback | Vitest local HTTP integration + CLI regression | same plus CLI command | ⚠ existing Deno coverage; Node adapter tests needed |
| TBD-06 | JS, `fetch`, Image/audio/media, and CSS `url()` paths resolve via NAP-RESOURCE fake; unsupported forms remain documented | Vitest DOM-like/unit loader tests | `pnpm --filter @napplet/vite-plugin test:unit` | ❌ Wave 0 loader tests |
| TBD-07 | Generated 50 MiB fixture proves before size, order, final size, mapping, upload, and byte-identical recovery | Vitest local HTTP integration | `pnpm --filter @napplet/vite-plugin test:unit` | ❌ Wave 0 integration fixture |

### Required test vectors

- Generate deterministic assets at test time totaling at least 50 MiB without committing binaries; use several <=10 MiB blobs for the portable runtime path, plus a separate oversized-resource limit/error vector. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]
- Assert the measured would-be inline size, exact 2 MiB boundary behavior, descending `(byteLength desc, emittedIdentity asc)` ordering, final rendered size, canonical lowercase `blossom:sha256:` references, deterministic private table, and NIP-5A hash based on final `/index.html` only. [VERIFIED: CONTEXT.md] [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/5A.md]
- Run a local Blossom HTTP fixture that validates a signed kind 24242 auth event, `t=upload`, `expiration`, `x`, `server`, `X-SHA-256`, received exact bytes, and response descriptor hash; prove no dist deletion on any selected-upload failure. [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/02.md] [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/11.md]
- Use a fake NAP-RESOURCE domain that hash-verifies every returned Blob and captures `bytesMany` ordering; prove the generated loader never calls raw network for a `blossom:` URI. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md]
- Scan the final HTML, manifest, test output, and temporary build files for `nbunksec1`, client private-key hex, and `bunker://` secrets; only the terminal-displayed NIP-46 URI is allowed during interactive pairing. [VERIFIED: CONTEXT.md]

### Sampling Rate

- **Per task commit:** targeted Vite Vitest suite plus the touched shared-service tests.
- **Per wave merge:** Vite Vitest and targeted Deno signer/upload suite.
- **Phase gate:** `pnpm build`, `pnpm type-check`, `pnpm -r test:unit`, docs checks, AI-slop gate, `git diff --check`, and a recorded generated-fixture demonstration before shipping. [VERIFIED: AGENTS.md]

### Wave 0 Gaps

- [ ] `packages/vite-plugin/src/optimizer/*.test.ts` — selection, atomic commit, discovery, and loader coverage.
- [ ] Node adapter tests for extracted NIP-46/key-store/BUD services.
- [ ] Deterministic generated 50 MiB local HTTP Blossom + fake NAP-RESOURCE fixture.
- [ ] User `renderBuiltUrl` conflict/composition test.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Validate NIP-46 connect secret, remote signer identity, and `get_public_key`; request minimum signing permissions. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/46.md] |
| V3 Session Management | Yes | Store `nbunksec` only in the OS credential store; reconnect then re-pair on failure; provide deliberate logout/delete path if exposed. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/46.md] |
| V4 Access Control | Yes | Emit the existing `requires: resource` capability declaration for optimized artifacts and let shells decide availability; never grant browser networking. [CITED: https://raw.githubusercontent.com/dskvr/nips/nip/5d/5D.md] |
| V5 Input Validation | Yes | Verify Nostr signatures/kind/pubkey/timestamps/tags; normalize URLs; bound relay/server counts, response size, timeout, redirects, and upload bytes. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md] |
| V6 Cryptography | Yes | Use `nostr-tools` event verification/signing and Node SHA-256; never implement NIP-44/NIP-46 encryption or SHA-256 manually. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/46.md] |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious relay event selects attacker server | Tampering | Verify event signature, kind, signer pubkey, timestamp, deterministic newest selection, and server-tag URL grammar. [CITED: https://raw.githubusercontent.com/nostr-protocol/nips/master/B7.md] |
| Leaked BUD authorization header is replayed | Spoofing / elevation | Short-lived kind 24242 token with `upload`, `expiration`, per-server domain scope, and exact lowercase `x` hashes. [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/11.md] |
| Upload returns an unrelated descriptor | Tampering | Require descriptor `sha256` to equal the locally hashed exact bytes before success. [CITED: https://raw.githubusercontent.com/hzrd149/blossom/master/buds/02.md] |
| Resource substitution after upload | Tampering | Runtime NAP-RESOURCE rehashes Blossom bytes before Blob delivery; build-time success is insufficient. [CITED: https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md] |
| Build-host SSRF via user profile server URL | Elevation / information disclosure | HTTPS-only policy, URL/DNS/private-address/redirect validation, bounded fetches, and injected test transport. [ASSUMED] |
| Secret exposed through artifact or build diagnostics | Information disclosure | Redact, use OS keychain, and prohibit secrets from metadata/config/cache/artifact. [VERIFIED: CONTEXT.md] |

## Sources

### Primary

- [NIP-5D draft](https://github.com/nostr-protocol/nips/pull/2303) and [current head text](https://raw.githubusercontent.com/dskvr/nips/nip/5d/5D.md) — sandbox, `srcdoc`, one-file manifest, `requires`, and injected-domain boundary.
- [NAP-RESOURCE PR #80](https://github.com/napplet/naps/pull/80) and [proposal text](https://raw.githubusercontent.com/napplet/naps/nub-resource/naps/NAP-RESOURCE.md) — canonical URI, bytes APIs, Blob limit, and runtime integrity semantics.
- [NIP-46](https://raw.githubusercontent.com/nostr-protocol/nips/master/46.md), [NIP-65](https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md), [NIP-B7](https://raw.githubusercontent.com/nostr-protocol/nips/master/B7.md), and [NIP-5A](https://raw.githubusercontent.com/nostr-protocol/nips/master/5A.md) — signer, relay, server-list, and manifest/hash semantics.
- [BUD-02](https://raw.githubusercontent.com/hzrd149/blossom/master/buds/02.md), [BUD-03](https://raw.githubusercontent.com/hzrd149/blossom/master/buds/03.md), and [BUD-11](https://raw.githubusercontent.com/hzrd149/blossom/master/buds/11.md) — upload, ordered servers, and authorization rules.

### Secondary

- [Vite advanced base options](https://vite.dev/guide/build.html) — controlled runtime URL rendering; experimental status.
- [node-qrcode](https://github.com/soldair/node-qrcode) — terminal QR API.
- [postcss-value-parser](https://github.com/postcss/postcss-value-parser) — parser-backed CSS URL rewriting.
- Spike 001 and the current Vite-plugin/CLI/resource implementation — feasibility vectors and reusable boundaries. [VERIFIED: codebase]

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM — package registry checks and official repositories verified; internal extraction placement remains discretionary.
- Architecture: MEDIUM — canonical protocol and runnable spike establish boundaries; exact Vite hook composition needs a fixture against the supported peer range.
- Pitfalls: HIGH — the spike reproduced the reference-shape and custom-scheme failures; canonical NIP/NAP/BUD sources specify the protocol/security boundaries.

**Research date:** 2026-08-21

**Valid until:** 2026-08-28 because NIP-5D and NAP-RESOURCE are living draft proposals.
