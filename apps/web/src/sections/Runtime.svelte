<script lang="ts">
  import { reveal } from '../lib/reveal';
  import { LINKS } from '../lib/site';
  import LayerStack from '../components/diagrams/LayerStack.svelte';

  // Two doors into the same section, so neither audience bounces:
  // existing client authors (become a shell) and protocol developers
  // (build a runtime / shape the NAPs).
  const audiences = [
    {
      tag: 'For client developers',
      title: 'Already built a Nostr client?',
      body: 'You’ve solved the hard parts — relay pools, signer flows, storage, key handling. Expose them through NAP interfaces and your client becomes a shell. Host third-party napplets without rewriting your app, and turn your client into a platform.',
      points: ['Reuse your existing relay & signer plumbing', 'Host an ecosystem instead of shipping every feature', 'Compete on trust & UX, not feature count'],
    },
    {
      tag: 'For protocol developers',
      title: 'Want to shape the protocol?',
      body: 'NIP-5D is small and the surface is well-defined. Stand up a runtime, implement the NAP capability domains, and help decide what the protocol becomes. Conformance work and new NAPs are where the design is still being written.',
      points: ['Implement NIP-5D — transport, identity, dispatch', 'Define & extend NAP / NUB capability domains', 'Drive conformance against the reference runtime'],
    },
  ];
</script>

<section id="runtimes" class="section runtimes">
  <div class="container">
    <div class="head" use:reveal>
      <span class="eyebrow">Runtimes &amp; shells</span>
      <h2 class="section-title">Any shell can be a runtime</h2>
      <p class="section-lead">
        A <strong>runtime</strong> is the host that actually runs your napplet — it brokers
        your requests to a signer, extension or relay and talks to the network. On the web,
        a runtime is any app that honors <strong>NIP-5D</strong> — the security posture and
        transport for napplets — and there can be many. That’s the point.
      </p>
    </div>

    <div class="stage" use:reveal={{ delay: 80 }}>
      <LayerStack />
    </div>

    <div class="audiences">
      {#each audiences as a, i}
        <div class="card aud" use:reveal={{ delay: i * 80 }}>
          <span class="aud-tag">{a.tag}</span>
          <h3>{a.title}</h3>
          <p>{a.body}</p>
          <ul>
            {#each a.points as pt}
              <li>{pt}</li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>

    <!-- The reference implementation: full nod to Kehto -->
    <div class="kehto card" use:reveal={{ delay: 80 }}>
      <div class="kehto-glow" aria-hidden="true"></div>
      <div class="kehto-body">
        <span class="ref-tag">Reference runtime</span>
        <h3>Kehto implements NIP-5D end-to-end</h3>
        <p>
          The reference shell where the protocol runs for real — host a napplet, watch the
          envelopes flow, and use it as the conformance target while you build a runtime of
          your own.
        </p>
        <div class="kehto-actions">
          <a class="btn btn-primary" href={LINKS.kehto} target="_blank" rel="noopener">
            Explore Kehto ↗
          </a>
          <a class="btn btn-ghost" href={LINKS.docs}>How shells work</a>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .head { margin-bottom: 44px; max-width: 760px; }
  .head strong { color: var(--text); }

  .stage {
    border: 1px solid var(--border-soft);
    border-radius: 22px;
    padding: clamp(22px, 4vw, 44px);
    background: rgba(18, 8, 32, 0.5);
    box-shadow: var(--shadow-card);
  }

  .audiences {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-top: 28px;
  }
  .aud { padding: 30px; }
  .aud-tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-bright);
    padding: 4px 10px;
    border: 1px solid var(--accent-deep);
    border-radius: 999px;
    background: rgba(176, 107, 255, 0.06);
    margin-bottom: 16px;
  }
  .aud h3 { font-size: 1.3rem; margin-bottom: 12px; }
  .aud > p { color: var(--text-muted); font-size: 0.96rem; }
  .aud ul {
    margin: 18px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .aud li {
    position: relative;
    padding-left: 22px;
    font-size: 0.9rem;
    color: var(--text);
  }
  .aud li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 7px;
    height: 7px;
    border-radius: 2px;
    background: var(--grad-accent);
  }

  .kehto {
    position: relative;
    margin-top: 18px;
    padding: clamp(28px, 4vw, 44px);
    border-color: var(--accent-deep);
    overflow: hidden;
  }
  .kehto-glow {
    position: absolute;
    inset: -40% 40% auto -10%;
    height: 200%;
    background: radial-gradient(50% 50% at 30% 50%, rgba(123, 47, 247, 0.28), transparent 70%);
    pointer-events: none;
  }
  .kehto-body { position: relative; max-width: 60ch; }
  .ref-tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--cyan);
    padding: 4px 11px;
    border: 1px solid var(--cyan);
    border-radius: 999px;
    background: rgba(79, 214, 224, 0.06);
    margin-bottom: 16px;
  }
  .kehto h3 { font-size: clamp(1.3rem, 2.4vw, 1.7rem); margin-bottom: 12px; }
  .kehto p { color: var(--text-muted); }
  .kehto-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 24px;
  }

  @media (max-width: 760px) {
    .audiences { grid-template-columns: 1fr; }
  }
</style>
