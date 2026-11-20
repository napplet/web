import { commandDeploy, commandDeployProjects, runDeploy } from "../src/deploy-command.ts";
import { joinPath } from "../src/path.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

type DeployOne = typeof runDeploy;

async function workspace(dir: string): Promise<void> {
  for (const name of ["napplet1", "napplet2"]) {
    await Deno.mkdir(joinPath(dir, "napplets", name, ".napplet"), { recursive: true });
    await Deno.writeTextFile(joinPath(dir, "napplets", name, ".napplet", "config.yaml"), "version: 1\n");
  }
}

function recorder(fail: string[] = []) {
  const calls: { cwd: string; argv: string[] }[] = [];
  const deployOne: DeployOne = (argv) => {
    const cwd = Deno.realPathSync(Deno.cwd());
    calls.push({ cwd, argv });
    if (fail.some((name) => cwd.endsWith(name))) return Promise.reject(new Error("boom"));
    return Promise.resolve({ code: 0, report: {} as Awaited<ReturnType<DeployOne>>["report"], jsonOutput: true });
  };
  return { calls, deployOne };
}

async function inDir<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const previous = Deno.cwd();
  Deno.chdir(dir);
  try { return await fn(); } finally { Deno.chdir(previous); }
}

async function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const log = console.log, error = console.error;
  console.log = () => {};
  console.error = () => {};
  try { return await fn(); } finally { console.log = log; console.error = error; }
}

Deno.test("deploy --all without a root config deploys each project from its own directory", async () => {
  await withTempDir(async (dir) => {
    await workspace(dir);
    const root = Deno.realPathSync(dir);
    const { calls, deployOne } = recorder();
    const code = await inDir(dir, () => quiet(() =>
      commandDeployProjects(["--all", "--dry-run", "--json", "--sec", "nsec1x"], undefined, deployOne)
    ));
    assertEquals(code, 0);
    assertEquals(calls.map((call) => call.cwd), [
      joinPath(root, "napplets", "napplet1"),
      joinPath(root, "napplets", "napplet2"),
    ]);
    assertEquals(calls[0].argv, ["--dry-run", "--json", "--sec", "nsec1x", "--format", "current"]);
  });
});

Deno.test("deploy --all --name selects projects without overriding their d tags", async () => {
  await withTempDir(async (dir) => {
    await workspace(dir);
    const { calls, deployOne } = recorder();
    await inDir(dir, () => quiet(() =>
      commandDeployProjects(["--all", "--name", "napplet2", "--json", "--format", "legacy"], undefined, deployOne)
    ));
    assertEquals(calls.length, 1);
    assert(calls[0].cwd.endsWith("napplet2"));
    assertEquals(calls[0].argv, ["--json", "--format", "legacy"]);
  });
});

Deno.test("deploy --all keeps going after a failed project and reports failure", async () => {
  await withTempDir(async (dir) => {
    await workspace(dir);
    const { calls, deployOne } = recorder(["napplet1"]);
    const code = await inDir(dir, () => quiet(() => commandDeployProjects(["--all", "--json"], undefined, deployOne)));
    assertEquals(code, 1);
    assertEquals(calls.length, 2);
  });
});

Deno.test("deploy --all rejects --config and --source-dir when each napplet has its own config", async () => {
  await withTempDir(async (dir) => {
    await workspace(dir);
    for (const flag of ["--config", "--source-dir"]) {
      let message = "";
      await inDir(dir, () => commandDeployProjects(["--all", flag, "x"]).catch((error) => { message = error.message; }));
      assert(message.includes("cannot be combined with --all"), message);
    }
  });
});

Deno.test("bare deploy in a config-less root asks to search and runs --all on yes", async () => {
  await withTempDir(async (dir) => {
    await workspace(dir);
    const { calls, deployOne } = recorder();
    const questions: { message: string; defaultValue: boolean }[] = [];
    const code = await inDir(dir, () => quiet(() => commandDeploy(["--dry-run"], undefined, {
      interactive: true,
      confirmSearch: (message, defaultValue = false) => {
        questions.push({ message, defaultValue });
        return Promise.resolve(true);
      },
      deployProject: deployOne,
    })));
    assertEquals(code, 0);
    assertEquals(questions.length, 1);
    assertEquals(questions[0].defaultValue, false);
    assertEquals(calls.length, 2);
  });
});

Deno.test("bare deploy in a config-less root falls back to setup when the search is declined", async () => {
  await withTempDir(async (dir) => {
    await workspace(dir);
    const { calls, deployOne } = recorder();
    let message = "";
    await inDir(dir, () => commandDeploy(["--dry-run", "--json"], undefined, {
      interactive: true,
      confirmSearch: () => Promise.resolve(false),
      deployProject: deployOne,
    }).catch((error) => { message = error.message; }));
    assertEquals(calls.length, 0);
    assert(message.includes("napplet deploy --all"), message);
  });
});
