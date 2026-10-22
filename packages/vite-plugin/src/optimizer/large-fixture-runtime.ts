/**
 * Browser-like execution harness for the generated large-fixture artifact.
 *
 * This runs the emitted loader and rewritten application script together. It
 * deliberately stubs only the browser surfaces unrelated to resource loading.
 */

import * as crypto from 'crypto';
import * as vm from 'node:vm';
import type { ResourceTableEntry } from './loader.js';

interface PrivateLoader {
  response(source: string): Promise<Response>;
}

interface FixtureWindow {
  napplet: object;
  __nappletPrivateResourceLoader?: PrivateLoader;
}

function executableScripts(html: string): Array<{ attributes: string; source: string }> {
  return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match) => ({ attributes: match[1] ?? '', source: match[2] ?? '' }));
}

/** Execute the real emitted loader and application callsites against exact uploaded bytes. */
export async function executeFinalArtifact(
  finalHtml: string,
  entries: ResourceTableEntry[],
  uploaded: Map<string, Uint8Array>,
  sha256: (bytes: Uint8Array) => string,
): Promise<string[]> {
  const scripts = executableScripts(finalHtml);
  const loaderScript = scripts.find((script) => script.source.includes('window.__nappletPrivateResourceLoader ='))?.source;
  const applicationScript = scripts.find((script) => /type=["']module["']/.test(script.attributes) && script.source.includes('__nappletPrivateResourceLoader.response'))?.source;
  if (!loaderScript || !applicationScript) throw new Error('fixture final HTML is missing executable optimized scripts');

  const requestedUris: string[] = [];
  const executedSources: string[] = [];
  const pending: Promise<Response>[] = [];
  const runtimeWindow: FixtureWindow = {
    napplet: { resource: {
      bytes: async (uri: string) => {
        requestedUris.push(uri);
        const bytes = uploaded.get(uri);
        if (!bytes) throw new Error(`final artifact requested an unknown URI: ${uri}`);
        return new Blob([bytes]);
      },
      bytesMany: async () => { throw new Error('final callsites must execute the generated single-resource path'); },
    } },
  };
  const document = {
    createElement: () => ({ relList: { supports: () => true } }),
    getElementById: () => null,
  };
  const context = vm.createContext({
    window: runtimeWindow,
    document,
    crypto: crypto.webcrypto,
    Blob,
    Response,
    URL,
    Uint8Array,
    AbortController,
    DOMException,
    requestAnimationFrame: (callback: (timestamp: number) => void) => {
      queueMicrotask(() => callback(0));
      return 1;
    },
  });
  vm.runInContext(loaderScript, context);
  const loader = runtimeWindow.__nappletPrivateResourceLoader;
  if (!loader) throw new Error('fixture final loader did not install');
  const realResponse = loader.response.bind(loader);
  loader.response = (source: string) => {
    executedSources.push(source);
    const response = realResponse(source);
    pending.push(response);
    return response;
  };
  vm.runInContext(applicationScript, context);

  const responses = await Promise.all(pending);
  for (let index = 0; index < responses.length; index += 1) {
    const digest = sha256(new Uint8Array(await responses[index]!.arrayBuffer()));
    if (digest !== entries.find((entry) => entry.source === executedSources[index])?.sha256) throw new Error('final callsite received unverified bytes');
  }
  if (executedSources.length !== entries.length || requestedUris.length !== entries.length) throw new Error('fixture did not execute every final resource callsite');
  if (requestedUris.some((uri, index) => uri !== entries.find((entry) => entry.source === executedSources[index])?.uri)) throw new Error('final artifact requested the wrong Blossom URI');
  return executedSources;
}
