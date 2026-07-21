import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readmeUrl = new URL('../README.md', import.meta.url);
const readme = await readFile(readmeUrl, 'utf8');
const prose = readme.replace(/\s+/g, ' ');

test('points generated projects to the shipped skills', () => {
  assert.match(prose, /napplet skills install --to codex/);
  assert.match(readme, /https:\/\/github\.com\/nostr-protocol\/nips\/pull\/2303/);
  assert.match(readme, /https:\/\/github\.com\/napplet\/naps\/pull\/32/);
  assert.match(readme, /https:\/\/github\.com\/napplet\/naps\/pull\/2/);
  assert.match(prose, /skills provide non-normative authoring guidance/);
  assert.match(prose, /runtime injects `window\.napplet`/);
  assert.match(prose, /app calls use `@napplet\/sdk`/);
  assert.match(prose, /optional fallbacks/);
  assert.match(prose, /OUTBOX-first/);
  assert.match(prose, /relay-local escape hatch/);
  assert.match(prose, /`requires` lists hard requirements only/);
});

test('does not revive retired application guidance', () => {
  const joined = (...parts) => parts.join('');
  const shimSpecifier = ['@napplet', 'shim'].join('/');
  const retiredPatterns = [
    new RegExp(`import\\s+(?:[^'\"]+\\s+from\\s+)?['\"]${shimSpecifier}['\"]`),
    new RegExp(`shell(?:\\.|\\?\\.)${joined('rea', 'dy')}\\s*\\(`),
    new RegExp(`shell(?:\\.|\\?\\.)${joined('in', 'it')}\\s*\\(`),
    new RegExp(`shell(?:\\.|\\?\\.)${joined('supp', 'orts')}\\s*\\(`),
    new RegExp(`window(?:\\.|\\?\\.)napplet(?:\\.|\\?\\.)${joined('sh', 'ell')}`),
    new RegExp(`${joined('discover', 'Services')}\\s*\\(`),
    new RegExp(`${joined('has', 'Service')}(?:Version)?\\s*\\(`),
    ...['query', 'subscribe', 'publish'].map(
      (operation) => new RegExp(`${joined('re', 'lay')}\\s*(?:\\.|\\?\\.)${operation}\\s*\\(`),
    ),
    new RegExp(`\\b${joined('requ', 'ires')}\\s*:`),
    new RegExp(`\\.codex/skills/.+/${joined('SKILL', '.md')}`),
  ];
  const retiredExamples = [
    `import { install } from '${shimSpecifier}';`,
    `shell?.${joined('rea', 'dy')}()`,
    `shell.${joined('in', 'it')}()`,
    `shell.${joined('supp', 'orts')}('storage')`,
    `window?.napplet?.${joined('sh', 'ell')}`,
    `${joined('discover', 'Services')}()`,
    `${joined('has', 'Service', 'Version')}('relay', '1')`,
    `${joined('re', 'lay')}.query({})`,
    `${joined('re', 'lay')}?.subscribe({})`,
    `${joined('re', 'lay')}.publish({})`,
    `${joined('requ', 'ires')}: ['relay']`,
    `.codex/skills/napplet-author/${joined('SKILL', '.md')}`,
  ];

  for (const [index, example] of retiredExamples.entries()) {
    assert.match(example, retiredPatterns[index]);
  }

  for (const pattern of retiredPatterns) {
    assert.doesNotMatch(readme, pattern);
  }

  for (const domain of [joined('con', 'nect'), joined('cl', 'ass')]) {
    assert.doesNotMatch(readme, new RegExp(`(?:@napplet/nap/|window\\.napplet\\.)${domain}`));
  }
});
