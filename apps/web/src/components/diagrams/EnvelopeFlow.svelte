<script lang="ts">
  // Animated request/response across the postMessage boundary. A napplet sends a
  // JSON envelope; the shell mediates the relay call and streams events back.
  // The traveling packets are CSS-animated; markup stays static for a11y.
</script>

<div class="flow" role="img"
  aria-label="A napplet sends a relay.subscribe JSON envelope over postMessage to the shell. The shell talks to the relay network and streams relay.event envelopes back to the napplet.">
  <!-- Napplet node -->
  <div class="node node-napplet">
    <span class="node-kind">sandboxed iframe</span>
    <span class="node-name">napplet</span>
    <code class="node-call">window.napplet.relay<wbr />.subscribe()</code>
  </div>

  <!-- Wire: napplet ⇄ shell -->
  <div class="wire" aria-hidden="true">
    <span class="wire-label out">{`{ type: "relay.subscribe", id, filters }`}</span>
    <div class="track">
      <span class="packet packet-out"></span>
    </div>
    <div class="track">
      <span class="packet packet-in"></span>
    </div>
    <span class="wire-label in">{`{ type: "relay.event", subId, event }`}</span>
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

  <!-- Wire: shell ⇄ network -->
  <div class="wire wire-net" aria-hidden="true">
    <div class="track">
      <span class="packet packet-net"></span>
    </div>
    <span class="wire-medium">websocket</span>
  </div>

  <!-- Network node -->
  <div class="node node-net">
    <span class="node-kind">nostr</span>
    <span class="node-name">relays</span>
    <div class="relay-dots">
      <span></span><span></span><span></span>
    </div>
  </div>
</div>

<style>
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
  .node-call {
    font-size: 0.7rem;
    color: var(--accent-bright);
    word-break: break-word;
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
  .wire-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-align: center;
    color: var(--text-dim);
    line-height: 1.3;
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

  @media (max-width: 860px) {
    .flow { grid-template-columns: 1fr; }
    .wire { height: 70px; }
    .track { width: 2px; height: auto; flex: 1; margin: 0 auto;
      background: linear-gradient(180deg, transparent, var(--border), transparent); }
    .wire { flex-direction: row; }
  }
  @media (prefers-reduced-motion: reduce) {
    .packet { animation: none; opacity: 1; left: 50%; }
    .relay-dots span { animation: none; }
  }
</style>
