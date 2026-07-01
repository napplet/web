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
});

Deno.test("createDeployPlan supports root deploys", () => {
  const plan = createDeployPlan(defaultConfig(), [candidate], { root: true });
  assertEquals(plan.items.map((item) => item.kind), [NAPPLET_KIND_ROOT]);
});

Deno.test("createDeployPlan can add snapshots alongside an explicit root deploy", () => {
  const plan = createDeployPlan(defaultConfig(), [candidate], { root: true, snapshot: true });
  assertEquals(plan.items.map((item) => item.kind), [NAPPLET_KIND_ROOT, NAPPLET_KIND_SNAPSHOT]);
});
