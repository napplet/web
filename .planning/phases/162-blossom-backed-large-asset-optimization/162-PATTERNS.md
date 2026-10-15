# Phase 162: Blossom-backed large-asset optimization - Pattern Map

**Mapped:** 2026-08-21
**Files analyzed:** 15 planned source/test/doc touchpoints
**Analogs found:** 14 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/vite-plugin/src/types.ts` | model/config | transform | `packages/vite-plugin/src/types.ts` | exact-extension |
| `packages/vite-plugin/src/index.ts` | plugin controller | event-driven | `packages/vite-plugin/src/index.ts` | exact-extension |
| `packages/vite-plugin/src/html.ts` | artifact renderer | file-I/O, transform | `packages/vite-plugin/src/html.ts` | exact-extension |
| `packages/vite-plugin/src/manifest.ts` | manifest service | file-I/O, transform | `packages/vite-plugin/src/manifest.ts` | exact-extension |
| `packages/vite-plugin/src/optimizer/asset-plan.ts` | utility/model | batch, transform | `packages/vite-plugin/src/html.ts` | partial-match |
| `packages/vite-plugin/src/optimizer/render.ts` | service | file-I/O, transform | `packages/vite-plugin/src/html.ts` | role-match |
| `packages/vite-plugin/src/optimizer/loader.ts` | runtime generator | request-response, transform | `packages/nap/src/resource/sdk.ts` | role-match |
| `packages/vite-plugin/src/optimizer/discovery.ts` | service | request-response | `packages/cli/src/suggestions.ts` | role-match |
| `packages/vite-plugin/src/optimizer/upload.ts` | service | request-response, file-I/O | `packages/cli/src/blossom-upload.ts` | exact-flow |
| `packages/vite-plugin/src/optimizer/signer.ts` | service | event-driven, request-response | `packages/cli/src/nostr-connect.ts` | exact-flow |
| extracted shared signer/key-store modules and CLI redirects | service/provider | request-response | `packages/cli/src/nostr-connect.ts`, `packages/cli/src/key-store.ts` | role-match |
| `packages/vite-plugin/src/optimizer/*.test.ts` | test | file-I/O, request-response | `packages/vite-plugin/src/index.test.ts` | exact-style |
| `packages/cli/tests/*` | regression test | event-driven | `packages/cli/tests/nostr_connect_test.ts` | exact-style |
| `packages/vite-plugin/README.md`, `apps/docs/packages/vite-plugin.md` | documentation | n/a | `packages/vite-plugin/src/index.ts` JSDoc | partial-match |
| `.changeset/*.md` | release config | n/a | existing `.changeset/*.md` | exact-convention |

The optimizer directory names are planning-level names rather than a prescribed layout. The planner may consolidate pure modules, but should preserve the listed responsibility boundaries and tests.

## Pattern Assignments

### Vite plugin orchestration: `types.ts`, `index.ts`, `manifest.ts` (model/controller/file-I/O)

**Analog:** `packages/vite-plugin/src/index.ts` lines 45-122 and `packages/vite-plugin/src/manifest.ts` lines 27-85.

**Imports and mutable state pattern:**

```ts
import type { Plugin, IndexHtmlTransformResult } from 'vite';
import type { ManifestPluginState, Nip5aManifestOptions } from './types.js';
import { applyHtmlMetadata, singleFileBuildConfig } from './html.js';

const state: ManifestPluginState = {
  outDir: 'dist',
  projectRoot: process.cwd(),
  base: '/',
  artifactMode: options.artifactMode ?? 'external-assets',
  resolvedSchema: null,
  resolvedSchemaSource: null,
  inferredRequires: new Set(),
  reportedMissingRequires: new Set(),
};
```

**Hook ordering and error boundary:** resolve config before mutating artifacts; perform rewrite/optimizer work in `closeBundle`, before building the manifest. Preserve warnings through `this.warn`, not hard errors for an optimization target.

```ts
config(config) {
  if (state.artifactMode !== 'single-file') return undefined;
  return singleFileBuildConfig(config);
},
async configResolved(config) {
  await resolvePluginConfig(options, state, config);
},
async closeBundle() {
  reportRequirementDiagnostics(options.requires, state, (message) => this.warn(message));
  await writeBundleManifest(options, state);
},
```

`writeBundleManifest()` (lines 63-75) first resolves the dist path, returns on an absent directory, prepares `index.html`, then builds and writes the manifest. Place optimization in that existing prepare-before-hash seam so its final bytes are what `buildPathPairs()` hashes.

### Artifact planning/render/commit: `html.ts`, `optimizer/asset-plan.ts`, `optimizer/render.ts` (utility/service, file-I/O + transform)

**Analog:** `packages/vite-plugin/src/html.ts` lines 227-302.

**Core parsing and validation pattern:** use existing asset-reference helpers, early returns for non-local references, and descriptive `[nip5a-manifest]` failures only for actual malformed/missing build files.

```ts
const href = getAttr(attrs, 'href');
if (!href || !isLocalAssetReference(href)) return tag;

const assetPath = resolveDistAsset(distPath, href, base);
if (!fs.existsSync(assetPath)) {
  throw new Error(
    `[nip5a-manifest] single-file artifact mode could not find stylesheet asset: ${href}`,
  );
}
```

**Critical adaptation:** the current implementation records files and deletes them in the same function:

```ts
for (const filePath of inlinedFiles) {
  fs.rmSync(filePath, { force: true });
  removeEmptyParentDirs(filePath, distPath);
}
assertSingleFileArtifact(withScripts, distPath);
```

Refactor this into a pure render/plan result plus a separate commit. The commit is allowed only after every selected upload and final reference/hash validation succeeds; otherwise leave the emitted files and original HTML intact. Keep the current `inlineDynamicImports` and `cssCodeSplit: false` preservation shape, but do not use `assetsInlineLimit: Number.MAX_SAFE_INTEGER` during the candidate-discovery pass because it destroys the byte boundaries needed for sorting.

### Runtime loader generation: `optimizer/loader.ts` (runtime generator, request-response + transform)

**Analog:** `packages/nap/src/resource/sdk.ts` lines 14-23 and 59-85.

**Availability guard and canonical runtime call pattern:**

```ts
function requireResource(): NonNullable<NappletGlobal['resource']> {
  const w = window as Window & { napplet?: NappletGlobal };
  if (!w.napplet?.resource) {
    throw new Error('window.napplet.resource is unavailable -- runtime did not inject this domain');
  }
  return w.napplet.resource;
}

export function resourceBytesMany(urls: string[], opts?: { signal?: AbortSignal }): Promise<ResourceBytesItem[]> {
  return requireResource().bytesMany(urls, opts);
}
```

Generate a bounded, private inline loader that performs `window.napplet.resource.bytesMany` before application code, validates returned resource identities, converts verified `Blob`s to object URLs, and only patches the explicitly supported URL consumers. Do not create a new envelope, raw fetch, socket path, or protocol metadata field. The JSON table is tool-owned artifact metadata, not a manifest tag.

### Signer and secret persistence: `optimizer/signer.ts`, shared adapters, CLI redirects (service/provider, event-driven + request-response)

**Analogs:** `packages/cli/src/nostr-connect.ts` lines 278-362 and `packages/cli/src/key-store.ts` lines 13-57, 77-116.

**Racing QR and pasted bunker flows with cleanup:**

```ts
const qrTask = awaitScan(qrSigner, abort.signal);
const pasteTask = awaitPaste(/* injected I/O and relays */);
const timeoutTask = new Promise<never>((_, reject) => {
  timer = setTimeout(() => {
    abort.abort();
    reject(new Error('Remote signer connection timed out'));
  }, timeoutMs);
});

