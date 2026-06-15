/**
 * @napplet/vite-plugin — NAP-CONFIG schema discovery and build-time guard.
 *
 * Resolves the napplet config schema from inline option / convention file /
 * `napplet.config.*` export, then applies the narrow build-time rejection rules
 * (root shape, `pattern` ban, external `$ref` ban, secret-with-default ban)
 * before the schema is folded into the signed manifest.
 */

import type { NappletConfigSchema } from '@napplet/nap/config/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Three-path schema discovery. Returns the resolved schema + source name, or
 * null/null when no schema is declared anywhere.
 *
 * Precedence (each step is strict — later steps run only when the earlier
 * step yielded no schema):
 *   1. `options.configSchema` is an object -> use it directly (source: 'inline option').
 *   2. `options.configSchema` is a string -> resolve relative to `root`, read+parse as JSON (source: 'inline option: <path>').
 *   3. `config.schema.json` exists at `root` -> read+parse as JSON (source: 'config.schema.json').
 *   4. `napplet.config.ts` / `.js` / `.mjs` exists at `root` -> dynamic import, read `configSchema` named export (source: 'napplet.config.<ext>').
 *   5. None -> return { schema: null, source: null }.
 *
 * Parse / import / missing-export failures throw with an explanatory message.
 * The "file does not exist" case is NOT an error — it advances to the next path.
 *
 * @param options - Nip5aManifestOptions (reads `configSchema` only).
 * @param root - Absolute Vite project root (from `configResolved(config).root`).
 * @returns Object with resolved schema (or null) and source name (or null).
 * @throws Error with `[nip5a-manifest]` prefix when a present-but-unreadable
 *         path is encountered (JSON parse failure, import failure, missing export).
 */
export async function discoverConfigSchema(
  options: { configSchema?: NappletConfigSchema | string },
  root: string,
): Promise<{ schema: NappletConfigSchema | null; source: string | null }> {
  // Step 1 + 2: inline option
  if (options.configSchema !== undefined) {
    if (typeof options.configSchema === 'object') {
      return { schema: options.configSchema, source: 'inline option' };
    }
    if (typeof options.configSchema === 'string') {
      const p = path.isAbsolute(options.configSchema)
        ? options.configSchema
        : path.resolve(root, options.configSchema);
      if (!fs.existsSync(p)) {
        throw new Error(
          `[nip5a-manifest] configSchema path does not exist: ${p}`,
        );
      }
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return { schema: JSON.parse(raw) as NappletConfigSchema, source: `inline option: ${p}` };
      } catch (err) {
        throw new Error(
          `[nip5a-manifest] failed to parse configSchema file ${p}: ${(err as Error).message}`,
        );
      }
    }
  }

  const conventionPath = path.resolve(root, 'config.schema.json');
  if (fs.existsSync(conventionPath)) {
    try {
      const raw = fs.readFileSync(conventionPath, 'utf-8');
      return { schema: JSON.parse(raw) as NappletConfigSchema, source: 'config.schema.json' };
    } catch (err) {
      throw new Error(
        `[nip5a-manifest] failed to parse config.schema.json at ${conventionPath}: ${(err as Error).message}`,
      );
    }
  }

  for (const ext of ['ts', 'js', 'mjs'] as const) {
    const cfgPath = path.resolve(root, `napplet.config.${ext}`);
    if (!fs.existsSync(cfgPath)) continue;
    try {
      // Convert to file:// URL for ESM dynamic import on Windows + Linux
      const url = new URL(`file://${cfgPath}`).href;
      const mod = await import(url);
      const schema = (mod.configSchema ?? mod.default?.configSchema) as NappletConfigSchema | undefined;
      if (schema === undefined) {
        throw new Error(
          `[nip5a-manifest] napplet.config.${ext} at ${cfgPath} does not export \`configSchema\` (neither as a named export nor on the default export)`,
        );
      }
      return { schema, source: `napplet.config.${ext}` };
    } catch (err) {
      throw new Error(
        `[nip5a-manifest] failed to load napplet.config.${ext} at ${cfgPath}: ${(err as Error).message}`,
      );
    }
  }

  return { schema: null, source: null };
}

/**
 * Structural guard for napplet config schemas at build time.
 *
 * NOT a full JSON Schema validator. Only checks the four rejection rules that
 * MUST fail the build early — full Core Subset enforcement lives in the shell
 * at `config.registerSchema` time. See NAP-CONFIG Schema Contract / Exclusions.
 *
 * Rejection rules:
 * 1. Root MUST be `{ type: "object", ... }`. Anything else -> 'invalid-schema'.
 * 2. `pattern` keyword anywhere in the tree -> 'pattern-not-allowed' (ReDoS,
 *    CVE-2025-69873 class).
 * 3. `$ref` whose value does not start with `#/` anywhere in the tree ->
 *    'ref-not-allowed' (external reference ban; same-document refs are still
 *    forbidden by the spec but are caught by the shell-side Core Subset
 *    enforcer at registerSchema time).
 * 4. Any property node where both `x-napplet-secret: true` and the `default`
 *    key are present -> 'secret-with-default'.
 *
 * Collects every violation; returns them all in one pass so the build log
 * surfaces every problem at once.
 *
 * @param schema - the unvalidated schema loaded from options / config.schema.json / napplet.config.*
 * @returns `{ ok: true }` on pass, `{ ok: false, errors }` on failure (errors is
 *          a string array with one entry per distinct violation discovered).
 */
