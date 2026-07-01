export const CONFIG_DIR = ".napplet";
export const CONFIG_FILE = "config.json";

export const NAPPLET_KIND_SNAPSHOT = 5129;
export const NAPPLET_KIND_ROOT = 15129;
export const NAPPLET_KIND_NAMED = 35129;

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

export type SigningMethod =
  | { type: "none" }
  | { type: "private-key"; source: "sec-flag"; format: "nsec" | "hex" }
  | { type: "bunker"; source: "sec-flag"; format: "nbunksec" | "bunker-url" }
  | { type: "prompt"; source: "prompt-sec" }
  | { type: "stored"; source: "config"; keyReference: string }
  | { type: "ci-revocable"; source: "environment"; keyReference: string };
