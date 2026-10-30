/** Opt-in public relay discovery for the website, outside any napplet iframe. */
import { APPLICATION_KIND, catalogApp, collapseReleases, latestApps, withListings, type CatalogApp } from './catalog';
import { releaseCardHtml } from './card';
import { verifiedImage } from './media';
import snapshot from '../data/discovered-apps.json';
import config from '../data/discovery.json';
import { gsap } from 'gsap';
import { verifyEvent, type Event } from 'nostr-tools/pure';
import { firstValueFrom, fromEvent, lastValueFrom, takeUntil, takeWhile, timeout, toArray } from 'rxjs';
import type { EventStore } from 'applesauce-core';
import type { RelayPool } from 'applesauce-relay';
import type { Filter } from 'applesauce-core/helpers';

const MANIFEST_KINDS = [5129, 15129, 35129];
const PAGE = 12;

interface Discovery { pool: RelayPool; store: EventStore; queriedAuthors: Set<string>; receive: number; paged: Set<string>; done: Set<string> }

/** Page state shared by filtering, paging and live discovery. */
interface StoreState {
  entries: CatalogApp[];
  visible: number;
  oldest: number;
  exhausted: boolean;
  loading: boolean;
  failed: boolean;
  discovery?: Discovery;
  pass?: AbortController;
  signal: AbortSignal;
  motion: gsap.MatchMedia;
  /** Keep paging while the end of the list is still in view after a render. */
  nudge?: () => void;
}

/** Collect what the saved snapshot and live discovery know, as display entries with listing fallbacks. */
function entriesFrom(manifests: unknown[], applications: unknown[], relays: string[]): CatalogApp[] {
  return withListings(collapseReleases(latestApps(manifests.map(event => catalogApp(event, relays)).filter(app => app !== null))), applications);
}

/** applesauce's pool and store are loaded only after the visitor asks to contact relays. */
async function openDiscovery(): Promise<Discovery> {
  const [{ RelayPool, SyncDirection }, { EventStore }] = await Promise.all([import('applesauce-relay'), import('applesauce-core')]);
  const store = new EventStore({ verifyEvent });
  for (const event of [...snapshot.events, ...(snapshot.applications ?? [])]) store.add(event as Event);
  return { pool: new RelayPool(), store, queriedAuthors: new Set(), receive: SyncDirection.RECEIVE, paged: new Set(), done: new Set() };
}

/**
 * Query one relay with bounded data, request lifetime, and cleanup on navigation.
 * @param discovery Open pool and store.
 * @param url Configured public relay URL.
 * @param filter Bounded request filter.
 * @param signal Cancellation for this discovery pass.
 * @returns Verified events the store accepted and whether the relay finished.
 * @example const result = await requestRelay(discovery, url, { kinds: [35129], limit: 80 }, controller.signal);
 */
export async function requestRelay(discovery: Discovery, url: string, filter: Filter, signal: AbortSignal): Promise<{ events: Event[]; complete: boolean }> {
  const events: Event[] = [];
  try {
    // Only the relay's own end-of-stored-events marker counts as a finished pass; a dropped socket does not.
    const messages = await firstValueFrom(discovery.pool.relay(url).req(filter).pipe(
      takeWhile(message => message.type !== 'EOSE' && message.type !== 'CLOSED', true),
      takeUntil(fromEvent(signal, 'abort')), timeout(config.timeoutMs), toArray(),
    ));
    for (const message of messages) {
      if (message.type !== 'EVENT' || events.length >= 200) continue;
      const stored = discovery.store.add(message.event);
      if (stored) events.push(stored);
    }
    return { events, complete: !signal.aborted && messages.some(message => message.type === 'EOSE') };
  } catch { return { events, complete: false }; }
}

/**
 * Reconcile the local store with one relay over NIP-77 negentropy, downloading only the releases it lacks.
 * Relays without NIP-77, or a failed negotiation, fall back to a bounded REQ that pages with `until` later.
 * @param discovery Open pool and store.
 * @param url Configured public relay URL.
 * @param filter Filter to reconcile; the REQ fallback adds the configured limit.
 * @param signal Cancellation for this discovery pass.
 * @returns Verified events the store accepted, whether the relay finished, and which method ran.
 * @example const result = await syncRelay(discovery, url, { kinds: [35129] }, controller.signal);
 */
