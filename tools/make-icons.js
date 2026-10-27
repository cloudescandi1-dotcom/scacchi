// Crea le icone PNG (src/icons) partendo da assets/icon.svg, usando Chrome senza finestra.
// Uso:  npm run icons
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'assets', 'icon.svg'), 'utf8');
const outDir = path.join(root, 'src', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const candidates = [
  process.env.CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const chrome = candidates.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Chrome non trovato: imposta la variabile CHROME con il percorso');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icone-'));
const html = path.join(tmp, 'icon.html');
fs.writeFileSync(html, `<!doctype html><html><body style="margin:0;overflow:hidden">
<div style="width:calc(100vw + 2px);height:calc(100vh + 2px)">${svg.replace('<svg ', '<svg width="100%" height="100%" preserveAspectRatio="none" ')}</div></body></html>`);

const outputs = [['icon-180.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]];
for (const [name, size] of outputs) {
  const out = path.join(outDir, name);
  // Chrome non apre finestre troppo piccole: si disegna sempre a 512 e si riduce con la scala
  execFileSync(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${size / 512}`,
    `--user-data-dir=${path.join(tmp, 'profilo')}`,
    '--window-size=512,512', `--screenshot=${out}`, 'file:///' + html.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log('creata', path.relative(root, out));
}
fs.rmSync(tmp, { recursive: true, force: true });
