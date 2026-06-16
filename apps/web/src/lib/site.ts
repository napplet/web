export const LINKS = {
  github: 'https://github.com/napplet/napplet',
  githubOrg: 'https://github.com/napplet',
  docs: '/docs/',
  // Authoritative NIP-5D spec source (pinned commit referenced in specs/NIP-5D.md).
  spec: 'https://github.com/nostr-protocol/nips/pull/2303/files',
  boilerplate: 'https://github.com/napplet/boilerplate',
  // Kehto — the reference web runtime / shell implementation.
  kehto: 'https://github.com/kehto/web',
  // The NAPs track — public repo where NAP capability domains are proposed,
  // drafted, and extended.
  naps: 'https://github.com/napplet/naps',
} as const;

export interface PackageInfo {
  name: string;
  blurb: string;
  npm: string;
  jsr: string;
  docs: string;
}

// Source data; the repetitive npm/jsr/docs URLs are derived from the name below.
const PACKAGE_SOURCES: ReadonlyArray<{ name: string; blurb: string; jsr: boolean }> = [
  {
    name: '@napplet/core',
    blurb:
      'JSON envelope types and NAP dispatch infrastructure. The single source of truth every other package imports. Zero dependencies, no DOM.',
    jsr: true,
  },
  {
    name: '@napplet/shim',
    blurb:
      'Side-effect window installer. Importing it installs window.napplet and registers with the shell over postMessage. Zero named exports.',
    jsr: true,
  },
  {
    name: '@napplet/sdk',
    blurb:
      'Named TypeScript exports wrapping window.napplet for bundler consumers — relay, inc, services, storage objects plus NAP message types.',
    jsr: true,
  },
  {
    name: '@napplet/nap',
    blurb:
      'All NAP domains as layered subpath exports — barrel, types-only, shim-only, or sdk-only. Tree-shakable. Import from a domain subpath.',
    jsr: true,
  },
  {
    name: '@napplet/vite-plugin',
    blurb:
      'Build-time NIP-5A manifest generation. Hashes each file, signs a kind 35128 manifest event, injects requires meta tags.',
    jsr: true,
  },
  {
    name: '@napplet/boilerplate',
    blurb:
      'Interactive npx generator. Clones the boilerplate template and prepares a Vite + TypeScript napplet starter in seconds.',
    jsr: false,
  },
];

export const PACKAGES: PackageInfo[] = PACKAGE_SOURCES.map((p) => ({
  name: p.name,
  blurb: p.blurb,
  npm: `https://www.npmjs.com/package/${p.name}`,
  jsr: p.jsr ? `https://jsr.io/${p.name}` : '',
  // .html suffix: the static host (Bunny/nsite) does not rewrite extensionless
  // paths, so a clean URL would 404 on a cold load. Matches VitePress cleanUrls:false.
  docs: `/docs/packages/${p.name.slice('@napplet/'.length)}.html`,
}));

export interface NavItem {
  href: string;
  label: string;
}

export const NAV: NavItem[] = [
  { href: '#problem', label: 'The problem' },
  { href: '#shift', label: 'The shift' },
  { href: '#how', label: 'How it works' },
  { href: '#runtimes', label: 'Runtimes' },
  { href: '#packages', label: 'Packages' },
];
