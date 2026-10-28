# Agent skills

> `napplet-*` skills that let a coding agent make, design, build, port, and test a napplet, including its icon artwork. Installed with the open [skills CLI](https://skills.sh); not an npm package.

A **napplet** is a sandboxed Nostr iframe applet (NIP-5D). The skills carry the exact, verified package surface and protocol constraints an agent needs so that one well-scoped prompt produces a working, conformant, compact napplet that looks right at any frame size.

- **Source:** [`skills/`](https://github.com/napplet/napplet/tree/main/skills) in the napplet monorepo
- **Format:** one `SKILL.md` per skill with YAML `name` / `description` frontmatter — the format Claude Code, Codex, Cursor, and most agents consume

## Install

```bash
npx skills add napplet/napplet
```

The CLI detects which coding agents are installed and places the skills where each one reads them (`.claude/skills/`, `.agents/skills/` for Codex and Cursor, and the matching directory for other agents), symlinking to one canonical copy by default. Useful flags:

```bash
npx skills add napplet/napplet --list                    # see what ships
npx skills add napplet/napplet -a claude-code            # one agent (also: codex, cursor, gemini-cli, github-copilot, …)
npx skills add napplet/napplet -g                        # global, all projects
npx skills add napplet/napplet --skill napplet-make      # a single skill
npx skills add napplet/napplet --skill napplet-icon      # icon design and generation
npx skills add napplet/napplet --skill napplet-port-napp # nostrapps NAPP migration
npx skills add napplet/napplet --skill napplet-ui --skill napplet-sdk
npx skills update                                        # pull the latest skill text
```

Agents that read skills by name can then invoke `/napplet-make`, `/napplet-ui`, and so on. Agents without a skills directory can be pointed at a skill file directly (`npx skills use napplet/napplet --skill napplet-make | claude`).

## The skills

| Skill | Use when | What it owns |
| --- | --- | --- |
| `napplet-make` | "Build me a napplet" in one prompt | Entry point. Project/toolchain triage, routing through the other skills, the non-negotiables, and the evidence report. |
| `napplet-design` | First, before code | Sandbox authority contract, NAP boundary per feature (OUTBOX-first, relay as escape hatch), hard `requires` vs optional fallbacks, the form-factor plan, the build spec. |
| `napplet-icon` | Designing, generating, or refining an app icon | Visual concept, image generation or editing, small-size and transparency checks, refinement, asset delivery, and optional NIP-5D integration. |
| `napplet-ui` | Any markup, CSS, or layout work | The applet visual contract: no title header, compact density by default, tiers from tiny widget to full screen, minimum-size notice only when the UI truly breaks, whole-surface NAP-THEME, the four-frame check. |
| `napplet-build` | Implementing a spec | `napplet create` + `napplet init`, boilerplate edit points (including stripping the starter masthead and page layout), manifest config, SDK-first implementation, `pnpm verify` + conformance, Paja preview. |
| `napplet-sdk` | While writing calls | Per-domain `@napplet/sdk` reference: shipped domains, outbox, social NAPs, relay escape hatch, storage, identity, resource, config, theme, keys, availability pattern. |
| `napplet-interop` | Only for cross-napplet features | NAP-INC topics, NAP-INTENT dispatch, archetype manifest metadata, the stable queryless convention rule. |
| `napplet-port` | Migrating an existing Nostr app | Inventory of app-owned relay/signing/storage/network layers, migration map, monolith splitting, removing site chrome, the hand-off. |
| `napplet-port-napp` | Porting an eskema/nostrapps NAPP | Complete migration of launcher bridge, event store, actions, UI kit, assets and metadata; behavior parity through implementation and runtime checks. |
| `napplet-test` | Before publishing | Conformance, failure interpretation, boundary audit, single-file artifact, applet UI checks, smoke scenarios, Paja preview, CI. |
| `napplet-migrate` | When upgrading event formats | Signed-event previews, current/legacy deployment choices, hash and pointer compatibility. |

## Usage patterns

- **New napplet:** install everything, then prompt with the product idea and "use the napplet-make skill". `napplet-make` runs design → ui → build → test.
- **Design and generate an icon:** invoke `napplet-icon` with the app's purpose, any visual references, and style preferences. For example: "Use napplet-icon to design and generate an icon for my note-drafts napplet. Use a warm paper palette, one recognizable shape, and a transparent background." The skill develops a direction, generates artwork with the agent's image tool, inspects small-size legibility, and delivers the file. It can also integrate the selected icon into an existing project when requested. Image generation requires an available image tool; without one, the skill provides the brief and prompt and reports that limitation.
- **Fix the look of an existing napplet:** invoke `napplet-ui` directly ("apply the napplet-ui contract to this napplet") — it is deliberately self-contained so the agent does not reload the SDK reference.
- **Add one feature:** `napplet-design` for the new boundary, `napplet-build` for the change, `napplet-test` to close.
- **Port a Nostr app:** start with `napplet-port`; it produces the inventory the rest of the chain consumes.
- **Port a nostrapps NAPP:** use `napplet-port-napp`. Example: "Port the NAPP at ./source-app to ./ported-app using napplet-port-napp. Preserve its profile action, list editor and user data, implement the port, and report parity evidence and unsupported behavior." The skill follows the live [NAPP source contract](https://github.com/eskema/nostrapps/blob/main/NAPP.md) and target NIP-5D/NAP documents, distinguishes store reads from outbox queries and action acceptance from return values, and continues through build, conformance and runtime verification. It includes source-specific migration references; companion skills can be read from their maintained sources if not installed.
- **Just the API:** `napplet-sdk` alone is a compact reference for agents that already know the workflow.

## What the skills enforce

- The sandbox is an authoring contract: no direct `fetch`, XHR, WebSocket, browser storage, cookies, `window.nostr`, external scripts/styles/images, or app-owned relay/signing infrastructure in napplet code. Bytes go through `resource`, state through `storage`, social Nostr behavior through `outbox`, `common`, `lists`, `count`, and `dm`.
- Napplets are applets, not web pages: no title header or tagline (the runtime shows the name), compact tool density, layouts that use the whole frame at every size, an explicit minimum-size notice only when a floor truly exists.
- SDK-first calls through `@napplet/sdk`; `window.napplet?.domain` only as an optional-domain check after runtime injection. The optional `shell` domain reports environment information; other domains remain usable without waiting for `shell.ready()`.
- For maximum compatibility, register keyboard-bound actions through [NAP-KEYS](https://github.com/napplet/naps/pull/9), including app-local shortcuts and game controls. The SDK skill shows registration; the test skill checks assigned bindings, rebinding, duplicate invocation, and the fallback when `keys` is absent. Ordinary text input stays local. This is non-normative authoring guidance.
- New projects come from `napplet create` and `napplet init`; agents edit the generated project rather than rebuilding its substrate, and run `pnpm verify` + `pnpm test:conformance` before claiming done.
- Protocol truth stays in the living [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303) and [NAPs](https://github.com/napplet/naps) documents. The skills are non-normative authoring guidance and tell the agent to stop and flag gaps instead of inventing surface.

## Contributing

Skills are plain Markdown under `skills/<name>/SKILL.md`. `pnpm test:skills-contracts` checks names, frontmatter, cross-references, and the UI rules every skill must carry. If the same correction keeps landing in user prompts, it belongs in a skill.

## See also

- [Getting started](/guide/getting-started) — scaffold and run your first napplet
- [Note Drafts with an AI agent](/guide/build-note-drafts-napplet-with-ai-agent-and-skills) — the tutorial that uses these skills
- [`@napplet/boilerplate`](/packages/boilerplate) — the starter the build skill targets
- [`@napplet/conformance-cli`](/packages/conformance-cli) — the runner the test skill drives
