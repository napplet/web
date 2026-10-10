import { describe, expect, it } from 'vitest';
import { parseScreenshotArgs } from './screenshot.js';

describe('screenshot arguments', () => {
  it('uses a predictable PNG size and supports iframe readiness controls', () => {
    expect(parseScreenshotArgs(['http://localhost:5173'])).toEqual({ url: 'http://localhost:5173', output: 'preview.png', selector: 'iframe', width: 1200, height: 750, delay: 1500 });
    expect(parseScreenshotArgs(['https://example.org', '--selector', '#app', '--ready-selector', '.ready', '--width', '800', '--height', '600', '--delay', '0', '--output', 'notes.png'])).toMatchObject({ selector: '#app', readySelector: '.ready', width: 800, height: 600, delay: 0, output: 'notes.png' });
  });
  it('accepts local builds without a host URL', () => {
    expect(parseScreenshotArgs([])).toMatchObject({ directory: '.' });
    expect(parseScreenshotArgs(['./project'])).toMatchObject({ directory: './project' });
    expect(parseScreenshotArgs(['--artifact', '/tmp/dist/index.html'])).toMatchObject({ artifact: '/tmp/dist/index.html' });
    expect(() => parseScreenshotArgs(['./project', '--artifact', '/tmp/index.html'])).toThrow();
  });
  it.each([
    ['file:///etc/passwd'], ['http://localhost', '--width', '-1'], ['http://localhost', '--height', 'Infinity'], ['http://localhost', '--delay', 'NaN'], ['http://localhost', '--output', 'image.jpg'], ['http://localhost', '--selector'], ['http://localhost', '--unknown', 'x'],
  ])('rejects invalid input %j', (...args) => {
    expect(() => parseScreenshotArgs(args as string[])).toThrow();
  });
});
