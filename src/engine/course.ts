// ---------------------------------------------------------------
// "Antenna Impedance Matching" course — structured after the parts of
// Wilfred N. Caron's ARRL book that exist in the user's PDF
// (Introduction, Chapter I–V, Chapter VI Examples 1–6). Figures are
// INTERACTIVE RECREATIONS computed by this app's engines, following
// the idea of each book figure; they are not copies of the book art.
// ---------------------------------------------------------------
import { Circuit, AntennaPoint, CircuitElement, buildCircuit, makeElement, wavelength } from './circuit';
import { t } from './i18n';
import { StepLine } from './explain';
import { Complex, C, abs, fmtNum } from './complex';
import { solveCircuit, solveSweep, sweepMaxSwr } from './solver';
import { gammaFromZ, zFromGamma, normalize, admittance, rotateTowardGenerator, lineInput, swrFromGamma, stubInput, XL, XC } from './rf';
import { solveSingleStub } from './matching';
import type { PlotSeries } from '../components/MiniPlot';
import type { SmithPoint, SmithCurve } from '../components/SmithFigure';
import { GLOSSARY, GROUP_LABEL } from './glossary';

export type Figure =
  | { kind: 'single-stub-walkthrough' }
  | { kind: 'stub-reactance' }
  | { kind: 'plot'; title: string; xLabel: string; yLabel: string; xMin: number; xMax: number; yMin?: number; yMax?: number; series: PlotSeries[]; xTicks?: number[]; yTicks?: number[]; markers?: { x: number; y: number; text: string; color?: string }[]; caption?: string }
  | { kind: 'smith'; title: string; points?: SmithPoint[]; curves?: SmithCurve[]; swr?: number[]; showY?: boolean; rCircles?: number[]; xCircles?: number[]; gCircles?: number[]; bCircles?: number[]; regions?: boolean; labels?: { z: Complex; text: string }[]; caption?: string }
  | { kind: 'chart'; title: string; points?: SmithPoint[]; curves?: SmithCurve[]; swr?: number[]; showY?: boolean;
      scale?: boolean; fine?: boolean; grid?: 'full' | 'light' | 'none'; table?: boolean;
      halves?: boolean; angles?: boolean; lcBar?: boolean; glyphs?: { z: Complex; kind: 'L' | 'C' | 'R' }[];
      rays?: { z: Complex; label?: string; cls?: string }[]; readout?: Complex; rCircles?: number[]; xCircles?: number[];
      gCircles?: number[]; bCircles?: number[]; labels?: { z: Complex; text: string }[]; caption?: string }
  | { kind: 'quiz'; question: string; choices: string[]; answer: number; explain: string; hint?: string;
      chart?: { points?: SmithPoint[]; curves?: SmithCurve[]; swr?: number[]; showY?: boolean; scale?: boolean;
                fine?: boolean; grid?: 'full' | 'light' | 'none'; table?: boolean; halves?: boolean; angles?: boolean;
                lcBar?: boolean; glyphs?: { z: Complex; kind: 'L' | 'C' | 'R' }[];
                rays?: { z: Complex; label?: string; cls?: string }[];
                readout?: Complex; rCircles?: number[]; xCircles?: number[]; gCircles?: number[];
                bCircles?: number[]; labels?: { z: Complex; text: string }[] } }
  | { kind: 'circuit'; title: string; circuit: Circuit; caption?: string }
  | { kind: 'wave'; title: string; gammaMag: number; gammaDeg?: number; len?: number; caption?: string }
  | { kind: 'table'; title: string; head: string[]; rows: (string | number)[][]; caption?: string }
  | { kind: 'lab'; label: string; circuit: () => Circuit; swrTarget?: number | null; showY?: boolean; note?: string }
  | { kind: 'lcases'; title: string; table: AntennaPoint[]; f0: number; Z0: number; caption?: string };

export interface Section {
  id: string;
  title: string;
  lines: StepLine[];
  figures?: Figure[];
}
export interface Chapter {
  id: string;
  num: string;
  title: string;
  titleTh: string;
  intro: string;
  sections: Section[];
}

const T = (text: string): StepLine => ({ kind: 'text', text });
const M = (tex: string): StepLine => ({ kind: 'math', tex });
const N = (text: string): StepLine => ({ kind: 'note', text });
const W = (text: string): StepLine => ({ kind: 'warn', text });
const R = (tex: string): StepLine => ({ kind: 'result', tex });
const K = (text: string): StepLine => ({ kind: 'code', text });
const fz = (z: Complex, d = 2) => `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}`;
const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/** แถวตารางแปลงระยะบนสาย: ความยาวจริง ↔ ความยาวไฟฟ้า ↔ มุม (คำนวณสดทุกค่า) */
const distRow = (f: number, vf: number, l: number, note: string): string[] => {
  const lam = wavelength(f, vf);
  const n = l / lam;
  return [`${fmtNum(f / 1e6, 1)} MHz`, fmtNum(vf, 2), `${fmtNum(l, 4)} m`, `${fmtNum(lam, 4)} m`,
    `${fmtNum(n, 4)} λ`, `${fmtNum(n * 360, 2)}°`, `${fmtNum(n * 720, 1)}°`, note];
};

/** สาย 0.5 m เส้นเดียวกันที่ 100 MHz มองผ่านสองค่า VF — ใช้ร่วมกันทั้งกราฟเส้นและกราฟสมิธของหัวข้อ I.2 */
const LAM_AIR = wavelength(100e6, 1);
const LAM_RG8 = wavelength(100e6, 0.66);
const DIST_ZL = C(25, 25);
/** จุดบนวงกลม SWR ตั้งแต่โหลดจนถึงระยะ dMax (หน่วย λ) สำหรับวาดส่วนโค้งการเดินทาง */
const walkZs = (dMax: number, n = 60): Complex[] =>
  linspace(0, dMax, n).map((d) => normalize(lineInput(DIST_ZL, 50, d, 0), 50));

// ---------- data from the book (as given in the summary) ----------
export const EX1_TABLE: AntennaPoint[] = [{ f: 12.0e6, R: 10, X: -60 }, { f: 12.2e6, R: 16.5, X: -55 }, { f: 12.4e6, R: 20, X: -50 }];
export const EX2_TABLE: AntennaPoint[] = [{ f: 50e6, R: 52, X: -45 }, { f: 51e6, R: 67.5, X: -32.5 }, { f: 52e6, R: 87, X: -20 }, { f: 53e6, R: 120, X: -26 }, { f: 54e6, R: 110, X: -70 }];
export const EX5_TABLE: AntennaPoint[] = [{ f: 28e6, R: 20, X: -120 }, { f: 29e6, R: 20, X: -110 }, { f: 30e6, R: 20, X: -100 }];
export const CH2_TABLE: AntennaPoint[] = [{ f: 175e6, R: 32, X: 42 }, { f: 200e6, R: 50, X: 65 }, { f: 225e6, R: 100, X: 65 }];
const LAM29 = (299792458 * 0.66) / 29e6; // RG-8 (vf 0.66) wavelength at 29 MHz
export const EX5_LINE_LEN = (2.8 * 0.3048) / LAM29; // 2.8 ft in λ
export const EX5_STUB_LEN = (5.56 * 0.3048) / LAM29; // 5.56 ft in λ

// ---------- reverse ladder: antenna impedance that makes a given network produce a target z_in ----------
/** elements listed from source to load (WITHOUT the antenna); lines/stubs scale with f / fDesign */
export const reverseAntenna = (elements: CircuitElement[], fDesign: number, Z0: number, targets: { f: number; zin: Complex }[]): AntennaPoint[] =>
  targets.map(({ f, zin }) => {
    const sc = f / fDesign;
    let Z: Complex = C(zin.re * Z0, zin.im * Z0);
    for (const el of elements) {
      if (el.type === 'inductor' || el.type === 'capacitor') {
        const X = el.type === 'inductor' ? XL(f, el.params.L * 1e-9) : XC(f, el.params.C * 1e-12);
        if (el.orient === 'series') Z = C(Z.re, Z.im - X);
        else {
          const Y = admittance(Z);
          const Yel = C(0, -1 / X); // shunt element admittance
          Z = admittance(C(Y.re - Yel.re, Y.im - Yel.im));
        }
      } else if (el.type === 'resistor') {
        if (el.orient === 'series') Z = C(Z.re - el.params.R, Z.im);
        else { const Y = admittance(Z); Z = admittance(C(Y.re - 1 / el.params.R, Y.im)); }
      } else if (el.type === 'tline' || el.type === 'qwt') {
        const Z0l = el.type === 'qwt' ? el.params.Zt : el.params.Z0;
        const t = Math.tan(2 * Math.PI * (el.type === 'qwt' ? 0.25 : el.params.len) * sc);
        // Z = Z0l (ZL + jZ0l t)/(Z0l + jZL t)  ->  ZL = Z0l (Z - jZ0l t)/(Z0l - jZ t)
        const num = C(Z.re * Z0l, (Z.im - Z0l * t) * Z0l);
        const den = C(Z0l + Z.im * t, -Z.re * t);
        const d2 = den.re * den.re + den.im * den.im;
        Z = C((num.re * den.re + num.im * den.im) / d2, (num.im * den.re - num.re * den.im) / d2);
      } else if (el.type === 'stub_short' || el.type === 'stub_open') {
        const Zs = stubInput(el.type === 'stub_short' ? 'short' : 'open', el.params.Z0, el.params.len * sc);
        const Ys = admittance(Zs);
        if (el.orient === 'shunt') { const Y = admittance(Z); Z = admittance(C(Y.re - Ys.re, Y.im - Ys.im)); }
        else Z = C(Z.re - Zs.re, Z.im - Zs.im);
      }
    }
    return { f, R: Number(Z.re.toFixed(1)), X: Number(Z.im.toFixed(1)) };
  });

/** search the lossless line length (λ at fDesign) minimising the worst in-band SWR */
export const bestLineLength = (Z0line: number, table: AntennaPoint[], fDesign: number, Z0: number): { len: number; maxSwr: number } => {
  let best = { len: 0.001, maxSwr: Infinity };
  for (let len = 0.001; len < 0.5; len += 0.001) {
    const m = sweepMaxSwr(solveSweep(buildCircuit(fDesign, Z0, [['tline', 'series', { Z0: Z0line, len, vf: 0.66, lossDb: 0 }], ['antenna', 'series', {}, table]])));
    if (m < best.maxSwr) best = { len: Number(len.toFixed(3)), maxSwr: m };
  }
  return best;
};
export const EX2_BEST = bestLineLength(83, EX2_TABLE, 52e6, 50);

// illustrative antenna tables for Examples 3/4/6: reverse-solved from the book's network so the
// network actually lands inside the target circle (the real antenna data are not in the file summary)
const EX3_NET = () => [makeElement('tline', 'series', { Z0: 64, len: 0.1, vf: 0.66, lossDb: 0 }), makeElement('tline', 'series', { Z0: 105, len: 0.1, vf: 0.66, lossDb: 0 }), makeElement('stub_short', 'shunt', { Z0: 25, len: 0.25 })];
export const EX3_TABLE_ILLUS: AntennaPoint[] = reverseAntenna(EX3_NET(), 3.75e6, 50, [{ f: 3.5e6, zin: C(0.75, -0.4) }, { f: 3.75e6, zin: C(1, 0) }, { f: 4.0e6, zin: C(1.3, 0.4) }]);
const EX4_NET = () => [makeElement('capacitor', 'series', { C: 150.5 }), makeElement('inductor', 'series', { L: 13000 }), makeElement('capacitor', 'shunt', { C: 1274 }), makeElement('capacitor', 'series', { C: 588 })];
export const EX4_TABLE_ILLUS: AntennaPoint[] = reverseAntenna(EX4_NET(), 3.75e6, 50, [{ f: 3.5e6, zin: C(0.7, -0.45) }, { f: 3.7e6, zin: C(1, 0.1) }, { f: 4.0e6, zin: C(1.4, 0.45) }]);
// placeholder values found by a coarse search so that the two REAL end points (2 and 6 MHz) come closest to SWR 3
const EX6_NET = () => [makeElement('stub_short', 'shunt', { Z0: 100, len: 0.44 }), makeElement('capacitor', 'series', { C: 5000 }), makeElement('inductor', 'series', { L: 2000 })];
export const EX6_TABLE_ILLUS: AntennaPoint[] = (() => {
  const t = reverseAntenna(EX6_NET(), 4e6, 50, [{ f: 2e6, zin: C(0.6, -0.6) }, { f: 3e6, zin: C(0.9, 0.5) }, { f: 4e6, zin: C(1.3, 0.6) }, { f: 5e6, zin: C(1.6, -0.3) }, { f: 6e6, zin: C(0.8, -0.7) }]);
  // keep the two end points the summary gives; interior points are synthetic
  t[0] = { f: 2e6, R: 92, X: -90 };
  t[t.length - 1] = { f: 6e6, R: 115, X: -25 };
  return t;
})();

