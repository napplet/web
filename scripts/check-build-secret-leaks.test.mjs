import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { scanOutwardArtifacts } from './check-build-secret-leaks.mjs';

async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), 'napplet-secret-scan-'));
  for (const [path, content] of Object.entries(files)) {
    const destination = join(root, path);
    await mkdir(join(destination, '..'), { recursive: true });
    await writeFile(destination, content);
  }
  return root;
}

test('detects real secret-shaped outward values without echoing them', async () => {
  const root = await fixture({
    'out/report.txt': [
      'nbunksec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      'nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      'privateKey: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      'Authorization: Nostr eyJhbGciOiJub25lIn0.eyJzdWIiOiJzaWduZXIifQ.signature',
      'https://alice:correct-horse-battery-staple@example.test/upload',
      '{"secret":"nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"}',
    ].join('\n'),
  });
  const result = await scanOutwardArtifacts({ root, paths: ['out'] });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'nostr-secret'));
  assert.ok(result.findings.some((finding) => finding.rule === 'blossom-authorization'));
  assert.ok(result.findings.some((finding) => finding.rule === 'credential-url'));
  assert.doesNotMatch(JSON.stringify(result), /correct-horse|0123456789abcdef/);
});

test('permits public identifiers, hashes, invalid examples, and redacted sentinels', async () => {
  const root = await fixture({
    'out/evidence.md': [
      'NIP-5D, NAP-RESOURCE, and Blossom are protocol identifiers.',
      'nsec1example-not-a-valid-bech32-value',
      'aggregate hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      'pubkey: npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      '{"secret":"[REDACTED]"}',
    ].join('\n'),
  });
  const result = await scanOutwardArtifacts({ root, paths: ['out'] });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
  assert.equal(result.scannedFiles, 1);
  assert.ok(result.scannedBytes > 0);
});

test('does not let a redacted sentinel hide a separate secret', async () => {
  const root = await fixture({
    'out/mixed.txt': '{"secret":"[REDACTED]"}\nAuthorization: Nostr eyJhbGciOiJub25lIn0.eyJzdWIiOiJzaWduZXIifQ.signature',
  });
  const result = await scanOutwardArtifacts({ root, paths: ['out'] });

  assert.deepEqual(result.findings, [{ path: 'out/mixed.txt', rule: 'blossom-authorization' }]);
});

test('scans generated files, evidence, staged diff, and PR-body input', async () => {
  const root = await fixture({
    'dist/index.html': '<script src="main.js"></script>',
    'logs/build.log': 'build complete',
    'reports/result.json': '{"result":"pass"}',
    'config/cache.json': '{"cache":"safe"}',
    'phase/162-DEMO.md': 'demo evidence',
    'pr-body.md': 'Authorization: Nostr eyJhbGciOiJub25lIn0.eyJwciI6InRydWUifQ.signature',
  });
  const result = await scanOutwardArtifacts({
    root,
    paths: ['dist', 'logs', 'reports', 'config', 'phase'],
    prBodyPath: 'pr-body.md',
    stagedDiff: 'diff --git a/a b/a\n+safe staged diff',
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.findings, [{ path: 'pr-body.md', rule: 'blossom-authorization' }]);
  assert.equal(result.scannedFiles, 7);
});

test('fails closed for unreadable shapes without echoing suspect data', async () => {
  const root = await fixture({
    'out/binary.bin': Buffer.from([0, 1, 2]),
    'out/large.txt': 'x'.repeat(1025),
  });
  const binary = await scanOutwardArtifacts({ root, paths: ['out/binary.bin'] });
  const large = await scanOutwardArtifacts({ root, paths: ['out/large.txt'], maxFileBytes: 1024 });
  const traversal = await scanOutwardArtifacts({ root, paths: ['../escape'] });

  assert.deepEqual(binary.findings, [{ path: 'out/binary.bin', rule: 'binary-file' }]);
  assert.deepEqual(large.findings, [{ path: 'out/large.txt', rule: 'file-too-large' }]);
  assert.deepEqual(traversal.findings, [{ path: '../escape', rule: 'invalid-path' }]);
  assert.doesNotMatch(JSON.stringify({ binary, large, traversal }), /x{20}/);
});
