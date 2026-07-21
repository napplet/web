#!/usr/bin/env node
// github-releases.mjs — publish a GitHub Release per workspace package once its
// version is live on a registry. Run from the npm Publish workflow AFTER the
// changesets publish step, so a release is only ever cut for a version that has
// actually been deployed.
//
// Why a standalone script instead of changesets/action's built-in release
// creation: this repo publishes with `pnpm publish -r` (see the root
// `publish-packages` script), not `changeset publish`, so the action never sees
// the `New tag:` lines it parses to populate `publishedPackages` — its
// `published` output stays false and it creates nothing. This script derives the
// published set independently by asking npm, so it works regardless of the
// publish command.
//
// Behaviour, per non-private package under packages/*:
//   1. Skip if a `<name>@<version>` GitHub Release already exists (idempotent —
//      this is also what lets the script backfill versions published before it
//      existed: every prior version with no release gets one on the next run).
//   2. Skip if `<name>@<version>` is NOT yet on npm — npm is the "deployed"
//      gate. A version staged locally but not on the registry gets no release.
//   3. Otherwise create the release, titled `<name>@<version>`, with the body
//      taken verbatim from that package's CHANGELOG.md `## <version>` section
//      (falls back to a one-line note when the package has no changelog).
//
// JSR note: the JSR publish runs in its own workflow, independently and
// idempotently (see .github/workflows/publish-jsr.yml). A GitHub Release
// represents the released *version*, which is the same on both registries, so
// gating on npm presence is the canonical "this version shipped" signal; we do
// not couple release creation to the deliberately-independent JSR job.
//
// Auth: `gh` reads GH_TOKEN / GITHUB_TOKEN from the environment. The Publish
// workflow's default GITHUB_TOKEN has `contents: write`, which is all
// `gh release create` needs. Releases created with GITHUB_TOKEN intentionally do
// not re-trigger workflows, so this cannot loop back into Publish.
//
// Env:
//   DRY_RUN=1  — log what would be created without calling `gh release create`
//                (npm + gh reads still run, so it is safe to run locally).

import { readdirSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Run a command, returning trimmed stdout. `ok:false` on any non-zero exit. */
function run(cmd, args) {
  try {
    const stdout = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout: stdout.trim() };
  } catch (err) {
    return { ok: false, stdout: (err.stdout || '').toString().trim(), stderr: (err.stderr || '').toString().trim() };
  }
}

/** True if `<name>@<version>` is published on npm — the "deployed" gate. */
function isOnNpm(name, version) {
  // `npm view pkg@version version` prints the version when it exists and exits
  // non-zero (E404) when it does not. Empty stdout means the spec matched no
  // published version (e.g. only other versions exist).
  const res = run('npm', ['view', `${name}@${version}`, 'version', '--no-workspaces']);
  return res.ok && res.stdout.length > 0;
}

/** True if a GitHub Release with this exact tag already exists. */
function releaseExists(tag) {
  return run('gh', ['release', 'view', tag]).ok;
}

/**
 * Extract the `## <version>` section body from a Changesets CHANGELOG.md.
 * Returns null when the file or the section is absent.
 */
function changelogSection(changelogPath, version) {
  if (!existsSync(changelogPath)) return null;
  const lines = readFileSync(changelogPath, 'utf8').split('\n');
  // Section headings are level-2 (`## <version>`); the package title is level-1.
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n').trim();
}

// ── Discover publishable packages ───────────────────────────────────────────

const packages = [];
for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pkgPath = join(PACKAGES_DIR, entry.name, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!pkg.name || !pkg.version || pkg.private) continue;
  packages.push({
    name: pkg.name,
    version: pkg.version,
    changelogPath: join(PACKAGES_DIR, entry.name, 'CHANGELOG.md'),
  });
}

packages.sort((a, b) => a.name.localeCompare(b.name));

console.log(`[github-releases] ${packages.length} publishable package(s)${DRY_RUN ? ' (DRY_RUN)' : ''}`);

// ── Create releases ─────────────────────────────────────────────────────────

let created = 0;
let skippedExisting = 0;
let skippedUnpublished = 0;

for (const { name, version, changelogPath } of packages) {
  const tag = `${name}@${version}`;

  if (releaseExists(tag)) {
    console.log(`  • ${tag} — release already exists, skipping`);
    skippedExisting++;
    continue;
  }

  if (!isOnNpm(name, version)) {
    console.log(`  • ${tag} — not on npm yet, skipping (not deployed)`);
    skippedUnpublished++;
    continue;
  }

  const body = changelogSection(changelogPath, version) || `Release ${tag}.`;

  if (DRY_RUN) {
    console.log(`  ✎ ${tag} — would create release with ${body.split('\n').length}-line body`);
    created++;
    continue;
  }

  // --notes-file avoids shell-escaping the multi-line markdown body. gh creates
  // the git tag at the checked-out commit when it does not already exist.
  const notesFile = join(tmpdir(), `napplet-release-${name.replace(/[^a-z0-9]+/gi, '-')}-${version}.md`);
  writeFileSync(notesFile, body);
  try {
    const res = run('gh', ['release', 'create', tag, '--title', tag, '--notes-file', notesFile]);
    if (res.ok) {
      console.log(`  ✓ ${tag} — release created`);
      created++;
    } else {
      console.error(`  ✗ ${tag} — gh release create failed: ${res.stderr || res.stdout}`);
      process.exitCode = 1;
    }
  } finally {
    rmSync(notesFile, { force: true });
  }
}

console.log(
  `[github-releases] done — ${created} created, ${skippedExisting} already existed, ${skippedUnpublished} not yet on npm`,
);