// ---------- circuits ----------
export const ex1Book = () => buildCircuit(12.2e6, 50, [['inductor', 'series', { L: 1255 }], ['inductor', 'shunt', { L: 1630 }], ['antenna', 'series', {}, EX1_TABLE]]);
export const ex1Load = () => buildCircuit(12.2e6, 50, [['antenna', 'series', {}, EX1_TABLE]]);
export const ex2Load = () => buildCircuit(52e6, 50, [['antenna', 'series', {}, EX2_TABLE]]);
export const ex2Book = () => buildCircuit(52e6, 50, [['tline', 'series', { Z0: 83, len: EX2_BEST.len, vf: 0.66, lossDb: 0 }], ['antenna', 'series', {}, EX2_TABLE]]);
export const ex5Load = () => buildCircuit(29e6, 50, [['antenna', 'series', {}, EX5_TABLE]]);
export const ex5Step1 = () => buildCircuit(29e6, 50, [['inductor', 'series', { L: 467 }], ['antenna', 'series', {}, EX5_TABLE]]);
export const ex5Step2 = () => buildCircuit(29e6, 50, [['inductor', 'shunt', { L: 272 }], ['inductor', 'series', { L: 467 }], ['antenna', 'series', {}, EX5_TABLE]]);
export const ex5Full = () => buildCircuit(29e6, 50, [['stub_short', 'shunt', { Z0: 25, len: Number(EX5_STUB_LEN.toFixed(4)) }], ['tline', 'series', { Z0: 50, len: Number(EX5_LINE_LEN.toFixed(4)), vf: 0.66, lossDb: 0 }], ['inductor', 'shunt', { L: 272 }], ['inductor', 'series', { L: 467 }], ['antenna', 'series', {}, EX5_TABLE]]);
export const ch2Load = () => buildCircuit(200e6, 50, [['antenna', 'series', {}, CH2_TABLE]]);
const seriesStubLen = (Zs: number) => Math.atan(Zs / 65) / (2 * Math.PI); // open stub giving −j65 Ω at 200 MHz
export const ch2SeriesStub = (Zs: number) => () => buildCircuit(200e6, 50, [['stub_open', 'series', { Z0: Zs, len: Number(seriesStubLen(Zs).toFixed(4)) }], ['antenna', 'series', {}, CH2_TABLE]]);
export const ch2SeriesC = () => buildCircuit(200e6, 50, [['capacitor', 'series', { C: 12.24 }], ['antenna', 'series', {}, CH2_TABLE]]);
export const qwt600 = () => buildCircuit(100e6, 50, [['qwt', 'series', { Zt: 173.2 }], ['resistor', 'series', { R: 600 }]]);
const ch4Stub = solveSingleStub(C(80, -40), 50, 'short')[0];
const ch4Stub2 = solveSingleStub(C(80, -40), 50, 'short')[1];
export const ch4Circuit = () => buildCircuit(100e6, 50, [['stub_short', 'shunt', { Z0: 50, len: Number(ch4Stub.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 50, len: Number(ch4Stub.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 80, X: -40 }]]);

// ---------- computed helpers for figures ----------
const sweepZ = (c: Circuit, which: 'in' | 'L'): Complex[] => solveSweep(c).map((p) => (which === 'in' ? p.result.zin : p.result.zL));
const sweepPts = (c: Circuit, which: 'in' | 'L', cls: SmithPoint['cls'], prefix = ''): SmithPoint[] => solveSweep(c).map((p) => ({ z: which === 'in' ? p.result.zin : p.result.zL, label: `${prefix}${fmtNum(p.f / 1e6, 1)}`, cls }));
const bandRows = (c: Circuit): (string | number)[][] => solveSweep(c).map((p) => [fmtNum(p.f / 1e6, 2), fz(p.result.zL), fz(p.result.zin), fmtNum(abs(p.result.gammaIn), 3), fmtNum(p.result.swrIn, 2)]);
const swrOf = (z: Complex) => swrFromGamma(gammaFromZ(z, 1));

// series open stub reactance at f for stub of Z0 tuned to −65 Ω at 200 MHz
const stubXat = (Zs: number, f: number) => -Zs / Math.tan(2 * Math.PI * seriesStubLen(Zs) * (f / 200e6));

// Chapter III illustrative numbers
const Z_MEAS = C(1.2, 0.9); // illustrative measured impedance 0.120 λ from the load
const Z_L_FROM_MEAS = zFromGamma(rotateTowardGenerator(gammaFromZ(Z_MEAS, 1), -0.12));
const Z_SWR49 = C(0.28, 0.6);

// ---------- movement curves (series/shunt L/C) ----------
const moveSeries = (z0: Complex, dx: number): Complex[] => linspace(0, dx, 30).map((d) => C(z0.re, z0.im + d));
const moveShunt = (z0: Complex, db: number): Complex[] => {
  const y0 = admittance(z0);
  return linspace(0, db, 30).map((d) => admittance(C(y0.re, y0.im + d)));
};

export const COURSE: Chapter[] = [
  {
    id: 'intro', num: '0', title: 'Introduction', titleTh: 'บทนำ: Antenna Impedance Matching',
    intro: 'หนังสือ Antenna Impedance Matching โดย Wilfred N. Caron (ARRL) ใช้ Smith Chart เป็นเครื่องมือหลักในการออกแบบ matching network โดยมองอิมพีแดนซ์ของเสาอากาศเป็น "เส้นโค้งหลายจุดตามความถี่" ไม่ใช่ค่าเดียว หัวข้อนี้สร้างเนื้อหาตามโครงของหนังสือเฉพาะส่วนที่มีในไฟล์ (บทนำ, Chapter I–V และ Chapter VI Example 1–6) และสร้างภาพประกอบขึ้นใหม่แบบโต้ตอบด้วย engine ของแอปตามแนวคิดของแต่ละ Figure',
    sections: [
      {
        id: 'about', title: 'ขอบเขตของเนื้อหาในไฟล์ และ Errata',
        lines: [
          T('ไฟล์ที่ใช้อ้างอิงมี 157 หน้า: ส่วนต้น (Foreword, Preface, About the Author, Contents, Errata), Introduction, Chapter I–V ครบ และ Chapter VI ถึง Example 6 บางส่วน — ไฟล์จบกลางตัวอย่างที่หน้า 6-39 ซึ่งเป็น schematic ของ matching solution (มีขั้นตอนถึงการทดลอง short-circuited stub 100 Ω แล้ว แต่ Fig. 6-6(a)–(c) ไม่มีในไฟล์) ส่วน Example 7–11 และ Chapter VII (Construction of Overlay Tracing Box) ไม่มีในไฟล์ แม้สารบัญจะระบุไว้'),
          W('Errata (หน้า 10–13 ของไฟล์) แก้ไขเครื่องหมายของ reactance/susceptance, สมการ characteristic impedance, VSWR, reflected power, line transformer, open/short stub และทิศทางการเคลื่อนจุดบน Smith Chart — เวลาทำโจทย์จากหนังสือให้ใช้ Errata ประกอบ สูตรในหัวข้อนี้ใช้เครื่องหมายมาตรฐาน (inductive = +jX, capacitive = −jX) ซึ่งตรงกับ engine ของแอป'),
          N('ภาพในหัวข้อนี้เป็น "ภาพจำลองตามแนวคิดของ Figure ในหนังสือ" คำนวณสดด้วย engine ไม่ใช่ภาพจากหนังสือ ตัวเลขที่ระบุว่า "จากหนังสือ" คือค่าที่ยกมาจากส่วนของหนังสือที่ใช้อ้างอิงได้ (ไฟล์ 157 หน้าข้างต้น) ส่วนค่าที่ระบุว่า "คำนวณโดยแอป" คือค่าที่ engine คำนวณเพิ่มเติม และค่าที่ระบุว่า "ค่าสมมุติ" คือตัวเลขที่ผู้จัดทำกำหนดขึ้นเพื่อประกอบคำอธิบาย ไม่ใช่ตัวเลขจากหนังสือ'),
        ],
      },
      {
        id: 'symbols', title: 'ตัวย่อและสัญลักษณ์ที่ใช้ทั้งเว็บ',
        lines: [
          T('ทุกบทใช้สัญลักษณ์ชุดเดียวกัน ตารางด้านล่างสรุปตัวที่พบบ่อยที่สุด · รายการเต็มพร้อมสูตรและลิงก์ไปยังหัวข้อที่อธิบาย กดปุ่ม "📗 ตัวย่อ" ที่แถบบนสุดของเว็บได้ทุกเมื่อ'),
          N('บนหน้า Lab: เอาเมาส์ชี้ค่าที่แผง SMITH CHART (Z_in, z_in, Γ, SWR, Return loss) หัวตารางแบนด์ หรือการ์ดอุปกรณ์ จะมีคำอธิบายสั้น ๆ ขึ้นมา'),
          N('ตัวพิมพ์เล็ก (z, r, x, y, g, b) หมายถึงค่าที่หารด้วย Z₀ แล้ว (normalized) ส่วนตัวพิมพ์ใหญ่ (Z, R, X, Y, G, B) คือค่าจริงที่มีหน่วยโอห์มหรือซีเมนส์'),
        ],
        figures: [
          { kind: 'table', title: 'สัญลักษณ์ที่พบบ่อย — อ่านว่าอะไร และแทนอะไร', head: ['สัญลักษณ์', 'อ่านว่า', 'ชื่อ', 'หน่วย', 'ความหมาย'],
            rows: GLOSSARY.filter((g) => g.group === 'basic' || g.group === 'norm' || g.group === 'smith').map((g) => [g.sym, g.say ?? '—', `${g.nameTh} (${g.name})`, g.unit ?? '—', g.short]),
            caption: `กลุ่มที่เหลือ (${GROUP_LABEL.line}, ${GROUP_LABEL.match}, ${GROUP_LABEL.unit}, ${GROUP_LABEL.ui}) ดูได้ในปุ่ม 📗 ตัวย่อ` },
        ],
      },
      {
        id: 'concepts', title: 'แนวคิดหลักของบทนำ',
        lines: [
          T('เป้าหมายของการ matching คือส่งกำลังจากเครื่องส่งไปยังเสาอากาศให้มากที่สุดตลอดแบนด์ที่ใช้งาน หัวข้อสำคัญในบทนำ: input impedance, antenna efficiency, radiation pattern, resonance, bandwidth, การวัดอิมพีแดนซ์เสาอากาศในทางปฏิบัติ, transmission system และ antenna reciprocity'),
          T('Figure A — Reciprocity theorem: เสาอากาศ A และ B สองต้น กรณี A ส่ง/B รับ กับ B ส่ง/A รับ ให้อัตราส่วนสัญญาณที่รับได้ต่อสัญญาณที่ส่ง (mutual impedance) เท่ากันทั้งสองกรณี'),
          T('ผลตามทฤษฎีทั่วไป: อิมพีแดนซ์และ radiation pattern ของเสาอากาศจึงเหมือนกันทั้งตอนส่งและตอนรับ'),
          K('แผนภาพจำลองตามแนวคิด Fig. A\n\nA (ส่ง) ))) ~~~~~ ((( B (รับ)\n\nB (ส่ง) ))) ~~~~~ ((( A (รับ)      →  อัตราส่วนรับ/ส่งเท่ากัน (reciprocity)'),
          N('แนวคิดที่ต่างจากเว็บ Smith Chart ทั่วไป: เสาอากาศจริงมี Z(f) = R(f) + jX(f) เปลี่ยนตามความถี่ ในแอปนี้ใช้อุปกรณ์ "Antenna (curve)" ใส่ตาราง f, R, X แล้วกวาดความถี่ดูเส้นโค้งบน Smith Chart'),
        ],
        figures: [
          { kind: 'lab', label: 'เปิด Lab ด้วยเสาอากาศแบบตาราง (Ex.1 12.0–12.4 MHz)', circuit: ex1Load, swrTarget: 2, note: 'จุดสีเขียว 3 จุดคืออิมพีแดนซ์ที่ 12.0 / 12.2 / 12.4 MHz วงกลมสีส้มคือเป้าหมาย SWR ≤ 2' },
        ],
      },
    ],
  },
  {
    id: 'ch1', num: 'I', title: 'The Transmission Line', titleTh: 'สายส่ง: พื้นฐานก่อนเข้า Smith Chart',
    intro: 'สายส่ง RF ต้องมองเป็นระบบ distributed-constant (R, L, C, G กระจายตามความยาว) ไม่ใช่ lumped จากนั้นจึงได้ Z₀, β, λ, ความเร็วเฟส, คลื่นตกกระทบ/สะท้อน, Γ, VSWR, กำลังสะท้อน, mismatch loss และ loss ที่เพิ่มเพราะ SWR',
    sections: [
      {
        id: 'lumped', title: 'Lumped vs Distributed (Fig. 1-1, 1-2)',
        lines: [
          T('ที่ความถี่ต่ำ วงจรเป็น lumped-constant: L และ C เป็นก้อนแยกกัน (Fig. 1-1) ที่ความถี่สูงเมื่อความยาวสายเทียบได้กับ λ ต้องมองสายเป็น distributed-constant: ความต้านทาน R, ความเหนี่ยวนำ L, ความจุ C และ conductance G กระจายต่อหน่วยความยาว (Fig. 1-2)'),
          K('จำลองตามแนวคิด Fig. 1-1 (lumped):      Source ──[L]──┬──\n                                     [C]\n                                      ⏚\n\nจำลองตามแนวคิด Fig. 1-2 (distributed):  ──R──L──┬──R──L──┬──R──L──┬──\n                                 C  G      C  G      C  G\n                                 ⏚         ⏚         ⏚'),
          N('แผนภาพ ASCII ด้านบนเป็นภาพจำลอง ไม่ใช่ภาพจากหนังสือ — หนังสือระบุเพียงว่า Fig. 1-1 ประกอบด้วย source, C และ L การจัดวางเป็น series L / shunt C ในที่นี้เป็นตัวอย่างประกอบ ส่วน Fig. 1-2 วาดตามแบบจำลองสายส่งมาตรฐาน (R–L อนุกรม, C–G ขนาน ต่อหน่วยความยาว)'),
          T('สายอนันต์ (infinite line) มีอิมพีแดนซ์ขาเข้าเท่ากับ Z₀ และสายจำกัดที่ terminate ด้วย Z₀ ก็ให้ผลเหมือนสายอนันต์ (Fig. 1-3)'),
          M('Z_0 = \\sqrt{\\frac{R + j\\omega L}{G + j\\omega C}} \\;\\xrightarrow{\\text{lossless}}\\; Z_0 = \\sqrt{\\frac{L}{C}}'),
          T('ตัวอย่างประกอบ (ค่าสมมุติ ไม่ใช่ตัวเลขจากหนังสือ): สายโคแอกเชียลที่มี L = 250 nH/m และ C = 100 pF/m'),
          R('Z_0 = \\sqrt{\\frac{250\\times10^{-9}}{100\\times10^{-12}}} = 50\\,\\Omega'),
        ],
      },
      {
        id: 'wave', title: 'คลื่นเดินทางและเฟเซอร์ (Fig. 1-4 ถึง 1-6)',
        lines: [
          T('Fig. 1-4/1-5: การแทน R, L, C ด้วยเวกเตอร์ (เฟเซอร์) ในวงจร RLC อนุกรม: แรงดันบน L นำหน้ากระแส 90° บน C ตามหลัง 90° รวมเป็น Z = R + j(X_L − X_C)'),
          M('\\beta = \\frac{2\\pi}{\\lambda},\\qquad \\lambda = \\frac{v_p}{f} = \\frac{c\\,\\text{VF}}{f},\\qquad v_p = \\frac{1}{\\sqrt{LC}}'),
          T('Fig. 1-6: คลื่นเดินทาง (travelling wave) แทนด้วยเวกเตอร์ที่หมุนตามตำแหน่ง βl และรูปไซน์ตามเวลา คลื่นตกกระทบ E⁺ เดินไปทางโหลด คลื่นสะท้อน E⁻ เดินกลับทาง generator'),
          T('ระยะบนสายเขียนได้สามแบบ และต้องแปลงไปมาให้คล่อง เพราะโจทย์แต่ละข้อให้มาไม่เหมือนกัน: ความยาวจริงเป็นเมตร · ความยาวไฟฟ้าเป็นเท่าของ λ · และมุม βl เป็นองศา'),
          M('\\frac{l}{\\lambda} = \\frac{l\\,f}{c\\,\\text{VF}},\\qquad \\beta l = 360^\\circ \\times \\frac{l}{\\lambda},\\qquad \\text{มุมหมุนบนกราฟ} = 2\\beta l'),
          T('ตัวอย่างที่ 1 — จากเมตรไปเป็น λ: สาย RG-8 (VF = 0.66) ยาว 0.5 m ที่ 100 MHz · λ ในสาย = c × 0.66 / 100 MHz = 1.9786 m · l/λ = 0.5 / 1.9786 = 0.2527 λ · βl = 360° × 0.2527 = 90.97° · จุดบนกราฟหมุนไป 2βl = 181.9° (คำนวณโดยแอป)'),
          T('ตัวอย่างที่ 2 — ย้อนทางจาก λ ไปเป็นเมตร: โจทย์บอก 0.15 λ บนสายเส้นเดิมที่ 100 MHz ความยาวจริงคือ 0.15 × 1.9786 = 0.2968 m ส่วนที่ 29 MHz สายเส้นเดียวกันต้องยาวถึง 1.0234 m จึงจะได้ 0.15 λ เท่ากัน'),
          N('VF เปลี่ยนคำตอบทั้งหมด: สายยาวเท่ากัน 0.5 m ที่ความถี่เดียวกัน ถ้าเดินในอากาศ (VF = 1) ได้แค่ 0.1668 λ แต่ถ้าเป็น RG-8 (VF = 0.66) ได้ 0.2527 λ เกือบ λ/4 — นี่คือเหตุผลที่ต้องกรอก VF ให้ตรงรุ่นสายเสมอ'),
          N('ในแอป: อุปกรณ์ Transmission Line มี Velocity factor (VF) สำหรับแปลงความยาวไฟฟ้า (λ) เป็นความยาวจริง (เมตร) ดูได้ในแผง PROPERTIES'),
        ],
        figures: [
          { kind: 'plot', title: 'ความยาวจริงเป็นเมตร แปลงเป็นความยาวไฟฟ้า (λ) ที่ 100 MHz',
            xLabel: 'ความยาวจริงของสาย (m)', yLabel: 'ความยาวไฟฟ้า (λ)', xMin: 0, xMax: 1, yMin: 0, yMax: 0.55,
            series: [
              { name: 'ในอากาศ VF = 1.00', points: linspace(0, 1, 51).map((l) => [l, l / LAM_AIR] as [number, number]) },
              { name: 'RG-8 VF = 0.66', points: linspace(0, 1, 51).map((l) => [l, l / LAM_RG8] as [number, number]) },
            ],
            xTicks: [0, 0.25, 0.5, 0.75, 1], yTicks: [0, 0.125, 0.25, 0.375, 0.5],
            markers: [
              { x: 0.5, y: 0.5 / LAM_AIR, text: 'VF 1.00 → 0.1668 λ' },
              { x: 0.5, y: 0.5 / LAM_RG8, text: 'VF 0.66 → 0.2527 λ' },
            ],
            caption: 'ทั้งสองเส้นเป็นเส้นตรงผ่านจุดกำเนิด ความชันคือ 1/λ ของสายเส้นนั้น · ลากขึ้นจาก 0.5 m จะตัดสองเส้นคนละที่ นั่นคือคำตอบของสองแถวแรกในตารางถัดไป · เส้น RG-8 ชันกว่าเพราะคลื่นเดินช้ากว่า λ จึงสั้นกว่า ความยาวจริงเท่าเดิมจึงนับเป็น λ ได้มากกว่า' },
          { kind: 'table', title: 'ตัวอย่างการหาระยะ: ความยาวจริง ↔ ความยาวไฟฟ้า ↔ มุม (คำนวณโดยแอป)',
            head: ['ความถี่', 'VF', 'ความยาวจริง l', 'λ ในสาย', 'l/λ', 'βl', 'มุมหมุนบนกราฟ 2βl', 'ที่มาของตัวเลข'],
            rows: [
              distRow(100e6, 1, 0.5, 'สายยาวเท่ากัน แต่เดินในอากาศ'),
              distRow(100e6, 0.66, 0.5, 'สายวัดของหัวข้อ 11.6'),
              distRow(29e6, 0.66, 0.85344, 'สาย 2.8 ft ของ Example 5'),
              distRow(200e6, 0.66, 0.1029, 'สตับของโจทย์ series stub'),
            ],
            caption: 'สองแถวแรกคือสายยาวเท่ากันที่ความถี่เดียวกัน ต่างกันแค่ VF · แถวที่สามกับสี่คือความยาวจริงที่ใช้ในบทหลัง เมื่อแปลงเป็น λ แล้วตรงกับตัวเลขในโจทย์พอดี (0.1251 λ และ 0.104 λ) · คอลัมน์สุดท้ายคือมุมที่จุดหมุนไปบนกราฟ ซึ่งเป็นสองเท่าของ βl เสมอ' },
          { kind: 'smith', title: 'ผลบนกราฟ: สาย 0.5 m เส้นเดียวกัน แต่คนละ VF พาจุดไปคนละที่ (โหลด 25 + j25 Ω · คำนวณโดยแอป)',
            points: [
              { z: normalize(DIST_ZL, 50), label: 'โหลด 25 + j25 Ω', cls: 'load' },
              { z: normalize(lineInput(DIST_ZL, 50, 0.5 / LAM_AIR, 0), 50), label: 'VF 1.00 · 0.1668 λ', cls: 'gen' },
              { z: normalize(lineInput(DIST_ZL, 50, 0.5 / LAM_RG8, 0), 50), label: 'VF 0.66 · 0.2527 λ', cls: 'in' },
            ],
            curves: [
              { zs: walkZs(0.5 / LAM_AIR), cls: 'gen', arrow: true },
              { zs: walkZs(0.5 / LAM_RG8), cls: 'in', dashed: true, arrow: true },
            ],
            swr: [2.618],
            caption: 'ทั้งสองเส้นทางออกจากจุดโหลดจุดเดียวกัน เดินตามวงกลม SWR วงเดียวกัน (SWR = 2.618 ไม่เปลี่ยนเพราะสายไร้การสูญเสีย) ต่างกันแค่เดินไปไกลเท่าไร · สายในอากาศหมุนไป 120.1° ได้ 130.2 − j8.9 Ω · สาย RG-8 หมุนไป 181.9° เกือบครึ่งรอบ ได้ 48.3 − j49.1 Ω ซึ่งเกือบเป็นส่วนกลับของโหลด · สายเส้นเดียวกันยาวเท่ากันแท้ ๆ แต่เครื่องวัดอ่านได้คนละค่า' },
        ],
      },
      {
        id: 'gamma', title: 'Reflection coefficient และ VSWR (Fig. 1-7, 1-8)',
        lines: [
          M('\\Gamma = \\frac{E^-}{E^+} = \\frac{Z_L - Z_0}{Z_L + Z_0},\\qquad VSWR = \\frac{E_{max}}{E_{min}} = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|}'),
          T('ตัวอย่างประกอบ (ค่าสมมุติ): โหลด 100 Ω บนสาย 50 Ω → Γ = (100 − 50)/(100 + 50) = 1/3 → VSWR = 2'),
          T('Fig. 1-7 (จำลอง): ความสัมพันธ์ระหว่าง |Γ| กับ VSWR · Fig. 1-8 (จำลอง): สายปลายเปิด (Γ = +1) เกิดคลื่นนิ่งเต็มรูป แรงดันสูงสุดที่ปลายเปิด กระแสเป็นศูนย์ที่ปลายเปิด'),
        ],
        figures: [
          { kind: 'plot', title: 'ตามแนวคิด Fig. 1-7: |Γ| เทียบกับ VSWR', xLabel: 'VSWR', yLabel: '|Γ|', xMin: 1, xMax: 10, yMin: 0, yMax: 1, series: [{ name: '|Γ| = (S−1)/(S+1)', points: linspace(1, 10, 91).map((s) => [s, (s - 1) / (s + 1)] as [number, number]) }], xTicks: [1, 2, 3, 4, 5, 6, 8, 10], markers: [{ x: 2, y: 1 / 3, text: 'S = 2 → |Γ| = 0.333' }, { x: 3, y: 0.5, text: 'S = 3 → 0.5' }] },
          { kind: 'wave', title: 'ตามแนวคิด Fig. 1-8: คลื่นนิ่งบนสายปลายเปิด (Γ = +1)', gammaMag: 1, gammaDeg: 0, len: 1 },
          { kind: 'wave', title: 'เทียบ: โหลด 100 Ω บนสาย 50 Ω (|Γ| = 1/3, VSWR = 2)', gammaMag: 1 / 3, gammaDeg: 0, len: 1 },
        ],
      },
      {
        id: 'power', title: 'กำลังสะท้อน, mismatch loss และ loss เพิ่มจาก SWR (Fig. 1-9, 1-10)',
        lines: [
          M('P_{refl} = |\\Gamma|^2 P_{inc},\\qquad P_{load} = (1 - |\\Gamma|^2) P_{inc},\\qquad \\text{Mismatch loss} = -10\\log_{10}(1 - |\\Gamma|^2)\\ \\text{dB}'),
          T('ตัวอย่างประกอบ (ค่าสมมุติ) VSWR = 2: |Γ| = 1/3 → กำลังสะท้อน 11.1 % → mismatch loss 0.51 dB · VSWR = 3: |Γ| = 0.5 → สะท้อน 25 % → 1.25 dB'),
          T('เมื่อสายมีการสูญเสีย คลื่นสะท้อนต้องเดินทางไป-กลับ จึงเกิด additional loss ตาม SWR (ในหนังสือแสดงเป็นกราฟ Fig. 1-10) สูตรมาตรฐานที่แอปใช้คำนวณกราฟจำลองด้านล่าง (ตาม ARRL Antenna Book):'),
          M('L_{total} = 10\\log_{10}\\!\\left[\\frac{a^2 - |\\Gamma|^2}{a(1 - |\\Gamma|^2)}\\right],\\quad a = 10^{L_{matched}/10},\\qquad L_{add} = L_{total} - L_{matched}'),
          N('Power handling: แรงดันสูงสุดบนสาย = E_inc(1 + |Γ|) ดังนั้น SWR สูง = แรงดันยอดสูง กำลังที่ส่งได้ปลอดภัยจึงลดลง'),
        ],
        figures: [
          { kind: 'plot', title: 'ตามแนวคิด Fig. 1-9: กำลังที่ส่งเข้าโหลดและกำลังสะท้อน (%) เทียบ SWR', xLabel: 'SWR', yLabel: '%', xMin: 1, xMax: 10, yMin: 0, yMax: 100, series: [
            { name: 'ส่งเข้าโหลด', points: linspace(1, 10, 91).map((s) => [s, 100 * (1 - ((s - 1) / (s + 1)) ** 2)] as [number, number]) },
            { name: 'สะท้อน', color: '#dc2626', points: linspace(1, 10, 91).map((s) => [s, 100 * ((s - 1) / (s + 1)) ** 2] as [number, number]) },
          ], xTicks: [1, 2, 3, 4, 5, 6, 8, 10] },
          { kind: 'plot', title: 'ตามแนวคิด Fig. 1-10: loss ที่เพิ่มเพราะ SWR สำหรับสายที่มี matched loss ต่าง ๆ', xLabel: 'SWR ที่โหลด', yLabel: 'additional loss (dB)', xMin: 1, xMax: 10, yMin: 0, yMax: 4, yTicks: [0, 1, 2, 3, 4], series: [0.5, 1, 2, 3].map((Lm, i) => ({ name: `matched ${Lm} dB`, color: ['#2563eb', '#059669', '#d97706', '#dc2626'][i], points: linspace(1, 10, 91).map((s) => { const g = (s - 1) / (s + 1); const a = 10 ** (Lm / 10); return [s, 10 * Math.log10((a * a - g * g) / (a * (1 - g * g))) - Lm] as [number, number]; }) })), xTicks: [1, 2, 3, 4, 5, 6, 8, 10] },
          { kind: 'lab', label: 'ทดลองใน Lab: โหลด 100 Ω บนสาย 50 Ω ยาว 0.5 λ (ลองเปิด Probe ดูคลื่นนิ่ง และตั้ง Loss ของสาย)', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.5, vf: 0.66, lossDb: 0 }], ['resistor', 'series', { R: 100 }]]) },
        ],
      },
    ],
  },
  {
    id: 'ch2', num: 'II', title: 'The Transmission Line as a Circuit Element', titleTh: 'สายส่งในฐานะองค์ประกอบของวงจร matching',
    intro: 'บทนี้เปลี่ยนสายส่งจาก "สายต่อสัญญาณ" ให้เป็นอุปกรณ์ในวงจร: impedance curve ของเสาอากาศ, สตับอนุกรม/ขนาน, resonant stub, quarter-wave transformer, balun และผลของ line attenuation ต่อ SWR',
    sections: [
      {
        id: 'curve', title: 'Impedance bandwidth และ impedance curve (Fig. 2-1 ถึง 2-4)',
        lines: [
          M('Z(f) = R(f) + jX(f)'),
          T('อิมพีแดนซ์ของเสาอากาศเปลี่ยนตามความถี่ เมื่อพล็อต R กับ X ของหลายความถี่ต่อกันจะได้ impedance curve บน R-X diagram (Fig. 2-1, 2-2) และเมื่อย้ายมาบน Smith Chart (Fig. 2-3) จะเห็นทันทีว่าช่วงความถี่ใดอยู่ในวงกลม SWR ที่ยอมรับได้ Fig. 2-4 แสดง curve หลังชดเชย (compensated) ที่ถูกดึงเข้าใกล้ศูนย์กลาง'),
          T('ตัวอย่างข้อมูลจากหนังสือ (โจทย์ series stub): Z₀ = 50 Ω, 175 MHz: 32 + j42, 200 MHz: 50 + j65, 225 MHz: 100 + j65 Ω'),
        ],
        figures: [
          { kind: 'plot', title: 'ตามแนวคิด Fig. 2-2: impedance curve บน R-X diagram (175–225 MHz)', xLabel: 'R (Ω)', yLabel: 'X (Ω)', xMin: 0, xMax: 120, yMin: 0, yMax: 80, series: [{ name: 'curve', points: CH2_TABLE.map((p) => [p.R, p.X] as [number, number]) }], markers: CH2_TABLE.map((p) => ({ x: p.R, y: p.X, text: `${p.f / 1e6} MHz` })) },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 2-3: curve เดียวกันบน Smith Chart (normalize 50 Ω)', points: sweepPts(ch2Load(), 'in', 'load'), curves: [{ zs: sweepZ(ch2Load(), 'in'), cls: 'load' }], swr: [2, 3], caption: 'จุดทั้งสามอยู่ครึ่งบน (inductive) และอยู่นอกวงกลม SWR 2 → ต้องชดเชยด้วย capacitive reactance' },
        ],
      },
      {
        id: 'stub', title: 'สตับเป็นรีแอกแตนซ์ (Fig. 2-6 ถึง 2-12)',
        lines: [
          M('\\text{Short-circuited stub: } Z_{in} = jZ_0\\tan\\beta l \\qquad \\text{Open-circuited stub: } Z_{in} = -jZ_0\\cot\\beta l'),
          T('สายสั้นกว่า λ/4 ปลายลัดเป็น inductive, ปลายเปิดเป็น capacitive (Fig. 2-6) การวัดอิมพีแดนซ์ที่ตำแหน่งต่าง ๆ บนสาย (Fig. 2-7) ให้ค่าที่หมุนตามวงกลม SWR คงที่ Fig. 2-8 คือ reactance ของสายปลายลัดเทียบความยาวไฟฟ้า และ Fig. 2-10/2-11 คือ reactance curve ของสตับปลายลัด/ปลายเปิด (ภาพจำลองด้านล่างวาดสำหรับ Z₀ = 25/50/75/100 Ω ตามค่าที่โจทย์ series stub ให้ลอง)'),
          T('Fig. 2-9: สตับปลายเปิดและปลายลัดยาว 0.15 λ (βl = 54°) บน Smith Chart: ปลายเปิด z = −j cot 54° = −j0.727 · ปลายลัด z = +j tan 54° = +j1.376 · Fig. 2-12: Smith Chart ที่ calibrate สเกลรอบนอกเป็นองศาไฟฟ้าของสตับ (1 รอบบนกราฟ = λ/2 = βl 180° ส่วนมุมหมุนบนกราฟ 2βl = 360°)'),
          N('ในแอป: สเกลรอบนอกของ Smith Chart เป็น wavelengths (0–0.5 λ) แปลงเป็นองศาไฟฟ้า βl ได้ด้วย ×360 และเป็นมุมหมุนบนกราฟ 2βl ด้วย ×720 (0.15 λ → βl = 54°, มุมหมุนบนกราฟ 108°)'),
        ],
        figures: [
          { kind: 'plot', title: 'ตามแนวคิด Fig. 2-8: X_in/Z₀ ของสายปลายลัด เทียบความยาวไฟฟ้า βl', xLabel: 'βl (องศา)', yLabel: 'X_in / Z₀', xMin: 0, xMax: 180, yMin: -5, yMax: 5, series: [{ name: 'tan βl', points: linspace(0, 180, 361).map((d) => [d, Math.tan((d * Math.PI) / 180)] as [number, number]) }], xTicks: [0, 45, 90, 135, 180], yTicks: [-5, -2.5, 0, 2.5, 5], caption: 'inductive (บวก) เมื่อ βl < 90°, resonance ที่ 90° (λ/4), capacitive เมื่อ 90° < βl < 180°' },
          { kind: 'plot', title: 'ตามแนวคิด Fig. 2-10: reactance ของสตับปลายลัด X = Z₀ tan βl สำหรับ Z₀ = 25/50/75/100 Ω', xLabel: 'ความยาวสตับ (λ)', yLabel: 'X (Ω)', xMin: 0, xMax: 0.25, yMin: 0, yMax: 300, series: [25, 50, 75, 100].map((Z0, i) => ({ name: `${Z0} Ω`, color: ['#2563eb', '#059669', '#d97706', '#dc2626'][i], points: linspace(0, 0.24, 97).map((l) => [l, Z0 * Math.tan(2 * Math.PI * l)] as [number, number]) })), xTicks: [0, 0.05, 0.1, 0.15, 0.2, 0.25] },
          { kind: 'plot', title: 'ตามแนวคิด Fig. 2-11: reactance ของสตับปลายเปิด X = −Z₀ cot βl', xLabel: 'ความยาวสตับ (λ)', yLabel: 'X (Ω)', xMin: 0, xMax: 0.25, yMin: -300, yMax: 0, series: [25, 50, 75, 100].map((Z0, i) => ({ name: `${Z0} Ω`, color: ['#2563eb', '#059669', '#d97706', '#dc2626'][i], points: linspace(0.01, 0.25, 97).map((l) => [l, -Z0 / Math.tan(2 * Math.PI * l)] as [number, number]) })), xTicks: [0, 0.05, 0.1, 0.15, 0.2, 0.25] },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 2-9: สตับยาว 0.15 λ ปลายเปิด (z = −j0.727) และปลายลัด (z = +j1.376)', points: [{ z: C(0, -1 / Math.tan(0.3 * Math.PI)), label: 'open 0.15λ', cls: 'stub' }, { z: C(0, Math.tan(0.3 * Math.PI)), label: 'short 0.15λ', cls: 'stub' }], curves: [
            { zs: linspace(0.001, 0.15, 40).map((l) => C(0, -1 / Math.tan(2 * Math.PI * l))), cls: 'net', arrow: true },
            { zs: linspace(0.001, 0.15, 40).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'net', arrow: true },
          ], caption: 'จาก OPEN (ขวา) และ SHORT (ซ้าย) เดินตามขอบกราฟไปทาง generator 0.15 λ' },
          { kind: 'lab', label: 'Lab: สตับปลายลัด 50 Ω ยาว 0.15 λ (ปรับความยาวดู reactance เปลี่ยน)', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.15, vf: 0.66, lossDb: 0 }]]), note: 'สายส่งที่ปลายต่อกราวด์ = short-circuited stub' },
        ],
      },
      {
        id: 'series-stub', title: 'Series stub matching: โจทย์ 175/200/225 MHz (Fig. 2-13 ถึง 2-15)',
        lines: [
          T('โจทย์จากหนังสือ: สาย Z₀ = 50 Ω โหลด 175 MHz: 32 + j42, 200 MHz: 50 + j65, 225 MHz: 100 + j65 Ω ต้องการ match ดีที่สุดที่ 200 MHz ด้วย open-circuited series stub และลอง stub impedance 25, 50, 75, 100 Ω เปรียบเทียบผลหลัง correction แล้วเทียบกับการใช้ series capacitor'),
          T('ที่ 200 MHz โหลดคือ z = 1 + j1.3 อยู่บนวงกลม r = 1 พอดี จึงต้องการรีแอกแตนซ์อนุกรม −j65 Ω (x = −1.3) เพื่อเข้าศูนย์กลาง สตับปลายเปิดให้ X = −Z₀ cot βl ดังนั้น cot βl = 65/Z₀'),
          M('Z_{0,stub} = 50\\,\\Omega:\\ \\cot\\beta l = 1.3 \\Rightarrow \\beta l = 37.6^\\circ \\Rightarrow l = 0.104\\lambda \\qquad (25\\,\\Omega: 0.058\\lambda,\\ 75\\,\\Omega: 0.136\\lambda,\\ 100\\,\\Omega: 0.158\\lambda)'),
          T('ที่ 175 และ 225 MHz ความยาวไฟฟ้าของสตับเปลี่ยน (สั้นลง/ยาวขึ้น) reactance จึงไม่ใช่ −65 Ω พอดี ตารางด้านล่างคำนวณโดยแอป:'),
          M('\\text{Series capacitor แทนสตับ: } C = \\frac{1}{2\\pi f |X|} = \\frac{1}{2\\pi(200\\times10^6)(65)} \\approx 12.24\\ \\text{pF} \\quad(\\text{หนังสือ} \\approx 12.25\\ \\text{pF})'),
          N('ข้อสังเกต: สตับ Z₀ ต่ำ (25 Ω) ให้ correction ที่ "แบน" กว่าตามความถี่ ใกล้เคียงกับ series C ส่วนสตับ Z₀ สูงเปลี่ยนเร็วกว่า จึงมี bandwidth แคบกว่า'),
        ],
        figures: [
          { kind: 'table', title: 'ผลหลัง correction (คำนวณโดยแอป)', head: ['วิธี', '175 MHz z / SWR', '200 MHz z / SWR', '225 MHz z / SWR'], rows: [
            ...[25, 50, 75, 100].map((Zs) => [`open series stub ${Zs} Ω (${fmtNum(seriesStubLen(Zs), 3)} λ)`, ...CH2_TABLE.map((p) => { const z = C(p.R / 50, (p.X + stubXat(Zs, p.f)) / 50); return `${fz(z)} / ${fmtNum(swrOf(z), 2)}`; })]),
            ['series C 12.24 pF', ...CH2_TABLE.map((p) => { const X = -1 / (2 * Math.PI * p.f * 12.24e-12); const z = C(p.R / 50, (p.X + X) / 50); return `${fz(z)} / ${fmtNum(swrOf(z), 2)}`; })],
          ] },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 2-15: curve เดิม (แดง) กับหลังใส่ series stub 50 Ω (เขียว) และ series C (ส้ม)', points: [...sweepPts(ch2Load(), 'in', 'load'), ...sweepPts(ch2SeriesStub(50)(), 'in', 'in')], curves: [{ zs: sweepZ(ch2Load(), 'in'), cls: 'load' }, { zs: sweepZ(ch2SeriesStub(50)(), 'in'), cls: 'in' }, { zs: sweepZ(ch2SeriesC(), 'in'), cls: 'mid', dashed: true }], swr: [2] },
          { kind: 'lab', label: 'Lab: open series stub 50 Ω (0.104 λ) + เสาอากาศ 175–225 MHz', circuit: ch2SeriesStub(50), swrTarget: 2 },
          { kind: 'lab', label: 'Lab: open series stub 25 Ω (0.058 λ)', circuit: ch2SeriesStub(25), swrTarget: 2 },
          { kind: 'lab', label: 'Lab: series capacitor 12.24 pF', circuit: ch2SeriesC, swrTarget: 2 },
        ],
      },
      {
        id: 'shunt-stub', title: 'Shunt stub จากข้อมูลคลื่นนิ่ง (Fig. 2-16 ถึง 2-19)',
        lines: [
          T('เมื่อวัดได้ SWR และตำแหน่งของ voltage minimum (หรือ current maximum) บนสาย จะหาได้ว่าสตับต้องอยู่ห่างจากโหลดเท่าใดและยาวเท่าใด (Fig. 2-17 เป็นกราฟช่วยหา, Fig. 2-18 เป็นตัวอย่าง) ที่จุด E_min อิมพีแดนซ์เป็นจำนวนจริง z = 1/S และ admittance y = S'),
          M('\\Gamma_L = \\frac{S-1}{S+1}\\,e^{j(\\pi + 4\\pi d_{min}/\\lambda)}\\qquad (\\text{จาก } E_{min} \\text{ ที่ระยะ } d_{min} \\text{ จากโหลด})'),
          T('จากนั้นเดินตามวงกลม SWR ไปทาง generator จนถึงวงกลม g = 1 แล้วใส่สตับขนานที่ให้ susceptance หักล้าง (เหมือนวิธี single-stub ใน Level 10) สตับปลายลัดกับปลายเปิดต่างกัน λ/4 พอดี Fig. 2-19 แสดง half-wave dipole ที่สร้างสตับไว้ในตัว element ของเสาอากาศเอง'),
          T('ตัวอย่างประกอบ (คำนวณโดยแอป, ค่าสมมุติ): S = 3, E_min อยู่ห่างโหลด 0.10 λ'),
        ],
        figures: (() => {
          const S = 3;
          const dmin = 0.1;
          const gL = { re: ((S - 1) / (S + 1)) * Math.cos(Math.PI + 4 * Math.PI * dmin), im: ((S - 1) / (S + 1)) * Math.sin(Math.PI + 4 * Math.PI * dmin) };
          const zL = zFromGamma(gL);
          const sol = solveSingleStub(C(zL.re * 50, zL.im * 50), 50, 'short')[0];
          return [
            { kind: 'table', title: 'จาก S และ d_min ไปหา Z_L และสตับ (คำนวณโดยแอป)', head: ['ขั้น', 'ค่า'], rows: [['|Γ| = (S−1)/(S+1)', fmtNum((S - 1) / (S + 1), 3)], ['มุมของ Γ_L = 180° + 720°·d_min', `${fmtNum(180 + 720 * dmin, 1)}°`], ['z_L', fz(zL, 3)], ['ตำแหน่งสตับ d (ไปทาง generator จากโหลด)', `${fmtNum(sol.dLambda, 3)} λ`], ['y ที่ตำแหน่งสตับ', fz(sol.yAtStub, 3)], ['ความยาวสตับปลายลัด l', `${fmtNum(sol.lLambda, 3)} λ`]] },
            { kind: 'wave', title: 'คลื่นนิ่งของโหลดนี้: E_min ที่ 0.10 λ จากโหลด', gammaMag: (S - 1) / (S + 1), gammaDeg: 180 + 720 * dmin, len: 0.5 },
            { kind: 'lab', label: 'Lab: วงจร shunt stub ที่ได้ (Source — Stub — TL(d) — Load)', circuit: () => buildCircuit(100e6, 50, [['stub_short', 'shunt', { Z0: 50, len: Number(sol.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 50, len: Number(sol.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: Number((zL.re * 50).toFixed(2)), X: Number((zL.im * 50).toFixed(2)) }]]) },
          ] as Figure[];
        })(),
      },
      {
        id: 'resonant', title: 'Resonant stub และ boundary circle (Fig. 2-20 ถึง 2-22)',
        lines: [
          T('สายปลายลัดยาว λ/4 มี Z_in → ∞ ที่ความถี่ resonance จึงเทียบเท่าวงจร parallel resonant LC (Fig. 2-20) เมื่อต่อขนานกับโหลด (Fig. 2-21) ที่ f₀ สตับไม่กระทบ แต่ต่ำกว่า f₀ สตับสั้นกว่า λ/4 → inductive susceptance (b < 0) และสูงกว่า f₀ → capacitive (b > 0) ใช้ "ดึง" ปลายทั้งสองของ impedance curve เข้าหากันได้ (ใช้จริงใน Example 3 และ 5)'),
          M('b_{stub}(f) = -\\cot\\!\\left(\\frac{\\pi}{2}\\frac{f}{f_0}\\right)\\frac{Z_0}{Z_{0,stub}}'),
          T('Fig. 2-22: วงกลม SWR เป้าหมาย (boundary/definition circle) เช่น SWR = 2 — ทุกจุดของ curve ต้องอยู่ภายในวงกลมนี้จึงถือว่า match ทั้งแบนด์ ในแอปเปิดได้ด้วยปุ่ม "เป้า SWR"'),
        ],
        figures: [
          { kind: 'plot', title: 'ตามแนวคิด Fig. 2-20: susceptance ของสตับปลายลัด λ/4 (25 Ω บนระบบ 50 Ω) รอบ f₀', xLabel: 'f / f₀', yLabel: 'b (normalized)', xMin: 0.8, xMax: 1.2, yMin: -1.5, yMax: 1.5, series: [{ name: 'b(f)', points: linspace(0.8, 1.2, 81).map((r) => [r, (-1 / Math.tan((Math.PI / 2) * r)) * 2] as [number, number]) }], xTicks: [0.8, 0.9, 1, 1.1, 1.2], caption: 'ต่ำกว่า f₀: b < 0 (inductive) · f₀: b = 0 · สูงกว่า f₀: b > 0 (capacitive)' },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 2-22: boundary circle SWR = 2 และ 1.5', swr: [1.5, 2], points: sweepPts(ex1Load(), 'in', 'load'), curves: [{ zs: sweepZ(ex1Load(), 'in'), cls: 'load' }], caption: 'ตัวอย่าง curve ของ Example 1 อยู่นอกวงกลม → ต้อง matching' },
          { kind: 'lab', label: 'Lab: resonant stub 25 Ω λ/4 ขนานกับโหลด 50 Ω (กวาดความถี่ดู b เปลี่ยนเครื่องหมาย)', circuit: () => buildCircuit(29e6, 50, [['stub_short', 'shunt', { Z0: 25, len: 0.25 }], ['antenna', 'series', {}, [{ f: 26e6, R: 50, X: 0 }, { f: 27.5e6, R: 50, X: 0 }, { f: 29e6, R: 50, X: 0 }, { f: 30.5e6, R: 50, X: 0 }, { f: 32e6, R: 50, X: 0 }]]]), swrTarget: 2, showY: true },
        ],
      },
      {
        id: 'qwt', title: 'Quarter-wave transformer 600 Ω → 50 Ω (Fig. 2-23, 2-24)',
        lines: [
          M('Z_{in} = \\frac{Z_t^2}{Z_L} \\Rightarrow Z_t = \\sqrt{Z_0 Z_L} = \\sqrt{600 \\times 50} \\approx 173\\,\\Omega'),
          T('บน Smith Chart (Fig. 2-24): normalize โหลด 600 Ω ด้วย Z_t = 173 Ω ได้ z′ = 3.46 หมุนครึ่งรอบ (λ/4) ได้ 0.289 แล้ว normalize กลับด้วย 50 Ω ได้ 1.0 = ศูนย์กลาง'),
        ],
        figures: [
          { kind: 'smith', title: 'ตามแนวคิด Fig. 2-24: 600 Ω บนกราฟ 173-Ω → หมุน λ/4 → 50 Ω', points: [{ z: C(600 / 173.2, 0), label: 'z′ = 3.46 (600 Ω / 173 Ω)', cls: 'load' }, { z: C(173.2 / 600, 0), label: '0.289 → ×173/50 = 1', cls: 'in' }], curves: [{ zs: linspace(0, 0.25, 40).map((l) => zFromGamma(rotateTowardGenerator(gammaFromZ(C(600 / 173.2, 0), 1), l))), cls: 'net', arrow: true }], swr: [] },
          { kind: 'lab', label: 'Lab: λ/4 transformer Z_t = 173.2 Ω กับโหลด 600 Ω', circuit: qwt600, note: 'กด Explain เพื่อดูสูตร impedance inversion Z_in = Z_t²/Z_L (ขั้น normalize ใหม่ด้วย Z_t ดูได้ในโจทย์ B-2 → เฉลย → วิธีทำบน Smith Chart)' },
        ],
      },
      {
        id: 'balun', title: 'Balun (Fig. 2-25 ถึง 2-28)',
        lines: [
          T('หนังสือแสดง balun แบบสายส่ง 4 แบบ: Bazooka balun 1:1 (Fig. 2-25), Double-bazooka balun 1:1 (Fig. 2-26), Parallel-conductor balun 1:1 (Fig. 2-27) และ Half-wave balun 4:1 (Fig. 2-28) หน้าที่ของ balun คือแปลงสายไม่สมดุล (coax) เป็นโหลดสมดุล (dipole) และในแบบ 4:1 ยังแปลงอิมพีแดนซ์ด้วย (เช่น 200 Ω → 50 Ω)'),
          K('Bazooka 1:1:    coax ──────────────╫═══ λ/4 sleeve ═══╫── dipole\nHalf-wave 4:1:  coax ──┬── λ/2 loop of coax ──┐   Z_balanced = 4 × Z_coax\n                       └──────────────────────┘'),
          N('การจำลอง balun อยู่นอกขอบเขตของ engine (แอปคำนวณวงจร one-port) จึงแสดงเป็นคำอธิบายเท่านั้น'),
        ],
      },
      {
        id: 'loss', title: 'Line attenuation กับ SWR (Fig. 2-29, 2-30)',
        lines: [
          T('สายที่มีการสูญเสียทำให้คลื่นสะท้อนถูกลดทอนสองเที่ยว SWR ที่วัดได้ที่ต้นสายจึงต่ำกว่า SWR จริงที่โหลด (Fig. 2-30) และบน Smith Chart จุดจะ "หมุนเป็นเกลียว" เข้าหาศูนย์กลาง (Fig. 2-29)'),
          M('|\\Gamma_{in}| = |\\Gamma_L|\\,10^{-L_{matched}/10} \\qquad (L_{matched} = \\text{loss ของสายในหน่วย dB})'),
        ],
        figures: [
          { kind: 'plot', title: 'ตามแนวคิด Fig. 2-30: SWR ที่ต้นสาย เทียบ SWR ที่โหลด สำหรับ line loss 0/1/2/3 dB', xLabel: 'SWR ที่โหลด', yLabel: 'SWR ที่ต้นสาย', xMin: 1, xMax: 10, yMin: 1, yMax: 10, series: [0, 1, 2, 3].map((L, i) => ({ name: `${L} dB`, color: ['#2563eb', '#059669', '#d97706', '#dc2626'][i], points: linspace(1, 10, 91).map((s) => { const g = ((s - 1) / (s + 1)) * 10 ** (-L / 10); return [s, (1 + g) / (1 - g)] as [number, number]; }) })), xTicks: [1, 2, 3, 4, 5, 6, 8, 10], yTicks: [1, 2, 4, 6, 8, 10] },
          { kind: 'lab', label: 'Lab: โหลด 200 Ω ผ่านสาย 50 Ω ยาว 0.5 λ ที่มี loss 3 dB (ดูจุด z_in เข้าใกล้ศูนย์กลางกว่า z_L)', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.5, vf: 0.66, lossDb: 3 }], ['load', 'series', { R: 200, X: 0 }]]) },
        ],
      },
    ],
  },
  {
    id: 'ch3', num: 'III', title: 'The Smith Chart', titleTh: 'Smith Chart: บทแกนกลางของหนังสือ',
    intro: 'จาก R-X diagram และ Z-θ chart ไปสู่ Smith Chart: normalize, impedance ↔ admittance, วงกลม r/x และ g/b, การเคลื่อนจุดเมื่อใส่ L/C อนุกรม/ขนาน, สเกล wavelengths toward load/generator, การหมุนตามความยาวสาย และการอ่าน SWR',
    sections: [
      {
        id: 'norm', title: 'จาก R-X diagram สู่ Smith Chart และการ normalize (Fig. 3-1 ถึง 3-6)',
        lines: [
          T('Fig. 3-1: impedance curve ของเสาอากาศบน R-X diagram · Fig. 3-2: Z-θ chart (ขนาดและมุม) · Fig. 3-3/3-4: Smith Chart แบบ impedance coordinates (Z₀ = 50 Ω) และ admittance coordinates · Fig. 3-5/3-6: หลักของ constant resistance circles กับ constant reactance curves และ normalized chart'),
          M('z = \\frac{Z}{Z_0}\\qquad \\text{ตัวอย่างจากหนังสือ: } Z = 55.2 + j43.1\\,\\Omega,\\ Z_0 = 50\\,\\Omega \\Rightarrow z = 1.104 + j0.862 \\approx 1.10 + j0.86'),
        ],
        figures: [
          { kind: 'plot', title: 'ตามแนวคิด Fig. 3-1: impedance curve บน R-X diagram (ข้อมูล Example 2, 50–54 MHz)', xLabel: 'R (Ω)', yLabel: 'X (Ω)', xMin: 0, xMax: 140, yMin: -80, yMax: 0, series: [{ name: 'curve', points: EX2_TABLE.map((p) => [p.R, p.X] as [number, number]) }], markers: EX2_TABLE.map((p) => ({ x: p.R, y: p.X, text: `${p.f / 1e6}` })) },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 3-6: z = 1.10 + j0.86 = จุดตัดของวงกลม r = 1.10 กับเส้นโค้ง x = +0.86', points: [{ z: C(1.104, 0.862), label: '1.10 + j0.86', cls: 'load' }], rCircles: [1.104], xCircles: [0.862] },
          { kind: 'lab', label: 'Lab: โหลด 55.2 + j43.1 Ω แล้วกด Explain ดูขั้น Normalize', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 55.2, X: 43.1 }]]) },
        ],
      },
      {
        id: 'admit', title: 'Impedance ↔ Admittance (Fig. 3-4, 3-7, 3-8)',
        lines: [
          M('Y = \\frac{1}{Z},\\qquad y = \\frac{1}{z} = \\frac{r - jx}{r^2 + x^2}'),
          T('โจทย์จากหนังสือ: Z = 30 + j20 Ω บนสาย 50 Ω → (คำนวณ) z = 0.6 + j0.4 → y = (0.6 − j0.4)/0.52 = 1.154 − j0.769 บน Smith Chart จุด y อยู่ตรงข้ามจุด z ผ่านศูนย์กลาง (diametrically opposite) หรืออ่านจากกราฟ admittance (Fig. 3-4) ที่ซ้อนทับ (Fig. 3-8)'),
        ],
        figures: [
          { kind: 'smith', title: 'ตามแนวคิด Fig. 3-7: z = 0.6 + j0.4 และ y = 1.154 − j0.769 (อ่านตำแหน่ง y บนสเกล Z)', points: [{ z: C(0.6, 0.4), label: 'z = 0.6 + j0.4', cls: 'load' }, { z: C(1.154, -0.769), label: 'y = 1.154 − j0.769', cls: 'y' }], curves: [{ zs: [C(0.6, 0.4), C(1, 0), C(1.154, -0.769)], cls: 'mid', dashed: true }] },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 3-8: ซ้อนกราฟ Y (เขียว) บนกราฟ Z: จุดเดิมอ่านได้ทั้ง z และ y', showY: true, points: [{ z: C(0.6, 0.4), label: 'จุดเดียวกัน', cls: 'load' }], gCircles: [1.154], bCircles: [-0.769], caption: 'อ่านบนกราฟ Z: z = 0.6 + j0.4 · อ่านบนกราฟ Y (วงกลม g = 1.154 และเส้นโค้ง b = −0.769 ที่ไฮไลต์): y = 1.154 − j0.769' },
          { kind: 'lab', label: 'Lab: 30 + j20 Ω เปิดกราฟ Y', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 30, X: 20 }]]), showY: true },
        ],
      },
      {
        id: 'move', title: 'การเคลื่อนจุดเมื่อใส่ L/C อนุกรมหรือขนาน',
        lines: [
          T('series L: เดินตามวงกลม r คงที่ ตามเข็มนาฬิกา (x เพิ่ม) · series C: เดินตามวงกลม r คงที่ ทวนเข็มนาฬิกา (x ลด) · shunt C: เดินตามวงกลม g คงที่ ตามเข็ม (b เพิ่ม) · shunt L: เดินตามวงกลม g คงที่ ทวนเข็ม (b ลด)'),
          N('กฎนี้คือหัวใจของ Chapter IV และ V ทดลองได้ทันทีใน Lab โดยลาก L/C วางอนุกรม/ขนานแล้วเลื่อนสไลเดอร์'),
        ],
        figures: [
          { kind: 'smith', title: 'จุดเริ่ม z = 0.5 + j0.3: ทิศทางของ series L/C และ shunt L/C', showY: true, points: [{ z: C(0.5, 0.3), label: 'จุดเริ่ม z', cls: 'load' }], curves: [
            { zs: moveSeries(C(0.5, 0.3), 0.8), cls: 'in', arrow: true, label: 'series L' },
            { zs: moveSeries(C(0.5, 0.3), -0.8), cls: 'mid', arrow: true, label: 'series C' },
            { zs: moveShunt(C(0.5, 0.3), 0.9), cls: 'y', arrow: true, label: 'shunt C' },
            { zs: moveShunt(C(0.5, 0.3), -0.9), cls: 'stub', arrow: true, label: 'shunt L' },
          ], caption: 'เขียว = series L (ตามเข็มบนวงกลม r), ส้ม = series C (ทวนเข็มบนวงกลม r), เขียวอมฟ้า = shunt C (ตามเข็มบนวงกลม g), ม่วง = shunt L (ทวนเข็มบนวงกลม g) — ป้ายชื่อกำกับที่ปลายลูกศร' },
        ],
      },
      {
        id: 'rotate', title: 'หาโหลดจากค่าที่วัดบนสาย: หมุน 0.120 λ (Fig. 3-9, 3-10)',
        lines: [
          T('Fig. 3-9: ใช้สายส่งวัดอิมพีแดนซ์ที่จุดห่างจากโหลด 0.120 λ · Fig. 3-10: หมุนจุดที่วัดได้ "ไปทางโหลด" (ทวนเข็ม) เป็นระยะ 0.120 λ ตามวงกลม SWR คงที่ จะได้ Z_L'),
          T(`ตัวอย่างประกอบ (ค่าสมมุติ คำนวณโดยแอป): วัดได้ z_meas = ${fz(Z_MEAS)} ที่ 0.120 λ จากโหลด → z_L = ${fz(Z_L_FROM_MEAS, 3)}`),
          M('\\text{ตรวจกลับ: } z_{meas} = \\frac{z_L + j\\tan\\beta l}{1 + j z_L \\tan\\beta l},\\quad \\beta l = 360^\\circ \\times 0.120 = 43.2^\\circ'),
        ],
        figures: [
          { kind: 'smith', title: 'ตามแนวคิด Fig. 3-10: จาก z_meas หมุนไปทางโหลด 0.120 λ', points: [{ z: Z_MEAS, label: 'z_meas', cls: 'in' }, { z: Z_L_FROM_MEAS, label: 'z_L', cls: 'load' }], curves: [{ zs: linspace(0, 0.12, 30).map((l) => zFromGamma(rotateTowardGenerator(gammaFromZ(Z_MEAS, 1), -l))), cls: 'net', arrow: true }], swr: [swrOf(Z_MEAS)] },
          { kind: 'lab', label: 'Lab: โหลด z_L ที่ได้ + สาย 0.120 λ → z_in ต้องเท่ากับ z_meas (ใช้ Probe ไล่ตำแหน่ง)', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.12, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: Number((Z_L_FROM_MEAS.re * 50).toFixed(2)), X: Number((Z_L_FROM_MEAS.im * 50).toFixed(2)) }]]) },
        ],
      },
      {
        id: 'swr', title: 'การอ่าน SWR จาก Smith Chart (Fig. 3-11)',
        lines: [
          T('วาดวงกลมที่มีศูนย์กลางอยู่กลางกราฟผ่านจุดอิมพีแดนซ์ จุดที่วงกลมตัดแกนจริงด้านขวาอ่านค่า r = SWR (ตัวอย่างในหนังสือได้ประมาณ 4.9:1)'),
          T(`ตัวอย่างประกอบ (ค่าสมมุติ): z = ${fz(Z_SWR49)} → |Γ| = ${fmtNum(abs(gammaFromZ(Z_SWR49, 1)), 3)} → SWR = ${fmtNum(swrOf(Z_SWR49), 2)}`),
        ],
        figures: [
          { kind: 'smith', title: 'ตามแนวคิด Fig. 3-11: วงกลม SWR ผ่านจุด z ตัดแกนจริงที่ r ≈ 4.9', points: [{ z: Z_SWR49, label: fz(Z_SWR49), cls: 'load' }, { z: C(swrOf(Z_SWR49), 0), label: `r = ${fmtNum(swrOf(Z_SWR49), 2)} = SWR`, cls: 'in' }], swr: [swrOf(Z_SWR49)] },
          { kind: 'lab', label: 'Lab: โหลด 14 + j30 Ω แล้วดูขั้น "SWR circle" ใน Explain', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 14, X: 30 }]]) },
        ],
      },
    ],
  },
  {
    id: 'ch4', num: 'IV', title: 'Impedance Matching Techniques', titleTh: 'เทคนิค matching: L-network 8 แบบ และ single element',
    intro: 'การเลือก reactive combination, L-type network ทั้ง 8 รูปแบบ (Fig. 4-1 a–h), การแบ่ง Smith Chart เป็น Region 1–4 เพื่อเลือก configuration (Fig. 4-2), ข้อจำกัดของการ match ด้วย element เดียว (Fig. 4-4, 4-7) และตัวอย่าง Z_A = 80 − j40 Ω → 50 Ω ด้วยสายส่ง + shorted shunt stub (Fig. 4-5, 4-6, 4-8)',
    sections: [
      {
        id: 'lnet', title: 'L-network 8 รูปแบบ (Fig. 4-1 a–h, 4-3)',
        lines: [
          T('L-network ใช้ reactive element 2 ตัว (ตัวหนึ่งอนุกรม อีกตัวขนาน) สลับ L/C และลำดับได้ 8 แบบ ตัวที่ต่อชิดโหลดคือ "ตัวแรก": (a) shunt C → series L, (b) series L → shunt C, (c) shunt L → series C, (d) series C → shunt L, (e) shunt C → series C, (f) series C → shunt C, (g) shunt L → series L, (h) series L → shunt L'),
          T('Fig. 4-3 (a–h): วิธีเดินจุดบน Smith Chart ของแต่ละแบบ — ตัวขนานเดินตามวงกลม g คงที่ ตัวอนุกรมเดินตามวงกลม r คงที่ เป้าหมายคือให้ตัวแรกพาจุดไปยังวงกลม r = 1 (ถ้าตัวที่สองเป็นอนุกรม) หรือ g = 1 (ถ้าตัวที่สองเป็นขนาน)'),
        ],
        figures: [
          ...(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const).map((id, i) => {
            const spec = [
              [['capacitor', 'shunt'], ['inductor', 'series']], [['inductor', 'series'], ['capacitor', 'shunt']], [['inductor', 'shunt'], ['capacitor', 'series']], [['capacitor', 'series'], ['inductor', 'shunt']],
              [['capacitor', 'shunt'], ['capacitor', 'series']], [['capacitor', 'series'], ['capacitor', 'shunt']], [['inductor', 'shunt'], ['inductor', 'series']], [['inductor', 'series'], ['inductor', 'shunt']],
            ][i] as [['inductor' | 'capacitor', 'shunt' | 'series'], ['inductor' | 'capacitor', 'shunt' | 'series']];
            const [first, second] = spec;
            return { kind: 'circuit', title: `ตามแนวคิด Fig. 4-1(${id}): ${first[1]} ${first[0] === 'inductor' ? 'L' : 'C'} (ชิดโหลด) → ${second[1]} ${second[0] === 'inductor' ? 'L' : 'C'}`, circuit: buildCircuit(100e6, 50, [[second[0], second[1], second[0] === 'inductor' ? { L: 60 } : { C: 30 }], [first[0], first[1], first[0] === 'inductor' ? { L: 60 } : { C: 30 }], ['load', 'series', { R: 100, X: -50 }]]), caption: 'แสดงโครงวงจรเท่านั้น ค่าอุปกรณ์/โหลดในภาพเป็นค่าสมมุติ ไม่ใช่ค่าที่ match' } as Figure;
          }),
        ],
      },
      {
        id: 'regions', title: 'เลือก configuration จาก Region บน Smith Chart (Fig. 4-2, 4-7)',
        lines: [
          T('หนังสือแบ่ง Smith Chart เป็น Region 1–4 ด้วยวงกลม r = 1 และ g = 1 (หมายเลข Region ในแอปกำหนดตามแนวคิดของ Fig. 4-2 อาจไม่ตรงลำดับเลขในหนังสือ): บริเวณภายในวงกลม r = 1 (R_L > Z₀) → ตัวแรกต้องเป็นตัวขนาน (เดินตาม g ไปตัด r = 1) · ภายในวงกลม g = 1 (G_L > Y₀) → ตัวแรกต้องเป็นตัวอนุกรม (เดินตาม r ไปตัด g = 1) · นอกทั้งสองวงกลม (ครึ่งบน / ครึ่งล่าง) → ใช้ได้ทั้งสองแบบ แต่ชนิด L/C ถูกกำหนดโดยทิศที่ต้องเดิน'),
          T('Fig. 4-4: reactive element ตัวเดียว match ได้เฉพาะโหลดที่อยู่บนวงกลม r = 1 (ใส่ตัวอนุกรม) หรือ g = 1 (ใส่ตัวขนาน) เท่านั้น โหลดอื่นต้องใช้ 2 ตัว หรือใช้สายส่งสั้น ๆ ย้ายจุดมาบนวงกลมเหล่านี้ก่อน (Fig. 4-5)'),
          N('ในแอป: ตัวแก้ 8 กรณีอยู่ใน Chapter V (Tables 5-5 ถึง 5-12) จะบอกว่าโหลดที่กำหนดใช้แบบใดได้บ้าง'),
        ],
        figures: [
          { kind: 'smith', title: 'ตามแนวคิด Fig. 4-2/4-7: บริเวณใน r = 1 (ฟ้า), ใน g = 1 (เขียว) และนอกทั้งสอง (หมายเลข Region เป็นการกำหนดของแอป)', regions: true, showY: true, rCircles: [1], gCircles: [1], labels: [{ z: C(3, 0.6), text: 'ใน r=1 (1)' }, { z: C(0.33, -0.2), text: 'ใน g=1 (2)' }, { z: C(0.7, 1.6), text: 'นอก (3)' }, { z: C(0.7, -1.6), text: 'นอก (4)' }] },
        ],
      },
      {
        id: 'ex80', title: 'ตัวอย่าง Z_A = 80 − j40 Ω → 50 Ω ด้วยสายส่ง + shorted shunt stub (Fig. 4-5, 4-6, 4-8)',
        lines: [
          T('เดิน Z → Y → หมุนตามสาย 50 Ω สั้น ๆ จน conductance = 1 → ใส่สตับปลายลัดขนานหักล้าง susceptance → ศูนย์กลาง'),
          M(`z_A = 1.6 - j0.8 \\Rightarrow y_A = ${fz(admittance(C(1.6, -0.8)), 3).replace('−', '-')}`),
          M(`\\text{คำนวณโดยแอป (single stub): } d = ${fmtNum(ch4Stub.dLambda, 3)}\\lambda,\\quad y(d) = ${fz(ch4Stub.yAtStub, 3).replace('−', '-')},\\quad l_{short} = ${fmtNum(ch4Stub.lLambda, 3)}\\lambda`),
          N(`คำตอบที่สอง (คำนวณโดยแอป) คือ d = ${fmtNum(ch4Stub2.dLambda, 3)} λ, l = ${fmtNum(ch4Stub2.lLambda, 3)} λ (ปุ่มเฉลยในแผง PROPERTIES ของสตับแสดงทั้งสองชุด)`),
        ],
        figures: [
          { kind: 'smith', title: 'ตามแนวคิด Fig. 4-8: z_A → y_A (อ่านบนกราฟ Y) → หมุน d → g = 1 → สตับ → ศูนย์กลาง', showY: true, points: [{ z: C(1.6, -0.8), label: 'z_A', cls: 'load' }, { z: admittance(C(1.6, -0.8)), label: 'y_A (ตำแหน่งตรงข้าม)', cls: 'y' }, { z: zFromGamma(rotateTowardGenerator(gammaFromZ(C(1.6, -0.8), 1), ch4Stub.dLambda)), label: 'y = 1 + jb', cls: 'mid' }, { z: C(1, 0), label: 'match', cls: 'in' }], curves: [{ zs: [C(1.6, -0.8), C(1, 0), admittance(C(1.6, -0.8))], cls: 'mid', dashed: true }, { zs: linspace(0, ch4Stub.dLambda, 30).map((l) => zFromGamma(rotateTowardGenerator(gammaFromZ(C(1.6, -0.8), 1), l))), cls: 'net', arrow: true }, { zs: linspace(0, 1, 30).map((t) => admittance(C(1, ch4Stub.yAtStub.im * (1 - t)))), cls: 'y', arrow: true }], gCircles: [1] },
          { kind: 'lab', label: 'Lab: 80 − j40 Ω + TL(d) + shorted stub (วิธีทำบน Smith Chart ของโหลดนี้อยู่ในโจทย์ B-3 → เฉลย)', circuit: ch4Circuit, showY: true },
        ],
      },
    ],
  },
  {
    id: 'ch5', num: 'V', title: 'Matching Over a Band of Frequencies', titleTh: 'Matching ทั้งแบนด์: ทฤษฎี broadband',
    intro: 'การ match ความถี่เดียวทำได้ง่าย แต่ในแบนด์ ค่า reactance/susceptance ของ matching element เปลี่ยนตามความถี่ (X_L ∝ f, |X_C| ∝ 1/f) บทนี้ให้กฎทิศทางบน Smith Chart (Tables 5-1 ถึง 5-4) และทดลอง L-network ครบ 8 แบบ (Tables 5-5 ถึง 5-12, Fig. 5-1 ถึง 5-8) กับโหลด 3 ความถี่',
    sections: [
      {
        id: 'rules', title: 'กฎทิศทางเมื่อความถี่เปลี่ยน (Tables 5-1 ถึง 5-4)',
        lines: [
          M('X_L = 2\\pi f L \\propto f,\\qquad X_C = -\\frac{1}{2\\pi f C} \\propto -\\frac{1}{f},\\qquad B_C = 2\\pi f C \\propto f,\\qquad B_L = -\\frac{1}{2\\pi f L} \\propto -\\frac{1}{f}'),
          T('ถ้าออกแบบ correction ที่ความถี่อ้างอิง f₀ แล้ว ที่ความถี่อื่น correction จะ "มากไป" หรือ "น้อยไป" ตามตาราง จุดปลายของ curve จึงถูกดึงไม่เท่ากัน'),
        ],
        figures: [
          { kind: 'table', title: 'สรุป Tables 5-1 ถึง 5-4 (ทิศทางบน Smith Chart)', head: ['Element', 'ค่าที่ f₀', 'ที่ f สูงกว่า f₀', 'ที่ f ต่ำกว่า f₀', 'เดินตาม'], rows: [
            ['Shunt C (Table 5-1)', '+b₀', 'b มากขึ้น (correction มากไป)', 'b น้อยลง', 'วงกลม g คงที่ ตามเข็ม'],
            ['Shunt L (Table 5-2)', '−b₀', '|b| น้อยลง', '|b| มากขึ้น', 'วงกลม g คงที่ ทวนเข็ม'],
            ['Series C (Table 5-3)', '−x₀', '|x| น้อยลง', '|x| มากขึ้น', 'วงกลม r คงที่ ลง'],
            ['Series L (Table 5-4)', '+x₀', 'x มากขึ้น', 'x น้อยลง', 'วงกลม r คงที่ ขึ้น'],
          ] },
          { kind: 'plot', title: 'อัตราส่วน X(f)/X(f₀) และ B(f)/B(f₀) เทียบ f/f₀ (= 1 ที่ f₀)', xLabel: 'f / f₀', yLabel: 'ขนาดเทียบกับค่าที่ f₀', xMin: 0.8, xMax: 1.2, yMin: 0.7, yMax: 1.3, series: [{ name: 'X_L, B_C ∝ f', points: linspace(0.8, 1.2, 41).map((r) => [r, r] as [number, number]) }, { name: '|X_C|, |B_L| ∝ 1/f', color: '#dc2626', points: linspace(0.8, 1.2, 41).map((r) => [r, 1 / r] as [number, number]) }], xTicks: [0.8, 0.9, 1, 1.1, 1.2] },
        ],
      },
      {
        id: 'cases', title: 'ทดลอง L-network ครบ 8 แบบกับโหลด 3 ความถี่ (Tables 5-5 ถึง 5-12, Fig. 5-1 ถึง 5-8)',
        lines: [
          T('หนังสือใช้อิมพีแดนซ์ 3 ความถี่ (เช่น 30, 31, 32 MHz) ทำ matching ที่ความถี่กลางให้เข้า 1 + j0 พอดี แล้วดูว่าความถี่ข้างเคียง "blossom" (กระจายออก) แค่ไหน สำหรับวงจร 4-1(a) ถึง (h) — ค่าอิมพีแดนซ์ที่หนังสือใช้ใน Tables 5-5 ถึง 5-12 ไม่ได้ยกมาไว้ในหัวข้อนี้ ตารางด้านล่างจึงเป็นตัวอย่าง: ใช้โหลดของ Example 1 (12.0–12.4 MHz) และคำนวณสดโดยแอป ตัวเลขในตารางไม่ใช่ตัวเลขจาก Tables 5-5 ถึง 5-12 ของหนังสือ'),
          T('ขั้นตอนของแต่ละ Table: (5-5) Z → Y เพิ่ม shunt C แล้ว series L · (5-6) series L แล้ว shunt C · (5-7) shunt L แล้ว series C · (5-8) series C แล้ว shunt L · (5-9) shunt C แล้ว series C · (5-10) series C แล้ว shunt C · (5-11) shunt L แล้ว series L · (5-12) series L แล้ว shunt L'),
          N('ข้อสรุปของบท: แม้ความถี่กลางจะเข้า 1 + j0 แต่จุดข้างเคียงอาจกระจายออกนอกวงกลม SWR ต้องดู impedance curve ทั้งแบนด์ ไม่ใช่ดูเฉพาะความถี่กลาง'),
        ],
        figures: [
          { kind: 'lcases', title: 'วงจร L-network ทั้ง 8 แบบ (Fig. 4-1 a–h) สำหรับโหลด Example 1 ที่ f₀ = 12.2 MHz (คำนวณโดยแอป)', table: EX1_TABLE, f0: 12.2e6, Z0: 50, caption: 'กรณีที่ "ทำไม่ได้" หมายถึงกรณีที่เครื่องหมายของค่าที่ต้องใช้ไม่ตรงกับชนิด L/C ของวงจรนั้นสำหรับโหลดนี้ (ดู Region ใน Chapter IV) · ตัวเลขทั้งหมดเป็นค่าที่แอปคำนวณสำหรับโหลด Example 1 ไม่ใช่ตัวเลขใน Tables 5-5 ถึง 5-12' },
        ],
      },
    ],
  },
  {
    id: 'ch6', num: 'VI', title: 'Matching Solutions', titleTh: 'ชุดโจทย์จริง: Example 1–6 (เท่าที่มีในไฟล์)',
    intro: 'Narrowband matching (Example 1–5) และจุดเริ่มของ Broadband matching (Example 6 ซึ่งไฟล์จบกลางตัวอย่าง) ทุกตัวอย่างที่มีข้อมูลครบถูกตรวจซ้ำด้วย engine ของแอป และโหลดเข้า Lab ได้',
    sections: [
      {
        id: 'ex1', title: 'Example 1 — Narrowband matching 12.0–12.4 MHz, SWR ≤ 2 (Fig. 6-1)',
        lines: [
          T('โจทย์: อิมพีแดนซ์เสาอากาศ 12.0 MHz: 10 − j60, 12.2 MHz: 16.5 − j55, 12.4 MHz: 20 − j50 Ω ต้องการ SWR ≤ 2:1 ขั้นตอน: normalize → plot → วาดวงกลม SWR 2 → เลือก L-network ใช้ shunt inductor + series inductor'),
          M('\\text{หนังสือ: } L_{shunt} \\approx 1.63\\ \\mu H,\\qquad L_{series} \\approx 1.255\\ \\mu H'),
          T(`ตรวจโดยแอป (สายส่ง 50 Ω ← series L 1.255 μH ← shunt L 1.63 μH ← เสาอากาศ): SWR ที่ 12.0/12.2/12.4 MHz = ${solveSweep(ex1Book()).map((p) => fmtNum(p.result.swrIn, 2)).join(' / ')} → สูงสุด ${fmtNum(sweepMaxSwr(solveSweep(ex1Book())), 2)} ≤ 2 ✓`),
          N('เทียบกับวงจร 8 แบบของแอป (Chapter V): กรณี (g) shunt L → series L ที่ 12.2 MHz ให้ L_shunt = 1627 nH (≈ 1.63 μH ตรงหนังสือ) และ L_series = 1129 nH — ค่า 1.255 μH ของหนังสือให้ SWR สูงสุดในแบนด์ต่ำกว่า (1.75 เทียบ 1.94) น่าจะเป็นเหตุผลที่ไม่เลือกให้ 12.2 MHz เข้าศูนย์กลางพอดี (ข้อสังเกตของแอป หนังสือไม่ได้อธิบาย)'),
        ],
        figures: [
          { kind: 'table', title: 'ผลก่อน/หลัง matching (คำนวณโดยแอป)', head: ['f (MHz)', 'z_L', 'z_in หลัง match', '|Γ|', 'SWR'], rows: bandRows(ex1Book()) },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 6-1: Z1, Z2, Z3 (แดง) และหลัง correction (เขียว) ในวงกลม SWR 2', points: [...sweepPts(ex1Load(), 'in', 'load'), ...sweepPts(ex1Book(), 'in', 'in')], curves: [{ zs: sweepZ(ex1Load(), 'in'), cls: 'load' }, { zs: sweepZ(ex1Book(), 'in'), cls: 'in' }], swr: [2] },
          { kind: 'lab', label: 'Lab: Example 1 ตามค่าหนังสือ (เปิดเป้า SWR 2, กด Explain / เฉลยดูเส้นทาง)', circuit: ex1Book, swrTarget: 2, showY: true },
          { kind: 'lab', label: 'Lab: เฉพาะเสาอากาศ Example 1 (ลองออกแบบเอง)', circuit: ex1Load, swrTarget: 2, showY: true },
        ],
      },
      {
        id: 'ex2', title: 'Example 2 — Line transformer 50–54 MHz, SWR ≤ 1.5 (Fig. 6-2 a–c)',
        lines: [
          T('โจทย์: match เข้าสาย 50 Ω ให้ SWR ≤ 1.5:1 โดยต้องใช้ line transformer อิมพีแดนซ์ตัวอย่าง 52 − j45, 67.5 − j32.5, 87 − j20, 120 − j26, 110 − j70 Ω (50–54 MHz) วิธี: สร้างวงกลม SWR 1.5 → หา boundary → คำนวณ characteristic impedance ของ transformer ได้ประมาณ Z₀′ ≈ 83 Ω → หาความยาวสาย → normalize ด้วย 83 Ω แล้วหมุน curve ตามความถี่ → normalize กลับ 50 Ω'),
          T(`ตรวจโดยแอป: ค้นหาความยาวสาย 83 Ω ที่ทำให้ค่า SWR สูงสุดในแบนด์ต่ำที่สุด (คำนวณสด) ได้ ${fmtNum(EX2_BEST.len, 3)} λ ที่ 52 MHz (ความยาวไฟฟ้าเปลี่ยนตาม f) → SWR = ${solveSweep(ex2Book()).map((p) => fmtNum(p.result.swrIn, 2)).join(' / ')} สูงสุด ${fmtNum(sweepMaxSwr(solveSweep(ex2Book())), 2)} — เกินเป้า 1.5 เล็กน้อยเพราะค่าอิมพีแดนซ์ที่ยกมาเป็นค่าปัดเศษ ถือว่าสอดคล้องกับ Z₀′ ≈ 83 Ω ของหนังสือ (Z₀′ = 82–84 Ω ให้ผลดีที่สุดใกล้เคียงกัน)`),
          N('สังเกตว่า transformer เส้นเดียวไม่ใช่ λ/4: ความยาวถูกเลือกให้ "หมุน" curve ทั้งเส้นเข้ามาในวงกลม 1.5 (Fig. 6-2b/c)'),
        ],
        figures: [
          { kind: 'table', title: `ผลก่อน/หลังสาย 83 Ω ยาว ${fmtNum(EX2_BEST.len, 3)} λ (คำนวณโดยแอป)`, head: ['f (MHz)', 'z_L', 'z_in หลัง 83-Ω line', '|Γ|', 'SWR'], rows: bandRows(ex2Book()) },
          { kind: 'smith', title: `ตามแนวคิด Fig. 6-2: curve เดิม (แดง) และหลังผ่านสาย 83 Ω ${fmtNum(EX2_BEST.len, 3)} λ (เขียว) กับวงกลม SWR 1.5`, points: [...sweepPts(ex2Load(), 'in', 'load'), ...sweepPts(ex2Book(), 'in', 'in')], curves: [{ zs: sweepZ(ex2Load(), 'in'), cls: 'load' }, { zs: sweepZ(ex2Book(), 'in'), cls: 'in' }], swr: [1.5] },
          { kind: 'lab', label: `Lab: Example 2 (สาย 83 Ω ${fmtNum(EX2_BEST.len, 3)} λ + เสาอากาศ 50–54 MHz)`, circuit: ex2Book, swrTarget: 1.5 },
        ],
      },
      {
        id: 'ex3', title: 'Example 3 — Half-wave 80-m dipole 3.5–4.0 MHz, SWR ≤ 2 (Fig. 6-3 a–e)',
        lines: [
          T('โจทย์: dipole ครึ่งคลื่นย่าน 80 m (ลวด #14) 3.5–4.0 MHz อิมพีแดนซ์เปลี่ยนจาก capacitive มากที่ 3.5 MHz ไปเป็น inductive มากที่ 4.0 MHz ต้องการ SWR ≤ 2'),
          T('วิธีแก้ในหนังสือ: normalize → แปลง Z → Y → ใช้ resonant short-circuited shunt stub (Z₀ = 25 Ω) ที่ resonant ประมาณ 3.75 MHz เพื่อดึงปลายสองข้างของ curve เข้าหากัน (Fig. 6-3b พร้อม resistance averaging circle) → ใช้ two-section line transformer ประมาณ 64 Ω และ 105 Ω → หมุน curve ตาม electrical length ของแต่ละความถี่ (Fig. 6-3c, d) → normalize กลับ 50 Ω ให้อยู่ในวงกลม SWR ≈ 2 (Fig. 6-3e)'),
          W('ค่าอิมพีแดนซ์ของเสาอากาศใน Example 3 ไม่ได้อยู่ในส่วนของหนังสือที่ใช้อ้างอิงได้ จึงยังตรวจตัวเลขไม่ได้ Lab ด้านล่างเป็น "โครงวงจร" ของวิธีแก้: ลำดับสาย 64/105 Ω และความยาว 0.1 λ เป็นค่าตั้งต้นสมมุติ (หนังสือส่วนที่มีไม่ระบุ) ส่วนตาราง ANT เป็นค่าสมมุติที่คำนวณย้อนกลับจากวงจรนี้ให้ SWR อยู่ในเป้า เพื่อให้เห็นการทำงานของโครงวงจร ใส่ค่าจริงจากหนังสือแล้วปรับเองได้'),
        ],
        figures: [
          { kind: 'lab', label: 'Lab (โครงวงจร Ex.3): Source — TL 64 Ω — TL 105 Ω — resonant stub 25 Ω (λ/4 @3.75 MHz) — ANT (ค่าสมมุติ)', circuit: () => buildCircuit(3.75e6, 50, [['tline', 'series', { Z0: 64, len: 0.1, vf: 0.66, lossDb: 0 }], ['tline', 'series', { Z0: 105, len: 0.1, vf: 0.66, lossDb: 0 }], ['stub_short', 'shunt', { Z0: 25, len: 0.25 }], ['antenna', 'series', {}, EX3_TABLE_ILLUS]]), swrTarget: 2, showY: true, note: 'ตาราง ANT เป็นค่าสมมุติที่คำนวณย้อนกลับจากวงจร (ไม่ใช่ค่าจากหนังสือ) SWR ที่เห็นจึงสะท้อนเฉพาะการทำงานของโครงวงจร' },
        ],
      },
      {
        id: 'ex4', title: 'Example 4 — Vertical 80-m collinear 3.5–4.0 MHz, SWR ≤ 2 (Fig. 6-4 a–c)',
        lines: [
          T('โจทย์: เสา vertical collinear (quarter-wave + half-wave section) 3.5–4.0 MHz reactance เป็น inductive สูงมาก'),
          T('วิธีแก้ในหนังสือ: เพิ่ม series capacitive reactance → แปลง Z → Y → เพิ่ม shunt capacitive susceptance → กลับเป็น Z → ยังไม่เข้าวงกลม → เพิ่ม resonant series L-C อีกขั้น แล้วปรับ resonance ไม่ให้จุด 3.7 MHz หลุดวงกลม ผลสุดท้ายอยู่ในวงกลมประมาณ SWR 2.2 (Fig. 6-4(a)–(c))'),
          T('ค่าอุปกรณ์ในวงจรสุดท้ายตามหนังสือ (ค่าประมาณ): series capacitor 150.5 pF, series inductor 13 μH, shunt capacitor 1274 pF และ capacitor ใกล้เสาอากาศ 588 pF'),
          W('ค่าอิมพีแดนซ์ของเสาอากาศและลำดับต่อที่แน่นอนของอุปกรณ์ไม่ได้อยู่ในส่วนของหนังสือที่ใช้อ้างอิงได้ Lab ด้านล่างเรียงอุปกรณ์ตามลำดับที่ระบุข้างต้น (ยังไม่ยืนยันกับรูปในหนังสือ) และตาราง ANT เป็นค่าสมมุติที่คำนวณย้อนกลับจากวงจรนี้ให้ SWR อยู่ในเป้า (ไม่ใช่ค่าจริง)'),
        ],
        figures: [
          { kind: 'lab', label: 'Lab (โครงวงจร Ex.4): Source — C 150.5 pF — L 13 μH — C 1274 pF(⏚) — C 588 pF — ANT (ค่าสมมุติ)', circuit: () => buildCircuit(3.75e6, 50, [['capacitor', 'series', { C: 150.5 }], ['inductor', 'series', { L: 13000 }], ['capacitor', 'shunt', { C: 1274 }], ['capacitor', 'series', { C: 588 }], ['antenna', 'series', {}, EX4_TABLE_ILLUS]]), swrTarget: 2, showY: true, note: 'ตาราง ANT เป็นค่าสมมุติที่คำนวณย้อนกลับจากวงจรของหนังสือ (ไม่ใช่ค่าจริง) SWR ที่เห็นสะท้อนเฉพาะการทำงานของโครงวงจร' },
        ],
      },
      {
        id: 'ex5', title: 'Example 5 — Short vertical 10-m antenna 28–30 MHz, SWR ≤ 2 (Fig. 6-5 a, b)',
        lines: [
          T('โจทย์: short vertical ย่าน 10 m: 28 MHz: 20 − j120, 29 MHz: 20 − j110, 30 MHz: 20 − j100 Ω ต้องการ SWR ≤ 2 วิธี: series inductance → แปลง Z → Y → shunt inductance → short section ของสาย 50 Ω → short-circuited stub'),
          M('\\text{หนังสือ: } L_{series} \\approx 0.467\\ \\mu H,\\quad L_{shunt} \\approx 0.272\\ \\mu H,\\quad \\text{RG-8 line} \\approx 2.8\\ \\text{ft},\\quad 25\\text{-}\\Omega\\ \\text{RG-33 stub} \\approx 5.56\\ \\text{ft}'),
          T(`แปลงความยาวจริงเป็น λ ที่ 29 MHz โดยสมมุติ VF = 0.66 (สาย polyethylene ตัน) ทั้ง RG-8 และสตับ RG-33 — หนังสือส่วนที่มีไม่ได้ระบุ VF (λ = ${fmtNum(LAM29, 3)} m): สาย 2.8 ft = ${fmtNum(EX5_LINE_LEN, 4)} λ, สตับ 5.56 ft = ${fmtNum(EX5_STUB_LEN, 4)} λ ≈ λ/4 (resonant stub) ผลลัพธ์ไวต่อ VF: ถ้า VF = 0.80 (foam) ความยาวไฟฟ้าสั้นลงและ SWR สูงสุดในแบนด์จะขึ้นไปประมาณ 2.9`),
          T(`ตรวจโดยแอปทีละขั้น (SWR ที่ 28/29/30 MHz): เสาอากาศเดิม ${solveSweep(ex5Load()).map((p) => fmtNum(p.result.swrIn, 1)).join('/')} → +series L ${solveSweep(ex5Step1()).map((p) => fmtNum(p.result.swrIn, 2)).join('/')} → +shunt L ${solveSweep(ex5Step2()).map((p) => fmtNum(p.result.swrIn, 2)).join('/')} → +line+stub ${solveSweep(ex5Full()).map((p) => fmtNum(p.result.swrIn, 2)).join('/')} → สูงสุด ${fmtNum(sweepMaxSwr(solveSweep(ex5Full())), 2)} ≤ 2 ✓`),
          N('สังเกต: หลัง shunt L ทั้งสามจุดก็อยู่ในวงกลม SWR 2 แล้ว (Fig. 6-5a) ส่วนสาย + resonant stub (Fig. 6-5b) ช่วยดึงปลายทั้งสองเข้าหากันให้ curve "หดตัว" รอบศูนย์กลางมากขึ้น'),
        ],
        figures: [
          { kind: 'table', title: 'ผลก่อน/หลังครบทุกขั้น (คำนวณโดยแอป)', head: ['f (MHz)', 'z_L', 'z_in', '|Γ|', 'SWR'], rows: bandRows(ex5Full()) },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 6-5a: Z1–Z3 (แดง) → หลัง series L (ส้ม) → หลัง shunt L (เขียว) ในวงกลม SWR 2', points: [...sweepPts(ex5Load(), 'in', 'load'), ...sweepPts(ex5Step2(), 'in', 'in')], curves: [{ zs: sweepZ(ex5Load(), 'in'), cls: 'load' }, { zs: sweepZ(ex5Step1(), 'in'), cls: 'mid', dashed: true }, { zs: sweepZ(ex5Step2(), 'in'), cls: 'in' }], swr: [2] },
          { kind: 'smith', title: 'ตามแนวคิด Fig. 6-5b: curve สุดท้ายหลังสาย 2.8 ft + สตับ 25 Ω 5.56 ft', points: sweepPts(ex5Full(), 'in', 'in'), curves: [{ zs: sweepZ(ex5Step2(), 'in'), cls: 'mid', dashed: true }, { zs: sweepZ(ex5Full(), 'in'), cls: 'in' }], swr: [2] },
          { kind: 'circuit', title: 'Schematic ของ matching network (จำลองตาม schematic ในหนังสือ ความยาวคิดเป็น λ โดยแอป)', circuit: ex5Full() },
          { kind: 'lab', label: 'Lab: Example 5 ครบทุกขั้น', circuit: ex5Full, swrTarget: 2, showY: true },
          { kind: 'lab', label: 'Lab: Example 5 หลัง series L + shunt L เท่านั้น', circuit: ex5Step2, swrTarget: 2, showY: true },
          { kind: 'lab', label: 'Lab: เฉพาะเสาอากาศ Example 5', circuit: ex5Load, swrTarget: 2 },
        ],
      },
      {
        id: 'ex6', title: 'Example 6 — Broadband dipole 2.0–6.0 MHz, SWR ≤ 3 (ไฟล์จบกลางตัวอย่าง)',
        lines: [
          T('โจทย์: broadband dipole 2.0–6.0 MHz มีอิมพีแดนซ์ 9 จุด ต้องการ SWR ≤ 3:1 ข้อมูลเริ่มจากประมาณ 2.0 MHz: 92 − j90 Ω ผ่านจุดที่เป็น inductive สูงในช่วงกลาง ไปถึง 6.0 MHz: 115 − j25 Ω'),
          T('วิธีที่เริ่มทำในไฟล์: normalize → วาดวงกลม SWR 3 → แปลงเป็น admittance → เพิ่ม shunt correction → กลับเป็น impedance → เพิ่ม series capacitive reactance → กลับเป็น admittance → ทดลอง short-circuited stub Z₀ = 100 Ω และคำนวณ reactance/susceptance ของสตับที่แต่ละความถี่ หน้าสุดท้ายของไฟล์เป็น schematic: 50 Ω line → stub → capacitor C → inductor L → antenna'),
          W('Fig. 6-6(a)–(c) และค่าตัวเลขของอุปกรณ์ไม่ได้อยู่ในไฟล์ (PDF จบที่หน้า 6-39) จึงไม่มี Lab ที่ตรวจตัวเลขได้ Lab ด้านล่างเป็นโครงวงจรตาม schematic เท่านั้น'),
          K('จำลองจาก schematic หน้า 6-39 ("Schematic of matching solution.")\n\n50 Ω line ──┬──[ C ]──[ L ]── antenna\n            │\n         stub (short; ในเนื้อหาทดลอง Z₀ = 100 Ω)\n            ⏚'),
        ],
        figures: [
          { kind: 'lab', label: 'Lab (โครงวงจร Ex.6): Source — stub 100 Ω(⏚) — C — L — ANT (2 จุดปลายจากหนังสือ + ค่าสมมุติตรงกลาง)', circuit: () => buildCircuit(4e6, 50, [['stub_short', 'shunt', { Z0: 100, len: 0.44 }], ['capacitor', 'series', { C: 5000 }], ['inductor', 'series', { L: 2000 }], ['antenna', 'series', {}, EX6_TABLE_ILLUS]]), swrTarget: 3, showY: true, note: 'จุดปลาย 2.0 และ 6.0 MHz มาจากหนังสือ จุด 3–5 MHz เป็นค่าสมมุติที่คำนวณย้อนกลับจากโครงวงจรนี้ (ไม่ใช่ค่าจริง) ค่า C, L, สตับ เป็นค่าตั้งต้นสมมุติที่ค้นหาให้จุดปลายจริงใกล้ SWR 3 ที่สุด (≈ 3.4) ให้ปรับเอง' },
        ],
      },
      {
        id: 'missing', title: 'Example 7–11 และ Chapter VII',
        lines: [
          W('สารบัญของหนังสือระบุ Example 7–11 และ Chapter VII (Construction of Overlay Tracing Box) แต่เนื้อหาเหล่านี้ไม่มีอยู่ในไฟล์ 157 หน้า จึงไม่ได้รวมไว้ในหัวข้อนี้ เมื่อมีไฟล์ฉบับเต็มสามารถเพิ่มได้ด้วยโครงเดียวกัน (ตาราง ANT + วงจร + Lab)'),
        ],
      },
    ],
  },
];

