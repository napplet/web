#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyReferenceImplementation,
  inspectCandidate,
  markdownReport,
  readJson,
  summarizeScore,
} from './benchmark-napplet-production-checks.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const defaultScenario = join(repoRoot, 'benchmarks/scenarios/outbox-latest-note.json');
const defaultTemplate = join(repoRoot, 'packages/boilerplate/test-fixtures/basic-template');
const boilerplateCli = join(repoRoot, 'packages/boilerplate/dist/index.js');
const skillsCli = join(repoRoot, 'packages/skills/dist/cli.js');

function parseArgs(argv) {
  const opts = {
    scenario: defaultScenario,
    template: defaultTemplate,
    candidate: '',
    out: '',
    markdown: '',
    target: '',
    keep: false,
    skipBuild: false,
    skipSkillInstall: false,
    applyReference: true,
    allowFailures: false,
    smoke: false,
    startedAt: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    const value = () => {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      index += 1;
      return next;
    };

    switch (arg) {
      case '--scenario':
        opts.scenario = resolve(repoRoot, value());
        break;
      case '--template':
        opts.template = resolve(repoRoot, value());
        break;
      case '--candidate':
        opts.candidate = resolve(repoRoot, value());
        break;
      case '--out':
        opts.out = resolve(repoRoot, value());
        break;
      case '--markdown':
        opts.markdown = resolve(repoRoot, value());
        break;
      case '--target':
        opts.target = resolve(repoRoot, value());
        break;
      case '--started-at':
        opts.startedAt = value();
        break;
      case '--keep':
        opts.keep = true;
        break;
      case '--skip-build':
        opts.skipBuild = true;
        break;
      case '--skip-skill-install':
        opts.skipSkillInstall = true;
        break;
      case '--apply-reference':
        opts.applyReference = true;
        break;
      case '--no-reference':
        opts.applyReference = false;
        break;
      case '--allow-failures':
        opts.allowFailures = true;
        break;
      case '--smoke':
        opts.smoke = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return opts;
}

function printHelp() {
  process.stdout.write(`napplet production benchmark

Usage:
  pnpm benchmark:creation -- [options]

Options:
  --scenario <path>        Benchmark scenario JSON
  --candidate <path>       Score an existing napplet project produced by an agent
  --template <path>        Local template for generated benchmark workspaces
  --target <path>          Scaffold into a fixed path instead of a temp dir
  --started-at <iso>       Development start time for wall-clock productivity stats
  --out <path>             Write JSON report
  --markdown <path>        Write markdown summary
  --apply-reference        Apply deterministic reference implementation after scaffold (default)
  --no-reference           Score scaffolded output as-is; useful for honest baselines
  --skip-build             Use existing dist/ CLIs
  --skip-skill-install     Do not install skills into the benchmark workspace
  --allow-failures         Exit 0 even when benchmark checks find bugs
  --smoke                  Compact stdout for package smoke tests

Default mode scaffolds a candidate, installs the relevant napplet skills, and
applies the deterministic reference implementation to validate the benchmark.
Use --candidate to benchmark a real napplet produced by an agent or developer.
`);
}

function now() {
  return process.hrtime.bigint();
}

function elapsedMs(start) {
  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

async function run(command, args, options = {}) {
  const started = now();
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise((resolveExit, reject) => {
    child.on('error', reject);
    child.on('close', resolveExit);
  });

  return {
    command: [command, ...args].join(' '),
    exitCode,
    stdout,
    stderr,
    elapsedMs: elapsedMs(started),
  };
}

async function writePrompt(workspace, scenario) {
  const promptPath = join(workspace, 'PROMPT.md');
  await writeFile(promptPath, `${scenario.prompt.trim()}\n`);
  return promptPath;
}

async function installSkills(workspace, phases) {
  if (!existsSync(skillsCli)) {
    const started = now();
    const target = join(workspace, 'agent-skills');
    for (const name of ['make-napplet', 'build-napplet', 'test-napplet']) {
      await mkdir(join(target, name), { recursive: true });
      await cp(
        join(repoRoot, 'packages/skills/skills', name, 'SKILL.md'),
        join(target, name, 'SKILL.md'),
      );
    }
    phases.push({
      name: 'install-skills',
      command: `copy packages/skills/skills/{make-napplet,build-napplet,test-napplet} ${target}`,
      exitCode: 0,
      stdout: '',
      stderr: '',
      elapsedMs: elapsedMs(started),
    });
    return;
  }

  const result = await run('node', [
    skillsCli,
    'install',
    'make-napplet',
    'build-napplet',
    'test-napplet',
    '--dir',
    join(workspace, 'agent-skills'),
  ]);
  phases.push({ name: 'install-skills', ...result });
  if (result.exitCode !== 0) {
    throw new Error(`skill installation failed:\n${result.stderr || result.stdout}`);
  }
}

async function scaffoldCandidate(target, workspace, scenario, opts, phases) {
  const result = await run('node', [
    boilerplateCli,
    target,
    '--template',
    opts.template,
    '--package-name',
    scenario.packageName,
    '--napplet-type',
    scenario.nappletType,
    '--title',
    scenario.title,
    '--yes',
    '--force',
  ]);
  phases.push({ name: 'scaffold', ...result });
  if (result.exitCode !== 0) {
    throw new Error(`scaffold failed:\n${result.stderr || result.stdout}`);
  }
  await writeFile(join(workspace, 'SCAFFOLD_COMMAND.txt'), `${result.command}\n`);
  return result.stdout;
}

async function buildTools(opts, phases) {
  if (opts.skipBuild) return;
  for (const pkg of ['@napplet/boilerplate', '@napplet/skills']) {
    const build = await run('pnpm', ['--filter', pkg, 'build']);
    phases.push({ name: `build-${pkg}`, ...build });
    if (build.exitCode !== 0) throw new Error(`${pkg} build failed:\n${build.stderr || build.stdout}`);
  }
}

async function prepareCandidate(opts, scenario, workspace, candidate, phases) {
  if (opts.candidate) return '';
  await writePrompt(workspace, scenario);
  if (!opts.skipSkillInstall) await installSkills(workspace, phases);
  const scaffoldStdout = await scaffoldCandidate(candidate, workspace, scenario, opts, phases);
  if (opts.applyReference) await applyReferenceImplementation(candidate, scenario);
  return scaffoldStdout;
}

function reportMetrics(checks, opts, totalStart) {
  const toolingSeconds = Number((elapsedMs(totalStart) / 1000).toFixed(3));
  return {
    developmentSeconds: opts.startedAt
      ? Number(((Date.now() - Date.parse(opts.startedAt)) / 1000).toFixed(3))
      : toolingSeconds,
    toolingSeconds,
    workflow: summarizeScore(checks, 'workflow'),
    accuracy: summarizeScore(checks, 'accuracy'),
    completeness: summarizeScore(checks, 'completeness'),
    bugCount: checks.filter((check) => !check.ok).length,
  };
}

function createReport(context, checks, metrics) {
  return {
    schemaVersion: 1,
    startedAt: context.startedAt,
    scenario: context.scenario,
    methodology: {
      speed: 'Development seconds from --started-at when supplied; otherwise elapsed benchmark tooling seconds.',
      workflow: 'Skill packet, scenario prompt, and scaffold command evidence for using the surrounding tooling.',
      accuracy: 'Scenario-specific behavior and protocol-boundary checks on the produced napplet.',
      completeness: 'Expected project files, scripts, and benchmark guidance for a shippable napplet workflow.',
      bugs: 'Count of failed workflow, accuracy, and completeness checks.',
    },
    workspaceDir: context.workspace,
    candidateDir: context.candidate,
    phases: context.phases.map((phase) => ({
      name: phase.name,
      command: phase.command,
      exitCode: phase.exitCode,
      elapsedMs: Number(phase.elapsedMs.toFixed(3)),
    })),
    checks,
    metrics,
  };
}

async function writeOutputs(opts, report) {
  if (opts.out) {
    await mkdir(dirname(opts.out), { recursive: true });
    await writeFile(opts.out, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (opts.markdown) {
    await mkdir(dirname(opts.markdown), { recursive: true });
    await writeFile(opts.markdown, markdownReport(report));
  }
}

function printResult(opts, report) {
  const metrics = report.metrics;
  if (opts.smoke) {
    process.stdout.write(`napplet production benchmark: ${metrics.bugCount} bug(s), ${metrics.toolingSeconds}s\n`);
    return;
  }
  const relativeCandidate = relative(repoRoot, report.candidateDir);
  process.stdout.write(JSON.stringify({
    scenario: report.scenario.id,
    developmentSeconds: metrics.developmentSeconds,
    toolingSeconds: metrics.toolingSeconds,
    workflow: metrics.workflow.score,
    accuracy: metrics.accuracy.score,
    completeness: metrics.completeness.score,
    bugCount: metrics.bugCount,
    candidateDir: relativeCandidate.startsWith('..') ? report.candidateDir : relativeCandidate,
  }, null, 2));
  process.stdout.write('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const scenario = await readJson(opts.scenario);
  const startedAt = opts.startedAt || new Date().toISOString();
  const totalStart = now();
  const tempRoot = opts.candidate ? '' : await mkdtemp(join(tmpdir(), 'napplet-production-benchmark-'));
  const workspace = opts.candidate ? dirname(opts.candidate) : tempRoot;
  const candidate = opts.candidate || opts.target || join(tempRoot, 'candidate');
  const phases = [];

  try {
    await buildTools(opts, phases);
    const scaffoldStdout = await prepareCandidate(opts, scenario, workspace, candidate, phases);
    const checks = await inspectCandidate(candidate, workspace, scenario, scaffoldStdout);
    const metrics = reportMetrics(checks, opts, totalStart);
    const report = createReport({ startedAt, scenario, workspace, candidate, phases }, checks, metrics);
    await writeOutputs(opts, report);
    printResult(opts, report);
    if (metrics.bugCount > 0 && !opts.allowFailures) process.exitCode = 1;
  } finally {
    if (!opts.keep && tempRoot) await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`benchmark-napplet-production: ${message}\n`);
  process.exitCode = 2;
});
