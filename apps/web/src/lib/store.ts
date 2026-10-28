/** Opt-in public relay discovery for the website, outside any napplet iframe. */
import { catalogApp, latestApps, type CatalogApp } from './catalog';
import snapshot from '../data/discovered-apps.json';
import config from '../data/discovery.json';
import { gsap } from 'gsap';

/**
 * Query one relay with bounded data, request lifetime, and cleanup on navigation.
 * @param url Configured public relay URL.
 * @param signal Cancellation for this discovery pass.
 * @returns Catalog entries and whether the relay reached end-of-stored-events.
 * @example const result = await discoverRelay(url, controller.signal);
 */
export function discoverRelay(url: string, signal: AbortSignal): Promise<{ apps: CatalogApp[]; complete: boolean }> {
  return new Promise(resolve => {
    let socket: WebSocket;
    const apps: CatalogApp[] = [];
    let received = 0;
    let ended = false;
    const finish = (complete: boolean) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      socket?.close();
      resolve({ apps, complete });
    };
    const abort = () => finish(false);
    const timer = window.setTimeout(abort, config.timeoutMs);
    if (signal.aborted) return finish(false);
    signal.addEventListener('abort', abort, { once: true });
    try { socket = new WebSocket(url); } catch { finish(false); return; }
    socket.onopen = () => socket.send(JSON.stringify(['REQ', 'napplet-store', { kinds: [5129, 15129, 35129], limit: config.limit }]));
    socket.onerror = abort;
    socket.onclose = abort;
    socket.onmessage = ({ data }) => {
      if (ended || typeof data !== 'string' || data.length > 100_000) return;
      try {
        const message = JSON.parse(data);
        if (!Array.isArray(message) || message[1] !== 'napplet-store') return;
        if (message[0] === 'EOSE') return finish(true);
        if (message[0] === 'CLOSED') return finish(false);
        if (message[0] !== 'EVENT') return;
        if (++received > 200) return finish(false);
        const app = catalogApp(message[2], [url]);
        if (app) apps.push(app);
      } catch { /* Relay notices and malformed frames do not become cards. */ }
    };
  });
}

function releaseCard(app: CatalogApp, index: number): HTMLElement {
  const card = document.createElement('article');
  card.className = 'discovered-card';
  card.dataset.appCard = '';
  card.dataset.search = `${app.name} ${app.description} ${app.requirements.join(' ')}`;
  const text = (tag: string, className: string, value: string) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    return element;
  };
  const art = text('div', 'discovered-art', '');
  art.setAttribute('aria-hidden', 'true');
  art.append(text('span', '', app.name.slice(0, 1).toUpperCase()), text('i', '', String(index + 1).padStart(2, '0')));
  const meta = text('div', 'release-meta', '');
  meta.append(text('span', '', 'Signed release'), text('span', '', new Date(app.publishedAt * 1000).toISOString().slice(0, 10)));
  const links = text('div', 'release-links', '');
  const open = document.createElement('a');
  open.href = `https://napplet.soy/n/${app.pointer}`;
  open.target = '_blank'; open.rel = 'noopener noreferrer'; open.textContent = 'Open in napplet.soy ↗';
  const copy = document.createElement('button');
  copy.type = 'button'; copy.dataset.copyAddress = app.pointer; copy.textContent = 'Copy address';
  links.append(open, copy);
  card.append(art, meta, text('h3', '', app.name), text('p', 'publisher-description', app.description),
    text('p', 'release-author', `Publisher ${app.author.slice(0, 8)}…${app.author.slice(-6)}`),
    text('p', 'release-requirements', app.requirements.length ? `Needs: ${app.requirements.join(', ')}` : 'No required shell services declared'), links);
  return card;
}

/**
 * Enable collection filtering, copying addresses, and explicit live discovery.
 * @returns Cleanup for the page's listeners, sockets, and motion.
 * @example const cleanup = setupStore();
 */
export function setupStore(): () => void {
  const grid = document.querySelector<HTMLElement>('#discovered-grid')!;
  const button = document.querySelector<HTMLButtonElement>('#discover-apps')!;
  const status = document.querySelector<HTMLElement>('#discovery-status')!;
  const search = document.querySelector<HTMLInputElement>('#app-search')!;
  const controls = document.querySelector<HTMLElement>('[data-store-controls]')!;
  const events = new AbortController();
  let discovery: AbortController | undefined;
  let entries = latestApps(snapshot.events.map(event => catalogApp(event, snapshot.relays)).filter(app => app !== null));
  const motion = gsap.matchMedia();
  motion.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.store-heading > *', { y: 24, opacity: .3, stagger: .12, duration: .8, ease: 'power3.out', clearProps: 'all' });
  });
  controls.hidden = false;
  button.hidden = false;
  document.querySelectorAll<HTMLButtonElement>('[data-copy-address]').forEach(copy => { copy.hidden = false; });
  const filter = () => {
    const selected = document.querySelector<HTMLInputElement>('input[name="collection"]:checked')?.value ?? 'all';
    const query = search.value.trim().toLocaleLowerCase();
    let total = 0;
    document.querySelectorAll<HTMLElement>('[data-collection]').forEach(section => {
      const relevant = selected === 'all' || section.dataset.collection === selected;
      section.hidden = !relevant;
      section.querySelectorAll<HTMLElement>('[data-app-card]').forEach(card => {
        card.hidden = !card.dataset.search?.toLocaleLowerCase().includes(query);
        if (relevant && !card.hidden) total++;
      });
    });
    document.querySelector<HTMLElement>('#store-result')!.textContent = `${total} ${total === 1 ? 'app' : 'apps'}${query ? ` matching “${search.value.trim()}”` : ' to explore'}`;
    // Keep the empty state outside sections so a collection filter cannot hide it.
    const empty = document.querySelector<HTMLElement>('#store-empty')!;
    empty.hidden = total > 0;
    controls.after(empty);
  };
  search.addEventListener('input', filter, { signal: events.signal });
  controls.addEventListener('change', filter, { signal: events.signal });
  filter();
  grid.addEventListener('click', async event => {
    const copy = (event.target as Element).closest<HTMLButtonElement>('[data-copy-address]');
    if (!copy?.dataset.copyAddress) return;
    try { await navigator.clipboard.writeText(copy.dataset.copyAddress); copy.textContent = 'Copied ✓'; }
    catch { window.prompt('Copy this napplet address into your shell', copy.dataset.copyAddress); }
  }, { signal: events.signal });
  button.addEventListener('click', async () => {
    discovery?.abort();
    const request = new AbortController();
    discovery = request;
    button.disabled = true;
    status.textContent = `Checking ${config.relays.length} public relays…`;
    const results = await Promise.all(config.relays.map(url => discoverRelay(url, request.signal)));
    if (request.signal.aborted) return;
    const found = results.flatMap(result => result.apps);
    const completed = results.filter(result => result.complete).length;
    if (found.length) {
      entries = latestApps([...entries, ...found]);
      grid.replaceChildren(...entries.map(releaseCard));
      filter();
    }
    status.textContent = completed
      ? `Checked ${completed}/${config.relays.length} relays · ${found.length} releases received · saved collection retained`
      : 'Relays did not finish responding. The saved collection is still here. Try again.';
    button.disabled = false;
    button.textContent = completed ? 'Check again ↻' : 'Try again ↻';
  }, { signal: events.signal });
  const cleanup = () => { discovery?.abort(); events.abort(); motion.revert(); };
  window.addEventListener('pagehide', cleanup, { once: true });
  document.addEventListener('astro:before-swap', cleanup, { once: true });
  return cleanup;
}
