<script lang="ts">
  import { reveal } from '../lib/reveal';

  const benefits = [
    {
      icon: 'shield',
      t: 'Every request goes through the shell',
      d: 'Napplets never call a signer, relay or store directly. They ask the shell, which brokers each request — to a remote signer, an extension, or its own services — and can say no.',
    },
    {
      icon: 'cube',
      t: 'Real sandbox isolation',
      d: 'allow-scripts without allow-same-origin: no service workers, no shell storage, no cross-origin reach. Each napplet does one thing, so its surface and permissions stay small.',
    },
    {
      icon: 'blocks',
      t: 'Compose, don’t rebuild',
      d: 'Drop a great feed next to a great messenger. Napplets are interchangeable parts, not features welded into one app.',
    },
    {
      icon: 'users',
      t: 'A bigger pool of builders',
      d: 'The hard Nostr protocol lives behind the shell. Developers can ship a useful napplet without deep protocol knowledge — and without putting users at risk.',
    },
    {
      icon: 'user',
      t: 'The user stays in control',
      d: 'The shell brokers every relay, storage and signing request, and scopes storage per napplet. Consent lives with the host, not the app.',
    },
    {
      icon: 'swap',
      t: 'Portable across shells',
      d: 'Write to NIP-5D, run in any compatible shell. No vendor SDK lock-in — the protocol is the contract.',
    },
  ];

  const paths: Record<string, string> = {
    shield: 'M12 2 4 5v6c0 5 3.4 8.4 8 11 4.6-2.6 8-6 8-11V5l-8-3Zm0 4.2 4 1.5V11c0 3.1-1.8 5.4-4 7-2.2-1.6-4-3.9-4-7V7.7l4-1.5Z',
    cube: 'M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3ZM5 9.7l6 3.4v6.7l-6-3.3V9.7Zm14 0v6.8l-6 3.3v-6.7l6-3.4Z',
    blocks: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
    users: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.7 0-6 1.3-6 4v2h8v-2c0-1 .3-1.9 .9-2.6A6 6 0 0 0 8 13Zm8 0c-.3 0-.7 0-1 .1 1.2.9 2 2.1 2 3.9v2h6v-2c0-2.7-3.3-4-7-4Z',
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
