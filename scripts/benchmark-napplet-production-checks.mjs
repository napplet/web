import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const CHECKS = {
  workflow: ['skill-packet', 'scenario-prompt', 'scaffold-command'],
  accuracy: [
    'package-name',
    'napplet-type',
    'html-title',
    'html-heading',
    'readme-title',
    'outbox-boundary',
    'signed-out-fallback',
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
    'benchmark-guidance',
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

export async function applyReferenceImplementation(target, scenario) {
  const source = `import { outbox } from '@napplet/sdk';

const app = document.querySelector<HTMLHeadingElement>('#app-title');

async function render(): Promise<void> {
  if (!app) return;
  app.dataset.scenario = '${scenario.id}';

  if (!window.napplet?.outbox) {
    app.textContent = '${scenario.fallbackText}';
    app.dataset.state = 'signed-out';
    return;
  }

  const result = await outbox.query([{ kinds: [1], limit: 1 }], { timeoutMs: 1000 });
  const latest = result.events.at(0)?.event.content ?? 'No notes yet';
  app.textContent = latest;
  app.dataset.state = 'ready';
}

void render();
`;
  await mkdir(join(target, 'src'), { recursive: true });
  await writeFile(join(target, 'src/main.ts'), source);
  await writeFile(
    join(target, 'README.md'),
    `# ${scenario.title}\n\nBenchmark scenario: ${scenario.id}\n\nRun \`pnpm verify\` before publishing.\n`,
  );
}

function workflowChecks(workspace, scaffoldStdout) {
  return [
    existsSync(join(workspace, 'agent-skills/make-napplet/SKILL.md'))
      ? pass('skill-packet', 'workflow', 'make/build/test skills installed for the scenario')
      : fail('skill-packet', 'workflow', 'benchmark workspace lacks installed napplet skills'),
    existsSync(join(workspace, 'PROMPT.md'))
      ? pass('scenario-prompt', 'workflow', 'scenario prompt captured')
      : fail('scenario-prompt', 'workflow', 'scenario prompt missing'),
    existsSync(join(workspace, 'SCAFFOLD_COMMAND.txt')) || scaffoldStdout
      ? pass('scaffold-command', 'workflow', 'scaffold command captured')
      : fail('scaffold-command', 'workflow', 'scaffold command not recorded'),
  ];
}

function completenessChecks(paths, scripts, scaffoldStdout, readme) {
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
    /benchmark:creation|benchmark:production/.test(scaffoldStdout) || readme.includes('benchmark')
      ? pass('benchmark-guidance', 'completeness', 'candidate points to benchmark evidence')
      : fail('benchmark-guidance', 'completeness', 'candidate does not mention benchmark evidence'),
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
    !forbiddenHit
      ? pass('forbidden-surfaces', 'accuracy', 'no forbidden app-owned surfaces found')
      : fail('forbidden-surfaces', 'accuracy', `found forbidden surface: ${forbiddenHit}`),
  ];
}

export async function inspectCandidate(target, workspace, scenario, scaffoldStdout) {
  const paths = candidatePaths(target);
  const packageJson = existsSync(paths.packagePath) ? await readJson(paths.packagePath) : {};
  const files = {
    vite: await readTextIfExists(paths.vitePath),
    html: await readTextIfExists(paths.htmlPath),
    readme: await readTextIfExists(paths.readmePath),
    source: await readTextIfExists(paths.sourcePath),
  };
  return [
    ...workflowChecks(workspace, scaffoldStdout),
    ...completenessChecks(paths, packageJson.scripts ?? {}, scaffoldStdout, files.readme),
    ...accuracyChecks(packageJson, files, scenario),
  ];
}

export function summarizeScore(checks, category) {
  const total = CHECKS[category].length;
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
    `Candidate: \`${report.candidateDir}\``,
    '',
    '## Results',
    '',
    `- Development seconds: ${report.metrics.developmentSeconds}`,
    `- Tooling seconds: ${report.metrics.toolingSeconds}`,
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
