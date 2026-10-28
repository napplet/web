/** Render recorded PTY bytes with xterm; screenshots contain actual CLI output. */
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const [input, output, xtermRoot] = process.argv.slice(2);
if (!input || !output || !xtermRoot) throw new Error('Usage: node scripts/cli-proof/render.mjs <recordings> <png-directory> <xterm-package-directory>');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const shots = [
  ['01-help', 'napplet --help', 64],
  ['02-guided-setup', 'napplet deploy · completing missing settings', 48],
  ['03-upload-progress', 'napplet deploy · real uploads to local fixtures', 48],
  ['04-deployment-result', 'napplet deploy · completed local deployment', 48],
  ['05-non-interactive', 'napplet deploy -i · terminal without prompts', 30],
  ['06-no-color', 'NO_COLOR=1 napplet deploy --help', 40],
];
try {
  for (const [name, title, rows] of shots) {
    const page = await browser.newPage({ viewport: { width: 1160, height: 1300 }, deviceScaleFactor: 2 });
    await page.setContent('<html><head></head><body><main id="frame"><header><span class="dots">● ● ●</span><span id="title"></span><span class="tag">RECORDED PTY</span></header><div id="terminal"></div><footer>napplet CLI · local test fixtures · no public deployment</footer></main></body></html>');
    await page.addStyleTag({ path: resolve(xtermRoot, 'css/xterm.css') });
    await page.addStyleTag({ content: `body { margin: 0; padding: 28px; background: #090c13; color: #cbd5e1; font-family: system-ui, sans-serif; } #frame { padding: 0 22px; background: #10141e; border: 1px solid #273244; border-radius: 13px; width: fit-content; box-shadow: 0 20px 70px #0006; } header { display: flex; align-items: center; gap: 24px; padding: 17px 0; font-size: 12px; border-bottom: 1px solid #253044; margin-bottom: 15px; } .dots { color: #627082; letter-spacing: 3px; } .tag { margin-left: auto; color: #77879d; font-size: 10px; letter-spacing: 1px; } footer { border-top: 1px solid #253044; margin-top: 13px; padding: 12px 0; color: #77879d; font-size: 10px; } .xterm-viewport { overflow: hidden !important; }` });
    await page.addScriptTag({ path: resolve(xtermRoot, 'lib/xterm.js') });
    const data = await readFile(resolve(input, `${name}.ansi`), 'utf8');
    await page.evaluate(async ({ data, title, rows }) => {
      document.getElementById('title').textContent = title;
      const term = new window.Terminal({ cols: 100, rows, fontFamily: 'Menlo, monospace', fontSize: 13, lineHeight: 1.2, cursorBlink: false, disableStdin: true, allowProposedApi: true, theme: { background: '#10141e', foreground: '#d5deeb', cyan: '#6dd5d0', brightCyan: '#82eee6', green: '#8cd49e', yellow: '#f1cc8a', red: '#f48796', blue: '#91b9ff', black: '#10141e', brightBlack: '#68758b' } });
      term.open(document.getElementById('terminal'));
      await new Promise((done) => term.write(data, done));
      term.scrollToBottom();
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const screen = term.element.querySelector('.xterm-screen');
      document.getElementById('frame').style.width = `${screen.getBoundingClientRect().width}px`;
      const occupied = Math.min(rows, term.buffer.active.cursorY + 2);
      document.getElementById('terminal').style.height = `${screen.getBoundingClientRect().height * occupied / rows}px`;
      document.getElementById('terminal').style.overflow = 'hidden';
    }, { data, title, rows });
    await page.locator('#frame').screenshot({ path: resolve(output, `${name}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`Rendered ${shots.length} terminal screenshots to ${output}`);
