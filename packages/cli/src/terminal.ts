/** Small terminal presentation primitives; machine output never depends on ANSI. */
import { currentInteraction, resolveInteraction } from "./interaction.ts";

export type Tone = "accent" | "success" | "warning" | "error" | "muted" | "heading";
const codes: Record<Tone, string> = { accent: "36", success: "32", warning: "33", error: "31", muted: "2", heading: "1;36" };

/**
 * Style terminal text when color is enabled.
 * @param text Display text.
 * @param tone Semantic color, also represented by surrounding text.
 * @param enabled Override for tests or a particular output stream.
 * @returns ANSI-styled text or unchanged text.
 * @example paint("Complete", "success")
 */
export function paint(text: string, tone: Tone, enabled = (currentInteraction() ?? resolveInteraction()).color): string {
  return enabled ? `\x1b[${codes[tone]}m${text}\x1b[0m` : text;
}

/**
 * Read terminal width with a stable fallback for redirected output.
 * @returns At least 20 display columns.
 * @example terminalWidth()
 */
export function terminalWidth(): number {
  try { return Math.max(20, Deno.consoleSize().columns); } catch { return 80; }
}

/**
 * Render the napplet wordmark for a human terminal session.
 * @param version Installed CLI version.
 * @param width Available terminal columns.
 * @returns ASCII wordmark and version.
 * @example renderBanner("0.9.1")
 */
export function renderBanner(version: string, width = terminalWidth()): string {
  const wordmark = width < 48 ? "napplet" : String.raw`                         _      _
 _ __   __ _ _ __  _ __  | | ___| |_
| '_ \ / _' | '_ \| '_ \ | |/ _ \ __|
| | | | (_| | |_) | |_) || |  __/ |_
|_| |_|\__,_| .__/| .__/ |_|\___|\__|
            |_|   |_|`;
  const caption = width < 48 ? `napplet ${version}` : `  napplet ${version}  /  build · preview · publish`;
  return `\n${paint(wordmark, "accent")}\n${paint(caption, "muted")}\n`;
}

/**
 * Add semantic emphasis to an existing human report without removing its data.
 * @param text Plain multiline report.
 * @returns Styled headings, statuses, and secondary labels.
 * @example decorateReport(renderInitReport(report))
 */
export function decorateReport(text: string): string {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    if (/^[=-]+$/.test(line)) return paint("─".repeat(Math.min(line.length + 12, terminalWidth() - 2)), "muted");
    if (index === 0 || /^[=-]+$/.test(lines[index + 1] ?? "")) return paint(line, "heading");
    if (/\[fail\]|^Deploy failed|^Status: failed/.test(line)) return paint(line, "error");
    if (/warnings|^Dry run|^Status: preview|\[skip\]/.test(line)) return paint(line, "warning");
    if (/\[ok\]|^Deploy complete|^Status: (complete|created)/.test(line)) return paint(line, "success");
    if (/^\s*Copy (nevent|naddr):/.test(line)) return paint(line, "accent");
    return line;
  }).join("\n");
}

/**
 * Fit a status line into a terminal without embedding cursor-control input.
 * @param text Status text; full data remains in the final report.
 * @param width Available columns.
 * @returns Single-line display text.
 * @example fitStatus("Uploading https://example.com", 40)
 */
export function fitStatus(text: string, width: number): string {
  const clean = text.replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
  const chars = Array.from(clean);
  return chars.length <= width ? clean : `${chars.slice(0, Math.max(0, width - 3)).join("")}...`;
}

/**
 * Render completed operations; failures are counted as finished, not successful.
 * @param done Finished operations.
 * @param total Expected operations.
 * @param width Bar width.
 * @returns A bounded progress bar and percentage.
 * @example renderProgressBar(1, 4) // [█████░░░░░░░░░░░░░░░] 25%
 */
export function renderProgressBar(done: number, total: number, width = 20): string {
  const ratio = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
  const filled = Math.floor(ratio * width);
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}] ${Math.floor(ratio * 100)}%`;
}
