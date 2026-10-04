/** Editorial selections, reviewed 2026-10-03. These descriptions are non-normative. */
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
  eventId: string;
  manifest: string;
  artifact: string;
}

export const NAPPLETS: PlayableNapplet[] = [
  {
    "id": "impossible-machine",
    "name": "Impossible Machine",
    "description": "Arrange ramps and bumpers. Drop a marble. Find your own way into the cup.",
    "category": "Physics playground",
    "href": "https://napplet.soy/n/naddr1qvzqqqyf8ypzpxw36w2u005kcamkdeqjg9jvuw3yg02gdc2xv38hvtffsvhhlte9qythwumn8ghj7un9d3shjtnwv9c8qmr9wsh8xmmeqqxkutf5xajrjdmyvyukgwpse4j4n8",
    "source": "https://blossom.napplet.soy/db7c8101167c4b0799f1ec4acf2dbf0552f83586a70e74d8a67745fe8294d996",
    "image": "/showcase/images/impossible-machine.webp",
    "eventId": "841127ac75f366b1174f745dce61bd415f935557be4af9534b5e202fbb97590c",
    "manifest": "/showcase/manifests/impossible-machine.json",
    "artifact": "/showcase/blobs/c7511c0521e6665f10f4eef62ecaee5bb5a8a208d4225743398b44807bca9417.bin"
  },
  {
    "id": "rail-game",
    "name": "Rail Game",
    "description": "Recruit a squad, dodge obstacles, and take on eight wardens.",
    "category": "Arcade game",
    "href": "https://napplet.soy/n/naddr1qvzqqqyf8ypzpxw36w2u005kcamkdeqjg9jvuw3yg02gdc2xv38hvtffsvhhlte9qythwumn8ghj7un9d3shjtnwv9c8qmr9wsh8xmmeqqxkutfex9jkxwfsvvmxverxkmltgf",
    "source": "https://blossom.napplet.soy/dad7b678e25f96a35fc8f55d14500aaca8e9fc90ca0284a8c38f975c48d9709a",
    "image": "/showcase/images/rail-game.webp",
    "eventId": "ccdd5b913413a364713e5d0e2293857edc8ea630ecd5b11ac0bb92b890fade8e",
    "manifest": "/showcase/manifests/rail-game.json",
    "artifact": "/showcase/blobs/f3038a8471c0744355f8748b332639be6c317dc45856739675b878987a3ba565.bin"
  },
  {
    "id": "sketch-loop",
    "name": "Sketch Loop",
    "description": "Turn a few lines of code into looping art. Tweak a sketch and watch it come alive.",
    "category": "Creative tool",
    "href": "https://napplet.soy/n/naddr1qvzqqqyf8ypzpxw36w2u005kcamkdeqjg9jvuw3yg02gdc2xv38hvtffsvhhlte9qythwumn8ghj7un9d3shjtnwv9c8qmr9wsh8xmmeqqxkutfexgukycejvyurscmzzlcp6e",
    "source": "https://blossom.napplet.soy/5e0385e3c08f944f6c2023a3952c87649229fe2f5fd24c07c35d547a7897cc37",
    "image": "/showcase/images/sketch-loop.webp",
    "eventId": "14966bba4a2af0328fc69cd6b894d38237ef154f9dcb59c641aec7a5bc09b1ba",
    "manifest": "/showcase/manifests/sketch-loop.json",
    "artifact": "/showcase/blobs/3e4939f95fbe1954d1f637930e3d74f08f2ad71d0575f9896d246a060218b17b.bin"
  }
];

export const SHELLS: ShowcaseItem[] = [
  {
    id: 'soy', name: 'napplet.soy', category: 'Play & discover',
    description: 'A playground for tiny games, digital experiments, and things people made just because they could.',
    href: 'https://napplet.soy/', source: 'https://github.com/zeSchlausKwab/napplet-soy', image: '/showcase/images/shell-soy.webp',
  },
  {
    id: 'paja', name: 'Paja', category: 'Develop & inspect',
    description: 'Kehto’s developer shell. Load a published napplet, inspect its behavior, and explore the runtime behind it.',
    href: 'https://kehto.github.io/web/paja/', source: 'https://github.com/kehto/web/tree/main/packages/paja', image: '/showcase/images/shell-paja.webp',
  },
];

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
