import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'napplet-installer-test-'));

try {
  const release = path.join(fixtureRoot, 'release');
  const installDir = path.join(fixtureRoot, 'bin');
  await mkdir(release, { recursive: true });
  const asset = 'napplet-linux-x86_64';
  const payload = '#!/bin/sh\nprintf "napplet fixture\\n"\n';
  await writeFile(path.join(release, asset), payload);
  await chmod(path.join(release, asset), 0o755);
  const digest = createHash('sha256').update(payload).digest('hex');
  await writeFile(path.join(release, 'SHA256SUMS'), `${digest}  ${asset}\n`);

  const env = {
    ...process.env,
    NAPPLET_CLI_RELEASE_BASE: `file://${release}`,
    NAPPLET_CLI_INSTALL_DIR: installDir,
    NAPPLET_CLI_PLATFORM: 'linux',
    NAPPLET_CLI_ARCH: 'x86_64',
  };
  const installed = spawnSync('sh', ['scripts/install-napplet-cli.sh'], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  assert.equal(installed.status, 0, installed.stderr);
  assert.equal(installed.stdout.trim().split('\n').at(-1), "try running 'napplet guide'");
  assert.equal(await readFile(path.join(installDir, 'napplet'), 'utf8'), payload);
  const executed = spawnSync(path.join(installDir, 'napplet'), [], { encoding: 'utf8' });
  assert.equal(executed.status, 0);
  assert.equal(executed.stdout, 'napplet fixture\n');

  await writeFile(path.join(release, asset), `${payload}# tampered\n`);
  const rejected = spawnSync('sh', ['scripts/install-napplet-cli.sh'], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /checksum verification failed/);
  assert.equal(await readFile(path.join(installDir, 'napplet'), 'utf8'), payload);

  const shell = await readFile(path.join(root, 'scripts/install-napplet-cli.sh'), 'utf8');
  const powershell = await readFile(path.join(root, 'scripts/install-napplet-cli.ps1'), 'utf8');
  assert.equal(await readFile(path.join(root, 'apps/web/public/install.sh'), 'utf8'), shell);
  assert.equal(await readFile(path.join(root, 'apps/web/public/install.ps1'), 'utf8'), powershell);
  assert.match(shell, /\\033\[1;36mtry running/);
  assert.match(shell, /\\033\[1;97m.*napplet guide/);
  assert.match(powershell, /Get-FileHash -Algorithm SHA256/);
  assert.match(powershell, /checksum verification failed/);
  assert.match(powershell, /\[1;36mtry running/);
  assert.match(powershell, /\[1;97m'napplet guide'/);

  console.log('installer smoke tests passed');
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
