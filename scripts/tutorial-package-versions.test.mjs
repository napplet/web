import assert from 'node:assert/strict';
import test from 'node:test';

import { caretRangeIncludesVersion } from './tutorial-package-versions.mjs';

test('accepts compatible patch releases without weakening the 0.x minor boundary', () => {
  assert.equal(caretRangeIncludesVersion('^0.11.2', '0.11.2'), true);
  assert.equal(caretRangeIncludesVersion('^0.11.2', '0.11.3'), true);
  assert.equal(caretRangeIncludesVersion('^0.11.2', '0.11.1'), false);
  assert.equal(caretRangeIncludesVersion('^0.11.2', '0.12.0'), false);
});

test('honors caret compatibility for stable and 0.0.x versions', () => {
  assert.equal(caretRangeIncludesVersion('^1.2.3', '1.9.0'), true);
  assert.equal(caretRangeIncludesVersion('^1.2.3', '2.0.0'), false);
  assert.equal(caretRangeIncludesVersion('^0.0.3', '0.0.3'), true);
  assert.equal(caretRangeIncludesVersion('^0.0.3', '0.0.4'), false);
});

test('rejects missing, malformed, and non-caret declarations', () => {
  assert.equal(caretRangeIncludesVersion('', '0.11.3'), false);
  assert.equal(caretRangeIncludesVersion('0.11.2', '0.11.3'), false);
  assert.equal(caretRangeIncludesVersion('^0.11', '0.11.3'), false);
  assert.equal(caretRangeIncludesVersion('^0.11.2', 'next'), false);
  assert.equal(caretRangeIncludesVersion('^0.11.2', '0.11.3-beta.1'), false);
});
