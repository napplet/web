// Deliberately NON-conformant napplet fixture. It boots under injected
// window.napplet domains but then bypasses the runtime and posts NAP traffic at
// window level -- exactly the class of bug the conformance harness must catch.
// NIP-5D carries every NAP message over the port the bootstrap handed to the
// shell in napplet.hello, so a shell revokes this napplet and removes its frame.
// Result: wire/port-only fails -> non-conformant -> CLI exit 1.

if (window.napplet?.relay) {
  window.parent.postMessage({ type: 'relay.subscribe', id: 'bad1' }, '*'); // window-level, and missing subId + filters
}
