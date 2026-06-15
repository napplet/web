<script lang="ts">
  import { reveal } from '../lib/reveal';
  import MonolithVsShell from '../components/diagrams/MonolithVsShell.svelte';
</script>

<section id="shift" class="section shift">
  <div class="container">
    <div class="head" use:reveal>
      <span class="eyebrow">The shift</span>
      <h2 class="section-title">Invert the client</h2>
      <p class="section-lead">
        NIP-5D splits the monolith in two. A trusted <strong>shell</strong> brokers every
        sensitive request — signing, relays, storage. Focused <strong>web napplets</strong>
        render the UI and ask the shell to do that work. Same protocol — completely
        different shape.
      </p>
    </div>

    <div class="stage" use:reveal={{ delay: 80 }}>
      <MonolithVsShell />
    </div>
  </div>
</section>

<style>
  .shift {
    background:
      radial-gradient(60% 60% at 50% 0%, rgba(123, 47, 247, 0.1), transparent 70%);
  }
  .head { margin-bottom: 52px; max-width: 760px; }
  .head strong { color: var(--text); }
  .stage {
    border: 1px solid var(--border-soft);
    border-radius: 22px;
    padding: clamp(20px, 4vw, 44px);
    background: rgba(18, 8, 32, 0.5);
    box-shadow: var(--shadow-card);
  }
</style>
