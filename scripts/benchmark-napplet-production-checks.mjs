import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const CHECKS = {
  workflow: ['static-prompt', 'agent-condition', 'candidate-directory'],
  accuracy: [
    'package-name',
    'napplet-type',
    'html-title',
    'html-heading',
    'readme-title',
    'outbox-boundary',
    'signed-out-fallback',
    'latest-note-rendering',
    'forbidden-surfaces',
  ],
  completeness: [
    'package-json',
    'vite-config',
    'source-entry',
    'readme',
    'build-script',
    'verify-script',
    'conformance-script',
    'verification-guidance',
  ],
};

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function pass(name, category, detail = '') {
  return { name, category, ok: true, detail };
}

function fail(name, category, detail) {
  return { name, category, ok: false, detail };
}

async function readTextIfExists(file) {
  return existsSync(file) ? readFile(file, 'utf8') : '';
}

function checkFileExists(file, name, category, label) {
  return existsSync(file)
    ? pass(name, category, `${label} exists`)
    : fail(name, category, `${label} missing`);
}

function candidatePaths(target) {
  return {
    packagePath: join(target, 'package.json'),
    vitePath: join(target, 'vite.config.ts'),
    htmlPath: join(target, 'index.html'),
    readmePath: join(target, 'README.md'),
    sourcePath: join(target, 'src/main.ts'),
  };
}

function workflowChecks(target, scenario, options) {
  return [
    options.staticPrompt.includes(scenario.prompt.trim())
      ? pass('static-prompt', 'workflow', 'frozen one-shot prompt embeds the scenario')
      : fail('static-prompt', 'workflow', 'static prompt does not include the scenario text'),
    options.condition
      ? pass('agent-condition', 'workflow', `condition=${options.condition}`)
      : fail('agent-condition', 'workflow', 'agent/tooling condition label missing'),
    existsSync(target)
      ? pass('candidate-directory', 'workflow', 'candidate directory supplied for scoring')
      : fail('candidate-directory', 'workflow', 'candidate directory missing'),
  ];
}

function completenessChecks(paths, scripts, readme) {
  return [
    checkFileExists(paths.packagePath, 'package-json', 'completeness', 'package.json'),
    checkFileExists(paths.vitePath, 'vite-config', 'completeness', 'vite.config.ts'),
    checkFileExists(paths.sourcePath, 'source-entry', 'completeness', 'src/main.ts'),
    checkFileExists(paths.readmePath, 'readme', 'completeness', 'README.md'),
    scripts.build
      ? pass('build-script', 'completeness', `build=${scripts.build}`)
      : fail('build-script', 'completeness', 'package.json lacks a build script'),
    scripts.verify
      ? pass('verify-script', 'completeness', `verify=${scripts.verify}`)
      : fail('verify-script', 'completeness', 'package.json lacks a verify script'),
    scripts['test:conformance']
      ? pass('conformance-script', 'completeness', `test:conformance=${scripts['test:conformance']}`)
      : fail('conformance-script', 'completeness', 'package.json lacks a test:conformance script'),
    readme.includes('pnpm verify') || readme.includes('test:conformance')
      ? pass('verification-guidance', 'completeness', 'README explains candidate verification')
      : fail('verification-guidance', 'completeness', 'README does not explain how to verify the candidate'),
  ];
}

