/** CONFIG_DIR constant used by shared CLI type helpers. */
export const CONFIG_DIR = ".napplet";
/** CONFIG_FILE constant used by shared CLI type helpers. */
export const CONFIG_FILE = "config.json";

/** NAPPLET_KIND_SNAPSHOT constant used by shared CLI type helpers. */
export const NAPPLET_KIND_SNAPSHOT = 5129;
/** NAPPLET_KIND_ROOT constant used by shared CLI type helpers. */
export const NAPPLET_KIND_ROOT = 15129;
/** NAPPLET_KIND_NAMED constant used by shared CLI type helpers. */
export const NAPPLET_KIND_NAMED = 35129;

/** DeployTargetKind union used by shared CLI type helpers. */
export type DeployTargetKind = "root" | "named" | "snapshot";

/** NappletConfig shape used by shared CLI type helpers. */
export interface NappletConfig {
  "$schema"?: string;
  version: 1;
  sourceDir: string;
  relays: string[];
  blossomServers: string[];
  defaultTarget: DeployTargetKind;
  named?: string[];
  discover?: {
    enabled: boolean;
    roots: string[];
  };
  signing?: {
    mode: "interactive" | "ci";
    keyReference?: string;
  };
  conformance?: {
    command: string;
  };
  paja?: {
    command: string;
  };
}

/** NappletCandidate shape used by shared CLI type helpers. */
export interface NappletCandidate {
  name: string;
  dir: string;
  indexHtml: string;
  manifestPath?: string;
}

/** DeploySelection shape used by shared CLI type helpers. */
export interface DeploySelection {
  root: boolean;
  names: string[];
  snapshot: boolean;
}

/** DeployPlanItem shape used by shared CLI type helpers. */
export interface DeployPlanItem {
  candidate: NappletCandidate;
  target: DeployTargetKind;
  kind: number;
  dTag?: string;
  snapshotSource?: SnapshotDeploySource;
}

/** DeployPlan shape used by shared CLI type helpers. */
export interface DeployPlan {
  configPath: string;
  items: DeployPlanItem[];
}

/** SnapshotDeploySource shape used by shared CLI type helpers. */
export interface SnapshotDeploySource {
  target: Exclude<DeployTargetKind, "snapshot">;
  kind: typeof NAPPLET_KIND_ROOT | typeof NAPPLET_KIND_NAMED;
  dTag?: string;
}

/** NostrEventTemplate shape used by shared CLI type helpers. */
export interface NostrEventTemplate {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

/** SignedNostrEvent shape used by shared CLI type helpers. */
export interface SignedNostrEvent extends NostrEventTemplate {
  id: string;
  pubkey: string;
  sig: string;
}

/** ManifestFileMapping shape used by shared CLI type helpers. */
export interface ManifestFileMapping {
  path: string;
  sha256: string;
}

/** DeployManifestTemplate shape used by shared CLI type helpers. */
export interface DeployManifestTemplate {
  item: DeployPlanItem;
  files: ManifestFileMapping[];
  aggregateHash: string;
  template?: NostrEventTemplate;
  signedEvent?: SignedNostrEvent;
  skippedReason?: string;
}

/** SigningMethod union used by shared CLI type helpers. */
export type SigningMethod =
  | { type: "none" }
  | { type: "private-key"; source: "sec-flag"; format: "nsec" | "hex" }
  | { type: "bunker"; source: "sec-flag"; format: "nbunksec" | "bunker-url" }
  | { type: "prompt"; source: "prompt-sec" }
  | { type: "stored"; source: "config"; keyReference: string }
  | { type: "ci-revocable"; source: "environment"; keyReference: string };
