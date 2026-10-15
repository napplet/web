/** Event-driven deployment progress for interactive terminals. */
import type { NetworkDeployProgress } from "./deploy-network.ts";
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
} = {}): (event: NetworkDeployProgress) => void {
  const write = options.write ?? ((text) => Deno.stderr.writeSync(new TextEncoder().encode(text)));
  const width = options.width ?? terminalWidth;
  const now = options.now ?? Date.now;
  const started = now();
  const mirrors = new Map<string, MirrorProgress>();
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
