import { assert, assertEquals } from "./assert.ts";

const CLI_DIR = new URL("..", import.meta.url);

async function run(command: string, args: string[], options: Deno.CommandOptions = {}) {
  return await new Deno.Command(command, {
    args,
    stdout: "piped",
    stderr: "piped",
    ...options,
  }).output();
}

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

Deno.test("compiled napplet creates projects without a package resolver", async () => {
  const root = await Deno.makeTempDir({ prefix: "napplet-resolver-free-" });
  try {
    const binary = `${root}/napplet`;
    const template = `${root}/template`;
    const created = `${root}/created`;
    const emptyPath = `${root}/empty-path`;
    await Deno.mkdir(template);
    await Deno.mkdir(emptyPath);
    await Deno.writeTextFile(`${template}/package.json`, '{"name":"template","private":true}\n');

    const compiled = await run(Deno.execPath(), [
      "compile",
      "--no-check",
      "--node-modules-dir=none",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--allow-env",
      "--allow-net",
      "--output",
      binary,
      "src/standalone.ts",
    ], { cwd: new URL(".", CLI_DIR) });
    assertEquals(compiled.code, 0, text(compiled.stderr));

    const environment = {
      PATH: emptyPath,
      HTTP_PROXY: "http://127.0.0.1:9",
      HTTPS_PROXY: "http://127.0.0.1:9",
      NO_PROXY: "",
    };
    const create = await run(binary, ["create", created, "--template", template], {
      env: environment,
      cwd: root,
    });
    assertEquals(create.code, 0, text(create.stderr));
    assertEquals(JSON.parse(await Deno.readTextFile(`${created}/package.json`)), {
      name: "created",
      private: true,
    });

    const skills = await run(binary, ["skills", "list"], { env: environment, cwd: root });
    assertEquals(skills.code, 2);
    assert(text(skills.stderr).includes("Unknown command: skills"));

    const invalidCreate = await run(binary, ["create", "--variant", "unsupported", "--yes"], {
      env: environment,
      cwd: root,
    });
    assertEquals(invalidCreate.code, 1);
    assert(text(invalidCreate.stderr).includes("@napplet/boilerplate: Unsupported variant"));
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
