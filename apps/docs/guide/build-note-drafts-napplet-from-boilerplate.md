# Tutorial: build a Note Drafts napplet from boilerplate

This tutorial builds the same Note Drafts app as the
[from-scratch tutorial](./build-note-drafts-napplet), but starts from
`@napplet/boilerplate` instead of an empty directory.

Use this path when you want the generator to own the project substrate:
package-manager pin, Vite + TypeScript config, single-file build plumbing,
conformance scripts, starter docs, and local agent guidance. You still replace
the starter demo with a focused app that uses only the domains it needs:
`identity`, `storage`, and `outbox`.

Protocol references used here:

- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), the proposed web
  projection: sandboxed iframe, `postMessage` envelope, and runtime-injected
  domains
- [NIP-5A](https://github.com/nostr-protocol/nips/blob/master/5A.md), the
  manifest and aggregate-hash model
- [NAPs](https://github.com/napplet/naps), the capability-domain specs for
  `identity`, `storage`, and `outbox`

## 1. Scaffold the starter

Run the generator with explicit values so the tutorial is repeatable:

```bash
npx @napplet/boilerplate ./note-drafts \
  --package-name note-drafts \
  --napplet-type notedrafts \
  --title "Note Drafts" \
  --yes
cd note-drafts
pnpm install
```

The generated repository includes broad starter examples and context docs. For
this tutorial, treat them as a substrate, not as app requirements. The Note
Drafts app does not need direct relay queries, notifications, config settings,
resource loading, or a napplet-side shell probe.

## 2. Tighten package metadata

Keep the generated scripts, but prune the dependencies to the app's actual
surface. The napplet app imports `@napplet/sdk`; the shell/runtime injects
`window.napplet` before the app runs.

```jsonc
{
  "name": "note-drafts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1",
    "type-check": "tsc --noEmit",
    "verify": "pnpm type-check && pnpm build",
    "test:conformance": "pnpm build && napplet-conformance ./dist",
    "test:conformance:ui": "napplet-conformance --ui . --exec \"vite build --watch\""
  },
  "dependencies": {
    "@napplet/sdk": "^0.24.4"
  },
  "devDependencies": {
    "@napplet/conformance-cli": "^0.2.15",
    "@napplet/vite-plugin": "^0.11.2",
    "typescript": "^5.9.3",
    "vite": "^6.4.3",
    "vite-plugin-singlefile": "^2.3.3"
  },
  "packageManager": "pnpm@10.8.0",
  "license": "MIT"
}
```

Then update the install:

```bash
pnpm install
```

What this teaches: the boilerplate gives you a valid project shape; the app
still declares only the packages and NAP domains it actually uses.

## 3. Configure the manifest for Note Drafts

Open `vite.config.ts`. Keep the generated single-file plugin and manifest plugin
shape, but change the project-specific fields:

```ts
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  plugins: [
    viteSingleFile(),
    nip5aManifest({
      nappletType: 'notedrafts',
      title: 'Note Drafts',
      description: 'Draft and publish short Nostr notes from a sandboxed napplet.',
      requires: ['identity', 'storage', 'outbox'],
    }),
  ],
});
```

The `requires` list is deliberately short:

- `identity`: read the shell-user pubkey.
- `storage`: autosave the draft under shell-managed storage scoping.
- `outbox`: ask the shell to sign and publish a kind `1` note.

Do not keep domains from the starter demo unless the app still calls them.

## 4. Keep the HTML entry small

The starter already has `index.html`. Make sure its title and root element match
the app:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Note Drafts</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

The production build still becomes one self-contained `dist/index.html`; the
source HTML keeps the Vite module entry during development.

## 5. Replace the starter app

Replace `src/main.ts` with the status-first Note Drafts app:

```ts
import { identity, outbox, storage } from '@napplet/sdk';
import './styles.css';

type RequiredDomain = 'identity' | 'storage' | 'outbox';
type NappletWindow = Window & {
  napplet?: Partial<Record<RequiredDomain, unknown>>;
};

const draftKey = 'note-draft:v1';
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app container');
}

app.innerHTML = `
  <main class="shell">
    <section class="masthead">
      <p class="eyebrow">Napplet tutorial</p>
      <h1>Note Drafts</h1>
      <p class="lede">Autosave a short note, then ask the shell to sign and publish it.</p>
    </section>

    <section class="status-grid" aria-label="Runtime status">
      <div>
        <span class="label">Runtime user</span>
        <strong id="pubkey">Checking identity...</strong>
      </div>
      <div>
        <span class="label">Draft</span>
        <strong id="draft-status">Not loaded yet</strong>
      </div>
      <div>
        <span class="label">Publish</span>
        <strong id="publish-status">Idle</strong>
      </div>
    </section>

    <form id="composer" class="composer">
      <label for="note">Note content</label>
      <textarea id="note" name="note" rows="8" maxlength="280" placeholder="Write a short Nostr note..."></textarea>
      <div class="actions">
        <span id="count">0 / 280</span>
        <button id="publish" type="submit">Publish note</button>
      </div>
    </form>
  </main>
`;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

const pubkey = requireElement<HTMLElement>('#pubkey');
const draftStatus = requireElement<HTMLElement>('#draft-status');
const publishStatus = requireElement<HTMLElement>('#publish-status');
const form = requireElement<HTMLFormElement>('#composer');
const note = requireElement<HTMLTextAreaElement>('#note');
const count = requireElement<HTMLElement>('#count');
const publishButton = requireElement<HTMLButtonElement>('#publish');

function hasDomain(domain: RequiredDomain): boolean {
  return Boolean((window as NappletWindow).napplet?.[domain]);
}

function shortKey(value: string): string {
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value;
}

function updateCount(): void {
  count.textContent = `${note.value.length} / ${note.maxLength}`;
}

function setBusy(busy: boolean): void {
  publishButton.disabled = busy;
  publishButton.textContent = busy ? 'Publishing...' : 'Publish note';
}

async function loadIdentity(): Promise<void> {
  if (!hasDomain('identity')) {
    pubkey.textContent = 'identity unavailable';
    return;
  }

  const current = await identity.getPublicKey();
  pubkey.textContent = current ? shortKey(current) : 'signed out';

  const subscription = identity.onChanged((next) => {
    pubkey.textContent = next ? shortKey(next) : 'signed out';
  });

  window.addEventListener('pagehide', () => subscription.close(), { once: true });
}

async function loadDraft(): Promise<void> {
  if (!hasDomain('storage')) {
    draftStatus.textContent = 'storage unavailable';
    return;
  }

  const saved = await storage.instance.getItem(draftKey);
  if (saved) {
    note.value = saved;
    updateCount();
    draftStatus.textContent = 'restored from shell storage';
  } else {
    draftStatus.textContent = 'empty';
  }
}

let saveTimer: number | undefined;

function queueDraftSave(): void {
  updateCount();

  if (!hasDomain('storage')) {
    draftStatus.textContent = 'storage unavailable';
    return;
  }

  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    void storage.instance
      .setItem(draftKey, note.value)
      .then(() => {
        draftStatus.textContent = note.value ? 'saved' : 'empty';
      })
      .catch((error: unknown) => {
        draftStatus.textContent = error instanceof Error ? error.message : 'save failed';
      });
  }, 250);
}

async function publishNote(): Promise<void> {
  const content = note.value.trim();

  if (!content) {
    publishStatus.textContent = 'Write something first';
    return;
  }

  if (!hasDomain('outbox')) {
    publishStatus.textContent = 'outbox unavailable';
    return;
  }

  setBusy(true);
  publishStatus.textContent = 'Waiting for shell confirmation...';

  try {
    const result = await outbox.publish(
      {
        kind: 1,
        content,
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      },
      { toOutbox: true },
    );

    if (!result.ok) {
      throw new Error(result.error ?? 'publish failed');
    }

    note.value = '';
    updateCount();

    if (hasDomain('storage')) {
      await storage.instance.removeItem(draftKey);
      draftStatus.textContent = 'cleared after publish';
    }

    publishStatus.textContent = `published ${shortKey(result.eventId ?? result.event?.id ?? '')}`;
  } catch (error) {
    publishStatus.textContent = error instanceof Error ? error.message : 'publish failed';
  } finally {
    setBusy(false);
  }
}

note.addEventListener('input', queueDraftSave);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  void publishNote();
});

updateCount();
void loadIdentity().catch((error: unknown) => {
  pubkey.textContent = error instanceof Error ? error.message : 'identity failed';
});
void loadDraft().catch((error: unknown) => {
  draftStatus.textContent = error instanceof Error ? error.message : 'draft load failed';
});
```

What changed from the broad starter:

- No napplet-side `@napplet/shim` import.
- No shell capability-probing namespace.
- No direct relay read path.
- No app-owned persistence.
- No signing or relay fanout code.

## 6. Replace the styles

Replace `src/styles.css` with compact app styles:

```css
:root {
  color: #f7f4ef;
  background: #17181c;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgb(25 92 124 / 42%), transparent 30rem),
    linear-gradient(135deg, #17181c 0%, #22262d 52%, #1d2d2c 100%);
}

button,
textarea {
  font: inherit;
}

.shell {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 32px;
}

.eyebrow,
.label {
  color: #9fd4c9;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 6px 0;
  font-size: clamp(2rem, 7vw, 4.5rem);
  line-height: 0.95;
}

.lede {
  max-width: 36rem;
  margin: 0 0 24px;
  color: #d6d0c5;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 18px;
}

.status-grid > div {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 8px;
  background: rgb(255 255 255 / 8%);
}

.status-grid strong {
  display: block;
  margin-top: 6px;
  overflow-wrap: anywhere;
}

.composer {
  display: grid;
  gap: 12px;
}

label {
  font-weight: 700;
}

textarea {
  width: 100%;
  min-height: 220px;
  resize: vertical;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 8px;
  padding: 16px;
  color: #f7f4ef;
  background: rgb(0 0 0 / 34%);
}

textarea:focus {
  outline: 2px solid #9fd4c9;
  outline-offset: 2px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

#count {
  color: #d6d0c5;
}

button {
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  padding: 0 18px;
  color: #17211f;
  background: #9fd4c9;
  font-weight: 800;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.64;
}

@media (max-width: 680px) {
  .shell {
    padding: 20px;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    align-items: stretch;
    flex-direction: column;
  }
}
```

## 7. Update the project docs

Replace the generated README's feature list with the app boundary:

```md
# Note Drafts

A small NIP-5D napplet for drafting and publishing kind `1` Nostr notes.

The app uses:

- `identity` to show the shell-user pubkey.
- `storage` to autosave one draft under shell-managed storage scoping.
- `outbox` to ask the shell to sign and publish.

It does not access private keys, `window.nostr`, browser storage, relay sockets,
or direct network APIs.
```

Keep the generated `docs/` context files. They are useful reminders for future
edits, but the canonical protocol source remains the living NIP-5D and NAP text
linked from those docs.

## 8. Verify the generated-project path

Run the checks the boilerplate already provides:

```bash
pnpm type-check
pnpm build
pnpm test:conformance
```

Inspect the emitted metadata:

```bash
grep -n "napplet-type\\|napplet-requires" dist/index.html
```

Expected metadata:

```html
<meta name="napplet-type" content="notedrafts">
<meta name="napplet-requires" content="identity,outbox,storage">
```

Open the app in your target shell or Paja runtime and verify:

1. The runtime user status changes from "Checking identity..." to a pubkey or
   "signed out".
2. A typed draft survives iframe reload.
3. Publishing asks the shell to sign and fan out the note.
4. Disabling `storage` or `outbox` shows a status message instead of crashing.

That proves the boilerplate substrate stayed intact while the app boundary
became a focused Note Drafts napplet.