export async function syncRelay(discovery: Discovery, url: string, filter: Filter, signal: AbortSignal): Promise<{ events: Event[]; complete: boolean; method: 'negentropy' | 'req' }> {
  if (!discovery.paged.has(url)) {
    try {
      const messages = await lastValueFrom(discovery.pool.relay(url).sync(discovery.store, filter, discovery.receive, { signal }).pipe(timeout(config.timeoutMs * 3), toArray()), { defaultValue: [] });
      const events: Event[] = [];
      for (const message of messages) if (message.type === 'received') { const stored = discovery.store.add(message.event) ?? discovery.store.getEvent(message.event.id); if (stored) events.push(stored); }
      if (!signal.aborted) return { events, complete: true, method: 'negentropy' };
    } catch { /* The relay declined NIP-77 or the negotiation broke; a plain request still works. */ }
    if (signal.aborted) return { events: [], complete: false, method: 'negentropy' };
    discovery.paged.add(url);
  }
  return { ...await requestRelay(discovery, url, { ...filter, limit: config.limit }, signal), method: 'req' };
}

/** Reconcile manifests with every relay (or page the ones without NIP-77), then fetch listings for new publishers. */
async function discover(discovery: Discovery, until: number | undefined, signal: AbortSignal): Promise<{ completed: number; received: number; oldest?: number; paged: number }> {
  const relays = until ? config.relays.filter(url => discovery.paged.has(url) && !discovery.done.has(url)) : config.relays;
  const results = await Promise.all(relays.map(url => until
    ? requestRelay(discovery, url, { kinds: MANIFEST_KINDS, limit: config.limit, until }, signal)
    : syncRelay(discovery, url, { kinds: MANIFEST_KINDS }, signal)));
  // A relay that answers an older page with nothing, or not at all, has no more pages worth asking for.
  if (until) results.forEach((result, index) => { if (!result.complete || !result.events.length) discovery.done.add(relays[index]); });
  const manifests = results.flatMap(result => result.events);
  const authors = [...new Set(manifests.map(event => event.pubkey))].filter(author => !discovery.queriedAuthors.has(author));
  if (authors.length && !signal.aborted) {
    authors.forEach(author => discovery.queriedAuthors.add(author));
    await Promise.all(config.relays.map(url => syncRelay(discovery, url, { kinds: [APPLICATION_KIND], authors: authors.slice(0, 50) }, signal)));
  }
  return { completed: results.filter(result => result.complete).length, received: manifests.length, paged: discovery.paged.size, oldest: manifests.length ? Math.min(...manifests.map(event => event.created_at)) : undefined };
}

/** Swap generic artwork for manifest media once its bytes verify. */
function hydrateMedia(card: HTMLElement, signal: AbortSignal): void {
  if (card.dataset.hydrated) return;
  card.dataset.hydrated = 'true';
  let media: { icon: { sha256: string; type: string } | null; screenshots: { sha256: string; type?: string; alt?: string }[]; servers: string[] };
  try { media = JSON.parse(card.dataset.media ?? ''); } catch { return; }
  const image = (src: string) => { const element = document.createElement('img'); element.src = src; element.alt = ''; element.decoding = 'async'; return element; };
  if (media.icon) void verifiedImage(media.icon, media.servers, signal).then(src => {
    const slot = card.querySelector('[data-icon]');
    if (!src || !slot) return;
    const element = image(src); element.width = 40; element.height = 40; slot.replaceChildren(element);
    // Without a screenshot or listing art, the verified icon stands in for the artwork.
    const art = card.querySelector<HTMLElement>('[data-art]');
    if (art && !art.classList.contains('has-art')) {
      const large = image(src); large.className = 'art-icon'; art.prepend(large); art.classList.add('has-icon');
      const source = art.querySelector('[data-art-source]');
      if (source) source.textContent = 'Manifest icon';
    }
  });
  if (media.screenshots[0]) void verifiedImage(media.screenshots[0], media.servers, signal).then(src => {
    const art = card.querySelector<HTMLElement>('[data-art]');
    if (!src || !art) return;
    art.querySelector('[data-listing-art]')?.remove();
    art.querySelector('.art-icon')?.remove();
    art.classList.remove('has-icon');
    art.prepend(image(src));
    art.classList.add('has-art');
    const source = art.querySelector('[data-art-source]');
    if (source) source.textContent = 'Manifest screenshot';
  });
}

