# Tutorial: build a Note Drafts napplet from scratch

This tutorial builds a small Nostr note composer that runs as a napplet in
Kehto/Paja. The app starts with a runtime check, then grows one capability at a
time:

1. Render the app frame and inspect runtime domain presence.
2. Read the current shell-user pubkey through read-only `identity`.
3. Autosave a draft through shell-scoped `storage`.
4. Publish a kind `1` note through `outbox`.

The example is intentionally a note composer because composing is common Nostr
UX, but it still teaches the napplet boundary. The napplet never sees a private
key, never opens a relay socket, never writes browser storage, and never chooses
write relays. The shell does those jobs.

Protocol references used here:

- [NIP-5D](https://github.com/nostr-protocol/nips/pull/2303), the proposed web
  projection: sandboxed iframe, `postMessage` envelope, and runtime-injected
  domains
- [NIP-5A](https://github.com/nostr-protocol/nips/blob/master/5A.md), the
  manifest and aggregate-hash model
- [NAPs](https://github.com/napplet/naps), the capability-domain specs for
  `identity`, `storage`, and `outbox`
- [NAP-INC PR #89 at `4593ce9`](https://github.com/napplet/naps/pull/89/commits/4593ce9e301ce098fd3dad64206fcd6f144fa7af),
  [governance/web PR #90 at `896c32c`](https://github.com/napplet/naps/pull/90/commits/896c32c92deee68dc4d10fc1132b62df20cccb6f),
  and [NAP-INTENT PR #91 at `a718915`](https://github.com/napplet/naps/pull/91/commits/a718915ddefa2f03a0126579601f59d8bd86f7c4),
  the exact draft heads adopted for convention URI and intent semantics

## 1. Create the project manually and initialize deployment

This is the advanced manual-wiring path. New projects should normally use
`napplet create`; this tutorial starts empty so each build file is visible, but
still uses `napplet init` as the deployment metadata authority.

```bash
mkdir note-drafts
cd note-drafts
napplet init --name notedrafts --title "Note Drafts" \
  --description "Draft and publish short Nostr notes from a sandboxed napplet." \
  --archetype note:napplet:note/open
pnpm init
pnpm add @napplet/sdk@^0.24.4
pnpm add -D @napplet/vite-plugin@^0.11.2 @napplet/conformance-cli@^0.2.15 @kehto/cli@^0.2.11 typescript@^5.9.3 vite@^6.4.3
```

Replace the generated `package.json` with this:

<!-- tutorial-file: package.json -->
```json
{
  "name": "note-drafts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "kehto paja --config kehto.dev.json -- pnpm vite --host 127.0.0.1",
    "build": "vite build",
    "type-check": "tsc --noEmit",
    "test:conformance": "pnpm build && napplet-conformance ./dist",
    "verify": "pnpm type-check && pnpm test:conformance"
  },
  "dependencies": {
    "@napplet/sdk": "^0.24.4"
  },
  "devDependencies": {
    "@kehto/cli": "^0.2.11",
    "@napplet/conformance-cli": "^0.2.15",
    "@napplet/vite-plugin": "^0.11.2",
    "typescript": "^5.9.3",
    "vite": "^6.4.3"
  }
}
```

What this teaches: napplet application code uses `@napplet/sdk`; local runtime
testing uses Kehto/Paja; conformance tests the built artifact, not source files.

This tutorial declares the queryless convention `napplet:note/open`, so its
manifest tag is `['archetype', 'note', 'napplet:note/open']`. A contract that
genuinely serves specific Nostr event kinds may append same-tag `kind:<number>`
discovery fields through object-form `eventKinds`; this app declares none. The
runtime never infers a kind or payload schema from payload content.

If the app later uses INC `emit` or intent `invoke/open`, those two bindings may
accept a queried convention URI and transpose its unique decoded pairs into a
shallow text payload before sending the stable queryless identity. Subscriptions,
manifest discovery, and handler resolution still use exact equality on the
queryless identity. Successful intent invocation means accepted delivery
responsibility; a later target `onDelivery` is separate, source-independent,
runtime-attested, and has no public INC dependency or delivery ID.

## 2. Configure TypeScript and the manifest plugin

Add strict TypeScript:

<!-- tutorial-file: tsconfig.json -->
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client"],
    "skipLibCheck": true
  },
  "include": ["src", "vite.config.ts"]
}
```

Now add `vite.config.ts`:

<!-- tutorial-file: vite.config.ts -->
```ts
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

export default defineConfig({
  build: {
    modulePreload: false,
  },
  plugins: [
    nip5aManifest({
      nappletType: 'notedrafts',
      title: 'Note Drafts',
      description: 'Draft and publish short Nostr notes from a sandboxed napplet.',
      requires: ['identity', 'storage', 'outbox'],
      artifactMode: 'single-file',
    }),
  ],
});
```

The important fields are:

- `build.modulePreload: false`: keeps Vite from injecting a preload helper that
  calls `fetch`.
- `nappletType`: the short named-site `d` tag for this napplet.
- `requires`: hard domains the shell must provide for the full app.
- `artifactMode: 'single-file'`: folds the built JS and CSS into one
  `dist/index.html`.

What this teaches: `requires` is declarative compatibility metadata. Runtime
code still checks domain presence so local toggles and smaller shells fail
gracefully.

## 3. Add the HTML entry

The source HTML is ordinary Vite HTML:

<!-- tutorial-file: index.html -->
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

Kehto/Paja will load this into a runtime iframe during development. The
production build will inline the app script and CSS into `dist/index.html`.

## 4. Start with the napplet boundary

Create `src/main.ts` with the imports, domain names, and app container:

<!-- tutorial-chunk: src/main.ts -->
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
```

This first step names the only runtime domains the app will use. There is no
relay pool, signer object, `localStorage`, or `window.nostr`.

What this teaches: a napplet is untrusted app code. It asks the runtime for
capabilities through NAP domains.

## 5. Render a status-first UI

Add the app markup and typed DOM lookups:

<!-- tutorial-chunk: src/main.ts -->
```ts
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
```

Status text comes before the feature logic on purpose. A napplet should tell the
user when a shell capability is absent instead of failing silently.

## 6. Check domain presence before calling SDK methods

Add small helpers:

<!-- tutorial-chunk: src/main.ts -->
```ts
function hasDomain(domain: RequiredDomain): boolean {
  return Boolean((window as NappletWindow).napplet?.[domain]);
}

function shortKey(value: string): string {
  return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value;
}

function setDraftStatus(message: string): void {
  draftStatus.textContent = message;
}

function setPublishStatus(message: string): void {
  publishStatus.textContent = message;
}

function updateCount(): void {
  count.textContent = `${note.value.length} / ${note.maxLength}`;
}

function setBusy(busy: boolean): void {
  publishButton.disabled = busy;
  publishButton.textContent = busy ? 'Publishing...' : 'Publish note';
}
```

The SDK methods throw clear errors if a domain is unavailable. The UI still
checks first because a good napplet can explain missing runtime support to a
person.

## 7. Read the shell-user identity

Add identity loading:

<!-- tutorial-chunk: src/main.ts -->
```ts
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
```

`identity` is read-only. It tells the napplet which shell-user is connected, but
it does not sign, encrypt, or expose keys. The app takes a startup snapshot and
then listens for shell-pushed changes.

## 8. Autosave through shell storage

Add draft loading and debounced saving:

<!-- tutorial-chunk: src/main.ts -->
```ts
async function loadDraft(): Promise<void> {
  if (!hasDomain('storage')) {
    setDraftStatus('storage unavailable');
    return;
  }

  const saved = await storage.instance.getItem(draftKey);
  if (saved) {
    note.value = saved;
    updateCount();
    setDraftStatus('restored from shell storage');
  } else {
    setDraftStatus('empty');
  }
}

let saveTimer: number | undefined;

function queueDraftSave(): void {
  updateCount();

  if (!hasDomain('storage')) {
    setDraftStatus('storage unavailable');
    return;
  }

  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    void storage.instance
      .setItem(draftKey, note.value)
      .then(() => setDraftStatus(note.value ? 'saved' : 'empty'))
      .catch((error: unknown) => setDraftStatus(error instanceof Error ? error.message : 'save failed'));
  }, 250);
}
```

This replaces browser storage. `storage.instance` is scoped by the shell to this
napplet instance, so another napplet cannot read this draft.

## 9. Publish through outbox

Add publishing:

<!-- tutorial-chunk: src/main.ts -->
```ts
async function publishNote(): Promise<void> {
  const content = note.value.trim();

  if (!content) {
    setPublishStatus('Write something first');
    return;
  }

  if (!hasDomain('outbox')) {
    setPublishStatus('outbox unavailable');
    return;
  }

  setBusy(true);
  setPublishStatus('Waiting for shell confirmation...');

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
      setDraftStatus('cleared after publish');
    }

    setPublishStatus(`published ${shortKey(result.eventId ?? result.event?.id ?? '')}`);
  } catch (error) {
    setPublishStatus(error instanceof Error ? error.message : 'publish failed');
  } finally {
    setBusy(false);
  }
}
```

The napplet supplies an unsigned event template. The shell owns signing, relay
selection, fanout, and policy. `toOutbox: true` asks the shell to include the
user's write relays.

## 10. Wire the feature together

Add the event listeners and startup calls:

<!-- tutorial-chunk: src/main.ts -->
```ts
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
  setDraftStatus(error instanceof Error ? error.message : 'draft load failed');
});
```

At this point `src/main.ts` is complete. The final behavior is layered, not
magic: runtime capability check, identity snapshot, storage-backed draft, and
outbox publish.

## 11. Add styles

Create `src/styles.css`:

<!-- tutorial-file: src/styles.css -->
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

.masthead {
  margin: 0 0 24px;
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
  margin: 0;
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

Run a first local check:

```bash
pnpm type-check
pnpm build
```

## 12. Configure Napplet CLI and Paja

Add a Napplet CLI config for discovery, conformance, and later deploy dry-runs:

<!-- tutorial-file: .napplet/config.json -->
```json
{
  "version": 1,
  "sourceDir": ".",
  "relays": ["wss://relay.damus.io"],
  "blossomServers": ["https://cdn.hzrd149.com"],
  "defaultTarget": "named",
  "named": ["notedrafts"],
  "conformance": {
    "command": "napplet-conformance"
  },
  "paja": {
    "command": "kehto"
  }
}
```

Add a Paja simulation config:

<!-- tutorial-file: kehto.dev.json -->
```json
{
  "targetUrl": "http://127.0.0.1:5173",
  "simulation": {
    "identity": {
      "mode": "fixed",
      "pubkey": "4444444444444444444444444444444444444444444444444444444444444444"
    },
    "capabilities": {
      "domains": {
        "identity": true,
        "storage": true,
        "outbox": true
      }
    },
    "theme": {
      "mode": "dark"
    }
  }
}
```

Run the app:

```bash
pnpm dev
```

Open the Paja runtime URL printed by the command, not the raw Vite URL. In Paja:

1. Confirm `identity`, `storage`, and `outbox` are enabled in Interfaces.
2. Grant storage read/write and outbox write in ACL when Paja asks.
3. Type a draft, reload the target iframe, and confirm the draft is restored.
4. Publish the note and confirm Paja asks before signing/publishing.

Then toggle off `storage` or `outbox` in Interfaces and reload. The app should
show a status message rather than throwing.

## 13. Verify the artifact

Run:

```bash
pnpm verify
```

That command type-checks the app, builds the single-file artifact, and runs
`napplet-conformance` against `dist/index.html`.

Inspect the metadata the shell will read:

```bash
pnpm build
grep -n "napplet-type\\|napplet-requires" dist/index.html
```

Expected metadata:

```html
<meta name="napplet-type" content="notedrafts">
<meta name="napplet-requires" content="identity,outbox,storage">
```

The built `dist/index.html` is the file you test and publish. Do not point
conformance or deploy tooling at source `index.html`; it still contains the Vite
`/src/main.ts` module reference.

Preview the CLI-owned metadata and manifest before any network write:

```bash
napplet deploy --dry-run
```

Run `napplet deploy` only after the preview is correct and signing is configured.

## What stayed outside the napplet

- Signing: `outbox.publish` asks the shell to sign the event.
- Relay fanout: `toOutbox: true` lets the shell use the user's write relays.
- Draft persistence: `storage.instance` is scoped by the shell to this napplet
  instance.
- User identity: `identity.getPublicKey` returns the shell-user pubkey snapshot;
  `identity.onChanged` listens for shell-pushed signer changes.

If a future feature needs follows, reactions, list mutations, direct messages, or
counts, use the highest-level NAP that owns that user intent. Do not add a relay
client, private-key handling, or browser storage layer to the napplet.
