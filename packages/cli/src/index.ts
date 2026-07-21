import { constants as fsConstants } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const DEFAULT_VERSION = '^0.3.1';
const DEFAULT_PLUGIN_VERSION = '^0.4.0';
const DEFAULT_CLI_VERSION = '^0.1.0';

type NappletClass = 1 | 2;

interface NappletConfig {
  name: string;
  title: string;
  type: string;
  class: NappletClass;
  connect: string[];
  skills: string[];
  build: {
    command: string;
    outputDir: string;
  };
  deploy: {
    provider: string | null;
    command: string | null;
    relays: string[];
  };
}

interface InitOptions {
  directory: string;
  name?: string;
  title?: string;
  type?: string;
  classValue?: NappletClass;
  connect: string[];
  force: boolean;
}

interface ConfigureOptions {
  name?: string;
  title?: string;
  type?: string;
  classValue?: NappletClass;
  connect: string[];
  buildCommand?: string;
  outputDir?: string;
  provider?: string;
  deployCommand?: string;
  relays: string[];
  force: boolean;
}

interface RunContext {
  cwd: string;
  argv: string[];
  stdout: Pick<NodeJS.WriteStream, 'write'>;
  stderr: Pick<NodeJS.WriteStream, 'write'>;
}

type DiagnosticStatus = 'ok' | 'warn' | 'fail';

interface Diagnostic {
  status: DiagnosticStatus;
  message: string;
}

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
  }
}

const HELP = `napplet

Usage:
  napplet init [directory] [--name <name>] [--title <title>] [--type <type>] [--class <1|2>] [--connect <origin>] [--force]
  napplet configure [--name <name>] [--title <title>] [--type <type>] [--class <1|2>] [--connect <origin>] [--build-command <command>] [--output-dir <dir>] [--provider <name>] [--deploy-command <command>] [--relay <url>] [--force]
  napplet build
  napplet deploy [--provider-command <command>]
  napplet doctor
  napplet skills install [--target <directory>] [--force]
  napplet help

Flow:
  1. napplet init my-napplet
  2. cd my-napplet && pnpm install
  3. napplet doctor
  4. napplet skills install
  5. Use the installed build-napplet skill with your agent
  6. napplet build
  7. Configure .napplet/napplet.json deploy.command, then napplet deploy
`;

export async function main(context: Partial<RunContext> = {}): Promise<number> {
  const ctx: RunContext = {
    cwd: context.cwd ?? process.cwd(),
    argv: context.argv ?? process.argv.slice(2),
    stdout: context.stdout ?? process.stdout,
    stderr: context.stderr ?? process.stderr,
  };

  try {
    await run(ctx);
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      ctx.stderr.write(`${error.message}\n`);
      return error.exitCode;
    }

    const message = error instanceof Error ? error.message : String(error);
    ctx.stderr.write(`Unexpected error: ${message}\n`);
    return 1;
  }
}

async function run(ctx: RunContext): Promise<void> {
  const [command, ...rest] = ctx.argv;

  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      ctx.stdout.write(HELP);
      return;
    case 'init':
      await initCommand(ctx, rest);
      return;
    case 'configure':
      await configureCommand(ctx, rest);
      return;
    case 'doctor':
      await doctorCommand(ctx);
      return;
    case 'build':
      await buildCommand(ctx);
      return;
    case 'deploy':
      await deployCommand(ctx, rest);
      return;
    case 'skills':
      await skillsCommand(ctx, rest);
      return;
    default:
      throw new CliError(`Unknown command: ${command}\n\n${HELP}`, 64);
  }
}

async function initCommand(ctx: RunContext, args: string[]): Promise<void> {
  const options = parseInitArgs(ctx.cwd, args);
  const projectRoot = path.resolve(ctx.cwd, options.directory);
  const packageName = options.name ?? sanitizePackageName(path.basename(projectRoot));

  const config = makeConfig({
    name: packageName,
    title: options.title,
    type: options.type,
    classValue: options.classValue,
    connect: options.connect,
  });

  await mkdir(projectRoot, { recursive: true });
  await assertWritableProject(projectRoot, options.force);

  const files = projectFiles(config);
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(projectRoot, relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf8');
  }

  ctx.stdout.write(`Created ${config.title} in ${path.relative(ctx.cwd, projectRoot) || '.'}\n`);
  ctx.stdout.write(`Next: cd ${path.relative(ctx.cwd, projectRoot) || '.'} && pnpm install && napplet doctor && napplet skills install\n`);
}

