<script lang="ts">
  // The centerpiece contrast: a tangled monolithic client (rebuilt by every
  // app) vs. a NIP-5D shell hosting swappable, sandboxed napplets over a
  // single mediation layer. Pure SVG + CSS so it stays crisp and themeable.

  const monolithFeatures = [
    'Feed', 'DMs', 'Profiles', 'Relays', 'Signing', 'Storage', 'Search', 'Zaps',
    'Settings', 'Media', 'Notifs', 'Lists',
  ];

  const napplets = [
    { label: 'Feed', x: 0 },
    { label: 'Chat', x: 1 },
    { label: 'Profile', x: 2 },
    { label: 'Relays', x: 3 },
  ];
</script>

<div class="mvs" role="img"
  aria-label="Left: a traditional Nostr client is one tangled monolith that every app rebuilds. Right: a NIP-5D shell hosts swappable sandboxed napplets over one shared mediation layer that handles signing, relays, and storage.">
  <!-- ── Traditional monolith ─────────────────────────────────────────── -->
  <div class="side">
    <div class="side-head">
      <span class="tag tag-dim">Today</span>
      <h3>One monolith, rebuilt every time</h3>
    </div>

    <div class="stack">
      <div class="ghost ghost-2"></div>
      <div class="ghost ghost-1"></div>
      <div class="monolith">
        <div class="mono-bar">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="mono-title">nostr-client</span>
        </div>
        <div class="mono-grid">
          {#each monolithFeatures as f}
            <span class="chip">{f}</span>
          {/each}
        </div>
        <div class="tangle">
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M5,35 C60,5 80,38 120,12 S180,30 195,8" />
            <path d="M5,12 C50,38 90,6 130,34 S175,8 195,32" />
          </svg>
        </div>
      </div>
    </div>
    <p class="caption">Signing, relays &amp; UI all fused together. Every client re-implements the same surface — and wires up your signer and relays itself.</p>
  </div>

  <!-- ── The divider ──────────────────────────────────────────────────── -->
  <div class="vs" aria-hidden="true"><span>NIP&#8209;5D</span></div>

  <!-- ── NIP-5D shell + napplets ──────────────────────────────────────── -->
  <div class="side">
    <div class="side-head">
      <span class="tag tag-accent">With napplets</span>
      <h3>A shell hosts swappable napplets</h3>
    </div>

    <div class="shell">
      <div class="shell-bar">
        <span class="dot dot-a"></span><span class="dot dot-a"></span><span class="dot dot-a"></span>
        <span class="mono-title">shell</span>
      </div>
      <div class="napplet-grid">
        {#each napplets as n, i}
          <div class="napplet" style="--i:{i}">
            <span class="np-frame">sandbox</span>
            <span class="np-label">{n.label}</span>
          </div>
        {/each}
      </div>
      <div class="mediation">
        <span class="med-label">mediation</span>
        <span class="med-pill">signing</span>
        <span class="med-pill">relays</span>
        <span class="med-pill">storage</span>
      </div>
    </div>
    <p class="caption">Each napplet does one thing, sandboxed. The shell brokers every sensitive call — to a signer, extension or relay. Swap napplets like apps.</p>
  </div>
</div>

<style>
  .mvs {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: clamp(12px, 3vw, 36px);
    align-items: stretch;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .side-head h3 {
    font-size: 1.12rem;
    margin-top: 10px;
    color: var(--text);
  }
  .tag {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
  }
  .tag-dim { color: var(--text-dim); }
  .tag-accent {
    color: var(--accent-bright);
    border-color: var(--accent-deep);
    background: rgba(176, 107, 255, 0.08);
  }

  /* Monolith */
  .stack { position: relative; flex: 1; }
  .ghost {
    position: absolute;
    inset: 0;
    border: 1px solid var(--border-soft);
    border-radius: 14px;
    background: var(--bg-soft);
  }
  .ghost-1 { transform: translate(10px, 10px); opacity: 0.5; }
  .ghost-2 { transform: translate(20px, 20px); opacity: 0.25; }

  .monolith,
  .shell {
    position: relative;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: linear-gradient(180deg, var(--surface), var(--bg-soft));
    overflow: hidden;
  }
  .mono-bar,
  .shell-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-soft);
    background: rgba(0, 0, 0, 0.2);
  }
  .dot {
    width: 9px; height: 9px; border-radius: 50%;
    background: #5a4a78;
  }
  .dot-a { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
  .mono-title {
    margin-left: 8px;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--text-dim);
  }
  .mono-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 18px;
  }
  .chip {
    font-size: 0.78rem;
    padding: 6px 11px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-soft);
    color: var(--text-muted);
  }
  .tangle {
    height: 40px;
    margin: 0 18px 18px;
    opacity: 0.55;
  }
  .tangle svg { width: 100%; height: 100%; }
  .tangle path {
    fill: none;
    stroke: var(--magenta);
    stroke-width: 1.4;
    stroke-dasharray: 4 5;
    opacity: 0.6;
  }

  /* Shell */
  .shell {
    box-shadow: var(--glow-soft);
    border-color: var(--accent-deep);
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .napplet-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 18px;
    flex: 1;
  }
  .napplet {
    position: relative;
    border: 1px dashed var(--accent-deep);
    border-radius: 10px;
    background: rgba(176, 107, 255, 0.06);
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: float 5s ease-in-out infinite;
    animation-delay: calc(var(--i) * 0.4s);
  }
  .np-frame {
    position: absolute;
    top: 6px; left: 8px;
    font-family: var(--font-mono);
    font-size: 0.56rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    opacity: 0.7;
  }
  .np-label {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text);
  }
  .mediation {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 18px;
    border-top: 1px solid var(--accent-ink);
    background: linear-gradient(180deg, rgba(123, 47, 247, 0.16), rgba(123, 47, 247, 0.04));
  }
  .med-label {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-bright);
    margin-right: 4px;
  }
  .med-pill {
    font-size: 0.76rem;
    padding: 5px 10px;
    border-radius: 7px;
    background: rgba(176, 107, 255, 0.12);
    border: 1px solid var(--accent-deep);
    color: var(--text);
  }

  .caption {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  /* Divider */
  .vs {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .vs span {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    color: var(--accent-bright);
    padding: 8px 6px;
    border: 1px solid var(--border);
    border-radius: 999px;
    writing-mode: vertical-rl;
    background: var(--bg-soft);
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  @media (max-width: 860px) {
    .mvs { grid-template-columns: 1fr; }
    .vs { padding: 6px 0; }
    .vs span { writing-mode: horizontal-tb; }
  }
  @media (prefers-reduced-motion: reduce) {
    .napplet { animation: none; }
  }
</style>
