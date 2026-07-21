// Deliberately NON-conformant napplet fixture. It boots under injected
// window.napplet domains but then puts malformed traffic on the wire -- exactly
// the class of bug the conformance harness must catch:
//   1. a relay.subscribe missing its required subId + filters, and
//   2. a relay.event, which is a shell->napplet (inbound) type a napplet must never emit.
// Result: wire/envelope-well-formed fails -> non-conformant -> CLI exit 1.

if (window.napplet?.relay) {
  window.parent.postMessage({ type: 'relay.subscribe', id: 'bad1' }, '*'); // missing subId + filters
  window.parent.postMessage({ type: 'relay.event', subId: 'x', result: { event: {} } }, '*'); // inbound type emitted
}
