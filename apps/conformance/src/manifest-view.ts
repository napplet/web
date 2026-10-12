/**
 * Pure row builder for the conformance app's manifest inspector.
 *
 * Returns raw tag values only; HTML escaping stays in `main.ts` (`row()` / `esc()`),
 * because every tag value comes from an untrusted relay event.
 */

import {
  manifestDisplayName,
  type ManifestVerdict,
  type NappletManifestEvent,
} from '@napplet/conformance';

/** One inspector row: label and raw (unescaped) value; `undefined` renders a placeholder. */
export type ManifestRow = [string, string | number | undefined];

/**
 * Build the manifest inspector rows for a napplet manifest event.
 *
 * @param event - the signed NIP-5D manifest event being inspected.
 * @param verdict - the result of `validateManifestEvent(event)`.
 * @returns ordered `[label, value]` rows with raw values for the caller to escape.
 * @example
 * const rows = manifestRows(event, validateManifestEvent(event));
 * // → [['event', event.id], ['kind', 35129], …, ['artifact hash (x)', '<hex>'], …]
 */
export function manifestRows(event: NappletManifestEvent, verdict: ManifestVerdict): ManifestRow[] {
  const tagValue = (name: string) => event.tags.find((tag) => tag[0] === name)?.[1];
  const servers = event.tags.filter((tag) => tag[0] === 'server').map((tag) => tag[1]).filter(Boolean);
  return [
    ['event', event.id],
    ['kind', event.kind],
    ['d', tagValue('d')],
    ['name', manifestDisplayName(event)],
    ['requires', verdict.requires.join(', ')],
    ['optional', verdict.optional.join(', ')],
    // NIP-5D §Manifest: "exactly one `x` tag holding the lowercase-hex sha256 of that artifact".
    ['artifact hash (x)', tagValue('x')],
    ['servers', servers.join(', ')],
  ];
}
