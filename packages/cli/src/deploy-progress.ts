/** Event-driven deployment progress for interactive terminals. */
import type { NetworkDeployProgress } from "./deploy-network.ts";
import { canPrompt } from "./interaction.ts";
import { isTerminalOutput } from "./output.ts";
import { fitStatus, paint, renderProgressBar, terminalWidth } from "./terminal.ts";

interface MirrorProgress { completed: number; failed: number; skipped: number }

/**
 * Render actual upload and relay results in place, retaining completed stages.
 * @param options Injectable output, width and clock for terminal verification.
 * @returns Deployment event handler. No timer or stdin listener is created.
 * @example executeNetworkDeploy(manifests, config, signer, { onProgress: createLiveDeployReporter() })
 */
export function createLiveDeployReporter(options: {
  write?: (text: string) => void;
  width?: () => number;
  now?: () => number;
  servers?: readonly string[];
} = {}): (event: NetworkDeployProgress) => void {
  const write = options.write ?? ((text) => Deno.stderr.writeSync(new TextEncoder().encode(text)));
  const width = options.width ?? terminalWidth;
  const now = options.now ?? Date.now;
  const started = now();
  const mirrors = new Map<string, MirrorProgress>((options.servers ?? []).map((server) => [server, { completed: 0, failed: 0, skipped: 0 }]));
  let previousLines = 0;
  let files = 0;
  let total = 0;
  let done = 0;
  const draw = (lines: string[], complete = false) => {
    if (previousLines) write(`\x1b[${previousLines}A\r\x1b[J`);
    write(`${lines.join("\n")}\n`);
    previousLines = complete ? 0 : lines.length;
  };
  const elapsed = () => `${((now() - started) / 1000).toFixed(1)}s`;
  return (event) => {
    switch (event.type) {
      case "upload:start":
        files = event.files;
        total = event.totalUploads;
        draw([paint("  UPLOAD  /  Blossom mirrors", "heading"), `  ${renderProgressBar(0, total)}  0/${total}`]);
        break;
      case "upload:result": {
        done = event.completedUploads;
        const row = mirrors.get(event.result.server) ?? { completed: 0, failed: 0, skipped: 0 };
        row.completed++;
        if (!event.result.success) row.failed++;
        if (event.result.skipped) row.skipped++;
        mirrors.set(event.result.server, row);
        const lines = [paint("  UPLOAD  /  Blossom mirrors", "heading"),
          `  ${paint(renderProgressBar(done, total), "accent")}  ${done}/${total}  ${elapsed()}`];
        for (const [server, progress] of mirrors) {
          const state = `${progress.completed - progress.failed - progress.skipped} uploaded, ${progress.skipped} present, ${progress.failed} failed`;
          lines.push(`  ${fitStatus(server, width() - 4)}`);
          lines.push(paint(fitStatus(`    ${renderProgressBar(progress.completed, files, 12)}  ${state}`, width() - 1), progress.failed ? "warning" : "success"));
        }
        draw(lines);
        break;
      }
      case "upload:complete": {
        const summary = event.summary;
        draw([paint(fitStatus(`  Uploads: ${summary.totalUploads - summary.failedUploads}/${summary.totalUploads} ready · ${summary.serversFullyUploaded}/${summary.servers} complete mirrors · ${elapsed()}`, width() - 1), summary.failedUploads ? "warning" : "success"), ""], true);
        break;
      }
      case "publish:start":
        draw([paint("  PUBLISH  /  Relay acknowledgements", "heading"), `  ${renderProgressBar(0, event.events)}  0/${event.events}`]);
        break;
      case "publish:event": {
        const accepted = event.results.filter((result) => result.success).length;
        draw([paint("  PUBLISH  /  Relay acknowledgements", "heading"),
          `  ${paint(renderProgressBar(event.completedEvents, event.events), "accent")}  ${event.completedEvents}/${event.events}`,
          paint(`  ${accepted}/${event.results.length} relays accepted this event`, accepted ? "success" : "error")]);
        break;
      }
      case "publish:complete": {
        const accepted = event.results.filter((result) => result.success).length;
        draw([paint(`  Published: ${accepted}/${event.results.length} relay acknowledgements · ${elapsed()}`, accepted === event.results.length ? "success" : "warning"), ""], true);
        break;
      }
      case "publish:skipped":
        draw([paint("  Publish skipped: no complete Blossom mirror. Fix failed uploads and retry.", "error"), ""], true);
        break;
    }
  };
}

export interface DeployProgressReporterOptions {
  writeLine?: (line: string) => void;
  servers?: readonly string[];
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
  if (!options.writeLine && canPrompt() && isTerminalOutput(Deno.stderr) && Deno.env.get("TERM") !== "dumb" && terminalWidth() >= 60) {
    return createLiveDeployReporter({ servers: options.servers });
  }
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
            `${success}/${progress.results.length} relays accepted ${`${progress.eventId.slice(0, 12)}...`}`,
        );
        break;
      }
      case "publish:skipped":
        writeLine(
          `Relay publish skipped: ${progress.summary.failedUploads} upload failure(s) need repair.`,
        );
        break;
      case "publish:complete": {
        const summary = { success: progress.results.filter((result) => result.success).length };
        writeLine(
          `Relay publish complete: ${summary.success}/${progress.results.length} accepted.`,
        );
        break;
      }
    }
  };
}


function progressBar(completed: number, total: number): string {
  const width = 18;
  const safeTotal = Math.max(total, 1);
  const filled = Math.min(width, Math.floor((completed / safeTotal) * width));
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}
