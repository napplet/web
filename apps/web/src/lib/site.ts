// ─── Site-wide constants ────────────────────────────────────────────────────
// Single source of truth for external links and package metadata. Change
// SITE_URL in one place to re-point canonical/meta references.

export const SITE_URL = 'https://napplet.dev';

export const LINKS = {
  github: 'https://github.com/napplet/napplet',
  githubOrg: 'https://github.com/napplet',
  docs: '/docs/',
  // Authoritative NIP-5D spec source (pinned commit referenced in specs/NIP-5D.md).
  spec: 'https://github.com/nostr-protocol/nips/pull/2303/files',
  boilerplate: 'https://github.com/napplet/boilerplate',
  // Kehto — the reference runtime / shell implementation.
  kehto: 'https://github.com/sandwichfarm/kehto',
} as const;

export interface PackageInfo {
  name: string;
  blurb: string;
  npm: string;
  jsr: string;
  docs: string;
}

export const PACKAGES: PackageInfo[] = [
  {
    name: '@napplet/core',
    blurb:
      'JSON envelope types and NAP dispatch infrastructure. The single source of truth every other package imports. Zero dependencies, no DOM.',
    npm: 'https://www.npmjs.com/package/@napplet/core',
    jsr: 'https://jsr.io/@napplet/core',
    docs: '/docs/packages/core',
  },
  {
    name: '@napplet/shim',
    blurb:
      'Side-effect window installer. Importing it installs window.napplet and registers with the shell over postMessage. Zero named exports.',
    npm: 'https://www.npmjs.com/package/@napplet/shim',
    jsr: 'https://jsr.io/@napplet/shim',
    docs: '/docs/packages/shim',
  },
  {
    name: '@napplet/sdk',
    blurb:
      'Named TypeScript exports wrapping window.napplet for bundler consumers — relay, inc, services, storage objects plus NAP message types.',
    npm: 'https://www.npmjs.com/package/@napplet/sdk',
    jsr: 'https://jsr.io/@napplet/sdk',
    docs: '/docs/packages/sdk',
  },
  {
    name: '@napplet/nap',
    blurb:
      'All NAP domains as layered subpath exports — barrel, types-only, shim-only, or sdk-only. Tree-shakable. Import from a domain subpath.',
    npm: 'https://www.npmjs.com/package/@napplet/nap',
    jsr: 'https://jsr.io/@napplet/nap',
    docs: '/docs/packages/nap',
  },
  {
    name: '@napplet/vite-plugin',
    blurb:
      'Build-time NIP-5A manifest generation. Hashes each file, signs a kind 35128 manifest event, injects requires meta tags.',
    npm: 'https://www.npmjs.com/package/@napplet/vite-plugin',
    jsr: 'https://jsr.io/@napplet/vite-plugin',
    docs: '/docs/packages/vite-plugin',
  },
  {
    name: '@napplet/boilerplate',
    blurb:
      'Interactive npx generator. Clones the boilerplate template and prepares a Vite + TypeScript napplet starter in seconds.',
    npm: 'https://www.npmjs.com/package/@napplet/boilerplate',
    jsr: '',
    docs: '/docs/packages/boilerplate',
  },
];

export interface NavItem {
  href: string;
  label: string;
}

export const NAV: NavItem[] = [
  { href: '#problem', label: 'The problem' },
  { href: '#shift', label: 'The shift' },
  { href: '#how', label: 'How it works' },
  { href: '#benefits', label: 'Benefits' },
  { href: '#packages', label: 'Packages' },
];
