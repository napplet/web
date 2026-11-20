---
"@napplet/core": minor
"@napplet/shim": minor
"@napplet/sdk": minor
"@napplet/vite-plugin": minor
"@napplet/conformance": minor
"@napplet/conformance-cli": minor
---

Support explicitly allowlisted experimental (non-NAP) domains across the toolchain, for prototyping a capability before it's proposed on the NAPs track. Nothing is experimental by default, no domain is defined by these packages, and an experimental name can never reuse a NAP domain.

- `@napplet/core`: `isBareDomainName()`, `isRegistryDomain()`, `normalizeExperimentalDomains()`.
- `@napplet/shim`: `registerNappletDomainExtension()` / `installNappletGlobal({ domains, extensions })`, `registerNappletRuntimeExtension()` on `@napplet/shim/prelude`, and `NappletShimPrelude.registerExtension()` on the browser artifact (before `install()`). An extension's object mounts only when the runtime also lists its domain, and its channel can only send and receive `<domain>.*` envelopes over the bound port. Experimental names bypass the maturity policy. The prelude now keeps bare non-NAP names in its rendered activation call instead of dropping them, and throws on names that aren't bare.
- `@napplet/sdk`: `experimentalDomain<T>(name)`.
- `@napplet/vite-plugin`: an `experimentalDomains` option for inference and `R`/`O` output without the unknown-domain warning, plus a one-time "not NAP-defined" notice. This also fixes a missing `shell` entry in the plugin's NAP list, which made `R shell` warn and skipped `window.napplet.shell` inference.
- `@napplet/conformance`: `experimentalDomains` / `experimentalEnvelopeSpecs` on `validateEnvelope`, `validateManifestEvent`, the reference shell, `bootAndCollect` (plus `extensionSource`), and `buildContext`.
- `@napplet/conformance-cli`: `--experimental-domain <name>` (repeatable) and `--extension <file.js>`. The web runtime accepts `?experimental=a,b`.
