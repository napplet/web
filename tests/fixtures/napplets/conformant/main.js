// Conformant napplet fixture. The conformance runtime injects window.napplet
// before this module runs. The fixture emits only well-formed envelopes in the
// NAP domains it declared in napplet-requires.

if (window.napplet?.storage && window.napplet?.identity) {
  window.parent.postMessage({ type: 'storage.get', id: 's1', key: 'greeting' }, '*');
  window.parent.postMessage({ type: 'identity.getPublicKey', id: 'i1' }, '*');
}
