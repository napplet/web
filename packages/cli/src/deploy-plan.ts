import {
  type DeployPlan,
  type DeployPlanItem,
  type DeploySelection,
  type DeployTargetKind,
  NAPPLET_KIND_NAMED,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_SNAPSHOT,
  type NappletCandidate,
  type NappletConfig,
  type SnapshotDeploySource,
} from "./types.ts";
import { configPath } from "./config.ts";

export function createDeployPlan(
  config: NappletConfig,
  candidates: NappletCandidate[],
  selection: Partial<DeploySelection> = {},
  options: { cwd?: string; configPath?: string } = {},
): DeployPlan {
  const resolvedSelection = normalizeSelection(config, selection);
  const items: DeployPlanItem[] = [];

  for (const candidate of candidates) {
    if (resolvedSelection.root) {
      pushDeployItem(items, candidate, item(candidate, "root"), resolvedSelection.snapshot);
    }
    for (const name of resolvedSelection.names) {
      pushDeployItem(items, candidate, item(candidate, "named", name), resolvedSelection.snapshot);
    }
  }

  return {
    configPath: options.configPath ?? configPath(options.cwd),
    items,
  };
}

export function normalizeSelection(
  config: NappletConfig,
  selection: Partial<DeploySelection>,
): DeploySelection {
  const names = unique(selection.names ?? config.named ?? []);
  const explicitNames = selection.names !== undefined;
  const explicitTarget = selection.root !== undefined || explicitNames ||
    selection.snapshot !== undefined;
  const root = selection.root ?? (!explicitTarget && config.defaultTarget === "root");
  const snapshot = selection.snapshot ?? (!explicitTarget && config.defaultTarget === "snapshot");
  const named = explicitTarget
    ? (explicitNames ? unique(selection.names ?? []) : names)
    : (config.defaultTarget === "named" && names.length === 0 ? ["default"] : names);
  return {
    root,
    names: named,
    snapshot,
  };
}

export function kindForTarget(target: DeployTargetKind): number {
  switch (target) {
    case "root":
      return NAPPLET_KIND_ROOT;
    case "named":
      return NAPPLET_KIND_NAMED;
    case "snapshot":
      return NAPPLET_KIND_SNAPSHOT;
  }
}

function item(
  candidate: NappletCandidate,
  target: DeployTargetKind,
  dTag?: string,
  snapshotSource?: SnapshotDeploySource,
): DeployPlanItem {
  return {
    candidate,
    target,
    kind: kindForTarget(target),
    dTag,
    snapshotSource,
  };
}

function pushDeployItem(
  items: DeployPlanItem[],
  candidate: NappletCandidate,
  base: DeployPlanItem,
  includeSnapshot: boolean,
): void {
  items.push(base);
  if (!includeSnapshot || base.target === "snapshot") return;
  items.push(item(candidate, "snapshot", undefined, {
    target: base.target,
    kind: base.target === "root" ? NAPPLET_KIND_ROOT : NAPPLET_KIND_NAMED,
    dTag: base.dTag,
  }));
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (value === "" || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
