#!/usr/bin/env node
// sync-jsr-versions.mjs — keep each packages/*/jsr.json in lockstep with its
// sibling package.json. Run AFTER `pnpm version-packages` (which bumps
// package.json via changesets) and BEFORE the JSR publish step.
//
// Two things drift when changesets bumps versions, because changesets only
// touches package.json:
//   1. jsr.json#version — must match package.json#version.
//   2. jsr.json#imports — the internal `@napplet/*` constraints (e.g.
//      "jsr:@napplet/core@^0.7.0"). JSR resolves cross-package imports against
//      these constraints at publish time, so a stale `^0.7.0` makes a bumped
//      dependent (e.g. @napplet/sdk@0.8.0) fail to resolve @napplet/nap@0.8.0
//      ("Could not find version ... matching ^0.7.0"). npm: imports
//      (nostr-tools, vite, ...) are left untouched.
//
// This script bridges both gaps with zero npm-side churn.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

// ── Pass 1: map every workspace package name → current version ──────────────
const versions = new Map();
for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pkgPath = join(PACKAGES_DIR, entry.name, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.name && pkg.version) versions.set(pkg.name, pkg.version);
}

// ── Pass 2: sync jsr.json#version + internal @napplet/* import constraints ──
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
  const before = JSON.stringify(jsr);

  jsr.version = pkg.version;

  // Regenerate the subpath exports map from package.json so jsr.json can never
  // drift when a new domain/subpath is added (only the package.json + tsup
  // entry get updated by hand). Only applies to packages whose jsr.json uses an
  // object exports map (e.g. @napplet/nap); single-string exports are left as-is.
  // Each package.json export points at built dist/*.js; JSR publishes source, so
  // map dist/<p>/<f>.js → src/<p>/<f>.ts.
  if (jsr.exports && typeof jsr.exports === 'object' && pkg.exports && typeof pkg.exports === 'object') {
    const regenerated = {};
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      const jsEntry = typeof target === 'string' ? target : (target.import || target.default);
      if (!jsEntry) continue;
      regenerated[subpath] = jsEntry.replace('/dist/', '/src/').replace(/\.js$/, '.ts');
    }
    jsr.exports = regenerated;
  }

  // Rewrite internal @napplet/* import constraints to the dependency's
  // current version. Leave npm:/external specifiers alone.
  if (jsr.imports && typeof jsr.imports === 'object') {
    for (const [name, spec] of Object.entries(jsr.imports)) {
      if (!versions.has(name)) continue;
      const want = `jsr:${name}@^${versions.get(name)}`;
      if (spec !== want) jsr.imports[name] = want;
    }
  }

  if (JSON.stringify(jsr) === before) continue;
  writeFileSync(jsrPath, JSON.stringify(jsr, null, 2) + '\n');
  console.log(`  synced ${entry.name}: version → ${pkg.version}, imports pinned to current versions`);
  changed++;
}

console.log(`sync-jsr-versions: ${changed} updated, ${skipped} packages skipped (no jsr.json)`);
