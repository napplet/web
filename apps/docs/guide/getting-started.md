# Getting started

This page walks you from zero to a running napplet. You'll need a recent Node.js
and a package manager (npm, pnpm, or yarn). To actually *run* a napplet you also
need a host shell — see [running in a shell](#running-in-a-shell) at the end.

## Scaffold a napplet

The fastest start is the interactive generator. It clones the
[`github.com/napplet/boilerplate`](https://github.com/napplet/boilerplate)
template — a Vite + TypeScript starter — and wires up the package name and
napplet type for you:

```bash
npx @napplet/boilerplate
```

The generator asks where to create the napplet, which package name to use, and
which NIP-5D napplet type to write into the Vite manifest config. You can also
pass everything as flags to skip the prompts:

```bash
npx @napplet/boilerplate ./my-napplet \
  --package-name my-napplet \
  --napplet-type my-napplet \
  --yes
```

See [`@napplet/boilerplate`](/packages/boilerplate) for the full option list.

For a complete hand-written example, follow
[Build a Note Drafts napplet](./build-note-drafts-napplet). It creates a small
Nostr note composer that autosaves through `storage`, reads the shell-user
pubkey through `identity`, publishes through `outbox`, and runs in Kehto/Paja.

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
:::

Next, read [Core concepts](./concepts) to understand the envelope, NAPs, the
sandbox model, identity, and storage scoping.
