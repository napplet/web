<script lang="ts">
  import { reveal } from '../lib/reveal';
  import { LINKS } from '../lib/site';

  type Platform = 'macOS' | 'Linux' | 'Windows';
  type StepId = 'install' | 'create' | 'init' | 'skills' | 'build' | 'deploy';

  interface WorkflowStep {
    id: StepId;
    label: string;
    title: string;
    detail: string;
  }

  const platforms: Platform[] = ['macOS', 'Linux', 'Windows'];
  const installCommands: Record<Platform, string> = {
    macOS:
      'curl -fsSL https://raw.githubusercontent.com/napplet/web/main/scripts/install-napplet-cli.sh | sh',
    Linux:
      'curl -fsSL https://raw.githubusercontent.com/napplet/web/main/scripts/install-napplet-cli.sh | sh',
    Windows:
      'irm https://raw.githubusercontent.com/napplet/web/main/scripts/install-napplet-cli.ps1 | iex',
  };
  const steps: WorkflowStep[] = [
    {
      id: 'install',
      label: 'Install',
      title: 'Install the standalone CLI',
      detail: 'No Deno required. The installer selects your platform binary and verifies its checksum.',
    },
    {
      id: 'create',
      label: 'Create',
      title: 'Create the starter',
      detail: 'Clone the maintained Vite + TypeScript project without answering deployment metadata twice.',
    },
    {
      id: 'init',
      label: 'Configure',
      title: 'Initialize deployment metadata',
      detail: 'Set the d-tag, title, description, archetype contracts, relays, and Blossom servers in one config.',
    },
    {
      id: 'skills',
      label: 'Equip',
      title: 'Install skills for your agent',
      detail: 'Put the current protocol and package guidance where Codex, Claude, Cursor, or another agent reads it.',
    },
    {
      id: 'build',
      label: 'Build',
      title: 'Build and verify with your agent',
      detail: 'Keep the generated substrate, implement the product, then run the project verification contract.',
    },
    {
      id: 'deploy',
      label: 'Ship',
      title: 'Preview, then deploy',
      detail: 'Inspect the exact manifest plan without network writes before signing and publishing it.',
    },
  ];

  let platform = $state<Platform>('macOS');
  let copied = $state<string | null>(null);

  function commandsFor(step: WorkflowStep): string[] {
    switch (step.id) {
      case 'install':
        return [installCommands[platform]];
      case 'create':
        return ['napplet create my-napplet'];
      case 'init':
        return ['cd my-napplet', 'napplet init'];
      case 'skills':
        return ['napplet skills install --to codex'];
      case 'build':
        return ['pnpm install', 'pnpm verify'];
      case 'deploy':
        return ['napplet deploy --dry-run', 'napplet deploy'];
    }
  }

  async function copy(command: string, key: string) {
    try {
      await navigator.clipboard.writeText(command);
      copied = key;
      setTimeout(() => {
        if (copied === key) copied = null;
      }, 1600);
    } catch {
      copied = null;
    }
  }
</script>