function accuracyChecks(packageJson, files, scenario) {
  const allText = [files.vite, files.html, files.readme, files.source, JSON.stringify(packageJson)].join('\n');
  const forbiddenHit = scenario.forbiddenPatterns.find((pattern) => allText.includes(pattern));
  return [
    packageJson.name === scenario.packageName
      ? pass('package-name', 'accuracy', `name=${scenario.packageName}`)
      : fail('package-name', 'accuracy', `expected ${scenario.packageName}, found ${packageJson.name ?? '(missing)'}`),
    files.vite.includes(`nappletType: '${scenario.nappletType}'`)
      ? pass('napplet-type', 'accuracy', `nappletType=${scenario.nappletType}`)
      : fail('napplet-type', 'accuracy', `vite.config.ts does not contain nappletType '${scenario.nappletType}'`),
    files.html.includes(`<title>${scenario.title}</title>`)
      ? pass('html-title', 'accuracy', `title=${scenario.title}`)
      : fail('html-title', 'accuracy', 'index.html title was not replaced'),
    files.html.includes(`<h1 id="app-title">${scenario.title}</h1>`)
      ? pass('html-heading', 'accuracy', `heading=${scenario.title}`)
      : fail('html-heading', 'accuracy', 'index.html heading was not replaced'),
    files.readme.includes(`# ${scenario.title}`)
      ? pass('readme-title', 'accuracy', `README title=${scenario.title}`)
      : fail('readme-title', 'accuracy', 'README heading was not replaced'),
    files.source.includes('outbox.query') && !files.source.includes('relay.')
      ? pass('outbox-boundary', 'accuracy', 'scenario reads through outbox, not raw relay')
      : fail('outbox-boundary', 'accuracy', 'scenario does not clearly use the OUTBOX boundary'),
    files.source.includes('window.napplet?.outbox') && files.source.includes(scenario.fallbackText)
      ? pass('signed-out-fallback', 'accuracy', 'missing outbox path has a user-visible fallback')
      : fail('signed-out-fallback', 'accuracy', 'missing-domain or signed-out fallback is incomplete'),
    files.source.includes('.content') && files.source.includes('textContent')
      ? pass('latest-note-rendering', 'accuracy', 'latest note content is rendered into the UI')
      : fail('latest-note-rendering', 'accuracy', 'source does not render latest note content'),
    !forbiddenHit
      ? pass('forbidden-surfaces', 'accuracy', 'no forbidden app-owned surfaces found')
      : fail('forbidden-surfaces', 'accuracy', `found forbidden surface: ${forbiddenHit}`),
  ];
}

export async function inspectCandidate(target, scenario, options) {
  const paths = candidatePaths(target);
  const packageJson = existsSync(paths.packagePath) ? await readJson(paths.packagePath) : {};
  const files = {
    vite: await readTextIfExists(paths.vitePath),
    html: await readTextIfExists(paths.htmlPath),
    readme: await readTextIfExists(paths.readmePath),
    source: await readTextIfExists(paths.sourcePath),
  };
  return [
    ...workflowChecks(target, scenario, options),
    ...completenessChecks(paths, packageJson.scripts ?? {}, files.readme),
    ...accuracyChecks(packageJson, files, scenario),
  ];
}

export function summarizeScore(checks, category) {
  const total = checks.filter((check) => check.category === category).length;
  const passed = checks.filter((check) => check.category === category && check.ok).length;
  return {
    passed,
    total,
    score: total === 0 ? 1 : Number((passed / total).toFixed(3)),
  };
}

export function markdownReport(report) {
  const failed = report.checks.filter((check) => !check.ok);
  const lines = [
    '# Napplet Production Benchmark',
    '',
    `Scenario: ${report.scenario.id}`,
    `Run: ${report.startedAt}`,
    `Agent: ${report.agent.name}`,
    `Condition: ${report.agent.condition}`,
    `Prompt SHA-256: \`${report.agent.promptSha256}\``,
    `Candidate: \`${report.candidateDir}\``,
    '',
    '## Results',
    '',
    `- Development seconds: ${report.metrics.developmentSeconds}`,
    `- Scoring seconds: ${report.metrics.scoringSeconds}`,
    `- Workflow: ${report.metrics.workflow.passed}/${report.metrics.workflow.total} (${report.metrics.workflow.score})`,
    `- Accuracy: ${report.metrics.accuracy.passed}/${report.metrics.accuracy.total} (${report.metrics.accuracy.score})`,
    `- Completeness: ${report.metrics.completeness.passed}/${report.metrics.completeness.total} (${report.metrics.completeness.score})`,
    `- Bugs found: ${report.metrics.bugCount}`,
    '',
    '## Checks',
    '',
    '| Check | Category | Result | Detail |',
    '| --- | --- | --- | --- |',
    ...report.checks.map((check) => `| ${check.name} | ${check.category} | ${check.ok ? 'pass' : 'fail'} | ${check.detail.replace(/\|/g, '\\|')} |`),
  ];

  if (failed.length > 0) {
    lines.push('', '## Improvement Candidates', '');
    for (const check of failed) lines.push(`- ${check.name}: ${check.detail}`);
  }

  return `${lines.join('\n')}\n`;
}
