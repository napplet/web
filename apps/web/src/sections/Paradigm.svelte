<script lang="ts">
  import { reveal } from '../lib/reveal';

  const shifts = [
    {
      from: 'Clients compete on features',
      to: 'Shells compete on trust & UX',
      d: 'When any napplet can run anywhere, a shell wins by being safer and nicer to use — not by hoarding features.',
    },
    {
      from: 'Pick one app, get its whole worldview',
      to: 'Assemble your own client',
      d: 'Mix a feed from one team, a wallet from another, a niche tool from a solo dev. Your client becomes a composition.',
    },
    {
      from: 'Big teams to ship anything useful',
      to: 'One dev ships one great napplet',
      d: 'The surface to build is tiny: render UI, send envelopes. The shell handles the hard, dangerous parts.',
    },
    {
      from: 'Trust the whole client with your key',
      to: 'Trust the shell, sandbox the rest',
      d: 'A single audited host holds the keys. Everything else runs contained, asking permission for what it needs.',
    },
  ];
</script>

<section id="paradigm" class="section paradigm">
  <div class="container">
    <div class="head" use:reveal>
      <span class="eyebrow">The paradigm shift</span>
      <h2 class="section-title">An app store, not an app</h2>
      <p class="section-lead">
        Treat the shell like an operating system for Nostr. Napplets become installable,
        swappable programs — and the ecosystem stops being a handful of monoliths.
      </p>
    </div>

    <div class="shifts">
      {#each shifts as s, i}
        <div class="shift-row" use:reveal={{ delay: i * 70 }}>
          <div class="ft">
            <span class="from">{s.from}</span>
            <span class="arrow" aria-hidden="true">→</span>
            <span class="to gradient-text">{s.to}</span>
          </div>
          <p>{s.d}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .paradigm {
    background:
      radial-gradient(70% 60% at 50% 100%, rgba(255, 107, 199, 0.08), transparent 70%);
  }
  .head { margin-bottom: 48px; }
  .shifts {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--border-soft);
    border-radius: 18px;
    overflow: hidden;
  }
  .shift-row {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 28px;
    align-items: center;
    padding: 26px clamp(20px, 3vw, 34px);
    border-bottom: 1px solid var(--border-soft);
    background: linear-gradient(180deg, var(--surface), var(--bg-soft));
  }
  .shift-row:last-child { border-bottom: 0; }
  .ft {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .from {
    color: var(--text-dim);
    text-decoration: line-through;
    text-decoration-color: rgba(255, 107, 199, 0.5);
    font-size: 0.98rem;
  }
  .arrow { color: var(--accent); font-weight: 700; }
  .to { font-weight: 700; font-size: 1.16rem; }
  .shift-row p { color: var(--text-muted); font-size: 0.95rem; }
  @media (max-width: 800px) {
    .shift-row { grid-template-columns: 1fr; gap: 12px; }
  }
</style>