export const findChapter = (id: string): Chapter | undefined => COURSE.find((c) => c.id === id);
export const findSection = (chapter: string, section: string): Section | undefined => findChapter(chapter)?.sections.find((x) => x.id === section);

/**
 * Which course section explains a given Lab item (example / lesson / problem id).
 * Used by the Lab to jump into the Antenna Impedance Matching course.
 */
export interface SectionLink { chapter: string; section: string; }
export const SECTION_LINKS: Record<string, SectionLink> = {
  // ---- examples ----
  ex1: { chapter: 'ch3', section: 'norm' },
  ex2: { chapter: 'ch3', section: 'norm' },
  ex3: { chapter: 'ch3', section: 'norm' },
  ex4: { chapter: 'ch3', section: 'move' },
  ex5: { chapter: 'ch3', section: 'rotate' },
  ex6: { chapter: 'ch2', section: 'qwt' },
  ex7: { chapter: 'ch4', section: 'ex80' },
  ex8: { chapter: 'ch2', section: 'shunt-stub' },
  ex9: { chapter: 'ch4', section: 'lnet' },
  ex10: { chapter: 'ch3', section: 'admit' },
  ex11: { chapter: 'ch4', section: 'lnet' },
  ex12: { chapter: 'ch6', section: 'ex1' },
  ex13: { chapter: 'ch6', section: 'ex2' },
  ex14: { chapter: 'ch6', section: 'ex5' },
  // ---- guided lessons ----
  l1: { chapter: 'ch3', section: 'norm' },
  l2: { chapter: 'ch3', section: 'norm' },
  l3: { chapter: 'ch3', section: 'norm' },
  l4: { chapter: 'ch3', section: 'norm' },
  l5: { chapter: 'ch3', section: 'move' },
  l6: { chapter: 'ch3', section: 'move' },
  l7: { chapter: 'ch3', section: 'admit' },
  l8: { chapter: 'ch3', section: 'rotate' },
  l9: { chapter: 'ch2', section: 'qwt' },
  l10: { chapter: 'ch4', section: 'ex80' },
  l11: { chapter: 'ch2', section: 'stub' },
  l12: { chapter: 'ch2', section: 'shunt-stub' },
  l13: { chapter: 'ch4', section: 'lnet' },
  l14: { chapter: 'ch4', section: 'lnet' },
  // ---- practice problems ----
  pz1: { chapter: 'ch3', section: 'norm' },
  pz2: { chapter: 'ch3', section: 'move' },
  pz3: { chapter: 'ch3', section: 'norm' },
  pz4: { chapter: 'ch3', section: 'rotate' },
  pz5: { chapter: 'ch2', section: 'qwt' },
  py1: { chapter: 'ch3', section: 'admit' },
  py2: { chapter: 'ch3', section: 'admit' },
  py3: { chapter: 'ch3', section: 'admit' },
  py4: { chapter: 'ch4', section: 'ex80' },
  py5: { chapter: 'ch4', section: 'lnet' },
  py6: { chapter: 'ch4', section: 'lnet' },
  pb1: { chapter: 'ch2', section: 'series-stub' },
  pb2: { chapter: 'ch2', section: 'qwt' },
  pb3: { chapter: 'ch4', section: 'ex80' },
  pb4: { chapter: 'ch6', section: 'ex1' },
};
/** short human label for a link target, e.g. "Ch. III · Impedance ↔ Admittance" */
export const sectionLabel = (link: SectionLink | undefined): string => {
  if (!link) return '';
  const ch = findChapter(link.chapter);
  const sec = ch?.sections.find((x) => x.id === link.section);
  if (!ch || !sec) return '';
  return `${ch.num === '0' ? t('บทนำ') : `Ch. ${ch.num}`} · ${t(sec.title).split('(')[0].trim()}`;
};
/** cheap sanity check used by the self-test: every figure's numeric data is finite */
export const courseFiguresFinite = (): { ok: boolean; bad: string[] } => {
  const bad: string[] = [];
  for (const ch of COURSE)
    for (const sec of ch.sections)
      for (const fg of sec.figures ?? []) {
        if (fg.kind === 'plot') for (const s of fg.series) for (const [x, y] of s.points) if (!Number.isFinite(x) || (!Number.isFinite(y) && y !== Infinity && y !== -Infinity)) bad.push(`${ch.id}/${sec.id}/${fg.title}`);
        if (fg.kind === 'smith') for (const p of fg.points ?? []) if (!Number.isFinite(p.z.re) || !Number.isFinite(p.z.im)) bad.push(`${ch.id}/${sec.id}/${fg.title}`);
        if (fg.kind === 'lab') { const c = fg.circuit(); const r = solveCircuit(c); if (!Number.isFinite(r.swrIn) && r.swrIn !== Infinity) bad.push(`${ch.id}/${sec.id}/lab`); }
      }
  return { ok: bad.length === 0, bad: [...new Set(bad)] };
};
void lineInput; void normalize;
