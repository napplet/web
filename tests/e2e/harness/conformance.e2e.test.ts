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
    expect(stdout).toContain('[PASS] degrade/domain-absence');
    expect(code).toBe(0);
  });

  it('passes a resource.bytes data URL fixture with exit 0', async () => {
    const report = JSON.parse((await runCli([fixture('resource-data'), '--reporter', 'json'])).stdout);
    expect(report.ok).toBe(true);
    expect(report).not.toHaveProperty('napplet');
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'manifest/event-kind', status: 'skip' }),
      expect.objectContaining({ id: 'boot/no-boot-error', status: 'pass' }),
      expect.objectContaining({ id: 'wire/envelope-well-formed', status: 'pass' }),
      expect.objectContaining({ id: 'degrade/domain-absence', status: 'pass' }),
    ]));
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
    expect(conformant).not.toHaveProperty('napplet');
    expect(conformant.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'manifest/event-kind', status: 'skip' }),
    ]));

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
