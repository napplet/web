<script lang="ts">
  import { reveal } from '../lib/reveal';

  const reasons = [
    {
      t: 'Easiest to prove',
      d: 'The iframe gives a real, browser-enforced sandbox out of the box — the security model is something you can demonstrate today, not hand-wave.',
    },
    {
      t: 'A huge developer ecosystem',
      d: 'The web is where the most builders already are. Any web app can become a napplet by speaking the envelope — no new runtime to learn.',
    },
    {
      t: 'Distributes as an nsite',
      d: 'A napplet is just static files, so it ships as a NIP-5A static site (an nsite) over Nostr + Blossom — no servers, no app store gatekeeper.',
    },
  ];
</script>

<section id="platform" class="section platform">
  <div class="container">
    <div class="grid">
      <div class="copy" use:reveal>
        <span class="eyebrow">Web first, not web only</span>
        <h2 class="section-title">Proving it on the web</h2>
        <p class="section-lead">
          NIP-5D is being proven on the web first — but the napplet and
          <strong>NAP</strong> capability model is deliberately transport-agnostic. The
          envelope is just messages, so the same pattern leaves room to grow beyond the
          browser as the protocol matures.
        </p>
      </div>

      <div class="reasons">
        {#each reasons as r, i}
          <div class="reason card" use:reveal={{ delay: i * 70 }}>
            <span class="mark" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{r.t}</h3>
              <p>{r.d}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .platform {
    background:
      radial-gradient(60% 60% at 80% 50%, rgba(79, 214, 224, 0.07), transparent 70%);
  }
  .grid {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: clamp(28px, 5vw, 64px);
    align-items: center;
  }
  .copy .section-lead strong { color: var(--text); }
  .reasons {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .reason {
    display: flex;
    gap: 16px;
    padding: 22px 24px;
    align-items: flex-start;
  }
  .mark {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--cyan);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 4px 9px;
    background: rgba(79, 214, 224, 0.06);
  }
  .reason h3 { font-size: 1.06rem; margin-bottom: 6px; }
  .reason p { color: var(--text-muted); font-size: 0.93rem; }
  @media (max-width: 820px) {
    .grid { grid-template-columns: 1fr; gap: 32px; }
  }
</style>