/** Apply collection, search and paging to the cards; hydrate what is visible; describe the paging control. */
function applyFilters(state: StoreState): void {
  const grid = document.querySelector<HTMLElement>('#discovered-grid')!;
  const search = document.querySelector<HTMLInputElement>('#app-search')!;
  const controls = document.querySelector<HTMLElement>('[data-store-controls]')!;
  const note = document.querySelector<HTMLElement>('#store-more-note')!;
  const sentinel = document.querySelector<HTMLElement>('#store-more')!;
  const discoveredSection = grid.closest<HTMLElement>('[data-collection]')!;
  const selected = document.querySelector<HTMLInputElement>('input[name="collection"]:checked')?.value ?? 'all';
  const query = search.value.trim().toLocaleLowerCase();
  let total = 0;
  document.querySelectorAll<HTMLElement>('[data-collection]').forEach(section => {
    const relevant = selected === 'all' || section.dataset.collection === selected;
    section.hidden = !relevant;
    section.querySelectorAll<HTMLElement>('[data-app-card]').forEach((card, index) => {
      const paged = query !== '' || section !== discoveredSection || index < state.visible;
      card.hidden = !paged || !card.dataset.search?.toLocaleLowerCase().includes(query);
      if (relevant && !card.hidden) total++;
      if (relevant && !card.hidden && card.dataset.media) hydrateMedia(card, state.signal);
    });
  });
  document.querySelector<HTMLElement>('#store-result')!.textContent = `${total} ${total === 1 ? 'app' : 'apps'}${query ? ` matching “${search.value.trim()}”` : ' to explore'}`;
  // Keep the empty state outside sections so a collection filter cannot hide it.
  const empty = document.querySelector<HTMLElement>('#store-empty')!;
  empty.hidden = total > 0;
  controls.after(empty);
  sentinel.hidden = query !== '' || discoveredSection.hidden;
  const remaining = state.entries.length - Math.min(state.visible, state.entries.length);
  if (state.loading) note.textContent = 'Looking on public relays…';
  else if (remaining > 0) note.textContent = `${remaining} more below`;
  else if (state.exhausted) note.textContent = 'That’s everything we found.';
  else if (state.failed) note.textContent = 'Relays did not finish responding. Scroll again to retry.';
  else note.textContent = 'Keep scrolling to look on public relays.';
}

/** Rebuild the grid from the entries; the template escapes publisher text and the parser is inert. */
function renderEntries(state: StoreState, added: string[] = []): void {
  const grid = document.querySelector<HTMLElement>('#discovered-grid')!;
  const parsed = new DOMParser().parseFromString(state.entries.map(releaseCardHtml).join(''), 'text/html');
  grid.replaceChildren(...parsed.body.children);
  grid.querySelectorAll<HTMLButtonElement>('[data-copy-address]').forEach(copy => { copy.hidden = false; });
  applyFilters(state);
  const fresh = added.map(id => grid.querySelector<HTMLElement>(`[data-release="${CSS.escape(id)}"]`)).filter((card): card is HTMLElement => card !== null && !card.hidden);
  if (fresh.length) state.motion.add('(prefers-reduced-motion: no-preference)', () => { gsap.from(fresh, { y: 18, opacity: 0, stagger: .05, duration: .6, ease: 'power3.out', clearProps: 'all' }); });
}

