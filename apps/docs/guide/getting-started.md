# Getting started

This page walks you from zero to a deployable napplet. The standalone `napplet`
CLI does not require Deno. You will need Node.js 20+ and a package manager for
the generated Vite project and the package-backed create/skills commands. To
actually *run* a napplet you also need a host shell — see
[running in a shell](#running-in-a-shell) at the end.

## 1. Install the CLI

```bash
# macOS or Linux
curl -fsSL https://raw.githubusercontent.com/napplet/web/main/scripts/install-napplet-cli.sh | sh
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/napplet/web/main/scripts/install-napplet-cli.ps1 | iex
```

Each installer downloads the platform binary and verifies it against the
release's `SHA256SUMS` before replacing `napplet`. The
[`@napplet/cli`](/packages/cli) page documents the JSR/Deno alternative.

## 2. Create the project

```bash
napplet create my-napplet
cd my-napplet
```

`napplet create` delegates to the maintained
[`github.com/napplet/boilerplate`](https://github.com/napplet/boilerplate)
template. The generator creates the project and derives only its package name;
it does not own deployment name, title, or archetype metadata.

## 3. Initialize deployment metadata

```bash
napplet init
```

The wizard writes `.napplet/config.json` with the named-manifest d-tag, title,
optional description, canonical `slug:NAP-N` archetype contracts, relays, and
Blossom servers. Automation can provide the same values explicitly:

```bash
napplet init --name my-napplet --title "My Napplet" \
  --archetype note:NAP-4 \
  --relay wss://relay.example --server https://blossom.example
```

## 4. Install agent skills

```bash
napplet skills install --to codex
```

Replace `codex` with `claude`, `cursor`, `windsurf`, `agents`, `gemini`, or
`copilot`. The CLI installs the shipped protocol-aware build skills into the
location that agent reads.

## 5. Build and verify

```bash
pnpm install
# Ask your agent to build the napplet.
pnpm verify
pnpm test:conformance
```

## 6. Preview, then deploy

```bash
napplet deploy --dry-run
napplet deploy
```

The dry run resolves the same config, files, metadata, and manifest events
without uploading or publishing. Configure a local or remote signer before the
live deploy; see [`@napplet/cli`](/packages/cli#deploy).

Choose the Note Drafts path that matches how you want to learn:

- [Build a Note Drafts napplet from scratch](./build-note-drafts-napplet) hand-wires
  every file so you can see the runtime boundary one piece at a time.
- [Build a Note Drafts napplet from boilerplate](./build-note-drafts-napplet-from-boilerplate)
  starts from the generator, preserves its project substrate, and replaces the
  starter demo with the same note composer.
- [Build a Note Drafts napplet with an AI Agent and @napplet.skills](./build-note-drafts-napplet-with-ai-agent-and-skills)
  shows the prompt, review loop, and verification commands for agent-assisted
  authoring.

All three create a small Nostr note composer that autosaves through `storage`,
reads the shell-user pubkey through `identity`, publishes through `outbox`, and
runs in Kehto/Paja.

## Retrofit an existing app manually

For a new napplet, prefer the generator above. It owns the package manager pin,
Vite config, single-file build plumbing, scripts, conformance wiring, and starter
layout. Use manual wiring only when you are adding napplet support to an existing
app.

Install the napplet-side SDK:

```bash
npm install @napplet/sdk
```

And the build-time Vite plugin as a dev dependency, which generates the NIP-5A
manifest and injects the discovery meta tags:

```bash
npm install -D @napplet/vite-plugin
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [nip5aManifest({ nappletType: 'my-napplet', artifactMode: 'single-file' })],
});
```

Mirror the boilerplate scripts so verification stays consistent:

```jsonc
{
  "scripts": {
    "build": "vite build",
    "type-check": "tsc --noEmit",
    "verify": "npm run type-check && npm run build",
    "test:conformance": "npm run build && napplet-conformance ./dist"
  }
}
```

## Build your first napplet

NIP-5D runtimes inject `window.napplet` before your code runs. Napplet code can
use the injected namespace directly:

```ts
// main.ts
// Read kind 1 notes through the shell's outbox-aware routing
const { events } = await window.napplet.outbox.query(
  [{ kinds: [1], limit: 20 }],
  { timeoutMs: 3000 },
);
for (const result of events) console.log('Note:', result.event.content);

// Subscribe to live updates through the same outbox boundary
const sub = window.napplet.outbox.subscribe([{ kinds: [1], limit: 20 }], {
  timeoutMs: 3000,
});
sub.on('event', (result) => console.log('New note:', result.event.content));

// Publish a note — the shell signs and fans it out; your napplet never sees the key
const published = await window.napplet.outbox.publish({
  kind: 1,
  content: 'Hello from my napplet!',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});
if (!published.ok) throw new Error(published.error ?? 'publish failed');
```

Notice you never imported a signing library and never touched a relay socket. The
runtime sends `outbox.query`, `outbox.subscribe`, and `outbox.publish` JSON
envelopes; the shell does relay discovery, signing, fanout, and policy.

## Runtime injection vs. SDK

Runtimes and napplets use different packages.

| | [`@napplet/shim`](/packages/shim) | [`@napplet/sdk`](/packages/sdk) |
| --- | --- | --- |
| **Import style** | `import { installNappletGlobal } from '@napplet/shim'` | `import { outbox, inc } from '@napplet/sdk'` |
| **Who uses it** | Host runtime before napplet scripts execute | Napplet application code |
| **What it does** | Injects selected `window.napplet.<domain>` objects | Named, typed exports that wrap injected domains |
| **Required?** | Required for runtimes that use these packages | Optional convenience for bundler users |

The **sdk** is an ergonomic, typed wrapper. Its methods delegate to
`window.napplet.*` at call time and throw a clear error if the runtime did not
inject the namespace or requested domain.

Typical napplet code imports only the SDK:

```ts
import { outbox, inc, storage } from '@napplet/sdk';
```

If you're writing a vanilla napplet with no build step, you can skip the sdk and
use the injected `window.napplet.*` namespace directly.

## Running in a shell

A napplet only does something when hosted by a compatible **shell** — the trusted
runtime that owns keys, relays, and storage and proxies your requests. The
reference runtime is **Kehto**.

::: tip
The reference shell/runtime is **Kehto**:
[github.com/kehto/web](https://github.com/kehto/web).
You can also find napplet projects under the
[github.com/napplet](https://github.com/napplet) organization.
For questions and coordination, join the
[community group chat](https://armada.buzz/invite/naddr1qvzqqqyzz5pzpjk98hj7z978r9xc9d2ymagw6tga0lx0s06y8lhpy9twc2kp8uwdqqqqpwqpw5#BAACAwTDEKKhS9_iA_qOc1n4ljVt).
:::

Next, read [Core concepts](./concepts) to understand the envelope, NAPs, the
sandbox model, identity, and storage scoping.
