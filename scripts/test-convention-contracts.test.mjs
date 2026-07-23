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
 * @returns {Promise<Awaited<ReturnType<typeof scanConventionContracts>>>}
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

test('permits adopted intent contracts and optional same-tag event kinds', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/core/src/types/intent.ts', `
      export interface IntentContract { convention: string; eventKinds?: number[]; }
      export const candidate = { contracts: [{ convention: 'napplet:note/open', eventKinds: [1] }] };
      export const delivery = { type: 'intent.deliver', delivery: { sender: 'runtime' } };
    `);
    await writeFixture(root, 'apps/docs/guide/intents.md', `
      An archetype tag may include optional same-tag kind:1 fields.
      Intent invocation accepts napplet:note/open?target=abc, while handler metadata stays queryless.
    `);
  });

  assert.deepEqual(violations, []);
});

test('rejects superseded intent result, delivery, metadata, INC-coupling, and tag-shape guidance', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/core/src/types/intent.ts', `
      const result = { handled: true, windowId: 'window-1', behavior: { newWindow: true } };
      const message = { type: 'intent.deliver', id: 'delivery-1' };
    `);
    await writeFixture(root, 'packages/vite-plugin/src/manifest.ts', `
      const tag = ['archetype', 'note', 'napplet:note/open?kind=1'];
    `);
    await writeFixture(root, 'apps/docs/guide/intents.md', `
      Intent delivery requires NAP-INC.
      Archetype tags must contain exactly three fields.
    `);
  });
  const families = new Set(violations.map(({ family }) => family));

  assert.deepEqual(families, new Set([
    'intent-result-lifecycle',
    'intent-delivery-id',
    'query-bearing-handler-metadata',
    'intent-delivery-inc-coupling',
    'fixed-archetype-tag-shape',
  ]));
});

test('retains numbered-NAP retirement and exact-routing guidance checks', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/core/src/legacy.ts', `
      export const convention = 'note:NAP-4';
    `);
    await writeFixture(root, 'apps/docs/guide/inc.md', `
      INC convention queries are forbidden because topic routing is exact.
    `);
  });
  const families = new Set(violations.map(({ family }) => family));

  assert.equal(families.has('numbered-convention'), true);
  assert.equal(families.has('slug-number-example'), true);
  assert.equal(families.has('inc-query-transposition-denial'), true);
});

test('excludes unrelated language, historical records, negative tests, and the root skills symlink', async () => {
  const violations = await scanFixture(async (root) => {
    await writeFixture(root, 'packages/core/src/dispatch.ts', `
      export function dispatch() { return { handled: true, kind: 1, label: 'kind:1' }; }
    `);
    await writeFixture(root, 'packages/core/CHANGELOG.md', `
      Intent delivery requires INC and archetype tags have exactly three fields.
    `);
    await writeFixture(root, 'apps/docs/guide/161-24-SUMMARY.md', `
      Intent delivery requires INC and archetype tags have exactly three fields.
    `);
    await writeFixture(root, 'packages/core/src/intent-contract.test.ts', `
      // @ts-expect-error IntentResult does not expose handled or windowId.
      const message = { type: 'intent.deliver', id: 'delivery-1' };
      const tag = ['archetype', 'note', 'napplet:note/open?kind=1'];
    `);
    await writeFixture(root, 'packages/skills/skills/build-napplet/SKILL.md', 'valid guidance');
    await symlink('packages/skills/skills', join(root, 'skills'));
  });

  assert.deepEqual(violations, []);
});