/** Run one relay pass: a NIP-77 reconciliation (or first page) when `until` is absent, otherwise an older REQ page. */
async function runDiscovery(state: StoreState, until?: number): Promise<void> {
  const button = document.querySelector<HTMLButtonElement>('#discover-apps')!;
  const status = document.querySelector<HTMLElement>('#discovery-status')!;
  state.pass?.abort();
  const request = new AbortController();
  state.pass = request;
  state.loading = true;
  state.failed = false;
  button.disabled = true;
  applyFilters(state);
  state.discovery ??= await openDiscovery();
  if (request.signal.aborted) return;
  const previousStatus = status.textContent ?? '';
  status.textContent = until ? `Looking for older releases on ${config.relays.length} public relays…` : `Checking ${config.relays.length} public relays…`;
  const before = new Set(state.entries.map(entry => entry.event.id));
  const result = await discover(state.discovery, until, request.signal);
  if (request.signal.aborted) return;
  state.entries = entriesFrom(state.discovery.store.getByFilters({ kinds: MANIFEST_KINDS }), state.discovery.store.getByFilters({ kinds: [APPLICATION_KIND] }), config.relays);
  const added = state.entries.filter(entry => !before.has(entry.event.id)).map(entry => entry.id);
  if (result.oldest !== undefined) state.oldest = Math.min(state.oldest, result.oldest);
  // Reconciled relays hold nothing more; only relays that fell back to REQ have older pages to walk.
  const relaysToPage = config.relays.filter(url => state.discovery!.paged.has(url) && !state.discovery!.done.has(url)).length;
  state.failed = !until && result.completed === 0;
  if (relaysToPage === 0 && (until || result.completed > 0)) state.exhausted = true;
  if (added.length) state.visible = Math.max(state.visible, until ? state.visible + added.length : PAGE);
  state.loading = false;
  renderEntries(state, added);
  // An older page that no relay answered is the end of paging, not a failure of the reconciliation already reported.
  status.textContent = result.completed
    ? `Checked ${result.completed}/${config.relays.length} relays · ${result.received} releases received · ${result.paged ? `${config.relays.length - result.paged} reconciled with NIP-77` : 'all reconciled with NIP-77'} · saved collection retained`
    : until ? previousStatus : 'Relays did not finish responding. The saved collection is still here. Try again.';
  button.disabled = false;
  button.textContent = result.completed ? 'Check again ↻' : 'Try again ↻';
  state.nudge?.();
}

/**
 * Enable collection filtering, copying addresses, paged reveal, and explicit live discovery.
 * @returns Cleanup for the page's listeners, sockets, and motion.
 * @example const cleanup = setupStore();
 */
export function setupStore(): () => void {
  const grid = document.querySelector<HTMLElement>('#discovered-grid')!;
  const button = document.querySelector<HTMLButtonElement>('#discover-apps')!;
  const search = document.querySelector<HTMLInputElement>('#app-search')!;
  const controls = document.querySelector<HTMLElement>('[data-store-controls]')!;
  const sentinel = document.querySelector<HTMLElement>('#store-more')!;
  const events = new AbortController();
  const state: StoreState = {
    entries: entriesFrom(snapshot.events, snapshot.applications ?? [], snapshot.relays),
    visible: PAGE, oldest: Math.min(...snapshot.events.map(event => event.created_at)),
    exhausted: false, loading: false, failed: false, signal: events.signal, motion: gsap.matchMedia(),
  };
  state.motion.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.store-heading > *', { y: 24, opacity: .3, stagger: .12, duration: .8, ease: 'power3.out', clearProps: 'all' });
  });
  controls.hidden = false;
  button.hidden = false;
  grid.querySelectorAll<HTMLButtonElement>('[data-copy-address]').forEach(copy => { copy.hidden = false; });
  const filter = () => applyFilters(state);
  search.addEventListener('input', filter, { signal: events.signal });
  controls.addEventListener('change', filter, { signal: events.signal });
  filter();
  // Reaching the end reveals the next page of the saved collection; past it, the relays are reconciled, then paged.
  const showMore = () => {
    if (state.loading || state.exhausted) return;
    if (state.visible < state.entries.length) { state.visible += PAGE; filter(); state.nudge?.(); return; }
    void runDiscovery(state, state.discovery ? state.oldest - 1 : undefined);
  };
  // Appending a page can leave the sentinel on screen without a new intersection event, so look again.
  state.nudge = () => requestAnimationFrame(() => {
    if (sentinel.hidden || state.loading || state.exhausted || state.failed || events.signal.aborted) return;
    if (sentinel.getBoundingClientRect().top < innerHeight * 1.4) showMore();
  });
  button.addEventListener('click', () => void runDiscovery(state), { signal: events.signal });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting && !sentinel.hidden) showMore(); }, { rootMargin: '0px 0px 40% 0px' });
    observer.observe(sentinel);
    events.signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }
  grid.addEventListener('click', async event => {
    const copy = (event.target as Element).closest<HTMLButtonElement>('[data-copy-address]');
    if (!copy?.dataset.copyAddress) return;
    try { await navigator.clipboard.writeText(copy.dataset.copyAddress); copy.textContent = 'Copied ✓'; }
    catch { window.prompt('Copy this napplet address into your shell', copy.dataset.copyAddress); }
  }, { signal: events.signal });
  const cleanup = () => { state.pass?.abort(); events.abort(); state.motion.revert(); };
  window.addEventListener('pagehide', cleanup, { once: true });
  document.addEventListener('astro:before-swap', cleanup, { once: true });
  return cleanup;
}
