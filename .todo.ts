/** พิมพ์ข้อความของบทที่ระบุ เฉพาะอันที่ยังไม่มีคำแปล */
import { BASICS } from './src/engine/basics';
import { COURSE } from './src/engine/course';
import { EXACT } from './src/engine/translations/index';
const thai = /[฀-๿]/;
const ids = process.argv.slice(2);
const seen = new Set<string>();
const rows: { where: string; text: string }[] = [];
const add = (where: string, ...xs: unknown[]) => {
  for (const x of xs) {
    if (typeof x !== 'string') continue;
    const s = x.trim();
    if (!s || !thai.test(s) || EXACT[s] || seen.has(s)) continue;
    seen.add(s); rows.push({ where, text: s });
  }
};
for (const c of [...BASICS, ...COURSE]) {
  if (!ids.includes(c.id)) continue;
  add(`${c.id} หัวบท`, c.title, c.titleTh, c.intro);
  for (const s of c.sections) {
    add(`${c.id}/${s.id} หัวข้อ`, s.title);
    for (const l of s.lines) add(`${c.id}/${s.id}`, (l as any).text);
    for (const f of (s.figures ?? []) as any[]) {
      add(`${c.id}/${s.id} รูป`, f.title, f.caption, f.label, f.note, f.xLabel, f.yLabel);
      add(`${c.id}/${s.id} ควิซ`, f.question, f.explain, f.hint, ...(f.choices ?? []));
      add(`${c.id}/${s.id} ตาราง`, ...(f.head ?? []), ...(f.rows ?? []).flat());
      for (const p of f.points ?? []) add(`${c.id}/${s.id} รูป`, p.label);
      for (const p of f.labels ?? []) add(`${c.id}/${s.id} รูป`, p.text);
      for (const p of f.rays ?? []) add(`${c.id}/${s.id} รูป`, p.label);
      for (const p of f.series ?? []) add(`${c.id}/${s.id} รูป`, p.name);
      for (const m of f.markers ?? []) add(`${c.id}/${s.id} รูป`, m.text);
    }
  }
}
rows.forEach((r, i) => console.log(`${String(i + 1).padStart(3)}|${r.where}|${r.text}`));
console.log(`\nยังไม่ได้แปล ${rows.length} ข้อความ · ${rows.reduce((a, r) => a + r.text.length, 0)} อักษร`);
