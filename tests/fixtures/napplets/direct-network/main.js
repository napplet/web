// Fixture: reaches for the network directly instead of through a NAP domain.
// Under the NIP-5D baseline CSP these requests are blocked; the conformance
// report should warn about them without failing the run.

const status = document.getElementById('status');

fetch('https://api.example.invalid/data').catch(() => undefined);
try {
  new WebSocket('wss://relay.example.invalid');
} catch {
  /* CSP may throw synchronously; the violation event is what we observe */
}
status.textContent = 'tried';
