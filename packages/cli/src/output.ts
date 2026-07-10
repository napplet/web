/**
 * Human-readable CLI output helpers.
 *
 * @module
 */

import { nip19 } from "nostr-tools";
import type { SigningDebugInfo } from "./debug.ts";
import type { NetworkDeployResult } from "./deploy-network.ts";
import type {
  DeployManifestTemplate,
  DeployPlan,
  NappletConfig,
  SignedNostrEvent,
} from "./types.ts";

export interface DeployReport {
  signing: SigningDebugInfo;
  plan: DeployPlan;
  manifests: DeployManifestTemplate[];
  deploy?: NetworkDeployResult;
  relays: string[];
  blossomServers: string[];
  dryRun: boolean;
}

export interface EventPointers {
  nevent: string;
  naddr?: string;
}

export interface InitReport {
  path: string;
  config: NappletConfig;
  created: boolean;
}

/**
 * Return whether an output sink is an interactive terminal.
 *
 * @param output File-like output sink.
 * @returns True when the sink reports a terminal.
 * @example
 * ```ts
 * isTerminalOutput(Deno.stdout);
 * ```
 */
export function isTerminalOutput(output: { isTerminal?: () => boolean } = Deno.stdout): boolean {
  try {
    return output.isTerminal?.() ?? false;
  } catch {
    return false;
  }
}

/**
 * Create NIP-19 pointers for a signed deploy event.
 *
 * @param event Signed event to reference.
 * @param relays Relays where the event was or will be published.
 * @returns Exact-event pointer plus address pointer when the event is addressable.
 * @example
 * ```ts
 * createEventPointers(event, ["wss://relay.example"]).nevent;
 * ```
 */
export function createEventPointers(
  event: SignedNostrEvent,
  relays: readonly string[] = [],
): EventPointers {
  const relayHints = relays.length > 0 ? [...relays] : undefined;
  const pointers: EventPointers = {
    nevent: nip19.neventEncode({
      id: event.id,
      author: event.pubkey,
      kind: event.kind,
      relays: relayHints,
    }),
  };
  if (isReplaceableKind(event.kind)) {
    pointers.naddr = nip19.naddrEncode({
      identifier: event.tags.find((tag) => tag[0] === "d")?.[1] ?? "",
      pubkey: event.pubkey,
      kind: event.kind,
      relays: relayHints,
    });
  }
  return pointers;
}

/**
 * Render a deploy report for humans.
 *
 * @param report Deploy data produced by the command.
 * @returns Multi-line text suitable for terminal output.
 * @example
 * ```ts
 * console.log(renderDeployReport(report));
 * ```
 */
export function renderDeployReport(report: DeployReport): string {
  const lines: string[] = [];
  lines.push("Napplet deploy");
  lines.push("==============");
  lines.push("");
  pushSection(lines, "Configuration");
  pushField(lines, "Config", report.plan.configPath);
  pushField(lines, "Mode", report.dryRun ? "dry run" : "network deploy");
  pushField(lines, "Signer", describeSigning(report.signing));
  pushField(lines, "Targets", String(report.plan.items.length));
  pushField(lines, "Relays", formatList(report.relays));
  pushField(lines, "Blossom servers", formatList(report.blossomServers));
  lines.push("");

  pushSection(lines, "Manifest events");
  for (const manifest of report.manifests) {
    lines.push(`- ${describeManifest(manifest)}`);
    pushField(lines, "  Files", String(manifest.files.length));
    pushField(lines, "  Aggregate", short(manifest.aggregateHash, 12));
    if (manifest.skippedReason) {
      pushField(lines, "  Status", `skipped: ${manifest.skippedReason}`);
      continue;
    }
    if (!manifest.signedEvent) {
      pushField(lines, "  Status", "unsigned template");
      continue;
    }
    const pointers = createEventPointers(manifest.signedEvent, report.relays);
    pushField(lines, "  Event", short(manifest.signedEvent.id, 12));
    pushField(lines, "  nevent", pointers.nevent);
    if (pointers.naddr) pushField(lines, "  naddr", pointers.naddr);
  }
  lines.push("");

  if (report.deploy) {
    pushSection(lines, "Uploads");
    const uploadSummary = report.deploy.uploadSummary;
    pushField(
      lines,
      "Files",
      `${uploadSummary.totalUploads - uploadSummary.failedUploads}/${uploadSummary.totalUploads}`,
    );
    pushField(
      lines,
      "Mirrors complete",
      `${uploadSummary.serversFullyUploaded}/${uploadSummary.servers}`,
    );
    for (const upload of report.deploy.uploaded) {
      const status = upload.success ? upload.skipped ? "already present" : "uploaded" : "failed";
      lines.push(`- ${status}: ${upload.server}${upload.file}`);
      if (upload.error) pushField(lines, "  Error", upload.error);
    }
    lines.push("");
    pushSection(lines, "Relay publish");
    for (const publish of report.deploy.published) {
      const status = publish.success ? "published" : "failed";
      lines.push(`- ${status}: ${publish.relay} ${short(publish.eventId, 12)}`);
      if (publish.error) pushField(lines, "  Error", publish.error);
    }
    if (report.deploy.published.length === 0) lines.push("- no relay publishes completed");
    lines.push("");
  }

  pushSection(lines, "Result");
  if (report.dryRun) {
    lines.push("Dry run complete. No files were uploaded and no relay events were published.");
  } else if (report.deploy) {
    const failures = report.deploy.uploadSummary.failedUploads +
      report.deploy.published.filter((publish) => !publish.success).length;
    lines.push(
      failures === 0 ? "Deploy complete." : `Deploy finished with ${failures} failure(s).`,
    );
  }
  return lines.join("\n");
}

/**
 * Render init output for humans.
 *
 * @param report Init result and resolved config.
 * @returns Multi-line text suitable for terminal output.
 * @example
 * ```ts
 * console.log(renderInitReport(result));
 * ```
 */
export function renderInitReport(report: InitReport): string {
  const lines: string[] = [];
  lines.push(`${report.created ? "Created" : "Found"} ${report.path}`);
  lines.push("");
  pushSection(lines, "Napplet config");
  pushField(lines, "Source", report.config.sourceDir);
  pushField(lines, "Default target", report.config.defaultTarget);
  pushField(lines, "Named d tags", formatList(report.config.named ?? []));
  pushField(lines, "Relays", formatList(report.config.relays));
  pushField(lines, "Blossom servers", formatList(report.config.blossomServers));
  return lines.join("\n");
}

function pushSection(lines: string[], title: string): void {
  lines.push(title);
  lines.push("-".repeat(title.length));
}

function pushField(lines: string[], label: string, value: string): void {
  lines.push(`${label}: ${value}`);
}

function formatList(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "(none)";
}

function describeSigning(signing: SigningDebugInfo): string {
  if (signing.keyReference) return `${signing.type} (${signing.keyReference})`;
  if (signing.format) return `${signing.type} (${signing.format})`;
  return signing.type;
}

function describeManifest(manifest: DeployManifestTemplate): string {
  const target = manifest.item.target === "named"
    ? `named:${manifest.item.dTag ?? manifest.item.candidate.name}`
    : manifest.item.target;
  return `${target} kind ${manifest.item.kind} from ${manifest.item.candidate.name}`;
}

function short(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length)}...`;
}

function isReplaceableKind(kind: number): boolean {
  return kind >= 10_000 && kind < 40_000;
}
