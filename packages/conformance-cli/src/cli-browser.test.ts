import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { finalizeEvent } from 'nostr-tools/pure';
import { expect, it } from 'vitest';

const run = promisify(execFile);
// Each case launches two real CLI/browser processes; their own boot deadlines remain unchanged.
const CLI_CASE_TIMEOUT_MS = 30_000;
const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

it('boots the verified remote snapshot once and rejects a mismatched signature before any subject execution', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'napplet-signed-'));
  const manifest = join(dir, 'event.json');
  let reads = 0;
  let executions = 0;
  const server = createServer((request, response) => {
    if (request.url === '/executed') { executions += 1; response.end('ok'); return; }
    reads += 1;
    response.setHeader('Content-Type', 'text/html');
    response.end(reads === 1 ? html : '<script>throw new Error("artifact was fetched twice");</script>');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const html = `<!doctype html><img src="${origin}/executed"><p>Signed artifact</p>`;
  const event = finalizeEvent({ kind: 5129, created_at: 1, content: 'CLI snapshot test.', tags: [['x', createHash('sha256').update(html).digest('hex')]] }, new Uint8Array(32).fill(1));
  try {
    await writeFile(manifest, JSON.stringify(event));
    const valid = await run(process.execPath, [cli, '--url', origin, '--manifest', manifest, '--reporter', 'json']);
    const report = JSON.parse(valid.stdout) as { ok: boolean; checks: { id: string; status: string }[] };
    expect(report.ok).toBe(true);
    const manifestChecks = report.checks.filter((check) => check.id.startsWith('manifest/'));
    expect(manifestChecks).toHaveLength(5);
    expect(manifestChecks.every((check) => check.status === 'pass')).toBe(true);
    expect(reads).toBe(1);
    expect(executions).toBe(2); // primary + no-domain pass, both using the verified bytes

    await writeFile(manifest, JSON.stringify({ ...event, content: 'tampered' }));
    const before = executions;
    await expect(run(process.execPath, [cli, '--url', origin, '--manifest', manifest])).rejects.toMatchObject({ code: 2, stderr: expect.stringContaining('signature or event id is invalid') });
    expect(executions).toBe(before);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(dir, { recursive: true, force: true });
  }
}, CLI_CASE_TIMEOUT_MS);


it('keeps missing-manifest checks skipped and reports the actual debug sandbox', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'napplet-debug-sandbox-'));
  try {
    await writeFile(join(dir, 'index.html'), '<!doctype html><p>Fixture</p>');
    const normal = await run(process.execPath, [cli, dir, '--reporter', 'json']);
    const report = JSON.parse(normal.stdout) as { checks: { id: string; status: string }[] };
    const manifests = report.checks.filter((check) => check.id.startsWith('manifest/'));
    expect(manifests).toHaveLength(5);
    expect(manifests.every((check) => check.status === 'skip')).toBe(true);
    try {
      await run(process.execPath, [cli, dir, '--allow-same-origin', '--reporter', 'json']);
      throw new Error('The debug sandbox incorrectly passed conformance');
    } catch (error) {
      expect(error).toMatchObject({ code: 1 });
      const result = JSON.parse((error as { stdout: string }).stdout) as { checks: { id: string; status: string }[] };
      expect(result.checks.find((check) => check.id === 'boot/sandbox-allow-scripts')?.status).toBe('fail');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, CLI_CASE_TIMEOUT_MS);