async function configureCommand(ctx: RunContext, args: string[]): Promise<void> {
  const options = await parseConfigureArgs(ctx.cwd, args);
  const configPath = path.join(ctx.cwd, '.napplet/napplet.json');

  if (!options.force) {
    try {
      await access(configPath, fsConstants.F_OK);
      throw new CliError('Refusing to overwrite .napplet/napplet.json. Use --force to replace it.', 73);
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }
    }
  }

  const config = makeConfig({
    name: options.name ?? await inferPackageName(ctx.cwd),
    title: options.title,
    type: options.type,
    classValue: options.classValue,
    connect: options.connect,
    buildCommand: options.buildCommand,
    outputDir: options.outputDir,
    provider: options.provider,
    deployCommand: options.deployCommand,
    relays: options.relays,
  });

  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  ctx.stdout.write('Created .napplet/napplet.json\n');
  ctx.stdout.write('Next: make vite.config.ts read this file, then run napplet doctor\n');
}

function parseInitArgs(cwd: string, args: string[]): InitOptions {
  const options: InitOptions = {
    directory: '.',
    connect: [],
    force: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--name':
        options.name = requiredValue(args, ++i, '--name');
        break;
      case '--title':
        options.title = requiredValue(args, ++i, '--title');
        break;
      case '--type':
        options.type = sanitizeNappletType(requiredValue(args, ++i, '--type'));
        break;
      case '--class': {
        const value = Number(requiredValue(args, ++i, '--class'));
        if (value !== 1 && value !== 2) {
          throw new CliError('--class must be 1 or 2', 64);
        }
        options.classValue = value;
        break;
      }
      case '--connect':
        options.connect.push(requiredValue(args, ++i, '--connect'));
        break;
      case '--force':
        options.force = true;
        break;
      default:
        if (arg.startsWith('-')) {
          throw new CliError(`Unknown init option: ${arg}`, 64);
        }
        options.directory = path.relative(cwd, path.resolve(cwd, arg));
        break;
    }
  }

  return options;
}

async function parseConfigureArgs(cwd: string, args: string[]): Promise<ConfigureOptions> {
  const options: ConfigureOptions = {
    connect: [],
    relays: [],
    force: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--name':
        options.name = requiredValue(args, ++i, '--name');
        break;
      case '--title':
        options.title = requiredValue(args, ++i, '--title');
        break;
      case '--type':
        options.type = sanitizeNappletType(requiredValue(args, ++i, '--type'));
        break;
      case '--class': {
        const value = Number(requiredValue(args, ++i, '--class'));
        if (value !== 1 && value !== 2) {
          throw new CliError('--class must be 1 or 2', 64);
        }
        options.classValue = value;
        break;
      }
      case '--connect':
        options.connect.push(requiredValue(args, ++i, '--connect'));
        break;
      case '--build-command':
        options.buildCommand = requiredValue(args, ++i, '--build-command');
        break;
      case '--output-dir':
        options.outputDir = requiredValue(args, ++i, '--output-dir');
        break;
      case '--provider':
        options.provider = requiredValue(args, ++i, '--provider');
        break;
      case '--deploy-command':
        options.deployCommand = requiredValue(args, ++i, '--deploy-command');
        break;
      case '--relay':
        options.relays.push(requiredValue(args, ++i, '--relay'));
        break;
      case '--force':
        options.force = true;
        break;
      default:
        throw new CliError(`Unknown configure option: ${arg}`, 64);
    }
  }

  if (!options.name) {
    options.name = await inferPackageName(cwd);
  }

  return options;
}

function requiredValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value || value.startsWith('--')) {
    throw new CliError(`${flag} requires a value`, 64);
  }
  return value;
}

async function assertWritableProject(projectRoot: string, force: boolean): Promise<void> {
  const protectedFiles = [
    'package.json',
    'index.html',
    'src/main.ts',
    'vite.config.ts',
    '.napplet/napplet.json',
  ];

  if (force) {
    return;
  }

  const collisions: string[] = [];
  for (const relativePath of protectedFiles) {
    try {
      await access(path.join(projectRoot, relativePath), fsConstants.F_OK);
      collisions.push(relativePath);
    } catch {
      // File does not exist.
    }
  }

  if (collisions.length > 0) {
    throw new CliError(
      `Refusing to overwrite existing files: ${collisions.join(', ')}\nUse --force only when you intentionally want to replace the generated boilerplate.`,
      73,
    );
  }
}

function makeConfig(input: {
  name: string;
  title?: string;
  type?: string;
  classValue?: NappletClass;
  connect?: string[];
  buildCommand?: string;
  outputDir?: string;
  provider?: string;
  deployCommand?: string;
  relays?: string[];
}): NappletConfig {
  const packageName = sanitizePackageName(input.name);

  return {
    name: packageName,
    title: input.title ?? toTitle(packageName),
    type: input.type ?? sanitizeNappletType(packageName),
    class: input.classValue ?? 1,
    connect: input.connect ?? [],
    skills: ['build-napplet'],
    build: {
      command: input.buildCommand ?? 'pnpm build',
      outputDir: input.outputDir ?? 'dist',
    },
    deploy: {
      provider: input.provider ?? null,
      command: input.deployCommand ?? null,
      relays: input.relays ?? [],
    },
  };
}

function projectFiles(config: NappletConfig): Record<string, string> {
  const json = `${JSON.stringify(config, null, 2)}\n`;

  return {
    'package.json': `${JSON.stringify({
      name: config.name,
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        'napplet:build': 'napplet build',
        'napplet:deploy': 'napplet deploy',
        'napplet:doctor': 'napplet doctor',
      },
      dependencies: {
        '@napplet/sdk': DEFAULT_VERSION,
        '@napplet/shim': DEFAULT_VERSION,
      },
      devDependencies: {
        '@napplet/cli': DEFAULT_CLI_VERSION,
        '@napplet/vite-plugin': DEFAULT_PLUGIN_VERSION,
        typescript: '^5.9.3',
        vite: '^6.4.2',
      },
    }, null, 2)}\n`,
    '.napplet/napplet.json': json,
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(config.title)}</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    'src/main.ts': `import '@napplet/shim';
import { relay } from '@napplet/sdk';
import napplet from '../.napplet/napplet.json';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root');
}

app.innerHTML = \`
  <section class="shell">
    <p class="eyebrow">napplet</p>
    <h1>\${napplet.title}</h1>
    <p class="lede">This app is ready to run inside a NIP-5D shell.</p>
    <button id="publish" type="button">Publish test note</button>
    <pre id="status">Waiting for shell...</pre>
  </section>
\`;

const status = document.querySelector<HTMLPreElement>('#status');
const publish = document.querySelector<HTMLButtonElement>('#publish');

function setStatus(message: string): void {
  if (status) {
    status.textContent = message;
  }
}

setStatus(\`Configured type: \${napplet.type}\\nClass: \${napplet.class}\`);

publish?.addEventListener('click', async () => {
  try {
    const event = await relay.publish({
      kind: 1,
      content: \`Hello from \${napplet.title}\`,
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    });
    setStatus(\`Published \${event.id}\`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
});
`,
    'src/style.css': `:root {
  color: #172026;
  background: #f4f7f8;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

.shell {
  box-sizing: border-box;
  display: grid;
  min-height: 100vh;
  align-content: center;
  gap: 18px;
  padding: 32px;
}

.eyebrow {
  margin: 0;
  color: #35605a;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1,
.lede {
  margin: 0;
}

h1 {
  font-size: clamp(32px, 8vw, 72px);
  line-height: 0.95;
}

.lede {
  max-width: 44rem;
  color: #4d5b63;
  font-size: 18px;
}

button {
  width: fit-content;
  border: 0;
  border-radius: 6px;
  background: #111820;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 12px 16px;
}

pre {
  max-width: min(100%, 44rem);
  overflow: auto;
  border-left: 4px solid #d89f30;
  margin: 0;
  background: white;
  padding: 16px;
}
`,
    'vite.config.ts': `import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { nip5aManifest } from '@napplet/vite-plugin';

const napplet = JSON.parse(readFileSync(new URL('./.napplet/napplet.json', import.meta.url), 'utf8')) as {
  type: string;
  connect?: string[];
};

export default defineConfig({
  plugins: [
    nip5aManifest({
      nappletType: napplet.type,
      connect: napplet.connect,
      artifactMode: 'single-file',
    }),
  ],
});
`,
    'tsconfig.json': `${JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        useDefineForClassFields: true,
        module: 'ESNext',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        types: ['vite/client'],
        skipLibCheck: true,
        moduleResolution: 'Bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        strict: true,
      },
      include: ['src', 'vite.config.ts', '.napplet/**/*.json'],
    }, null, 2)}\n`,
    'README.md': `# ${config.title}

This napplet was created with \`napplet init\`.

## Commands

\`\`\`bash
pnpm install
napplet doctor
napplet skills install
napplet build
napplet deploy
\`\`\`

Edit \`.napplet/napplet.json\` when you need to change napplet metadata, security class, direct-connect origins, or deploy provider settings.
`,
  };
}

