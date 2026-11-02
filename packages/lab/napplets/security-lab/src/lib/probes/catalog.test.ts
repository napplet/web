// Catalog-level invariants. These pin what the published lab promises: which
// NIP-5D sections are covered, that nothing destructive can run unarmed, and
// that no probe ever sends a window-level message outside the destructive
// group (a compliant shell would revoke the lab mid-"run all").

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { probeCatalog, baselineProbes, runtimeProbes, adversarialProbes, destructiveProbes, LEVEL_ORDER, levelLabels } from './index';
import { validateCatalog, runAllOrder, createRows } from '../runner';
import { REQUIRED_DOMAINS, OPTIONAL_DOMAINS, NAPPLET_ID } from '../manifest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('probe catalog', () => {
  it('is well-formed', () => {
    expect(validateCatalog(probeCatalog)).toEqual([]);
  });

  it('orders levels baseline -> runtime -> adversarial -> destructive', () => {
    const levels = probeCatalog.map((probe) => probe.level);
    const firstIndex = LEVEL_ORDER.map((level) => levels.indexOf(level));
    expect(firstIndex).toEqual([...firstIndex].sort((a, b) => a - b));
    expect(Object.keys(levelLabels).sort()).toEqual([...LEVEL_ORDER].sort());
  });

  it('keeps every destructive probe out of run all', () => {
    const order = runAllOrder(createRows(probeCatalog));
    for (const probe of destructiveProbes) expect(order).not.toContain(probe.id);
    expect(order).toHaveLength(probeCatalog.length - destructiveProbes.length);
  });

  it('covers the NIP-5D boundaries the lab advertises', () => {
    const ids = probeCatalog.map((probe) => probe.id);
    expect(ids).toEqual(expect.arrayContaining([
      // Transport / sandbox
      'origin.null', 'document.srcdoc', 'document.referrer', 'popup.open',
      // CSP advisory
      'csp.meta.present', 'csp.meta.first', 'csp.baseline', 'csp.eval', 'csp.function', 'csp.wasm', 'csp.import.external',
      'network.fetch.external', 'network.websocket.external', 'worker.blob', 'frame.child.external', 'base.uri', 'form.submit',
      // Storage prohibition
      'storage.local', 'storage.session', 'storage.indexeddb', 'storage.cookie', 'storage.cache', 'storage.serviceworker',
      // Namespace injection
      'runtime.namespace.present', 'runtime.namespace.shape', 'runtime.port.unreachable', 'runtime.declared.required',
      // NIP-07 prohibition
      'nip07.window', 'nostr.sign.ambient', 'nostr.encrypt.ambient', 'nostr.publish.ambient',
      // Source check for nested frames + documented gaps
      'nested.hello.dropped', 'parent.length', 'webrtc.direct',
      // Identity revocation (destructive)
      'revoke.window.message', 'revoke.forged.result', 'revoke.second.hello', 'revoke.self.navigation',
      // kehto/web#382: host-page frame-src lock against self-replacement with unverified documents
      'frame.lock.blob',
    ]));
  });

  it('has a runtime probe for every declared R domain and the optional theme domain', () => {
    const runtimeIds = runtimeProbes.map((probe) => probe.id);
    for (const domain of REQUIRED_DOMAINS) {
      expect(runtimeIds.some((id) => id.startsWith(`runtime.${domain}`)), domain).toBe(true);
    }
    for (const domain of OPTIONAL_DOMAINS) {
      expect(runtimeIds.some((id) => id.startsWith(`runtime.${domain}`)), domain).toBe(true);
    }
  });

  it('marks documented non-guarantees as info-only spec gaps', () => {
    for (const id of ['parent.length', 'webrtc.direct']) {
      const probe = probeCatalog.find((candidate) => candidate.id === id);
      expect(probe?.expectedResult).toBe('documented-gap');
      expect(probe?.severity).toBe('info');
      expect(probe?.ownerArea).toBe('spec-gap');
    }
  });

  it('only destructive probes post window-level messages from the lab window', () => {
    // Nested-frame hello is posted from the *nested* document's realm (its source
    // text lives in a string), so it is the only allowed occurrence outside
    // destructive.ts.
    const safeFiles = ['src/lib/probes/baseline.ts', 'src/lib/probes/runtime.ts', 'src/lib/probes/helpers.ts', 'src/main.ts', 'src/App.svelte'];
    for (const file of safeFiles) {
      expect(read(file), file).not.toMatch(/window\.parent\.postMessage|parent\.postMessage\(/);
    }
    const adversarial = read('src/lib/probes/adversarial.ts');
    const outsideTemplate = adversarial.replace(/nestedHelloSource[\s\S]*?\n}\n/, '');
    expect(outsideTemplate).not.toMatch(/window\.parent\.postMessage|parent\.postMessage\(/);
    expect(read('src/lib/probes/destructive.ts')).toMatch(/window\.parent\.postMessage/);
  });

  it('never imports a window-level theme client', () => {
    expect(read('src/main.ts')).not.toMatch(/@hyprgate|installBuiltInThemeClient/);
    expect(read('src/main.ts')).toMatch(/themeGet/);
  });
});

