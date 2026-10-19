import { verifyEvent } from "nostr-tools";
import { defaultConfig } from "../src/config.ts";
import { createDeployPlan } from "../src/deploy-plan.ts";
import { createDeployManifestTemplates, createSnapshotManifestTemplate } from "../src/manifest.ts";
import { createPrivateKeySigner, signDeployManifestTemplates } from "../src/signing.ts";
import { prepareZapstorePublication } from "../src/zapstore.ts";
import { assert, assertEquals, withTempDir } from "./assert.ts";

for (const format of ["current", "legacy"] as const) {
  Deno.test(`${format} publications include signed client attribution on every event kind`, async () => {
    await withTempDir(async (dir) => {
      await Deno.writeTextFile(`${dir}/index.html`, '<meta name="description" content="Notes">');
      const signer = createPrivateKeySigner("01".padStart(64, "0"));
      const config = defaultConfig({
        sourceDir: dir,
        zapstore: { enabled: true, id: "org.example.notes", name: "Notes" },
      });
      const plan = createDeployPlan(config, [{ name: "notes", dir, indexHtml: `${dir}/index.html` }],
        { root: true, names: ["notes"], snapshot: true });
      const manifests = await createDeployManifestTemplates(plan, config, { format, sourcePubkey: signer.pubkey });
      assertEquals(manifests.map((manifest) => manifest.template?.kind), [15129, 5129, 35129, 5129]);
      const application = await prepareZapstorePublication(config, []);
      assert(application);
      const signed = await signDeployManifestTemplates(manifests, signer);
      for (const template of [...manifests.map((manifest) => manifest.template!), application.template]) {
        assertEquals(template.tags.filter((tag) => tag[0] === "client"), [["client", "napplet.run"]]);
      }
      for (const event of [...signed.map((manifest) => manifest.signedEvent!), await signer.sign(application.template)]) {
        assert(verifyEvent(event));
        assertEquals(event.tags.filter((tag) => tag[0] === "client"), [["client", "napplet.run"]]);
      }
      const source = manifests[0].template!;
      const inherited = { ...source, tags: [...source.tags, ["client", "other-publisher"]] };
      const before = JSON.stringify(inherited);
      const snapshot = createSnapshotManifestTemplate(inherited, { kind: 15129, pubkey: signer.pubkey });
      assertEquals(snapshot.tags.filter((tag) => tag[0] === "client"), [["client", "napplet.run"]]);
      assertEquals(snapshot.tags.filter((tag) => tag[0] === "x"), source.tags.filter((tag) => tag[0] === "x"));
      assertEquals(JSON.stringify(inherited), before);
    });
  });
}
