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
const NUMBERED_CONVENTION_PATTERN = /\bNAP-\d+\b/g;
const SLUG_NUMBER_PATTERN = /\b[a-z][a-z0-9-]*:NAP-\d+\b/g;
const INC_QUERY_DENIAL_PATTERN = /\b(?:convention\s+quer(?:y|ies)\s+(?:are|remain)\s+(?:forbidden|unresolved|unsupported)|(?:do not|does not)\s+(?:add|introduce|specify|use|allow|support|prescribe)[^.\n]{0,120}\bquery(?:\s*,\s*(?:prefix|wildcard|canonicalization))?|(?:query|encoding\/matching)\s+(?:\w+\s+){0,6}unresolved|web#183)\b/gi;
const TEST_FILE_PATTERN = /(?:^|\/)(?:[^/]+\.test\.[cm]?[jt]sx?|tests\/.+\.[cm]?[jt]sx?)$/;
const COMPLETED_SUMMARY_PATTERN = /(?:^|\/)\d+-\d+-SUMMARY\.md$/;
const INTENT_RESULT_LIFECYCLE_PATTERN = /\b(?:handled|windowId)\s*:|\b(?:handled|windowId)\b\s+(?:result|field|property)\b|\bbehavior(?:\s*\.\s*newWindow|\s*:\s*\{[^}\n]*\bnewWindow\s*:)/g;
const INTENT_DELIVERY_ID_PATTERN = /\b(?:deliveryId|intentId)\b|\btype\s*:\s*['"]intent\.deliver['"][^}\n]{0,240}\bid\s*:/gi;
const QUERY_BEARING_HANDLER_METADATA_PATTERN = /\b(?:archetype|contracts?|handlers?)\b[^\n]{0,160}\bnapplet:[a-z0-9-]+\/[a-z0-9-]+\?[^'"\s`)\]}]+/gi;
const QUERY_BEARING_ARCHETYPE_TAG_PATTERN = /['"]archetype['"][\s\S]{0,160}\bnapplet:[a-z0-9-]+\/[a-z0-9-]+\?[^'"\s`)\]}]+/gi;
const INTENT_DELIVERY_INC_COUPLING_PATTERN = /\b(?:intent(?:\s+delivery|\.deliver)|delivery)\b[^.\n]{0,120}\b(?:requires?|depends?\s+on|uses?|is\s+coupled\s+to|through)\s+(?:public\s+)?(?:NAP-)?INC\b/gi;
const FIXED_ARCHETYPE_TAG_SHAPE_PATTERN = /\barchetype\s+tags?\b[^.\n]{0,100}\b(?:must|should|can)\s+(?:contain|have|use)\s+(?:only\s+)?(?:exactly\s+)?three\s+(?:fields?|elements?|values?)\b|\b(?:only|exactly)\s+three[-\s](?:field|element|value)s?\b[^.\n]{0,100}\barchetype\s+tags?\b/gi;

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
 * Returns whether a file contains test-only rejection fixtures rather than
 * active authoring or package-contract guidance.
 *
 * @param {string} filePath - Repository-relative POSIX path.
 * @returns {boolean} Whether the file is test-only.
 */
function isTestFile(filePath) {
  return TEST_FILE_PATTERN.test(filePath);
}

/**
 * Identifies active intent contract surfaces without treating generic terms
 * such as "handled" as protocol guidance.
 *
 * @param {string} filePath - Repository-relative POSIX path.
 * @param {string} contents - Entire test file.
 * @returns {boolean} Whether the file owns intent contract behavior.
 */
function isIntentContractSurface(filePath, contents) {
  return /(?:^|\/)intent(?:[-_/\.]|s?\.md$)/i.test(filePath)
    || /\b(?:NAP-INTENT|Intent(?:Result|Delivery|Contract|Candidate|Request)|intent\.(?:invoke|open|deliver))\b/.test(contents);
}

/**
 * Limits the superseded query-denial guidance check to active Markdown that
 * teaches INC or napplet conventions, excluding source APIs and history.
 *
 * @param {string} filePath - Repository-relative POSIX path.
 * @param {string} contents - Entire Markdown file.
 * @returns {boolean} Whether the file is active INC authoring guidance.
 */
function isActiveIncGuidance(filePath, contents) {
  return filePath.endsWith('.md')
    && (/\b(?:NAP-)?INC\b/i.test(contents) || /\bnapplet:[^\s`'"\])}]+/i.test(contents));
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
    if (isTestFile(filePath) || COMPLETED_SUMMARY_PATTERN.test(filePath)) continue;

    if (isIntentContractSurface(filePath, contents)) {
      addMatches(violations, filePath, contents, 'intent-result-lifecycle', INTENT_RESULT_LIFECYCLE_PATTERN);
      addMatches(violations, filePath, contents, 'intent-delivery-id', INTENT_DELIVERY_ID_PATTERN);
    }
    addMatches(violations, filePath, contents, 'numbered-convention', NUMBERED_CONVENTION_PATTERN);
    addMatches(violations, filePath, contents, 'slug-number-example', SLUG_NUMBER_PATTERN);
    addMatches(violations, filePath, contents, 'query-bearing-handler-metadata', QUERY_BEARING_HANDLER_METADATA_PATTERN);
    addMatches(violations, filePath, contents, 'query-bearing-handler-metadata', QUERY_BEARING_ARCHETYPE_TAG_PATTERN);
    addMatches(violations, filePath, contents, 'intent-delivery-inc-coupling', INTENT_DELIVERY_INC_COUPLING_PATTERN);
    addMatches(violations, filePath, contents, 'fixed-archetype-tag-shape', FIXED_ARCHETYPE_TAG_SHAPE_PATTERN);
    if (isActiveIncGuidance(filePath, contents)) {
      addMatches(violations, filePath, contents, 'inc-query-transposition-denial', INC_QUERY_DENIAL_PATTERN);
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
