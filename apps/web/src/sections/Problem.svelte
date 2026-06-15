<script lang="ts">
  import { reveal } from '../lib/reveal';

  const pains = [
    {
      t: 'Everyone rebuilds everything',
      d: 'Feeds, DMs, profiles, relay management, search — every client re-implements the same surface from scratch.',
    },
    {
      t: 'Your key is everywhere',
      d: 'Each app you install asks for direct signing access. The more apps that hold that power, the larger your exposure.',
    },
    {
      t: 'No real composition',
      d: 'You can’t drop one team’s great feed into another team’s great messenger. Features are welded to clients.',
    },
    {
      t: 'All-or-nothing trust',
      d: 'Installing a client means trusting the whole thing — its code, its relays, its handling of your data.',
    },
  ];
</script>

<section id="problem" class="section">
  <div class="container">
    <div class="head" use:reveal>
      <span class="eyebrow">The problem</span>
      <h2 class="section-title">Nostr clients are monoliths</h2>
      <p class="section-lead">
        The protocol is composable. The clients are not. Each one is a giant app that
        owns your keys and reinvents the same building blocks — so good ideas stay
        trapped inside whichever client shipped them.
      </p>
    </div>

    <div class="grid">
      {#each pains as p, i}
        <div class="card pain" use:reveal={{ delay: i * 70 }}>
          <h3>{p.t}</h3>
          <p>{p.d}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .head { margin-bottom: 48px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }
  .pain { padding: 26px; }
  .pain h3 {
    font-size: 1.16rem;
    margin-bottom: 10px;
  }
  .pain p { color: var(--text-muted); font-size: 0.96rem; }
  @media (max-width: 720px) {
    .grid { grid-template-columns: 1fr; }
  }
</style>
