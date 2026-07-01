export const CONFIG_DIR = ".napplet";
export const CONFIG_FILE = "config.json";

export const NAPPLET_KIND_SNAPSHOT = 5128;
export const NAPPLET_KIND_ROOT = 15128;
export const NAPPLET_KIND_NAMED = 35128;

export type DeployTargetKind = "root" | "named" | "snapshot";

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

export interface NappletCandidate {
  name: string;
  dir: string;
  indexHtml: string;
  manifestPath?: string;
}

export interface DeploySelection {
  root: boolean;
  names: string[];
  snapshot: boolean;
}

export interface DeployPlanItem {
  candidate: NappletCandidate;
  target: DeployTargetKind;
  kind: number;
  dTag?: string;
}

export interface DeployPlan {
  configPath: string;
  items: DeployPlanItem[];
}

export interface NostrEventTemplate {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

export interface SignedNostrEvent extends NostrEventTemplate {
  id: string;
  pubkey: string;
  sig: string;
}

export interface ManifestFileMapping {
  path: string;
  sha256: string;
}

export interface DeployManifestTemplate {
  item: DeployPlanItem;
  files: ManifestFileMapping[];
  aggregateHash: string;
  template?: NostrEventTemplate;
  signedEvent?: SignedNostrEvent;
  skippedReason?: string;
}

export type SigningMethod =
  | { type: "none" }
  | { type: "private-key"; source: "sec-flag"; format: "nsec" | "hex" }
  | { type: "bunker"; source: "sec-flag"; format: "nbunksec" | "bunker-url" }
  | { type: "prompt"; source: "prompt-sec" }
  | { type: "stored"; source: "config"; keyReference: string }
  | { type: "ci-revocable"; source: "environment"; keyReference: string };
