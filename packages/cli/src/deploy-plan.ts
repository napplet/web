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
      items.push(item(candidate, "root"));
    }
    for (const name of resolvedSelection.names) {
      items.push(item(candidate, "named", name));
    }
    if (resolvedSelection.snapshot) {
      items.push(item(candidate, "snapshot"));
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
): DeployPlanItem {
  return {
    candidate,
    target,
    kind: kindForTarget(target),
    dTag,
  };
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
