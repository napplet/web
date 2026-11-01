// Conformant napplet fixture. The conformance runtime injects window.napplet
// before this module runs. The fixture talks to the shell only through those
// domain objects, which carry its envelopes over the NIP-5D napplet.hello port.

if (window.napplet?.storage && window.napplet?.identity) {
  window.napplet.storage.getItem('greeting').catch(() => {});
  window.napplet.identity.getPublicKey().catch(() => {});
}
