import curatedApps from '../data/apps.json';
import shellDirectory from '../data/shells.json';
/** Editorial selections, reviewed 2026-10-28. These descriptions are non-normative. */
export { LINKS } from './site';

export interface ShowcaseItem {
  id: string;
  name: string;
  description: string;
  category: string;
  href: string;
  source?: string;
  image?: string;
}

export interface PlayableNapplet extends ShowcaseItem {
  format: string;
  eventId: string;
  manifest: string;
  artifact: string;
}

export const NAPPLETS: PlayableNapplet[] = curatedApps;

/** How a web shell opens a release from its NIP-19 address; `{address}` is replaced. */
export interface ShellLaunch { url: string; pointers: ('naddr' | 'nevent')[] }

export interface ShowcaseShell extends ShowcaseItem {
  platforms: string[];
  status: string;
  launch?: ShellLaunch;
}

export const SHELLS: ShowcaseShell[] = shellDirectory as ShowcaseShell[];


export const APP_TOOLS: ShowcaseItem[] = [
  {
    id: 'cli', name: 'napplet CLI', category: '01 / Create & publish',
    description: 'Create a project, preview it in Paja, and publish your napplet to Blossom and Nostr relays.',
    href: '/docs/packages/cli.html', source: 'https://github.com/napplet/web/tree/main/packages/cli',
  },
  {
    id: 'sdk', name: 'TypeScript SDK', category: '02 / Build',
    description: 'Typed helpers for the shell services your app uses. Bring your own framework, or use none at all.',
    href: '/docs/packages/sdk.html', source: 'https://github.com/napplet/web/tree/main/packages/sdk',
  },
  {
    id: 'vite', name: 'Vite plugin', category: '03 / Package',
    description: 'Turn your web app into a self-contained napplet artifact with manifest metadata for publishing.',
    href: '/docs/packages/vite-plugin.html', source: 'https://github.com/napplet/web/tree/main/packages/vite-plugin',
  },
  {
    id: 'skills', name: 'Agent skills', category: '04 / Build with an agent',
    description: 'Give your coding agent the napplet design, build, and verification workflow.',
    href: '/docs/guide/agent-skills.html', source: 'https://github.com/napplet/web/tree/main/packages/skills',
  },
];

export const SHELL_TOOLS: ShowcaseItem[] = [
  {
    id: 'kehto-runtime', name: 'Kehto runtime', category: 'Dispatch & lifecycle',
    description: 'The protocol kernel for a host: route messages, manage sessions, and connect your services.',
    href: 'https://kehto.github.io/web/docs/packages/runtime.html', source: 'https://github.com/kehto/web/tree/main/packages/runtime',
  },
  {
    id: 'kehto-shell', name: 'Kehto shell', category: 'Browser integration',
    description: 'Connect a runtime to browser frames, artifact loading, and your shell’s interface.',
    href: 'https://kehto.github.io/web/docs/packages/shell.html', source: 'https://github.com/kehto/web/tree/main/packages/shell',
  },
  {
    id: 'kehto-services', name: 'Kehto services', category: 'Host capabilities',
    description: 'Reference service handlers to connect identity, relays, themes, and other capabilities to your host.',
    href: 'https://kehto.github.io/web/docs/packages/services.html', source: 'https://github.com/kehto/web/tree/main/packages/services',
  },
  {
    id: 'kehto-acl', name: 'Kehto ACL', category: 'Permissions',
    description: 'Capability grants, blocks, and quotas for the policy your shell chooses to enforce.',
    href: 'https://kehto.github.io/web/docs/packages/acl.html', source: 'https://github.com/kehto/web/tree/main/packages/acl',
  },
];
