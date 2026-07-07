# @napplet/cli

## 0.1.1

### Patch Changes

- 954b6bb: Improve JSR score readiness with module docs and explicit public API types.

## 0.1.0

### Minor Changes

- fb434c3: Add a read-only `napplet debug` command for inspecting config, discovery, deploy-plan, manifest, and signing readiness state.
- fb434c3: Add native platform key storage providers and `napplet keys store/use/list/delete/doctor` command surfaces for interactive/local signing references.
- fb434c3: Sign dry-run root and named manifest templates when a local hex or nsec private key is available.
- fb434c3: Build NIP-5A root/named/snapshot deploy manifest templates in dry-run output using canonical manifest kind values, path tags, aggregate hashes, and server hints.
- fb434c3: Support nsyte-compatible nbunksec remote signing for CI and stored-key deploy flows.
- fb434c3: Enable local-signer network deploys that upload files to configured Blossom servers and publish signed manifest events to configured relays.
- fb434c3: Preserve plugin-emitted `requires` tags when building root, named, and snapshot deploy manifests.
- fb434c3: Generate and sign dry-run snapshot manifest templates when local signer pubkeys are available.
- fb434c3: Read the built `index.html` at deploy time and emit the NIP-5A single-value `["title", …]` and `["description", …]` manifest tags from its plain-HTML `<title>` element and `<meta name="description">` element. Values are entity-decoded and trimmed; empty or missing values emit no tag, at most one of each is emitted, and the tags propagate to root, named, and companion snapshot manifests alongside the existing `requires` passthrough.
- fb434c3: Add the initial Deno CLI package with `.napplet` config initialization, napplet discovery, dry-run deploy planning, signing-method classification, and conformance/Paja wrapper command surfaces.
- fb434c3: Add `napplet keys connect` NIP-46 remote signer login (nostrconnect QR + bunker:// paste). It pairs a remote signer, stores the resulting nbunksec in the platform keychain, and points `.napplet` signing.keyReference at it.

### Patch Changes

- b7d6561: Expose the CLI entrypoint as a JSR installable subpath and refresh the README with installation,
  quick-start, command, signing, project-layout, and troubleshooting guidance.
- fb434c3: Publish NIP-5D napplet manifest kinds from deploy commands
