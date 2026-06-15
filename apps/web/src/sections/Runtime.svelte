<script lang="ts">
  import { reveal } from '../lib/reveal';
  import { LINKS } from '../lib/site';
  import LayerStack from '../components/diagrams/LayerStack.svelte';
</script>

<section id="runtime" class="section">
  <div class="container">
    <div class="head" use:reveal>
      <span class="eyebrow">Where the runtime fits</span>
      <h2 class="section-title">You write the napplet. A shell runs it.</h2>
      <p class="section-lead">
        Your code targets the <code>@napplet</code> packages and the NIP-5D envelope. The
        shell — the <strong>runtime</strong> — is what brokers your requests to a signer,
        extension or relay and talks to the network.
        <a href={LINKS.kehto} target="_blank" rel="noopener">Kehto</a> is the reference
        runtime you can build against today.
      </p>
    </div>

    <div class="stage" use:reveal={{ delay: 80 }}>
      <LayerStack />
    </div>

    <div class="cta-card card" use:reveal={{ delay: 120 }}>
      <div>
        <h3>Need a shell to test against?</h3>
        <p>Kehto implements NIP-5D as the reference runtime — host your napplet, watch the envelopes flow.</p>
      </div>
      <a class="btn btn-primary" href={LINKS.kehto} target="_blank" rel="noopener">
        Explore Kehto ↗
      </a>
    </div>
  </div>
</section>

<style>
  .head { margin-bottom: 44px; max-width: 720px; }
  .head code {
    color: var(--accent-bright);
    background: rgba(176, 107, 255, 0.1);
    padding: 1px 6px;
    border-radius: 5px;
  }
  .head strong { color: var(--text); }
  .stage {
    border: 1px solid var(--border-soft);
    border-radius: 22px;
    padding: clamp(22px, 4vw, 44px);
    background: rgba(18, 8, 32, 0.5);
    box-shadow: var(--shadow-card);
  }
  .cta-card {
    margin-top: 28px;
    padding: 26px 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    border-color: var(--accent-deep);
  }
  .cta-card h3 { font-size: 1.18rem; margin-bottom: 6px; }
  .cta-card p { color: var(--text-muted); font-size: 0.95rem; max-width: 48ch; }
  @media (max-width: 680px) {
    .cta-card { flex-direction: column; align-items: flex-start; }
  }
</style>
