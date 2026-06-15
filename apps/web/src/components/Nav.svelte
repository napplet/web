<script lang="ts">
  import { LINKS, NAV } from '../lib/site';
  import Logo from './Logo.svelte';

  let scrolled = $state(false);
  let open = $state(false);

  function onScroll() {
    scrolled = window.scrollY > 12;
  }
</script>

<svelte:window on:scroll={onScroll} />

<header class="nav" class:scrolled>
  <div class="container nav-inner">
    <a class="brand" href="#top" aria-label="napplet home" onclick={() => (open = false)}>
      <Logo size={26} />
      <span>napplet</span>
    </a>

    <nav class="links" class:open aria-label="Primary">
      {#each NAV as item}
        <a href={item.href} onclick={() => (open = false)}>{item.label}</a>
      {/each}
      <a href={LINKS.docs}>Docs</a>
    </nav>

    <div class="cta">
      <a class="gh" href={LINKS.github} target="_blank" rel="noopener" aria-label="GitHub">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .5C5.4.5 0 5.9 0 12.6c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.9 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.8-1.6 8.2-6.1 8.2-11.4C24 5.9 18.6.5 12 .5Z" />
        </svg>
      </a>
      <a class="btn btn-primary start" href="#start">Get started</a>
      <button class="burger" aria-label="Menu" aria-expanded={open} onclick={() => (open = !open)}>
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<style>
  .nav {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 50;
    height: var(--nav-h);
    display: flex;
    align-items: center;
    transition: background 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease;
    border-bottom: 1px solid transparent;
  }
  .nav.scrolled {
    background: rgba(18, 8, 32, 0.72);
    backdrop-filter: blur(14px);
    border-bottom-color: var(--border-soft);
  }
  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 1.15rem;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .brand:hover { color: #fff; }

  .links {
    display: flex;
    gap: 26px;
    margin-left: auto;
    margin-right: 8px;
  }
  .links a {
    color: var(--text-muted);
    font-size: 0.94rem;
    font-weight: 500;
  }
  .links a:hover { color: #fff; }

  .cta {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .gh { color: var(--text-muted); display: inline-flex; }
  .gh:hover { color: #fff; }

  .burger {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: 0;
    cursor: pointer;
    padding: 6px;
  }
  .burger span {
    width: 22px; height: 2px;
    background: var(--text);
    border-radius: 2px;
  }

  @media (max-width: 820px) {
    .links {
      position: fixed;
      inset: var(--nav-h) 0 auto 0;
      flex-direction: column;
      gap: 4px;
      padding: 16px 24px 24px;
      background: rgba(18, 8, 32, 0.96);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border-soft);
      transform: translateY(-120%);
      transition: transform 0.28s ease;
      margin: 0;
    }
    .links.open { transform: translateY(0); }
    .links a { padding: 12px 0; font-size: 1.05rem; }
    .start { display: none; }
    .burger { display: flex; }
  }
</style>
