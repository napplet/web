# Tutorial: build a Note Drafts napplet with an AI Agent and @napplet/skills

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
- [NAP-INC at PR #89's pinned head](https://github.com/napplet/naps/blob/34ec29fc4039384a83dbd6b476f83c4fa0d038e6/naps/NAP-INC.md), the narrow
  convention-URI rule for `emit`

## 1. Create and initialize the project

Start from the maintained scaffold and record deployment metadata before the
agent edits application code:

```bash
napplet create note-drafts
cd note-drafts
napplet init --name notedrafts --title "Note Drafts" \
  --description "Draft and publish short Nostr notes from a sandboxed napplet." \
  --archetype note:napplet:note/open
```

## 2. Install the napplet skills for your agent

`@napplet/skills` can install the guidance into several agent surfaces. Pick the
target your tool reads:

```bash
napplet skills install make-napplet --to agents
```

Common targets:

```bash
napplet skills install make-napplet --to claude
napplet skills install make-napplet --to cursor
napplet skills install make-napplet --to gemini
napplet skills install make-napplet --to copilot
```

If your agent supports local skills directly, install the full set instead:

```bash
napplet skills install --to agents
```

What this teaches: the skill file is not a protocol spec. It is a build guide
that tells the agent to check NIP-5D and NAPs, preserve the `napplet create`
scaffold and `napplet init` metadata, use shipped `@napplet/*` package exports,
and stop instead of inventing missing protocol surface.

Before implementation, the agent should inspect the project state and available
tools. An empty directory, a maintained boilerplate, an initialized napplet, a
boilerplate-based brownfield app, and an unrelated brownfield app require
different paths. It should also check whether `napplet` and Kehto/Paja are
installed rather than assuming either binary exists.

The CLI deploys `note:napplet:note/open` as the tested three-element manifest
tag `['archetype', 'note', 'napplet:note/open']`. That convention is opaque; it
does not give the agent a payload schema to invent. If a feature needs INC, the
agent may provide a queried convention URI only to `emit(topic, payload?)`.
The runtime transposes it to the stable queryless topic with a shallow decoded
text payload before exact routing; subscriptions use that stable topic. NAP-INTENT
and manifest convention values remain opaque, as described by the pinned
NAP-INC draft above.

## 3. Give the agent a small product prompt

Paste a prompt like this into your coding agent:

```text
Build a Note Drafts napplet in this directory using the installed
@napplet/skills guidance.

The app should let a user write one short Nostr note, autosave the draft, and
publish it through the host shell.

The project is already scaffolded and its deployment metadata is in
.napplet/config.json. Follow the skills end to end and report the changed files
plus verification evidence.
```

This prompt is intentionally short. The installed `make-napplet` guidance is
responsible for routing the work through the `build-napplet` and `test-napplet`
skills, preserving the `napplet create` scaffold, choosing the shell-mediated
domains, preserving the generated scripts, and refusing direct browser or
signing authority.

For this app, the skills should infer:

- `identity` reads the shell-user pubkey and listens for changes.
- `storage` autosaves and clears the draft under shell-managed storage.
- `outbox` publishes the note with shell signing and fanout.
- `requires` contains only the domains the app directly calls:
  `identity`, `storage`, and `outbox`.
- If a needed API is missing from current packages or specs, the agent should
  stop and flag that package/spec gap instead of inventing a local protocol.

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
- `.napplet/config.json` still owns `notedrafts`, title, description, and the
  opaque `note:napplet:note/open` archetype convention.
- `vite.config.ts` declares `requires: ['identity', 'storage', 'outbox']` and
  does not become a second source of deployment metadata.
- `src/main.ts` imports `identity`, `storage`, and `outbox` from
  `@napplet/sdk`.
- Draft persistence goes through `storage.instance`.
- Publishing goes through `outbox.publish` with an unsigned kind `1` event
  template.
- The code checks for absent hard domains only to show user-facing errors; it
  does not invent a shell discovery API.

Run a quick forbidden-surface scan. You should not need to paste this list into
the first prompt; it is here so you can audit the result:

```bash
rg "window\\.nostr|localStorage|sessionStorage|indexedDB|fetch\\(|WebSocket|EventSource|shell\\.ready|shell\\.supports|discoverServices" src
```

No matches is the expected result. If there are matches, ask the agent to repair
them before continuing.

## 5. Use a repair prompt when needed

If the first pass keeps starter-demo code, broad requirements, or shell bypasses,
use a focused repair prompt:

```text
The first pass drifted from the installed napplet skills.

Re-run the make-napplet/build-napplet/test-napplet guidance, repair any boundary
or verification failures, and keep the Note Drafts product scope unchanged.
```

Keep repair prompts narrow. Do not ask the agent to redesign the whole app after
you already have a working structure. If the same boundary detail must be added
to every user prompt, treat that as a `@napplet/skills` bug and update the
relevant skill instead of growing the prompt.

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

Use the shell/runtime you target for local testing. Start the project through
Paja, not as a raw Vite page:

```bash
napplet paja -- pnpm vite --host 127.0.0.1
```

Report the URL printed by Paja. The underlying Vite URL is only an asset server
and is not a valid napplet preview. If Paja is unavailable, report that manual
runtime verification is pending instead of linking to Vite.

In Paja or another compatible runtime:

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

The visual implementation should also use NAP-THEME when available. Apply
`theme.colors.background` to `html`, `body`, and the app root, apply
`theme.colors.text` and `theme.colors.primary` to the design tokens, and update
the full surface from `themeOnChanged`. A dark component palette on a white page
is not themed; test both dark and light backgrounds.

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

- Preserve the `napplet create` scaffold and `napplet init` deployment metadata
  instead of recreating build plumbing.
- Use current shipped `@napplet/sdk` helpers instead of imagined APIs.
- Prefer `outbox` for social reads/publishes instead of direct relay ownership.
- Keep browser storage, direct network, private keys, and external runtime
  assets out of napplet code.
- Run conformance before claiming completion.

You still review the diff, run the checks, and compare any protocol-facing claim
against the living NIP-5D and NAP documents.
