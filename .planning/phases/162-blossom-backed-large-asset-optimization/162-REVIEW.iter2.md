---
phase: 162-blossom-backed-large-asset-optimization
reviewed: 2026-08-21T18:29:51Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - packages/build-tools/src/blossom.test.ts
  - packages/build-tools/src/blossom.ts
  - packages/build-tools/src/contracts.ts
  - packages/build-tools/src/discovery.test.ts
  - packages/build-tools/src/discovery.ts
  - packages/build-tools/src/index.ts
  - packages/build-tools/src/network-policy.test.ts
  - packages/build-tools/src/network-policy.ts
  - packages/build-tools/src/secret-store.test.ts
  - packages/build-tools/src/secret-store.ts
  - packages/build-tools/src/signer.test.ts
  - packages/build-tools/src/signer.ts
  - packages/build-tools/src/terminal.test.ts
  - packages/build-tools/src/terminal.ts
  - packages/build-tools/tsup.config.ts
  - packages/cli/src/blossom-upload.ts
  - packages/cli/src/deploy-network.ts
  - packages/cli/src/deploy-signer-remote.ts
  - packages/cli/src/deploy-signer.ts
  - packages/cli/src/key-store.ts
  - packages/cli/src/nostr-connect-terminal.ts
  - packages/cli/src/nostr-connect.ts
  - packages/cli/src/output.ts
  - packages/cli/src/suggestions.ts
  - packages/cli/tests/deploy_network_test.ts
  - packages/cli/tests/deploy_signer_test.ts
  - packages/cli/tests/key_store_test.ts
  - packages/cli/tests/nostr_connect_test.ts
  - packages/cli/tests/output_test.ts
  - packages/cli/tests/suggestions_test.ts
  - packages/vite-plugin/src/html.ts
  - packages/vite-plugin/src/index.test.ts
  - packages/vite-plugin/src/index.ts
  - packages/vite-plugin/src/manifest.ts
  - packages/vite-plugin/src/optimizer/large-fixture.test.ts
  - packages/vite-plugin/src/optimizer/large-fixture.ts
  - packages/vite-plugin/src/optimizer/loader.test.ts
  - packages/vite-plugin/src/optimizer/loader.ts
  - packages/vite-plugin/src/optimizer/node-services.test.ts
  - packages/vite-plugin/src/optimizer/node-services.ts
  - packages/vite-plugin/src/optimizer/pipeline.test.ts
  - packages/vite-plugin/src/optimizer/pipeline.ts
  - packages/vite-plugin/src/optimizer/references.test.ts
  - packages/vite-plugin/src/optimizer/references.ts
  - packages/vite-plugin/src/optimizer/security.test.ts
  - packages/vite-plugin/src/requirements.ts
  - packages/vite-plugin/src/types.ts
  - scripts/check-build-secret-leaks.mjs
  - scripts/check-build-secret-leaks.test.mjs
findings:
  critical: 5
  warning: 2
  info: 0
  total: 7
status: issues_found
---

# Phase 162: Code Review Report

**Reviewed:** 2026-08-21T18:29:51Z
**Depth:** standard
**Files Reviewed:** 49
**Status:** issues_found

## Summary

The reviewed build, deployment, signer, and optimizer paths contain release-blocking integrity, SSRF, secret-exposure, lifecycle, and runtime-correctness defects. In particular, the optimizer’s rendered output does not route rewritten resource references through the generated NAP-RESOURCE loader, and the deploy path can publish a manifest for bytes it never verified or uploaded. The NIP-5D/NAP-RESOURCE contract was consulted for the runtime-capability boundary; no new shell message is needed to fix the defects below.

## Critical Issues

### CR-01: Deployment can publish a manifest whose referenced bytes were never uploaded

**File:** `packages/cli/src/blossom-upload.ts:67-76`, `packages/cli/src/blossom-upload.ts:105-113`, `packages/cli/src/deploy-network.ts:93-96`
**Issue:** `collectDeployFilePayloads` reads each file but trusts the old `ManifestFileMapping.sha256` without hashing the bytes it just read. `uploadExactBlobs` correctly hashes the current bytes, but the CLI then maps that actual hash back to a path using the manifest hash. A file changed after manifest creation is therefore reported as `[unknown-file]` while still counted as a successful upload; `summarizeUploads` can mark every server complete and `executeNetworkDeploy` publishes the stale manifest. Runtimes will then resolve the manifest’s hash, not the uploaded replacement bytes.
**Fix:** Hash every file immediately after reading it and fail the deploy before any upload when it differs from `file.sha256`. Also make upload completion require evidence for every `(server, manifest hash)` pair, not merely a successful result count.

```ts
const data = await Deno.readFile(joinPath(candidateDir, file.path.slice(1)));
if (await sha256Hex(data) !== file.sha256) {
  throw new Error(`Deploy input changed after manifest creation: ${file.path}`);
}
payloads.push({ candidateDir, path: file.path, sha256: file.sha256, data, contentType: contentTypeForPath(file.path) });
```

### CR-02: The DNS policy is bypassable through DNS rebinding

