// Fixture: uses a prototyped, non-NAP `mesh` domain when the runtime exposes it
// and degrades when it doesn't (NIP-5D: presence is the only availability signal).

const status = document.getElementById('status');

if (window.napplet?.mesh) {
  window.napplet.mesh.publish('hello');
  status.textContent = 'published';
} else {
  status.textContent = 'mesh unavailable';
}