async function doctorCommand(ctx: RunContext): Promise<void> {
  const diagnostics = await collectDiagnostics(ctx.cwd);
  const failed = diagnostics.some((diagnostic) => diagnostic.status === 'fail');

  for (const diagnostic of diagnostics) {
    ctx.stdout.write(`${formatDiagnosticStatus(diagnostic.status)} ${diagnostic.message}\n`);
  }

  if (failed) {
    throw new CliError('napplet doctor found setup problems.', 1);
  }
}

async function collectDiagnostics(cwd: string): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  const configPath = path.join(cwd, '.napplet/napplet.json');
  const packagePath = path.join(cwd, 'package.json');
  const vitePath = path.join(cwd, 'vite.config.ts');
  const entryPath = path.join(cwd, 'src/main.ts');

  let config: NappletConfig | undefined;
  try {
    config = JSON.parse(await readFile(configPath, 'utf8')) as NappletConfig;
    diagnostics.push({ status: 'ok', message: '.napplet/napplet.json exists' });
    diagnostics.push(...validateConfig(config));
  } catch {
    diagnostics.push({ status: 'fail', message: 'Missing .napplet/napplet.json. Run `napplet init` or `napplet configure`.' });
  }

  try {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    diagnostics.push(deps['@napplet/shim']
      ? { status: 'ok', message: '@napplet/shim is installed' }
      : { status: 'fail', message: 'Missing @napplet/shim dependency' });
    diagnostics.push(deps['@napplet/sdk']
      ? { status: 'ok', message: '@napplet/sdk is installed' }
      : { status: 'warn', message: 'Missing @napplet/sdk dependency; direct window.napplet usage is possible but less ergonomic' });
    diagnostics.push(deps['@napplet/vite-plugin']
      ? { status: 'ok', message: '@napplet/vite-plugin is installed' }
      : { status: 'fail', message: 'Missing @napplet/vite-plugin devDependency' });
    diagnostics.push(packageJson.scripts?.['napplet:doctor']
      ? { status: 'ok', message: 'package.json exposes napplet:doctor' }
      : { status: 'warn', message: 'package.json has no napplet:doctor script' });
  } catch {
    diagnostics.push({ status: 'fail', message: 'Missing package.json' });
  }

  try {
    const viteConfig = await readFile(vitePath, 'utf8');
    diagnostics.push(viteConfig.includes('@napplet/vite-plugin')
      ? { status: 'ok', message: 'vite.config.ts uses @napplet/vite-plugin' }
      : { status: 'fail', message: 'vite.config.ts does not use @napplet/vite-plugin' });
    diagnostics.push(viteConfig.includes('.napplet/napplet.json') && viteConfig.includes('nappletType: napplet.type')
      ? { status: 'ok', message: 'vite.config.ts reads CLI-owned napplet metadata' }
      : { status: 'warn', message: 'vite.config.ts should read .napplet/napplet.json for type/connect metadata' });
  } catch {
    diagnostics.push({ status: 'fail', message: 'Missing vite.config.ts' });
  }

  try {
    const entry = await readFile(entryPath, 'utf8');
    diagnostics.push(entry.includes("import '@napplet/shim'") || entry.includes('import "@napplet/shim"')
      ? { status: 'ok', message: 'app entry imports @napplet/shim once' }
      : { status: 'fail', message: 'src/main.ts should import @napplet/shim' });
    diagnostics.push(/from\s+['"]@napplet\/shim['"]/.test(entry)
      ? { status: 'fail', message: '@napplet/shim is side-effect-only; use @napplet/sdk for named imports' }
      : { status: 'ok', message: 'app entry avoids named imports from @napplet/shim' });
  } catch {
    diagnostics.push({ status: 'warn', message: 'Could not inspect src/main.ts' });
  }

  if (config) {
    diagnostics.push(config.deploy.command
      ? { status: 'ok', message: 'deploy.command is configured' }
      : { status: 'warn', message: 'deploy.command is not configured; napplet deploy will stop after build' });
  }

  return diagnostics;
}

