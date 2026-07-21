<script lang="ts">
  import { LINKS } from '../lib/site';
  import Logo from './Logo.svelte';
</script>

<footer class="footer">
  <div class="container foot-inner">
    <div class="foot-brand">
      <a class="brand" href="#top">
        <Logo size={24} />
        <span>napplet</span>
      </a>
      <p>Composable, sandboxed Nostr apps. Defined by NIP-5D.</p>
      <span class="alpha">alpha · experimental · for adventurers only</span>
    </div>

    <div class="foot-cols">
      <div class="col">
        <h4>Build</h4>
        <a href={LINKS.docs}>Documentation</a>
        <a href={LINKS.boilerplate} target="_blank" rel="noopener">Boilerplate</a>
        <a href="/docs/packages/">Packages</a>
      </div>
      <div class="col">
        <h4>Protocol</h4>
        <a href={LINKS.spec} target="_blank" rel="noopener">NIP-5D spec</a>
        <a href="/docs/guide/nip-5d.html">Envelope format</a>
        <a href="/docs/naps/">NAP domains</a>
      </div>
      <div class="col">
        <h4>Ecosystem</h4>
        <a href={LINKS.kehto} target="_blank" rel="noopener">Kehto runtime</a>
        <a href={LINKS.community} target="_blank" rel="noopener">Community group chat</a>
        <a href={LINKS.github} target="_blank" rel="noopener">GitHub</a>
        <a href={LINKS.githubOrg} target="_blank" rel="noopener">@napplet</a>
      </div>
    </div>
  </div>
  <div class="container foot-base">
    <span>MIT licensed</span>
    <span>© {new Date().getFullYear()} napplet</span>
  </div>
</footer>

<style>
  .footer {
    border-top: 1px solid var(--border-soft);
    background: linear-gradient(180deg, transparent, rgba(123, 47, 247, 0.05));
    padding-top: 64px;
    margin-top: 40px;
  }
  .foot-inner {
    display: grid;
    grid-template-columns: 1.4fr 2fr;
    gap: 48px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--text);
  }
  .foot-brand p {
    color: var(--text-muted);
    margin-top: 14px;
    max-width: 32ch;
  }
  .alpha {
    display: inline-block;
    margin-top: 14px;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }
  .foot-cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .col { display: flex; flex-direction: column; gap: 10px; }
  .col h4 {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-dim);
    margin-bottom: 4px;
    font-weight: 600;
  }
  .col a { color: var(--text-muted); font-size: 0.92rem; }
  .col a:hover { color: #fff; }

  .foot-base {
    display: flex;
    justify-content: space-between;
    padding-top: 28px;
    margin-top: 48px;
    padding-bottom: 32px;
    border-top: 1px solid var(--border-soft);
    color: var(--text-dim);
    font-size: 0.85rem;
  }
  @media (max-width: 760px) {
    .foot-inner { grid-template-columns: 1fr; gap: 36px; }
    .foot-cols { grid-template-columns: repeat(2, 1fr); }
  }
</style>
