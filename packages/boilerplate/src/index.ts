#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const DEFAULT_TEMPLATE_URL = 'https://github.com/napplet/boilerplate.git';
const DEFAULT_VARIANT = 'basic';
const SUPPORTED_VARIANTS = new Set([DEFAULT_VARIANT]);
const SKIPPED_TEMPLATE_ENTRIES = new Set([
  '.git',
  'node_modules',
  'dist',
  '.turbo',
  'coverage',
]);

interface CliOptions {
  target?: string;
  variant: string;
  template?: string;
  packageName?: string;
  nappletType?: string;
  title?: string;
  yes: boolean;
  force: boolean;
  help: boolean;
}

interface GeneratorConfig {
  targetDir: string;
  variant: string;
  template: string;
  packageName: string;
  nappletType: string;
  title: string;
  force: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    variant: DEFAULT_VARIANT,
    yes: false,
    force: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
      continue;
    }

    const readValue = (name: string): string => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${name}`);
      }
      index += 1;
      return value;
    };

    if (arg === '--target') {
      options.target = readValue(arg);
      continue;
    }
    if (arg === '--variant') {
      options.variant = readValue(arg);
      continue;
    }
    if (arg === '--template') {
      options.template = readValue(arg);
      continue;
    }
    if (arg === '--package-name') {
      options.packageName = readValue(arg);
      continue;
    }
    if (arg === '--napplet-type') {
      options.nappletType = readValue(arg);
      continue;
    }
    if (arg === '--title') {
      options.title = readValue(arg);
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (options.target) {
      throw new Error(`Unexpected extra positional argument: ${arg}`);
    }
    options.target = arg;
  }

  return options;
}

function printHelp(): void {
  output.write(`@napplet/boilerplate

Usage:
  npx @napplet/boilerplate [target] [options]

Options:
  --target <path>           Destination directory
  --variant <name>          Template variant (default: basic)
  --template <path-or-url>  Template source override
  --package-name <name>     package.json name
  --napplet-type <type>     NIP-5D napplet type/d tag
  --title <title>           Human-readable app title
  --yes, -y                 Accept defaults and skip prompts
  --force                   Allow non-empty destination
  --help, -h                Show this help

Examples:
  npx @napplet/boilerplate
  npx @napplet/boilerplate ./hello-napplet --napplet-type hello-napplet
  npx @napplet/boilerplate --template ~/Develop/napplet-boilerplate --yes ./hello
`);
}

async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  if (!SUPPORTED_VARIANTS.has(options.variant)) {
    throw new Error(
      `Unsupported variant "${options.variant}". Available variants: ${[...SUPPORTED_VARIANTS].join(', ')}`,
    );
  }

  const config = await resolveConfig(options);
  await generate(config);
  printSuccess(config);
}

async function resolveConfig(options: CliOptions): Promise<GeneratorConfig> {
  const canPrompt = Boolean(input.isTTY && output.isTTY && !options.yes);
  const rl = canPrompt ? createInterface({ input, output }) : null;

  const ask = async (question: string, defaultValue: string): Promise<string> => {
    if (!rl) return defaultValue;
    const answer = await rl.question(`${question} (${defaultValue}): `);
    return answer.trim() || defaultValue;
  };

  try {
    const targetAnswer = await ask(
      'Where should the napplet be created?',
      options.target ?? './my-napplet',
    );
    const targetDir = path.resolve(process.cwd(), expandHome(targetAnswer));
    const defaultPackageName = toPackageName(path.basename(targetDir));
    const packageName = options.packageName ?? await ask('Package name', defaultPackageName);
    const nappletType = options.nappletType ?? await ask(
      'Napplet type',
      toNappletType(packageName),
    );
    const title = options.title ?? await ask('App title', toTitle(nappletType));
    const template = normalizeTemplateSource(
      options.template
        ?? process.env.NAPPLET_BOILERPLATE_TEMPLATE
        ?? DEFAULT_TEMPLATE_URL,
    );

    validatePackageName(packageName);
    validateNappletType(nappletType);

    return {
      targetDir,
      variant: options.variant,
      template,
      packageName,
      nappletType,
      title,
      force: options.force,
    };
  } finally {
    rl?.close();
  }
}

async function generate(config: GeneratorConfig): Promise<void> {
  await prepareTarget(config.targetDir, config.force);

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'napplet-boilerplate-'));
  try {
    const templateDir = await materializeTemplate(config.template, tmpRoot);
    await copyTemplate(templateDir, config.targetDir);
    await applyTemplateData(config);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
}

async function prepareTarget(targetDir: string, force: boolean): Promise<void> {
  const exists = await pathExists(targetDir);
  if (!exists) {
    await fs.mkdir(targetDir, { recursive: true });
    return;
  }

  const entries = await fs.readdir(targetDir);
  if (entries.length > 0 && !force) {
    throw new Error(
      `Destination is not empty: ${targetDir}. Re-run with --force to use it anyway.`,
    );
  }
}

async function materializeTemplate(template: string, tmpRoot: string): Promise<string> {
  if (isLocalTemplate(template)) {
    const localPath = path.resolve(process.cwd(), expandHome(fromFileUrl(template)));
    const stat = await fs.stat(localPath).catch(() => null);
    if (!stat?.isDirectory()) {
      throw new Error(`Local template directory does not exist: ${localPath}`);
    }
    return localPath;
  }

  const cloneDir = path.join(tmpRoot, 'template');
  await run('git', ['clone', '--depth', '1', template, cloneDir]);
  return cloneDir;
}

async function copyTemplate(sourceDir: string, targetDir: string): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (SKIPPED_TEMPLATE_ENTRIES.has(entry.name)) continue;

    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyTemplate(source, target);
      continue;
    }
    if (entry.isFile()) {
      await fs.copyFile(source, target);
      const mode = (await fs.stat(source)).mode;
      await fs.chmod(target, mode);
    }
  }
}

async function applyTemplateData(config: GeneratorConfig): Promise<void> {
  const packagePath = path.join(config.targetDir, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8')) as {
    name?: string;
  };
  packageJson.name = config.packageName;
  await fs.writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  await replaceInFile(path.join(config.targetDir, 'vite.config.ts'), [
    ["nappletType: 'my-napplet'", `nappletType: '${config.nappletType}'`],
  ]);
  await replaceInFile(path.join(config.targetDir, 'index.html'), [
    ['<title>My Napplet</title>', `<title>${escapeHtml(config.title)}</title>`],
    ['<h1 id="app-title">My Napplet</h1>', `<h1 id="app-title">${escapeHtml(config.title)}</h1>`],
  ]);
  await replaceInFile(path.join(config.targetDir, 'README.md'), [
    ['# my-napplet', `# ${config.title}`],
  ]);
}

