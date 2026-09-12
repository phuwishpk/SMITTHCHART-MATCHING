/**
 * เปิดเว็บที่สร้างแล้วด้วย Chrome โหมดภาษาอังกฤษ แล้วไล่เก็บข้อความไทยที่ยังโผล่บนหน้าจอ
 * ใช้: node scripts/scan-thai.mjs [ราก dist]
 */
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createServer as httpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const root = process.argv[2] ?? 'dist';
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };

const webPort = await freePort();
const server = httpServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(join(root, decodeURIComponent(url.pathname)));
  try { const body = await readFile(p); res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' }); res.end(body); }
  catch { const body = await readFile(join(root, 'index.html')); res.writeHead(200, { 'content-type': 'text/html' }); res.end(body); }
});
await new Promise((r) => server.listen(webPort, r));

const cdpPort = await freePort();
const profile = await mkdtemp(join(tmpdir(), 'thaiscan-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [`--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--headless=new', '--no-first-run', '--disable-gpu', 'about:blank'],
  { stdio: 'ignore' });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await wait(250);
  try { const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json(); target = list.find((t) => t.type === 'page'); } catch { /* ยังไม่พร้อม */ }
}
if (!target) { console.error('เปิด Chrome ไม่สำเร็จ'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};

const COLLECT = `(() => {
  const thai = /[\\u0E00-\\u0E7F]/;
  const out = new Set();
  const walk = (node) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { const s = n.textContent.trim(); if (s && thai.test(s)) out.add(s); }
      else if (n.nodeType === 1) {
        if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue;
        for (const a of ['title', 'aria-label', 'placeholder', 'alt']) {
          const v = n.getAttribute?.(a); if (v && thai.test(v)) out.add(v.trim());
        }
        walk(n);
      }
    }
  };
  walk(document.body);
  return [...out];
})()`;

const seen = new Set();
const visit = async (hash, label) => {
  await evaluate(`location.href = ${JSON.stringify(`http://127.0.0.1:${webPort}/${hash}`)}`);
  await wait(1400);
  const found = await evaluate(COLLECT);
  for (const s of found ?? []) seen.add(`${label}|${s}`);
};

await send('Runtime.enable');
await visit('?lang=en&view=basics', 'basics');
for (const ch of ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11'])
  await visit(`?lang=en&view=basics&bch=${ch}`, ch);
await visit('?lang=en&view=course', 'course');
for (const ch of ['intro', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'])
  await visit(`?lang=en&view=course&bch=${ch}`, ch);
await visit('?lang=en', 'lab');
await visit('?lang=en&y=1&rad=1', 'lab-y');

console.log([...seen].join('\n'));
console.error(`\nพบข้อความไทยบนหน้าจอ ${seen.size} รายการ`);
ws.close(); chrome.kill(); server.close(); await rm(profile, { recursive: true, force: true }).catch(() => {});
process.exit(0);
