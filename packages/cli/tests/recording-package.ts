/** Seed an unpublished packed runner for release-binary integration tests only. */
import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureManagedNode } from "../src/managed-node.ts";
import { assertEquals } from "./assert.ts";

export async function seedRecordingPackage(tarball: string, env: Record<string, string>): Promise<void> {
  const previous = Deno.env.get("NAPPLET_CACHE_DIR");
  Deno.env.set("NAPPLET_CACHE_DIR", env.NAPPLET_CACHE_DIR);
  try {
    const node = await ensureManagedNode();
    const suffix = `-${Deno.build.os}-${Deno.build.arch}-v1`;
    const destination = join(env.NAPPLET_CACHE_DIR, "packages", `_napplet_conformance-cli_0.4.0${suffix}`);
    await Deno.mkdir(destination, { recursive: true });
    await Deno.writeTextFile(join(destination, "package.json"), '{"private":true}');
    const install = await new Deno.Command(node.executable, {
      args: [node.npmCli, "install", "--prefix", destination, "--ignore-scripts", "--no-audit", "--no-fund", tarball, "playwright@1.59.1", ...(Deno.build.os === "linux" ? ["@sparticuz/chromium-min@153.0.0"] : [])],
      env: { ...env, ...node.env }, stdout: "piped", stderr: "piped",
    }).output();
    assertEquals(install.code, 0, new TextDecoder().decode(install.stderr));
    const manifest = JSON.parse(await Deno.readTextFile(join(destination, "node_modules/@napplet/conformance-cli/package.json")));
    assertEquals(manifest.version, "0.4.0");
    if (Deno.build.os === "linux") {
      // The preceding screenshot downloaded and verified this architecture's portable browser.
      await cp(join(env.NAPPLET_CACHE_DIR, "packages", `_napplet_conformance-cli_0.3.3${suffix}`, "chromium-pack"), join(destination, "chromium-pack"), { recursive: true });
    }
    await Deno.writeTextFile(join(destination, ".ready"), "@napplet/conformance-cli@0.4.0");
  } finally {
    if (previous === undefined) Deno.env.delete("NAPPLET_CACHE_DIR");
    else Deno.env.set("NAPPLET_CACHE_DIR", previous);
  }
}
