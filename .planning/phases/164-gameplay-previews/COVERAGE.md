# Gameplay preview coverage

Assessment date: 2026-10-13. Scope: every repository in the napplet organization and every package on its default branches, plus relevant Kehto/Paja consumers. Local WIP and unrelated feature branches were preserved. This is implementation coverage, not a protocol specification.

## Organization repositories

| Repository and inspected head | Coverage and disposition |
| --- | --- |
| `napplet/web` (also reached through the `napplet/napplet` redirect), `10fd4e618ad4ae742105ca52fd79bf9d03ffc6e1` | Updated CLI, browser runner, documentation, skills and standalone CI. Package inventory below. |
| `napplet/boilerplate`, `cbbebe9bd56271277b054535c0a8d720a588f61d` | Updated capture guide, example recipe, author checklist and context map. Verification exposed an old plugin that emitted external assets; updated published SDK/plugin/conformance dependencies and corrected obsolete manifest guidance. Added the description required by the current plugin. |
| `napplet/naps`, `3fdba1accd508ab54939b277d426127c5af8faf8` | Specification documents; no runtime or application gallery. No new NAP is needed for local authoring or existing application-event attachments. Unchanged. |
| `napplet/cvm`, `960535c53e57a1670cf6a80b32cd1b5ad83098ad` | Inspected repository tree, root package, publication preview service, and catalog references. `src/publication/preview-service.ts` grants access to sealed builds; `src/release/costs/production-catalog.ts` is a cloud-cost catalog. Neither renders application previews. Root `napplet-cvm` and `toolchains/locks/initial/package.json` remain unchanged; the latter pins a build environment, not an authoring UI. |
| `napplet/nappagochi`, `042df6c6a6753001c0031d0845b150092b80e55a` | Single private `nappagochi-napplet` package. A game can be recorded with the external CLI; recording is optional and needs no app-owned capture API. Pet speech catalogs are not application listings. Unchanged. |
| `napplet/migrate`, `a704cfac08cc3cb76b5029c58321d9827d2036b9` | Single `napplet-migrate` package. Manifest migration UI does not publish or render application preview videos. No migration field added. Unchanged. |
| `napplet/.github`, `aa6ed99ecfc1736b72e5ee3c99abd81ed9674913` | Only `profile/README.md`; no package or media consumer. Unchanged. |

## All web monorepo packages

| Package | Disposition |
| --- | --- |
| Root `napplet` | Existing build, release and skill checks used. No new production dependency. |
| `@napplet/cli` | `record` command, persistent selection, artifact and clip validation, optional Blossom upload and NIP-92 attachment. Version 0.10.0. |
| `@napplet/conformance-cli` | Exact-byte Paja preview, interactive and scripted recording, managed encoder, exclusive output creation, decoded metadata, real browser tests. Paja updated to published 0.20.1. Version 0.4.0. |
| `@napplet/boilerplate` | Generator already downloads the upstream template and forwards it without interpreting media. Changes belong in the template repo, so generator code/version unchanged. |
| `@napplet/core` | Envelopes and protocol types unchanged. Local selection is a CLI type, not a protocol field. |
| `@napplet/nap` | All 25 domain directories (`ble`, `common`, `config`, `count`, `cvm`, `dm`, `fs`, `identity`, `ifc`, `inc`, `intent`, `keys`, `link`, `lists`, `media`, `notify`, `outbox`, `relay`, `resource`, `serial`, `shell`, `storage`, `theme`, `upload`, `webrtc`) remain unchanged: capture runs in the authoring host and adds no domain action. |
| `@napplet/sdk` | Existing app calls work in the recorded artifact. No capture API or additional exported helper needed. |
| `@napplet/shim` | Runtime injection remains supplied by Paja. No new handshake or runtime transport. |
| `@napplet/vite-plugin` | Existing single-file artifact and hash output consumed as-is. No video HTML metadata or manifest tags added. |
| `@napplet/conformance` | Protocol checks unchanged. Recording bounds are authoring policy, not conformance criteria. |
| `@napplet/conformance-web` (`apps/conformance`) | Test report UI, not an application gallery. Unchanged. |
| `@napplet/docs` | Guide, CLI reference, sidebar and version-synchronized tutorial updated. |
| `@napplet/web` (`apps/web`) | Marketing sections, with no application-event catalog or preview cards. Unchanged. |
| `skills/` (not an npm package) | Updated `napplet-build`, `napplet-make`, `napplet-test`. Other skills cover design, runtime APIs, interop, migration, porting and UI rather than optional publication authoring; unchanged. |

## Kehto/Paja consumers

Inspected current main `bc8b517b4cbea21d6f12e4da23dbc48211f553e3`, using graph discovery and source reads. The original `feat/kernl-rebrand` checkout and its dirty package file remain untouched.

| Package or surface | Disposition |
| --- | --- |
| `packages/paja` | Reused its existing preview host. Host controls are excluded by making the napplet iframe fill the recorded viewport; interactive recording controls are removed before capture. No Paja protocol changes. |
| `packages/cli` | Existing Paja CLI unchanged; napplet owns `record`. |
| `packages/runtime`, `packages/shell`, `packages/wm` | Runtime and window management, with no application preview catalog. Unchanged. |
| `packages/nip`, `packages/services` | Existing manifest and intent resolution remains. Generic upload metadata support is not an application gallery. No video schema is added to NIP-5D. |
| `packages/acl`, `packages/firewall` | Permission/security boundaries unchanged. |
| `apps/playground` | `installed-napplet-catalog.ts` and `playground-intent-catalog.ts` route installed app intents; they do not show application cover cards. No playback component applies. |
| Playground napplet packages | `ble-demo`, `bot`, `chat`, `common-demo`, `composer`, `cvm-relatr`, `feed`, `link-demo`, `lists-demo`, `preferences`, `profile-viewer`, `resource-demo`, `serial-demo`, `toaster`, `webrtc-demo`: app/demo consumers, with no capture API requirement. Unchanged. |
| Root and `docs` packages | No separate recording or application-gallery owner. Unchanged. |
| `tests/e2e/harness`; fixture packages `nap-identity`, `nap-inc`, `nap-notify`, `nap-relay`, `nap-storage`, `nap-theme` | Test-only consumers; no application listing publication or playback. Unchanged. |

## Playback applicability and limits

No inspected default branch contains an application-preview catalog to extend. Consequently no hover/focus player, offscreen observer, hidden-tab listener, reduced-motion rule or Save-Data behavior was added to an unrelated UI. Tests decode and seek actual recorded frames and verify input-driven movement. Publication preserves configured static covers and supplies the recording thumbnail when no cover exists. Downstream clients choose whether to display NIP-92 video metadata on kind 32267.

The existing manifest `app` reference still follows the open [application-reference proposal](https://github.com/dskvr/nips/pull/11). It is not settled NIP-5D interoperability. The recording feature introduces no additional manifest fields. The [Software Applications proposal](https://github.com/nostr-protocol/nips/pull/1336) also remains a proposal.

## Defects encountered

Boilerplate main still described NIP-5A aggregate hashes as current NIP-5D and its old plugin failed to inline assets despite its single-file option. Both affected the new workflow, so the boilerplate PR corrects them. The prior gamepad boilerplate PR may overlap those dependency/doc changes; neither branch was merged or silently absorbed.

CVM uses internal `aggregateSha256` names in its sealed-build preview model. This task does not establish whether those names describe legacy wire semantics; no code was copied from that model into current manifest handling.
