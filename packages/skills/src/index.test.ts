import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listSkills, readSkill, install, skillsRoot, TARGETS } from './index.js';

describe('skill registry', () => {
  it('ships the napplet skills', () => {
    const names = listSkills().map((s) => s.name);
    expect(names).toEqual(['build-napplet', 'design-napplet', 'make-napplet', 'port-nostr-app', 'test-napplet']);
  });

  it('keeps authoring skills aligned with implemented package NAP domains', () => {
    const implementedDomains = [
      'relay',
      'identity',
      'storage',
      'inc',
      'theme',
      'keys',
      'media',
      'notify',
      'config',
      'resource',
      'cvm',
      'outbox',
      'upload',
      'intent',
      'ble',
      'webrtc',
      'link',
      'count',
      'lists',
      'serial',
      'common',
      'dm',
    ];

    for (const skill of ['design-napplet', 'build-napplet', 'make-napplet', 'port-nostr-app']) {
      const markdown = readSkill(skill);
      for (const domain of implementedDomains) {
        expect(markdown).toContain(`\`${domain}\``);
      }
    }

    const buildSkill = readSkill('build-napplet');
    expect(buildSkill).toContain('Sandbox Authority Contract');
    expect(buildSkill).toContain('Never call `fetch`, `XMLHttpRequest`, `WebSocket`');
    expect(buildSkill).toContain('ROMs, WASM companions, images, avatars, media, fonts, JSON');
    expect(buildSkill).toContain('If a dependency contains dormant forbidden references');
    expect(buildSkill).toContain('If the feature mentions shortcuts');
    expect(buildSkill).toContain('NAP-KEYS');
    expect(buildSkill).toContain('keys.register');
    expect(buildSkill).toContain('SDK-first');
    expect(buildSkill).toContain('Use direct `window.napplet?.domain` access only');
    expect(buildSkill).toContain("import { resource } from '@napplet/sdk';");
    expect(buildSkill).toContain("import { config, themeGet, themeOnChanged } from '@napplet/sdk';");
    expect(buildSkill).not.toContain('Equivalently call `window.napplet.<domain>.*` directly');
    expect(buildSkill).not.toContain('Examples below use whichever reads clearest');

    const makeSkill = readSkill('make-napplet');
    expect(makeSkill).toContain('Implementation code is SDK-first');
    expect(makeSkill).toContain('Do not ship a napplet that "mostly works"');
    expect(makeSkill).toContain('Triage The Project And Toolchain');
    expect(makeSkill).toContain('Never finish');
    expect(makeSkill).toContain('raw Vite URL presented as a working napplet preview');

    const designSkill = readSkill('design-napplet');
    expect(designSkill).toContain('SDK helpers:');
    expect(designSkill).toContain('Design as if direct browser authority does not exist');
    expect(designSkill).toContain('NAP-THEME is a whole-surface concern');
    expect(designSkill).toContain('theme.colors.background');

    const themeBuild = readSkill('build-napplet');
    expect(themeBuild).toContain('Apply NAP-THEME to the entire surface');
    expect(themeBuild).toContain('root.style.backgroundColor');
    expect(themeBuild).toContain('napplet paja -- pnpm vite --host 127.0.0.1');

    const portSkill = readSkill('port-nostr-app');
    expect(portSkill).toContain('with `@napplet/sdk` imports');
    expect(portSkill).toContain('Do not preserve browser authority from the source app');

    const testSkill = readSkill('test-napplet');
    expect(testSkill).toContain('Testing is not green if the napplet still owns browser authority');
    expect(testSkill).toContain('grep -RInE "fetch\\\\s*\\\\(');
    expect(testSkill).toContain('A dark card on a');
    expect(testSkill).toContain('The final preview link must be the Paja/runtime URL');
  });

  it('keeps runtime capability guidance aligned with the current SDK contract', () => {
    const affectedSkills = ['design-napplet', 'build-napplet', 'make-napplet', 'port-nostr-app'];
    const packageReadme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const boilerplateReadme = readFileSync(
      new URL('../../boilerplate/README.md', import.meta.url),
      'utf8',
    );
    const boilerplateProse = boilerplateReadme.replace(/\s+/g, ' ');

    for (const skill of affectedSkills) {
      const markdown = readSkill(skill);
      const prose = markdown.replace(/\s+/g, ' ');
      expect(prose).toContain(
        'Current packages do not expose `window.napplet.shell`, `shell.ready()`, or `shell.supports(...)`',
      );
      expect(prose).toContain('Use `@napplet/sdk` wrappers for calls');
      expect(prose).toContain('Do not add `keys` to `requires`');
    }

    const buildSkill = readSkill('build-napplet');
    expect(buildSkill).toContain('https://github.com/napplet/naps/pull/14');
    expect(buildSkill).toContain('config.registerSchema');
    expect(buildSkill).not.toContain('configSchema');
    expect(buildSkill).not.toContain('<meta name="napplet-type">');

    for (const skill of [...affectedSkills, 'test-napplet']) {
      expect(readSkill(skill)).not.toContain('targetAuthors');
    }

    const makeSkill = readSkill('make-napplet');
    const makeProse = makeSkill.replace(/\s+/g, ' ');
    expect(makeProse).toContain('`outbox.getEvent`: `author`, `relays`, `timeoutMs`');
    expect(makeProse).toContain('`outbox.query` / `outbox.subscribe`: `authors`, `relays`, `limit`, `timeoutMs`');
    expect(makeProse).toContain('`outbox.publish`: `relays`, `toOutbox`, `toInboxes`');
    expect(makeProse).toContain('No `strategy`, subscribe `live`, publish `timeoutMs`, or `outbox.eose`');

    expect(packageReadme).toContain('`window.napplet?.domain` only for optional');
    expect(packageReadme).toContain('no `shell.ready()` / `shell.supports(...)` API');
    expect(packageReadme).toContain('keep optional enhancements such as');
    expect(packageReadme).not.toContain('availability gates');
    expect(packageReadme).not.toContain('capability gating via domain presence');

    expect(boilerplateProse).toContain('napplet skills install --to codex');
    expect(boilerplateReadme).toContain('https://github.com/nostr-protocol/nips/pull/2303');
    expect(boilerplateReadme).toContain('https://github.com/napplet/naps/pull/32');
    expect(boilerplateReadme).toContain('https://github.com/napplet/naps/pull/2');
    expect(boilerplateProse).toContain('skills provide non-normative authoring guidance');
    expect(boilerplateProse).toContain('normal Nostr reads and publishes are OUTBOX-first');
    expect(boilerplateProse).toContain('RELAY is an explicit relay-local escape hatch');
    expect(boilerplateProse).toContain('`requires` lists hard requirements only');
  });

  it('ships opaque convention guidance from the canonical skills directory', () => {
    const canonicalSkills = ['build-napplet', 'design-napplet', 'make-napplet'];

    for (const skill of canonicalSkills) {
      const markdown = readSkill(skill);
      expect(markdown).toContain('napplet:note/open');
      expect(markdown).toContain('napplet:profile/open');
      expect(markdown).toContain('napplet:dm/open');
      expect(markdown).toContain('web#183');
      expect(markdown).not.toMatch(/\bNAP-[1-5]\b/);
      expect(markdown).not.toContain('kind:<n>');
    }

    const rootSkills = new URL('../../../skills', import.meta.url);
    expect(lstatSync(rootSkills).isSymbolicLink()).toBe(true);
    expect(readlinkSync(rootSkills)).toBe('packages/skills/skills');
    expect(realpathSync(rootSkills)).toBe(realpathSync(skillsRoot()));
  });

  it('parses a description from each SKILL.md frontmatter', () => {
    for (const s of listSkills()) expect(s.description.length).toBeGreaterThan(10);
  });

  it('readSkill returns full markdown with frontmatter', () => {
    const md = readSkill('build-napplet');
    expect(md.startsWith('---')).toBe(true);
    expect(md).toContain('# Building a Napplet');
  });

  it('throws on an unknown skill', () => {
    expect(() => readSkill('nope')).toThrow(/unknown skill/);
  });
});