describe('manifest declarations', () => {
  it('feed the vite build and the runtime probes from the same source', () => {
    const vite = read('vite.config.ts');
    expect(vite).toMatch(/REQUIRED_DOMAINS/);
    expect(vite).toMatch(/OPTIONAL_DOMAINS/);
    expect(vite).toMatch(/NAPPLET_ID/);
    expect(NAPPLET_ID).toBe('security-lab');
    expect([...REQUIRED_DOMAINS]).toEqual(['identity', 'relay', 'inc', 'storage', 'resource']);
  });

  it('the INC probe uses the public two-argument emit binding', () => {
    expect(read('src/lib/probes/runtime.ts')).toContain("inc.emit('napplet-lab:runtime-inc-probe', { inert: true });");
  });
});

describe('level groupings', () => {
  it('every probe lives in exactly one level file', () => {
    const grouped = [...baselineProbes, ...runtimeProbes, ...adversarialProbes, ...destructiveProbes].map((probe) => probe.id).sort();
    expect(grouped).toEqual(probeCatalog.map((probe) => probe.id).sort());
    expect(baselineProbes.every((probe) => probe.level === 'baseline')).toBe(true);
    expect(runtimeProbes.every((probe) => probe.level === 'runtime-mediated')).toBe(true);
    expect(adversarialProbes.every((probe) => probe.level === 'safe-adversarial')).toBe(true);
    expect(destructiveProbes.every((probe) => probe.level === 'destructive')).toBe(true);
  });
});

describe('artifact safety', () => {
  // Shells and tooling splice their bootstrap into the artifact by matching
  // markup such as the first CSP meta or the first <head>. Because the whole
  // app is inlined into index.html, any such literal inside our JS would be
  // matched instead and the injected </script> would cut our code in half
  // (observed with napplet-conformance's screenshot capture).
  it('keeps HTML-looking literals out of every source file that ends up inlined', () => {
    const files = [
      'src/main.ts', 'src/App.svelte', 'src/lib/csp.ts', 'src/lib/namespace.ts', 'src/lib/theme.ts',
      'src/lib/runner.ts', 'src/lib/probe-result.ts', 'src/lib/manifest.ts', 'src/lib/columns.ts', 'src/lib/preferences.ts',
      'src/lib/probes/helpers.ts', 'src/lib/probes/baseline.ts', 'src/lib/probes/runtime.ts',
      'src/lib/probes/adversarial.ts', 'src/lib/probes/destructive.ts', 'src/lib/probes/index.ts',
    ];
    const forbidden = /<\/?(?:meta|head|html|body|script|link|style|base)\b/i;
    for (const file of files) {
      const source = read(file);
      // Svelte markup is compiled, not inlined verbatim; only check its script block.
      const subject = file.endsWith('.svelte') ? (source.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? '') : source;
      // Comments never reach the minified bundle; only code and string literals matter.
      const code = subject.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
      expect(code, file).not.toMatch(forbidden);
    }
  });

  it('builds the nested-frame document without literal tag text at authoring time', () => {
    const source = read('src/lib/probes/adversarial.ts');
    expect(source).toMatch(/String\.fromCharCode\(60\)|LT/);
  });
});
