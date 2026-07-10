# Tutorial: build a Note Drafts napplet with an AI Agent and @napplet.skills

This tutorial builds the Note Drafts napplet with a coding agent instead of
typing every file yourself. It uses `@napplet/skills`, the packaged authoring
guidance that teaches agents the current napplet package surface, the
boilerplate-first project shape, the sandbox boundary, and the verification
checklist.

Use this path when you want the agent to do the implementation work, while you
keep control of scope, review, and release evidence.

Protocol references the agent must defer to:

- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), the proposed web
  projection: sandboxed iframe, `postMessage` envelope, and runtime-injected
  domains
- [NIP-5A](https://github.com/nostr-protocol/nips/blob/master/5A.md), the
  manifest and aggregate-hash model
- [NAPs](https://github.com/napplet/naps), the capability-domain specs for
  `identity`, `storage`, and `outbox`

## 1. Start with an empty working directory

Create a parent directory for the agent run:

```bash
mkdir note-drafts-agent-run
cd note-drafts-agent-run
```

The agent can scaffold the project itself, but an empty parent directory keeps
the run easy to review and delete if the first attempt goes wrong.

## 2. Install the napplet skills for your agent

`@napplet/skills` can install the guidance into several agent surfaces. Pick the
target your tool reads:

```bash
npx @napplet/skills install make-napplet --to agents
```

Common targets:

```bash
npx @napplet/skills install make-napplet --to claude
npx @napplet/skills install make-napplet --to cursor
npx @napplet/skills install make-napplet --to gemini
npx @napplet/skills install make-napplet --to copilot
```

If your agent supports local skills directly, install the full set instead:

```bash
npx @napplet/skills install --to agents
```

What this teaches: the skill file is not a protocol spec. It is a build guide
that tells the agent to check NIP-5D and NAPs, scaffold from
`@napplet/boilerplate`, use shipped `@napplet/*` package exports, and stop
instead of inventing missing protocol surface.

## 3. Give the agent a constrained build prompt

Paste a prompt like this into your coding agent:

```text
Build a Note Drafts napplet in this directory.

Use the installed napplet make-napplet/build-napplet/test-napplet guidance.
Scaffold from @napplet/boilerplate first, then edit only the generated project.

Goal:
- App title: Note Drafts
- package name: note-drafts
- nappletType: notedrafts
- User flow: write one short kind 1 Nostr note, autosave the draft, publish through the shell.

Required NAP domains:
- identity: read the shell-user pubkey and listen for changes
- storage: autosave and clear the draft under shell-managed storage
- outbox: publish the note with shell signing and fanout

Hard boundaries:
- No window.nostr
- No private keys or app-owned signing
- No direct relay sockets, WebSocket, fetch, EventSource, or relay pools
- No localStorage/sessionStorage/IndexedDB/cookies
- No invented shell.ready(), shell.supports(...), discoverServices, or generic capability probing
- Do not add domains to requires unless this app directly calls them

Expected files:
- package.json with boilerplate scripts preserved
- vite.config.ts with nappletType notedrafts and requires identity/storage/outbox
- index.html title/root for Note Drafts
- src/main.ts implemented with @napplet/sdk identity, storage, and outbox helpers
- src/styles.css for responsive app layout
- README.md explaining the app boundary and verification

Verification before completion:
- pnpm install
- pnpm type-check
- pnpm build
- pnpm test:conformance
- grep built dist/index.html for napplet-type and napplet-requires metadata
- scan src/main.ts for forbidden surfaces listed above

Report the changed files and exact command evidence. If a needed API is missing
from the current packages/specs, stop and flag the gap instead of inventing it.
```

The important part is the hard boundary list. It gives the agent a concrete
review target and prevents a plausible-looking Nostr app from bypassing the
shell.

## 4. Review the agent's first diff

Before running the app, inspect the files the agent changed:

```bash
git status --short
git diff -- package.json vite.config.ts index.html src/main.ts src/styles.css README.md
```

The diff should look like this:

- `package.json` preserves the generated scripts and uses current
  `@napplet/sdk`, `@napplet/vite-plugin`, and `@napplet/conformance-cli`
  versions.
- `vite.config.ts` declares `nappletType: 'notedrafts'` and
  `requires: ['identity', 'storage', 'outbox']`.
- `src/main.ts` imports `identity`, `storage`, and `outbox` from
  `@napplet/sdk`.
- Draft persistence goes through `storage.instance`.
- Publishing goes through `outbox.publish` with an unsigned kind `1` event
  template.
- The code checks for absent hard domains only to show user-facing errors; it
  does not invent a shell discovery API.

Run a quick forbidden-surface scan:

```bash
rg "window\\.nostr|localStorage|sessionStorage|indexedDB|fetch\\(|WebSocket|EventSource|shell\\.ready|shell\\.supports|discoverServices" src
```

No matches is the expected result. If there are matches, ask the agent to repair
them before continuing.

## 5. Use a repair prompt when needed

If the first pass keeps starter-demo code or broad requirements, use a focused
repair prompt:

```text
Repair the Note Drafts napplet boundary.

Remove any unused starter-demo domains and any calls to shell.ready(),
shell.supports(...), window.nostr, localStorage, direct relay sockets, fetch, or
app-owned signing. The app may use only @napplet/sdk identity, storage, and
outbox helpers.

Keep the boilerplate build/conformance scripts intact. Update vite.config.ts so
requires is exactly identity, storage, and outbox. Then rerun pnpm type-check,
pnpm build, and pnpm test:conformance.
```

Keep repair prompts narrow. Do not ask the agent to redesign the whole app after
you already have a working structure.

## 6. Verify the artifact, not just the source

Run the same checks you would run by hand:

```bash
pnpm install
pnpm type-check
pnpm build
pnpm test:conformance
```

Then inspect the built metadata:

```bash
grep -n "napplet-type\\|napplet-requires" dist/index.html
```

Expected metadata:

```html
<meta name="napplet-type" content="notedrafts">
<meta name="napplet-requires" content="identity,outbox,storage">
```

The metadata check matters because the shell loads the built artifact. A source
file can look correct while the generated `dist/index.html` still carries stale
manifest fields.

## 7. Run a shell smoke test

Use the shell/runtime you target for local testing. In Paja or another compatible
runtime:

1. Load the built or dev Note Drafts napplet through the shell, not as a raw Vite
   page.
2. Confirm identity renders as a short pubkey or signed-out state.
3. Type a draft and reload the iframe; the draft should restore through
   `storage`.
4. Publish a note; the shell should own signing and relay fanout.
5. Disable `storage` or `outbox` and reload; the UI should show a clear status
   message.

Do not treat a raw browser preview as proof. The app only proves the napplet
boundary when a shell injects the required NAP domains.

## 8. Ask the agent for a completion report

Use one final prompt:

```text
Summarize the Note Drafts napplet build.

Include:
- changed files
- NAP domains used and why
- forbidden surfaces scanned
- commands that passed with exact output summaries
- any manual shell smoke evidence
- any untested gaps
```

The useful output is not "done"; it is evidence. Keep the report with the
project or PR so future edits can tell which claims were verified.

## What the skills are buying you

The skills do not make the agent authoritative. They make the default path
better:

- Start from `@napplet/boilerplate` instead of recreating build plumbing.
- Use current shipped `@napplet/sdk` helpers instead of imagined APIs.
- Prefer `outbox` for social reads/publishes instead of direct relay ownership.
- Keep browser storage, direct network, private keys, and external runtime
  assets out of napplet code.
- Run conformance before claiming completion.

You still review the diff, run the checks, and compare any protocol-facing claim
against the living NIP-5D and NAP documents.
