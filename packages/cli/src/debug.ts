import { createDeployPlan } from "./deploy-plan.ts";
import { discoverNapplets } from "./discover.ts";
import { createDeployManifestTemplates } from "./manifest.ts";
import type { ManifestFormat } from "./manifest-format.ts";
import { detectSecretFormat } from "./signing.ts";
import type { DeploySelection, NappletConfig, SigningMethod } from "./types.ts";

export interface DebugReport {
  cwd: string;
  configPath: string;
  config: {
    sourceDir: string;
    discoverEnabled: boolean;
    discoverRoots: string[];
    relays: string[];
    blossomServers: string[];
    defaultTarget: string;
    named: string[];
  };
  discovery: {
    traverse: boolean;
    count: number;
    candidates: Array<{
      name: string;
      dir: string;
      indexHtml: string;
      hasManifest: boolean;
    }>;
  };
  deploy: {
    selection: Partial<DeploySelection>;
    itemCount: number;
    items: Array<{
      target: string;
      kind: number;
      dTag?: string;
      candidate: string;
      snapshotSource?: {
        target: string;
        kind: number;
        dTag?: string;
      };
    }>;
  };
  manifests: {
    format: ManifestFormat;
    error?: string;
    count: number;
    buildable: number;
    skipped: number;
    items: Array<{
      target: string;
      kind: number;
      dTag?: string;
      fileCount: number;
      aggregateHash?: string;
      artifactHash?: string;
      hasTemplate: boolean;
      skippedReason?: string;
    }>;
  };
  signing: SigningDebugInfo;
  tools: {
    conformanceCommand: string;
    pajaCommand: string;
  };
}

export interface SigningDebugInfo {
  type: SigningMethod["type"];
  source?: string;
  format?: string;
  keyReference?: string;
  canSignWithoutPrompt: boolean;
  requiresSecretLookup: boolean;
  notes: string[];
}

/**
 * Build a read-only diagnostic report of config, discovery, deploy plan, manifests and signing.
 *
 * Manifest template failures are recorded in `manifests.error` instead of aborting the report.
 *
 * @param config Loaded napplet CLI config.
 * @param options Working directory, deploy selection, event format and signing inputs.
 * @returns Report suitable for JSON output by `napplet debug`.
 * @example
 * ```ts
 * const report = await createDebugReport(config, { format: "current" });
 * if (report.manifests.error) console.error(report.manifests.error);
 * ```
 */
export async function createDebugReport(
  config: NappletConfig,
  options: {
    cwd?: string;
    format?: ManifestFormat;
    configPath?: string;
    traverse?: boolean;
    selection?: Partial<DeploySelection>;
    signing?: SigningMethod;
    env?: Record<string, string | undefined>;
  } = {},
): Promise<DebugReport> {
  const cwd = options.cwd ?? Deno.cwd();
  const candidates = await discoverNapplets(config, { cwd, traverse: options.traverse });
  const plan = createDeployPlan(config, candidates, options.selection, {
    cwd,
    configPath: options.configPath,
    traverse: options.traverse,
  });
  const format = options.format ?? "current";
  // NIP-5D §Manifest: current-format content MUST be a non-empty description, and deploy
  // keeps enforcing that. Debug records the failure instead of crashing (PR224-F4).
  let manifests: Awaited<ReturnType<typeof createDeployManifestTemplates>> = [];
  let manifestError: string | undefined;
  try {
    manifests = await createDeployManifestTemplates(plan, config, { format });
  } catch (error) {
    manifestError = error instanceof Error ? error.message : String(error);
  }

  return {
    cwd,
    configPath: plan.configPath,
    config: {
      sourceDir: config.sourceDir,
      discoverEnabled: config.discover?.enabled ?? true,
      discoverRoots: config.discover?.roots ?? ["."],
      relays: config.relays,
      blossomServers: config.blossomServers,
      defaultTarget: config.defaultTarget,
      named: config.named ?? [],
    },
    discovery: {
      traverse: options.traverse ?? false,
      count: candidates.length,
      candidates: candidates.map((candidate) => ({
        name: candidate.name,
        dir: candidate.dir,
        indexHtml: candidate.indexHtml,
        hasManifest: candidate.manifestPath !== undefined,
      })),
    },
    deploy: {
      selection: options.selection ?? {},
      itemCount: plan.items.length,
      items: plan.items.map((item) => ({
        target: item.target,
        kind: item.kind,
        dTag: item.dTag,
        candidate: item.candidate.name,
        snapshotSource: item.snapshotSource
          ? {
            target: item.snapshotSource.target,
            kind: item.snapshotSource.kind,
            dTag: item.snapshotSource.dTag,
          }
          : undefined,
      })),
    },
    manifests: {
      format,
      error: manifestError,
      count: manifests.length,
      buildable: manifests.filter((manifest) => manifest.template).length,
      skipped: manifests.filter((manifest) => manifest.skippedReason).length,
      items: manifests.map((manifest) => ({
        target: manifest.item.target,
        kind: manifest.item.kind,
        dTag: manifest.item.dTag,
        fileCount: manifest.files.length,
        aggregateHash: manifest.aggregateHash,
        artifactHash: manifest.artifactHash,
        hasTemplate: manifest.template !== undefined,
        skippedReason: manifest.skippedReason,
      })),
    },
    signing: createSigningDebugInfo(options.signing ?? { type: "none" }, options.env),
    tools: {
      conformanceCommand: config.conformance?.command ?? "napplet-conformance",
      pajaCommand: config.paja?.command ?? "kehto",
    },
  };
}

