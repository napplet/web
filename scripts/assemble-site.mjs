import assert from 'node:assert/strict';
import { cp, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredWebFiles = [
  'index.html', 'explainer/index.html', 'protocol/index.html', 'protocol/contribute/index.html', 'og.png', 'robots.txt',
  'sitemap-index.xml', 'sitemap-0.xml', 'install.sh', 'install.ps1',
];

/** Assemble the static directory consumed by both CI verification and Bunny. */
export async function assembleSite(root) {
  const web = path.join(root, 'apps/web/dist');
  const docs = path.join(root, 'apps/docs/.vitepress/dist');
  const conformance = path.join(root, 'apps/conformance/dist');
  const output = path.join(root, 'site');

  // Validate inputs before replacing the previous artifact.
  for (const file of [
    ...requiredWebFiles.map((file) => path.join(web, file)),
    path.join(docs, 'index.html'), path.join(conformance, 'index.html'),
  ]) {
    const info = await stat(file);
    assert.ok(info.isFile() && info.size > 0, `Missing or empty site artifact: ${file}`);
  }
  for (const name of ['install.sh', 'install.ps1']) {
    assert.deepEqual(
      await readFile(path.join(web, name)),
      await readFile(path.join(root, 'apps/web/public', name)),
      `Built ${name} differs from its public source`,
    );
  }
  const html = await readFile(path.join(conformance, 'index.html'), 'utf8');
  assert.match(html, /(?:src|href)="\/conformance\//, 'Build conformance with --base=/conformance/');
  assert.doesNotMatch(html, /(?:src|href)="\/assets\//, 'Conformance assets must use /conformance/');

  await rm(output, { recursive: true, force: true });
  await cp(web, output, { recursive: true });
  await cp(docs, path.join(output, 'docs'), { recursive: true });
  await cp(conformance, path.join(output, 'conformance'), { recursive: true });
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = await assembleSite(path.resolve(import.meta.dirname, '..'));
  console.log(`Assembled showcase, explainer, docs, conformance and installers into ${output}`);
}
