/**
 * @napplet/skills — agent skills for building napplets end-to-end.
 *
 * Ships three Markdown skills (`design-napplet`, `build-napplet`,
 * `test-napplet`) plus the logic to install them into whatever skill / rules
 * location a given coding agent reads. The `napplet-skills` CLI (see
 * `./cli.ts`) is a thin wrapper over the exports here.
 *
 * @packageDocumentation
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

/** Metadata for one shipped skill. */
export interface Skill {
  /** Kebab-case skill name, also the directory name. */
  name: string;
  /** One-line summary parsed from the SKILL.md `description` frontmatter. */
  description: string;
  /** Absolute path to the skill's `SKILL.md`. */
  path: string;
}

/**
 * Resolve the directory that holds the skill folders. Works both from built
 * `dist/` and from `src/` (both are siblings of `skills/`), and from a
 * published package tarball.
 */
export function skillsRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [join(here, '..', 'skills'), join(here, '..', '..', 'skills')]) {
    if (existsSync(candidate)) return resolve(candidate);
  }
  throw new Error('@napplet/skills: could not locate the skills/ directory');
}

/** Parse the `description:` field out of a SKILL.md YAML frontmatter block. */
function parseDescription(markdown: string): string {
  if (!markdown.startsWith('---')) return '';
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return '';
  const match = markdown.slice(0, end).match(/^description:\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

/** Strip the leading YAML frontmatter block from a SKILL.md body. */
function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---')) return markdown;
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return markdown;
  return markdown.slice(markdown.indexOf('\n', end + 1) + 1).replace(/^\s+/, '');
}

/**
 * List the skills shipped by this package.
 *
 * @returns Skill metadata, sorted by name.
 * @example
 * ```ts
 * import { listSkills } from '@napplet/skills';
 * for (const s of listSkills()) console.log(s.name, '—', s.description);
 * ```
 */
export function listSkills(): Skill[] {
  const root = skillsRoot();
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(root, e.name, 'SKILL.md')))
    .map((e) => {
      const path = join(root, e.name, 'SKILL.md');
      return { name: e.name, description: parseDescription(readFileSync(path, 'utf8')), path };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Read a skill's raw `SKILL.md` (frontmatter included).
 *
 * @param name - Skill name, e.g. `"build-napplet"`.
 * @returns The full Markdown source.
 */
export function readSkill(name: string): string {
  const skill = listSkills().find((s) => s.name === name);
  if (!skill) throw new Error(`unknown skill "${name}" — have: ${listSkills().map((s) => s.name).join(', ')}`);
  return readFileSync(skill.path, 'utf8');
}

/** How a target materializes skills on disk. */
export type TargetKind = 'skillDir' | 'ruleFile' | 'appendDoc';

/** An install destination for a particular agent / convention. */
export interface Target {
  /** Target id used on the CLI (`--to <id>`). */
  id: string;
  /** Human label shown in help. */
  label: string;
  /** Placement strategy. */
  kind: TargetKind;
  /** Base path relative to cwd (or absolute / home-anchored). */
  base: string;
  /** File extension for `ruleFile` targets. */
  ext?: string;
  /** True when `base` is anchored at the user home directory. */
  home?: boolean;
}

/**
 * Built-in install targets. `skillDir` writes `base/<name>/SKILL.md`;
 * `ruleFile` writes one `base/<name><ext>` per skill; `appendDoc` folds the
 * selected skills into a single `base` document between managed markers.
 */
export const TARGETS: Record<string, Target> = {
  claude: { id: 'claude', label: 'Claude Code (project)', kind: 'skillDir', base: '.claude/skills' },
  'claude-user': { id: 'claude-user', label: 'Claude Code (user, global)', kind: 'skillDir', base: '.claude/skills', home: true },
  cursor: { id: 'cursor', label: 'Cursor rules', kind: 'ruleFile', base: '.cursor/rules', ext: '.mdc' },
  windsurf: { id: 'windsurf', label: 'Windsurf rules', kind: 'ruleFile', base: '.windsurf/rules', ext: '.md' },
  agents: { id: 'agents', label: 'AGENTS.md (Codex, Amp, Jules, generic)', kind: 'appendDoc', base: 'AGENTS.md' },
  gemini: { id: 'gemini', label: 'Gemini CLI (GEMINI.md)', kind: 'appendDoc', base: 'GEMINI.md' },
  copilot: { id: 'copilot', label: 'GitHub Copilot', kind: 'appendDoc', base: '.github/copilot-instructions.md' },
};

const MARK_START = '<!-- @napplet/skills:start -->';
const MARK_END = '<!-- @napplet/skills:end -->';

/** Options for {@link install}. */
export interface InstallOptions {
  /** Target id from {@link TARGETS}, or a custom one via `dir`/`out`. */
  to?: string;
  /** Skill names to install; defaults to all. */
  skills?: string[];
  /** Working directory; defaults to `process.cwd()`. */
  cwd?: string;
  /** Override base path for `skillDir` placement (ignores `to`). */
  dir?: string;
  /** Override file path for `appendDoc` placement (ignores `to`). */
  out?: string;
  /** Symlink instead of copy (only valid for `skillDir`). */
  symlink?: boolean;
}

/** One written path plus how it was produced. */
export interface InstallResult {
  skill: string;
  dest: string;
  action: 'wrote' | 'symlinked' | 'appended';
}

function cursorFrontmatter(description: string): string {
  return `---\ndescription: ${description}\nalwaysApply: false\n---\n\n`;
}

/**
 * Install selected skills to a target.
 *
 * @param opts - {@link InstallOptions}.
 * @returns One {@link InstallResult} per written destination.
 * @example
 * ```ts
 * import { install } from '@napplet/skills';
 * install({ to: 'claude' });             // .claude/skills/<name>/SKILL.md
 * install({ to: 'agents' });             // append to ./AGENTS.md
 * install({ dir: 'vendor/skills' });     // custom skillDir
 * ```
 */
export function install(opts: InstallOptions = {}): InstallResult[] {
  const cwd = opts.cwd ?? process.cwd();
  const names = opts.skills?.length ? opts.skills : listSkills().map((s) => s.name);
  const skills = names.map((n) => ({ name: n, md: readSkill(n) }));

  // appendDoc override
  if (opts.out) return appendDoc(resolve(cwd, opts.out), skills);

  // skillDir override
  if (opts.dir) {
    const base = resolve(cwd, opts.dir);
    return skills.map((s) => placeSkillDir(base, s.name, s.md, opts.symlink));
  }

  const target = opts.to ? TARGETS[opts.to] : undefined;
  if (!target) throw new Error(`unknown target "${opts.to}" — have: ${Object.keys(TARGETS).join(', ')}`);

  const base = target.home ? join(homedir(), target.base) : resolve(cwd, target.base);

  if (target.kind === 'skillDir') return skills.map((s) => placeSkillDir(base, s.name, s.md, opts.symlink));
  if (target.kind === 'ruleFile') return skills.map((s) => placeRuleFile(base, target.ext ?? '.md', s.name, s.md));
  return appendDoc(base, skills);
}

function placeSkillDir(base: string, name: string, md: string, symlink?: boolean): InstallResult {
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, 'SKILL.md');
  if (symlink) {
    const src = join(skillsRoot(), name, 'SKILL.md');
    rmSync(dest, { force: true });
    symlinkSync(src, dest);
    return { skill: name, dest, action: 'symlinked' };
  }
  writeFileSync(dest, md);
  return { skill: name, dest, action: 'wrote' };
}

function placeRuleFile(base: string, ext: string, name: string, md: string): InstallResult {
  mkdirSync(base, { recursive: true });
  const dest = join(base, name + ext);
  const body = ext === '.mdc' ? cursorFrontmatter(parseDescription(md)) + stripFrontmatter(md) : md;
  writeFileSync(dest, body);
  return { skill: name, dest, action: 'wrote' };
}

function appendDoc(dest: string, skills: { name: string; md: string }[]): InstallResult[] {
  const block = [
    MARK_START,
    '<!-- Managed by `napplet-skills install`. Edit the source, not this block. -->',
    '',
    ...skills.flatMap((s) => [`## Skill: ${s.name}`, '', stripFrontmatter(s.md).trim(), '']),
    MARK_END,
    '',
  ].join('\n');

  mkdirSync(dirname(dest), { recursive: true });
  let existing = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
  const start = existing.indexOf(MARK_START);
  if (start !== -1) {
    const end = existing.indexOf(MARK_END);
    existing = existing.slice(0, start) + existing.slice(end + MARK_END.length).replace(/^\n/, '');
  }
  const sep = existing && !existing.endsWith('\n\n') ? (existing.endsWith('\n') ? '\n' : '\n\n') : '';
  writeFileSync(dest, existing + sep + block);
  return skills.map((s) => ({ skill: s.name, dest, action: 'appended' as const }));
}
