/** Release-time implementation metadata. Non-normative; the linked living NAPs govern contracts. */
import type { NapDomain } from './envelope.js';

/** Our implementation assessment, never a promise of API permanence. */
export type NapMaturity = 'supported' | 'experimental' | 'exploratory';

/** Upstream proposal state observed at release time, independent of implementation maturity. */
export type NapProposalStatus = 'merged' | 'in-review' | 'draft' | 'unknown';

/** Evidence about the implementation shipped in this package, not a remote shell. */
export interface NapImplementationMetadata {
  readonly proposal: {
    /** Living proposal or specification URL. */
    readonly url: string;
    readonly status: NapProposalStatus;
    /** Date the upstream state was checked; not a compatibility verification date. */
    readonly checkedAt: string;
  };
  /** Null means unclassified and is never enabled by selection policy. */
  readonly maturity: NapMaturity | null;
  readonly rationale: string;
  /** Repository-relative implementation evidence, not normative specification copies. */
  readonly evidence: readonly string[];
  /** Historical verification provenance only. Omitted when no verified revision is recorded. */
  readonly implementationReference?: {
    readonly revision: string;
    readonly evidence: string;
  };
}

/**
 * Metadata for every shipped NAP domain. All maturity levels remain subject to change.
 * @example
 * ```ts
 * console.log(NAP_IMPLEMENTATIONS.llm.maturity); // 'exploratory'
 * ```
 */
