// Fixture for napplet/web#119. It must call the runtime-injected resource API
// directly during boot while still degrading cleanly when no domains are present.

const status = document.getElementById('status');

async function main() {
  if (!window.napplet?.resource || typeof window.napplet.resource.bytes !== 'function') {
    status.textContent = 'resource unavailable';
    return;
  }

  const blob = await window.napplet.resource.bytes('data:text/plain;base64,aGk=');
  const text = await blob.text();
  if (text !== 'hi') {
    throw new Error(`unexpected resource text: ${text}`);
  }
  status.textContent = text;
}

main();
