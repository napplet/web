/** Progressive enhancement for the curated Run links. The verifier loads only on click. */
import { NAPPLETS, type PlayableNapplet } from '../showcase';

/** Attach a single dismissible player with cancellation and focus restoration. */
export function setupPlayer(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#napplet-player')!;
  const stage = document.querySelector<HTMLDivElement>('#player-stage')!;
  const title = document.querySelector<HTMLHeadingElement>('#player-title')!;
  const status = document.querySelector<HTMLParagraphElement>('#player-status')!;
  const original = document.querySelector<HTMLAnchorElement>('#player-original')!;
  const retry = document.querySelector<HTMLButtonElement>('#player-retry')!;
  let active: AbortController | undefined;
  let selected: PlayableNapplet | undefined;
  let opener: HTMLElement | undefined;
  let previousOverflow = '';
  const identities = new WeakMap<Window, { dTag: string; aggregateHash: string }>();

  async function launch(item: PlayableNapplet) {
    active?.abort();
    const request = new AbortController();
    active = request;
    selected = item;
    stage.replaceChildren();
    stage.setAttribute('aria-busy', 'true');
    title.textContent = item.name;
    status.textContent = 'Loading and verifying this napplet…';
    original.href = item.href;
    retry.hidden = true;
    if (!dialog.open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    }
    const timeout = window.setTimeout(() => request.abort(new Error('The download timed out. Please try again.')), 15000);
    try {
      const { fetchBytes, verifyManifest, verifiedDocument, PLAYER_SANDBOX } = await import('./verify');
      const signal = request.signal;
      const manifestBytes = await fetchBytes(item.manifest, signal);
      const identity = await verifyManifest(JSON.parse(new TextDecoder().decode(manifestBytes)), item.eventId);
      const document = await verifiedDocument(await fetchBytes(item.artifact, signal), identity.artifactHash);
      signal.throwIfAborted();
      const frame = window.document.createElement('iframe');
      frame.title = `${item.name} napplet`;
      frame.sandbox.value = PLAYER_SANDBOX;
      frame.referrerPolicy = 'no-referrer';
      // This player exposes no NAP domains and consumes no inbound messages.
      // Bind the Window before assigning any executable bytes (NIP-5D Identity).
      stage.replaceChildren(frame);
      identities.set(frame.contentWindow!, identity);
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

  document.querySelectorAll<HTMLAnchorElement>('[data-launch]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const item = NAPPLETS.find((entry) => entry.id === link.dataset.launch);
      if (!item) return;
      event.preventDefault();
      opener = link;
      void launch(item);
    });
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
