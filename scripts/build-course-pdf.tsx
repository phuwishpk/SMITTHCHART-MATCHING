/**
 * สร้างไฟล์ HTML ฉบับพิมพ์ของคอร์ส "Smith Chart พื้นฐาน" สำหรับแปลงเป็น PDF
 * รูปทุกรูปเรนเดอร์ด้วยคอมโพเนนต์ชุดเดียวกับที่แอปใช้ ภาพใน PDF จึงตรงกับบนจอ
 */
import React from 'react';
import { renderToStaticMarkup as R } from 'react-dom/server';
import katex from 'katex';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BASICS } from '../src/engine/basics';
import { GLOSSARY, GROUP_LABEL } from '../src/engine/glossary';
import { SmithFigure } from '../src/components/SmithFigure';
import { SmithFull } from '../src/components/SmithFull';
import { MiniPlot } from '../src/components/MiniPlot';
import { CircuitSchematic } from '../src/components/CircuitSchematic';
import { StubReactanceIntro } from '../src/components/StubReactanceIntro';
import { C, Complex, fmtNum, abs } from '../src/engine/complex';
import { admittance, gammaFromz, swrFromGamma, rotateTowardGenerator, zFromGamma, wtgFromGamma, normalize } from '../src/engine/rf';
import { solveSingleStub } from '../src/engine/matching';
import { EX78 } from '../src/engine/basics';

const OUT = process.argv[2] ?? 'docs/smith-chart-basics-course.html';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** ข้อความในคอร์สใช้ **…** เน้นคำสำคัญ */
const rich = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<mark>$1</mark>');
const tex = (t: string, display = true) => {
  try { return katex.renderToString(t, { displayMode: display, throwOnError: false, output: 'html' }); }
  catch { return `<code>${esc(t)}</code>`; }
};
const n = (v: number, d = 3) => fmtNum(v, d);
const fz = (z: Complex, d = 3) => `${n(z.re, d)} ${z.im < 0 ? '−' : '+'} j${n(Math.abs(z.im), d)}`;

/* ---------------- รูป ---------------- */
let figNo = 0;
const figWrap = (secNum: string, inner: string, caption?: string, title?: string) => {
  figNo += 1;
  return `<figure class="fig"><div class="fig-no">รูป ${secNum}-${figNo}</div>${title ? `<div class="fig-title">${rich(title)}</div>` : ''}
    <div class="fig-body">${inner}</div>${caption ? `<figcaption>${rich(caption)}</figcaption>` : ''}</figure>`;
};

