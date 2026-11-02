import { describe, expect, it } from 'vitest';
import { nestedHelloSource } from './adversarial';

describe('nestedHelloSource', () => {
  it('embeds the token, targets the shell via parent.parent, and transfers exactly one port', () => {
    const source = nestedHelloSource('tok-123');
    expect(source).toContain('"tok-123"');
    expect(source).toContain("parent.parent.postMessage({ type: 'napplet.hello' }, '*', [channel.port2])");
    expect(source).toContain("parent.postMessage({ token: token, stage: stage, got: got }, '*')");
  });

  it('cannot break out of its own script element', () => {
    const source = nestedHelloSource('</script><img src=x>');
    const body = source.slice(source.indexOf('<script>') + '<script>'.length);
    // Exactly one closing tag: the real terminator at the end, never one from the token.
    expect(body.indexOf('</script>')).toBe(body.lastIndexOf('</script>'));
    expect(body.endsWith('</script></body></html>')).toBe(true);
    expect(body).toContain('<\\/script><img src=x>');
  });
});
