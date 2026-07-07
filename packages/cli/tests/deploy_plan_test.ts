import { defaultConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import {
  NAPPLET_KIND_NAMED,
  NAPPLET_KIND_ROOT,
  NAPPLET_KIND_SNAPSHOT,
  type NappletCandidate,
} from "../src/types.ts";
import { assertEquals } from "./assert.ts";

const candidate: NappletCandidate = {
  name: "feed",
  dir: "/tmp/feed/dist",
  indexHtml: "/tmp/feed/dist/index.html",
};

Deno.test("createDeployPlan expands named deploys and optional snapshots", () => {
  const plan = createDeployPlan(
    defaultConfig({ named: ["feed"] }),
    [candidate],
    { snapshot: true },
  );
  assertEquals(plan.items.map((item) => item.kind), [NAPPLET_KIND_NAMED, NAPPLET_KIND_SNAPSHOT]);
  assertEquals(plan.items[0].dTag, "feed");
  assertEquals(plan.items[1].snapshotSource, {
    target: "named",
    kind: NAPPLET_KIND_NAMED,
    dTag: "feed",
  });
});

Deno.test("createDeployPlan supports root deploys", () => {
  const plan = createDeployPlan(defaultConfig(), [candidate], { root: true });
  assertEquals(plan.items.map((item) => item.kind), [NAPPLET_KIND_ROOT]);
});

Deno.test("createDeployPlan can add snapshots alongside an explicit root deploy", () => {
  const plan = createDeployPlan(defaultConfig(), [candidate], { root: true, snapshot: true });
  assertEquals(plan.items.map((item) => item.kind), [NAPPLET_KIND_ROOT, NAPPLET_KIND_SNAPSHOT]);
  assertEquals(plan.items[1].snapshotSource, {
    target: "root",
    kind: NAPPLET_KIND_ROOT,
    dTag: undefined,
  });
});

Deno.test("createDeployPlan creates snapshot companions for root and named deploys", () => {
  const plan = createDeployPlan(
    defaultConfig(),
    [candidate],
    { root: true, names: ["feed"], snapshot: true },
  );
  assertEquals(plan.items.map((item) => [item.target, item.dTag ?? null]), [
    ["root", null],
    ["snapshot", null],
    ["named", "feed"],
    ["snapshot", null],
  ]);
  assertEquals(plan.items[1].snapshotSource?.target, "root");
  assertEquals(plan.items[3].snapshotSource, {
    target: "named",
    kind: NAPPLET_KIND_NAMED,
    dTag: "feed",
  });
});

const feed: NappletCandidate = {
  name: "feed",
  dir: "/repo/feed",
  indexHtml: "/repo/feed/index.html",
};
const wiki: NappletCandidate = {
  name: "wiki",
  dir: "/repo/wiki",
  indexHtml: "/repo/wiki/index.html",
};

Deno.test("createDeployPlan monorepo mode uses each folder name as its own d tag", () => {
  const plan = createDeployPlan(defaultConfig(), [feed, wiki], {}, { traverse: true });
  assertEquals(plan.items.map((item) => [item.target, item.dTag ?? null]), [
    ["named", "feed"],
    ["named", "wiki"],
  ]);
});

Deno.test("createDeployPlan monorepo mode does not cross-product candidates and names", () => {
  const plan = createDeployPlan(
    defaultConfig({ named: ["feed", "wiki"] }),
    [feed, wiki],
    {},
    { traverse: true },
  );
  // Each folder deploys once under its own name, not four (candidates x names) items.
  assertEquals(plan.items.map((item) => item.dTag), ["feed", "wiki"]);
});

Deno.test("createDeployPlan monorepo name filter selects matching folders", () => {
  const plan = createDeployPlan(defaultConfig(), [feed, wiki], { names: ["wiki"] }, {
    traverse: true,
  });
  assertEquals(plan.items.map((item) => [item.target, item.dTag ?? null]), [["named", "wiki"]]);
});

Deno.test("createDeployPlan monorepo mode rejects folder names that are invalid d tags", () => {
  const bad: NappletCandidate = {
    name: "My_Feed",
    dir: "/repo/My_Feed",
    indexHtml: "/repo/My_Feed/index.html",
  };
  let threw = false;
  try {
    createDeployPlan(defaultConfig(), [bad], {}, { traverse: true });
  } catch (error) {
    threw = true;
    assertEquals(error instanceof Error && error.message.includes("My_Feed"), true);
  }
  assertEquals(threw, true);
});

Deno.test("createDeployPlan monorepo mode carries snapshot companions per folder", () => {
  const plan = createDeployPlan(
    defaultConfig({ named: ["feed", "wiki"] }),
    [feed, wiki],
    { snapshot: true },
    { traverse: true },
  );
  assertEquals(plan.items.map((item) => [item.target, item.dTag ?? null]), [
    ["named", "feed"],
    ["snapshot", null],
    ["named", "wiki"],
    ["snapshot", null],
  ]);
  assertEquals(plan.items[1].snapshotSource?.dTag, "feed");
  assertEquals(plan.items[3].snapshotSource?.dTag, "wiki");
});
