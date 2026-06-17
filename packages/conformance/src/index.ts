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
} from './validators/manifest.js';
export type {
  ManifestError,
  ManifestVerdict,
  ValidateManifestOptions,
} from './validators/manifest.js';

// ── reference shell ──────────────────────────────────────────────────────────
export {
  createReferenceShell,
  attachReferenceShell,
  REFERENCE_PUBKEY,
} from './shell/reference-shell.js';
export type {
  ReferenceShell,
  ReferenceShellOptions,
  ShellCapabilities,
  RecordedEnvelope,
  MessageWindowLike,
  PostTargetLike,
  AttachOptions,
} from './shell/reference-shell.js';

// ── context ──────────────────────────────────────────────────────────────────
export { makeContext, buildContext } from './run/context.js';
export type {
  ConformanceContext,
  SandboxState,
  BootObservation,
  BootCollectionLike,
  BuildContextInput,
} from './run/context.js';

// ── boot harness (browser-safe) ──────────────────────────────────────────────
export { bootAndCollect } from './run/boot.js';
export type { BootCollection, BootOptions } from './run/boot.js';

// ── checks ───────────────────────────────────────────────────────────────────
export { CHECKS } from './checks/catalog.js';
export { result as checkResult } from './checks/types.js';
export type {
  Check,
  CheckArea,
  CheckSeverity,
  CheckStatus,
  CheckResult,
} from './checks/types.js';

// ── runner ───────────────────────────────────────────────────────────────────
export { runConformance } from './run/runner.js';
export type {
  ConformanceRun,
  CheckOutcome,
  RunSummary,
  RunOptions,
} from './run/runner.js';

// ── reporters ────────────────────────────────────────────────────────────────
export {
  toJson,
  toPretty,
  toJUnit,
  report,
} from './report/reporters.js';
export type { ReporterFormat } from './report/reporters.js';
