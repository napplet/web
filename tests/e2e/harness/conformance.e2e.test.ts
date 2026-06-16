import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'conformance-cli', 'dist', 'cli.js');
const fixture = (name: string): string => join(ROOT, 'tests', 'fixtures', 'napplets', name);

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    execFile('node', [CLI, ...args], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && typeof (err as NodeJS.ErrnoException & { code?: unknown }).code !== 'number') {
        reject(err); // spawn failure, not a non-zero exit
        return;
      }
      const code = err ? Number((err as unknown as { code: number }).code) : 0;
      resolve({ code, stdout, stderr });
    });
  });
}

describe('napplet-conformance CLI e2e', () => {
  it('passes the conformant fixture with exit 0', async () => {
    const { code, stdout } = await runCli([fixture('conformant')]);
    expect(stdout).toContain('RESULT: CONFORMANT');
    expect(stdout).toContain('[PASS] wire/envelope-well-formed');
    expect(stdout).toContain('[PASS] boot/installs-global');
    expect(stdout).toContain('[PASS] degrade/supports-false');
    expect(code).toBe(0);
  });

  it('fails the broken fixture with exit 1', async () => {
    const { code, stdout } = await runCli([fixture('broken')]);
    expect(stdout).toContain('RESULT: NON-CONFORMANT');
    expect(stdout).toContain('[FAIL] wire/envelope-well-formed');
    expect(code).toBe(1);
  });

  it('emits machine-readable JSON whose ok matches the verdict', async () => {
    const conformant = JSON.parse((await runCli([fixture('conformant'), '--reporter', 'json'])).stdout);
    expect(conformant.ok).toBe(true);
    expect(conformant.napplet).toBe('conformant-fixture');

    const broken = JSON.parse((await runCli([fixture('broken'), '--reporter', 'json'])).stdout);
    expect(broken.ok).toBe(false);
    expect(broken.summary.errors).toBeGreaterThan(0);
  });

  it('emits JUnit XML for CI consumers', async () => {
    const { stdout } = await runCli([fixture('broken'), '--reporter', 'junit']);
    expect(stdout).toContain('<?xml version="1.0"');
    expect(stdout).toContain('<failure ');
  });
});