export const NAP_IMPLEMENTATIONS: Readonly<Record<NapDomain, NapImplementationMetadata>> = {
  shell: {
    proposal: { url: "https://github.com/napplet/naps/pull/101", status: "merged", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Optional readiness and environment binding has focused shim and reference-runtime coverage.",
    evidence: ["packages/nap/src/shell/shim.test.ts"],
  },
  relay: {
    proposal: { url: "https://github.com/napplet/naps/pull/2", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Relay reads, publishing, and subscription lifecycle have maintained shim and integration tests; upstream naming remains under review.",
    evidence: ["packages/nap/src/relay/shim.test.ts"],
  },
  identity: {
    proposal: { url: "https://github.com/napplet/naps/pull/102", status: "merged", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Read-only identity queries and updates have focused binding and reference-runtime coverage.",
    evidence: ["packages/nap/src/identity/shim.test.ts"],
  },
  storage: {
    proposal: { url: "https://github.com/napplet/naps/pull/3", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Key-value binding has focused request/result tests and tutorial usage; host storage isolation remains the host responsibility.",
    evidence: ["packages/nap/src/storage/shim.test.ts"],
  },
  inc: {
    proposal: { url: "https://github.com/napplet/naps/pull/104", status: "merged", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Topic and channel bindings have compatibility tests and authenticated-endpoint reference-runtime coverage.",
    evidence: ["packages/nap/src/inc/shim.ts", "packages/conformance-cli/src/browser.test.ts"],
  },
  theme: {
    proposal: { url: "https://github.com/napplet/naps/pull/103", status: "merged", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Theme queries and pushed updates have focused binding and opaque-iframe integration coverage.",
    evidence: ["packages/nap/src/theme/shim.test.ts", "packages/conformance-cli/src/browser.test.ts"],
  },
  keys: {
    proposal: { url: "https://github.com/napplet/naps/pull/9", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Keyboard binding ships, but dedicated domain regression coverage is limited; retain explicit evaluation opt-in.",
    evidence: ["packages/nap/src/keys/shim.ts"],
  },
  media: {
    proposal: { url: "https://github.com/napplet/naps/pull/10", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Session creation and playback binding have focused regression coverage; proposed torrent playback amendments are not implied.",
    evidence: ["packages/nap/src/media/shim.test.ts"],
  },
  notify: {
    proposal: { url: "https://github.com/napplet/naps/pull/11", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Notification binding ships with limited dedicated domain regression evidence; broader host integration confidence is unverified.",
    evidence: ["packages/nap/src/notify/shim.ts"],
  },
  config: {
    proposal: { url: "https://github.com/napplet/naps/pull/14", status: "draft", checkedAt: "2026-10-31" },
    maturity: "exploratory",
    rationale: "Configuration binding is tested, but the upstream draft is marked MAY DEFER; use for design exploration.",
    evidence: ["packages/nap/src/config/shim.test.ts"],
  },
  resource: {
    proposal: { url: "https://github.com/napplet/naps/pull/80", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Resource fetching has focused shim and type tests; the reverted merge and reopened proposal do not change that implementation assessment.",
    evidence: ["packages/nap/src/resource/shim.test.ts"],
  },
  cvm: {
    proposal: { url: "https://github.com/napplet/naps/pull/31", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Session and registry bindings are tested; upstream explicitly marks the contract NEEDS WORK.",
    evidence: ["packages/nap/src/cvm/shim.test.ts"],
  },
  outbox: {
    proposal: { url: "https://github.com/napplet/naps/pull/32", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Routing and subscription bindings have focused tests and an integration regression for structured-clone boundaries.",
    evidence: ["packages/nap/src/outbox/shim.test.ts", "packages/nap/src/boundary-integration.test.ts"],
  },
  upload: {
    proposal: { url: "https://github.com/napplet/naps/pull/33", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Upload binding has focused tests for request/result behavior; host rail support remains runtime-specific.",
    evidence: ["packages/nap/src/upload/shim.test.ts"],
  },
  intent: {
    proposal: { url: "https://github.com/napplet/naps/pull/91", status: "merged", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Convention normalization and dispatch have focused binding and reference-runtime integration tests.",
    evidence: ["packages/nap/src/intent/shim.test.ts"],
  },
  ble: {
    proposal: { url: "https://github.com/napplet/naps/pull/62", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "GATT binding has unit coverage; real-device behavior across host backends is not established by these tests.",
    evidence: ["packages/nap/src/ble/shim.test.ts"],
  },
  webrtc: {
    proposal: { url: "https://github.com/napplet/naps/pull/59", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Signaling and session binding have unit coverage; interoperable live peer sessions remain unverified here.",
    evidence: ["packages/nap/src/webrtc/shim.test.ts"],
  },
  link: {
    proposal: { url: "https://github.com/napplet/naps/pull/53", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "The small link-opening binding has focused regression coverage; navigation authorization stays with the host.",
    evidence: ["packages/nap/src/link/shim.test.ts"],
  },
  count: {
    proposal: { url: "https://github.com/napplet/naps/pull/69", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Count binding is tested, but accuracy and aggregation across real relay backends remain outside that evidence.",
    evidence: ["packages/nap/src/count/shim.test.ts"],
  },
  lists: {
    proposal: { url: "https://github.com/napplet/naps/pull/68", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "List mutation binding is tested; concurrent real-host mutation behavior is not established by binding tests.",
    evidence: ["packages/nap/src/lists/shim.test.ts"],
  },
  serial: {
    proposal: { url: "https://github.com/napplet/naps/pull/61", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Serial binding has unit coverage; device and native-host integration evidence is limited.",
    evidence: ["packages/nap/src/serial/shim.test.ts"],
  },
  fs: {
    proposal: { url: "https://github.com/napplet/naps/pull/88", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Filesystem binding has MVP coverage; portability and authorization across storage backends remain under evaluation.",
    evidence: ["packages/nap/src/fs/shim.test.ts"],
  },
  common: {
    proposal: { url: "https://github.com/napplet/naps/pull/67", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Social action binding is tested; broader host integration and evolving action semantics warrant explicit opt-in.",
    evidence: ["packages/nap/src/common/shim.test.ts"],
  },
  dm: {
    proposal: { url: "https://github.com/napplet/naps/pull/74", status: "draft", checkedAt: "2026-10-31" },
    maturity: "experimental",
    rationale: "Direct-message binding has shim and type coverage; transport interoperability is not established by those tests.",
    evidence: ["packages/nap/src/dm/shim.test.ts"],
  },
  gamepad: {
    proposal: { url: "https://github.com/napplet/naps/pull/130", status: "in-review", checkedAt: "2026-10-31" },
    maturity: "supported",
    rationale: "Cross-repository delivery includes binding, security, runtime, and conformance verification; the reopened proposal is still subject to change.",
    evidence: ["packages/nap/src/gamepad/shim.test.ts", ".planning/phases/163-nap-gamepad-across-repositories/163-VERIFICATION.md"],
    implementationReference: { revision: "0b28f77e3dfa0f07dd7c0f9d61a7090ee99f3a5e", evidence: ".planning/phases/163-nap-gamepad-across-repositories/163-SECURITY.md" },
  },
  llm: {
    proposal: { url: "https://github.com/napplet/naps/pull/134", status: "draft", checkedAt: "2026-10-31" },
    maturity: "exploratory",
    rationale: "Early published draft has binding and mock-runtime tests; provider behavior and API design remain exploratory.",
    evidence: ["packages/nap/src/llm/shim.test.ts", "packages/conformance-cli/src/browser.test.ts"],
  },
};

// Protect release metadata against accidental consumer mutation.
for (const entry of Object.values(NAP_IMPLEMENTATIONS)) {
  Object.freeze(entry.proposal);
  Object.freeze(entry.evidence);
  if (entry.implementationReference) Object.freeze(entry.implementationReference);
  Object.freeze(entry);
}
Object.freeze(NAP_IMPLEMENTATIONS);
