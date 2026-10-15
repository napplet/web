/**
 * Bounded scanner for secret-shaped values that must not reach build artifacts,
 * evidence, logs, staged diffs, or PR text. Diagnostics intentionally omit values.
 */
import { lstat, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_PATHS = ['dist', 'coverage', 'reports', 'logs', 'tmp', '.planning/phases'];
const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const SECRET_RULES = [
  ['nostr-secret', /\b(?:nsec|nbunksec)1[023456789acdefghjklmnpqrstuvwxyz]{20,}\b/i],
  ['private-key', /\b(?:private(?:[_ -]?key)?|secret)\s*[:=]\s*["']?[0-9a-f]{64}\b/i],
  ['blossom-authorization', /\bauthorization\s*:\s*nostr\s+[^\s"']+/i],
  ['credential-url', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/i],
  ['serialized-secret', /["'](?:secret|privateKey|private_key)["']\s*:\s*["']?(?!\[?redacted\]?|\*{3,})[^"'\s,}]{16,}/i],
];

function isRelativeSafePath(path) {
  return typeof path === 'string' && path.length > 0 && !path.includes('\0') && !path.startsWith('/') && !path.split(/[\\/]+/).includes('..');
}

function diagnostic(path, rule) {
  return { path, rule };
}

function findSecretRules(content) {
  return SECRET_RULES.filter(([, expression]) => expression.test(content)).map(([rule]) => rule);
}

async function collectFiles(root, path, findings) {
  if (!isRelativeSafePath(path)) {
    findings.push(diagnostic(path, 'invalid-path'));
    return [];
  }
  const absolute = resolve(root, path);
  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
    findings.push(diagnostic(path, 'invalid-path'));
    return [];
  }
  let stats;
  try {
    stats = await lstat(absolute);
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    findings.push(diagnostic(path, 'unreadable-path'));
    return [];
  }
  if (stats.isSymbolicLink()) {
    findings.push(diagnostic(path, 'symlink-path'));
    return [];
  }
  if (stats.isFile()) return [path];
  if (!stats.isDirectory()) {
    findings.push(diagnostic(path, 'unsupported-path'));
    return [];
  }
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) files.push(...await collectFiles(root, `${path}/${entry.name}`, findings));
  return files;
}

/**
 * Scan explicit outward-facing paths and optional staged-diff/PR-body inputs.
 * @param {{ root?: string, paths?: string[], prBodyPath?: string, stagedDiff?: string, maxFileBytes?: number, maxTotalBytes?: number }} options
 * @returns {Promise<{ ok: boolean, findings: { path: string, rule: string }[], scannedFiles: number, scannedBytes: number }>}
 */
export async function scanOutwardArtifacts(options = {}) {
  const root = resolve(options.root ?? process.cwd());
  const paths = options.paths ?? DEFAULT_PATHS;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const findings = [];
  const files = [];
  for (const path of paths) files.push(...await collectFiles(root, path, findings));
  if (options.prBodyPath) files.push(...await collectFiles(root, options.prBodyPath, findings));
  let scannedFiles = 0;
  let scannedBytes = 0;
  for (const path of [...new Set(files)].sort()) {
    const absolute = resolve(root, path);
    let bytes;
    try {
      bytes = await readFile(absolute);
    } catch {
      findings.push(diagnostic(path, 'unreadable-file'));
      continue;
    }
    scannedFiles += 1;
    if (bytes.byteLength > maxFileBytes) {
      findings.push(diagnostic(path, 'file-too-large'));
      continue;
    }
    if (scannedBytes + bytes.byteLength > maxTotalBytes) {
      findings.push(diagnostic(path, 'aggregate-too-large'));
      continue;
    }
    scannedBytes += bytes.byteLength;
    if (bytes.includes(0)) {
      findings.push(diagnostic(path, 'binary-file'));
      continue;
    }
    for (const rule of findSecretRules(bytes.toString('utf8'))) findings.push(diagnostic(path, rule));
  }
  if (options.stagedDiff !== undefined) {
    scannedFiles += 1;
    const bytes = Buffer.from(options.stagedDiff);
    if (bytes.byteLength > maxFileBytes || scannedBytes + bytes.byteLength > maxTotalBytes) {
      findings.push(diagnostic('<staged-diff>', 'diff-too-large'));
    } else {
      scannedBytes += bytes.byteLength;
      for (const rule of findSecretRules(options.stagedDiff)) findings.push(diagnostic('<staged-diff>', rule));
    }
  }
  return { ok: findings.length === 0, findings, scannedFiles, scannedBytes };
}

function parseArgs(argv) {
  const options = { paths: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--root') options.root = argv[++index];
    else if (value === '--path') options.paths.push(argv[++index]);
    else if (value === '--pr-body') options.prBodyPath = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (options.paths.length === 0) delete options.paths;
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const diff = spawnSync('git', ['diff', '--cached', '--no-ext-diff'], { cwd: options.root ?? process.cwd(), encoding: 'utf8', maxBuffer: DEFAULT_MAX_FILE_BYTES });
  options.stagedDiff = diff.error || diff.status !== 0 ? '' : diff.stdout;
  const result = await scanOutwardArtifacts(options);
  if (result.ok) {
    console.log(`Secret scan passed: ${result.scannedFiles} inputs, ${result.scannedBytes} bytes.`);
    return;
  }
  const summary = new Map();
  for (const finding of result.findings) summary.set(finding.rule, (summary.get(finding.rule) ?? 0) + 1);
  console.error(`Secret scan failed: ${result.findings.length} finding(s) across ${summary.size} rule(s).`);
  for (const [rule, count] of summary) console.error(`${rule}: ${count}`);
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => {
  console.error(`Secret scan failed safely: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
