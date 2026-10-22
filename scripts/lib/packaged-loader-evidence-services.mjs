import * as crypto from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import {
  SimplePool,
  useWebSocketImplementation as installWebSocketImplementation,
} from 'nostr-tools/pool';

const execFile = promisify(execFileCallback);

async function command(commandName, args) {
  const result = await execFile(commandName, args, {
    cwd: process.cwd(),
    maxBuffer: 20 * 1024 * 1024,
  });
  return result.stdout.trim();
}

async function ensureWebSocketImplementation() {
  if (typeof globalThis.WebSocket === 'function') return;
  const { WebSocket } = await import('ws');
  installWebSocketImplementation(WebSocket);
}

function createGitServices() {
  return {
    localHead() {
      return command('git', ['rev-parse', 'HEAD']);
    },
    remoteHead(ref) {
      return command('git', ['rev-parse', `refs/remotes/origin/${ref}`]);
    },
    async isAncestor(ancestor, descendant) {
      try {
        await command('git', ['merge-base', '--is-ancestor', ancestor, descendant]);
        return true;
      } catch {
        return false;
      }
    },
    async diffPaths(from, to) {
      const output = await command('git', ['diff', '--name-only', from, to]);
      return output.split('\n').filter(Boolean);
    },
    async treeHash(ref, excluded) {
      const output = await command('git', ['ls-tree', '-r', ref]);
      const retained = output
        .split('\n')
        .filter(
          (line) => line && !excluded.some((file) => line.endsWith(`\t${file}`)),
        )
        .join('\n');
      return sha256(retained);
    },
    diffText(from, to) {
      return command('git', ['diff', '--binary', from, to]);
    },
  };
}

function createGitHubServices() {
  return {
    async pullRequest({ repo, head }) {
      const output = await command('gh', [
        'pr',
        'view',
        head,
        '--repo',
        repo,
        '--json',
        'number,state,mergedAt,headRefOid,headRefName,baseRefName,body',
      ]);
      const value = JSON.parse(output);
      return {
        number: value.number,
        state: value.state,
        merged: value.mergedAt !== null,
        headSha: value.headRefOid,
        head: value.headRefName,
        base: value.baseRefName,
        body: value.body ?? '',
      };
    },
    async timeline({ repo, number }) {
      const output = await command('gh', [
        'api',
        `repos/${repo}/issues/${number}/events`,
        '--paginate',
        '--slurp',
      ]);
      const pages = JSON.parse(output);
      return pages.flat().map((event) => ({ type: event.event }));
    },
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function productionServices() {
  await ensureWebSocketImplementation();
  return {
    async queryRelay({ relays, filter }) {
      const pool = new SimplePool();
      try {
        return await pool.querySync(relays, filter);
      } finally {
        pool.close(relays);
      }
    },
    async fetchBytes(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    },
    git: createGitServices(),
    github: createGitHubServices(),
  };
}
