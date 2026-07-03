import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageJson {
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

function readJson(url: URL): PackageJson {
  return JSON.parse(readFileSync(url, 'utf8')) as PackageJson;
}

describe('@napplet/nap publish manifest', () => {
  it('uses a caret workspace range for @napplet/core so pnpm emits a semver range', () => {
    const napPackage = readJson(new URL('../package.json', import.meta.url));
    expect(napPackage.dependencies?.['@napplet/core']).toBe('workspace:^');
  });

  it('publishes through pnpm so workspace protocol dependencies are rewritten', () => {
    const rootPackage = readJson(new URL('../../../package.json', import.meta.url));
    const publishScript = rootPackage.scripts?.['publish-packages'] ?? '';

    expect(publishScript).toContain('pnpm -r');
    expect(publishScript).toContain('publish --access public');
    expect(publishScript).toContain("--filter='!@napplet/cli'");
    expect(publishScript).not.toContain('changeset publish');
  });
});
