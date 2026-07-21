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
      in: '{ type: "relay.event", subId, result }',
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
      // Not the most obvious domain, but it fits: the shell fetches a resource
      // on the napplet's behalf and streams the raw bytes back. Rendered as a
      // special frame — pixel loader in the backend box, bytes on the return
      // lane — instead of a text label (see the `resource` branches below).
      domain: 'resource',
      call: 'window.napplet.resource<wbr />.fetch()',
      out: '{ type: "resource.fetch", id, url }',
      in: '',
      destKind: 'fetching',
      destName: '',
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

  // Pixel loader for the resource domain: a deterministic scatter of reveal
  // delays so the grid fills in pixel-by-pixel like a resource streaming in.
  const PIXEL_COLS = 8;
  const PIXEL_ROWS = 4;
  const pixels = Array.from({ length: PIXEL_COLS * PIXEL_ROWS }, (_, p) => {
    const col = p % PIXEL_COLS;
    const row = Math.floor(p / PIXEL_COLS);
    return {
      delay: ((col * 5 + row * 11) % 18) * 90,
      accent: (col * 3 + row) % 7 === 0,
    };
  });

  // Authentic-looking PNG header bytes "arriving over the wire" for resource —
  // signature + IHDR for a 64×64 image. Duplicated in the markup so the scroll
  // loops seamlessly.
  const RESOURCE_BYTES =
    '89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52 00 00 00 40 00 00 00 40 08 06 00 00 00 AA 69 71 DE';

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
    aria-label="A napplet sends a JSON envelope over postMessage to the shell. The shell verifies identity from the message source, checks the ACL and dispatches the NAP, then talks to the capability backend over the network and streams results back. The diagram rotates through the relay, storage, media, notify, theme, value, upload, resource and cvm domains.">
    <!-- Napplet node -->
    <div class="node node-napplet">
      <span class="node-kind">sandboxed iframe</span>
      <span class="node-name">napplet</span>
      {#if nap.domain === 'resource'}
        <!-- The fetched bytes render inside the napplet — a loader that mirrors
             the backend's, lagged slightly so it reads as "arriving after". -->
        <div
          class="pixel-grid napplet-pixels"
          role="img"
          aria-label="fetched bytes rendering inside the napplet"
          style="--cols: {PIXEL_COLS}"
        >
          {#each pixels as px}
            <span class="px" class:px-accent={px.accent} style="animation-delay: {px.delay + 520}ms"></span>
          {/each}
        </div>
      {:else}
        <div class="call-slot">
          {#key i}
            <code class="node-call">{@html nap.call}</code>
          {/key}
        </div>
      {/if}
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
        {#if nap.domain === 'resource'}
          <span class="wire-label in bytes" aria-label="raw bytes returning over the wire">
            <span class="bytes-stream">
              <span>{RESOURCE_BYTES}&nbsp;&nbsp;</span><span>{RESOURCE_BYTES}&nbsp;&nbsp;</span>
            </span>
          </span>
        {:else}
          {#key i}
            <span class="wire-label in">{nap.in}</span>
          {/key}
        {/if}
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
      {#if nap.domain === 'resource'}
        <span class="node-kind">{nap.destKind}</span>
        <div
          class="pixel-grid"
          role="img"
          aria-label="a resource loading in pixel by pixel"
          style="--cols: {PIXEL_COLS}"
        >
          {#each pixels as px}
            <span class="px" class:px-accent={px.accent} style="animation-delay: {px.delay}ms"></span>
          {/each}
        </div>
      {:else}
        <div class="net-head">
          {#key i}
            <div class="net-head-inner">
              <span class="node-kind">{nap.destKind}</span>
              <span class="node-name">{nap.destName}</span>
            </div>
          {/key}
        </div>
        <div class="relay-dots">
          <span></span><span></span><span></span>
        </div>
      {/if}
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
  /* Reserve height for the tallest rotating name (two lines, e.g. "media
     session" / "theme tokens") so the activity dots below never collide with a
     wrapped name. The kind+name crossfade as one naturally-flowing block. */
  .net-head {
    position: relative;
    min-height: 3.4em;
  }
  .net-head-inner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    animation: swap-in 0.45s ease both;
  }
  .node-net .node-name {
    font-size: 1.1rem;
    line-height: 1.2;
  }
  .relay-dots {
    flex-direction: row;
    gap: 6px;
    margin-top: 4px;
  }
  .node-net .relay-dots { margin-top: 12px; }
  .relay-dots span {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan);
    animation: pulse 1.8s ease-in-out infinite;
  }
  .relay-dots span:nth-child(2) { animation-delay: 0.3s; }
  .relay-dots span:nth-child(3) { animation-delay: 0.6s; }

  /* Resource domain: a pixel loader stands in for the text backend, reading as
     a resource streaming in pixel by pixel. */
  /* Fixed-size cells (not 1fr) so the grid's height is deterministic and the
     resource frame fits the same node height as the text frames — no layout
     shift / page "bump" when the diagram cycles in and out of resource. */
  .pixel-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 8), 9px);
    gap: 2px;
    margin-top: 4px;
  }
  .px {
    aspect-ratio: 1;
    border-radius: 2px;
    background: var(--cyan);
    opacity: 0;
    animation: px-in 2.6s ease-in-out infinite;
  }
  .px-accent {
    background: var(--accent-bright);
    box-shadow: 0 0 6px var(--accent);
  }
  /* Napplet-side loader mirrors the backend but in the napplet's accent palette,
     so each box's loader matches its own colour identity. */
  .napplet-pixels .px { background: var(--accent-bright); }
  .napplet-pixels .px-accent {
    background: var(--cyan);
    box-shadow: 0 0 6px var(--cyan);
  }

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
  /* Resource return lane: raw bytes scrolling over the wire. The two identical
     copies + translateX(-50%) make the scroll seamless. */
  .wire-label.bytes {
    overflow: hidden;
    text-align: left;
    white-space: nowrap;
    animation: none;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
    mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  }
  .bytes-stream {
    display: inline-flex;
    white-space: nowrap;
    animation: stream 9s linear infinite;
  }
  .bytes-stream > span { padding-right: 0; }
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
  @keyframes px-in {
    0% { opacity: 0; transform: scale(0.3); }
    18% { opacity: 1; transform: scale(1); }
    72% { opacity: 0.9; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.3); }
  }
  @keyframes stream {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  @media (max-width: 860px) {
    .flow { grid-template-columns: 1fr; }
    .call-slot { min-height: 0; }
    .node-call { position: static; }
    .net-head { min-height: 0; }
    .net-head-inner { position: static; }
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
    .net-head-inner { animation: none; }
    .px { animation: none; opacity: 0.85; }
    .bytes-stream { animation: none; }
  }
</style>
