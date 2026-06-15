<script lang="ts">
  import { reveal } from '../lib/reveal';

  // An early, deliberately light touch: plant the flag that web is the FIRST
  // target (not the only one) with the rationale, before the main narrative —
  // so visitors don't read the iframe-heavy sections as "web-only".
  const reasons = [
    'A real, browser-enforced sandbox',
    'The biggest developer ecosystem',
    'Ships as a NIP-5A nsite — no servers',
  ];
</script>

<div class="rail-wrap container" use:reveal>
  <div class="rail">
    <div class="flag">
      <span class="pulse" aria-hidden="true"></span>
      <div class="flag-text">
        <strong>Web first — not web only</strong>
        <span>napplet proves the protocol on the web by choice</span>
      </div>
    </div>

    <ul class="reasons">
      {#each reasons as r}
        <li>{r}</li>
      {/each}
    </ul>

    <p class="agnostic">
      The napplet &amp; <strong>NAP</strong> model is transport-agnostic by design — room to
      grow beyond the browser.
    </p>
  </div>
</div>

<style>
  .rail-wrap {
    margin-top: -8px;
    margin-bottom: 8px;
  }
  .rail {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px 28px;
    padding: 18px 24px;
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    background:
      linear-gradient(90deg, rgba(79, 214, 224, 0.06), rgba(176, 107, 255, 0.05));
    backdrop-filter: blur(4px);
  }

  .flag {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .pulse {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 0 0 rgba(79, 214, 224, 0.55);
    animation: pulse 2.2s ease-out infinite;
    flex: none;
  }
  .flag-text {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }
  .flag-text strong {
    font-size: 0.98rem;
    color: var(--text);
  }
  .flag-text span {
    font-size: 0.82rem;
    color: var(--text-dim);
  }

  .reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .reasons li {
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 5px 11px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.02);
  }

  .agnostic {
    flex: 1 1 220px;
    min-width: 200px;
    font-size: 0.82rem;
    color: var(--text-dim);
    margin-left: auto;
    text-align: right;
  }
  .agnostic strong {
    color: var(--accent-bright);
    font-weight: 600;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(79, 214, 224, 0.5); }
    70% { box-shadow: 0 0 0 9px rgba(79, 214, 224, 0); }
    100% { box-shadow: 0 0 0 0 rgba(79, 214, 224, 0); }
  }

  @media (max-width: 920px) {
    .agnostic { text-align: left; margin-left: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse { animation: none; }
  }
</style>
