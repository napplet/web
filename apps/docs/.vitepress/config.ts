import { defineConfig } from 'vitepress';

// Single source of truth for the deploy domain.
const SITE_URL = 'https://napplet.run';
const COMMUNITY_URL =
  'https://armada.buzz/invite/naddr1qvzqqqyzz5pzpjk98hj7z978r9xc9d2ymagw6tga0lx0s06y8lhpy9twc2kp8uwdqqqqpwqpw5#BAACAwTDEKKhS9_iA_qOc1n4ljVt';

export default defineConfig({
  base: '/docs/',
  lang: 'en-US',
  // Build to a modern target so esbuild (pinned to a patched release) doesn't
  // need to lower modern syntax to a legacy target. Fine for a docs site.
  vite: {
    build: { target: 'esnext' },
    esbuild: { target: 'esnext' },
  },
  title: 'napplet',
  description:
    'Documentation for the napplet protocol SDK — composable, sandboxed Nostr web applets that delegate to a host shell over the NIP-5D JSON envelope wire format.',
  // Keep .html in URLs: napplet.run is served from Bunny CDN storage + nsite,
  // neither of which rewrites extensionless paths (/foo → foo.html). cleanUrls
  // would emit extensionless links that 404 on a cold load. See site.ts links.
  cleanUrls: false,
  appearance: 'dark',
  sitemap: {
    hostname: SITE_URL,
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/docs/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#7b2ff7' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'napplet docs' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Composable Nostr apps — the napplet protocol SDK.',
      },
    ],
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: SITE_URL },
      { text: 'Guide', link: '/guide/' },
      { text: 'Packages', link: '/packages/' },
      { text: 'NAPs', link: '/naps/' },
      { text: 'Spec', link: '/spec' },
      { text: 'Community', link: COMMUNITY_URL },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What are napplets?', link: '/guide/' },
          { text: 'NIP-5D explained', link: '/guide/nip-5d' },
        ],
      },
      {
        text: 'Getting Started',
        items: [
          { text: 'Core concepts', link: '/guide/concepts' },
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Note Drafts from scratch', link: '/guide/build-note-drafts-napplet' },
          {
            text: 'Note Drafts from boilerplate',
            link: '/guide/build-note-drafts-napplet-from-boilerplate',
          },
          {
            text: 'Note Drafts with an AI agent',
            link: '/guide/build-note-drafts-napplet-with-ai-agent-and-skills',
          },
        ],
      },
      {
        text: 'Packages',
        items: [
          { text: 'Overview', link: '/packages/' },
          { text: '@napplet/core', link: '/packages/core' },
          { text: '@napplet/shim', link: '/packages/shim' },
          { text: '@napplet/sdk', link: '/packages/sdk' },
          { text: '@napplet/nap', link: '/packages/nap' },
          { text: '@napplet/vite-plugin', link: '/packages/vite-plugin' },
          { text: '@napplet/cli', link: '/packages/cli' },
          { text: '@napplet/conformance', link: '/packages/conformance' },
          { text: '@napplet/conformance-cli', link: '/packages/conformance-cli' },
          { text: '@napplet/conformance-web', link: '/packages/conformance-web' },
          { text: '@napplet/boilerplate', link: '/packages/boilerplate' },
          { text: '@napplet/skills', link: '/packages/skills' },
        ],
      },
      {
        text: 'NAP domains',
        items: [{ text: 'NAP domain reference', link: '/naps/' }],
      },
      {
        text: 'Reference',
        items: [{ text: 'NIP-5D spec status', link: '/spec' }],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/napplet/napplet' },
    ],
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'napplet is alpha — the spec is experimental and a moving target.',
    },
  },
});