export function validateConfigSchema(
  schema: unknown,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  // Rule 1: root shape
  if (
    schema === null ||
    typeof schema !== 'object' ||
    Array.isArray(schema) ||
    (schema as Record<string, unknown>).type !== 'object'
  ) {
    const got =
      schema === null
        ? 'null'
        : Array.isArray(schema)
          ? 'array'
          : typeof schema === 'object'
            ? `type=${JSON.stringify((schema as Record<string, unknown>).type)}`
            : typeof schema;
    errors.push(
      `invalid-schema: schema root must be { type: "object", ... } (got ${got})`,
    );
    // Do not recurse when root is malformed — nothing meaningful to walk.
    return { ok: false, errors };
  }

  // Rules 2-4: recursive walk
  walk(schema as Record<string, unknown>, '$', errors);

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Internal: recursively walks a schema node, accumulating rule violations.
 *
 * Recurses into every JSON-Schema child-carrying keyword we care about so the
 * four build-time rejection rules apply at any depth. JSON Schema combinators
 * (`oneOf` / `anyOf` / `allOf` / `not`) and reference containers (`definitions`
 * / `$defs`) are walked — shell-side Core Subset enforcement rejects them
 * outright at `registerSchema` time, but the build-time guard stays narrower
 * and still surfaces nested `pattern` / `$ref` / `secret-with-default`
 * violations through them.
 *
 * @param node   - arbitrary schema sub-tree (may be object, array, or primitive)
 * @param path   - dot-joined JSON-Pointer-ish location used in error messages
 * @param errors - mutable accumulator to which violations are pushed
 */
function walk(node: unknown, path: string, errors: string[]): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walk(node[i], `${path}[${i}]`, errors);
    }
    return;
  }

  const obj = node as Record<string, unknown>;
  collectSchemaKeywordErrors(obj, path, errors);
  walkSchemaChildren(obj, path, errors);
}

function collectSchemaKeywordErrors(
  obj: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if ('pattern' in obj) {
    errors.push(
      `pattern-not-allowed: \`pattern\` keyword found at ${path} — the Core Subset excludes \`pattern\` due to ReDoS risk (CVE-2025-69873 class). Use \`enum\`, \`minLength\`, or \`maxLength\` for constrained strings.`,
    );
  }

  if ('$ref' in obj) {
    const ref = obj.$ref;
    if (typeof ref !== 'string' || !ref.startsWith('#/')) {
      errors.push(
        `ref-not-allowed: \`$ref\` at ${path} must start with \`#/\` (got ${JSON.stringify(ref)}). External $ref is forbidden per NAP-CONFIG Security Considerations.`,
      );
    }
  }

  if (obj['x-napplet-secret'] === true && 'default' in obj) {
    errors.push(
      `secret-with-default: property at ${path} declares both \`x-napplet-secret: true\` and a \`default\` value. A secret with a hardcoded default is not a secret.`,
    );
  }
}

function walkSchemaChildren(obj: Record<string, unknown>, path: string, errors: string[]): void {
  if (
    typeof obj.properties === 'object' &&
    obj.properties !== null &&
    !Array.isArray(obj.properties)
  ) {
    for (const [key, child] of Object.entries(obj.properties as Record<string, unknown>)) {
      walk(child, `${path}.properties.${key}`, errors);
    }
  }
  if ('items' in obj) {
    walk(obj.items, `${path}.items`, errors);
  }
  if ('additionalProperties' in obj && typeof obj.additionalProperties === 'object') {
    walk(obj.additionalProperties, `${path}.additionalProperties`, errors);
  }
  if (
    typeof obj.patternProperties === 'object' &&
    obj.patternProperties !== null &&
    !Array.isArray(obj.patternProperties)
  ) {
    for (const [key, child] of Object.entries(
      obj.patternProperties as Record<string, unknown>,
    )) {
      walk(child, `${path}.patternProperties.${key}`, errors);
    }
  }
  for (const combiner of ['oneOf', 'anyOf', 'allOf'] as const) {
    if (Array.isArray(obj[combiner])) {
      (obj[combiner] as unknown[]).forEach((child, i) =>
        walk(child, `${path}.${combiner}[${i}]`, errors),
      );
    }
  }
  if ('not' in obj) walk(obj.not, `${path}.not`, errors);
  for (const defs of ['definitions', '$defs'] as const) {
    if (
      typeof obj[defs] === 'object' &&
      obj[defs] !== null &&
      !Array.isArray(obj[defs])
    ) {
      for (const [key, child] of Object.entries(obj[defs] as Record<string, unknown>)) {
        walk(child, `${path}.${defs}.${key}`, errors);
      }
    }
  }
}
