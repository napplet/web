/**
 * Human-readable CLI output helpers.
 *
 * @module
 */

import { createEventPointers } from "./event-pointers.ts";
export { createEventPointers } from "./event-pointers.ts";
export type { EventPointers } from "./event-pointers.ts";
import type { SigningDebugInfo } from "./debug.ts";
import { networkDeploySucceeded } from "./deploy-network.ts";
import type { NetworkDeployProgress, NetworkDeployResult } from "./deploy-network.ts";
import type { ZapstorePublication } from "./zapstore.ts";
import type {
  DeployManifestTemplate,
  DeployPlan,
  NappletConfig,
} from "./types.ts";

export interface DeployReport {
  signing: SigningDebugInfo;
  plan: DeployPlan;
  manifests: DeployManifestTemplate[];
  application?: ZapstorePublication;
  deploy?: NetworkDeployResult;
  relays: string[];
  blossomServers: string[];
  dryRun: boolean;
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
    pushField(lines, "  Format", manifest.format ?? "current");
    pushField(lines, manifest.format === "legacy" ? "  Aggregate" : "  Artifact", short(manifest.aggregateHash ?? manifest.artifactHash ?? "", 12));
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

  if (report.application) {
    pushSection(lines, "Zapstore Application");
    pushField(lines, "Kind", "32267");
    for (const tag of report.application.template.tags) pushField(lines, tag[0], tag.slice(1).join(" "));
    pushField(lines, "Description", report.application.template.content);
    pushField(lines, "Local images", String(report.application.files.length));
    pushField(lines, "Status", report.application.signedEvent ? "signed" : "unsigned template");
    if (report.application.signedEvent) {
      pushField(lines, "Copy naddr", createEventPointers(report.application.signedEvent, report.relays).naddr ?? "");
    }
    lines.push("");
  }
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
  const result = describeDeployResult(report);
  if (result) lines.push(result);
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
          `Publishing ${progress.events} event(s) to ${progress.relays} relay(s)...`,
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
  lines.push(report.created ? "Napplet Init Complete" : "Napplet Init");
  lines.push(report.created ? "=====================" : "============");
  lines.push("");
  pushSection(lines, "Project");
  pushField(lines, "Status", report.created ? "created" : "existing config");
  pushField(lines, "Config", report.path);
  pushField(lines, "Source", report.config.sourceDir);
  pushField(lines, "Default target", report.config.defaultTarget);
  pushField(lines, "Named d tags", formatCountedList(report.config.named ?? []));
  if (report.config.metadata?.title) pushField(lines, "Title", report.config.metadata.title);
  if (report.config.metadata?.description) {
    pushField(lines, "Description", report.config.metadata.description);
  }
  pushField(
    lines,
    "Archetypes",
    formatCountedList(
      report.config.metadata?.archetypes?.map(({ slug, convention }) =>
        convention.startsWith(`napplet:${slug}/`) ? convention : `${convention} (role: ${slug})`
      ) ?? [],
    ),
  );
  pushField(lines, "Relays", formatCountedList(report.config.relays));
  pushField(lines, "Blossom servers", formatCountedList(report.config.blossomServers));
  lines.push("");
  pushSection(lines, "Next");
  lines.push("1. Install agent guidance: `npx skills add napplet/napplet`.");
  lines.push("2. Build and verify the project: `pnpm install && pnpm verify`.");
  lines.push("3. Preview manifest events: `napplet deploy --dry-run`.");
  if (report.config.relays.length > 0 && report.config.blossomServers.length > 0) {
    lines.push("4. Publish when signing is configured: `napplet deploy`.");
  } else {
    lines.push("Add at least one relay and Blossom server before network deploy.");
  }
  return lines.join("\n");
}

function pushSection(lines: string[], title: string): void {
  lines.push(title);
  lines.push("-".repeat(title.length));
}

function pushField(lines: string[], label: string, value: string): void {
  lines.push(`${label}: ${value}`);
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
  const outcome = summarizeDeployOutcome(report.deploy, report.manifests);
  if (!outcome.succeeded) return `failed (${outcome.failures.join("; ")})`;
  return outcome.warnings.length > 0
    ? `complete with warnings (${outcome.warnings.join(", ")})`
    : "complete";
}

function describeDeployResult(report: DeployReport): string | undefined {
  if (report.dryRun) {
    return "Dry run complete: no files uploaded and no relay events published.";
  }
  if (!report.deploy) return undefined;
  const outcome = summarizeDeployOutcome(report.deploy, report.manifests);
  if (!outcome.succeeded) return `Deploy failed: ${outcome.failures.join("; ")}.`;
  if (outcome.warnings.length > 0) {
    return `Deploy complete with warnings: ${outcome.warnings.join("; ")}. ` +
      "Manifests are uploaded and published.";
  }
  return "Deploy complete: manifests are uploaded and published.";
}

function summarizeDeployOutcome(
  deploy: NetworkDeployResult,
  manifests: readonly DeployManifestTemplate[],
): {
  succeeded: boolean;
  failures: string[];
  warnings: string[];
} {
  const succeeded = networkDeploySucceeded(deploy, manifests);
  const eventIds = manifests.flatMap((manifest) =>
    manifest.signedEvent ? [manifest.signedEvent.id] : []
  );
  const unpublishedEvents =
    eventIds.filter((eventId) =>
      !deploy.published.some((publish) => publish.eventId === eventId && publish.success)
    ).length;
  const failures: string[] = [];
  if (deploy.uploadSummary.serversFullyUploaded === 0) {
    failures.push("no complete Blossom mirror");
  }
  if (eventIds.length === 0) {
    failures.push("no signed manifest events");
  } else if (unpublishedEvents > 0) {
    failures.push(
      formatCount(
        unpublishedEvents,
        "manifest event was not published",
        "manifest events were not published",
      ),
    );
  }
  if ((deploy.additionalEventIds ?? []).some((eventId) =>
    !deploy.published.some((publish) => publish.eventId === eventId && publish.success)
  )) {
    failures.push("Zapstore application metadata was not published");
  }
  if (!succeeded && failures.length === 0) failures.push("deployment requirements not met");

  const warnings: string[] = [];
  if (succeeded) {
    const incompleteMirrors = Math.max(
      0,
      deploy.uploadSummary.servers - deploy.uploadSummary.serversFullyUploaded,
    );
    if (incompleteMirrors > 0) {
      warnings.push(formatCount(incompleteMirrors, "incomplete Blossom mirror"));
    }
    const failedRelayPublishes = deploy.published.filter((publish) => !publish.success).length;
    if (failedRelayPublishes > 0) {
      warnings.push(
        formatCount(
          failedRelayPublishes,
          "failed redundant relay publish",
          "failed redundant relay publishes",
        ),
      );
    }
  }
  return { succeeded, failures, warnings };
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
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
