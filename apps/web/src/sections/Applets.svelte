<script lang="ts">
  import { reveal } from '../lib/reveal';

  // A deliberate pause in the narrative: plenty of developers have never met the
  // word "applet". Define it like a dictionary would — headword, phonetics,
  // gloss — then ground it with a short, link-rich etymology so "napplet" lands.
</script>

<section id="applet" class="section applet-section">
  <div class="container">
    <span class="eyebrow" use:reveal>wtf is an applet?</span>

    <article class="entry" use:reveal={{ delay: 80 }}>
      <header class="entry-head">
        <h2 class="headword">applet</h2>
        <span class="phonetic">/ˈæp.lɪt/</span>
        <span class="pos">noun</span>
      </header>

      <p class="gloss">
        a small application built to do <em>one</em> narrow task — run
        <em>inside</em> a larger host program rather than launched on its own.
      </p>

      <p class="etymology" use:reveal={{ delay: 120 }}>
        Blend <em>application</em> with the diminutive <em>-let</em> and you get a
        tiny program made to live inside a bigger one. The word turns up in print
        <a
          href="https://www.merriam-webster.com/dictionary/applet"
          target="_blank"
          rel="noopener"
        >around 1990</a>, then gets burned into a generation’s memory by
        <a
          href="https://en.wikipedia.org/wiki/Java_applet"
          target="_blank"
          rel="noopener"
        >Java applets</a> running sandboxed in the browser — though the instinct of
        shipping a little program to extend a remote machine goes all the way back
        to
        <a
          href="https://www.rfc-editor.org/rfc/rfc5.html"
          target="_blank"
          rel="noopener"
        >RFC&nbsp;5</a> in 1969. A <strong>napplet</strong> is that same idea,
        reborn Nostr-native.
      </p>
    </article>
  </div>
</section>

<style>
  .applet-section {
    background:
      radial-gradient(55% 55% at 80% 0%, rgba(79, 214, 224, 0.07), transparent 70%);
  }

  .entry {
    margin-top: 8px;
    max-width: 70ch;
    border-left: 2px solid var(--accent-deep);
    padding-left: clamp(18px, 3vw, 34px);
  }

  .entry-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 16px;
  }
  .headword {
    font-size: clamp(2.6rem, 7vw, 4.6rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .phonetic {
    font-family: var(--font-mono);
    font-size: clamp(1.1rem, 2.2vw, 1.6rem);
    color: var(--cyan);
  }
  .pos {
    font-style: italic;
    font-size: clamp(0.95rem, 1.6vw, 1.2rem);
    color: var(--text-dim);
  }

  .gloss {
    margin-top: 20px;
    font-size: clamp(1.25rem, 2.6vw, 1.9rem);
    line-height: 1.4;
    color: var(--text);
    max-width: 30ch;
  }
  .gloss em {
    font-style: normal;
    color: var(--accent-bright);
  }

  .etymology {
    margin-top: 26px;
    font-size: 0.96rem;
    line-height: 1.7;
    color: var(--text-muted);
    max-width: 62ch;
  }
  .etymology em { font-style: italic; color: var(--text); }
  .etymology strong { color: var(--accent-bright); font-weight: 600; }
  .etymology a {
    color: var(--text);
    text-decoration: underline;
    text-decoration-color: var(--accent-deep);
    text-underline-offset: 3px;
    transition: text-decoration-color 0.2s ease;
  }
  .etymology a:hover { text-decoration-color: var(--cyan); }
</style>
