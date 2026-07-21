// Bundle the built standalone conformance web app into the CLI's dist so
// `napplet-conformance --ui` can serve it without depending on the (private) app
// package at runtime. Runs after tsup, as part of `pnpm build`.
import { existsSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../../apps/conformance/dist');
const dest = resolve(here, '../dist/ui');

if (existsSync(src) && readdirSync(src).length > 0) {
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`[conformance-cli] bundled UI (${readdirSync(dest).length} top-level entries) from ${src}`);
} else {
  console.warn(`[conformance-cli] UI source not found at ${src} — build @napplet/conformance-web first; --ui will be unavailable`);
}
