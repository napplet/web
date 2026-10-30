import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigation, report, get } from '@napplet/sdk/navigation';
import { navigation as rootNavigation, navigationReport, navigationGet, NAVIGATION_DOMAIN } from '@napplet/sdk';
import { report as napReport, get as napGet } from '@napplet/nap/navigation';
import { report as helperReport, get as helperGet } from '@napplet/nap/navigation/sdk';

test('built navigation exports delegate to the currently injected domain', async () => {
  assert.equal(NAVIGATION_DOMAIN, 'navigation');
  assert.equal(rootNavigation, navigation);
  const previous = globalThis.window;
  const reportValue = { revision: 1, location: null };
  const result = { ok: true, view: { entries: [], index: null, reportRevision: 1, status: 'current' } };
  let reports = 0;
  let reads = 0;
  try {
    globalThis.window = { napplet: { navigation: {
      report: async (value) => { assert.equal(value, reportValue); reports++; return result; },
      get: async () => { reads++; return result; },
    } } };
    for (const call of [navigation.report, report, navigationReport, napReport, helperReport]) {
      assert.equal(await call(reportValue), result);
    }
    for (const call of [navigation.get, get, navigationGet, napGet, helperGet]) {
      assert.equal(await call(), result);
    }
    assert.equal(reports, 5);
    assert.equal(reads, 5);
    globalThis.window.napplet = {};
    assert.throws(() => navigation.get(), /navigation/);
    assert.throws(() => navigationReport(reportValue), /navigation/);
    assert.throws(() => get(), /navigation/);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
