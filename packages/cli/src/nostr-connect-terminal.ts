import { qrcode } from "@libs/qrcode";

export function buildPerms(kinds: number[]): string[] {
  return ["get_public_key", ...kinds.map((kind) => `sign_event:${kind}`)];
}

export function detectBunkerLine(line: string): string | null {
  const trimmed = line.trim();
  return trimmed.startsWith("bunker://") ? trimmed : null;
}

export function renderQrMatrix(matrix: boolean[][], border = 2): string[] {
  if (!matrix || matrix.length === 0) return [];
  const width = matrix[0].length;
  const totalWidth = width + 2 * border;
  const lines: string[] = [];
  for (let index = 0; index < Math.ceil(border / 2); index += 1) lines.push(" ".repeat(totalWidth));
  for (let row = 0; row < matrix.length; row += 2) {
    const top = matrix[row];
    const bottom = row + 1 < matrix.length ? matrix[row + 1] : null;
    let line = " ".repeat(border);
    for (let col = 0; col < width; col += 1) {
      line += top[col] && bottom?.[col] ? "█" : top[col] ? "▀" : bottom?.[col] ? "▄" : " ";
    }
    lines.push(`${line}${" ".repeat(border)}`);
  }
  for (let index = 0; index < Math.ceil(border / 2); index += 1) lines.push(" ".repeat(totalWidth));
  return lines;
}

export function renderQrLines(uri: string, border = 2): string[] {
  return renderQrMatrix(qrcode(uri, { output: "array" }) as boolean[][], border);
}

export function clearLines(count: number, write: (bytes: Uint8Array) => void): void {
  if (count <= 0) return;
  const encoder = new TextEncoder();
  write(encoder.encode(`\x1b[${count}A`));
  for (let index = 0; index < count; index += 1) write(encoder.encode("\x1b[2K\x1b[B"));
  write(encoder.encode(`\x1b[${count}A`));
}

export function printConnectPrompt(uri: string, qrLines: string[], timeoutMs: number, print: (line: string) => void): number {
  print("Scan this QR with a NIP-46 signer, or paste a bunker:// URL and press Enter:");
  for (const line of qrLines) print(line);
  print("");
  print(uri);
  print(`Waiting for a remote signer (timeout ${Math.round(timeoutMs / 1000)}s)...`);
  return qrLines.length + 4;
}
