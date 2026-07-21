---
name: build-napplet
description: Use when building a napplet app from a CLI-created project. Treat .napplet/napplet.json as the source of truth for metadata, class, connect origins, build, and deploy settings.
---

# Build Napplet

## Flow

1. Start from a project created with `napplet init`.
2. Inspect `.napplet/napplet.json` before editing app code.
3. Build behavior in `src/`.
4. Keep `import '@napplet/shim';` in the app entry point exactly once.
5. Use `@napplet/sdk` for typed napplet runtime calls.
6. Run `napplet doctor` when setup looks suspicious or after adapting an existing Vite app.
7. Run `napplet build` before handing work back.
8. Use `napplet deploy` only after `.napplet/napplet.json` has a real `deploy.command`.

The CLI owns the boilerplate and napplet metadata. Do not ask the developer to hand-wire title, package name, NIP-5A type, security class, connect origins, or deployment settings in generated code.

## Source Of Truth

`.napplet/napplet.json` owns:

- `name`
- `title`
- `type`
- `class`
- `connect`
- `build.command`
- `build.outputDir`
- `deploy.provider`
- `deploy.command`
- `deploy.relays`

The generated `vite.config.ts` reads this file and passes `type` / `connect` into `@napplet/vite-plugin`. Change `.napplet/napplet.json` when metadata changes.

## App Entry

Use this pattern:

```ts
import '@napplet/shim';
import { relay, storage, ifc, resource, config, identity } from '@napplet/sdk';
import napplet from '../.napplet/napplet.json';
```

`@napplet/shim` is side-effect-only. Do not import named runtime helpers from it.

## Relay

```ts
import { relay } from '@napplet/sdk';

const sub = relay.subscribe(
  { kinds: [1], limit: 20 },
  (event) => {
    console.log('note', event.content);
  },
  () => {
    console.log('caught up');
  },
);

const signed = await relay.publish({
  kind: 1,
  content: 'Hello from my napplet',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
});

sub.close();
```

The napplet never holds private keys. The shell signs through the relay NAP.

## Storage

```ts
import { storage } from '@napplet/sdk';

await storage.setItem('theme', 'dark');
const theme = await storage.getItem('theme');
await storage.removeItem('theme');
```

Do not use `localStorage`; opaque-origin iframes can throw `SecurityError`, and shell-scoped storage is the protocol surface.

## Inter-Frame Communication

```ts
import { ifc } from '@napplet/sdk';

ifc.emit('profile:open', [], JSON.stringify({ pubkey }));
const sub = ifc.on('profile:open', (payload) => {
  console.log(payload);
});
sub.close();
```

## External Bytes

Prefer the resource NAP for remote images and other bytes:

```ts
import { resource } from '@napplet/sdk';

const blob = await resource.bytes('https://example.com/avatar.png');
const url = URL.createObjectURL(blob);
img.src = url;
```

Do not call `fetch()`, `XMLHttpRequest`, `new WebSocket()`, or use external `<img src>` URLs by default. The sandbox and shell CSP block direct egress for class-1 napplets.

## Direct Network Access

If direct network access is required:

1. Add origins to `.napplet/napplet.json` `connect`.
2. Handle denied grants at runtime.
3. Use `connectGranted()` and `connectOrigins()` from `@napplet/sdk`.

```ts
import { connectGranted, connectOrigins } from '@napplet/sdk';

if (connectGranted()) {
  const [origin] = connectOrigins();
  const response = await fetch(`${origin}/items`);
}
```

Do not silently fall back to undeclared origins.

## Identity And Decrypt

Use `identity` from `@napplet/sdk`. Do not call `window.nostr` from a napplet.

```ts
import { identity } from '@napplet/sdk';

const pubkey = await identity.getPublicKey();
const { rumor, sender } = await identity.decrypt(giftWrapEvent);
```

`identity.decrypt()` is shell-enforced and class-gated. If the napplet is not eligible, handle the returned error rather than bypassing the shell.

## Build And Deploy

```bash
napplet doctor
napplet build
napplet deploy
```

`napplet deploy` builds first. If `.napplet/napplet.json` has no `deploy.command`, the CLI fails after the build and asks for a provider command. That is intentional: a local build is not a published napplet.
