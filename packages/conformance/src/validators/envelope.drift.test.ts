/**
 * Drift guard: every `domain.action` discriminant declared in @napplet/nap source
 * must have a matching entry in ENVELOPE_SPECS. If a NAP gains (or renames) a
 * message type without updating the conformance validator, this test fails —
 * which is the point. Runs under the node environment (default) so it can read
 * source files from disk.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAP_DOMAINS } from '@napplet/core';
import { ENVELOPE_SPECS } from './envelope.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const NAP_SRC = join(HERE, '..', '..', '..', 'nap', 'src');

/** Recursively collect every non-test `.ts` file under a directory. */
function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...tsFiles(full));
    } else if (entry.name.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extract `type: 'domain.action'` discriminants that are real property
 * declarations (line starts with `type:`, excluding JSDoc `* type:` examples),
 * filtered to known NAP domains.
 */
function declaredDiscriminants(): Set<string> {
  const domains = new Set<string>(NAP_DOMAINS as readonly string[]);
  const found = new Set<string>();
  const lineRe = /^\s*type:\s*['"]([a-zA-Z]+\.[a-zA-Z.]+)['"]/;
  for (const file of tsFiles(NAP_SRC)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = lineRe.exec(line);
      if (!m) continue;
      const type = m[1];
      const domain = type.slice(0, type.indexOf('.'));
      if (domains.has(domain)) found.add(type);
    }
  }
  return found;
}

// NAP-SHELL's discriminants are validator-owned (foundational). The shell NAP
// source re-exports the wire types from @napplet/core rather than declaring
// `type: 'shell.ready'` string literals, so the source scan cannot find them —
// exempt the foundational `shell` domain from both the missing- and stale-checks
// and assert its discriminants directly instead.
const FOUNDATIONAL_DOMAINS = new Set(['shell']);

function isFoundational(type: string): boolean {
  return FOUNDATIONAL_DOMAINS.has(type.slice(0, type.indexOf('.')));
}

describe('envelope validator drift guard', () => {
  it('every NAP domain in NAP_DOMAINS has at least one validator entry', () => {
    const domainsWithSpecs = new Set(Object.keys(ENVELOPE_SPECS).map((t) => t.slice(0, t.indexOf('.'))));
    for (const domain of NAP_DOMAINS) {
      expect(domainsWithSpecs.has(domain), `NAP domain "${domain}" has no ENVELOPE_SPECS entry`).toBe(true);
    }
  });

  it('declares the foundational NAP-SHELL discriminants (validator-owned)', () => {
    expect(ENVELOPE_SPECS['shell.ready']?.dir).toBe('out');
    expect(ENVELOPE_SPECS['shell.init']?.dir).toBe('in');
  });

  it('every discriminant declared in @napplet/nap source is covered by ENVELOPE_SPECS', () => {
    const declared = declaredDiscriminants();
    expect(declared.size).toBeGreaterThan(100); // sanity: we actually scanned source
    const missing = [...declared].filter((t) => !(t in ENVELOPE_SPECS)).sort();
    expect(missing, `Add ENVELOPE_SPECS entries for: ${missing.join(', ')}`).toEqual([]);
  });

  it('does not declare specs for discriminants that no longer exist in source', () => {
    const declared = declaredDiscriminants();
    // The foundational `shell` domain is validator-owned and has no scannable
    // source literal; exclude it from the stale-check.
    const stale = Object.keys(ENVELOPE_SPECS)
      .filter((t) => !isFoundational(t))
      .filter((t) => !declared.has(t))
      .sort();
    expect(stale, `Remove stale ENVELOPE_SPECS entries: ${stale.join(', ')}`).toEqual([]);
  });
});
