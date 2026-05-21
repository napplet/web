#!/usr/bin/env node
// sync-jsr-versions.mjs — copy each packages/*/package.json#version into the
// sibling jsr.json#version. Run AFTER `pnpm version-packages` (which bumps
// package.json via changesets) and BEFORE the JSR publish step.
//
// JSR refuses to publish if jsr.json#version drifts from the package.json
// version range a consumer expects, and changesets only updates package.json.
// This script bridges the gap with zero npm-side churn.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

let changed = 0;
let skipped = 0;

for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pkgPath = join(PACKAGES_DIR, entry.name, 'package.json');
  const jsrPath = join(PACKAGES_DIR, entry.name, 'jsr.json');
  if (!existsSync(jsrPath)) {
    skipped++;
    continue;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const jsr = JSON.parse(readFileSync(jsrPath, 'utf8'));
  if (jsr.version === pkg.version) {
    continue;
  }
  jsr.version = pkg.version;
  writeFileSync(jsrPath, JSON.stringify(jsr, null, 2) + '\n');
  console.log(`  synced ${entry.name}: jsr.json#version → ${pkg.version}`);
  changed++;
}

console.log(`sync-jsr-versions: ${changed} updated, ${skipped} packages skipped (no jsr.json)`);
