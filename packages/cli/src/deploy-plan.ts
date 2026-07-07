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
import { NAMED_SITE_D_TAG_PATTERN } from "./manifest.ts";

/** create deploy plan helper for deployment planning. */
export function createDeployPlan(
  config: NappletConfig,
  candidates: NappletCandidate[],
  selection: Partial<DeploySelection> = {},
  options: { cwd?: string; configPath?: string; traverse?: boolean } = {},
): DeployPlan {
  const items: DeployPlanItem[] = [];
  if (options.traverse) {
    planMonorepoDeploys(config, candidates, selection, items);
  } else {
    planSingleDeploys(config, candidates, selection, items);
  }
  return {
    configPath: options.configPath ?? configPath(options.cwd),
    items,
  };
}

function planSingleDeploys(
  config: NappletConfig,
  candidates: NappletCandidate[],
  selection: Partial<DeploySelection>,
  items: DeployPlanItem[],
): void {
  const resolvedSelection = normalizeSelection(config, selection);
  for (const candidate of candidates) {
    if (resolvedSelection.root) {
      pushDeployItem(items, candidate, item(candidate, "root"), resolvedSelection.snapshot);
    }
    for (const name of resolvedSelection.names) {
      pushDeployItem(items, candidate, item(candidate, "named", name), resolvedSelection.snapshot);
    }
  }
}

// In a monorepo each discovered napplet deploys under its own folder name as the d tag,
// rather than the cross product of every candidate against a shared name list. A
// configured/`--name` list acts as a filter selecting which folders to deploy.
function planMonorepoDeploys(
  config: NappletConfig,
  candidates: NappletCandidate[],
  selection: Partial<DeploySelection>,
  items: DeployPlanItem[],
): void {
  const resolved = resolveMonorepoSelection(config, selection);
  for (const candidate of candidates) {
    if (resolved.root) {
      pushDeployItem(items, candidate, item(candidate, "root"), resolved.snapshot);
    }
    if (!resolved.named) continue;
    const dTag = candidate.name;
    if (resolved.nameFilter.length > 0 && !resolved.nameFilter.includes(dTag)) continue;
    assertFolderDTag(candidate);
    pushDeployItem(items, candidate, item(candidate, "named", dTag), resolved.snapshot);
  }
}

interface MonorepoSelection {
  root: boolean;
  snapshot: boolean;
  named: boolean;
  nameFilter: string[];
}

function resolveMonorepoSelection(
  config: NappletConfig,
  selection: Partial<DeploySelection>,
): MonorepoSelection {
  const nameFilter = unique(selection.names ?? config.named ?? []);
  const explicitNames = selection.names !== undefined;
  const explicitTarget = selection.root !== undefined || explicitNames ||
    selection.snapshot !== undefined;
  const root = selection.root ?? (!explicitTarget && config.defaultTarget === "root");
  const snapshot = selection.snapshot ?? (!explicitTarget && config.defaultTarget === "snapshot");
  const named = explicitNames ||
    (!explicitTarget && config.defaultTarget === "named") ||
    nameFilter.length > 0;
  return { root, snapshot, named, nameFilter };
}

function assertFolderDTag(candidate: NappletCandidate): void {
  const name = candidate.name;
  if (!NAMED_SITE_D_TAG_PATTERN.test(name) || name.endsWith("-")) {
    throw new Error(
      `Napplet folder "${name}" (${candidate.dir}) is not a valid d tag; folder names ` +
        `used as d tags must match ^[a-z0-9-]{1,13}$ and not end with '-'`,
    );
  }
}

/** normalize selection helper for deployment planning. */
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

/** kind for target helper for deployment planning. */
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
