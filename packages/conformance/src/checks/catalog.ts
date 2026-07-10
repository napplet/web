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

import { validateManifestEvent, type ManifestError } from '../validators/manifest.js';
import type { Check } from './types.js';
import { result } from './types.js';

/** Codes that fail a given manifest check. */
function manifestErrors(ctx: Parameters<Check['run']>[0], codes: ManifestError['code'][]): ManifestError[] {
  return validateManifestEvent(ctx.manifestEvent).errors.filter((e) => codes.includes(e.code));
}

/** Build a NIP-5D manifest-event check. */
function manifestCheck(id: string, title: string, codes: ManifestError['code'][]): Check {
  return {
    id,
    area: 'manifest',
    severity: 'error',
    title,
    run: (ctx) => {
      if (!ctx.manifestEvent) return result.skip('No NIP-5D manifest event was resolved');
      const errs = manifestErrors(ctx, codes);
      return errs.length ? result.fail(errs[0].message, errs) : result.pass();
    },
  };
}

/** The v1 catalog, in display order. */
export const CHECKS: Check[] = [
  // ── manifest ───────────────────────────────────────────────────────────────
  manifestCheck('manifest/event-kind', 'Resolved event is a NIP-5D napplet manifest', [
    'invalid-napplet-kind',
    'missing-d-tag',
    'unexpected-d-tag',
  ]),
  manifestCheck('manifest/index-html', 'Manifest declares a hashed /index.html', [
    'missing-index-html',
    'invalid-index-html-hash',
  ]),
  manifestCheck('manifest/requires', 'requires tags are bare known NAP domains', [
    'invalid-required-nap',
    'unknown-required-nap',
  ]),

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
