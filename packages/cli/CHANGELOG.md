# @napplet/cli

## 0.6.0

### Minor Changes

- 976ad05: Remove the `napplet skills` subcommand and the bundled `@napplet/skills` installer. Agent skills now live in the repository's `skills/` directory as `napplet-*` skills and install with the open skills.sh CLI: `npx skills add napplet/napplet`. `napplet guide`, `napplet init` output, and the `napplet create` next-steps point at that command.

### Patch Changes

- Updated dependencies [976ad05]
  - @napplet/boilerplate@0.3.3

## 0.5.2

### Patch Changes

- b17e944: Make standalone release binaries dispatch bundled create and skills package code without a runtime Node.js or package-resolver dependency, preserve the JSR CLI's package-runner compatibility API, and expose import-safe callable CLI entry points from the maintained packages.
- Updated dependencies [b17e944]
  - @napplet/boilerplate@0.3.2
  - @napplet/skills@0.3.2

## 0.5.1

### Patch Changes

- b3f0007: Accept independent NAP-INTENT archetype roles and payload conventions, and require structured invoke results.
- 2e25f92: Write the build manifest template even without a development signing key, and preserve `count` requirements during CLI deploys.

## 0.5.0

### Minor Changes

- d201bd0: Add the `fs` NAP domain — shell-mediated virtual filesystem access ([NAP-FS](https://github.com/napplet/naps/pull/88)).

  Ships the virtual filesystem operations — `info`, `pickFile`, `pickFiles`, `pickDirectory`, `pickSaveFile`, `stat`, `list`, `read`, `write`, `mkdir`, `remove`, `move`, `watch`, `unwatch` — plus the runtime-pushed `fs.changed` event, reachable through `window.napplet.fs`, `@napplet/nap/fs`, and `@napplet/sdk`. The runtime owns host paths, mounts, backing store, normalization, policy, and authorization; the napplet sees only virtual paths.

  Byte transfer uses RFC 4648 standard padded base64 text for `fs.write.data` and `FsReadResult.data` on the JSON wire. `FsLimits.maxReadBytes`, `FsLimits.maxWriteBytes`, byte range options, and read/write result counts refer to decoded bytes.

## 0.4.0

### Minor Changes

- 7b67562: Align INC and INTENT with their merged canonical contracts.

  INC topic subscriptions now receive one `IncEvent` containing the exact topic, runtime-attested sender, and optional payload. The runtime no longer fabricates a Nostr event. INC also exposes the symmetric channel API through `channel.open`, `channel.onOpened`, `channel.list`, and `channel.broadcast`; channel handles support `emit`, `on`, `onClosed`, and `close`, including bounded early-notification replay and terminal close retention.

  INTENT now accepts `invoke(request)` and `open(archetype, payload?, opts?)`, supports `behavior.newWindow`, and returns the canonical structured result with required `ok`, `archetype`, `action`, and `handled` fields. Remove the unmerged URI invocation, `onDelivery`, `intent.deliver`, and acceptance-only result model.

  Archetype metadata now emits only the canonical `["archetype", slug, convention]` shape. Remove the draft-only `eventKinds` option and trailing `kind:<number>` fields.

## 0.3.0

### Minor Changes

- dd7b3a7: Adopt the draft PR #89-#91 convention and intent contracts across the public
  types, bindings, runtime injection, manifest tooling, CLI, and reference shell:
  queryless exact identities with URI-to-text-payload transposition at `emit` and
  `invoke`/`open`, runtime-attested sender, immediate acceptance followed by
  source-independent no-ID target delivery, and optional same-tag event-kind
  discovery metadata.

### Patch Changes

- 4916777: Remove the 13-character upper bound on named napplet `d` tags. Neither NIP-5D nor
  NIP-5A constrains `d` tag length, so `^[a-z0-9-]{1,13}$` was CLI-invented surface
  that rejected spec-conformant napplets — `napplet deploy` now accepts any
  non-empty `[a-z0-9-]` `d` tag (still rejecting trailing `-`), and `napplet deploy
--all` no longer throws on workspace folders with names longer than 13
  characters.

## 0.2.1

### Patch Changes

- b335c40: Run the default conformance tool through its npm package instead of requiring a
  global `napplet-conformance` executable, and preserve Kehto's managed-command
  separator when `napplet paja` wraps a local app server.

## 0.2.0

### Minor Changes

- 49a8658: Make developer onboarding CLI-first from installation through deployment. The
  Napplet CLI now creates starters, owns deployment metadata, installs agent
  skills, prints a linked developer guide, and ships as checksum-verified
  standalone binaries. The boilerplate
  generator no longer prompts for deployment metadata, and the bundled skills
  teach the same ordered workflow as the CLI, docs, and web app.

## 0.1.3

### Patch Changes

- faf9763: Improve interactive CLI deploy/init UX with guided init suggestions, hidden
  Enter-based secret prompts, terminal deploy reports with NIP-19 pointers,
  configured-bunker reconnects, and raw `bunker://` signing while preserving JSON
  output for CI. Root-source deploys now keep local control state such as
  `.napplet/config.json`, hidden files, and `node_modules` out of signed manifest
  content. Relay and Blossom suggestions are now Tab-completion candidates instead
  of numbered selections, and Nostr Connect asks for bunker relays separately from
  deploy relays with `wss://bucket.coracle.social` as the default.
  Nostr Connect pairing and remote signing now use applesauce-signers so QR flows
  accept the `ack` responses emitted by common bunkers and match nsyte behavior.
  Blossom uploads now keep the BUD-11 scoped base64url token as the first attempt
  but fall back to unscoped and legacy base64 auth for deployed servers that reject
  otherwise valid uploads.
  Network deploys now treat unavailable redundant Blossom mirrors as warnings and
  continue to relay publication whenever at least one server holds every required
  blob, while still failing when no configured server is complete. Human reports
  now share the command's success predicate, so redundant relay misses are also
  warnings whenever every manifest reaches another relay.

## 0.1.2

### Patch Changes

- 35a593a: Improve the JSR-facing package overview and README content for CLI, conformance, shim, and Vite plugin packages.

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
