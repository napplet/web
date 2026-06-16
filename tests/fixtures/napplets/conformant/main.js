// Conformant napplet fixture. A real conformance subject by its wire behavior:
// it announces shell.ready, then — once the shell initializes — emits only
// well-formed envelopes in the NAP domains it declared in napplet-requires.

window.parent.postMessage({ type: 'shell.ready' }, '*');

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'shell.init') {
    // Emit a couple of valid, declared-NAP envelopes.
    window.parent.postMessage({ type: 'storage.get', id: 's1', key: 'greeting' }, '*');
    window.parent.postMessage({ type: 'identity.getPublicKey', id: 'i1' }, '*');
  }
});
