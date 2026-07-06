#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

function flattenExports(exportsValue) {
  if (typeof exportsValue === 'string') return [['.', exportsValue]];
  if (!exportsValue || typeof exportsValue !== 'object') return [];
  return Object.entries(exportsValue).map(([subpath, target]) => [subpath, target]);
}

function targetPath(target) {
  if (typeof target === 'string') return target;
  if (!target || typeof target !== 'object') return null;
  return target.import ?? target.default ?? target.browser ?? null;
}

function isIncluded(relativePath, includes = []) {
  if (includes.length === 0) return true;
  return includes.some((pattern) => {
    if (pattern.endsWith('/**/*.ts')) {
      const prefix = pattern.slice(0, -'**/*.ts'.length);
      return relativePath.startsWith(prefix) && relativePath.endsWith('.ts');
    }
    if (pattern.endsWith('/**')) {
      return relativePath.startsWith(pattern.slice(0, -'**'.length));
    }
    if (pattern.endsWith('/')) {
      return relativePath.startsWith(pattern);
    }
    return relativePath === pattern;
  });
}

const errors = [];

for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const packageDir = join(PACKAGES_DIR, entry.name);
  const jsrPath = join(packageDir, 'jsr.json');
  if (!existsSync(jsrPath)) continue;

  const jsr = JSON.parse(readFileSync(jsrPath, 'utf8'));
  const includes = jsr.publish?.include ?? [];

  for (const [subpath, target] of flattenExports(jsr.exports)) {
    const rawTarget = targetPath(target);
    if (!rawTarget || !rawTarget.startsWith('./')) continue;

    const relativePath = rawTarget.slice(2);
    const absolutePath = join(packageDir, relativePath);
    if (!existsSync(absolutePath)) {
      errors.push(`${jsr.name} ${subpath} points at missing file ${rawTarget}`);
      continue;
    }

    if (!isIncluded(relativePath, includes)) {
      errors.push(`${jsr.name} ${subpath} points at ${rawTarget}, which is not included by publish.include`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('check-jsr-exports: all exported files exist and are publish-included');
