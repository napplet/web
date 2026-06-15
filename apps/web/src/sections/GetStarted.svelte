<script lang="ts">
  import { reveal } from '../lib/reveal';
  import { LINKS } from '../lib/site';

  let copied = $state(false);
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
</style>
