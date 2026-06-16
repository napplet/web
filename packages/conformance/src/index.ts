/**
 * @napplet/conformance -- Framework-agnostic napplet protocol conformance engine.
 *
 * Lets a napplet self-verify protocol conformance before publishing, in two scopes
 * that share this engine: a headless Playwright CLI (CI) and a standalone
 * single-window web runtime. v1 is zero-config protocol conformance — manifest/meta
 * validity, boots under `sandbox="allow-scripts"`, installs `window.napplet`, every
 * emitted postMessage envelope validates against the per-NAP validators here, and
 * graceful degradation when `shell.supports()` is false.
 *
 * @packageDocumentation
 */

export {
  ENVELOPE_SPECS,
  validateEnvelope,
  knownEnvelopeTypes,
} from './validators/envelope.js';
export type {
  EnvelopeDirection,
  FieldKind,
  EnvelopeSpec,
  EnvelopeError,
  EnvelopeVerdict,
} from './validators/envelope.js';

export {
  validateManifest,
  findInlineScripts,
} from './validators/manifest.js';
export type {
  ManifestError,
  ManifestVerdict,
  ValidateManifestOptions,
} from './validators/manifest.js';
