<script lang="ts">
  import { LINKS } from '../lib/site';
  import { reveal } from '../lib/reveal';
</script>

<section id="top" class="hero">
  <div class="container hero-inner">
    <div class="hero-copy">
      <span class="badge" use:reveal>
        <span class="ping"></span> NIP-5D · Nostr Web Applets
      </span>

      <h1 use:reveal={{ delay: 60 }}>
        Composable Nostr apps,<br />
        <span class="gradient-text">not monoliths.</span>
      </h1>

      <p class="lede" use:reveal={{ delay: 120 }}>
        A <strong>napplet</strong> is a small, sandboxed app that does one thing well.
        It runs inside a host <strong>shell</strong> and delegates signing, storage and
        relay access over a simple <code>postMessage</code> protocol — so apps stop
        rebuilding the same client, and your keys never leave the shell.
      </p>

      <div class="actions" use:reveal={{ delay: 180 }}>
        <a class="btn btn-primary" href="#start">Get started</a>
        <a class="btn btn-ghost" href={LINKS.spec} target="_blank" rel="noopener">
          Read NIP-5D ↗
        </a>
        <a class="btn btn-ghost" href={LINKS.docs}>Documentation</a>
      </div>

      <div class="trust-row" use:reveal={{ delay: 240 }}>
        <span><code>allow-scripts</code> only — no <code>allow-same-origin</code></span>
        <span class="sep">·</span>
        <span>keys held by the shell</span>
        <span class="sep">·</span>
        <span>any shell, any napplet</span>
      </div>
    </div>

    <aside class="hero-card" use:reveal={{ delay: 200 }} aria-hidden="true">
      <div class="term">
        <div class="term-bar">
          <span></span><span></span><span></span>
          <em>my-napplet.ts</em>
        </div>
        <pre><code><span class="c-key">import</span> <span class="c-pun">&#123;</span> relay <span class="c-pun">&#125;</span> <span class="c-key">from</span> <span class="c-str">'@napplet/sdk'</span>;

<span class="c-com">// the shell proxies the relay — you never</span>
<span class="c-com">// touch a websocket or a signing key.</span>
<span class="c-key">const</span> sub <span class="c-pun">=</span> relay<span class="c-pun">.</span><span class="c-fn">subscribe</span><span class="c-pun">(</span><span class="c-pun">&#123;</span>
  filters<span class="c-pun">:</span> <span class="c-pun">[&#123;</span> kinds<span class="c-pun">:</span> <span class="c-num">[1]</span>, limit<span class="c-pun">:</span> <span class="c-num">20</span> <span class="c-pun">&#125;]</span>,
  onEvent<span class="c-pun">:</span> <span class="c-pun">(</span>e<span class="c-pun">)</span> <span class="c-pun">=&gt;</span> <span class="c-fn">render</span><span class="c-pun">(</span>e<span class="c-pun">)</span>,
<span class="c-pun">&#125;)</span>;</code></pre>
      </div>
      <div class="orbit orbit-1">sandbox</div>
      <div class="orbit orbit-2">shell-mediated</div>
    </aside>
  </div>
</section>

<style>
  .hero {
    padding-top: calc(var(--nav-h) + clamp(48px, 9vw, 110px));
    padding-bottom: clamp(48px, 8vw, 96px);
  }
  .hero-inner {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: clamp(28px, 5vw, 64px);
    align-items: center;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    letter-spacing: 0.06em;
    color: var(--accent-bright);
    padding: 7px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: rgba(176, 107, 255, 0.06);
  }
  .ping {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 rgba(176, 107, 255, 0.6);
    animation: ping 2s ease-out infinite;
  }
  h1 {
    font-size: clamp(2.6rem, 6.4vw, 4.6rem);
    margin-top: 24px;
    letter-spacing: -0.03em;
  }
  .lede {
    margin-top: 24px;
    font-size: clamp(1.05rem, 1.5vw, 1.28rem);
    color: var(--text-muted);
    max-width: 54ch;
  }
  .lede strong { color: var(--text); font-weight: 650; }
  .lede code,
  .trust-row code {
    color: var(--accent-bright);
    background: rgba(176, 107, 255, 0.1);
    padding: 1px 6px;
    border-radius: 5px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 32px;
  }
  .trust-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
    font-size: 0.86rem;
    color: var(--text-dim);
  }
  .trust-row .sep { opacity: 0.5; }

  /* Code card */
  .hero-card { position: relative; }
  .term {
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    background: linear-gradient(180deg, #1a0f2b, #140a22);
    box-shadow: var(--shadow-card), var(--glow-soft);
  }
  .term-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 11px 14px;
    background: rgba(0, 0, 0, 0.28);
    border-bottom: 1px solid var(--border-soft);
  }
  .term-bar span {
    width: 10px; height: 10px; border-radius: 50%;
    background: #5a4a78;
  }
  .term-bar span:first-child { background: #ff6b8b; }
  .term-bar span:nth-child(2) { background: #ffce6b; }
  .term-bar span:nth-child(3) { background: #6bffae; }
  .term-bar em {
    margin-left: 8px;
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--text-dim);
  }
  pre {
    margin: 0;
    padding: 20px;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    line-height: 1.7;
    overflow-x: auto;
    color: var(--text);
  }
  .c-key { color: #c98bff; }
  .c-str { color: #6bffae; }
  .c-com { color: var(--text-dim); font-style: italic; }
  .c-fn { color: #6bd5ff; }
  .c-num { color: #ffce6b; }
  .c-pun { color: var(--text-muted); }

  .orbit {
    position: absolute;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 11px;
    border-radius: 999px;
    border: 1px solid var(--accent-deep);
    background: rgba(18, 8, 32, 0.9);
    color: var(--accent-bright);
    backdrop-filter: blur(4px);
  }
  .orbit-1 { top: -14px; right: 18px; animation: float 6s ease-in-out infinite; }
  .orbit-2 { bottom: -14px; left: 14px; animation: float 6s ease-in-out infinite 1.5s; }

  @keyframes ping {
    0% { box-shadow: 0 0 0 0 rgba(176, 107, 255, 0.55); }
    70% { box-shadow: 0 0 0 10px rgba(176, 107, 255, 0); }
    100% { box-shadow: 0 0 0 0 rgba(176, 107, 255, 0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-7px); }
  }

  @media (max-width: 900px) {
    .hero-inner { grid-template-columns: 1fr; }
    .hero-card { order: -1; max-width: 460px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ping, .orbit { animation: none; }
  }
</style>
