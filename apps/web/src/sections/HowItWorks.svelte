<script lang="ts">
  import { reveal } from '../lib/reveal';
  import EnvelopeFlow from '../components/diagrams/EnvelopeFlow.svelte';

  const steps = [
    {
      n: '01',
      t: 'One envelope, every message',
      d: 'Napplet and shell speak a single JSON wire format: { type: "domain.action", ...payload } over postMessage. No SDK lock-in — it’s just messages.',
    },
    {
      n: '02',
      t: 'Identity without a handshake',
      d: 'The shell binds each iframe’s unforgeable MessageEvent.source to a napplet at creation. No login dance, no spoofing.',
    },
    {
      n: '03',
      t: 'Sandboxed by construction',
      d: 'Iframes use allow-scripts only — no allow-same-origin. Napplets can’t read shell storage, cookies or keys. Everything sensitive is proxied.',
    },
    {
      n: '04',
      t: 'Capabilities, negotiated',
      d: 'A napplet calls window.napplet.shell.supports("relay") to discover what a shell offers. NAP domains carve the protocol into modular capabilities.',
    },
  ];
</script>

<section id="how" class="section">
  <div class="container">
    <div class="head" use:reveal>
      <span class="eyebrow">How it works</span>
      <h2 class="section-title">A message bus with a trust boundary</h2>
      <p class="section-lead">
        The shell is the only thing that touches keys, relays and storage. Napplets just
        send envelopes and get answers back.
      </p>
    </div>

    <div class="stage" use:reveal={{ delay: 60 }}>
      <EnvelopeFlow />
    </div>

    <div class="steps">
      {#each steps as s, i}
        <div class="step" use:reveal={{ delay: i * 70 }}>
          <span class="num">{s.n}</span>
          <div>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .head { margin-bottom: 44px; }
  .stage {
    border: 1px solid var(--border-soft);
    border-radius: 22px;
    padding: clamp(20px, 4vw, 40px);
    background: rgba(18, 8, 32, 0.5);
    box-shadow: var(--shadow-card);
    margin-bottom: 44px;
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 28px 40px;
  }
  .step { display: flex; gap: 16px; }
  .num {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--accent-bright);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 4px 9px;
    height: fit-content;
    background: rgba(176, 107, 255, 0.06);
  }
  .step h3 { font-size: 1.1rem; margin-bottom: 7px; }
  .step p { color: var(--text-muted); font-size: 0.94rem; }
  @media (max-width: 720px) {
    .steps { grid-template-columns: 1fr; gap: 22px; }
  }
</style>
