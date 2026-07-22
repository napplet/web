<script lang="ts">
  import { LINKS } from '../../lib/site';

  // Where the runtime fits: the napplet you write sits on top of the SDK, which
  // speaks the NIP-5D envelope, which a shell/runtime (Kehto) honors against the
  // Nostr network. Read top→down as the trust boundary descends.
  const layers = [
    {
      name: 'Your napplet',
      sub: 'UI + product logic — the one thing it does well',
      tone: 'napplet',
    },
    {
      name: '@napplet/shim · @napplet/sdk',
      sub: 'window.napplet global, or named exports for bundlers',
      tone: 'sdk',
    },
    {
      name: 'NIP-5D envelope',
      sub: '{ type: "domain.action", ...payload } over postMessage',
      tone: 'wire',
    },
    {
      name: 'Shell / runtime',
      sub: 'Brokers every request, enforces ACL, talks to signers & relays',
      tone: 'shell',
      href: LINKS.kehto,
      hrefLabel: 'Kehto — reference runtime',
    },
    {
      name: 'Nostr network',
      sub: 'Relays, signers, the wider protocol',
      tone: 'net',
    },
  ];
</script>

<div class="stack" role="img" aria-label="Layer stack from top to bottom: your napplet, the @napplet shim or sdk, the NIP-5D envelope over postMessage, the shell or runtime (Kehto reference runtime) which brokers every request to signers and relays, and the Nostr network.">
  {#each layers as layer, i}
    <div class="layer layer-{layer.tone}" style="--i:{i}">
      <div class="layer-main">
        <span class="layer-name">{layer.name}</span>
        <span class="layer-sub">{layer.sub}</span>
      </div>
      {#if layer.href}
        <a class="layer-link" href={layer.href} target="_blank" rel="noopener">
          {layer.hrefLabel} ↗
        </a>
      {/if}
    </div>
    {#if i < layers.length - 1}
      <div class="connector" aria-hidden="true">
        <span class="conn-dot"></span>
      </div>
    {/if}
  {/each}

  <div class="trust" aria-hidden="true">
    <span class="trust-cap">napplet side</span>
    <span class="trust-cap">shell side</span>
  </div>
</div>

<style>
  .stack {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 620px;
    margin-inline: auto;
  }
  .layer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 20px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: linear-gradient(180deg, var(--surface), var(--bg-soft));
    position: relative;
    z-index: 1;
  }
  .layer-name { font-weight: 650; display: block; }
  .layer-sub {
    display: block;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: 2px;
  }
  .layer-napplet { border-color: var(--accent-deep); background: rgba(176, 107, 255, 0.08); }
  .layer-sdk { border-color: var(--border); }
  .layer-wire {
    border-color: var(--accent);
    background: linear-gradient(180deg, rgba(176, 107, 255, 0.12), rgba(123, 47, 247, 0.04));
  }
  .layer-wire .layer-name { font-family: var(--font-mono); font-size: 0.95rem; }
  .layer-shell { border-color: var(--accent); box-shadow: var(--glow-soft); }
  .layer-net { border-color: var(--cyan); }

  .layer-link {
    font-size: 0.8rem;
    font-family: var(--font-mono);
    white-space: nowrap;
    padding: 6px 10px;
    border: 1px solid var(--accent-deep);
    border-radius: 8px;
    background: rgba(176, 107, 255, 0.08);
  }

  .connector {
    height: 22px;
    display: flex;
    justify-content: center;
    position: relative;
  }
  .connector::before {
    content: '';
    width: 2px;
    height: 100%;
    background: linear-gradient(180deg, var(--accent-deep), var(--accent));
    opacity: 0.5;
  }
  .conn-dot {
    position: absolute;
    top: 50%;
    width: 7px; height: 7px;
    margin-top: -3.5px;
    border-radius: 50%;
    background: var(--accent-bright);
    box-shadow: 0 0 8px var(--accent);
    animation: drop 2.4s ease-in-out infinite;
  }
  .connector:nth-of-type(4) .conn-dot { animation-delay: 0.6s; }
  .connector:nth-of-type(6) .conn-dot { animation-delay: 1.2s; }

  .trust {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: none;
  }

  @keyframes drop {
    0% { transform: translateY(-10px); opacity: 0; }
    40% { opacity: 1; }
    100% { transform: translateY(10px); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .conn-dot { animation: none; }
  }
  @media (max-width: 420px) {
    .layer {
      align-items: flex-start;
      flex-direction: column;
    }
    .layer-main,
    .layer-link {
      min-width: 0;
      max-width: 100%;
    }
    .layer-link {
      white-space: normal;
      overflow-wrap: anywhere;
    }
  }
</style>
