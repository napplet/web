import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { scanConventionContracts } from './test-convention-contracts.mjs';

/**
 * Writes a fixture file, creating its parent directory when necessary.
 *
 * @param {string} root - Fixture root directory.
 * @param {string} relativePath - Path relative to the fixture root.
 * @param {string} contents - File contents.
 * @returns {Promise<void>}
 */
async function writeFixture(root, relativePath, contents) {
  const filePath = join(root, relativePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

/**
 * Creates an isolated active-tree fixture for the scanner tests.
 *
 * @param {(root: string) => Promise<void>} arrange - Fixture setup callback.
 * @returns {Promise<ReturnType<typeof scanConventionContracts>>}
 */
async function scanFixture(arrange) {
  const root = await mkdtemp(join(tmpdir(), 'napplet-convention-contracts-'));

  try {
    await arrange(root);
    return await scanConventionContracts(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('fails for every retired convention vocabulary family in active files', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/core/src/types/intent.ts', `
      export interface IntentContract { protocol: string; }
      export const candidate = { protocols: ['NAP-4'], contracts: [] };
    `);
    await writeFixture(root, 'apps/docs/guide/conventions.md', `
      Configure note:NAP-4 before invoking an intent.
    `);
    await writeFixture(root, 'packages/vite-plugin/src/manifest.ts', `
      const tag = ['archetype', 'note', 'kind:1'];
    `);
  });

  assert.equal(violations.some(({ family }) => family === 'intent-contract'), true);
  assert.equal(violations.some(({ family }) => family === 'numbered-convention'), true);
  assert.equal(violations.some(({ family }) => family === 'slug-number-example'), true);
  assert.equal(violations.some(({ family }) => family === 'archetype-kind-constraint'), true);
});

test('passes current convention fields and opaque convention examples', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/core/src/types/intent.ts', `
      export interface IntentRequest { convention?: string; }
      export const candidate = { conventions: ['napplet:note/open'] };
    `);
    await writeFixture(root, 'apps/docs/guide/conventions.md', `
      Use napplet:note/open as an opaque convention name.
    `);
  });

  assert.deepEqual(violations, []);
});

test('excludes changelogs, archived planning, and the root skills symlink', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'CHANGELOG.md', 'The old note:NAP-4 contract shipped previously.');
    await writeFixture(root, '.planning/phases/160/PLAN.md', 'protocols: [NAP-4]');
    await writeFixture(root, 'packages/skills/skills/build-napplet/SKILL.md', 'current convention');
    await symlink('packages/skills/skills', join(root, 'skills'));
  });

  assert.deepEqual(violations, []);
});

test('allows unrelated WebRTC, URL, Nostr-kind, and workspace dependency uses', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/core/src/types/webrtc.ts', `
      export const config = { iceTransportPolicy: 'relay' };
      export const url = new URL('wss://relay.example');
    `);
    await writeFixture(root, 'packages/core/src/types/events.ts', `
      export const event = { kind: 1, protocol: 'NIP-5D', label: 'kind:1' };
    `);
    await writeFixture(root, 'packages/core/package.json', `
      { "dependencies": { "@napplet/nap": "workspace:*" } }
    `);
  });

  assert.deepEqual(violations, []);
});

test('allows legacy literals only in dedicated Vite and CLI rejection tests', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/vite-plugin/src/index.test.ts', `
      expect(() => validate('note:NAP-4')).toThrow();
      expect(() => validate('kind:1')).toThrow();
    `);
    await writeFixture(root, 'packages/cli/tests/config_test.ts', `
      assertThrows(() => parseArchetypeContract('note:NAP-4'));
      assertThrows(() => parseArchetypeContract('kind:1'));
    `);
  });

  assert.deepEqual(violations, []);
});

test('rejects obsolete INC convention-query denial guidance in active authoring prose', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/skills/skills/build-napplet/SKILL.md', `
      INC convention queries are forbidden because topic routing is exact.
    `);
  });

  assert.equal(
    violations.some(({ family }) => family === 'inc-query-transposition-denial'),
    true,
  );
});

test('allows NAP-INC emit transposition and unrelated query APIs', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/nap/README.md', `
      NAP-INC emit('napplet:profile/open?pubkey=abc123') transposes a shallow
      text payload before it routes the stable topic exactly. NAP-INTENT and
      manifest conventions remain opaque.
    `);
    await writeFixture(root, 'packages/core/src/url.ts', `
      const query = new URL('https://example.com/?page=1').searchParams;
    `);
  });

  assert.deepEqual(violations, []);
});
