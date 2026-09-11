/**
 * Generate Thai narration for the ANTENNA IMPEDANCE MATCHING course with UVoice AI.
 *
 * The API key is read from the environment and never written to disk or into the bundle — the app
 * ships only the finished audio files, so nothing has to call UVoice at run time and the key cannot
 * leak to a browser.
 *
 *   UVOICE_API_KEY=... node scripts/tts.mjs                     generate what has changed
 *   UVOICE_API_KEY=... node scripts/tts.mjs --only intro-what   one section
 *   UVOICE_API_KEY=... node scripts/tts.mjs --force             regenerate everything
 *   node scripts/tts.mjs --dry                                  print what would be sent, call nothing
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'audio', 'course');
const MANIFEST = join(OUT_DIR, 'manifest.json');
const ENDPOINT = 'https://api.uvoice.ai/generate';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DRY = has('--dry');
const FORCE = has('--force');
const ONLY = valueOf('--only', null);
const VOICE = valueOf('--voice', process.env.UVOICE_VOICE || 'TH-KantapongPremiumHD');
const FORMAT = valueOf('--format', 'mp3');
/** premium and natural voices cap at 1500 characters, standard at 5000 */
const LIMIT = /Premium|Natural/i.test(VOICE) ? 1500 : 5000;

/** Read the course out of the TypeScript source through tsx, so there is one copy of the content. */
const EXTRACT = [
  "import { COURSE } from './src/engine/course';",
  'console.log(JSON.stringify(COURSE.map(c => ({',
  '  id: c.id, num: c.num, title: c.title,',
  '  sections: c.sections.map(s => ({ id: s.id, title: s.title,',
  "    lines: s.lines.filter(l => l.kind === 'text' || l.kind === 'note' || l.kind === 'warn').map(l => l.text) })),",
  '}))));',
].join('\n');
writeFileSync(join(ROOT, '.tts-extract.ts'), EXTRACT);
const course = JSON.parse(execSync('npx tsx .tts-extract.ts', { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
execSync('rm -f .tts-extract.ts', { cwd: ROOT });

/** Symbols a reader says out loud but a speech engine would spell out or skip. */
const SAY = [
  [/\*\*/g, ''],
  [/Z_0|Z₀/g, 'ซีศูนย์'],
  [/Y_0|Y₀/g, 'วายศูนย์'],
  [/Z_L/g, 'ซีแอล'],
  [/Z_in/g, 'ซีอิน'],
  [/z_L/g, 'ซีแอลตัวเล็ก'],
  [/Γ/g, 'แกมมา'],
  [/λ/g, 'แลมบ์ดา'],
  [/Ω/g, 'โอห์ม'],
  [/β/g, 'เบตา'],
  [/∠/g, ' มุม '],
  [/°/g, ' องศา'],
  [/±/g, ' บวกลบ '],
  [/≈/g, ' ประมาณ '],
  [/≤/g, ' ไม่เกิน '],
  [/≥/g, ' ไม่น้อยกว่า '],
  [/→/g, ' ไปยัง '],
  [/[⟳⟲]/g, ''],
  [/([A-Za-z])_([A-Za-z0-9]+)/g, '$1$2'],
  [/·/g, ', '],
  [/\s*—\s*/g, ', '],
  [/[""“”]/g, ''],
  [/\s{2,}/g, ' '],
];
const speakable = (s) => SAY.reduce((t, [re, to]) => t.replace(re, to), s).trim();

/** Split on sentence-ish boundaries so no chunk is cut mid-thought. */
const chunk = (text, limit) => {
  if (text.length <= limit) return [text];
  const out = [];
  let cur = '';
  for (const piece of text.split(/(?<=[.!?])\s+|(?<=, )/)) {
    if ((cur + piece).length > limit && cur) { out.push(cur.trim()); cur = ''; }
    cur += piece;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

const jobs = [];
for (const ch of course) {
  for (const sec of ch.sections) {
    const id = `${ch.id}-${sec.id}`;
    if (ONLY && id !== ONLY) continue;
    const body = [sec.title, ...sec.lines].map(speakable).filter((t) => t.length > 4).join(' ');
    if (body.length < 5) continue;
    jobs.push({ id, chapter: ch.id, section: sec.id, title: sec.title, parts: chunk(body, LIMIT) });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const manifest = existsSync(MANIFEST) && !FORCE ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { voice: VOICE, items: {} };
manifest.voice = VOICE;
manifest.items = manifest.items ?? {};

const key = process.env.UVOICE_API_KEY;
if (!DRY && !key) {
  console.error('UVOICE_API_KEY is not set. Export it, or pass --dry to see the text without calling the API.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let made = 0; let skipped = 0; let failed = 0;

for (const job of jobs) {
  const hash = createHash('sha1').update(job.parts.join(' ') + VOICE + FORMAT).digest('hex').slice(0, 12);
  const prev = manifest.items[job.id];
  if (!FORCE && prev && prev.hash === hash && prev.files.every((f) => existsSync(join(OUT_DIR, f)))) { skipped++; continue; }
  if (DRY) {
    console.log(`- ${job.id} (${job.parts.length} part(s), ${job.parts.join('').length} chars)`);
    console.log(`    ${job.parts[0].slice(0, 130)}...`);
    continue;
  }
  const files = [];
  try {
    for (let i = 0; i < job.parts.length; i++) {
      const name = job.parts.length > 1 ? `${job.id}.${i + 1}.${FORMAT}` : `${job.id}.${FORMAT}`;
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ settings: { voiceID: VOICE, autoBreak: false, outputFormat: FORMAT, text: job.parts[i] } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 512) throw new Error(`suspiciously small reply (${buf.length} bytes)`);
      writeFileSync(join(OUT_DIR, name), buf);
      files.push(name);
      await sleep(700); // stay well inside the 100 requests / minute limit
    }
    manifest.items[job.id] = { chapter: job.chapter, section: job.section, title: job.title, hash, files, chars: job.parts.join('').length };
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    made += 1;
    console.log(`ok ${job.id}  ${files.join(' ')}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${job.id}  ${err.message}`);
  }
}

if (DRY) {
  const reqs = jobs.reduce((a, j) => a + j.parts.length, 0);
  console.log(`\n${jobs.length} sections would be narrated, ${reqs} requests, voice ${VOICE}, limit ${LIMIT} chars`);
} else {
  console.log(`\ndone - ${made} generated, ${skipped} unchanged, ${failed} failed. manifest: ${MANIFEST}`);
}
