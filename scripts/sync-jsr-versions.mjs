#!/usr/bin/env node
// sync-jsr-versions.mjs — keep each packages/* JSR package config in lockstep
// with its sibling package.json. Most packages use jsr.json; Deno-first
// packages such as @napplet/cli publish from deno.json. Run AFTER
// `pnpm version-packages` (which bumps package.json via changesets) and BEFORE
// the JSR publish step.
//
// Two things drift when changesets bumps versions, because changesets only
// touches package.json:
//   1. jsr.json#version or deno.json#version — must match package.json#version.
//   2. jsr.json#imports — the internal `@napplet/*` constraints (e.g.
//      "jsr:@napplet/core@^0.7.0"). JSR resolves cross-package imports against
//      these constraints at publish time, so a stale `^0.7.0` makes a bumped
//      dependent (e.g. @napplet/sdk@0.8.0) fail to resolve @napplet/nap@0.8.0
//      ("Could not find version ... matching ^0.7.0"). npm: imports
//      (nostr-tools, vite, ...) are left untouched.
//
// This script bridges both gaps with zero npm-side churn.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSR_EXPORT_SKIP_SUBPATHS = new Map([
  ['@napplet/shim', new Set(['./prelude.global'])],
]);

/**
 * Synchronize JSR and Deno package metadata with workspace package versions.
 *
 * @param {string} repoRoot - Root directory containing the workspace packages.
 * @returns {void}
 * @example
 * syncJsrVersions();
 */
export function syncJsrVersions(repoRoot = REPO_ROOT) {
  const packagesDir = join(repoRoot, 'packages');

  // ── Pass 1: map every workspace package name → current version ────────────
  const versions = new Map();
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(packagesDir, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.name && pkg.version) versions.set(pkg.name, pkg.version);
  }

  // ── Pass 2: sync jsr.json#version + internal @napplet/* imports ───────────
  let changed = 0;
  let skipped = 0;

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(packagesDir, entry.name, 'package.json');
    const jsrPath = join(packagesDir, entry.name, 'jsr.json');
    if (!existsSync(jsrPath)) {
      skipped++;
      continue;
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const jsr = JSON.parse(readFileSync(jsrPath, 'utf8'));
    const before = JSON.stringify(jsr);

    jsr.version = pkg.version;

    syncJsrExports(pkg, jsr, jsrPath);
    syncJsrImports(jsr, versions);

    if (JSON.stringify(jsr) === before) continue;
    writeFileSync(jsrPath, JSON.stringify(jsr, null, 2) + '\n');
    console.log(`  synced ${entry.name}: version → ${pkg.version}, imports pinned to current versions`);
    changed++;
  }

  console.log(`sync-jsr-versions: ${changed} updated, ${skipped} packages skipped (no jsr.json)`);

  // ── Pass 3: sync Deno-first JSR packages that publish from deno.json ──────
  let denoChanged = 0;
  let denoSkipped = 0;

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(packagesDir, entry.name, 'package.json');
    const jsrPath = join(packagesDir, entry.name, 'jsr.json');
    const denoPath = join(packagesDir, entry.name, 'deno.json');
    if (existsSync(jsrPath) || !existsSync(pkgPath) || !existsSync(denoPath)) {
      denoSkipped++;
      continue;
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deno = JSON.parse(readFileSync(denoPath, 'utf8'));
    if (deno.name !== pkg.name || typeof deno.version !== 'string') {
      denoSkipped++;
      continue;
    }
    if (deno.version === pkg.version) continue;

    deno.version = pkg.version;
    writeFileSync(denoPath, JSON.stringify(deno, null, 2) + '\n');
    console.log(`  synced ${entry.name}: deno.json version -> ${pkg.version}`);
    denoChanged++;
  }

  console.log(`sync-jsr-versions: ${denoChanged} deno.json package configs updated`);
}

/** Regenerate concrete source exports while preserving npm-only asset exclusions. */
function syncJsrExports(pkg, jsr, jsrPath) {
  if (jsr.exports && typeof jsr.exports === 'object' && pkg.exports && typeof pkg.exports === 'object') {
    const regenerated = {};
    const skipSubpaths = JSR_EXPORT_SKIP_SUBPATHS.get(pkg.name) ?? new Set();
    for (const [subpath, target] of Object.entries(pkg.exports)) {
      if (skipSubpaths.has(subpath)) continue;
      const jsEntry = typeof target === 'string' ? target : (target.import || target.default);
      if (!jsEntry || subpath.includes('*') || jsEntry.includes('*')) continue;
      const sourceEntry = jsEntry.replace('/dist/', '/src/').replace(/\.js$/, '.ts');
      const sourcePath = join(dirname(jsrPath), sourceEntry.replace(/^\.\//, ''));
      if (!existsSync(sourcePath)) {
        throw new Error(`${pkg.name} ${subpath} maps to missing JSR source file: ${sourceEntry}`);
      }
      regenerated[subpath] = sourceEntry;
    }
    jsr.exports = regenerated;
  }

}

/** Update internal version constraints without rewriting external imports. */
function syncJsrImports(jsr, versions) {
  if (jsr.imports && typeof jsr.imports === 'object') {
    for (const [name, spec] of Object.entries(jsr.imports)) {
      if (!versions.has(name)) continue;
      const want = `jsr:${name}@^${versions.get(name)}`;
      if (spec !== want) jsr.imports[name] = want;
    }
  }

}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncJsrVersions();
}
