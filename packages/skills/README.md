# @napplet/skills

> Agent skills that let a coding agent make, design, build, port, and test a [napplet](https://github.com/napplet/napplet) end-to-end — plus a `napplet-skills` installer that drops them into whatever location your agent reads.

A **napplet** is a sandboxed Nostr iframe app (NIP-5D). These skills carry the
exact, verified API surface and protocol constraints an agent needs so that one
well-scoped prompt produces a working, conformant napplet.

- **npm:** [`@napplet/skills`](https://www.npmjs.com/package/@napplet/skills)
- **JSR:** [`@napplet/skills`](https://jsr.io/@napplet/skills)

## The skills

| Skill | When | Covers |
| --- | --- | --- |
| `make-napplet` | One-prompt end-to-end builds | Orchestrates port/design/build/test, keeps social reads/publishes OUTBOX-first, blocks fake package surfaces, covers every implemented package NAP domain, and defines the final completion checklist. |
| `design-napplet` | First — plan before code | Sandbox/loading constraints, OUTBOX-first NAP selection, package-implemented NAP inventory, hard-vs-optional requirements, **responsive layout for any viewport** (full-screen → tiny widget), the build spec to hand off. |
| `build-napplet` | Implementation | runtime-injected `window.napplet` + `@napplet/sdk`, the Vite manifest plugin, OUTBOX-first event access, relay as an explicit low-level escape hatch, all implemented package domains (`relay`, `identity`, `storage`, `inc`, `theme`, `keys`, `media`, `notify`, `config`, `resource`, `cvm`, `outbox`, `upload`, `intent`, `ble`, `webrtc`, `link`, `count`, `lists`, `serial`, `common`, `dm`), capability gating via domain presence, the single-file artifact rule. |
| `port-nostr-app` | Migrating an existing Nostr app | Replace direct relay pools, `window.nostr`, local storage, direct fetch/media loads, app-owned shortcut plumbing, and app-owned signing/routing with shell-owned NAP boundaries before building. |
| `test-napplet` | Before publishing | Protocol conformance via `napplet-conformance` (real Chromium + reference shell), interpreting failures, the runtime guard, CI wiring. |

Each skill is a self-contained `SKILL.md` with YAML frontmatter (`name`,
`description`) — the format Claude Code, Cursor, and most agents consume.

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
