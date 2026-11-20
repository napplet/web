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
    expect(stdout).toContain('[PASS] wire/port-only');
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

  // NIP-5D: a NAP named `foo` owns `foo.*`, and presence of window.napplet.<domain> is the availability signal.
  it('exposes an allowlisted experimental domain and accepts its traffic under --strict', async () => {
    const extension = join(ROOT, 'tests', 'fixtures', 'extensions', 'mesh.js');
    const { code, stdout } = await runCli([
      fixture('experimental-domain'), '--reporter', 'json', '--strict', '--experimental-domain', 'mesh', '--extension', extension,
    ]);
    const report = JSON.parse(stdout);
    expect(code).toBe(0);
    expect(report).toMatchObject({ ok: true, strict: true });
    const check = (id: string) => report.checks.find((c: { id: string }) => c.id === id);
    expect(check('wire/envelope-well-formed')).toMatchObject({ status: 'pass', detail: '2 envelope(s) valid' });
    expect(check('wire/known-message-types')).toMatchObject({ status: 'pass' });
    expect(check('degrade/domain-absence')).toMatchObject({ status: 'pass' });
  });

  it('does not expose an experimental domain that is not allowlisted', async () => {
    const extension = join(ROOT, 'tests', 'fixtures', 'extensions', 'mesh.js');
    const { code, stdout } = await runCli([fixture('experimental-domain'), '--reporter', 'json', '--extension', extension]);
    const report = JSON.parse(stdout);
    expect(code).toBe(0);
    expect(report.checks.find((c: { id: string }) => c.id === 'wire/envelope-well-formed').detail).toBe('1 envelope(s) valid');
  });

  it('rejects a NAP domain passed as experimental', async () => {
    const { code, stderr } = await runCli([fixture('experimental-domain'), '--experimental-domain', 'relay']);
    expect(code).toBe(2);
    expect(stderr).toContain('"relay" is a NAP domain');
  });

  it('fails the broken fixture with exit 1', async () => {
    const { code, stdout } = await runCli([fixture('broken')]);
    expect(stdout).toContain('RESULT: NON-CONFORMANT');
    expect(stdout).toContain('[FAIL] wire/port-only');
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
