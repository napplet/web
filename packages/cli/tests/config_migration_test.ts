import { parse } from "yaml";
import { migrateConfig } from "../src/config-migration.ts";
import { withInteraction } from "../src/interaction.ts";
import { readConfig, writeConfig, defaultConfig } from "../src/config.ts";
import { main } from "../src/cli.ts";
import { prepareCommand } from "../src/cli-args.ts";
import { collectFlags } from "../src/flags.ts";
import { renderConfigYaml } from "../src/config-storage.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

const quiet = { print: (_message: string) => {} };
const legacyText = '{\n  "version": 1, "sourceDir": "dist", "named": ["001"],\n  "extra": {"on": "yes", "enabled": false, "items": [null, 42]}\n}\n';

async function rejects(action: () => Promise<unknown>, expected: string): Promise<void> {
  try { await action(); } catch (error) {
    assert(String(error).includes(expected), String(error));
    return;
  }
  throw new Error(`Expected rejection containing ${expected}`);
}

async function missing(path: string): Promise<void> {
  try { await Deno.stat(path); } catch (error) {
    if (error instanceof Deno.errors.NotFound) return;
    throw error;
  }
  throw new Error(`Expected missing file: ${path}`);
}

Deno.test("migration asks consent, preserves values and original bytes, and is idempotent", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, legacyText);
    let prompts = 0;
    const migrated = await migrateConfig(path, {
      ...quiet, interactive: true,
      prompt: async (message) => { prompts++; assert(message.includes("config.yaml")); return "YES"; },
    });
    assertEquals(prompts, 1);
    assertEquals(migrated, `${dir}/config.yaml`);
    assertEquals(await Deno.readTextFile(`${path}.bak`), legacyText);
    assertEquals(parse(await Deno.readTextFile(migrated)), JSON.parse(legacyText));
    assertEquals((await readConfig(path))?.named, ["001"]);
    await missing(path);
    assertEquals(await migrateConfig(path, { ...quiet, prompt: () => { throw new Error("Unexpected prompt"); } }), migrated);
  });
});

Deno.test("declining or cancelling migration leaves every file untouched", async () => {
  for (const answer of ["n", "no", "", "anything", "cancel"]) {
    await withTempDir(async (dir) => {
      const path = `${dir}/config.json`;
      await Deno.writeTextFile(path, legacyText);
      await rejects(() => migrateConfig(path, {
        ...quiet, interactive: true, prompt: async () => {
          if (answer === "cancel") throw new Error("Prompt cancelled");
          return answer;
        },
      }), answer === "cancel" ? "Prompt cancelled" : "Cannot continue without migrating");
      assertEquals(await Deno.readTextFile(path), legacyText);
      assertEquals([...Deno.readDirSync(dir)].map((entry) => entry.name), ["config.json"]);
    });
  }
});