describe('install', () => {
  let cwd: string;
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'napplet-skills-'));
  });
  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it('skillDir target writes SKILL.md per skill', () => {
    const results = install({ to: 'claude', cwd });
    expect(results).toHaveLength(5);
    expect(existsSync(join(cwd, '.claude/skills/build-napplet/SKILL.md'))).toBe(true);
    expect(results.every((r) => r.action === 'wrote')).toBe(true);
  });

  it('codex target writes project-local Codex skills', () => {
    const results = install({ to: 'codex', cwd, skills: ['make-napplet'] });
    expect(results).toEqual([
      {
        skill: 'make-napplet',
        dest: join(cwd, '.codex/skills/make-napplet/SKILL.md'),
        action: 'wrote',
      },
    ]);
    expect(readFileSync(join(cwd, '.codex/skills/make-napplet/SKILL.md'), 'utf8')).toContain(
      '# Making A Napplet End To End',
    );
  });

  it('ruleFile target writes one .mdc per skill with cursor frontmatter', () => {
    install({ to: 'cursor', cwd });
    const f = join(cwd, '.cursor/rules/build-napplet.mdc');
    expect(existsSync(f)).toBe(true);
    expect(readFileSync(f, 'utf8')).toContain('alwaysApply: false');
  });

  it('appendDoc target folds all skills into one file between markers', () => {
    install({ to: 'agents', cwd });
    const doc = readFileSync(join(cwd, 'AGENTS.md'), 'utf8');
    expect(doc).toContain('@napplet/skills:start');
    expect(doc).toContain('## Skill: make-napplet');
    expect(doc).toContain('## Skill: design-napplet');
    expect(doc).toContain('## Skill: test-napplet');
  });

  it('appendDoc is idempotent — re-install replaces its own block', () => {
    install({ to: 'agents', cwd });
    install({ to: 'agents', cwd });
    const doc = readFileSync(join(cwd, 'AGENTS.md'), 'utf8');
    expect(doc.match(/@napplet\/skills:start/g)).toHaveLength(1);
  });

  it('custom --dir override writes a skillDir at an arbitrary path', () => {
    install({ dir: 'vendor/skills', cwd, skills: ['test-napplet'] });
    expect(existsSync(join(cwd, 'vendor/skills/test-napplet/SKILL.md'))).toBe(true);
  });

  it('symlink mode links instead of copying', () => {
    const [r] = install({ to: 'claude', cwd, skills: ['build-napplet'], symlink: true });
    expect(r.action).toBe('symlinked');
    expect(lstatSync(join(cwd, '.claude/skills/build-napplet/SKILL.md')).isSymbolicLink()).toBe(true);
  });

  it('exposes the documented targets', () => {
    expect(Object.keys(TARGETS)).toEqual(
      expect.arrayContaining(['claude', 'claude-user', 'codex', 'cursor', 'windsurf', 'agents', 'gemini', 'copilot']),
    );
  });
});
