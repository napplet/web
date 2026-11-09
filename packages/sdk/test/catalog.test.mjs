import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, get } from '@napplet/sdk/catalog';
import { catalog as rootCatalog, CATALOG_DOMAIN, catalogGet } from '@napplet/sdk';
import { catalogGet as napGet, get as napGetAlias } from '@napplet/nap/catalog/sdk';
import { DOMAIN } from '@napplet/nap/catalog/types';

test('built catalog exports delegate to the current injected domain without caching', async () => {
  const previous = globalThis.window;
  const empty = { napplets: [], handlers: [] };
  const later = { napplets: [], handlers: [] };
  try {
    assert.equal(CATALOG_DOMAIN, 'catalog');
    assert.equal(DOMAIN, 'catalog');
    assert.equal(rootCatalog, catalog);
    assert.equal(napGetAlias, napGet);
    globalThis.window = { napplet: { catalog: { get: async () => empty } } };
    for (const read of [get, catalog.get, catalogGet, napGet, napGetAlias]) assert.equal(await read(), empty);
    globalThis.window.napplet.catalog = { get: async () => later };
    for (const read of [get, catalog.get, catalogGet, napGet]) assert.equal(await read(), later);
    globalThis.window.napplet = {};
    for (const read of [get, catalog.get, catalogGet, napGet]) assert.throws(read, /catalog is unavailable/);
    delete globalThis.window.napplet;
    assert.throws(get, /namespace/);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
