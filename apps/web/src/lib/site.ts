export const LINKS = {
  github: 'https://github.com/napplet/napplet',
  githubOrg: 'https://github.com/napplet',
  docs: '/docs/',
  community:
    'https://armada.buzz/invite/naddr1qvzqqqyzz5pzpjk98hj7z978r9xc9d2ymagw6tga0lx0s06y8lhpy9twc2kp8uwdqqqqpwqpw5#BAACAwTDEKKhS9_iA_qOc1n4ljVt',
  // Canonical, living NIP-5D specification (the source of truth — never a repo copy).
  spec: 'https://github.com/nostr-protocol/nips/pull/2303',
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
      'Build-time napplet manifest generation. Hashes each file, signs a kind 35129 manifest event (NIP-5A tag schema), injects requires meta tags.',
    jsr: true,
  },
  {
    name: '@napplet/cli',
    blurb:
      'Deno CLI for discovering, inspecting, testing, and deploying built napplets. Publishes NIP-5A manifests to Blossom and Nostr relays.',
    jsr: true,
  },
  {
    name: '@napplet/conformance',
    blurb:
      'Framework-agnostic protocol conformance engine — reference mock shell, per-NAP envelope validators, a manifest validator, and reporters. A dev/test tool, not loaded in the sandbox.',
    jsr: true,
  },
  {
    name: '@napplet/conformance-cli',
    blurb:
      'The headless napplet-conformance runner. Drives the conformance engine against your napplet in real Chromium via Playwright — wire it up as test:conformance.',
    jsr: false,
  },
  {
    name: '@napplet/conformance-web',
    blurb:
      'Browser conformance runtime. Loads a napplet URL, runs the conformance engine live in the page, and powers the deployed /conformance app.',
    jsr: false,
  },
  {
    name: '@napplet/boilerplate',
    blurb:
      'Interactive npx generator. Clones the boilerplate template and prepares a Vite + TypeScript napplet starter in seconds.',
    jsr: false,
  },
  {
    name: '@napplet/skills',
    blurb:
      'Agent skills — design, build, and test a napplet end-to-end from one prompt. The napplet-skills CLI installs them into Claude Code, Cursor, Windsurf, AGENTS.md, Gemini, or Copilot.',
    jsr: true,
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
