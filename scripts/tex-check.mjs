/** Print every equation in the course next to the words the narration will say. */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { texToThai } from './tex-to-thai.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXTRACT = [
  "import { COURSE } from './src/engine/course';",
  'const out = [];',
  'for (const c of COURSE) for (const s of c.sections) for (const l of s.lines)',
  "  if (l.kind === 'math' || l.kind === 'result') out.push({ at: c.id + '/' + s.id, tex: l.tex });",
  'console.log(JSON.stringify(out));',
].join('\n');
writeFileSync(join(ROOT, '.tex-extract.ts'), EXTRACT);
const rows = JSON.parse(execSync('npx tsx .tex-extract.ts', { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
execSync('rm -f .tex-extract.ts', { cwd: ROOT });

let leftovers = 0;
for (const r of rows) {
  const said = texToThai(r.tex);
  const bad = /\\|[{}^_]|\|/.test(said);
  if (bad) leftovers += 1;
  console.log(`\n${r.at}${bad ? '   <-- LEFTOVER MARKUP' : ''}`);
  console.log(`  tex : ${r.tex}`);
  console.log(`  said: ${said}`);
}
console.log(`\n${rows.length} equations, ${leftovers} with leftover markup`);
