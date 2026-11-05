/** Build-time, non-normative documentation derived from the shipped implementation catalog. */
import { NAP_IMPLEMENTATIONS } from '../../packages/core/src/nap-catalog.js';
import { getNapImplementation } from '../../packages/core/src/nap-maturity.js';

/** Render the complete implementation overview, keeping upstream state separate. */
export function napMaturityTable(): string {
  const rows = Object.entries(NAP_IMPLEMENTATIONS).map(([domain, entry]) =>
    `| \`${domain}\` | ${entry.maturity ?? 'unclassified'} | [${entry.proposal.status}](${entry.proposal.url}) | ${entry.rationale} |`,
  );
  return [
    '| Domain | Implementation maturity | Proposal status | Assessment |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** Render a domain assessment with release-time status provenance. */
export function napMaturityNotice(domain: string): string {
  const entry = getNapImplementation(domain);
  if (!entry) return '';
  return `> **Implementation: ${entry.maturity ?? 'unclassified'} · Proposal: [${entry.proposal.status}](${entry.proposal.url})** (status checked ${entry.proposal.checkedAt}). ${entry.rationale} All capabilities remain subject to change. [Maturity and opt-in policy](/naps/maturity).\n`;
}

/**
 * Add catalog-driven labels before VitePress parses Markdown.
 * @param source Authored documentation Markdown.
 * @param relativePath Path relative to the documentation root.
 * @returns Markdown with generated notices and overview tables.
 * @example
 * ```ts
 * renderNapMaturityMarkdown('# LLM\n', 'naps/llm.md');
 * ```
 */
export function renderNapMaturityMarkdown(source: string, relativePath: string): string {
  if (!relativePath.startsWith('naps/')) return source;
  let rendered = source
    .replace('<!-- nap-maturity-table -->', napMaturityTable())
    .replace('<!-- nap-domain-index -->', napDomainIndex());
  rendered = rendered.replace(/<!-- nap-maturity:([a-z]+) -->/g, (_, domain: string) => napMaturityNotice(domain));
  if (relativePath === 'naps/index.md') return rendered;
  const domain = relativePath.slice('naps/'.length).replace(/\.md$/, '');
  const notice = napMaturityNotice(domain);
  return notice ? rendered.replace(/^(# .+\n)/m, `$1\n${notice}`) : rendered;
}

/** One sidebar and index group of NAP domain pages. */
export interface NapDocGroup {
  /** Group heading shown in the sidebar and on the index page. */
  readonly title: string;
  /** Domains in display order, each mapped to its one-line purpose. */
  readonly domains: Readonly<Record<string, string>>;
}

/** Every shipped domain, grouped by purpose; drives the sidebar and the index page. */
export const NAP_DOC_GROUPS: readonly NapDocGroup[] = [
  {
    title: 'Runtime and environment',
    domains: {
      shell: 'Optional environment snapshot, readiness, and domain presence checks.',
      theme: 'Read-only shell theme — colors, fonts, background, and live updates.',
      config: 'Schema-driven per-napplet settings rendered and persisted by the shell.',
      keys: 'Named actions and keyboard bindings owned by the shell.',
      notify: 'Shell-rendered notifications, badges, and action callbacks.',
      media: 'Media sessions with shell-side playback controls.',
      link: 'User-visible external link opening under shell policy.',
    },
  },
  {
    title: 'Identity and social',
    domains: {
      identity: 'Read-only user queries — pubkey, profile, follows. Never signs.',
      common: 'Common social actions — follows, reactions, reports, NIP-19 helpers.',
      lists: 'NIP-51 list add/remove with runtime-owned signing and encryption.',
      dm: 'Direct-message conversations, history, and sending via the runtime.',
    },
  },
  {
    title: 'Nostr events and relays',
    domains: {
      outbox: 'Outbox-aware reads and publishes — the default event boundary.',
      relay: 'Low-level relay proxy for explicit relay-local behavior.',
      count: 'Aggregate counts for NIP-01 filters.',
    },
  },
  {
    title: 'Napplet to napplet',
    domains: {
      inc: 'Topic-based publish/subscribe between running napplets.',
      intent: 'URI-addressed intents routed to a handler napplet.',
    },
  },
  {
    title: 'Data, files, and network',
    domains: {
      storage: 'Scoped key-value storage isolated per napplet.',
      fs: 'Virtual filesystem — pickers, reads, writes, and change events.',
      resource: 'Sandboxed byte fetching over https, blossom, nostr, and data URIs.',
      upload: 'File and blob upload over NIP-96 and Blossom rails.',
      blossom: 'Server-directed Blossom blob operations and ordered user server lists.',
      cvm: 'ContextVM bridge — MCP tools and resources over Nostr.',
    },
  },
  {
    title: 'Devices and realtime',
    domains: {
      gamepad: 'Focus-scoped controller snapshots.',
      ble: 'Bluetooth LE / GATT sessions with opaque session ids.',
      serial: 'User-approved serial port sessions.',
      webrtc: 'Runtime-owned WebRTC sessions carrying application payloads.',
    },
  },
  {
    title: 'AI',
    domains: {
      llm: 'User-selected language model inference through the runtime.',
    },
  },
];

/** Render the grouped domain index with purpose and implementation maturity. */
export function napDomainIndex(): string {
  return NAP_DOC_GROUPS.map((group) => {
    const rows = Object.entries(group.domains).map(([domain, purpose]) => {
      const entry = getNapImplementation(domain);
      return `| [\`${domain}\`](./${domain}) | ${purpose} | ${entry?.maturity ?? 'unclassified'} |`;
    });
    return [`### ${group.title}`, '', '| Domain | Purpose | Maturity |', '| --- | --- | --- |', ...rows].join('\n');
  }).join('\n\n');
}