export function createSigningDebugInfo(
  signing: SigningMethod,
  env: Record<string, string | undefined> = Deno.env.toObject(),
): SigningDebugInfo {
  if (signing.type === "none") {
    return baseSigningInfo(signing, {
      canSignWithoutPrompt: false,
      requiresSecretLookup: false,
      notes: ["no signing input configured"],
    });
  }
  if (signing.type === "private-key") {
    return baseSigningInfo(signing, {
      canSignWithoutPrompt: true,
      requiresSecretLookup: false,
      notes: ["local private key provided by --sec"],
    });
  }
  if (signing.type === "bunker") {
    return baseSigningInfo(signing, {
      canSignWithoutPrompt: signing.format === "nbunksec",
      requiresSecretLookup: false,
      notes: signing.format === "nbunksec"
        ? ["nbunksec remote signer provided by --sec"]
        : ["bunker:// remote signer provided by --sec"],
    });
  }
  if (signing.type === "prompt") {
    return baseSigningInfo(signing, {
      canSignWithoutPrompt: false,
      requiresSecretLookup: true,
      notes: ["--prompt-sec requires stdin input at deploy time"],
    });
  }
  if (signing.type === "stored") {
    return baseSigningInfo(signing, {
      keyReference: signing.keyReference,
      canSignWithoutPrompt: false,
      requiresSecretLookup: true,
      notes: ["stored key reference requires native key-store lookup"],
    });
  }
  if (signing.type === "bunker-pubkey") {
    return baseSigningInfo(signing, {
      keyReference: signing.pubkey,
      canSignWithoutPrompt: false,
      requiresSecretLookup: true,
      notes: [
        "configured bunker pubkey requires a stored nbunksec session or interactive connection",
      ],
    });
  }
  const directSecret = detectSecretFormat(signing.keyReference) !== null;
  const envSecret = directSecret ? undefined : env[signing.keyReference];
  return baseSigningInfo(signing, {
    keyReference: directSecret ? "<redacted>" : signing.keyReference,
    format: directSecret ? detectSecretFormat(signing.keyReference) ?? undefined : undefined,
    canSignWithoutPrompt: directSecret || envSecret !== undefined,
    requiresSecretLookup: !directSecret,
    notes: directSecret
      ? ["CI signing secret provided directly through environment"]
      : envSecret !== undefined
      ? ["CI signing secret available through referenced environment variable"]
      : ["CI signing environment variable is not set"],
  });
}

function baseSigningInfo(
  signing: SigningMethod,
  options: {
    keyReference?: string;
    format?: string;
    canSignWithoutPrompt: boolean;
    requiresSecretLookup: boolean;
    notes: string[];
  },
): SigningDebugInfo {
  const source = "source" in signing ? signing.source : undefined;
  const format = options.format ?? ("format" in signing ? signing.format : undefined);
  return {
    type: signing.type,
    source,
    format,
    keyReference: options.keyReference,
    canSignWithoutPrompt: options.canSignWithoutPrompt,
    requiresSecretLookup: options.requiresSecretLookup,
    notes: options.notes,
  };
}
