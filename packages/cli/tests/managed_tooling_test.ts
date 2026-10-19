import { gzipSync, zipSync } from "fflate";
import { nodeDistribution, verifyToolDownload } from "../src/managed-node.ts";
import { archivePath, extractToolArchive } from "../src/tool-archive.ts";
import { PortableKeyStore } from "../src/portable-key-store.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

async function rejects(fn: () => unknown | Promise<unknown>, message: string): Promise<void> {
  try { await fn(); } catch (error) {
    assert(error instanceof Error && error.message.includes(message));
    return;
  }
  throw new Error("Expected rejection");
}

Deno.test("runtime distributions cover every shipped target with a fixed checksum", () => {
  for (const target of ["darwin-aarch64", "darwin-x86_64", "linux-aarch64", "linux-x86_64", "windows-x86_64"]) {
    const distribution = nodeDistribution(target);
    assert(distribution.url.startsWith("https://nodejs.org/dist/v22.23.3/"));
    assert(/^[0-9a-f]{64}$/.test(distribution.sha256));
    assertEquals(distribution.format, target.startsWith("windows") ? "zip" : "tar.gz");
  }
});

Deno.test("checksum verification rejects corruption before extraction", async () => {
  const bytes = new TextEncoder().encode("abc");
  await verifyToolDownload(bytes, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  await rejects(() => verifyToolDownload(new TextEncoder().encode("abd"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"), "checksum mismatch");
});

Deno.test("archive extraction rejects traversal and extracts files without external tools", async () => {
  await withTempDir(async (root) => {
    const data = new TextEncoder().encode("runtime fixture");
    await extractToolArchive(zipSync({ "node/bin/node": data }), "zip", root);
    assertEquals(await Deno.readTextFile(`${root}/node/bin/node`), "runtime fixture");
    for (const name of ["../escape", "/escape", "C:/escape", "node/../../escape", "node\\escape"]) {
      await rejects(() => archivePath(name), "Unsafe");
    }
    await rejects(() => extractToolArchive(zipSync({ "../escape": data }), "zip", root), "Unsafe");
  });
});

Deno.test("tar extraction preserves executable mode and omits symbolic links", async () => {
  await withTempDir(async (root) => {
    const tar = new Uint8Array(2048);
    const encoder = new TextEncoder();
    tar.set(encoder.encode("node/bin/node"));
    tar.set(encoder.encode("0000755\0"), 100);
    tar.set(encoder.encode("00000000003\0"), 124);
    tar[156] = 48;
    tar.set(encoder.encode("abc"), 512);
    tar.set(encoder.encode("node/bin/npm"), 1024);
    tar.set(encoder.encode("00000000000\0"), 1024 + 124);
    tar[1024 + 156] = 50;
    tar.set(encoder.encode("/outside"), 1024 + 157);
    await extractToolArchive(gzipSync(tar), "tar.gz", root);
    assertEquals(await Deno.readTextFile(`${root}/node/bin/node`), "abc");
    if (Deno.build.os !== "windows") assertEquals((await Deno.stat(`${root}/node/bin/node`)).mode! & 0o777, 0o755);
    await rejects(() => Deno.stat(`${root}/node/bin/npm`), "No such file");
  });
});

Deno.test("portable key store encrypts secrets, isolates names, and refuses wrong-password replacement", async () => {
  await withTempDir(async (root) => {
    const store = new PortableKeyStore(root, async () => "correct horse battery staple");
    await store.store({ service: "napplet", account: "../../default", secret: "private signing secret" });
    assertEquals(await store.retrieve("napplet", "../../default"), "private signing secret");
    assertEquals(await store.retrieve("other", "../../default"), null);
    assertEquals(await store.list("napplet"), ["../../default"]);
    for await (const file of Deno.readDir(root)) {
      const contents = await Deno.readTextFile(`${root}/${file.name}`);
      assert(!contents.includes("private signing secret"));
      assert(!contents.includes("correct horse"));
      if (Deno.build.os !== "windows") assertEquals((await Deno.stat(`${root}/${file.name}`)).mode! & 0o777, 0o600);
    }
    const wrong = new PortableKeyStore(root, async () => "a different long password");
    await rejects(() => wrong.retrieve("napplet", "../../default"), "incorrect password");
    await rejects(() => wrong.store({ service: "napplet", account: "../../default", secret: "replacement" }), "incorrect password");
    assertEquals(await store.retrieve("napplet", "../../default"), "private signing secret");
    assertEquals(await store.delete("napplet", "../../default"), true);
    assertEquals(await store.delete("napplet", "../../default"), false);
  });
});