try {
  winner = await Promise.race([ignoredQrTask, ignoredPasteTask, timeoutTask]);
  return { nbunksec: encodeNbunksec(info), pubkey: winner.pubkey, relays: winner.relays };
} finally {
  await cleanupConnectFlow(/* every resource */);
}
```

Extract platform-neutral interfaces; retain test injection points rather than importing Deno globals into the Node Vite process. The secret-store shape should stay small and explicit:

```ts
export interface KeyStoreProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  store(secret: StoredSecret): Promise<void>;
  retrieve(service: string, account: string): Promise<string | null>;
  delete(service: string, account: string): Promise<boolean>;
  list(service: string): Promise<string[]>;
}
```

Use `requireKeyStoreProvider()`’s fail-closed style (lines 48-57): no plaintext config/cache fallback. Redact session data from errors and progress output.

### Discovery and Blossom upload: `optimizer/discovery.ts`, `optimizer/upload.ts` (service, request-response + file-I/O)

**Analogs:** `packages/cli/src/suggestions.ts` lines 10-20 and `packages/cli/src/blossom-upload.ts` lines 67-237.

Use typed constants and ordered de-duplication for discovery, but validate Nostr events and choose the deterministic newest event before reading its tags. The existing suggestions module already defines `BLOSSOM_SERVER_LIST_KIND = 10063`; keep kind `10002` for relay discovery only.

**Upload authorization and exact-byte verification pattern:**

```ts
const tags: string[][] = [
  ['t', 'upload'],
  ...blobSha256s.map((hash) => ['x', hash]),
  ['expiration', String(createdAt + UPLOAD_AUTH_TTL_SECONDS)],
  ['client', 'napplet'],
];
if (server) tags.push(['server', server]);
const signed = await signer.sign({ kind: UPLOAD_AUTH_KIND, created_at: createdAt, tags, content: 'Upload blobs via napplet' });
return `Nostr ${encodeAuthEvent(signed, encoding)}`;
```

Keep the HTTP flow: optimistic HEAD (a failure falls through), PUT exact bytes with `Content-Type` and `X-SHA-256`, then validate the response descriptor before reporting success. The current code preserves a last failure and only retries auth-shaped failures (lines 182-195); retain that containment. Every source asset identity must map to the hash calculated from the exact emitted bytes.

### Tests: `index.test.ts`, new `optimizer/*.test.ts`, CLI regression tests (test, file-I/O + request-response)

**Analog:** `packages/vite-plugin/src/index.test.ts` lines 1-78, 149-285.

**Fixture and cleanup pattern:**

```ts
const tempRoots: string[] = [];
function makeFixture(): { root: string; dist: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nip5a-plugin-'));
  tempRoots.push(root);
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  return { root, dist };
}
afterEach(() => {
  while (tempRoots.length > 0) fs.rmSync(tempRoots.pop()!, { recursive: true, force: true });
});
```

Extend `runCloseBundle()` rather than bypassing plugin hooks. Generate the 50 MiB fixture at test time, inject fake terminal/key-store/relay/fetch adapters, and assert: threshold trigger, descending selection with deterministic ties, authenticated upload request/header/body hash, embedded mapping, canonical `blossom:sha256:` replacement, loader byte identity, nonfatal unable-to-reach-target report, and rollback on upload/validation failure. Preserve current NIP-5A aggregate assertions after final artifact rendering.

## Shared Patterns

### Strict boundaries around protocol surface

**Source:** `packages/vite-plugin/src/manifest.ts` lines 88-123 and `packages/nap/src/resource/sdk.ts` lines 17-23.

Requirements are ordinary `['requires', name]` tags and capability calls go through `window.napplet.resource`; private optimizer metadata must not masquerade as either. Add `['requires', 'resource']` only when the generated artifact invokes that existing proposed NAP. Do not add a custom manifest tag, NIP-5D handshake, or new message.

### File mutation only after verified success

**Source:** `packages/vite-plugin/src/html.ts` lines 227-282; `packages/cli/src/blossom-upload.ts` lines 153-237.

Build a plan in memory, execute remote operations with typed results, validate all result hashes, then write final HTML and remove only selected local assets. A failure before commit preserves `dist`; success reports selected/remaining bytes without exposing secrets.

### Dependency injection for platform and network effects

**Source:** `packages/cli/src/key-store.ts` lines 23-57 and `packages/cli/src/blossom-upload.ts` lines 36-40.

```ts
export interface UploadFilesToServersOptions {
  fetch?: typeof fetch;
  now?: () => number;
  onProgress?: (progress: UploadResultProgress) => void;
}
```

Use equivalent injected Node/Deno adapters for terminal, process runner, key store, relay client, time, and fetch. That keeps deterministic tests network-free and avoids coupling the Vite package to Deno.

### Documentation and release

Follow the public JSDoc approach in `packages/vite-plugin/src/index.ts` lines 61-74 for the new option and link canonical protocol documents rather than copying normative prose. Document supported consumer forms and all exclusions explicitly. Add changesets only for packages whose shipped output changes.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|---|---|---|---|
| Cross-runtime shared package location/name | package boundary | request-response | The repository has Deno CLI and Node Vite code but no existing cross-runtime extraction package; select the smallest internal location supported by package tooling. |
| Browser URL interception for CSS/media/fetch | runtime adapter | event-driven | No existing browser asset loader exists; use the NAP-RESOURCE SDK availability/error pattern and keep the support matrix bounded. |

## Metadata

**Analog search scope:** `packages/vite-plugin/src`, `packages/cli/src`, `packages/nap/src/resource`, and corresponding Vite tests
**Files scanned:** 9 focused implementation/test files
**Pattern extraction date:** 2026-08-21
