# BLOSSOM: server-directed blob access

This is non-normative package guidance for the living [NAP-BLOSSOM proposal](https://github.com/napplet/naps/pull/71). The proposal is a draft; its operation schemas and security requirements remain authoritative.

Use `blossom` when the napplet needs to name a Blossom server and endpoint operation. Use `resource.bytes()` for general resource retrieval, including Blossom URIs, and `upload.upload()` when the runtime should choose storage servers or an upload rail. The CLI's deployment uploader is separate from this injected capability.

## Call through the SDK

```ts
import { blossom } from '@napplet/sdk/blossom';

if (window.napplet?.blossom) {
  const result = await blossom.get({
    server: 'https://cdn.example.com',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    extension: '.bin',
    auth: 'none',
  });
  if (result.ok && result.blob) {
    // Blob or ArrayBuffer, delivered by structured clone.
    const bytes = result.blob;
    console.log(bytes);
  } else {
    console.log(result.error);
  }
}
```

The same namespace is exported from `@napplet/sdk`. `@napplet/nap/blossom` provides types, the runtime shim installer and prefixed SDK helpers; `/types`, `/shim` and `/sdk` select individual layers. Napplet code consumes the injected domain; only the host installs it.

The namespace exposes `check`, `get`, `checkUpload`, `upload`, `mirror`, `checkMedia`, `media`, `list`, `delete`, `servers`, `addServer`, `removeServer`, `reorderServers`, `parseUri` and `formatUri`. URI helpers use BUD-10 locally and send no messages. They parse and format hints; they neither fetch nor authorize access.

## Handle results and availability

Declare `optional: ['blossom']` when the app remains useful without this feature, or `requires: ['blossom']` when the core task depends on it. The Vite plugin recognizes Blossom subpath imports and direct domain reads during optional requirement inference. Declarations do not grant access; check injected domain presence for optional features.

Endpoint and policy failures resolve as typed results with `ok: false` and `error`. An upstream `status` of zero can represent runtime policy failure. A malformed-envelope error, transport failure or timeout rejects the request promise. Calling the cleanup returned by `installBlossomShim()` also rejects pending requests. Treat `headers.reason` as diagnostic text, not a machine-readable error code.

`upload` preserves supplied bytes; `media` permits server transformation. Both use `Blob` or `ArrayBuffer` rather than base64. `servers` and its mutation helpers operate on the connected user's ordered BUD-03 list; returned source events use `RelayEventResult`. They do not expose signing tokens or keys.

## Runtime integration and verification

Hosts opt in with `domains: ['blossom']` when installing the runtime prelude and implement the proposal's shell side: endpoint restrictions, network policy, authentication, integrity checks and server-list publication. The binding transports requests and results; it does not implement those host policies or make HTTP requests itself.

The conformance reference shell returns deterministic typed failures: `unsupported` for endpoints, `not-signed-in` for required authentication or mutations, and `server-list-unavailable` for server-list reads. It exercises the SDK and wire boundary without performing network requests, signing events or pretending to upload/delete blobs. Passing these checks does not prove a host's live Blossom backend, hash verification or SSRF protections.
