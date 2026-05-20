import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageJson {
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

function readJson(url: URL): PackageJson {
  return JSON.parse(readFileSync(url, 'utf8')) as PackageJson;
}

describe('@napplet/nub publish manifest', () => {
  it('uses a caret workspace range for @napplet/core so pnpm emits a semver range', () => {
    const nubPackage = readJson(new URL('../package.json', import.meta.url));
    expect(nubPackage.dependencies?.['@napplet/core']).toBe('workspace:^');
  });

  it('publishes through pnpm so workspace protocol dependencies are rewritten', () => {
    const rootPackage = readJson(new URL('../../../package.json', import.meta.url));
    const publishScript = rootPackage.scripts?.['publish-packages'] ?? '';

    expect(publishScript).toContain('pnpm publish -r');
    expect(publishScript).not.toContain('changeset publish');
  });
});
