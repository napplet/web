/** Progressive enhancement for the Run links. The verifier loads only on click. */
import { NAPPLETS, type PlayableNapplet } from '../showcase';

/** Anything the player can load: a curated preview or a discovered release fetched from its publisher's servers. */
interface Playable {
  name: string;
  note: string;
  href: string;
  shell: string;
  load(signal: AbortSignal): Promise<string>;
}

/** A discovered release's launch data, carried on its card so re-rendered grids keep working. */
interface RunData { name: string; hash: string; servers: string[]; href: string; shell: string | null }

async function curated(item: PlayableNapplet): Promise<Playable> {
  const { fetchBytes, verifyRelease, verifiedDocument } = await import('./verify');
  return {
    name: item.name, href: item.href, shell: 'napplet.soy',
    note: item.format === 'archive' ? 'An archived release, preserved as published. Progress lasts for this preview.' : 'A signed release, preserved as published. Progress lasts for this preview.',
    async load(signal) {
      const manifestBytes = await fetchBytes(item.manifest, signal);
      const identity = await verifyRelease(JSON.parse(new TextDecoder().decode(manifestBytes)), item.eventId, item.format);
      return verifiedDocument(await fetchBytes(item.artifact, signal), identity.artifactHash);
    },
  };
}

async function discovered(data: RunData): Promise<Playable> {
  const { fetchArtifact, verifiedDocument } = await import('./verify');
  return {
    name: data.name, href: data.href, shell: data.shell ?? 'a full shell',
    note: 'A signed release fetched from its publisher’s Blossom servers and verified against the manifest hash. This preview supplies no shell services; progress lasts for this preview.',
    load: async signal => verifiedDocument(await fetchArtifact(data.hash, data.servers, signal), data.hash),
  };
}

/** Resolve a Run link to something the player can load: a curated preview or a discovered release's run data. */
function playableFor(link: HTMLAnchorElement): Promise<Playable> | undefined {
  if (link.dataset.launch) {
    const item = NAPPLETS.find(entry => entry.id === link.dataset.launch);
    return item ? curated(item) : undefined;
  }
  if (!link.dataset.run) return undefined;
  try { return discovered(JSON.parse(link.dataset.run) as RunData); } catch { return undefined; }
}

/** Attach a single dismissible player with cancellation and focus restoration. */
export function setupPlayer(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#napplet-player')!;
  const stage = document.querySelector<HTMLDivElement>('#player-stage')!;
  const title = document.querySelector<HTMLHeadingElement>('#player-title')!;
  const note = document.querySelector<HTMLParagraphElement>('#player-note')!;
  const status = document.querySelector<HTMLParagraphElement>('#player-status')!;
  const original = document.querySelector<HTMLAnchorElement>('#player-original')!;
  const retry = document.querySelector<HTMLButtonElement>('#player-retry')!;
  let active: AbortController | undefined;
  let selected: Playable | undefined;
  let opener: HTMLElement | undefined;
  let previousOverflow = '';

  async function launch(item: Playable) {
    active?.abort();
    const request = new AbortController();
    active = request;
    selected = item;
    stage.replaceChildren();
    stage.setAttribute('aria-busy', 'true');
    title.textContent = item.name;
    note.textContent = item.note;
    status.textContent = 'Loading and verifying this napplet…';
    original.href = item.href;
    original.textContent = `Open in ${item.shell} ↗`;
    retry.hidden = true;
    if (!dialog.open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    }
    const timeout = window.setTimeout(() => request.abort(new Error('The download timed out. Please try again.')), 15000);
    try {
      const { PLAYER_SANDBOX } = await import('./verify');
      const signal = request.signal;
      const document = await item.load(signal);
      signal.throwIfAborted();
      const frame = window.document.createElement('iframe');
      frame.title = `${item.name} napplet`;
      frame.sandbox.value = PLAYER_SANDBOX;
      frame.referrerPolicy = 'no-referrer';
      // This player exposes no NAP domains and consumes no inbound messages.
      // Archived demos are not presented as current-protocol conformance examples.
      stage.replaceChildren(frame);
      await new Promise<void>((resolve, reject) => {
        const aborted = () => reject(signal.reason);
        signal.addEventListener('abort', aborted, { once: true });
        frame.addEventListener('load', () => {
          signal.removeEventListener('abort', aborted);
          resolve();
        }, { once: true, signal });
        frame.srcdoc = document;
      });
      signal.throwIfAborted();
      stage.setAttribute('aria-busy', 'false');
      status.textContent = 'Ready to play · progress lasts for this preview';
    } catch (error) {
      if (active !== request || !dialog.open) return;
      const reason = request.signal.aborted ? request.signal.reason : error;
      status.textContent = reason instanceof Error ? reason.message : 'The napplet could not be loaded. Please try again.';
      stage.setAttribute('aria-busy', 'false');
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Cards are re-rendered by live discovery, so the Run links are handled by delegation.
  document.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-launch], [data-launch-release]');
    const playable = link && playableFor(link);
    if (!link || !playable) return;
    event.preventDefault();
    opener = link;
    void playable.then(launch);
  });
  retry.addEventListener('click', () => { if (selected) void launch(selected); });
  dialog.addEventListener('close', () => {
    active?.abort();
    active = undefined;
    stage.replaceChildren();
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
}
