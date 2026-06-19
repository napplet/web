<script lang="ts">
  import { reveal } from '../lib/reveal';
  import { LINKS } from '../lib/site';

  let copied = $state(false);
  let acceptedAlpha = $state(false);
  const cmd = 'npx @napplet/boilerplate';

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      copied = true;
      setTimeout(() => (copied = false), 1600);
    } catch {
      /* clipboard may be unavailable — non-critical */
    }
  }
</script>

<section id="start" class="section start">
  <div class="container">
    <div class="panel" use:reveal>
      {#if !acceptedAlpha}
        <div class="alpha-gate" role="dialog" aria-modal="true" aria-labelledby="alpha-gate-title">
          <div class="gate-card">
            <span class="gate-kicker">Alpha boilerplate</span>
            <h3 id="alpha-gate-title">Before you scaffold</h3>
            <p>
              The boilerplate is alpha, it could be broken, some tooling paths could be
              broken or not complete. The spec could drift
            </p>
            <button class="btn btn-primary gate-action" onclick={() => (acceptedAlpha = true)}>
              I Understand
            </button>
          </div>
        </div>
      {/if}

      <div
        class="panel-content"
        class:locked={!acceptedAlpha}
        aria-hidden={!acceptedAlpha}
        inert={!acceptedAlpha}
      >
        <span class="eyebrow">Get started</span>
        <h2 class="section-title">Scaffold a napplet in one command</h2>
        <p class="section-lead">
          The generator clones the template and sets up a Vite + TypeScript napplet, wired to
          the shim. Point it at a compatible shell and you’re live.
        </p>

        <button class="cmd" onclick={copy} aria-label="Copy command">
          <span class="prompt">$</span>
          <code>{cmd}</code>
          <span class="copy">{copied ? 'copied ✓' : 'copy'}</span>
        </button>

        <div class="links">
          <a class="btn btn-primary" href={LINKS.docs}>Read the docs</a>
          <a class="btn btn-ghost" href={LINKS.spec} target="_blank" rel="noopener">NIP-5D spec ↗</a>
          <a class="btn btn-ghost" href={LINKS.github} target="_blank" rel="noopener">GitHub ↗</a>
        </div>

        <p class="alpha">
          napplet is <strong>alpha</strong>. The spec is experimental and a moving target —
          for adventurers only.
        </p>
      </div>
    </div>
  </div>
</section>

<style>
  .start { padding-bottom: clamp(72px, 10vw, 130px); }
  .panel {
    border: 1px solid var(--accent-deep);
    border-radius: 24px;
    padding: clamp(32px, 6vw, 64px);
    background:
      radial-gradient(80% 120% at 50% 0%, rgba(123, 47, 247, 0.18), transparent 70%),
      linear-gradient(180deg, var(--surface), var(--bg-soft));
    box-shadow: var(--shadow-card), var(--glow-soft);
    text-align: center;
    position: relative;
    overflow: hidden;
    min-height: 438px;
  }
  .panel-content {
    transition: filter 0.2s ease, opacity 0.2s ease;
  }
  .panel-content.locked {
    filter: blur(7px);
    opacity: 0.44;
    pointer-events: none;
    user-select: none;
  }
  .alpha-gate {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(8, 2, 20, 0.46);
    backdrop-filter: blur(13px) saturate(120%);
  }
  .gate-card {
    width: min(100%, 560px);
    padding: clamp(24px, 4vw, 38px);
    border: 1px solid rgba(255, 206, 107, 0.44);
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(37, 20, 64, 0.92), rgba(18, 8, 32, 0.96)),
      var(--surface);
    box-shadow: 0 28px 80px -32px rgba(0, 0, 0, 0.92);
    text-align: left;
  }
  .gate-kicker {
    display: inline-block;
    margin-bottom: 14px;
    font-family: var(--font-mono);
    color: var(--amber);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .gate-card h3 {
    font-size: clamp(1.45rem, 4vw, 2.1rem);
  }
  .gate-card p {
    margin-top: 14px;
    color: var(--text-muted);
    font-size: 1rem;
  }
  .gate-action {
    margin-top: 24px;
  }
  .panel .eyebrow { justify-content: center; }
  .panel .section-title,
  .panel .section-lead { margin-inline: auto; }
  .section-lead { max-width: 56ch; }

  .cmd {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin: 32px auto 28px;
    padding: 14px 18px;
    border-radius: 12px;
    background: #100719;
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    cursor: pointer;
    transition: border-color 0.2s ease;
  }
  .cmd:hover { border-color: var(--accent); }
  .prompt { color: var(--accent); }
  .cmd code { color: var(--text); font-size: 0.98rem; }
  .copy {
    font-size: 0.74rem;
    color: var(--accent-bright);
    border-left: 1px solid var(--border);
    padding-left: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }
  .alpha {
    margin-top: 30px;
    font-size: 0.86rem;
    color: var(--text-dim);
  }
  .alpha strong { color: var(--accent-bright); }

  @media (max-width: 560px) {
    .panel {
      min-height: 520px;
      padding: 26px 18px;
    }
    .alpha-gate { padding: 18px; }
    .gate-card { border-radius: 14px; }
  }
</style>