const tableHtml = (f: any) =>
  `<div class="tbl"><table><thead><tr>${f.head.map((h: string) => `<th>${rich(String(h))}</th>`).join('')}</tr></thead>
   <tbody>${f.rows.map((r: any[]) => `<tr>${r.map((c2, i) => `<td${i === 0 ? ' class="k"' : ''}>${rich(String(c2))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

const quizHtml = (f: any) =>
  `<div class="quiz"><div class="quiz-q">${rich(f.question)}</div>
   <ol class="quiz-choices">${f.choices.map((c2: string, i: number) => `<li class="${i === f.answer ? 'right' : ''}">${rich(c2)}${i === f.answer ? ' <span class="tag">คำตอบ</span>' : ''}</li>`).join('')}</ol>
   ${f.hint ? `<p class="quiz-hint"><b>คำใบ้:</b> ${rich(f.hint)}</p>` : ''}
   <p class="quiz-explain"><b>เฉลย:</b> ${rich(f.explain)}</p>
   ${f.chart ? R(<SmithFull {...({ ...f.chart, title: undefined } as any)} />) : ''}</div>`;

const elementLine = (e: any) => {
  const p = e.params ?? {};
  const bits = Object.entries(p).map(([k, v]) => `${k}=${typeof v === 'number' ? n(v as number, 4) : String(v)}`).join(', ');
  return `${e.kind}${e.orient ? ` (${e.orient})` : ''}${bits ? ` · ${bits}` : ''}`;
};

const labHtml = (f: any) => {
  let circuitSvg = '';
  let list = '';
  try {
    const ckt = typeof f.circuit === 'function' ? f.circuit() : f.circuit;
    circuitSvg = R(<CircuitSchematic circuit={ckt} />);
    list = (ckt.elements ?? []).map((e: any) => `<li>${esc(elementLine(e))}</li>`).join('');
  } catch { /* วงจรบางตัวสร้างไม่ได้นอกแอป ปล่อยว่างไว้ */ }
  return `<div class="lab"><div class="lab-head">🔬 ทดลองในแอป · ${rich(f.label ?? '')}</div>
    ${f.note ? `<p class="lab-note">${rich(f.note)}</p>` : ''}
    ${circuitSvg ? `<div class="lab-ckt">${circuitSvg}</div>` : ''}
    ${list ? `<div class="lab-list"><div class="lab-list-head">รายการอุปกรณ์ในวงจรนี้</div><ul>${list}</ul></div>` : ''}</div>`;
};

/** ลำดับการพล็อต Example 7-8 แบบภาพนิ่ง ใช้แทนภาพเคลื่อนไหวที่พิมพ์ลงกระดาษไม่ได้ */
const walkthroughHtml = (secNum: string) => {
  const sol = solveSingleStub(EX78.ZL, EX78.Z0, 'short')[0];
  const zL = normalize(EX78.ZL, EX78.Z0);
  const yL = admittance(zL);
  const zAtStub = admittance(sol.yAtStub);
  const swr = swrFromGamma(gammaFromz(zL));
  const walk = (t: number) => zFromGamma(rotateTowardGenerator(gammaFromz(zL), sol.dLambda * t));
  const path = (fn: (t: number) => Complex, m = 41) => Array.from({ length: m }, (_, i) => fn(i / (m - 1)));
  const steps = [
    { t: 'ขั้นที่ 1 — normalize แล้วพล็อตโหลด',
      d: `หารด้วย Z₀ = ${EX78.Z0} Ω ได้ z_L = ${fz(zL, 2)} · วง r = ${n(zL.re, 2)} ตัดส่วนโค้ง x = ${n(zL.im, 2)} · วงกลม SWR = ${n(swr, 2)} ผ่านจุดนี้`,
      el: <SmithFigure points={[{ z: zL, label: `z_L = ${fz(zL, 1)}`, cls: 'load' }]} curves={[{ zs: [C(1, 0), zL], cls: 'mid', dashed: true }]} swr={[swr]} rCircles={[zL.re]} xCircles={[zL.im]} /> },
    { t: 'ขั้นที่ 2 — หาจุดอ่านค่า y (ตรงข้าม 180°)',
      d: `y_L = 1/z_L = ${fz(yL, 2)} · เส้นประลากผ่านศูนย์กลางไปอีกฝั่ง ระยะจากศูนย์กลางเท่าเดิม เป็นการอ่านค่า ไม่ใช่การต่อสายเพิ่ม`,
      el: <SmithFigure points={[{ z: zL, label: 'z_L', cls: 'load' }, { z: yL, label: `y_L = ${fz(yL, 2)}`, cls: 'y' }]} curves={[{ zs: [zL, C(1, 0), yL], cls: 'mid', dashed: true }]} swr={[swr]} /> },
    { t: 'ขั้นที่ 3 — เดินไปทางเครื่องส่งจนถึงวง g = 1',
      d: `เดินตามเข็มนาฬิกาบนวง SWR ได้ระยะ d = ${n(sol.dLambda, 4)} λ · ที่จุดนี้ y = 1 + j${n(sol.yAtStub.im, 3)} คือส่วนจริงถูกแล้ว เหลือส่วนจินตภาพให้สตับหักล้าง`,
      el: <SmithFigure showY gCircles={[1]} points={[{ z: zL, label: 'โหลด', cls: 'load' }, { z: zAtStub, label: `d = ${n(sol.dLambda, 3)} λ`, cls: 'in' }]} curves={[{ zs: path((t) => walk(t)), cls: 'net', arrow: true }]} swr={[swr]} /> },
    { t: 'ขั้นที่ 4 — หาความยาวสตับจากจุด SHORT',
      d: `ต้องการ b_stub = ${n(sol.bStub, 3)} · เริ่มที่ SHORT แล้วเดินเลียบขอบกราฟจนอ่านค่านี้ได้ ความยาวสตับ l_s = ${n(sol.lLambda, 4)} λ`,
      el: <SmithFigure showY bCircles={[sol.bStub]} points={[{ z: C(0, 0), label: 'SHORT', cls: 'stub' }, { z: admittance(C(0, sol.bStub)), label: `l_s = ${n(sol.lLambda, 3)} λ`, cls: 'stub' }]} curves={[{ zs: path((t) => C(0, Math.tan(2 * Math.PI * sol.lLambda * Math.max(t, 0.002))), 41), cls: 'stub', arrow: true }]} /> },
    { t: 'ขั้นที่ 5 — ต่อสตับขนาน จุดไถลเข้าศูนย์กลาง',
      d: `y รวม = (1 + j${n(sol.yAtStub.im, 3)}) + (−j${n(Math.abs(sol.bStub), 3)}) = 1 + j0 · เส้นทางเกาะวง g = 1 เพราะสตับเปลี่ยนเฉพาะ b · ผลคือ SWR ฝั่งเครื่องส่งเท่ากับ 1`,
      el: <SmithFigure showY gCircles={[1]} points={[{ z: zAtStub, label: 'ก่อนใส่สตับ', cls: 'mid' }, { z: C(1, 0), label: 'แมตช์', cls: 'in' }]} curves={[{ zs: path((t) => admittance(C(1, sol.yAtStub.im + sol.bStub * t))), cls: 'y', arrow: true }]} /> },
  ];
  return steps.map((s) => figWrap(secNum, R(s.el), s.d, s.t)).join('\n');
};

const figureHtml = (f: any, secNum: string): string => {
  switch (f.kind) {
    // คอมโพเนนต์วาดชื่อรูปของตัวเองอยู่แล้ว จึงตัด title ออกก่อนส่งเข้าไป ไม่ให้ชื่อซ้ำสองบรรทัด
    case 'smith': return figWrap(secNum, R(<SmithFigure {...({ ...f, title: undefined } as any)} />), f.caption, f.title);
    case 'chart': return figWrap(secNum, R(<SmithFull {...({ ...f, title: undefined } as any)} />), f.caption, f.title);
    case 'plot': return figWrap(secNum, R(<MiniPlot {...({ ...f, title: undefined } as any)} />), f.caption, f.title);
    case 'table': return figWrap(secNum, tableHtml(f), f.caption, f.title);
    case 'quiz': return figWrap(secNum, quizHtml(f), undefined, 'คำถามทบทวน');
    case 'lab': return figWrap(secNum, labHtml(f), undefined, undefined);
    case 'circuit': return figWrap(secNum, R(<CircuitSchematic circuit={f.circuit} />), f.caption, f.title);
    case 'stub-reactance': return figWrap(secNum, R(<StubReactanceIntro />), undefined, 'รีแอกแตนซ์ของสตับตามความยาว');
    case 'single-stub-walkthrough': return walkthroughHtml(secNum);
    default: return '';
  }
};

/* ---------------- บรรทัดเนื้อหา ---------------- */
const lineHtml = (l: any): string => {
  switch (l.kind) {
    case 'text': return `<p>${rich(l.text)}</p>`;
    case 'note': return `<div class="cal note"><b>หมายเหตุ</b> ${rich(l.text)}</div>`;
    case 'warn': return `<div class="cal warn"><b>ข้อควรระวัง</b> ${rich(l.text)}</div>`;
    case 'math': return `<div class="eq">${tex(l.tex)}</div>`;
    case 'result': return `<div class="eq res">${tex(l.tex)}</div>`;
    case 'code': return `<div class="steps">${l.text.split('\n').map((s: string) => `<div>${rich(s)}</div>`).join('')}</div>`;
    default: return '';
  }
};

/* ---------------- ประกอบเอกสาร ---------------- */
const chapters = BASICS.map((c, ci) => {
  const secs = c.sections.map((s, si) => {
    figNo = 0;
    const num = c.num ? `${c.num}.${si + 1}` : `0.${si + 1}`;
    const body = s.lines.map(lineHtml).join('\n');
    const figs = (s.figures ?? []).map((f) => figureHtml(f, num)).join('\n');
    return `<section class="sec"><h3 id="s-${c.id}-${s.id}"><span class="secnum">${num}</span> ${rich(s.title)}</h3>${body}${figs}</section>`;
  }).join('\n');
  return `<section class="chapter"><h2 id="c-${c.id}"><span class="chnum">${c.num ? `บทที่ ${c.num}` : 'บทนำ'}</span>${rich(c.title)}</h2>
    <p class="chsub">${rich(c.titleTh)}</p><p class="chintro">${rich(c.intro)}</p>${secs}</section>`;
}).join('\n');

const toc = BASICS.map((c) => {
  const secs = c.sections.map((s, si) => `<li><a href="#s-${c.id}-${s.id}"><span class="tn">${c.num ? `${c.num}.${si + 1}` : `0.${si + 1}`}</span> ${esc(s.title)}</a></li>`).join('');
  return `<li class="toc-ch"><a href="#c-${c.id}"><b>${c.num ? `บทที่ ${c.num}` : 'บทนำ'}</b> ${esc(c.title)}</a><ul>${secs}</ul></li>`;
}).join('');

const glossary = (() => {
  const groups: Record<string, any[]> = {};
  for (const g of GLOSSARY) (groups[g.group] ??= []).push(g);
  return Object.entries(groups).map(([k, items]) => `<h3>${esc((GROUP_LABEL as any)[k] ?? k)}</h3>
    <div class="tbl"><table><thead><tr><th>สัญลักษณ์</th><th>อ่านว่า</th><th>ชื่อ</th><th>หน่วย</th><th>ความหมาย</th></tr></thead><tbody>
    ${items.map((g) => `<tr><td class="k">${esc(g.sym)}</td><td>${esc(g.say ?? '')}</td><td>${esc(g.nameTh ?? g.name ?? '')}</td><td>${esc(g.unit ?? '—')}</td><td>${esc(g.short ?? '')}</td></tr>`).join('')}
    </tbody></table></div>`).join('\n');
})();

const blankChart = R(<SmithFull title="Smith Chart สำหรับพิมพ์ใช้งาน" scale fine grid="full" />);

const css = readFileSync('node_modules/katex/dist/katex.min.css', 'utf8');
/** ฝังฟอนต์ KaTeX เป็น data URI เพราะ Chrome ไม่โหลดไฟล์ฟอนต์ข้าง ๆ เวลาเปิดจาก file:// */
const fontDir = 'node_modules/katex/dist/fonts';
const fonts = new Map<string, string>();
for (const f of readdirSync(fontDir)) if (f.endsWith('.woff2')) fonts.set(f, readFileSync(join(fontDir, f)).toString('base64'));
const katexCss = css.replace(/url\(fonts\/([^)]+?)\.woff2\)/g, (m, name) =>
  fonts.has(`${name}.woff2`) ? `url(data:font/woff2;base64,${fonts.get(`${name}.woff2`)})` : m);
/** คัดเฉพาะกฎที่เกี่ยวกับรูปจากสไตล์ของแอป เพื่อให้รูปใน PDF หน้าตาตรงกับบนจอเสมอ */
const figureRules = /^(\.smith-figure|\.sf-|\.mp-|\.mini-plot|\.smith-svg|\.smith-full|\.rs-|\.cfig|\.quiz|\.clab|\.circuit-svg|\.schematic|:root)/;
const figuresCss = (() => {
  const out: string[] = [];
  let keep = false;
  for (const line of readFileSync('src/styles.css', 'utf8').split('\n')) {
    if (/^[.:#a-zA-Z]/.test(line)) keep = figureRules.test(line);
    if (keep) out.push(line);
  }
  return out.join('\n');
})();
const docCss = readFileSync('scripts/course-pdf.css', 'utf8');

writeFileSync(OUT, `<!doctype html><html lang="th"><head><meta charset="utf-8">
<title>Smith Chart พื้นฐาน — เอกสารประกอบการเรียน</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${katexCss}</style>
<style>${figuresCss}</style>
<style>${docCss}</style>
</head><body>
<section class="cover">
  <div class="cover-mark">${R(<SmithFigure swr={[2.618]} points={[{ z: C(0.5, 0.5), cls: 'load' }, { z: C(1, 0), cls: 'in' }]} curves={[{ zs: [C(0.5, 0.5), C(1, 0)], cls: 'mid', dashed: true }]} />)}</div>
  <h1>Smith Chart พื้นฐาน</h1>
  <p class="cover-sub">เอกสารประกอบการเรียน ฉบับเต็ม — เนื้อหา 12 บท พร้อมวิธีพล็อตทีละขั้น</p>
  <p class="cover-meta">สร้างจากคอร์ส “Smith Chart พื้นฐาน” ในแอป RF + Smith Chart Lab<br>ตัวเลขและรูปทุกชิ้นคำนวณและวาดโดยเครื่องคำนวณของแอปเอง</p>
</section>
<section class="front"><h2>คำนำ — เอกสารนี้คืออะไร</h2>
<p>เอกสารนี้คือเนื้อหาทั้งหมดของคอร์ส “Smith Chart พื้นฐาน” จัดรูปแบบใหม่ให้พิมพ์อ่านบนกระดาษได้ เนื้อความทุกบรรทัด สมการทุกสมการ ตารางทุกตาราง และรูปทุกรูป ยกมาจากคอร์สโดยตรง ไม่ได้เขียนใหม่</p>
<p><b>รูปในเอกสารนี้วาดด้วยโค้ดชุดเดียวกับที่แอปใช้วาดบนจอ</b> ตำแหน่งจุด เส้นทาง และวงกลมทุกวงจึงตรงกับที่เห็นในแอปทุกประการ ส่วนภาพเคลื่อนไหวที่พิมพ์ลงกระดาษไม่ได้ ถูกแทนด้วยภาพนิ่งทีละขั้นซึ่งคำนวณจากตัวเลขชุดเดียวกัน</p>
<div class="cal note"><b>วิธีใช้</b> อ่านเรียงบทได้เลย แต่ละบทจบด้วยคำถามทบทวนพร้อมเฉลย · ภาคผนวก ก คือคู่มือพล็อตทีละขั้นสำหรับฝึกด้วยมือ · ภาคผนวก ค เป็นกราฟเปล่าสำหรับถ่ายเอกสารไปฝึก</div>
</section>
<section class="toc"><h2>สารบัญ</h2><ul class="toc-list">${toc}
<li class="toc-ch"><a href="#ap-a"><b>ภาคผนวก ก</b> วิธีพล็อต Smith Chart ทีละขั้น</a></li>
<li class="toc-ch"><a href="#ap-b"><b>ภาคผนวก ข</b> ตารางสัญลักษณ์และคำอ่าน</a></li>
<li class="toc-ch"><a href="#ap-c"><b>ภาคผนวก ค</b> กราฟเปล่าสำหรับฝึกพล็อต</a></li>
</ul></section>
${chapters}
<section class="chapter" id="ap-a"><h2><span class="chnum">ภาคผนวก ก</span>วิธีพล็อต Smith Chart ทีละขั้น</h2>
<p class="chintro">ลำดับการพล็อตโจทย์ single stub ของ Example 7-8 แบบภาพนิ่ง ใช้ฝึกด้วยมือบนกราฟกระดาษได้โดยตรง ทุกค่าคำนวณโดยแอป</p>
<section class="sec"><h3><span class="secnum">ก.1</span> ลำดับห้าขั้นของโจทย์ single stub</h3>
${(() => { figNo = 0; return walkthroughHtml('ก.1'); })()}
</section></section>
<section class="chapter" id="ap-b"><h2><span class="chnum">ภาคผนวก ข</span>ตารางสัญลักษณ์และคำอ่าน</h2>
<p class="chintro">สัญลักษณ์ทุกตัวที่ใช้ในคอร์สนี้ พร้อมคำอ่านภาษาไทยและความหมายสั้น ๆ</p>${glossary}</section>
<section class="chapter" id="ap-c"><h2><span class="chnum">ภาคผนวก ค</span>กราฟเปล่าสำหรับฝึกพล็อต</h2>
<p class="chintro">พิมพ์หน้านี้แล้วใช้วงเวียนกับไม้บรรทัดฝึกตามภาคผนวก ก ได้เลย</p>
<div class="blank-chart">${blankChart}</div></section>
</body></html>`);
console.log('เขียน', OUT, 'สำเร็จ');
