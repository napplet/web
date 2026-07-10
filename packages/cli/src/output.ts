/**
 * Human-readable CLI output helpers.
 *
 * @module
 */

import { nip19 } from "nostr-tools";
import type { SigningDebugInfo } from "./debug.ts";
import type { NetworkDeployProgress, NetworkDeployResult } from "./deploy-network.ts";
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

export interface DeployProgressReporterOptions {
  writeLine?: (line: string) => void;
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
  lines.push("Napplet Deploy");
  lines.push("==============");
  lines.push("");
  pushSection(lines, "Summary");
  pushField(lines, "Status", describeDeployStatus(report));
  pushField(lines, "Mode", report.dryRun ? "dry run" : "network deploy");
  pushField(lines, "Config", report.plan.configPath);
  pushField(lines, "Signer", describeSigning(report.signing));
  pushField(lines, "Targets", String(report.plan.items.length));
  pushField(lines, "Relays", formatCountedList(report.relays));
  pushField(lines, "Blossom servers", formatCountedList(report.blossomServers));
  lines.push("");

  pushSection(lines, "Manifest Events");
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
    pushField(lines, "  Copy nevent", pointers.nevent);
    if (pointers.naddr) pushField(lines, "  Copy naddr", pointers.naddr);
  }
  lines.push("");

  if (report.deploy) {
    pushSection(lines, "Uploads");
    const uploadSummary = report.deploy.uploadSummary;
    pushField(
      lines,
      "Files ready",
      `${uploadSummary.totalUploads - uploadSummary.failedUploads}/${uploadSummary.totalUploads}`,
    );
    pushField(
      lines,
      "Mirrors complete",
      `${uploadSummary.serversFullyUploaded}/${uploadSummary.servers}`,
    );
    for (const server of unique(report.deploy.uploaded.map((upload) => upload.server))) {
      lines.push(`- ${server}`);
      for (const upload of report.deploy.uploaded.filter((result) => result.server === server)) {
        const status = upload.success ? upload.skipped ? "skip" : "ok" : "fail";
        lines.push(`  [${status}] ${upload.file}`);
        if (upload.error) pushField(lines, "    Error", upload.error);
      }
    }
    lines.push("");
    pushSection(lines, "Relay Publish");
    const publishSummary = summarizePublishes(report.deploy.published);
    if (report.deploy.published.length > 0) {
      pushField(lines, "Accepted", `${publishSummary.success}/${report.deploy.published.length}`);
    }
    for (const publish of report.deploy.published) {
      const status = publish.success ? "ok" : "fail";
      lines.push(`- [${status}] ${publish.relay} ${short(publish.eventId, 12)}`);
      if (publish.error) pushField(lines, "  Error", publish.error);
    }
    if (report.deploy.published.length === 0) lines.push("- no relay publishes completed");
    lines.push("");
  }

  pushSection(lines, "Result");
  if (report.dryRun) {
    lines.push("Dry run complete: no files uploaded and no relay events published.");
  } else if (report.deploy) {
    const failures = report.deploy.uploadSummary.failedUploads +
      report.deploy.published.filter((publish) => !publish.success).length;
    lines.push(
      failures === 0
        ? "Deploy complete: manifests are uploaded and published."
        : `Deploy finished with ${failures} failure(s).`,
    );
  }
  return lines.join("\n");
}

/**
 * Create a terminal progress reporter for network deploys.
 *
 * @param options Output hooks for tests or custom terminals.
 * @returns Progress event callback suitable for `executeNetworkDeploy`.
 * @example
 * ```ts
 * const onProgress = createDeployProgressReporter();
 * ```
 */
export function createDeployProgressReporter(
  options: DeployProgressReporterOptions = {},
): (progress: NetworkDeployProgress) => void {
  const writeLine = options.writeLine ?? ((line: string) => console.error(line));
  return (progress) => {
    switch (progress.type) {
      case "upload:start":
        writeLine(
          `Uploading ${progress.files} file(s) to ${progress.servers} Blossom server(s)...`,
        );
        break;
      case "upload:result": {
        const status = progress.result.success
          ? progress.result.skipped ? "already present" : "uploaded"
          : "failed";
        writeLine(
          `${progressBar(progress.completedUploads, progress.totalUploads)} upload ` +
            `${progress.completedUploads}/${progress.totalUploads} ` +
            `${status}: ${progress.result.server}${progress.result.file}`,
        );
        break;
      }
      case "upload:complete":
        writeLine(
          `Uploads complete: ${
            progress.summary.totalUploads - progress.summary.failedUploads
          }/${progress.summary.totalUploads} file mirrors ready, ` +
            `${progress.summary.serversFullyUploaded}/${progress.summary.servers} servers complete.`,
        );
        break;
      case "publish:start":
        writeLine(
          `Publishing ${progress.events} manifest event(s) to ${progress.relays} relay(s)...`,
        );
        break;
      case "publish:event": {
        const success = progress.results.filter((result) => result.success).length;
        writeLine(
          `${progressBar(progress.completedEvents, progress.events)} publish ` +
            `${progress.completedEvents}/${progress.events} ` +
            `${success}/${progress.results.length} relays accepted ${short(progress.eventId, 12)}`,
        );
        break;
      }
      case "publish:skipped":
        writeLine(
          `Relay publish skipped: ${progress.summary.failedUploads} upload failure(s) need repair.`,
        );
        break;
      case "publish:complete": {
        const summary = summarizePublishes(progress.results);
        writeLine(
          `Relay publish complete: ${summary.success}/${progress.results.length} accepted.`,
        );
        break;
      }
    }
  };
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

function formatCountedList(values: readonly string[]): string {
  return values.length > 0 ? `${values.length} (${values.join(", ")})` : "0 (none)";
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
  return `${target} kind ${manifest.item.kind} from ${displayCandidateName(manifest)}`;
}

function short(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length)}...`;
}

function describeDeployStatus(report: DeployReport): string {
  if (report.dryRun) return "preview";
  if (!report.deploy) return "planned";
  const failures = report.deploy.uploadSummary.failedUploads +
    report.deploy.published.filter((publish) => !publish.success).length;
  return failures === 0 ? "complete" : `attention needed (${failures} failure(s))`;
}

function summarizePublishes(published: readonly { success: boolean }[]): { success: number } {
  return { success: published.filter((publish) => publish.success).length };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function displayCandidateName(manifest: DeployManifestTemplate): string {
  const name = manifest.item.candidate.name.trim();
  if (name !== "" && name !== "." && name !== "..") return name;
  const segments = manifest.item.candidate.dir.split(/[\\/]+/).filter(Boolean);
  const leaf = segments.at(-1);
  if (leaf === "dist") return segments.at(-2) ?? leaf;
  return leaf ?? manifest.item.candidate.dir;
}

function progressBar(completed: number, total: number): string {
  const width = 18;
  const safeTotal = Math.max(total, 1);
  const filled = Math.min(width, Math.floor((completed / safeTotal) * width));
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}

function isReplaceableKind(kind: number): boolean {
  return kind >= 10_000 && kind < 40_000;
}