Deno.test("noninteractive migration requires explicit approval", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/custom.json`;
    await Deno.writeTextFile(path, legacyText);
    await rejects(() => migrateConfig(path, { interactive: false }), "--migrate-config");
    const migrated = await migrateConfig(`${dir}/custom.yml`, { ...quiet, approve: true, interactive: false });
    assertEquals(migrated, `${dir}/custom.yml`);
    assertEquals((await readConfig(migrated))?.sourceDir, "dist");
  });
});

Deno.test("malformed JSON, invalid shape and nonfinite values never create migration files", async () => {
  for (const raw of ["{", "[]", "null", '{"extra": 1e999}']) {
    await withTempDir(async (dir) => {
      const path = `${dir}/config.json`;
      await Deno.writeTextFile(path, raw);
      await rejects(() => migrateConfig(path, { approve: true }), raw === "{" ? "Invalid JSON" : raw.includes("extra") ? "finite" : "Config must");
      assertEquals([...Deno.readDirSync(dir)].map((entry) => entry.name), ["config.json"]);
      assertEquals(await Deno.readTextFile(path), raw);
    });
  }
});

Deno.test("conflicting YAML or backup is never overwritten", async () => {
  for (const suffix of [".yaml", ".json.bak"]) {
    await withTempDir(async (dir) => {
      const path = `${dir}/config.json`;
      const conflict = `${dir}/config${suffix}`;
      await Deno.writeTextFile(path, legacyText);
      await Deno.writeTextFile(conflict, suffix === ".yaml" ? "sourceDir: other\n" : "original backup");
      await rejects(() => migrateConfig(path, { approve: true }), suffix === ".yaml" ? "Both" : "backup already exists");
      assertEquals(await Deno.readTextFile(path), legacyText);
      assertEquals(await Deno.readTextFile(conflict), suffix === ".yaml" ? "sourceDir: other\n" : "original backup");
    });
  }
});

Deno.test("migration resumes after backup or YAML creation without replacing either file", async () => {
  for (const hasYaml of [false, true]) {
    await withTempDir(async (dir) => {
      const path = `${dir}/config.json`;
      await Deno.writeTextFile(path, legacyText);
      await Deno.writeTextFile(`${path}.bak`, legacyText);
      const yaml = "# recovered document\n" + renderConfigYaml(JSON.parse(legacyText));
      if (hasYaml) await Deno.writeTextFile(`${dir}/config.yaml`, yaml);
      await migrateConfig(path, { ...quiet, approve: true });
      await missing(path);
      assertEquals(await Deno.readTextFile(`${path}.bak`), legacyText);
      if (hasYaml) assertEquals(await Deno.readTextFile(`${dir}/config.yaml`), yaml);
    });
  }
});

Deno.test("config readers and writers cannot bypass legacy consent", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, legacyText);
    await rejects(() => readConfig(path), "Cannot continue without migrating");
    await rejects(() => writeConfig(defaultConfig(), `${dir}/config.yaml`), "Cannot continue without migrating");
    assertEquals(await Deno.readTextFile(path), legacyText);
    await missing(`${dir}/config.yaml`);
  });
});

Deno.test("CLI refusal prevents init, deployment, keys, and runner side effects", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, legacyText);
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (message) => errors.push(String(message));
    try {
      for (const command of [["init", "--force"], ["deploy"], ["debug"], ["discover"], ["keys", "delete"], ["conformance"], ["paja"]]) {
        assertEquals(await main([...command, "--config", path], {
          configMigration: { interactive: true, prompt: async () => "n" },
        }), 1);
      }
      assertEquals(errors.length, 7);
      assert(errors.every((message) => message === "Cannot continue without migrating"));
      assertEquals(await Deno.readTextFile(path), legacyText);
      await missing(`${dir}/config.yaml`);
    } finally { console.error = originalError; }
  });
});

Deno.test("CLI disables migration prompts with -i, --non-interactive, and --json", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, legacyText);
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (message) => errors.push(String(message));
    try {
      for (const argv of [
        ["-i", "init"], ["init", "-i"], ["init", "--non-interactive"],
        ["debug", "--json"], ["-i", "keys", "use"],
        ["-i", "conformance", "--config", path, "--", "--reporter", "json"],
      ]) {
        const args = argv.includes("--config") ? argv : [...argv, "--config", path];
        assertEquals(await main(args, { configMigration: {
          interactive: true, prompt: () => { throw new Error("Unexpected prompt"); },
        } }), 1);
      }
      assertEquals(errors.length, 6);
      assert(errors.every((message) => message.includes("Cannot continue without migrating")));
      assertEquals(await Deno.readTextFile(path), legacyText);
    } finally { console.error = originalError; }
  });
});

Deno.test("CLI explicit migration updates the custom path for the same invocation", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, legacyText);
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (message) => output.push(String(message));
    try {
      assertEquals(await main(["--migrate-config", "-i", "init", "--config", path], {
        configMigration: quiet,
      }), 0);
      assert(output.join("\n").includes("config.yaml"));
      assertEquals((await readConfig(`${dir}/config.yaml`))?.sourceDir, "dist");
    } finally { console.log = originalLog; }
  });
});

Deno.test("a failed final removal leaves recoverable files and retry completes", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, legacyText);
    const remove = Deno.remove;
    Deno.remove = (target, options) => {
      if (target === path) return Promise.reject(new Deno.errors.PermissionDenied("simulated removal failure"));
      return remove(target, options);
    };
    try {
      await rejects(() => migrateConfig(path, { ...quiet, approve: true }), "simulated removal failure");
    } finally { Deno.remove = remove; }
    assertEquals(await Deno.readTextFile(path), legacyText);
    assertEquals(await Deno.readTextFile(`${path}.bak`), legacyText);
    assertEquals(parse(await Deno.readTextFile(`${dir}/config.yaml`)), JSON.parse(legacyText));
    await migrateConfig(path, { ...quiet, approve: true });
    await missing(path);
  });
});

Deno.test("an edit during consent is not removed by migration", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, legacyText);
    const edited = '{"sourceDir":"new-build"}';
    await rejects(() => migrateConfig(path, {
      ...quiet, interactive: true, prompt: async () => {
        await Deno.writeTextFile(path, edited);
        return "y";
      },
    }), "Configuration changed during migration");
    assertEquals(await Deno.readTextFile(path), edited);
    assertEquals(await Deno.readTextFile(`${path}.bak`), legacyText);
  });
});

Deno.test("leading migration flags preserve keys subcommands and child arguments", async () => {
  await withTempDir(async (dir) => {
    for (const command of [["keys", "use"], ["conformance"]]) {
      const path = `${dir}/${command[0]}.json`;
      await Deno.writeTextFile(path, legacyText);
      const parsed = await prepareCommand([
        "--migrate-config", "-i", ...command, "--config", path, "--", "--reporter", "json",
      ], quiet);
      assertEquals(parsed.command, command[0]);
      if (command[0] === "keys") assertEquals(parsed.rest[0], "use");
      const flags = collectFlags(parsed.rest);
      assertEquals(flags.afterDoubleDash, ["--reporter", "json"]);
      assertEquals(flags.values.get("config"), [path.replace(".json", ".yaml")]);
      assert(flags.boolean.has("non-interactive"));
      await missing(path);
    }
  });
});

Deno.test("migration obeys the invocation prompt policy for library and command preparation", async () => {
  for (const interactive of [true, false]) {
    for (const prepare of [migrateConfig, prepareCommand]) {
      await withTempDir(async (dir) => {
        const path = `${dir}/config.json`;
        await Deno.writeTextFile(path, legacyText);
        let prompts = 0;
        const options = { ...quiet, prompt: async () => { prompts++; return "n"; } };
        await withInteraction({ interactive, color: false }, async () => {
          await rejects(() => prepare === migrateConfig
            ? migrateConfig(path, options)
            : prepareCommand(["init", "--config", path], options), "Cannot continue without migrating");
        });
        assertEquals(prompts, interactive ? 1 : 0);
        assertEquals(await Deno.readTextFile(path), legacyText);
        await missing(`${dir}/config.yaml`);
      });
    }
  }
});

Deno.test("command-specific help stays available with an unmigrated configuration", async () => {
  await withTempDir(async (dir) => {
    const path = `${dir}/config.json`;
    await Deno.writeTextFile(path, legacyText);
    const log = console.log;
    const output: string[] = [];
    console.log = (message) => output.push(String(message));
    try {
      for (const command of ["init", "deploy", "debug", "discover", "keys", "conformance", "paja"]) {
        assertEquals(await main([command, "--help", "--config", path], {
          configMigration: { interactive: true, prompt: () => { throw new Error("Unexpected migration prompt"); } },
        }), 0);
      }
      assertEquals(output.length, 7);
      assertEquals(await Deno.readTextFile(path), legacyText);
      await missing(`${dir}/config.yaml`);
    } finally { console.log = log; }
  });
});
