/**
 * Scans active authoring and package surfaces for retired numbered-convention
 * vocabulary. Historical records and narrowly scoped rejection tests are left
 * intact so this guard does not rewrite the repository's release history.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, extname, join, relative } from 'node:path';

const ACTIVE_ROOTS = ['README.md', 'packages', 'apps/docs', 'apps/conformance'];
const TEXT_EXTENSIONS = new Set(['.json', '.md', '.mjs', '.ts', '.tsx']);
const SKIPPED_DIRECTORIES = new Set(['dist', 'dist-bin', 'node_modules']);
const REJECTION_TEST_PATHS = new Set([
  'packages/vite-plugin/src/index.test.ts',
  'packages/cli/tests/config_test.ts',
  'packages/cli/tests/manifest_test.ts',
]);
const REJECTION_ASSERTION = /\b(?:assertThrows|toThrow|throws)\b/;
const RETIRED_INTENT_PATTERN = /\bIntentContract\b|\b(?:protocols|contracts)\??\s*:/g;
const RETIRED_PROTOCOL_FIELD_PATTERN = /\bprotocol\??\s*:/g;
const NUMBERED_CONVENTION_PATTERN = /\bNAP-\d+\b/g;
const SLUG_NUMBER_PATTERN = /\b[a-z][a-z0-9-]*:NAP-\d+\b/g;
const ARCHETYPE_KIND_PATTERN = /\bkind:\d+\b/g;

/**
 * Recursively collects text files below an active root without following links.
 *
 * @param {string} path - Absolute path to inspect.
 * @returns {Promise<string[]>} Text-file paths.
 */
async function collectFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(path, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      files.push(...await collectFiles(entryPath));
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))) files.push(entryPath);
  }

  return files;
}

/**
 * Returns whether a legacy literal is part of one of the exact negative tests
 * that proves the Vite or CLI boundary rejects it.
 *
 * @param {string} filePath - Repository-relative POSIX path.
 * @param {string} contents - Entire test file.
 * @returns {boolean} Whether the file is a dedicated rejection test.
 */
function isDedicatedRejectionTest(filePath, contents) {
  return REJECTION_TEST_PATHS.has(filePath) && REJECTION_ASSERTION.test(contents);
}

/**
 * Limits the retired singular `protocol` field check to intent contracts so
 * generic protocol properties (such as URLs or WebRTC) stay outside this guard.
 *
 * @param {string} filePath - Repository-relative POSIX path.
 * @returns {boolean} Whether the path owns an intent contract.
 */
function isIntentContractPath(filePath) {
  return filePath.includes('/intent/') || filePath.endsWith('/intent.ts');
}

/**
 * Converts a regexp match offset to the matching one-based source line.
 *
 * @param {string} contents - Source text.
 * @param {number} offset - Match index.
 * @returns {number} One-based source line.
 */
function lineNumber(contents, offset) {
  return contents.slice(0, offset).split('\n').length;
}

/**
 * Adds every match from one retired-vocabulary family to the violations list.
 *
 * @param {Array<{path: string, line: number, family: string, match: string}>} violations - Results accumulator.
 * @param {string} filePath - Repository-relative POSIX path.
 * @param {string} contents - Source text.
 * @param {string} family - Stable retired-vocabulary family label.
 * @param {RegExp} pattern - Global pattern for the family.
 * @returns {void}
 */
function addMatches(violations, filePath, contents, family, pattern) {
  pattern.lastIndex = 0;
  for (const match of contents.matchAll(pattern)) {
    violations.push({
      path: filePath,
      line: lineNumber(contents, match.index),
      family,
      match: match[0],
    });
  }
}

/**
 * Scans the current convention contract surface rooted at a repository path.
 *
 * @param {string} root - Repository root or fixture root.
 * @returns {Promise<Array<{path: string, line: number, family: string, match: string}>>} Retired vocabulary matches.
 */
export async function scanConventionContracts(root) {
  const files = [];

  for (const activeRoot of ACTIVE_ROOTS) {
    const rootPath = join(root, activeRoot);
    try {
      const rootFiles = extname(activeRoot) === ''
        ? await collectFiles(rootPath)
        : [rootPath];
      files.push(...rootFiles);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') continue;
      throw error;
    }
  }

  const violations = [];
  for (const file of files) {
    if (basename(file) === 'CHANGELOG.md') continue;

    const filePath = relative(root, file).split('\\').join('/');
    if (filePath === 'skills' || filePath.startsWith('.planning/')) continue;

    let contents;
    try {
      contents = await readFile(file, 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') continue;
      throw error;
    }
    if (isDedicatedRejectionTest(filePath, contents)) continue;

    addMatches(violations, filePath, contents, 'intent-contract', RETIRED_INTENT_PATTERN);
    if (isIntentContractPath(filePath)) {
      addMatches(violations, filePath, contents, 'intent-contract', RETIRED_PROTOCOL_FIELD_PATTERN);
    }
    addMatches(violations, filePath, contents, 'numbered-convention', NUMBERED_CONVENTION_PATTERN);
    addMatches(violations, filePath, contents, 'slug-number-example', SLUG_NUMBER_PATTERN);
    if (/\barchetype\b/i.test(contents)) {
      addMatches(violations, filePath, contents, 'archetype-kind-constraint', ARCHETYPE_KIND_PATTERN);
    }
  }

  return violations;
}

async function main() {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const violations = await scanConventionContracts(root);

  if (violations.length === 0) return;

  for (const violation of violations) {
    console.error(`${violation.path}:${violation.line} ${violation.family}: ${violation.match}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