<section id="start" class="section start">
  <div class="container">
    <div class="onboarding" use:reveal>
      <header class="intro">
        <div class="intro-copy">
          <span class="eyebrow">Get started</span>
          <h2 class="section-title">One path from install to deploy</h2>
          <p class="section-lead">
            Install the CLI, create the starter, configure deployment once, give your agent the
            shipped skills, then verify and publish.
          </p>
        </div>

        <div class="platform-control">
          <span class="control-label">Installer platform</span>
          <div class="platforms" role="group" aria-label="Installer platform">
            {#each platforms as option}
              <button
                type="button"
                class:active={platform === option}
                aria-pressed={platform === option}
                onclick={() => (platform = option)}
              >
                {option}
              </button>
            {/each}
          </div>
          <p>Linux and macOS support x64 and ARM64. Windows supports x64.</p>
        </div>
      </header>

      <ol class="steps" aria-label="Developer onboarding workflow">
        {#each steps as step, stepIndex}
          <li class:deploy-step={step.id === 'deploy'}>
            <span class="step-number" aria-hidden="true">{String(stepIndex + 1).padStart(2, '0')}</span>
            <div class="step-copy">
              <span class="step-label">{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
            <div class="step-commands">
              {#each commandsFor(step) as command, commandIndex}
                {@const key = `${step.id}-${commandIndex}-${platform}`}
                <div class="command-row">
                  <code>{command}</code>
                  <button
                    type="button"
                    class="copy-button"
                    aria-label={`Copy ${step.label.toLowerCase()} command`}
                    onclick={() => copy(command, key)}
                  >
                    {copied === key ? 'Copied' : 'Copy'}
                  </button>
                </div>
              {/each}
            </div>
          </li>
        {/each}
      </ol>

      <footer class="onboarding-footer">
        <p>
          napplet is <strong>alpha</strong>. Preview deploys before publishing and defer protocol
          claims to the living specification.
        </p>
        <nav class="links" aria-label="Onboarding resources">
          <a class="btn btn-primary" href={LINKS.docs}>Read the docs</a>
          <a class="btn btn-ghost" href={LINKS.spec} target="_blank" rel="noopener">NIP-5D spec ↗</a>
          <a class="btn btn-ghost" href={LINKS.community} target="_blank" rel="noopener">Group chat ↗</a>
          <a class="btn btn-ghost" href={LINKS.github} target="_blank" rel="noopener">GitHub ↗</a>
        </nav>
      </footer>
    </div>
  </div>
</section>

<style>
  .start {
    padding-bottom: 112px;
  }

  .onboarding {
    border-block: 1px solid var(--border);
    padding-block: 48px;
  }

  .intro {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
    gap: 56px;
    align-items: end;
    padding-bottom: 40px;
  }

  .intro-copy,
  .platform-control,
  .step-copy,
  .step-commands {
    min-width: 0;
  }

  .section-title {
    max-width: 16ch;
    font-size: 2.6rem;
    letter-spacing: 0;
  }

  .section-lead {
    max-width: 56ch;
  }

  .platform-control {
    border-left: 2px solid var(--cyan);
    padding-left: 20px;
  }

  .control-label,
  .step-label {
    display: block;
    color: var(--cyan);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .platforms {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }

  .platforms button {
    min-width: 0;
    min-height: 40px;
    padding: 8px 10px;
    border: 0;
    border-right: 1px solid var(--border);
    background: #100719;
    color: var(--text-muted);
    font: 600 0.82rem var(--font-sans);
    cursor: pointer;
  }

  .platforms button:last-child {
    border-right: 0;
  }

  .platforms button:hover,
  .platforms button:focus-visible {
    color: var(--text);
    background: var(--surface-2);
  }

  .platforms button.active {
    color: #071113;
    background: var(--cyan);
  }

  .platform-control p {
    margin-top: 10px;
    color: var(--text-dim);
    font-size: 0.78rem;
  }

  .steps {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--border-soft);
  }

  .steps li {
    display: grid;
    grid-template-columns: 40px minmax(190px, 0.72fr) minmax(0, 1.28fr);
    gap: 20px;
    align-items: start;
    padding-block: 24px;
    border-bottom: 1px solid var(--border-soft);
  }

  .step-number {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    border: 1px solid var(--cyan);
    border-radius: 6px;
    color: var(--cyan);
    font: 700 0.78rem var(--font-mono);
  }

  .deploy-step .step-number {
    border-color: var(--amber);
    color: var(--amber);
  }

  .deploy-step .step-label {
    color: var(--amber);
  }

  .step-copy h3 {
    margin-top: 5px;
    font-size: 1.08rem;
    letter-spacing: 0;
  }

  .step-copy p {
    margin-top: 7px;
    color: var(--text-muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .step-commands {
    display: grid;
    gap: 8px;
  }

  .command-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 68px;
    min-height: 42px;
    align-items: stretch;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    background: #100719;
  }

  .command-row code {
    align-self: center;
    min-width: 0;
    padding: 10px 12px;
    color: var(--text);
    font-size: 0.82rem;
    line-height: 1.45;
    overflow-wrap: anywhere;
    word-break: normal;
  }

  .copy-button {
    width: 68px;
    min-height: 40px;
    border: 0;
    border-left: 1px solid var(--border);
    background: rgba(79, 214, 224, 0.08);
    color: var(--cyan);
    font: 700 0.72rem var(--font-sans);
    cursor: pointer;
  }

  .copy-button:hover,
  .copy-button:focus-visible {
    background: rgba(79, 214, 224, 0.16);
    color: #fff;
  }

  .onboarding-footer {
    display: flex;
    gap: 24px;
    align-items: center;
    justify-content: space-between;
    padding-top: 32px;
  }

  .onboarding-footer > p {
    max-width: 48ch;
    color: var(--text-dim);
    font-size: 0.82rem;
  }

  .onboarding-footer strong {
    color: var(--amber);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .links .btn {
    border-radius: 6px;
    padding: 9px 13px;
    font-size: 0.82rem;
  }

  @media (max-width: 820px) {
    .start {
      padding-bottom: 80px;
    }

    .intro {
      grid-template-columns: 1fr;
      gap: 28px;
    }

    .section-title {
      font-size: 2.15rem;
    }

    .platform-control {
      max-width: 480px;
    }

    .steps li {
      grid-template-columns: 40px minmax(0, 1fr);
      column-gap: 16px;
    }

    .step-commands {
      grid-column: 2;
      margin-top: 4px;
    }

    .onboarding-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .links {
      justify-content: flex-start;
    }
  }

  @media (max-width: 480px) {
    .onboarding {
      padding-block: 36px;
    }

    .section-title {
      font-size: 1.9rem;
    }

    .platform-control {
      padding-left: 14px;
    }

    .platforms button {
      padding-inline: 6px;
      font-size: 0.75rem;
    }

    .steps li {
      gap: 12px;
      padding-block: 20px;
    }

    .step-copy h3 {
      font-size: 1rem;
    }

    .command-row {
      grid-template-columns: minmax(0, 1fr) 62px;
    }

    .copy-button {
      width: 62px;
    }

    .links {
      width: 100%;
    }

    .links .btn {
      flex: 1 1 calc(50% - 8px);
      justify-content: center;
      min-width: 0;
      white-space: normal;
      text-align: center;
    }
  }
</style>
