/**
 * @napplet/conformance -- The v1 zero-config conformance check catalog.
 *
 * These checks require no setup from the napplet author. They prove the napplet
 * declares a valid manifest, boots under the real sandbox, installs its global,
 * keeps its wire traffic well-formed, degrades gracefully when no domains are
 * injected, and tears down cleanly. A napplet that never touches a NAP simply
 * *skips* that NAP's wire checks — which is a valid pass.
 *
 * @packageDocumentation
 */

import { validateManifest, type ManifestError } from '../validators/manifest.js';
import type { Check } from './types.js';
import { result } from './types.js';

/** Codes that fail a given manifest check. */
function manifestErrors(html: string, codes: ManifestError['code'][]): ManifestError[] {
  return validateManifest(html).errors.filter((e) => codes.includes(e.code));
}

/** Does the html declare a given meta name at all? (controls skip vs run). */
function hasMeta(html: string, name: string): boolean {
  return new RegExp(`name\\s*=\\s*["']${name}["']`, 'i').test(html);
}

/**
 * Build a manifest check that fails when {@link validateManifest} reports any of
 * `codes`. When `skipMeta` is given, the check skips (rather than passing) if that
 * meta tag is absent — so optional features only fail when present-and-invalid.
 */
function manifestCheck(id: string, title: string, codes: ManifestError['code'][], skipMeta?: string): Check {
  return {
    id,
    area: 'manifest',
    severity: 'error',
    title,
    run: (ctx) => {
      if (skipMeta && !hasMeta(ctx.manifestHtml, skipMeta)) return result.skip(`No ${skipMeta} declared`);
      const errs = manifestErrors(ctx.manifestHtml, codes);
      return errs.length ? result.fail(errs[0].message, errs) : result.pass();
    },
  };
}

/** The v1 catalog, in display order. */
export const CHECKS: Check[] = [
  // ── manifest ───────────────────────────────────────────────────────────────
  manifestCheck('manifest/napplet-type', 'Declares a valid napplet-type', ['missing-napplet-type', 'invalid-napplet-type']),
  manifestCheck('manifest/declared-naps', 'napplet-requires lists only real NAP domains', ['unknown-required-nap'], 'napplet-requires'),
  manifestCheck('manifest/config-schema', 'Config schema is a draft-07 core subset', ['invalid-config-schema'], 'napplet-config-schema'),

  // ── boot ─────────────────────────────────────────────────────────────────────
  {
    id: 'boot/sandbox-allow-scripts',
    area: 'boot',
    severity: 'error',
    title: 'Runs under allow-scripts without allow-same-origin',
    run: (ctx) => {
      if (!ctx.sandbox.allowScripts) return result.fail('Napplet was not loaded with allow-scripts');
      if (ctx.sandbox.allowSameOrigin) return result.fail('Napplet relied on allow-same-origin, which a shell must not grant');
      return result.pass();
    },
  },
  {
    id: 'boot/installs-global',
    area: 'boot',
    severity: 'error',
    title: 'Runs after runtime-injected window.napplet is installed',
    run: (ctx) => (ctx.installedGlobal ? result.pass() : result.fail('runtime did not inject window.napplet before load')),
  },
  {
    id: 'boot/no-boot-error',
    area: 'boot',
    severity: 'error',
    title: 'Boots without an uncaught error',
    run: (ctx) => (ctx.bootError ? result.fail(ctx.bootError) : result.pass()),
  },
  {
    id: 'boot/no-forbidden-globals',
    area: 'boot',
    severity: 'error',
    title: 'Does not access forbidden browser authority surfaces',
    run: (ctx) =>
      ctx.forbiddenGlobals.length
        ? result.fail(`Accessed forbidden surface(s): ${ctx.forbiddenGlobals.join(', ')}`, ctx.forbiddenGlobals)
        : result.pass(),
  },

  // ── wire ─────────────────────────────────────────────────────────────────────
  {
    id: 'wire/envelope-well-formed',
    area: 'wire',
    severity: 'error',
    title: 'Every emitted envelope is well-formed',
    run: (ctx) => {
      if (ctx.emitted.length === 0) return result.skip('Napplet emitted no envelopes');
      const bad = ctx.emitted.filter((r) => !r.verdict.ok);
      if (bad.length === 0) return result.pass(`${ctx.emitted.length} envelope(s) valid`);
      const diag = bad.map((r) => ({ envelope: r.envelope, errors: r.verdict.errors }));
      return result.fail(`${bad.length}/${ctx.emitted.length} emitted envelope(s) invalid`, diag);
    },
  },
  {
    id: 'wire/declared-naps-only',
    area: 'wire',
    severity: 'warning',
    title: 'Only emits NAP domains it declared in napplet-requires',
    run: (ctx) => {
      if (ctx.emitted.length === 0) return result.skip('Napplet emitted no envelopes');
      if (!hasMeta(ctx.manifestHtml, 'napplet-requires')) return result.skip('No napplet-requires to compare against');
      const declared = new Set(validateManifest(ctx.manifestHtml).requires.map((r) => (r.startsWith('nap:') ? r.slice(4) : r)));
      const used = new Set(
        ctx.emitted
          .map((r) => r.verdict.domain)
          .filter((d): d is string => typeof d === 'string'),
      );
      const undeclared = [...used].filter((d) => !declared.has(d));
      return undeclared.length
        ? result.fail(`Emitted undeclared NAP domain(s): ${undeclared.join(', ')}`, undeclared)
        : result.pass();
    },
  },

  // ── degradation ───────────────────────────────────────────────────────────────
  {
    id: 'degrade/domain-absence',
    area: 'degradation',
    severity: 'error',
    title: 'Does not crash when no NAP domains are injected',
    run: (ctx) => {
      if (!ctx.degraded) return result.skip('Host did not run the degraded (no-capabilities) pass');
      return ctx.degraded.bootError
        ? result.fail(`Crashed with no injected domains: ${ctx.degraded.bootError}`)
        : result.pass();
    },
  },

  // ── lifecycle ─────────────────────────────────────────────────────────────────
  {
    id: 'lifecycle/clean-teardown',
    area: 'lifecycle',
    severity: 'warning',
    title: 'Tears down listeners on unload',
    run: (ctx) => {
      if (!ctx.lifecycle) return result.skip('Lifecycle not measured');
      return ctx.lifecycle.listenerLeak ? result.fail('Message listeners remained after unload') : result.pass();
    },
  },
];
