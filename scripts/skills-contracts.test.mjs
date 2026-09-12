import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const skillsDir = path.join(root, 'skills');

/** Skill names that must ship, in the order the docs table lists them. */
const EXPECTED_SKILLS = [
  'napplet-make',
  'napplet-design',
  'napplet-ui',
  'napplet-build',
  'napplet-sdk',
  'napplet-interop',
  'napplet-port',
  'napplet-test',
];

function parseFrontmatter(markdown) {
  assert.ok(markdown.startsWith('---\n'), 'SKILL.md must start with YAML frontmatter');
  const end = markdown.indexOf('\n---', 4);
  assert.notEqual(end, -1, 'frontmatter must be closed');
  const block = markdown.slice(4, end);
  const fields = {};
  for (const line of block.split('\n')) {
    const match = line.match(/^([a-z][a-z0-9_-]*):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return { fields, body: markdown.slice(end + 4) };
}

async function loadSkills() {
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills = new Map();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(skillsDir, entry.name, 'SKILL.md');
    const source = await readFile(file, 'utf8');
    skills.set(entry.name, { file: path.relative(root, file), source, ...parseFrontmatter(source) });
  }
  return skills;
}

const skills = await loadSkills();

test('skills/ is a real directory of napplet-* skills that skills.sh can discover', async () => {
  const info = await stat(skillsDir);
  assert.ok(info.isDirectory());
  assert.deepEqual([...skills.keys()].sort(), [...EXPECTED_SKILLS].sort());
});

test('every skill has skills.sh-compatible frontmatter whose name matches its directory', () => {
  for (const [dir, skill] of skills) {
    assert.equal(skill.fields.name, dir, `${skill.file} name must equal its directory`);
    assert.match(dir, /^napplet-[a-z0-9-]+$/, `${dir} must be lowercase napplet-<skill>`);
    assert.ok(skill.fields.description?.length > 40, `${skill.file} needs a descriptive description`);
    assert.ok(skill.fields.description.length < 1024, `${skill.file} description is too long`);
    assert.doesNotMatch(skill.body, /^\s*$/, `${skill.file} has no body`);
  }
});

test('skills only cross-reference skills that exist, never the retired names', () => {
  const retired = /\b(?:make-napplet|design-napplet|build-napplet|port-nostr-app|test-napplet)\b/;
  for (const skill of skills.values()) {
    assert.doesNotMatch(skill.source, retired, skill.file);
    assert.doesNotMatch(skill.source, /napplet skills (?:install|list|print)|@napplet\/skills/, skill.file);
    for (const match of skill.source.matchAll(/`napplet-([a-z0-9-]+)`/g)) {
      const referenced = `napplet-${match[1]}`;
      if (referenced === 'napplet-conformance') continue; // the CLI binary, not a skill
      assert.ok(skills.has(referenced), `${skill.file} references unknown skill ${referenced}`);
    }
  }
});

test('napplet-ui carries the applet visual contract', () => {
  const ui = skills.get('napplet-ui').source;
  for (const pattern of [
    /No title header/i,
    /runtime (?:already )?(?:draws|shows) the (?:napplet'?s )?name/i,
    /Compact by default/i,
    /tiny/, /compact/, /regular/, /wide/,
    /Minimum size notice/i,
    /Needs at least 320×240/,
    /container-type: inline-size/,
    /themeOnChanged/,
    /200×160/, /2400×1200/,
  ]) {
    assert.match(ui, pattern, `napplet-ui must state ${pattern}`);
  }
  // The starter's website-shaped rules are called out for removal.
  assert.match(ui, /min-width: 320px/);
  assert.match(ui, /masthead/);
});

test('the workflow skills route through napplet-ui and repeat the no-title-header rule', () => {
  for (const name of ['napplet-make', 'napplet-design', 'napplet-build', 'napplet-test', 'napplet-port']) {
    const source = skills.get(name).source;
    assert.match(source, /`napplet-ui`/, `${name} must hand layout work to napplet-ui`);
    assert.match(source, /title header|masthead|shows the name|site chrome/i, `${name} must restate the header rule`);
  }
  assert.match(skills.get('napplet-make').source, /`napplet-design` → `napplet-ui` → `napplet-build` → `napplet-test`/);
});

test('build and design keep the boilerplate-first and OUTBOX-first guidance', () => {
  const build = skills.get('napplet-build').source;
  assert.match(build, /napplet create/);
  assert.match(build, /napplet init/);
  assert.match(build, /artifactMode: 'single-file'/);
  assert.match(build, /pnpm verify/);
  assert.match(build, /pnpm test:conformance/);
  assert.match(build, /napplet paja -- pnpm vite --host 127\.0\.0\.1/);
  const design = skills.get('napplet-design').source;
  assert.match(design, /outbox\.publish/);
  assert.match(design, /relay escape hatches/);
  assert.match(design, /minimum size:/);
  assert.match(design, /density:/);
});

test('the SDK reference lists every shipped domain and no skill imports the runtime shim', () => {
  const sdk = skills.get('napplet-sdk').source;
  for (const domain of [
    'relay', 'identity', 'storage', 'inc', 'theme', 'keys', 'media', 'notify', 'config', 'resource',
    'cvm', 'outbox', 'upload', 'intent', 'ble', 'webrtc', 'link', 'count', 'lists', 'serial', 'fs',
    'common', 'dm',
  ]) {
    assert.match(sdk, new RegExp(`\`${domain}\``), `napplet-sdk must list ${domain}`);
  }
  const joined = (...parts) => parts.join('');
  for (const skill of skills.values()) {
    assert.doesNotMatch(skill.source, new RegExp(`import\\s+[^'"]+from\\s+['"]@napplet/${joined('sh', 'im')}['"]`), skill.file);
  }
});

test('docs and website point at the skills.sh install command and the new skill names', async () => {
  const files = [
    'README.md',
    'AGENTS.md',
    'apps/docs/guide/agent-skills.md',
    'apps/docs/guide/getting-started.md',
    'apps/docs/guide/build-note-drafts-napplet-with-ai-agent-and-skills.md',
    'apps/docs/packages/cli.md',
    'apps/web/src/sections/Packages.svelte',
    'packages/cli/README.md',
    'packages/cli/src/guide.ts',
    'packages/boilerplate/README.md',
    'packages/boilerplate/src/index.ts',
  ];
  for (const file of files) {
    const source = await readFile(path.join(root, file), 'utf8');
    assert.match(source, /npx skills add napplet\/napplet/, file);
    assert.doesNotMatch(source, /napplet skills (?:install|list|print)|@napplet\/skills/, file);
  }
  const reference = await readFile(path.join(root, 'apps/docs/guide/agent-skills.md'), 'utf8');
  for (const name of EXPECTED_SKILLS) assert.match(reference, new RegExp(`\`${name}\``), name);
});