function validateConfig(config: NappletConfig): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  diagnostics.push(typeof config.name === 'string' && config.name.length > 0
    ? { status: 'ok', message: 'config has name' }
    : { status: 'fail', message: 'config.name is required' });
  diagnostics.push(typeof config.title === 'string' && config.title.length > 0
    ? { status: 'ok', message: 'config has title' }
    : { status: 'fail', message: 'config.title is required' });
  diagnostics.push(typeof config.type === 'string' && config.type.length > 0
    ? { status: 'ok', message: 'config has NIP-5A type' }
    : { status: 'fail', message: 'config.type is required' });
  diagnostics.push(config.class === 1 || config.class === 2
    ? { status: 'ok', message: `config class is ${config.class}` }
    : { status: 'fail', message: 'config.class must be 1 or 2' });
  diagnostics.push(Array.isArray(config.connect)
    ? { status: 'ok', message: 'config connect origins are explicit' }
    : { status: 'fail', message: 'config.connect must be an array' });
  diagnostics.push(Boolean(config.build?.command)
    ? { status: 'ok', message: `build command is ${config.build.command}` }
    : { status: 'fail', message: 'config.build.command is required' });

  return diagnostics;
}

function formatDiagnosticStatus(status: DiagnosticStatus): string {
  switch (status) {
    case 'ok':
      return '[ok]';
    case 'warn':
      return '[warn]';
    case 'fail':
      return '[fail]';
  }
}

async function buildCommand(ctx: RunContext): Promise<void> {
  const config = await readNappletConfig(ctx.cwd);
  await runShell(config.build.command, ctx.cwd);
}

async function deployCommand(ctx: RunContext, args: string[]): Promise<void> {
  const providerCommand = parseProviderCommand(args);
  const config = await readNappletConfig(ctx.cwd);
  await runShell(config.build.command, ctx.cwd);

  const deployCommandValue = providerCommand ?? config.deploy.command;
  if (!deployCommandValue) {
    throw new CliError(
      'Build completed, but no deploy provider is configured.\nSet deploy.command in .napplet/napplet.json or pass --provider-command "<command>".',
      78,
    );
  }

  await runShell(deployCommandValue, ctx.cwd);
}

function parseProviderCommand(args: string[]): string | undefined {
  if (args.length === 0) {
    return undefined;
  }

  if (args[0] !== '--provider-command') {
    throw new CliError(`Unknown deploy option: ${args[0]}`, 64);
  }

  return requiredValue(args, 1, '--provider-command');
}

