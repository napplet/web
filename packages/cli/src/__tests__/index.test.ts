import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../index.js';

function stream() {
  let value = '';
  return {
    write(chunk: string | Uint8Array) {
      value += chunk.toString();
      return true;
    },
    get value() {
      return value;
    },
  };
}

describe('napplet cli', () => {
  it('initializes boilerplate and owns napplet metadata in .napplet config', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'napplet-cli-'));
    const stdout = stream();
    const stderr = stream();

    const code = await main({
      cwd,
      argv: ['init', 'hello-world', '--title', 'Hello World', '--connect', 'https://api.example.com'],
      stdout,
      stderr,
    });

    expect(code).toBe(0);
    expect(stderr.value).toBe('');
    expect(stdout.value).toContain('Created Hello World');

    const config = JSON.parse(await readFile(path.join(cwd, 'hello-world/.napplet/napplet.json'), 'utf8'));
    expect(config).toMatchObject({
      name: 'hello-world',
      title: 'Hello World',
      type: 'hello-world',
      class: 1,
      connect: ['https://api.example.com'],
    });

    const viteConfig = await readFile(path.join(cwd, 'hello-world/vite.config.ts'), 'utf8');
    expect(viteConfig).toContain("readFileSync(new URL('./.napplet/napplet.json'");
    expect(viteConfig).toContain('nappletType: napplet.type');

    const packageJson = JSON.parse(await readFile(path.join(cwd, 'hello-world/package.json'), 'utf8'));
    expect(packageJson.scripts['napplet:doctor']).toBe('napplet doctor');
  });

  it('installs the build-napplet skill into a project-local skill directory', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'napplet-cli-'));
    const stdout = stream();
    const stderr = stream();

    const code = await main({
      cwd,
      argv: ['skills', 'install'],
      stdout,
      stderr,
    });

    expect(code).toBe(0);
    expect(stderr.value).toBe('');
    expect(stdout.value).toContain('Installed build-napplet skill');

    const skill = await readFile(path.join(cwd, '.codex/skills/build-napplet/SKILL.md'), 'utf8');
    expect(skill).toContain('Inspect `.napplet/napplet.json`');
    expect(skill).toContain('Do not duplicate these values inside `vite.config.ts`');
  });

  it('configures an existing app without writing boilerplate', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'napplet-cli-'));
    await writeFile(
      path.join(cwd, 'package.json'),
      JSON.stringify({ name: '@demo/existing', type: 'module' }, null, 2),
    );
    const stdout = stream();
    const stderr = stream();

    const code = await main({
      cwd,
      argv: [
        'configure',
        '--title',
        'Existing App',
        '--class',
        '2',
        '--connect',
        'https://api.example.com',
        '--provider',
        'nsyte',
        '--deploy-command',
        'nsyte deploy dist',
      ],
      stdout,
      stderr,
    });

    expect(code).toBe(0);
    expect(stderr.value).toBe('');
    expect(stdout.value).toContain('Created .napplet/napplet.json');

    const config = JSON.parse(await readFile(path.join(cwd, '.napplet/napplet.json'), 'utf8'));
    expect(config).toMatchObject({
      name: '@demo/existing',
      title: 'Existing App',
      type: 'existing',
      class: 2,
      connect: ['https://api.example.com'],
      deploy: {
        provider: 'nsyte',
        command: 'nsyte deploy dist',
      },
    });
  });

  it('reports generated projects as doctor-ready with deploy as the remaining warning', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'napplet-cli-'));
    const initOut = stream();
    const initErr = stream();

    expect(await main({
      cwd,
      argv: ['init', 'healthy'],
      stdout: initOut,
      stderr: initErr,
    })).toBe(0);

    const stdout = stream();
    const stderr = stream();
    const code = await main({
      cwd: path.join(cwd, 'healthy'),
      argv: ['doctor'],
      stdout,
      stderr,
    });

    expect(code).toBe(0);
    expect(stderr.value).toBe('');
    expect(stdout.value).toContain('[ok] .napplet/napplet.json exists');
    expect(stdout.value).toContain('[ok] vite.config.ts reads CLI-owned napplet metadata');
    expect(stdout.value).toContain('[warn] deploy.command is not configured');
  });
});
