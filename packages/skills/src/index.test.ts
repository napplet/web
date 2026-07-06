import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listSkills, readSkill, install, TARGETS } from './index.js';

describe('skill registry', () => {
  it('ships the napplet skills', () => {
    const names = listSkills().map((s) => s.name);
    expect(names).toEqual(['build-napplet', 'design-napplet', 'make-napplet', 'port-nostr-app', 'test-napplet']);
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
