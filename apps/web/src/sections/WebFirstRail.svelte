<script lang="ts">
  import { reveal } from '../lib/reveal';
  import { LINKS } from '../lib/site';

  // An early, deliberately light touch: plant the flag that web is the FIRST
  // target (not the only one) with the rationale, before the main narrative —
  // so visitors don't read the iframe-heavy sections as "web-only".
  const reasons = [
    'A real, browser-enforced sandbox',
    'The biggest developer ecosystem',
    'Ships as a NIP-5A nsite — no servers',
  ];

  // A simplified transposition of the napplet/naps "projections" registry: the
  // same capability seam maps onto more than one host. Web is the one that's
  // shipping; the rest are room to grow — exactly the "not web only" point.
  const projections = [
    { name: 'Web', binding: 'iframes + postMessage · window.napplet.*', status: 'In use', live: true },
    { name: 'Native', binding: 'OS process + IPC / FFI', status: 'Possible', live: false },
    { name: 'WASM', binding: 'host imports', status: 'Possible', live: false },
  ];
</script>

<div class="rail-wrap container" use:reveal>
  <div class="rail">
    <div class="flag">
      <span class="pulse" aria-hidden="true"></span>
      <div class="flag-text">
        <strong>Web first — not web only</strong>
        <span>web napplets prove the protocol on the web by choice</span>
      </div>
    </div>

    <ul class="reasons">
      {#each reasons as r}
        <li>{r}</li>
      {/each}
    </ul>

    <p class="agnostic">
      The napplet &amp;
      <a href={LINKS.naps} target="_blank" rel="noopener"><strong>NAP</strong></a>
      model is transport-agnostic by design — room to grow beyond the browser.
    </p>
  </div>

  <div class="projections">
    <div class="proj-head">
      <span class="proj-eyebrow">Projections</span>
      <span class="proj-sub">
        one capability seam, many hosts — see the
        <a href={LINKS.naps} target="_blank" rel="noopener">registry</a>
      </span>
    </div>
    <table class="proj-table">
      <thead>
        <tr>
          <th scope="col">Projection</th>
          <th scope="col">Binding</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each projections as p}
          <tr class:live={p.live}>
            <th scope="row">{p.name}</th>
            <td class="binding"><code>{p.binding}</code></td>
            <td class="status">
              <span class="badge" class:badge-live={p.live}>{p.status}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .rail-wrap {
    margin-top: -8px;
    margin-bottom: 8px;
  }
  .rail {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px 28px;
    padding: 18px 24px;
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    background:
      linear-gradient(90deg, rgba(79, 214, 224, 0.06), rgba(176, 107, 255, 0.05));
    backdrop-filter: blur(4px);
  }

  .flag {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .pulse {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 0 0 rgba(79, 214, 224, 0.55);
    animation: pulse 2.2s ease-out infinite;
    flex: none;
  }
  .flag-text {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }
  .flag-text strong {
    font-size: 0.98rem;
    color: var(--text);
  }
  .flag-text span {
    font-size: 0.82rem;
    color: var(--text-dim);
  }

  .reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .reasons li {
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 5px 11px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.02);
  }

  .agnostic {
    flex: 1 1 220px;
    min-width: 200px;
    font-size: 0.82rem;
    color: var(--text-dim);
    margin-left: auto;
    text-align: right;
  }
  .agnostic strong {
    color: var(--accent-bright);
    font-weight: 600;
  }
  .agnostic a {
    text-decoration: underline;
    text-decoration-color: var(--accent-deep);
    text-underline-offset: 3px;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(79, 214, 224, 0.5); }
    70% { box-shadow: 0 0 0 9px rgba(79, 214, 224, 0); }
    100% { box-shadow: 0 0 0 0 rgba(79, 214, 224, 0); }
  }

  /* Projections — simplified transposition of the naps registry table */
  .projections {
    margin-top: 14px;
    padding: 16px 20px;
    border: 1px solid var(--border-soft);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.015);
  }
  .proj-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin-bottom: 10px;
  }
  .proj-eyebrow {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-bright);
  }
  .proj-sub {
    font-size: 0.76rem;
    color: var(--text-dim);
  }
  .proj-sub a {
    color: var(--text-muted);
    text-decoration: underline;
    text-decoration-color: var(--accent-deep);
    text-underline-offset: 3px;
  }
  .proj-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  .proj-table th,
  .proj-table td {
    text-align: left;
    padding: 8px 10px;
    vertical-align: middle;
  }
  .proj-table thead th {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-weight: 500;
    border-bottom: 1px solid var(--border-soft);
  }
  .proj-table tbody th {
    font-weight: 700;
    color: var(--text-muted);
  }
  .proj-table tbody tr { border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
  .proj-table tbody tr:last-child { border-bottom: none; }
  .proj-table tr.live th { color: var(--text); }
  .proj-table .binding code {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--text-dim);
  }
  .proj-table tr.live .binding code { color: var(--text-muted); }
  .badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    letter-spacing: 0.04em;
    padding: 2px 9px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--text-dim);
    white-space: nowrap;
  }
  .badge-live {
    color: var(--cyan);
    border-color: var(--cyan);
    background: rgba(79, 214, 224, 0.08);
  }

  @media (max-width: 920px) {
    .agnostic { text-align: left; margin-left: 0; }
  }
  @media (max-width: 560px) {
    .proj-table .binding { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse { animation: none; }
  }
</style>
