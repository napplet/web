#!/usr/bin/env node
/**
 * `napplet-skills` — install the napplet agent skills into whatever location
 * your coding agent reads (Claude Code, Cursor, Windsurf, Codex/Amp via
 * AGENTS.md, Gemini, Copilot, …), or print them to stdout.
 *
 * @packageDocumentation
 */

import { listSkills, readSkill, install, TARGETS, type InstallOptions } from './index.js';

const HELP = `napplet-skills — install napplet build skills into your agent

Usage:
  napplet-skills list                       List shipped skills
  napplet-skills print [skill]              Print SKILL.md to stdout (all, or one)
  napplet-skills install [skill] [options]  Install skills into an agent location

Install options:
  --to <target>     Target agent/convention (default: claude)
  --dir <path>      Custom dir; writes <path>/<skill>/SKILL.md
  --out <file>      Custom doc; appends skills into <file>
  --symlink         Symlink instead of copy (skillDir targets only)
  -h, --help        Show this help

Targets (--to):
${Object.values(TARGETS).map((t) => `  ${t.id.padEnd(13)} ${t.label}`).join('\n')}

Examples:
  napplet-skills install --to claude        # .claude/skills/<skill>/SKILL.md
  napplet-skills install --to cursor        # .cursor/rules/<skill>.mdc
  napplet-skills install --to agents        # append to ./AGENTS.md
  napplet-skills install build-napplet --to gemini
  napplet-skills print build-napplet > skill.md
`;

function parse(argv: string[]): { cmd?: string; positional: string[]; opts: InstallOptions & { help?: boolean } } {
  const positional: string[] = [];
  const opts: InstallOptions & { help?: boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--symlink') opts.symlink = true;
    else if (a === '--to') opts.to = argv[++i];
    else if (a === '--dir') opts.dir = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option: ${a}`);
    else positional.push(a);
  }
  return { cmd: positional.shift(), positional, opts };
}

function main(argv: string[]): number {
  let parsed;
  try {
    parsed = parse(argv);
  } catch (err) {
    console.error(String((err as Error).message));
    return 2;
  }
  const { cmd, positional, opts } = parsed;

  if (opts.help || !cmd || cmd === 'help') {
    console.log(HELP);
    return 0;
  }

  try {
    if (cmd === 'list') {
      for (const s of listSkills()) console.log(`${s.name.padEnd(16)} ${s.description}`);
      return 0;
    }
    if (cmd === 'print') {
      const names = positional.length ? positional : listSkills().map((s) => s.name);
      console.log(names.map((n) => readSkill(n)).join('\n\n---\n\n'));
      return 0;
    }
    if (cmd === 'install') {
      const skills = positional.length ? positional : undefined;
      const target = opts.dir ? `dir ${opts.dir}` : opts.out ? `file ${opts.out}` : (opts.to ?? 'claude');
      const results = install({ ...opts, skills, to: opts.dir || opts.out ? undefined : (opts.to ?? 'claude') });
      for (const r of results) console.log(`${r.action.padEnd(10)} ${r.skill.padEnd(16)} → ${r.dest}`);
      console.log(`\n${results.length} file(s) for ${results.map((r) => r.skill).filter((v, i, a) => a.indexOf(v) === i).length} skill(s) → ${target}`);
      return 0;
    }
    console.error(`unknown command: ${cmd}\n`);
    console.log(HELP);
    return 2;
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    return 1;
  }
}

process.exit(main(process.argv.slice(2)));
