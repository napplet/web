<script lang="ts">
  import { reveal } from '../lib/reveal';
  import { PACKAGES } from '../lib/site';
</script>

<section id="packages" class="section">
  <div class="container">
    <div class="head" use:reveal>
      <span class="eyebrow">Packages</span>
      <h2 class="section-title">The napplet SDK</h2>
      <p class="section-lead">
        Small, ESM-only, zero-framework packages. Import the shim for a window global, the
        SDK for named exports, or pull a single NAP domain.
      </p>
    </div>

    <div class="grid">
      {#each PACKAGES as p, i}
        <a class="card pkg" href={p.docs} use:reveal={{ delay: (i % 3) * 60 }}>
          <div class="pkg-top">
            <code class="pkg-name">{p.name}</code>
            <span class="arrow" aria-hidden="true">↗</span>
          </div>
          <p>{p.blurb}</p>
          <div class="links">
            <span class="lk">Docs</span>
            <span class="dot">·</span>
            <span class="lk lk-ext"
              role="link"
              tabindex="0"
              onclick={(e) => { e.preventDefault(); window.open(p.npm, '_blank'); }}
              onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); window.open(p.npm, '_blank'); } }}
            >npm</span>
            {#if p.jsr}
              <span class="dot">·</span>
              <span class="lk lk-ext"
                role="link"
                tabindex="0"
                onclick={(e) => { e.preventDefault(); window.open(p.jsr, '_blank'); }}
                onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); window.open(p.jsr, '_blank'); } }}
              >JSR</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

<style>
  .head { margin-bottom: 48px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  .pkg {
    padding: 26px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: transform 0.18s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .pkg:hover {
    transform: translateY(-4px);
    border-color: var(--accent-deep);
    box-shadow: var(--shadow-card), var(--glow-soft);
  }
  .pkg-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pkg-name {
    color: var(--accent-bright);
    font-size: 0.92rem;
    font-weight: 600;
  }
  .arrow { color: var(--text-dim); }
  .pkg:hover .arrow { color: var(--accent-bright); }
  .pkg p { color: var(--text-muted); font-size: 0.92rem; flex: 1; }
  .links {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    color: var(--text-dim);
  }
  .lk { color: var(--text-muted); }
  .lk-ext:hover { color: var(--accent-bright); cursor: pointer; }
  .dot { opacity: 0.5; }
  @media (max-width: 900px) {
    .grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .grid { grid-template-columns: 1fr; }
  }
</style>
