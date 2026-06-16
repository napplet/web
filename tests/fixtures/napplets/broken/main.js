// Deliberately NON-conformant napplet fixture. It boots correctly (announces
// shell.ready) but then puts malformed traffic on the wire — exactly the class of
// bug the conformance harness must catch:
//   1. a relay.subscribe missing its required subId + filters, and
//   2. a relay.event, which is a shell->napplet (inbound) type a napplet must never emit.
// Result: wire/envelope-well-formed fails -> non-conformant -> CLI exit 1.

window.parent.postMessage({ type: 'shell.ready' }, '*');

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'shell.init') {
    window.parent.postMessage({ type: 'relay.subscribe', id: 'bad1' }, '*'); // missing subId + filters
    window.parent.postMessage({ type: 'relay.event', subId: 'x', event: {} }, '*'); // inbound type emitted
  }
});
