// Experimental `mesh` domain for the conformance e2e: registered after the shim
// prelude and before activation, it publishes over the runtime's scoped channel.
globalThis.NappletShimPrelude.registerExtension({
  domain: 'mesh',
  create: (channel) => ({
    publish: (topic) => channel.send({ type: 'mesh.publish', topic }),
  }),
});
