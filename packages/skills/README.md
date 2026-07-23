# @napplet/skills

> Agent skills that let a coding agent make, design, build, port, and test a [napplet](https://github.com/napplet/napplet) end-to-end, installed through `napplet skills`.

A **napplet** is a sandboxed Nostr iframe app (NIP-5D). These skills carry the
exact, verified API surface and protocol constraints an agent needs so that one
well-scoped prompt produces a working, conformant napplet.

The skills treat the sandbox as an authoring contract, not a suggestion:
generated napplet code must not use direct `fetch`, XHR, WebSocket, browser
storage, cookies, `window.nostr`, external scripts/styles/images, or direct
relay/signing infrastructure. External bytes go through `resource`, state goes
through `storage`, and social Nostr behavior goes through shell-owned NAPs such
as `outbox`, `common`, `lists`, `count`, and `dm`.

- **npm:** [`@napplet/skills`](https://www.npmjs.com/package/@napplet/skills)
- **JSR:** [`@napplet/skills`](https://jsr.io/@napplet/skills)

## The skills

| Skill | When | Covers |
| --- | --- | --- |
| `make-napplet` | One-prompt end-to-end builds | Orchestrates project-state triage, port/design/build/test, NAP-THEME whole-surface application, Paja runtime preview, OUTBOX-first social behavior, and the final evidence checklist. |
| `design-napplet` | First — plan before code | Sandbox/loading constraints, OUTBOX-first NAP selection, package-implemented NAP inventory, hard-vs-optional requirements, NAP-THEME mappings including the page background, **responsive layout for any viewport** (full-screen → tiny widget), and the build spec to hand off. |
| `build-napplet` | Implementation | Starts from the correct project state, preserves the starter substrate, applies NAP-THEME to the full surface including `html`/`body` backgrounds, uses `@napplet/sdk`, and previews through Paja rather than reporting a raw Vite URL. |
| `port-nostr-app` | Migrating an existing Nostr app | Replace direct relay pools, `window.nostr`, local storage, direct fetch/media loads, app-owned shortcut plumbing, and app-owned signing/routing with shell-owned NAP boundaries and SDK helper imports before building. |
| `test-napplet` | Before publishing | Protocol conformance via `napplet-conformance` (real Chromium + reference shell), forbidden browser-authority scans, interpreting failures, the runtime guard, CI wiring. |

Each skill is a self-contained `SKILL.md` with YAML frontmatter (`name`,
`description`) — the format Claude Code, Cursor, and most agents consume.

## Scaffolding substrate

For new napplet projects, `build-napplet` and the top-level `make-napplet`
workflow treat `napplet create` and its maintained
[`@napplet/boilerplate`](../boilerplate) implementation as authoritative. Agents
should scaffold through the CLI, run `napplet init` for deployment metadata, keep its package manager pin, Vite config,
scripts, file layout, README/docs structure, and conformance wiring, then edit
only project-specific application surfaces such as hard `requires`, config schema,
`src/main.ts`, `src/styles.css`, title/root markup, and README content.

Current package guidance is SDK-first. Napplet code should use `@napplet/sdk`
wrappers for domain calls, use `window.napplet?.domain` only for optional
fallback checks after runtime injection, and keep optional enhancements such as
shell-managed key reservation out of `requires` unless the napplet cannot
function without them.

There is no `shell.ready()` / `shell.supports(...)` API; use injected domain
presence for optional fallbacks and do not invent a generic capability probe.

## Cross-napplet conventions

For archetype-enabled napplets, use one opaque convention per exact
three-element manifest tag: `["archetype", slug, convention]`, such as
`["archetype", "note", "napplet:note/open"]`. A convention name advertises an
interaction; it does not supply a payload schema, event-kind constraint, version,
or negotiation mechanism.

INC topics use the same opaque names, including `napplet:note/open`,
`napplet:profile/open`, and `napplet:dm/open`. For outbound NAP-INC only,
`emit(topic, payload?)` may receive a queried convention URI:

```ts
inc.emit('napplet:profile/open?pubkey=abc123');
// -> { type: 'inc.emit', topic: 'napplet:profile/open', payload: { pubkey: 'abc123' } }
```

The runtime percent-decodes shallow text values (`+` stays plus) and routes the
stable queryless topic, which subscribers use exactly. Fragments, malformed
percent encoding, repeated decoded names, and query plus explicit payload throw
synchronously; structured or non-text data uses explicit payload with a
queryless topic. Validate every received payload against a real upstream
convention when one exists. NAP-INTENT and manifest conventions remain opaque,
and subscriptions/shell routing do not parse query text or introduce prefix,
wildcard, canonicalization, payload-schema, or multi-convention matching. This
non-normative guidance defers to [NAP-INC draft PR #89 at its exact
head](https://github.com/napplet/naps/blob/34ec29fc4039384a83dbd6b476f83c4fa0d038e6/naps/NAP-INC.md).

The expected generated-project validation is:

```bash
pnpm verify
pnpm test:conformance
```

Manual package/script/Vite wiring belongs only to explicit existing-app
retrofits, and should mirror the boilerplate contract.

## Install routes

No build step needed — the CLI ships the Markdown and places it for you.

```bash
napplet skills install --to claude
```

| `--to` | Destination | Layout |
| --- | --- | --- |
| `claude` | `.claude/skills/<skill>/SKILL.md` | one folder per skill |
| `claude-user` | `~/.claude/skills/<skill>/SKILL.md` | global, all projects |
| `codex` | `.codex/skills/<skill>/SKILL.md` | one folder per skill |
| `cursor` | `.cursor/rules/<skill>.mdc` | one rule file per skill |
| `windsurf` | `.windsurf/rules/<skill>.md` | one rule file per skill |
| `agents` | `AGENTS.md` | appended block (Amp, Jules, generic) |
| `gemini` | `GEMINI.md` | appended block (Gemini CLI) |
| `copilot` | `.github/copilot-instructions.md` | appended block |

`appendDoc` targets are **idempotent** — re-running replaces the managed
`<!-- @napplet/skills:start -->…<!-- @napplet/skills:end -->` block, never
duplicating it. The rest of the file is untouched.

### Custom locations

```bash
napplet skills install --dir vendor/skills        # writes <dir>/<skill>/SKILL.md
napplet skills install --out CONTRIBUTING.md      # appends the managed block
napplet skills install --to claude --symlink      # symlink instead of copy
napplet skills install --to codex                 # writes .codex/skills
napplet skills install make-napplet --to agents   # one-prompt workflow only
napplet skills print build-napplet > skill.md     # raw markdown to stdout
```

Install a single skill by naming it:

```bash
napplet skills install build-napplet --to gemini
```

## CLI

```
napplet skills list                       List shipped skills
napplet skills print [skill]              Print SKILL.md to stdout (all, or one)
napplet skills install [skill] [options]  Install into an agent location
```

## Programmatic API

```ts
import { listSkills, readSkill, install } from '@napplet/skills';

listSkills();                      // [{ name, description, path }, …]
readSkill('build-napplet');        // full SKILL.md source
install({ to: 'claude' });         // → InstallResult[]
install({ to: 'codex' });          // → InstallResult[]
install({ dir: 'vendor/skills' }); // custom skillDir
```

## License

MIT
