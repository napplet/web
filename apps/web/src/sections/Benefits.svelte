<script lang="ts">
  import { reveal } from '../lib/reveal';

  const benefits = [
    {
      icon: 'key',
      t: 'Keys never leave the shell',
      d: 'Napplets can’t see your signing key. They request signatures; the shell decides. One trusted place holds the secrets.',
    },
    {
      icon: 'shield',
      t: 'Real sandbox isolation',
      d: 'allow-scripts without allow-same-origin means no service workers, no shell localStorage, no cross-origin reach. Contained by the browser itself.',
    },
    {
      icon: 'blocks',
      t: 'Compose, don’t rebuild',
      d: 'Drop a great feed next to a great messenger. Napplets are interchangeable parts, not features welded into one app.',
    },
    {
      icon: 'scope',
      t: 'A smaller attack surface',
      d: 'Each napplet does one thing. Less code, clearer intent, narrower permissions — and an ACL keyed per napplet.',
    },
    {
      icon: 'user',
      t: 'The user stays in control',
      d: 'The shell mediates every relay, storage and signing call, and scopes storage per napplet. Consent lives with the host, not the app.',
    },
    {
      icon: 'swap',
      t: 'Portable across shells',
      d: 'Write to NIP-5D, run in any compatible shell. No vendor SDK lock-in — the protocol is the contract.',
    },
  ];

  const paths: Record<string, string> = {
    key: 'M14 7a4 4 0 1 0-3.9 5h.9l2 2 2-2 2 2 2-2-2-2a4 4 0 0 0-3-1Zm-6 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
    shield: 'M12 2 4 5v6c0 5 3.4 8.4 8 11 4.6-2.6 8-6 8-11V5l-8-3Zm0 4.2 4 1.5V11c0 3.1-1.8 5.4-4 7-2.2-1.6-4-3.9-4-7V7.7l4-1.5Z',
    blocks: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
    scope: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5Z',
    swap: 'M7 7h9l-2.5-2.5L15 3l5 5-5 5-1.5-1.5L16 9H7V7Zm10 10H8l2.5 2.5L9 21l-5-5 5-5 1.5 1.5L8 15h9v2Z',
  };
</script>

<section id="benefits" class="section">
  <div class="container">
    <div class="head" use:reveal>
      <span class="eyebrow">Benefits</span>
      <h2 class="section-title">Why the pattern wins</h2>
      <p class="section-lead">
        Splitting trust from UI isn’t just tidy — it changes what’s safe, what’s reusable,
        and who’s in control.
      </p>
    </div>

    <div class="grid">
      {#each benefits as b, i}
        <div class="card benefit" use:reveal={{ delay: (i % 3) * 70 }}>
          <span class="ic" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d={paths[b.icon]} />
            </svg>
          </span>
          <h3>{b.t}</h3>
          <p>{b.d}</p>
        </div>
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
  .benefit { padding: 28px; }
  .ic {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px; height: 44px;
    border-radius: 12px;
    background: rgba(176, 107, 255, 0.1);
    border: 1px solid var(--accent-deep);
    color: var(--accent-bright);
    margin-bottom: 18px;
  }
  .benefit h3 { font-size: 1.12rem; margin-bottom: 9px; }
  .benefit p { color: var(--text-muted); font-size: 0.94rem; }
  @media (max-width: 900px) {
    .grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .grid { grid-template-columns: 1fr; }
  }
</style>