**File:** `packages/build-tools/src/network-policy.ts:58-70`, `packages/build-tools/src/blossom.ts:247-252`, `packages/vite-plugin/src/optimizer/node-services.ts:348-368`
**Issue:** The policy checks an independently resolved list of public addresses, then calls `fetch()` with the hostname URL. Fetch performs a second, unpinned DNS resolution when opening the connection. An attacker controlling DNS can return a public address to `resolve()` and a loopback/link-local address to fetch, bypassing the claimed SSRF protection; validating redirects does not close this TOCTOU gap.
**Fix:** Use a transport that connects only to one of the vetted IP addresses while preserving the original HTTPS hostname for SNI/certificate validation (for example an Undici dispatcher with a custom lookup/connection policy), and reject if that pinned connection cannot be made. Add a rebinding test that gives validation and connection different answers.

### CR-03: Optimized artifacts replace usable URLs with an unhandled custom URI

**File:** `packages/vite-plugin/src/optimizer/pipeline.ts:225-232`, `packages/vite-plugin/src/optimizer/loader.ts:271-273`
**Issue:** `renderOptimizedHtml` globally replaces eligible asset references with `blossom:sha256:…`. Native consumers such as CSS `url(...)` and `fetch(...)` do not invoke `window.napplet.resource`; browsers cannot fetch that URI directly. The injected loader only exposes `window.__nappletPrivateResourceLoader` and defines neither `__nappletAssetUrl` nor any rewrite/interception that routes these references through `resource.bytes`/`bytesMany`. Consequently the test fixture’s `fetch(__nappletAssetUrl(...))` is not executable in a browser, and ordinary selected CSS/fetch references fail after the original files are deleted.
**Fix:** Restrict externalization to reference forms that are rewritten to an actually implemented asynchronous loader call, or emit a defined build-private helper and rewrite each supported call site to it (for example `await window.__nappletPrivateResourceLoader.response(source)`). Do not substitute `blossom:` into native URL positions until there is a conforming loader path. Add an integration test that executes the final built page against a resource-capable shell stub and proves CSS/JS resource resolution succeeds.

### CR-04: Windows build-tool credential writes expose the session secret in the process list

**File:** `packages/build-tools/src/secret-store.ts:141-145`, `packages/vite-plugin/src/optimizer/node-services.ts:307-325`
**Issue:** The Windows provider supplies the `RedactedSecret` as `/pass:<secret>` to `cmdkey`; the Node adapter turns it into an ordinary child-process argument. Redaction only affects diagnostics—local users and process-monitoring software can read command-line arguments, exposing the reusable NIP-46 `nbunksec` session secret.
**Fix:** Do not use `cmdkey` for secret writes. Use a native Credential Manager API binding/FFI that passes the credential blob in memory, or mark this provider unavailable until such a boundary exists. Retain secrets only on stdin when the selected native tool explicitly supports it, and add a test asserting no secret reaches `args`.

### CR-05: Closed stdin can permanently hang Nostr Connect pairing

**File:** `packages/cli/src/nostr-connect.ts:224-237`
**Issue:** On EOF, `readLine` returns a never-settling promise. In `pairBuildSigner`, that is one operand of `Promise.any`; aborting on the pairing timeout does not reject this promise after EOF. If the QR flow also rejects, `Promise.any` remains pending forever instead of reporting the advertised timeout/failure, leaving a non-interactive or closed-stdin CLI stuck.
**Fix:** Treat EOF as a rejection, and ensure the abort signal races every terminal read.

```ts
const { value, done } = await reader.read();
if (done) throw new Error("terminal input closed");
```

Add a test with a closed `ReadableStream` and a rejected QR pairing that asserts `connectRemoteSigner` settles within its timeout.

## Warnings

### WR-01: Pairing verifies a syntactically valid signer key but not the claimed remote identity

**File:** `packages/build-tools/src/terminal.ts:152-173`
**Issue:** `verifySession` checks that `session.signer.getPublicKey()` is a valid hex key, but never compares it to `session.remotePubkey` (or, on reconnect, to the stored identity). This permits a mismatched session to be persisted and later used under misleading discovery/configuration identity metadata.
**Fix:** After `getPublicKey`, require equality with `session.remotePubkey` and with `expected.remotePubkey` when present; close the signer and reject on mismatch. Add mismatch vectors to the terminal tests.

### WR-02: NIP-65 relay normalization drops valid relay paths

**File:** `packages/build-tools/src/discovery.ts:210-217`
**Issue:** `normalizeRelay` returns `url.origin`, discarding any pathname in a signed kind-10002 relay tag. WebSocket relay URLs can be hosted below a path, so discovery queries the wrong endpoint and cannot discover the author’s BUD-03 list for those configurations.
**Fix:** Preserve the normalized pathname while still rejecting credentials, query, and fragment (for example return `url.toString()` after normalizing a trailing slash according to the relay URL convention). Add a signed relay-list test using `wss://relay.example/nostr`.

---

_Reviewed: 2026-08-21T18:29:51Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
