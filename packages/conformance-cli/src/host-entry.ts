/**
 * @napplet/conformance-cli -- Browser host bundle entry.
 *
 * This is bundled (with the @napplet/conformance engine inlined) and served to the
 * Playwright host page. It exposes a single global the page calls to boot the
 * napplet iframe and collect host-observable evidence.
 *
 * @packageDocumentation
 */

import { bootAndCollect, type BootOptions, type BootCollection } from '@napplet/conformance';

declare global {
  interface Window {
    NappletConformanceHost?: { run(opts: BootOptions): Promise<BootCollection> };
    __conformanceBoot__?: BootCollection;
    __conformanceError__?: string;
  }
}

window.NappletConformanceHost = {
  run(opts: BootOptions): Promise<BootCollection> {
    return bootAndCollect(opts);
  },
};
