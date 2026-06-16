<script lang="ts">
  // Animated request/response across the postMessage boundary. A napplet sends a
  // JSON envelope; the shell mediates the call and streams results back. The shell
  // brokers far more than relays — the diagram cycles through the NAP capability
  // domains it fronts, so "trusted host" reads as the whole capability seam, not
  // just a relay proxy. Packets are CSS-animated; the rotating text crossfades
  // via a pure-CSS fade replayed by each {#key} remount (no JS transition dep).

  type Nap = {
    domain: string;
    call: string;
    out: string;
    in: string;
    destKind: string;
    destName: string;
  };

  // Intuitive, in-flight NAP domains the shell mediates. CLASS/CONNECT (deferred)
  // and less self-explanatory domains are left out on purpose — this is a teaser
  // for the breadth of the seam, not the full registry.
  const naps: Nap[] = [
    {
      domain: 'relay',
      call: 'window.napplet.relay<wbr />.subscribe()',
      out: '{ type: "relay.subscribe", id, filters }',
      in: '{ type: "relay.event", subId, event }',
      destKind: 'nostr',
      destName: 'relays',
    },
    {
      domain: 'storage',
      call: 'window.napplet.storage<wbr />.set()',
      out: '{ type: "storage.set", id, key, value }',
      in: '{ type: "storage.set.result", id, ok }',
      destKind: 'scoped',
      destName: 'key-value',
    },
    {
      domain: 'media',
      call: 'window.napplet.media<wbr />.play()',
      out: '{ type: "media.play", id, src }',
      in: '{ type: "media.state", playing }',
      destKind: 'host',
      destName: 'media session',
    },
    {
      domain: 'notify',
      call: 'window.napplet.notify<wbr />.show()',
      out: '{ type: "notify.show", id, title, body }',
      in: '{ type: "notify.show.result", id, ok }',
      destKind: 'system',
      destName: 'notifications',
    },
    {
      domain: 'theme',
      call: 'window.napplet.theme<wbr />.get()',
      out: '{ type: "theme.get", id }',
      in: '{ type: "theme.changed", tokens }',
      destKind: 'shell',
      destName: 'theme tokens',
    },
    {
      domain: 'value',
      call: 'window.napplet.value<wbr />.zap()',
      out: '{ type: "value.zap", id, amount, to }',
      in: '{ type: "value.zap.result", id, preimage }',
      destKind: 'wallet',
      destName: 'lightning',
    },
    {
      domain: 'upload',
      call: 'window.napplet.upload<wbr />.blob()',
      out: '{ type: "upload.blob", id, data }',
      in: '{ type: "upload.blob.result", id, url }',
      destKind: 'blossom',
      destName: 'media host',
    },
    {
      domain: 'cvm',
      call: 'window.napplet.cvm<wbr />.call()',
      out: '{ type: "cvm.call", id, tool, args }',
      in: '{ type: "cvm.result", id, output }',
      destKind: 'contextvm',
      destName: 'MCP tools',
    },
  ];

  let i = $state(0);
  const nap = $derived(naps[i]);

  // Auto-advance, but never against the user's motion preference.
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const id = setInterval(() => {
      i = (i + 1) % naps.length;
    }, 3400);
    return () => clearInterval(id);
  });

  function select(n: number) {
    i = n;
  }
</script>

