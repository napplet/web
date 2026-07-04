#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inspectCandidate,
  markdownReport,
  readJson,
  summarizeScore,
} from './benchmark-napplet-production-checks.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const defaultScenario = join(repoRoot, 'benchmarks/scenarios/outbox-latest-note.json');
const defaultPrompt = join(repoRoot, 'benchmarks/prompts/outbox-latest-note.md');
const defaultCandidate = join(repoRoot, 'packages/boilerplate/test-fixtures/basic-template');

function parseArgs(argv) {
  const opts = {
    scenario: defaultScenario,
    prompt: defaultPrompt,
    promptExplicit: false,
    candidate: defaultCandidate,
    out: '',
    markdown: '',
    writePrompt: '',
    condition: 'default-candidate',
    agent: 'fixture',
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
      case '--prompt':
        opts.prompt = resolve(repoRoot, value());
        opts.promptExplicit = true;
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
      case '--write-prompt':
        opts.writePrompt = resolve(repoRoot, value());
        break;
      case '--condition':
        opts.condition = value();
        break;
      case '--agent':
        opts.agent = value();
        break;
      case '--started-at':
        opts.startedAt = value();
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
  --prompt <path>          Frozen prompt markdown to score against
  --write-prompt <path>    Write the frozen one-shot prompt for an agent run
  --candidate <path>       Napplet project produced by a one-shot run
  --condition <label>      Agent context/cohort label, e.g. skills, no-skills
  --agent <label>          Agent label for report metadata
  --started-at <iso>       Development start time for wall-clock productivity stats
  --out <path>             Write JSON report
  --markdown <path>        Write markdown summary
  --allow-failures         Exit 0 even when benchmark checks find bugs
  --smoke                  Compact stdout for package smoke tests

By default this scores the repository's frozen prompt against the repository's
candidate fixture. Use --prompt and --candidate to score another one-shot output
without changing the benchmark contract.
`);
}

function now() {
  return process.hrtime.bigint();
}

function elapsedMs(start) {
  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

function generatedPromptFor(scenario) {
  return `# One-Shot Napplet Implementation Benchmark

You are an autonomous coding agent. Make one implementation attempt for the
scenario below, then stop for scoring. Use the napplet repo's current skills,
docs, boilerplate, and package APIs when they are available in your environment.
Do not edit benchmark checks or weaken the task.

## Scenario

${scenario.prompt.trim()}

## Required Evidence In The Candidate

- A complete napplet project with package scripts for build, conformance, and
  verification.
- Source code that implements the scenario through shell-owned napplet domains.
- A README that names the produced napplet and how to verify it.

The candidate directory produced by this single run will be scored by:
\`pnpm benchmark:creation -- --candidate <candidate-dir>\`
`;
}

async function readPrompt(opts, scenario) {
  if (!opts.promptExplicit && opts.scenario !== defaultScenario) {
    return generatedPromptFor(scenario);
  }
  try {
    return await readFile(opts.prompt, 'utf8');
  } catch (error) {
    if (opts.prompt !== defaultPrompt) throw error;
    return generatedPromptFor(scenario);
  }
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function reportMetrics(checks, opts, totalStart) {
  const scoringSeconds = Number((elapsedMs(totalStart) / 1000).toFixed(3));
  return {
    developmentSeconds: opts.startedAt
      ? Number(((Date.now() - Date.parse(opts.startedAt)) / 1000).toFixed(3))
      : scoringSeconds,
    scoringSeconds,
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
    agent: {
      name: context.agent,
      condition: context.condition,
      oneShot: true,
      promptSha256: context.promptSha256,
    },
    methodology: {
      speed: 'Development seconds from --started-at when supplied; otherwise elapsed scoring seconds.',
      workflow: 'Frozen prompt, declared agent/tooling condition, and supplied candidate evidence.',
      accuracy: 'Scenario-specific behavior and protocol-boundary checks on the produced napplet.',
      completeness: 'Expected project files, scripts, and verification guidance for a shippable napplet workflow.',
      bugs: 'Count of failed workflow, accuracy, and completeness checks.',
    },
    candidateDir: context.candidate,
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
    process.stdout.write(`napplet production benchmark: ${metrics.bugCount} bug(s), ${metrics.scoringSeconds}s\n`);
    return;
  }
  const relativeCandidate = relative(repoRoot, report.candidateDir);
  process.stdout.write(JSON.stringify({
    scenario: report.scenario.id,
    agent: report.agent.name,
    condition: report.agent.condition,
    developmentSeconds: metrics.developmentSeconds,
    scoringSeconds: metrics.scoringSeconds,
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
  const staticPrompt = await readPrompt(opts, scenario);
  const promptSha256 = hashText(staticPrompt);
  if (opts.writePrompt) {
    await mkdir(dirname(opts.writePrompt), { recursive: true });
    await writeFile(opts.writePrompt, staticPrompt);
  }

  const startedAt = opts.startedAt || new Date().toISOString();
  const totalStart = now();
  const checks = await inspectCandidate(opts.candidate, scenario, {
    condition: opts.condition,
    staticPrompt,
  });
  const metrics = reportMetrics(checks, opts, totalStart);
  const report = createReport({
    startedAt,
    scenario,
    candidate: opts.candidate,
    agent: opts.agent,
    condition: opts.condition,
    promptSha256,
  }, checks, metrics);
  await writeOutputs(opts, report);
  printResult(opts, report);
  if (metrics.bugCount > 0 && !opts.allowFailures) process.exitCode = 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`benchmark-napplet-production: ${message}\n`);
  process.exitCode = 2;
});
