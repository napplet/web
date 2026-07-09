# @napplet/skills

> Agent skills that let a coding agent make, design, build, port, and test a [napplet](https://github.com/napplet/napplet) end-to-end — plus a `napplet-skills` installer that drops them into whatever location your agent reads.

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
| `make-napplet` | One-prompt end-to-end builds | Orchestrates port/design/build/test, keeps social reads/publishes OUTBOX-first, blocks fake package surfaces, covers every implemented package NAP domain, and defines the final completion checklist. |
| `design-napplet` | First — plan before code | Sandbox/loading constraints, OUTBOX-first NAP selection, package-implemented NAP inventory, hard-vs-optional requirements, **responsive layout for any viewport** (full-screen → tiny widget), the build spec to hand off. |
| `build-napplet` | Implementation | Start from `@napplet/boilerplate`, preserve its Vite/package/script/conformance substrate, then implement calls through `@napplet/sdk` helpers while using runtime-injected `window.napplet?.domain` only for optional-domain fallback checks, OUTBOX-first event access, relay as an explicit low-level escape hatch, all implemented package domains (`relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`, `config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`, `link`, `count`, `lists`, `serial`, `common`, `dm`), no `shell.ready()` / `shell.supports(...)` API, hard-vs-optional `requires`, and the single-file artifact rule. |
| `port-nostr-app` | Migrating an existing Nostr app | Replace direct relay pools, `window.nostr`, local storage, direct fetch/media loads, app-owned shortcut plumbing, and app-owned signing/routing with shell-owned NAP boundaries and SDK helper imports before building. |
| `test-napplet` | Before publishing | Protocol conformance via `napplet-conformance` (real Chromium + reference shell), forbidden browser-authority scans, interpreting failures, the runtime guard, CI wiring. |

Each skill is a self-contained `SKILL.md` with YAML frontmatter (`name`,
`description`) — the format Claude Code, Cursor, and most agents consume.

## Scaffolding substrate

For new napplet projects, `build-napplet` and the top-level `make-napplet`
workflow treat [`@napplet/boilerplate`](../boilerplate) as authoritative. Agents
should scaffold with the generator, keep its package manager pin, Vite config,
scripts, file layout, README/docs structure, and conformance wiring, then edit
only project-specific surfaces such as `nappletType`, `requires`, config schema,
`src/main.ts`, `src/styles.css`, title/root markup, and README content.

Current package guidance is SDK-first. Napplet code should use `@napplet/sdk`
wrappers for domain calls, use `window.napplet?.domain` only for optional
fallback checks after runtime injection, and keep optional enhancements such as
shell-managed key reservation out of `requires` unless the napplet cannot
function without them.

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
# one-off, no install:
npx @napplet/skills install --to claude
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
napplet-skills install --dir vendor/skills        # writes <dir>/<skill>/SKILL.md
napplet-skills install --out CONTRIBUTING.md       # appends the managed block
napplet-skills install --to claude --symlink       # symlink instead of copy
napplet-skills install --to codex                  # writes .codex/skills
napplet-skills install make-napplet --to agents    # one-prompt workflow only
napplet-skills print build-napplet > skill.md      # raw markdown to stdout
```

Install a single skill by naming it:

```bash
napplet-skills install build-napplet --to gemini
```

## CLI

```
napplet-skills list                       List shipped skills
napplet-skills print [skill]              Print SKILL.md to stdout (all, or one)
napplet-skills install [skill] [options]  Install into an agent location
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