async function skillsCommand(ctx: RunContext, args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;
  if (subcommand !== 'install') {
    throw new CliError('Usage: napplet skills install [--target <directory>] [--force]', 64);
  }

  const { target, force } = parseSkillsInstallArgs(rest);
  const skillRoot = path.resolve(ctx.cwd, target);
  const skillDir = path.join(skillRoot, 'build-napplet');
  const skillPath = path.join(skillDir, 'SKILL.md');

  await mkdir(skillDir, { recursive: true });

  if (!force) {
    try {
      await access(skillPath, fsConstants.F_OK);
      throw new CliError(`Skill already exists at ${path.relative(ctx.cwd, skillPath)}. Use --force to replace it.`, 73);
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }
    }
  }

  await writeFile(skillPath, buildNappletSkill(), 'utf8');
  ctx.stdout.write(`Installed build-napplet skill at ${path.relative(ctx.cwd, skillPath)}\n`);
}

function parseSkillsInstallArgs(args: string[]): { target: string; force: boolean } {
  let target = '.codex/skills';
  let force = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--target':
        target = requiredValue(args, ++i, '--target');
        break;
      case '--force':
        force = true;
        break;
      default:
        throw new CliError(`Unknown skills install option: ${arg}`, 64);
    }
  }

  return { target, force };
}

async function readNappletConfig(cwd: string): Promise<NappletConfig> {
  const configPath = path.join(cwd, '.napplet/napplet.json');
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch {
    throw new CliError('Missing .napplet/napplet.json. Run `napplet init` from the project root first.', 66);
  }

  const config = JSON.parse(raw) as NappletConfig;
  if (!config.build?.command) {
    throw new CliError('Invalid .napplet/napplet.json: build.command is required.', 65);
  }
  return config;
}

async function inferPackageName(cwd: string): Promise<string> {
  try {
    const packageJson = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8')) as { name?: string };
    if (packageJson.name) {
      return packageJson.name;
    }
  } catch {
    // Fall back to the directory name below.
  }

  return sanitizePackageName(path.basename(cwd));
}

function runShell(command: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new CliError(`Command failed (${code}): ${command}`, code ?? 1));
      }
    });
  });
}

function sanitizePackageName(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._/@-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'my-napplet';
}

function sanitizeNappletType(input: string): string {
  const withoutScope = input.split('/').pop() ?? input;
  const cleaned = withoutScope
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'my-napplet';
}

function toTitle(input: string): string {
  return input
    .split(/[._/-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ') || 'My Napplet';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildNappletSkill(): string {
  return `---
name: build-napplet
description: Use when building a napplet app. Start from the CLI-created project and .napplet/napplet.json; do not ask the developer to hand-wire title, type, security class, connect origins, or deployment metadata into the boilerplate.
---

# Build Napplet

Use the project generated by \`napplet init\` as the source of truth.

## Flow

1. Inspect \`.napplet/napplet.json\`.
2. Build app behavior in \`src/\`.
3. Import \`@napplet/shim\` once from the app entry point.
4. Use \`@napplet/sdk\` helpers for relay, storage, ifc, keys, media, notify, config, resource, identity, connect, and class access.
5. Do not call \`fetch()\`, \`XMLHttpRequest\`, or \`new WebSocket()\` unless \`.napplet/napplet.json\` declares direct \`connect\` origins and the app handles denied grants.
6. Use \`window.napplet.resource.bytes()\` for external images and other bytes when possible.
7. Run \`napplet doctor\` when setup looks suspicious or after adapting an existing Vite app.
8. Run \`napplet build\` before handing work back.

## Metadata

\`.napplet/napplet.json\` owns:

- \`name\`
- \`title\`
- \`type\`
- \`class\`
- \`connect\`
- \`build.command\`
- \`deploy.command\`

Do not duplicate these values inside \`vite.config.ts\` or app source unless rendering them.

If an existing app did not come from \`napplet init\`, run \`napplet configure\` first, then wire \`vite.config.ts\` to read \`.napplet/napplet.json\`.
`;
}