async function replaceInFile(filePath: string, replacements: Array<[string, string]>): Promise<void> {
  let contents = await fs.readFile(filePath, 'utf8');
  for (const [from, to] of replacements) {
    contents = contents.split(from).join(to);
  }
  await fs.writeFile(filePath, contents);
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed: ${stderr.trim()}`));
    });
  });
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeTemplateSource(source: string): string {
  if (source.startsWith('github:')) {
    return `https://github.com/${source.slice('github:'.length)}.git`;
  }
  if (source === 'github.com/napplet/boilerplate') {
    return DEFAULT_TEMPLATE_URL;
  }
  if (source.startsWith('https://github.com/') && !source.endsWith('.git')) {
    return `${source}.git`;
  }
  return source;
}

function isLocalTemplate(source: string): boolean {
  return source.startsWith('/')
    || source.startsWith('./')
    || source.startsWith('../')
    || source.startsWith('~/')
    || source.startsWith('file:');
}

function fromFileUrl(source: string): string {
  if (!source.startsWith('file:')) return source;
  return new URL(source).pathname;
}

function expandHome(value: string): string {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

function toPackageName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'my-napplet';
}

function toNappletType(packageName: string): string {
  return packageName
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'my-napplet';
}

function toTitle(nappletType: string): string {
  return nappletType
    .split(/[-_:./]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
    || 'My Napplet';
}

function validatePackageName(packageName: string): void {
  const valid = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(packageName);
  if (!valid) {
    throw new Error(`Invalid package name: ${packageName}`);
  }
}

function validateNappletType(nappletType: string): void {
  const valid = /^[a-z0-9][a-z0-9._:-]*$/.test(nappletType);
  if (!valid) {
    throw new Error(`Invalid napplet type: ${nappletType}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printSuccess(config: GeneratorConfig): void {
  const relativeTarget = path.relative(process.cwd(), config.targetDir) || '.';
  output.write(`
Created ${config.title}

Location: ${relativeTarget}
Variant:  ${config.variant}
Template: ${config.template}

Next:
  cd ${shellEscape(relativeTarget)}
  pnpm install
  pnpm dev

Verify:
  pnpm verify

Benchmark napplet production from the napplet repo:
  pnpm benchmark:creation -- --candidate /tmp/napplet-benchmark-codex --out /tmp/napplet-benchmark-codex.json --markdown /tmp/napplet-benchmark-codex.md --allow-failures
`);
}

function shellEscape(value: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`@napplet/boilerplate: ${message}`);
  process.exitCode = 1;
});