<div class="envelope">
  <div class="flow" role="img"
    aria-label="A napplet sends a JSON envelope over postMessage to the shell. The shell verifies identity from the message source, checks the ACL and dispatches the NAP, then talks to the capability backend over the network and streams results back. The diagram rotates through the relay, storage, media, notify, theme, value, upload and cvm domains.">
    <!-- Napplet node -->
    <div class="node node-napplet">
      <span class="node-kind">sandboxed iframe</span>
      <span class="node-name">napplet</span>
      <div class="call-slot">
        {#key i}
          <code class="node-call">{@html nap.call}</code>
        {/key}
      </div>
    </div>

    <!-- Wire: napplet ⇄ shell -->
    <div class="wire" aria-hidden="true">
      <div class="label-slot">
        {#key i}
          <span class="wire-label out">{nap.out}</span>
        {/key}
      </div>
      <div class="track">
        <span class="packet packet-out"></span>
      </div>
      <div class="track">
        <span class="packet packet-in"></span>
      </div>
      <div class="label-slot">
        {#key i}
          <span class="wire-label in">{nap.in}</span>
        {/key}
      </div>
      <span class="wire-medium">postMessage</span>
    </div>

    <!-- Shell node -->
    <div class="node node-shell">
      <span class="node-kind">trusted host</span>
      <span class="node-name">shell</span>
      <div class="shell-duties">
        <span>identity via source</span>
        <span>ACL check</span>
        <span>NAP dispatch</span>
      </div>
    </div>

    <!-- Wire: shell ⇄ backend -->
    <div class="wire wire-net" aria-hidden="true">
      <div class="track">
        <span class="packet packet-net"></span>
      </div>
      <span class="wire-medium">mediated</span>
    </div>

    <!-- Capability backend node (rotates with the active NAP) -->
    <div class="node node-net">
      <div class="net-head">
        {#key i}
          <span class="node-kind">{nap.destKind}</span>
        {/key}
        {#key i}
          <span class="node-name">{nap.destName}</span>
        {/key}
      </div>
      <div class="relay-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  </div>

  <!-- The point: the shell fronts every NAP, not just relays. -->
  <div class="nap-rail">
    <span class="nap-rail-label">shell mediates</span>
    <div class="pills">
      {#each naps as n, idx}
        <button
          type="button"
          class="pill"
          class:active={idx === i}
          aria-pressed={idx === i}
          onclick={() => select(idx)}
        >{n.domain}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .envelope {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .flow {
    display: grid;
    grid-template-columns: 1.1fr 1.3fr 1.1fr 0.8fr 0.9fr;
    align-items: center;
    gap: 8px;
  }

  .node {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px 16px;
    background: linear-gradient(180deg, var(--surface), var(--bg-soft));
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 132px;
    justify-content: center;
  }
  .node-kind {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .node-name {
    font-size: 1.25rem;
    font-weight: 700;
  }
  .node-napplet {
    border-style: dashed;
    border-color: var(--accent-deep);
    background: rgba(176, 107, 255, 0.06);
  }

  /* Reserve space so the crossfading text never shifts layout */
  .call-slot {
    position: relative;
    min-height: 2.6em;
  }
  .node-call {
    position: absolute;
    inset: 0;
    font-size: 0.7rem;
    color: var(--accent-bright);
    word-break: break-word;
    animation: swap-in 0.45s ease both;
  }

  .node-shell {
    border-color: var(--accent);
    box-shadow: var(--glow-soft);
  }
  .shell-duties,
  .relay-dots {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .shell-duties span {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    color: var(--text-muted);
  }

  .node-net { border-color: var(--cyan); }
  .net-head {
    position: relative;
    min-height: 2.4em;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .net-head .node-kind { position: absolute; top: 0; left: 0; animation: swap-in 0.45s ease both; }
  .net-head .node-name { position: absolute; top: 1.1em; left: 0; animation: swap-in 0.45s ease both; }
  .relay-dots {
    flex-direction: row;
    gap: 6px;
    margin-top: 4px;
  }
  .relay-dots span {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan);
    animation: pulse 1.8s ease-in-out infinite;
  }
  .relay-dots span:nth-child(2) { animation-delay: 0.3s; }
  .relay-dots span:nth-child(3) { animation-delay: 0.6s; }

  /* Wires */
  .wire {
    position: relative;
    height: 132px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
    padding: 0 4px;
  }
  .label-slot {
    position: relative;
    height: 1.6em;
  }
  .wire-label {
    position: absolute;
    inset: 0;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-align: center;
    color: var(--text-dim);
    line-height: 1.3;
    animation: swap-in 0.45s ease both;
  }
  .wire-label.out { color: var(--accent-bright); }
  .wire-label.in { color: var(--cyan); }
  .wire-medium {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: 0.56rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .track {
    position: relative;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
    border-radius: 2px;
  }
  .packet {
    position: absolute;
    top: 50%;
    width: 10px; height: 10px;
    border-radius: 50%;
    margin-top: -5px;
  }
  .packet-out {
    background: var(--accent-bright);
    box-shadow: 0 0 10px var(--accent);
    animation: travel-right 2.6s ease-in-out infinite;
  }
  .packet-in {
    background: var(--cyan);
    box-shadow: 0 0 10px var(--cyan);
    animation: travel-left 2.6s ease-in-out infinite;
    animation-delay: 1.3s;
  }
  .wire-net .packet-net {
    background: var(--cyan);
    box-shadow: 0 0 10px var(--cyan);
    animation: travel-right 2.2s ease-in-out infinite;
  }

  /* NAP rail: the breadth the shell fronts, active domain highlighted */
  .nap-rail {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 14px;
  }
  .nap-rail-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .pill {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--text-muted);
    padding: 4px 11px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.02);
    cursor: pointer;
    transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease,
      box-shadow 0.25s ease;
  }
  .pill:hover { color: var(--text); border-color: var(--accent-deep); }
  .pill.active {
    color: var(--bg);
    background: var(--grad-accent);
    border-color: transparent;
    box-shadow: var(--glow-soft);
  }
  .pill:focus-visible {
    outline: 2px solid var(--accent-bright);
    outline-offset: 2px;
  }

  @keyframes travel-right {
    0% { left: -2%; opacity: 0; }
    12% { opacity: 1; }
    88% { opacity: 1; }
    100% { left: 100%; opacity: 0; }
  }
  @keyframes travel-left {
    0% { left: 100%; opacity: 0; }
    12% { opacity: 1; }
    88% { opacity: 1; }
    100% { left: -2%; opacity: 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(0.85); }
    50% { opacity: 1; transform: scale(1.1); }
  }
  @keyframes swap-in {
    from { opacity: 0; transform: translateY(3px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 860px) {
    .flow { grid-template-columns: 1fr; }
    .call-slot { min-height: 0; }
    .node-call { position: static; }
    .net-head { min-height: 0; gap: 2px; }
    .net-head .node-kind,
    .net-head .node-name { position: static; }
    /* Vertical connector between stacked nodes: labels stack, the track stays a
       horizontal line, the caption sits below — no cramped side-by-side row. */
    .wire { height: auto; padding: 14px 4px 6px; gap: 8px; }
    .label-slot { position: static; height: auto; }
    .wire-label { position: static; text-align: center; }
    .wire-medium {
      position: static;
      transform: none;
      text-align: center;
      margin-top: 2px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .packet { animation: none; opacity: 1; left: 50%; }
    .relay-dots span { animation: none; }
    .node-call,
    .wire-label,
    .net-head .node-kind,
    .net-head .node-name { animation: none; }
  }
</style>
