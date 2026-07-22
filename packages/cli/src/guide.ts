const DOCS_BASE = "https://napplet.run/docs";

export interface GuideCommandOptions {
  write?: (value: string) => void;
}

export function commandGuide(options: GuideCommandOptions = {}): number {
  (options.write ?? console.log)(renderGuide());
  return 0;
}

export function renderGuide(): string {
  return `Napplet Guide
=============

1. Create a starter
   napplet create my-napplet
   cd my-napplet
   Scaffold docs: ${DOCS_BASE}/packages/boilerplate.html

2. Configure deployment metadata
   napplet init
   CLI docs: ${DOCS_BASE}/packages/cli.html

3. Install skills for your agent
   napplet skills list
   napplet skills install --to codex
   Skills docs: ${DOCS_BASE}/packages/skills.html

4. Build and verify
   pnpm install
   pnpm verify
   Agent build guide: ${DOCS_BASE}/guide/build-note-drafts-napplet-with-ai-agent-and-skills.html

5. Preview, then deploy
   napplet deploy --dry-run
   napplet deploy
   Deploy docs: ${DOCS_BASE}/packages/cli.html

Documentation
-------------
Getting started: ${DOCS_BASE}/guide/getting-started.html
CLI reference: ${DOCS_BASE}/packages/cli.html
All docs: ${DOCS_BASE}/`;
}
