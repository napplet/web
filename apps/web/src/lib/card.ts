/** One HTML template for discovered release cards, shared by the static build and live discovery. */
import type { CatalogApp } from './catalog';
import { SHELLS } from './showcase';

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

/** Web shells that can open this release from its address, in directory order. */
export function shellLinks(app: CatalogApp): { name: string; href: string }[] {
  const pointer = app.pointer.startsWith('naddr1') ? 'naddr' : 'nevent';
  return SHELLS.filter(shell => shell.launch?.pointers.includes(pointer)).map(shell => ({ name: shell.name, href: shell.launch!.url.replace('{address}', encodeURIComponent(app.pointer)) }));
}

/** The first shell that opens the release, or the signed event itself when no shell takes this pointer. */
export function openHref(app: CatalogApp): string {
  return shellLinks(app)[0]?.href ?? `https://njump.me/${app.pointer}`;
}

/** This site's player grants no NAP domains, so only releases that require none can run here. */
export function runsHere(app: CatalogApp): boolean {
  return app.requirements.length === 0 && app.servers.length > 0;
}

/** Searchable text for a release card. */
export function searchText(app: CatalogApp): string {
  return [app.name, app.description, ...app.requirements, ...app.archetypes, ...app.topics, ...(app.listing?.topics ?? [])].join(' ');
}

/**
 * Render a release card. Publisher text is escaped; manifest media is attached as data for verification in the browser.
 * @param app Verified catalog entry, with any matched listing.
 * @param index Position in the collection, for the monogram number.
 * @returns HTML for one `article`.
 * @example grid.insertAdjacentHTML('beforeend', releaseCardHtml(app, 0));
 */
export function releaseCardHtml(app: CatalogApp, index: number): string {
  const art = app.listing?.images[0];
  const monogram = escape(app.name.slice(0, 1).toUpperCase());
  const media = JSON.stringify({ icon: app.icon ?? null, screenshots: app.screenshots.slice(0, 1), servers: app.servers });
  const tags = [...app.archetypes, ...app.topics.filter(topic => !app.archetypes.includes(topic))].slice(0, 5);
  const listingIcon = app.listing?.icon;
  const date = new Date(app.publishedAt * 1000).toISOString().slice(0, 10);
  const shells = shellLinks(app);
  const artifact = app.event.tags.find(tag => tag[0] === 'x')?.[1] ?? '';
  const run = JSON.stringify({ name: app.name, hash: artifact, servers: app.servers, href: openHref(app), shell: shells[0]?.name ?? null });
  const primary = runsHere(app)
    ? `<a class="run-link" href="${escape(openHref(app))}" data-launch-release="${escape(app.id)}" data-run="${escape(run)}"><span class="play-symbol" aria-hidden="true">▶</span> Run here</a>`
    : `<span class="run-unavailable">Needs ${escape(app.requirements.join(', ') || 'a Blossom server')} · open it in a shell</span>`;
  return `<article class="discovered-card" data-app-card data-release="${escape(app.id)}" data-search="${escape(searchText(app))}" data-media="${escape(media)}">
  <div class="discovered-art${art ? ' has-art' : ''}" data-art aria-hidden="true">${art ? `<img src="${escape(art)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-listing-art />` : ''}<span class="art-monogram">${monogram}</span><i class="art-index">${String(index + 1).padStart(2, '0')}</i><em class="art-source" data-art-source>${art ? 'Listing art' : ''}</em></div>
  <div class="release-head"><span class="release-icon" data-icon>${listingIcon ? `<img src="${escape(listingIcon)}" alt="" width="40" height="40" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-listing-icon />` : `<b>${monogram}</b>`}</span><div class="release-title"><h3>${escape(app.name)}</h3><p class="release-author">Publisher <span title="${escape(app.author)}">${escape(app.author.slice(0, 8))}…${escape(app.author.slice(-6))}</span></p></div><span class="release-date">${date}</span></div>
  <p class="publisher-description">${escape(app.description)}</p>
  ${tags.length ? `<ul class="release-tags" aria-label="Archetypes and topics">${tags.map(tag => `<li>${escape(tag)}</li>`).join('')}</ul>` : ''}
  <p class="release-requirements">${app.requirements.length ? `Needs: ${escape(app.requirements.join(', '))}` : 'No required shell services declared'}${app.optional.length ? ` · Optional: ${escape(app.optional.join(', '))}` : ''}${app.versions ? ` · ${app.versions} pinned ${app.versions === 1 ? 'version' : 'versions'}` : ''}</p>
  <div class="release-actions">${primary}<button type="button" data-copy-address="${escape(app.pointer)}" hidden>Copy address</button></div>
  <div class="release-links"><span class="release-links-label">Open in</span>${shells.map(shell => `<a href="${escape(shell.href)}" target="_blank" rel="noopener noreferrer">${escape(shell.name)} ↗</a>`).join('')}<a class="release-event" href="https://njump.me/${escape(app.pointer)}" target="_blank" rel="noopener noreferrer">Signed release ↗</a>${app.source?.startsWith('https://') ? `<a class="release-source" href="${escape(app.source)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : ''}</div>
</article>`;
}
