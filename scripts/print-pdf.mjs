/**
 * พิมพ์ HTML เป็น PDF ผ่าน Chrome DevTools Protocol
 * ใช้ CDP แทน --print-to-pdf เพราะต้องการเลขหน้าที่ท้ายกระดาษ และเลือกช่วงหน้าได้
 *   node print.mjs <in.html> <out.pdf> [pageRanges]
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [input, output, ranges] = process.argv.slice(2);
/** หาพอร์ตว่างเอง ไม่ใช้เลขตายตัว เพราะถ้ามี Chrome ค้างอยู่ตัวพิมพ์จะไปต่อกับอินสแตนซ์เก่าแล้วค้าง */
const freePort = await new Promise((res, rej) => {
  const srv = createServer();
  srv.on('error', rej);
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => res(port)); });
});
const PORT = freePort;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'pdfprint-'));

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const version = async () => {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return r.json(); } catch {}
    await sleep(250);
  }
  throw new Error('Chrome ไม่ตอบภายในเวลาที่กำหนด');
};

const v = await version();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const waiters = new Map();
const events = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiters.has(msg.id)) {
    const { res, rej } = waiters.get(msg.id);
    waiters.delete(msg.id);
    msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
  } else if (msg.method && events.has(msg.method)) {
    events.get(msg.method)();
    events.delete(msg.method);
  }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const n = ++id;
  waiters.set(n, { res, rej });
  ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const once = (method) => new Promise((res) => events.set(method, res));

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
const loaded = once('Page.loadEventFired');
await send('Page.navigate', { url: `file://${input}` }, sessionId);
await loaded;
await sleep(4000);   // รอฟอนต์เว็บและการจัดหน้าให้นิ่งก่อนพิมพ์

const footer = `<div style="width:100%;font-size:8px;font-family:sans-serif;color:#6b7280;padding:0 15mm;
  display:flex;justify-content:space-between"><span>Smith Chart พื้นฐาน — เอกสารประกอบการเรียน</span>
  <span class="pageNumber"></span></div>`;
const { stream } = await send('Page.printToPDF', {
  printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer,
  ...(ranges ? { pageRanges: ranges } : {}),
  transferMode: 'ReturnAsStream',
}, sessionId);

const chunks = [];
for (;;) {
  const r = await send('IO.read', { handle: stream, size: 1 << 20 }, sessionId);
  if (r.data) chunks.push(Buffer.from(r.data, r.base64Encoded ? 'base64' : 'utf8'));
  if (r.eof) break;
}
await send('IO.close', { handle: stream }, sessionId);
writeFileSync(output, Buffer.concat(chunks));
ws.close();
chrome.kill();
const mb = (Buffer.concat(chunks).length / 1048576).toFixed(1);
console.log(`เขียน ${output} · ${mb} MB`);
process.exit(0);
