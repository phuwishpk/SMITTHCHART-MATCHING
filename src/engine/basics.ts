// ---------------------------------------------------------------
// "Smith Chart พื้นฐาน" — a from-scratch course that derives the chart
// and then works the textbook examples (7-7, 7-8, 7-10) step by step.
// Every number and every figure is computed by this app's engines.
// ---------------------------------------------------------------
import type { Chapter } from './course';
import { StepLine } from './explain';
import { Complex, C, abs, arg, deg, fmtNum, isFiniteC } from './complex';
import { buildCircuit } from './circuit';
import {
  gammaFromZ, gammaFromz, zFromGamma, normalize, admittance, swrFromGamma,
  rotateTowardGenerator, wtgFromGamma, lineInput, stubInput, XL, XC,
} from './rf';
import { solveSingleStub, solveQwt } from './matching';

// ---------- small helpers ----------
const T = (text: string): StepLine => ({ kind: 'text', text });
const M = (tex: string): StepLine => ({ kind: 'math', tex });
const N = (text: string): StepLine => ({ kind: 'note', text });
const W = (text: string): StepLine => ({ kind: 'warn', text });
const R = (tex: string): StepLine => ({ kind: 'result', tex });
const K = (text: string): StepLine => ({ kind: 'code', text });

const n = (x: number, d = 2) => fmtNum(x, d).replace('−', '-');
const fz = (z: Complex, d = 2): string => (isFiniteC(z) ? `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}` : '∞');
const tc = (z: Complex, d = 2): string => (isFiniteC(z) ? `${n(z.re, d)} ${z.im < 0 ? '-' : '+'} j${n(Math.abs(z.im), d)}` : '\\infty');
const linspace = (a: number, b: number, k: number) => Array.from({ length: k }, (_, i) => a + ((b - a) * i) / (k - 1));

/** path along the constant-SWR circle, from z0 toward the generator */
const swrPath = (z0: Complex, len: number, k = 48): Complex[] =>
  linspace(0, len, k).map((l) => zFromGamma(rotateTowardGenerator(gammaFromz(z0), l)));
/** path when a series reactance dx is added */
const seriesPath = (z0: Complex, dx: number, k = 30): Complex[] => linspace(0, dx, k).map((d) => C(z0.re, z0.im + d));
/** path when a shunt susceptance db is added */
const shuntPath = (z0: Complex, db: number, k = 30): Complex[] => {
  const y0 = admittance(z0);
  return linspace(0, db, k).map((d) => admittance(C(y0.re, y0.im + d)));
};

// ---------- textbook data, checked against the engine ----------
export const EX77 = { ZL: C(100, -50), Z0: 75 };
export const EX78 = { ZL: C(450, -600), Z0: 300 };
export const EX710 = { ZL: C(200, 0), Z0: 300 };
const ex77 = solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => a.dLambda - b.dLambda)[0];
const ex78 = solveSingleStub(EX78.ZL, EX78.Z0, 'short')[0];
const ex710 = solveSingleStub(EX710.ZL, EX710.Z0, 'short')[0];
const z77 = normalize(EX77.ZL, EX77.Z0);
const z78 = normalize(EX78.ZL, EX78.Z0);
const y78 = admittance(z78);
const z710 = normalize(EX710.ZL, EX710.Z0);
const swr77 = swrFromGamma(gammaFromZ(EX77.ZL, EX77.Z0));
const swr78 = swrFromGamma(gammaFromZ(EX78.ZL, EX78.Z0));
const swr710 = swrFromGamma(gammaFromZ(EX710.ZL, EX710.Z0));
const wtg78 = wtgFromGamma(gammaFromZ(EX78.ZL, EX78.Z0));
const wtg78y = wtgFromGamma(gammaFromz(y78));
const wtg78g1 = wtgFromGamma(gammaFromz(ex78.yAtStub));
/** where the two poles sit on this app's wavelengths-toward-generator scale */
const wtgShort = wtgFromGamma(gammaFromz(C(0, 0)));
const wtgOpen = wtgFromGamma(gammaFromz(C(Infinity, 0)));

/** Example 7-8 re-checked at another frequency with the physical lengths kept */
export const ex78AtFreq = (fMHz: number) => {
  const k = fMHz / 10;
  const d = 0.130 * k;
  const ls = 0.085 * k;
  const Zd = lineInput(EX78.ZL, EX78.Z0, d, 0);
  const yLine = admittance(normalize(Zd, EX78.Z0));
  const yStub = admittance(normalize(stubInput('short', EX78.Z0, ls), EX78.Z0));
  const yTot = C(yLine.re + yStub.re, yLine.im + yStub.im);
  const zTot = admittance(yTot);
  return { k, d, ls, yLine, yStub, yTot, zTot, swr: swrFromGamma(gammaFromz(zTot)) };
};
const f12 = ex78AtFreq(12);

// ---------- the three "Applications" the book names, worked with one load ----------
const APP_Z0 = 50;
const APP_ZL = C(25, 25);
const zApp = normalize(APP_ZL, APP_Z0);
const yApp = admittance(zApp);
const gApp = gammaFromz(zApp);
const swrApp = swrFromGamma(gApp);
const wtgZApp = wtgFromGamma(gApp);
const wtgYApp = wtgFromGamma(gammaFromz(yApp));
const Y0App = 1 / APP_Z0;
const YApp = admittance(APP_ZL);
/** application 2: what the line looks like a bit away from the load */
const dApp = 0.15;
const APP2_DS = [0, 0.05, 0.1, 0.15, 0.25, 0.5];
const gApp2 = rotateTowardGenerator(gApp, dApp);
const zApp2 = zFromGamma(gApp2);
const ZApp2 = C(zApp2.re * APP_Z0, zApp2.im * APP_Z0);
const yApp2 = admittance(zApp2);
const YApp2 = C(yApp2.re / APP_Z0, yApp2.im / APP_Z0);
/** application 3: how long a shorted line has to be for a wanted reactance */
const APP3_Z0 = 50;
const APP3_LS = [0.05, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.375, 0.4, 0.45];
const APP3_XS = [0.3, 0.6, 1, 2, -0.6, -1, -2];
const APP3_XWANT = 30;
/** inverse of X = Z0 tan(2*pi*l) for a shorted line, in wavelengths */
const shortLenForX = (x: number): number => {
  const l = Math.atan(x) / (2 * Math.PI);
  return l < 0 ? l + 0.5 : l;
};
const APP3_lw = shortLenForX(APP3_XWANT / APP3_Z0);
const APP3_F = 500e6;
const APP3_LAM = 299792458 / APP3_F;
/** a lossy line for the inward-spiral figure: 200 ohm load on 50 ohm, 6 dB per wavelength */
const LOSSY_ZL = C(200, 0);
const LOSSY_Z0 = 50;
const lossyZ = (d: number): Complex => normalize(lineInput(LOSSY_ZL, LOSSY_Z0, d, 6 * d), LOSSY_Z0);

export const BASICS: Chapter[] = [
  {
    id: 'b0', num: '1', title: 'แผนที่เนื้อหา 7-2 The Smith Chart and Its Applications', titleTh: 'อ่านหนังสือหัวข้อไหน ให้เปิดบทไหนของแอป',
    intro: 'บทนี้ไม่ใช่เนื้อหาใหม่ แต่เป็นสารบัญที่จับคู่หัวข้อของหนังสือ 7-2 กับบทของแอปทีละหัวข้อ ถ้าถือหนังสืออยู่ตรงหน้า ให้เริ่มที่นี่',
    sections: [
      {
        id: 'prereq', title: 'ปูพื้นก่อนเข้า 7-2 — Impedance Variation Along a Mismatched Line',
        lines: [
          T('ก่อนหนังสือจะเข้าเรื่อง Smith Chart มันปูพื้นด้วยข้อเท็จจริงสามข้อเกี่ยวกับสายที่ไม่แมตช์ ทั้งสามข้อเป็นเหตุผลที่ทำให้กราฟนี้จำเป็น'),
          K('1. อิมพีแดนซ์ที่ "มองเห็น" เปลี่ยนไปตามตำแหน่งบนสาย\n2. ค่ากลับมาซ้ำเดิมทุก ๆ ครึ่งความยาวคลื่น\n3. ที่ระยะหนึ่งในสี่ความยาวคลื่น ค่าที่ได้สัมพันธ์กับแอดมิตแตนซ์ของโหลด'),
          T('ข้อแรกมาจากสมการสายส่ง ซึ่งเป็นสมการที่คำนวณด้วยมือได้ยากเมื่อโหลดเป็นจำนวนเชิงซ้อน'),
          M('Z_{in}(l) = Z_0\\,\\frac{Z_L + jZ_0\\tan\\beta l}{Z_0 + jZ_L\\tan\\beta l}'),
          T('ข้อที่สองเห็นได้จาก tan ที่มีคาบ π'),
          M('\\beta l = \\frac{2\\pi}{\\lambda}\\cdot\\frac{\\lambda}{2} = \\pi \\;\\Rightarrow\\; \\tan\\beta l = 0 \\;\\Rightarrow\\; Z_{in} = Z_L'),
          T('ข้อที่สามคือกรณี βl = π/2 ซึ่ง tan เป็นอนันต์ เหลือเพียง'),
          R('Z_{in} = \\frac{Z_0^{2}}{Z_L} \\;\\Rightarrow\\; z_{in} = \\frac{1}{z_L} = y_L'),
          T(`ตัวอย่างที่แอปคำนวณให้: สาย ${APP_Z0} Ω โหลด Z_L = ${fz(APP_ZL, 0)} Ω`),
          M(`\\lambda/4: \\; Z_{in} = \\frac{${APP_Z0}^{2}}{${tc(APP_ZL, 0)}} = ${tc(lineInput(APP_ZL, APP_Z0, 0.25, 0), 1)}\\,\\Omega \\qquad \\lambda/2: \\; Z_{in} = ${tc(lineInput(APP_ZL, APP_Z0, 0.5, 0), 1)}\\,\\Omega`),
          N('แถวสุดท้ายกลับมาเท่าโหลดเดิมพอดี — นั่นคือข้อที่สอง · บทที่ 2 ของแอปอธิบายทั้งสามข้อพร้อมตารางเต็ม'),
        ],
        figures: [
          { kind: 'table', title: `อิมพีแดนซ์ที่มองเห็นตามตำแหน่ง (โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω — คำนวณโดยแอป)`,
            head: ['ระยะจากโหลด', 'Z ที่มองเห็น (Ω)', 'z', 'SWR'],
            rows: [0, 0.125, 0.25, 0.375, 0.5].map((d) => {
              const Z = lineInput(APP_ZL, APP_Z0, d, 0);
              return [`${n(d, 3)} λ`, fz(Z, 1), fz(normalize(Z, APP_Z0), 3), n(swrFromGamma(gammaFromZ(Z, APP_Z0)), 3)];
            }),
            caption: 'Z เปลี่ยนตลอด แต่ SWR คงที่ · แถว 0.25 λ ให้ค่าที่เป็นส่วนกลับของโหลด · แถว 0.5 λ กลับมาเท่าเดิม' },
        ],
      },
      {
        id: 'fund', title: '7-2.1 Fundamentals of the Smith Chart',
        lines: [
          T('หนังสือไล่หัวข้อย่อยของ 7-2.1 ตามลำดับนี้ ตารางด้านล่างบอกว่าแต่ละหัวข้อตรงกับบทไหนของแอป'),
          T('สองข้อที่หนังสือเน้นเป็นกฎตายตัวคือทิศทางการหมุน'),
          R('\\text{Toward Generator} = \\text{ตามเข็มนาฬิกา (clockwise)}'),
          R('\\text{Toward Load} = \\text{ทวนเข็มนาฬิกา (counterclockwise)}'),
          T('และความยาวหนึ่งรอบของกราฟ'),
          R('\\text{หนึ่งรอบเต็มของ Smith Chart} = \\frac{\\lambda}{2} \\text{ บนสายส่ง}'),
          N('ข้อสังเกตของหนังสือ: วงกลม SWR คงที่ใช้ได้กับสายไร้การสูญเสีย ถ้าสายมีการสูญเสีย เส้นทางจะเป็นเกลียวเข้าหาศูนย์กลาง (ดูหัวข้อ 5.4)'),
        ],
        figures: [
          { kind: 'table', title: 'หัวข้อย่อยของ 7-2.1 กับบทของแอป',
            head: ['หัวข้อในหนังสือ', 'สาระ', 'บทของแอป'],
            rows: [
              ['Description', 'Smith Chart คือ polar impedance diagram', 'บทที่ 3 (3.1, 3.2)'],
              ['Normalized Resistance', 'r = R/Z₀', 'บทที่ 3.3 และ 4.1'],
              ['Normalized Reactance', 'x = X/Z₀', 'บทที่ 3.3 และ 4.2'],
              ['Resistance Circles', 'วงกลมแทน r คงที่', 'บทที่ 4.1'],
              ['Reactance Arcs', 'ส่วนโค้งแทน x คงที่', 'บทที่ 4.2'],
              ['Orthogonal Coordinates', 'สองชุดตัดกันตั้งฉาก', 'บทที่ 4.4'],
              ['Constant SWR Circle', 'โหลดเดียวกันบนสายไร้การสูญเสียอยู่บนวงเดียว', 'บทที่ 5.1, 5.2'],
              ['Reading SWR', 'อ่าน SWR ที่จุดตัดแกน resistance', 'บทที่ 5.3'],
              ['Normalized Impedance / Admittance', 'ค่าปกติทำให้กราฟใบเดียวใช้ได้ทุก Z₀', 'บทที่ 3.3 และ 7.1'],
              ['Distance Along the Line', 'ระยะบนสายคือการหมุนรอบกราฟ', 'บทที่ 6.1, 6.3'],
              ['Toward Generator / Toward Load', 'ตามเข็ม / ทวนเข็ม', 'บทที่ 6.2'],
              ['Half-Wavelength Repetition', 'หนึ่งรอบ = λ/2', 'บทที่ 6.1'],
              ['(lossy line)', 'สายมีการสูญเสียเดินเป็นเกลียว', 'บทที่ 5.4'],
            ] },
        ],
      },
      {
        id: 'apps-map', title: 'Applications — สามการใช้งานที่หนังสือระบุ',
        lines: [
          T('ภายใน 7-2.1 หนังสือระบุการใช้งานสำคัญไว้สามเรื่อง แอปทำทั้งสามเรื่องไว้ในบทที่ 7'),
          K('1. Admittance calculations — แปลง impedance ↔ admittance ด้วยจุดตรงข้ามบนวงกลม SWR\n2. Impedance / Admittance at Any Point and SWR — หา Z, Y ที่ตำแหน่งใด ๆ และอ่าน SWR\n3. Short-Circuited Line Reactance / Susceptance — หาความยาวสายปลายลัดที่ให้ค่าที่ต้องการ'),
          T('ตัวอย่างของหนังสือในกลุ่มที่ 1 คือ'),
          M(`z = ${tc(zApp, 1)} \\;\\Rightarrow\\; y = ${tc(yApp, 0)}`),
          T('โดยจุด impedance กับ admittance อยู่ห่างกัน λ/4 หรือพูดอีกอย่างคืออยู่คนละด้านของกราฟ'),
          N('กลุ่มที่ 3 คือหัวใจของ stub matching ในบทที่ 10 · ขั้นตอนหกข้อของ stub matching คือการเรียงกลุ่ม 1 → 2 → 3 ต่อกัน'),
        ],
        figures: [
          { kind: 'table', title: 'สามการใช้งาน กับหัวข้อของแอป',
            head: ['Application', 'เนื้อหา', 'หัวข้อของแอป'],
            rows: [
              ['1. Admittance Calculations', 'z ↔ y ด้วยจุดตรงข้าม', 'บทที่ 7.5 (และที่มาใน 7.3)'],
              ['2. Impedance / Admittance at Any Point and SWR', 'เดินตามวงกลม SWR แล้วอ่านค่า', 'บทที่ 7.6'],
              ['3. Short-Circuited Line Reactance / Susceptance', 'หาความยาวสตับจากค่าที่ต้องการ', 'บทที่ 7.7 และ 8.1–8.3'],
            ] },
        ],
      },
      {
        id: 'solve', title: '7-2.2 Problem Solution',
        lines: [
          T('ครึ่งหลังของหนังสือหัวข้อนี้เปลี่ยนจาก "รู้จักกราฟ" เป็น "ใช้กราฟแก้โจทย์" มีสี่หัวข้อ'),
          T('สาระของหม้อแปลง λ/4 คือ'),
          M('Z_L \\rightarrow z_L \\rightarrow \\text{Smith Chart} \\rightarrow \\text{หาจุด } x = 0 \\rightarrow \\lambda/4 \\text{ transformer}'),
          T('ส่วนสาระของ single stub matching คือ'),
          M('Z_L \\rightarrow z_L \\rightarrow y_L \\rightarrow 1 \\pm jb \\rightarrow \\text{ตำแหน่งสตับ } d \\rightarrow \\text{ความยาวสตับ } l_s'),
          T(`ตัวอย่างของหนังสือใช้ z_L = ${tc(z78, 1)} อ่าน SWR ได้ประมาณ ${n(swr78, 1)} จากนั้นได้ y_L = ${tc(y78, 2)} และจุด y = ${tc(ex78.yAtStub, 1)} จึงต้องใช้สตับ ${n(ex78.bStub, 1)} มาหักล้าง ได้ d = ${n(ex78.dLambda, 3)} λ และ l_s = ${n(ex78.lLambda, 3)} λ`),
          T('หัวข้อสุดท้ายคือผลของความถี่ที่เปลี่ยนไป เพราะ'),
          M('\\lambda = \\frac{v}{f}'),
          T(`ความยาวจริงไม่เปลี่ยน แต่ความยาวไฟฟ้าในหน่วย λ เปลี่ยน ตัวอย่างของหนังสือ: ระยะ 0.130 λ ที่ 10 MHz คือ ${n(0.13 * 299792458 / 10e6, 2)} m แต่ที่ 12 MHz ความยาวคลื่นเหลือ ${n(299792458 / 12e6, 1)} m ระยะเดิมจึงกลายเป็น ${n(3.9 / (299792458 / 12e6), 3)} λ`),
          N('บทที่ 11 ของแอปคำนวณ SWR ใหม่ที่ความถี่ที่เปลี่ยนไปให้ครบทุกขั้น'),
        ],
        figures: [
          { kind: 'table', title: 'หัวข้อย่อยของ 7-2.2 กับบทของแอป',
            head: ['หัวข้อในหนังสือ', 'เนื้อหา', 'บทของแอป'],
            rows: [
              ['Matching with a Quarter-Wave Transformer', 'หาจุดความต้านทานล้วนแล้วต่อหม้อแปลง λ/4', 'บทที่ 9 ทั้งบท (Example 7-7 ที่ 9.3)'],
              ['Matching with a Short-Circuited Stub', 'สตับให้ pure susceptance หักล้างของสายหลัก', 'บทที่ 8.2 และ 10.1–10.2'],
              ['Matching Procedure', 'ขั้นตอนหกข้อ ตำแหน่งสตับ และความยาวสตับ', 'บทที่ 10.3 และ 10.4 (Example 7-8)'],
              ['Effects of Frequency Variation', 'matching ใช้ได้เฉพาะที่ความถี่ออกแบบ', 'บทที่ 11 ทั้งบท'],
            ] },
          { kind: 'table', title: 'ลำดับการอ่านที่แนะนำ',
            head: ['ลำดับ', 'เรื่อง', 'บทของแอป'],
            rows: [
              ['1', 'Impedance variation along a mismatched line', 'บทที่ 2'],
              ['2', 'Fundamentals: r, x, วงกลม, ส่วนโค้ง', 'บทที่ 3–4'],
              ['3', 'Constant SWR circle และการอ่าน SWR', 'บทที่ 5'],
              ['4', 'ระยะทางและทิศทางบนกราฟ', 'บทที่ 6'],
              ['5', 'Admittance และการใช้งานสามกลุ่ม', 'บทที่ 7'],
              ['6', 'สายส่งแทน L และ C (ที่มาของสตับ)', 'บทที่ 8'],
              ['7', 'Quarter-wave transformer matching', 'บทที่ 9'],
              ['8', 'Short-circuited stub matching', 'บทที่ 10'],
              ['9', 'Effects of frequency variation', 'บทที่ 11'],
            ] },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b1', num: '2', title: 'ปัญหาที่ทำให้ต้องมี Smith Chart', titleTh: 'เริ่มจากสายส่งกับโหลดที่ไม่แมตช์',
    intro: 'ก่อนจะอ่านกราฟได้ ต้องเห็นปัญหาก่อนว่าทำไมการคำนวณสายส่งด้วยมือจึงยาก บทนี้เริ่มจากสายส่งที่มีอิมพีแดนซ์คุณลักษณะ Z₀ ต่อกับโหลด Z_L แล้วดูว่าเกิดอะไรขึ้นเมื่อทั้งสองไม่เท่ากัน',
    sections: [
      {
        id: 'mismatch', title: 'เมื่อ Z_L ไม่เท่ากับ Z₀ จะเกิดคลื่นสะท้อน',
        lines: [
          T('สมมติสายส่งมีอิมพีแดนซ์คุณลักษณะ Z₀ และปลายสายต่อโหลดที่มีอิมพีแดนซ์ Z_L = R + jX'),
          M('Z_L = Z_0 \\;\\Rightarrow\\; \\text{แมตช์พอดี ไม่มีคลื่นสะท้อน (ในอุดมคติ)}'),
          T('แต่ถ้า Z_L ≠ Z₀ โดยเฉพาะเมื่อโหลดเป็นจำนวนเชิงซ้อน เช่น Z_L = 100 + j50 Ω คลื่นบางส่วนจะสะท้อนกลับ และรวมกับคลื่นที่เดินทางไปข้างหน้ากลายเป็นคลื่นนิ่ง (standing wave) บนสาย'),
          M('\\Gamma = \\frac{Z_L - Z_0}{Z_L + Z_0}, \\qquad SWR = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|}'),
          T(`ตัวอย่าง Z_L = 100 + j50 Ω บนสาย 50 Ω: Γ = ${fz(gammaFromZ(C(100, 50), 50), 3)} ขนาด ${n(abs(gammaFromZ(C(100, 50), 50)), 3)} → SWR = ${n(swrFromGamma(gammaFromZ(C(100, 50), 50)), 2)}`),
          N('|Γ| = 0 คือแมตช์สมบูรณ์ · |Γ| = 1 คือสะท้อนกลับหมด (ปลายเปิดหรือลัดวงจร)'),
        ],
        figures: [
          { kind: 'wave', title: 'คลื่นนิ่งเมื่อโหลด 100 + j50 Ω บนสาย 50 Ω', gammaMag: abs(gammaFromZ(C(100, 50), 50)), gammaDeg: deg(arg(gammaFromZ(C(100, 50), 50))), len: 0.5,
            caption: 'ยอดคลื่นและท้องคลื่นสลับกันทุกครึ่งความยาวคลื่น อัตราส่วนยอดต่อท้องคือ SWR' },
          { kind: 'wave', title: 'เทียบกับกรณีแมตช์ (Z_L = Z₀ = 50 Ω)', gammaMag: 0, gammaDeg: 0, len: 0.5, caption: 'ไม่มีคลื่นสะท้อน แรงดันคงที่ตลอดสาย SWR = 1' },
          { kind: 'lab', label: 'ทดลองใน Lab: โหลด 100 + j50 Ω บนสาย 50 Ω', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 100, X: 50 }]]), note: 'กด Explain เพื่อดูการคำนวณ Γ และ SWR ทีละขั้น' },
        ],
      },
      {
        id: 'along', title: 'อิมพีแดนซ์ที่มองเห็นเปลี่ยนไปตามตำแหน่งบนสาย',
        lines: [
          T('สิ่งสำคัญที่สุดของบทนี้: อิมพีแดนซ์ที่เรา "มองเห็น" ไม่ได้เท่ากับ Z_L ทุกตำแหน่ง เมื่อเดินจากโหลดเข้าหาแหล่งจ่าย ค่าที่วัดได้จะเปลี่ยนไปเรื่อย ๆ ตามสมการสายส่ง'),
          M('Z_{in}(l) = Z_0\\,\\frac{Z_L + jZ_0\\tan\\beta l}{Z_0 + jZ_L\\tan\\beta l}, \\qquad \\beta l = \\frac{2\\pi}{\\lambda}\\,l'),
          T('สำหรับสายไร้การสูญเสีย มีสมบัติสองข้อที่เป็นรากฐานของ Smith Chart:'),
          M('l = \\frac{\\lambda}{2}: \\; Z_{in} = Z_L \\qquad\\text{(ค่ากลับมาเท่าเดิมทุกครึ่งความยาวคลื่น)}'),
          M('l = \\frac{\\lambda}{4}: \\; Z_{in} = \\frac{Z_0^{2}}{Z_L} \\;\\Rightarrow\\; z_{in} = \\frac{1}{z_L} = y_L \\qquad\\text{(กลายเป็นแอดมิตแตนซ์ปกติของโหลด)}'),
          T('ข้อแรกทำให้กราฟหนึ่งรอบแทนระยะเพียง λ/2 ข้อที่สองทำให้การแปลง Z ↔ Y กลายเป็นการหมุนครึ่งรอบ ทั้งสองข้อจะกลับมาอีกในบทที่ 6 และ 7'),
        ],
        figures: [
          { kind: 'table', title: 'อิมพีแดนซ์ที่เห็น เมื่อเดินจากโหลด 100 + j50 Ω ไปทางแหล่งจ่าย (สาย 50 Ω, คำนวณโดยแอป)',
            head: ['ระยะจากโหลด', 'Z ที่มองเห็น (Ω)', 'z (ปกติ)', '|Γ|', 'SWR'],
            rows: [0, 0.05, 0.1, 0.125, 0.2, 0.25, 0.375, 0.5].map((d) => {
              const Z = lineInput(C(100, 50), 50, d, 0);
              const g = gammaFromZ(Z, 50);
              return [`${n(d, 3)} λ`, fz(Z, 1), fz(normalize(Z, 50), 3), n(abs(g), 3), n(swrFromGamma(g), 2)];
            }),
            caption: 'ค่า Z เปลี่ยนตลอด แต่ |Γ| และ SWR คงที่ · ที่ 0.25 λ ได้ 1/z_L และที่ 0.5 λ กลับมาเท่าเดิม' },
          { kind: 'smith', title: 'เส้นทางเดียวกันบน Smith Chart (ยังไม่ต้องอ่านตัวเลขบนกราฟตอนนี้)',
            points: [{ z: normalize(C(100, 50), 50), label: 'z_L', cls: 'load' }, { z: normalize(lineInput(C(100, 50), 50, 0.25, 0), 50), label: '0.25λ = y_L', cls: 'y' }],
            curves: [{ zs: swrPath(normalize(C(100, 50), 50), 0.5), cls: 'net', arrow: true }],
            swr: [swrFromGamma(gammaFromZ(C(100, 50), 50))],
            caption: 'เดินครบ 0.5 λ = วนกลับมาที่จุดเดิมพอดี นี่คือเหตุผลที่กราฟหนึ่งรอบแทน λ/2' },
          { kind: 'lab', label: 'ทดลอง: ต่อสายส่งแล้วเลื่อน Probe ดูค่าเปลี่ยนตามตำแหน่ง', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.25, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: 50 }]]), note: 'คลิกสายส่ง แล้วติ๊ก Probe เพื่อเลื่อนจุดวัด' },
        ],
      },
      {
        id: 'why', title: 'ทำไมการคำนวณอย่างเดียวจึงยาก',
        lines: [
          T('ลองดูโหลด inductive เช่น Z_L = 100 + j50 Ω เมื่อเดินไปตามสาย บางตำแหน่งค่าที่เห็นยังเป็น inductive (R + jX) บางตำแหน่งกลายเป็น capacitive (R − jX)'),
          T('ระหว่างสองตำแหน่งนั้น ต้องมีจุดหนึ่งที่ X = 0 พอดี นั่นคือจุดที่อิมพีแดนซ์เป็นความต้านทานล้วน'),
          M('Z = R + j0 \\qquad \\text{(purely resistive point)}'),
          T('การหาตำแหน่งนี้ด้วยการแก้สมการสายส่งที่มีจำนวนเชิงซ้อนซ้ำ ๆ ทำได้ยากและเสียเวลา โดยเฉพาะเมื่อโหลดเป็นจำนวนเชิงซ้อน — Smith Chart ทำให้อ่านตำแหน่งนี้ได้ทันทีจากกราฟ'),
          N('จุด X = 0 นี้สำคัญมากในบทที่ 9 เพราะหม้อแปลง λ/4 ใช้ได้เฉพาะกับโหลดที่เป็นความต้านทานล้วนเท่านั้น'),
        ],
        figures: [
          { kind: 'plot', title: 'ส่วน R และ X ที่มองเห็น เมื่อเดินจากโหลด 100 + j50 Ω ไปทางแหล่งจ่าย', xLabel: 'ระยะจากโหลด (λ)', yLabel: 'Ω', xMin: 0, xMax: 0.5, yMin: -120, yMax: 260,
            series: [
              { name: 'R', points: linspace(0, 0.5, 101).map((d) => [d, lineInput(C(100, 50), 50, d, 0).re] as [number, number]) },
              { name: 'X', color: '#dc2626', points: linspace(0, 0.5, 101).map((d) => [d, lineInput(C(100, 50), 50, d, 0).im] as [number, number]) },
            ],
            xTicks: [0, 0.125, 0.25, 0.375, 0.5],
            markers: (() => {
              const roots: { x: number; y: number; text: string }[] = [];
              let prev = lineInput(C(100, 50), 50, 0, 0).im;
              for (let i = 1; i <= 500; i++) {
                const d = (0.5 * i) / 500;
                const cur = lineInput(C(100, 50), 50, d, 0).im;
                if (prev === 0 || prev * cur < 0) roots.push({ x: d, y: 0, text: `X = 0 ที่ ${n(d, 3)} λ` });
                prev = cur;
              }
              return roots.slice(0, 2);
            })(),
            caption: 'จุดที่เส้น X ตัดศูนย์คือตำแหน่งที่อิมพีแดนซ์เป็นความต้านทานล้วน' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b2', num: '3', title: 'Smith Chart คืออะไร และทำไมต้อง normalize', titleTh: 'กราฟที่แทนการแก้สมการสายส่ง',
    intro: 'Smith Chart คือ polar impedance diagram — กราฟที่จัดวงกลมและส่วนโค้งไว้ให้นำค่าของสายส่งที่ไม่แมตช์มาพล็อตและอ่านผลได้โดยไม่ต้องแก้สมการจำนวนเชิงซ้อนซ้ำ ๆ',
    sections: [
      {
        id: 'what', title: 'กราฟนี้ช่วยลดงานอะไร',
        lines: [
          T('แทนที่จะแทนค่าในสมการนี้ทุกครั้งที่เปลี่ยนตำแหน่ง'),
          M('Z_{in} = Z_0\\,\\frac{Z_L + jZ_0\\tan\\beta l}{Z_0 + jZ_L\\tan\\beta l}'),
          T('เราทำเพียงสามขั้น'),
          K('Z_L  →  พล็อตจุดบนกราฟ  →  หมุนไปตามระยะที่ต้องการ  →  อ่าน Z_in ออกมา'),
          N('กราฟไม่ได้แทนที่ทฤษฎี แต่แทนที่ "การคำนวณซ้ำ" — สมการด้านบนยังเป็นที่มาของทุกเส้นบนกราฟ'),
        ],
      },
      {
        id: 'gamma', title: 'ที่มาของกราฟ: ระนาบของ Γ',
        lines: [
          T('Smith Chart จริง ๆ แล้วคือระนาบของสัมประสิทธิ์การสะท้อน Γ ที่วาดวงกลม r และ x ทับลงไป เริ่มจากนิยาม'),
          M('\\Gamma = \\frac{Z_L - Z_0}{Z_L + Z_0} = \\frac{z - 1}{z + 1}, \\qquad z = \\frac{1 + \\Gamma}{1 - \\Gamma}'),
          T('เพราะวงจร passive ทุกชนิดมี |Γ| ≤ 1 จุดทั้งหมดจึงตกอยู่ในวงกลมรัศมี 1 — นี่คือขอบของ Smith Chart'),
          T('เมื่อแทน z = r + jx ลงในสมการแล้วแยกส่วนจริงกับส่วนจินตภาพ จะได้สมการวงกลมสองชุด'),
          M('\\left(\\Gamma_r - \\frac{r}{1+r}\\right)^2 + \\Gamma_i^2 = \\left(\\frac{1}{1+r}\\right)^2 \\qquad \\text{(วงกลม r คงที่)}'),
          M('\\left(\\Gamma_r - 1\\right)^2 + \\left(\\Gamma_i - \\frac{1}{x}\\right)^2 = \\left(\\frac{1}{x}\\right)^2 \\qquad \\text{(วงกลม x คงที่)}'),
          N('วงกลม r ทุกวงมีจุดศูนย์กลางอยู่บนแกนนอนและสัมผัสกันที่จุด OPEN ด้านขวา ส่วนวงกลม x มีจุดศูนย์กลางอยู่บนเส้นตั้งฉากที่ผ่านจุด OPEN จึงเห็นเป็นส่วนโค้งภายในวงกลมหน่วย'),
        ],
        figures: [
          { kind: 'smith', title: 'วงกลม r = 0.5, 1, 2 (ฟ้า) และเส้นโค้ง x = ±0.5, ±1 (ส้ม) บนระนาบ Γ',
            rCircles: [0.5, 1, 2], xCircles: [0.5, -0.5, 1, -1],
            points: [{ z: C(1, 0), label: 'ศูนย์กลาง z = 1', cls: 'in' }],
            caption: 'ทุกจุดในวงกลมหน่วยแทนอิมพีแดนซ์หนึ่งค่า ระยะจากศูนย์กลางคือ |Γ| และมุมคือ ∠Γ' },
        ],
      },
      {
        id: 'norm', title: 'ทำไมต้อง normalize ก่อนพล็อต',
        lines: [
          T('Smith Chart มาตรฐานไม่ได้สร้างมาสำหรับ 50 Ω หรือ 75 Ω หรือ 300 Ω โดยเฉพาะ แต่สร้างให้ใช้ได้กับทุกค่า Z₀ จึงต้องเปลี่ยนอิมพีแดนซ์จริงเป็นค่าปกติก่อน'),
          M('z = \\frac{Z}{Z_0} = \\frac{R + jX}{Z_0} = r + jx, \\qquad r = \\frac{R}{Z_0}, \\quad x = \\frac{X}{Z_0}'),
          T('ข้อดีคือกราฟใบเดียวใช้ได้กับทุกระบบ และเมื่ออ่านค่าเสร็จก็คูณ Z₀ กลับเพื่อได้ค่าจริง'),
          M('Z = z\\,Z_0'),
        ],
        figures: [
          { kind: 'table', title: 'อิมพีแดนซ์จริงเดียวกัน เมื่อ normalize ด้วย Z₀ ต่างกัน (คำนวณโดยแอป)',
            head: ['Z จริง', 'Z₀ = 50 Ω', 'Z₀ = 75 Ω', 'Z₀ = 300 Ω'],
            rows: [C(25, 25), C(100, -50), C(450, -600), C(50, 0)].map((Z) => [fz(Z, 0) + ' Ω', fz(normalize(Z, 50), 3), fz(normalize(Z, 75), 3), fz(normalize(Z, 300), 3)]),
            caption: 'จุดบนกราฟจะต่างกันไปตาม Z₀ ที่ใช้ normalize จึงต้องระบุ Z₀ ทุกครั้ง' },
        ],
      },
      {
        id: 'ex-norm', title: 'ตัวอย่างการ normalize ทีละขั้น',
        lines: [
          T('โจทย์: สาย Z₀ = 50 Ω โหลด Z_L = 25 + j25 Ω'),
          M('z_L = \\frac{25 + j25}{50} = \\frac{25}{50} + j\\frac{25}{50}'),
          R(`z_L = ${tc(normalize(C(25, 25), 50), 1)}`),
          T('เวลาใช้ Smith Chart จึงไม่พล็อต 25 + j25 แต่พล็อต 0.5 + j0.5'),
          N(`ตรวจย้อนกลับ: 0.5 × 50 = 25 Ω และ 0.5 × 50 = 25 Ω ✓ · จุดนี้ให้ SWR = ${n(swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)}`),
        ],
        figures: [
          { kind: 'smith', title: 'จุด z_L = 0.5 + j0.5 คือจุดตัดของวงกลม r = 0.5 กับเส้นโค้ง x = +0.5',
            rCircles: [0.5], xCircles: [0.5], points: [{ z: C(0.5, 0.5), label: 'z_L = 0.5 + j0.5', cls: 'load' }],
            caption: 'r บอกว่าอยู่วงไหน x บอกว่าอยู่ส่วนโค้งไหน จุดตัดคือคำตอบ' },
          { kind: 'lab', label: 'ทดลอง: R 25 Ω อนุกรม L 39.8 nH ที่ 100 MHz ให้ z = 0.5 + j0.5', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 25 }], ['inductor', 'series', { L: 39.8 }]]), note: 'กด Explain ดูขั้น Normalize' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b3', num: '4', title: 'อ่านกราฟให้เป็น: วงกลม r และส่วนโค้ง x', titleTh: 'พิกัดของ Smith Chart',
    intro: 'บทนี้เป็นการฝึกอ่านพิกัด: วงกลมความต้านทานคงที่ ส่วนโค้งรีแอกแตนซ์คงที่ ความหมายของเครื่องหมาย +j และ −j การตัดกันแบบตั้งฉาก และความหมายของจุดสำคัญบนกราฟ',
    sections: [
      {
        id: 'rcircle', title: 'วงกลมความต้านทานคงที่ (r)',
        lines: [
          T('วงกลมที่ปิดสนิทและมีจุดศูนย์กลางอยู่บนเส้นแนวนอนของกราฟ แทนค่าความต้านทานปกติ'),
          M('r = \\frac{R}{Z_0}'),
          T('แต่ละค่ามีวงกลมของตัวเอง เช่น r = 0.2, 0.5, 1, 2, 5 · ยิ่ง r มาก วงยิ่งเล็กและเข้าใกล้ขอบขวา'),
          M('\\text{จุดศูนย์กลาง} = \\left(\\frac{r}{1+r},\\,0\\right), \\qquad \\text{รัศมี} = \\frac{1}{1+r}'),
          T('ดังนั้นถ้า z = 0.5 + j0.7 ให้เริ่มจากวงกลม r = 0.5 ก่อนเสมอ แล้วค่อยหาส่วนโค้ง x = +0.7 จุดตัดคือคำตอบ'),
        ],
        figures: [
          { kind: 'smith', title: 'วงกลม r = 0.2, 0.5, 1, 2, 5', rCircles: [0.2, 0.5, 1, 2, 5],
            points: [{ z: C(0.2, 0), label: 'r=0.2', cls: 'mid' }, { z: C(1, 0), label: 'r=1', cls: 'in' }, { z: C(5, 0), label: 'r=5', cls: 'mid' }],
            caption: 'ทุกวงสัมผัสกันที่จุด OPEN ด้านขวา · วง r = 0 คือขอบกราฟ · r = ∞ คือจุด OPEN' },
          { kind: 'chart', title: 'วงกลม r ชุดเดียวกันบนกราฟตัวเต็ม (กราฟเดียวกับที่ใช้ในหน้า Lab)',
            rCircles: [0.2, 0.5, 1, 2, 5], scale: false,
            points: [{ z: C(0.2, 0), label: 'r = 0.2', cls: 'mid' }, { z: C(1, 0), label: 'r = 1', cls: 'in' }, { z: C(5, 0), label: 'r = 5', cls: 'mid' }],
            caption: 'กราฟพิมพ์จริงมีวงกลมละเอียดกว่านี้มาก แต่เป็นวงชุดเดียวกัน · เส้นหนาสีน้ำเงินคือวงที่ยกมาให้ดู' },
          { kind: 'table', title: 'ตำแหน่งของวงกลม r (คำนวณจากสูตร)', head: ['r', 'ศูนย์กลาง Γ', 'รัศมี', 'R จริงเมื่อ Z₀ = 50 Ω'],
            rows: [0.2, 0.5, 1, 2, 5].map((r) => [n(r, 2), n(r / (1 + r), 3), n(1 / (1 + r), 3), `${n(r * 50, 0)} Ω`]) },
        ],
      },
      {
        id: 'xarc', title: 'ส่วนโค้งรีแอกแตนซ์คงที่ (x)',
        lines: [
          T('อีกชุดหนึ่งคือส่วนโค้งที่อยู่สองด้านของเส้นแนวนอนกลางกราฟ แทนค่ารีแอกแตนซ์ปกติ'),
          M('x = \\frac{X}{Z_0}, \\qquad \\text{ศูนย์กลาง} = \\left(1,\\,\\frac{1}{x}\\right), \\qquad \\text{รัศมี} = \\left|\\frac{1}{x}\\right|'),
          T('เราจึงอ่าน z = r + jx จากจุดตัดของวงกลม r กับส่วนโค้ง x เช่น z = 0.5 + j0.5 คือจุดที่วงกลม r = 0.5 ตัดกับส่วนโค้ง x = +0.5'),
          N('เส้นแนวนอนกลางกราฟคือ x = 0 ทุกจุดบนเส้นนี้เป็นความต้านทานล้วน'),
        ],
        figures: [
          { kind: 'smith', title: 'ส่วนโค้ง x = +0.5, +1, +2 (ครึ่งบน) และ −0.5, −1, −2 (ครึ่งล่าง)',
            xCircles: [0.5, 1, 2, -0.5, -1, -2],
            points: [{ z: C(0.5, 0.5), label: '0.5 + j0.5', cls: 'load' }, { z: C(0.5, -0.5), label: '0.5 − j0.5', cls: 'mid' }],
            rCircles: [0.5],
            caption: 'สองจุดนี้มี r เท่ากันแต่เครื่องหมายของ x ต่างกัน จึงอยู่คนละครึ่งของกราฟ' },
          { kind: 'chart', title: 'อ่าน z = 0.5 + j0.5 จากกราฟตัวเต็ม: หาวงกลม r = 0.5 ก่อน แล้วไล่ตามส่วนโค้ง x = +0.5',
            rCircles: [0.5], xCircles: [0.5], scale: false,
            points: [{ z: C(0.5, 0.5), label: 'z = 0.5 + j0.5', cls: 'load' }],
            caption: 'บนกราฟจริงตัวเลข r อยู่บนแกนนอน ส่วนตัวเลข x อยู่รอบขอบ · จุดตัดเดียวคือคำตอบ' },
        ],
      },
      {
        id: 'sign', title: 'ความหมายของ +j และ −j',
        lines: [
          T('ในอิมพีแดนซ์ Z = R + jX'),
          M('X > 0 \\;\\Rightarrow\\; \\text{inductive} \\quad (\\text{เช่น } 50 + j30\\,\\Omega)'),
          M('X < 0 \\;\\Rightarrow\\; \\text{capacitive} \\quad (\\text{เช่น } 50 - j30\\,\\Omega)'),
          W('เครื่องหมายผิดหมายถึงอยู่คนละด้านของกราฟ ผลลัพธ์ทั้งหมดจะผิดตาม — 0.5 + j0.5 อยู่ครึ่งบน ส่วน 0.5 − j0.5 อยู่ครึ่งล่าง'),
          T('ที่มาของเครื่องหมาย: X_L = 2πfL เป็นบวกเสมอ ส่วน X_C = −1/(2πfC) เป็นลบเสมอ'),
        ],
        figures: [
          { kind: 'lab', label: 'ทดลอง: R 50 Ω + L (inductive) → ครึ่งบน', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['inductor', 'series', { L: 47.7 }]]) },
          { kind: 'lab', label: 'ทดลอง: R 50 Ω + C (capacitive) → ครึ่งล่าง', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['capacitor', 'series', { C: 53 }]]) },
        ],
      },
      {
        id: 'ortho', title: 'วงกลมทั้งสองชุดตัดกันแบบตั้งฉาก',
        lines: [
          T('ชุดวงกลม r และชุดส่วนโค้ง x ถูกออกแบบให้ตัดกันแบบ orthogonal — ถ้าลากเส้นสัมผัสที่จุดตัด เส้นสัมผัสทั้งสองจะตั้งฉากกัน'),
          T('เหตุผลเชิงคณิตศาสตร์: การแปลง Γ = (z − 1)/(z + 1) เป็น conformal mapping ซึ่งรักษามุมระหว่างเส้นไว้ เส้น r คงที่กับเส้น x คงที่ในระนาบ z ตั้งฉากกันอยู่แล้ว จึงยังตั้งฉากกันหลังการแปลง'),
          N('ผลที่ได้คือระบบพิกัดที่อ่านค่า r และ x ได้อย่างเป็นระบบเหมือนกราฟกระดาษกราฟธรรมดา'),
        ],
        figures: [
          { kind: 'smith', title: 'ที่จุด z = 1 + j1 วงกลม r = 1 กับส่วนโค้ง x = 1 ตัดกันเป็นมุมฉาก',
            rCircles: [1], xCircles: [1], points: [{ z: C(1, 1), label: 'z = 1 + j1', cls: 'load' }] },
          { kind: 'chart', title: 'ความตั้งฉากบนกราฟตัวเต็ม: ทุกจุดตัดของสองชุดเส้นเป็นมุมฉาก',
            rCircles: [1], xCircles: [1, -1], scale: false,
            points: [{ z: C(1, 1), label: 'z = 1 + j1', cls: 'load' }, { z: C(1, -1), label: 'z = 1 − j1', cls: 'mid' }],
            caption: 'เพราะเป็นระบบพิกัดตั้งฉาก จึงอ่าน r กับ x แยกกันได้ทีละแกน เหมือนกระดาษกราฟ' },
        ],
      },
      {
        id: 'center', title: 'จุดกลางกราฟ คือจุดที่แมตช์',
        lines: [
          T('จุดตรงกลางหมายถึง z = 1 + j0 เพราะ'),
          M('z = \\frac{Z}{Z_0} = 1 \\;\\Rightarrow\\; Z = Z_0'),
          T('เช่น สาย 50 Ω ต่อโหลด 50 + j0 Ω จะได้ z_L = 50/50 = 1 จึงอยู่กลางกราฟพอดี และ'),
          R('\\Gamma = 0, \\qquad SWR = 1 \\qquad \\text{(perfect match)}'),
          N('เป้าหมายของการทำ matching ทุกวิธีในคอร์สนี้ คือการย้ายจุดจากที่ใดก็ตามมาให้ถึงศูนย์กลางนี้'),
        ],
        figures: [
          { kind: 'smith', title: 'จุดสำคัญสี่จุดบนกราฟ',
            points: [
              { z: C(1, 0), label: 'ศูนย์กลาง z = 1 (matched)', cls: 'in' },
              { z: C(0, 0), label: 'SHORT z = 0', cls: 'stub' },
              { z: C(1e6, 0), label: 'OPEN z = ∞', cls: 'stub' },
            ],
            rCircles: [1], caption: 'ซ้ายสุด = ลัดวงจร (Γ = −1) · ขวาสุด = ปลายเปิด (Γ = +1) · กลาง = แมตช์ (Γ = 0)' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b4', num: '5', title: 'วงกลม SWR คงที่', titleTh: 'สิ่งที่ไม่เปลี่ยนเมื่อเดินไปตามสาย',
    intro: 'เมื่อพล็อตโหลดแล้ว ลากวงกลมที่มีศูนย์กลางอยู่กลางกราฟผ่านจุดโหลด วงกลมนี้คือ constant SWR circle และเป็นเส้นทางที่จุดจะเดินเมื่อเราขยับไปตามสายไร้การสูญเสีย',
    sections: [
      {
        id: 'circle', title: 'ทำไมจุดจึงเดินอยู่บนวงกลมเดียว',
        lines: [
          T('บนสายไร้การสูญเสีย ขนาดของสัมประสิทธิ์การสะท้อนไม่เปลี่ยน เปลี่ยนแต่มุม'),
          M('\\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l} \\;\\Rightarrow\\; |\\Gamma(l)| = |\\Gamma_L| = \\text{คงที่}'),
          T('เพราะ |Γ| คือรัศมีจากศูนย์กลางกราฟ จุดจึงหมุนอยู่บนวงกลมรัศมีเดิม และเพราะ SWR ขึ้นกับ |Γ| อย่างเดียว'),
          M('SWR = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|} = \\text{คงที่ตลอดสาย}'),
          R('Z \\text{ เปลี่ยนทุกตำแหน่ง แต่ } SWR \\text{ ไม่เปลี่ยน}'),
        ],
      },
      {
        id: 'ex-swr', title: 'ตัวอย่าง: z = 0.5 + j0.5 เดินไป 0.100 λ',
        lines: [
          T('พล็อต z_L = 0.5 + j0.5 แล้วลากวงกลม SWR คงที่ จะอ่านได้'),
          R(`SWR = ${n(swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)} \\qquad (\\text{หนังสือ } 2.6)`),
          T('เดินจากโหลดไปทางแหล่งจ่าย 0.100 λ (ตามเข็มนาฬิกา) จะได้'),
          R(`z = ${tc(zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.1)), 2)} \\qquad (\\text{หนังสือ } 1.4 + j1.1)`),
          T('อิมพีแดนซ์เปลี่ยนไปมาก แต่ทั้งสองจุดอยู่บนวงกลมเดียวกัน SWR จึงยังเท่าเดิม'),
        ],
        figures: [
          { kind: 'smith', title: 'จาก z = 0.5 + j0.5 เดินไปทางแหล่งจ่าย 0.100 λ',
            points: [{ z: C(0.5, 0.5), label: 'z_L = 0.5 + j0.5', cls: 'load' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.1)), label: `0.1λ → ${fz(zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.1)), 2)}`, cls: 'in' }],
            curves: [{ zs: swrPath(C(0.5, 0.5), 0.1), cls: 'net', arrow: true }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))],
            caption: 'ทั้งสองจุดอยู่บนวงกลม SWR เดียวกัน' },
          { kind: 'lab', label: 'ทดลอง: z = 0.5 + j0.5 ผ่านสาย 0.100 λ', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.1, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 25, X: 25 }]]) },
        ],
      },
      {
        id: 'read-swr', title: 'วิธีอ่านค่า SWR จากกราฟ',
        lines: [
          T('เมื่อวาดวงกลม SWR คงที่แล้ว ให้ดูจุดที่วงกลมตัดแกนแนวนอนทางขวามือของศูนย์กลาง ค่าความต้านทานปกติที่จุดนั้นคือ SWR'),
          M('r_{\\max} = SWR, \\qquad r_{\\min} = \\frac{1}{SWR}'),
          T('เหตุผล: จุดขวาสุดของวงกลมคือจุดที่แรงดันสูงสุด (E_max) ซึ่งอิมพีแดนซ์เป็นความต้านทานล้วนและมีค่าสูงสุด'),
          N(`ตัวอย่าง: ถ้าตัดที่ r = 2.6 ก็คือ SWR = 2.6 · จุดซ้ายสุดจะเป็น r = 1/2.6 = ${n(1 / 2.6, 3)}`),
        ],
        figures: [
          { kind: 'smith', title: 'วงกลม SWR ตัดแกนนอนที่ r = SWR (ขวา) และ r = 1/SWR (ซ้าย)',
            points: [{ z: C(0.5, 0.5), label: 'z_L', cls: 'load' }, { z: C(swrFromGamma(gammaFromz(C(0.5, 0.5))), 0), label: `r = ${n(swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)} = SWR`, cls: 'in' }, { z: C(1 / swrFromGamma(gammaFromz(C(0.5, 0.5))), 0), label: `r = ${n(1 / swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)}`, cls: 'mid' }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))] },
          { kind: 'chart', title: 'อ่าน SWR บนกราฟตัวเต็มด้วยการกวาดรัศมี (แบบเดียวกับที่หน้า Lab วาดให้)',
            readout: C(0.5, 0.5), scale: false,
            points: [{ z: C(0.5, 0.5), label: 'z_L = 0.5 + j0.5', cls: 'load' }],
            caption: 'เส้นทึบคือรัศมีวงเวียน เส้นโค้งประคือการกวาดลงแกนนอนครึ่งขวา จุดที่แตะอ่าน r ได้เท่ากับ SWR พอดี' },
        ],
      },
      {
        id: 'lossy', title: 'สายที่มีการสูญเสีย: เกลียวเข้าหาศูนย์กลาง',
        lines: [
          T('ทุกอย่างข้างต้นใช้กับสายไร้การสูญเสีย ถ้าสายมีการสูญเสีย คลื่นสะท้อนถูกลดทอนทั้งขาไปและขากลับ ทำให้ |Γ| ลดลงเรื่อย ๆ'),
          M('|\\Gamma(l)| = |\\Gamma_L|\\,e^{-2\\alpha l}'),
          T('เส้นทางจึงไม่เป็นวงกลม แต่เป็นเกลียวเข้าหาศูนย์กลาง (inward spiral) และ SWR ที่วัดได้ที่ต้นสายจะต่ำกว่าที่โหลดจริง'),
          W('SWR ที่ต้นสายต่ำ ไม่ได้แปลว่าโหลดแมตช์ดี อาจเป็นเพราะสายกินกำลังไปมากก็ได้'),
          N('ในบทเรียนพื้นฐานทั้งหมดต่อจากนี้ เราถือว่าสายไร้การสูญเสีย'),
        ],
        figures: [
          { kind: 'chart', title: `สายที่มีการสูญเสีย: เส้นทางเป็นเกลียวเข้าหาศูนย์กลาง (โหลด ${n(LOSSY_ZL.re, 0)} Ω บนสาย ${LOSSY_Z0} Ω, 6 dB ต่อความยาวคลื่น — คำนวณโดยแอป)`,
            scale: false, fine: false,
            points: [
              { z: lossyZ(0), label: `z_L = ${fz(lossyZ(0), 2)}`, cls: 'load' },
              { z: lossyZ(1), label: `ที่ 1.0 λ → ${fz(lossyZ(1), 2)}`, cls: 'in' },
            ],
            curves: [
              { zs: linspace(0, 1, 121).map(lossyZ), cls: 'net', arrow: true },
              { zs: swrPath(lossyZ(0), 0.5), cls: 'mid', dashed: true },
            ],
            swr: [swrFromGamma(gammaFromz(lossyZ(0))), swrFromGamma(gammaFromz(lossyZ(1)))],
            caption: 'เส้นทึบ = เกลียวของสายที่มีการสูญเสีย · เส้นประ = วงกลม SWR คงที่ของสายไร้การสูญเสีย · วงกลมสองวงคือ SWR ที่โหลดและที่ 1.0 λ' },
          { kind: 'table', title: '|Γ| และ SWR ลดลงอย่างไรเมื่อเดินไปตามสายที่มีการสูญเสีย (คำนวณโดยแอป)',
            head: ['ระยะจากโหลด', 'z ที่มองเห็น', '|Γ|', 'SWR'],
            rows: [0, 0.25, 0.5, 0.75, 1].map((d) => [`${n(d, 2)} λ`, fz(lossyZ(d), 3), n(abs(gammaFromz(lossyZ(d))), 3), n(swrFromGamma(gammaFromz(lossyZ(d))), 2)]),
            caption: 'ทุกครึ่งความยาวคลื่นจุดกลับมาที่มุมเดิม แต่รัศมีเล็กลง จึงไม่ทับจุดเดิมอีกต่อไป' },
          { kind: 'lab', label: 'ทดลอง: โหลด 200 Ω ผ่านสาย 0.5 λ ที่มี loss 3 dB', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.5, vf: 0.66, lossDb: 3 }], ['load', 'series', { R: 200, X: 0 }]]), note: 'เทียบจุด z_L (แดง) กับ z_in (เขียว) จะเห็นว่า z_in เข้าใกล้ศูนย์กลางกว่า' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b5', num: '6', title: 'ระยะทางบนกราฟ', titleTh: 'หนึ่งรอบเท่ากับครึ่งความยาวคลื่น',
    intro: 'จุดที่สับสนบ่อยที่สุดคือกราฟหนึ่งรอบแทนระยะเท่าไร และทิศไหนคือไปทางแหล่งจ่าย บทนี้ตอบทั้งสองข้อพร้อมที่มา',
    sections: [
      {
        id: 'halflambda', title: 'หนึ่งรอบ = λ/2 ไม่ใช่ λ',
        lines: [
          T('จากสมการการหมุนของ Γ'),
          M('\\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l}, \\qquad \\beta = \\frac{2\\pi}{\\lambda}'),
          T('มุมที่หมุนคือ 2βl ดังนั้นเมื่อ l = λ/2'),
          M('2\\beta l = 2\\cdot\\frac{2\\pi}{\\lambda}\\cdot\\frac{\\lambda}{2} = 2\\pi \\;\\Rightarrow\\; \\text{ครบหนึ่งรอบพอดี}'),
          R('360^\\circ \\text{ บนกราฟ} \\;\\Leftrightarrow\\; 0.5\\lambda \\text{ บนสาย}'),
          T('จึงได้ความสัมพันธ์ที่ใช้บ่อย'),
          M('180^\\circ \\Leftrightarrow 0.25\\lambda, \\qquad 90^\\circ \\Leftrightarrow 0.125\\lambda'),
          W('ระวังสองมุมนี้ให้ดี: βl คือความยาวไฟฟ้าของสาย (λ/4 → βl = 90°) ส่วนมุมที่หมุนบนกราฟคือ 2βl (λ/4 → หมุน 180°)'),
        ],
        figures: [
          { kind: 'smith', title: 'เดินจาก z = 0.5 + j0.5 ครบ 0.5 λ กลับมาที่จุดเดิม',
            points: [{ z: C(0.5, 0.5), label: 'เริ่ม / จบ', cls: 'load' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.125)), label: '0.125λ', cls: 'mid' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.25)), label: '0.25λ = y_L', cls: 'y' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.375)), label: '0.375λ', cls: 'mid' }],
            curves: [{ zs: swrPath(C(0.5, 0.5), 0.5), cls: 'net' }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))] },
        ],
      },
      {
        id: 'direction', title: 'ทิศทาง: toward generator กับ toward load',
        lines: [
          R('\\text{Toward Generator} = \\text{ตามเข็มนาฬิกา (clockwise)}'),
          R('\\text{Toward Load} = \\text{ทวนเข็มนาฬิกา (counterclockwise)}'),
          T('ที่มา: เครื่องหมายลบใน e^{−j2βl} ทำให้มุมของ Γ ลดลงเมื่อ l เพิ่มขึ้น ซึ่งบนระนาบเชิงซ้อนคือการหมุนตามเข็มนาฬิกา'),
          T('ดังนั้นถ้าโจทย์บอกว่า "หาอิมพีแดนซ์ที่ระยะ 0.1 λ จากโหลดไปทางแหล่งจ่าย" ให้เริ่มจากจุดโหลดแล้วเดินตามเข็มนาฬิกา 0.1 λ'),
          N('ในแอปนี้ สเกลวงกลางรอบกราฟคือ wavelengths toward generator และวงนอกสุดคือ toward load'),
        ],
        figures: [
          { kind: 'smith', title: 'จากจุดเดียวกัน เดินไปคนละทิศ 0.1 λ',
            points: [{ z: C(0.5, 0.5), label: 'z_L', cls: 'load' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.1)), label: 'ตามเข็ม → generator', cls: 'in' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), -0.1)), label: 'ทวนเข็ม → load', cls: 'mid' }],
            curves: [{ zs: swrPath(C(0.5, 0.5), 0.1), cls: 'in', arrow: true }, { zs: swrPath(C(0.5, 0.5), -0.1), cls: 'mid', arrow: true }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))] },
        ],
      },
      {
        id: 'scale', title: 'วิธีอ่านระยะจากสเกลรอบนอก',
        lines: [
          T('สเกลรอบนอกมีค่า 0 ถึง 0.5 λ ให้ทำแบบนี้'),
          K('1. ลากเส้นจากศูนย์กลางผ่านจุดโหลดออกไปชนสเกล → อ่านค่าเริ่มต้น\n2. บวกระยะที่ต้องการเดิน (toward generator) หรือลบ (toward load)\n3. ถ้าเกิน 0.5 ให้ลบ 0.5 ออก เพราะกราฟวนซ้ำทุกครึ่งความยาวคลื่น\n4. ลากเส้นจากศูนย์กลางไปยังค่าใหม่ ตัดกับวงกลม SWR ตรงไหน จุดนั้นคือคำตอบ'),
          T('ตัวอย่าง: โหลดอยู่ที่สเกล 0.12 เดินไปทางแหล่งจ่ายจนถึง 0.27'),
          M('d = 0.27 - 0.12 = 0.15\\lambda'),
          T(`ตัวอย่างจริงจากแอป: z_L = 0.5 + j0.5 อยู่ที่สเกล ${n(wtgFromGamma(gammaFromz(C(0.5, 0.5))), 4)} λ เมื่อเดินไป 0.1 λ จะไปอยู่ที่ ${n((wtgFromGamma(gammaFromz(C(0.5, 0.5))) + 0.1) % 0.5, 4)} λ`),
        ],
        figures: [
          { kind: 'table', title: 'ตำแหน่งบนสเกลของจุดสำคัญ (คำนวณโดยแอป)', head: ['z', 'ตำแหน่งบนสเกล toward generator'],
            rows: ([[C(0, 0), 'SHORT'], [C(1e6, 0), 'OPEN'], [C(0.5, 0.5), '0.5 + j0.5'], [C(1.5, -2), '1.5 − j2'], [C(1, 0), 'ศูนย์กลาง (แมตช์)']] as [Complex, string][])
              .map(([z, name]) => [name, `${n(wtgFromGamma(gammaFromz(z)), 4)} λ`]),
            caption: 'จุดศูนย์กลางไม่มีทิศ ค่าที่แสดงจึงไม่มีความหมายสำหรับจุดนั้น' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b6', num: '7', title: 'แอดมิตแตนซ์และการหมุน 180°', titleTh: 'ทำไม Z → Y จึงเป็นการหมุนครึ่งรอบ',
    intro: 'อุปกรณ์ที่ต่อขนานบวกกันด้วยแอดมิตแตนซ์ ไม่ใช่อิมพีแดนซ์ บทนี้อธิบายการแปลง Z ↔ Y บนกราฟและที่มาว่าทำไมจึงเป็นการหมุนครึ่งรอบพอดี',
    sections: [
      {
        id: 'y', title: 'นิยาม ค่าปกติ และ Y₀ = 1/Z₀',
        lines: [
          M('Y = \\frac{1}{Z} = G + jB \\quad [\\text{S}], \\qquad y = \\frac{1}{z} = g + jb'),
          T('โดย g คือ conductance ปกติ และ b คือ susceptance ปกติ'),
          M('y = \\frac{1}{r + jx} = \\frac{r - jx}{r^2 + x^2} \\;\\Rightarrow\\; g = \\frac{r}{r^2+x^2}, \\quad b = \\frac{-x}{r^2+x^2}'),
          T('การ normalize ฝั่งแอดมิตแตนซ์ไม่ได้หารด้วย Z₀ แต่หารด้วย characteristic admittance ของสาย ซึ่งเป็นส่วนกลับของ Z₀'),
          M('Y_0 = \\frac{1}{Z_0}, \\qquad y = \\frac{Y}{Y_0} = Y Z_0'),
          T('สองทางให้คำตอบเดียวกันเสมอ เพราะ y = Y/Y₀ = (1/Z)·Z₀ = Z₀/Z = 1/z จะกลับส่วนก่อนแล้ว normalize หรือ normalize ก่อนแล้วกลับส่วน ก็ได้เท่ากัน'),
          T(`ตัวอย่างจริง: สาย ${APP_Z0} Ω มี Y₀ = 1/${APP_Z0} = ${n(Y0App, 4)} S · โหลด Z_L = ${fz(APP_ZL, 0)} Ω มี Y_L = 1/Z_L = ${fz(YApp, 4)} S`),
          M(`y_L = \\frac{Y_L}{Y_0} = \\frac{${tc(YApp, 3)}}{${n(Y0App, 3)}} = ${tc(yApp, 0)} \\qquad = \\; \\frac{1}{z_L} = \\frac{1}{${tc(zApp, 1)}}`),
          T('ข้อดีจึงเหมือนฝั่งอิมพีแดนซ์ทุกอย่าง: เมื่อ normalize แล้ว กราฟใบเดียวใช้ได้กับทุกค่า Z₀ และเมื่ออ่านค่าเสร็จก็คูณกลับเพื่อได้ค่าจริง'),
          M('Y = y\\,Y_0 = \\frac{y}{Z_0}'),
          W('สังเกตเครื่องหมาย: โหลด inductive มี x > 0 แต่ b < 0 — เครื่องหมายกลับกันเสมอเมื่อเปลี่ยนโดเมน'),
          N('หน่วยของ Y คือซีเมนส์ (S) บางตำราเขียนว่า mho หรือ ℧ · ส่วน y ไม่มีหน่วย เหมือน z'),
        ],
        figures: [
          { kind: 'table', title: 'Y₀ ของสายมาตรฐาน และโหลดตัวเดียวกันในสองโดเมน (คำนวณโดยแอป)',
            head: ['Z₀ (Ω)', 'Y₀ = 1/Z₀ (S)', 'z_L = Z_L/Z₀', 'Y_L = 1/Z_L (S)', 'y_L = Y_L·Z₀'],
            rows: [50, 75, 300].map((Z0) => [n(Z0, 0), n(1 / Z0, 5), fz(normalize(APP_ZL, Z0), 3), fz(YApp, 4), fz(C(YApp.re * Z0, YApp.im * Z0), 3)]),
            caption: `โหลดเดียวกัน Z_L = ${fz(APP_ZL, 0)} Ω · คอลัมน์สุดท้ายเท่ากับ 1/z_L ของคอลัมน์ที่สามเสมอ · Y_L ไม่ขึ้นกับสาย แต่ y_L ขึ้นกับ Z₀ ที่ใช้ normalize` },
        ],
      },
      {
        id: 'convert', title: 'ตัวอย่างการแปลงด้วยเลขเชิงซ้อน',
        lines: [
          T('ให้ z = 0.5 + j0.5'),
          M('y = \\frac{1}{0.5 + j0.5} = \\frac{0.5 - j0.5}{0.5^2 + 0.5^2} = \\frac{0.5 - j0.5}{0.5}'),
          R(`y = ${tc(admittance(C(0.5, 0.5)), 0)}`),
          T('บนกราฟทำได้เร็วกว่านั้นมาก: ลากเส้นตรงจากจุด z ผ่านศูนย์กลางไปยังอีกด้านหนึ่งของวงกลม SWR จุดที่ได้คือ y ทันที ไม่ต้องวัดระยะทีละสเกล'),
        ],
        figures: [
          { kind: 'smith', title: 'z = 0.5 + j0.5 กับ y = 1 − j1 อยู่ตรงข้ามกันผ่านศูนย์กลาง',
            points: [{ z: C(0.5, 0.5), label: 'z = 0.5 + j0.5', cls: 'load' }, { z: admittance(C(0.5, 0.5)), label: 'y = 1 − j1 (อ่านบนสเกล Z)', cls: 'y' }],
            curves: [{ zs: [C(0.5, 0.5), C(1, 0), admittance(C(0.5, 0.5))], cls: 'mid', dashed: true }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))],
            caption: 'เส้นประคือเส้นผ่านศูนย์กลาง ยาวเท่ากันทั้งสองข้าง เพราะ |Γ| เท่าเดิม' },
          { kind: 'smith', title: 'อีกวิธี: เปิดกราฟ Y (เขียว) ทับกราฟ Z แล้วอ่านค่าจากจุดเดิม', showY: true,
            points: [{ z: C(0.5, 0.5), label: 'จุดเดียวกัน', cls: 'load' }], gCircles: [1], bCircles: [-1],
            caption: 'จุดเดิมอ่านได้ทั้ง z = 0.5 + j0.5 บนสเกล Z และ y = 1 − j1 บนสเกล Y' },
          { kind: 'lab', label: 'ทดลอง: โหลด 25 + j25 Ω แล้วเปิดปุ่ม Y grid', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 25, X: 25 }]]), showY: true },
        ],
      },
      {
        id: 'why180', title: 'ที่มาของการหมุน 180°',
        lines: [
          T('จากบทที่ 2 สายยาว λ/4 ทำให้'),
          M('z_{in} = \\frac{1}{z_L} = y_L'),
          T('และจากบทที่ 6 ระยะ λ/4 คือครึ่งรอบของกราฟ (180°) ดังนั้นการหา y จึงเท่ากับการหมุนจุด z ไป 180° ซึ่งก็คือการลากเส้นผ่านศูนย์กลางไปอีกด้านหนึ่งนั่นเอง'),
          M('\\Gamma_y = \\Gamma_z\\,e^{-j\\pi} = -\\Gamma_z'),
          N('ตรวจได้ง่าย: ถ้า z = 0 (SHORT, Γ = −1) แล้ว y = ∞ (OPEN, Γ = +1) ซึ่งอยู่ตรงข้ามกันพอดี'),
        ],
      },
      {
        id: 'apps', title: 'สรุปการใช้งานสามกลุ่ม',
        lines: [
          T('หนังสือระบุการใช้งาน Smith Chart ที่สำคัญไว้สามกลุ่ม'),
          K('1. คำนวณ admittance จาก impedance (และกลับกัน)\n2. หา impedance หรือ admittance ที่ตำแหน่งใด ๆ บนสาย พร้อมอ่าน SWR\n3. หาความยาวของสายปลายลัดวงจร เพื่อสร้าง reactance หรือ susceptance ตามที่ต้องการ'),
          T('สามหัวข้อถัดไป (7.5, 7.6, 7.7) ทำทีละกลุ่มพร้อมตัวอย่างที่คำนวณครบ'),
          N('ทั้งสามกลุ่มจะถูกใช้ซ้ำในบทที่ 9 (หม้อแปลง λ/4 ใช้กลุ่มที่ 2) และบทที่ 10 (stub matching ใช้ทั้งสามกลุ่มพร้อมกัน) — ขั้นตอนหกข้อของ stub matching ก็คือการเรียงกลุ่ม 1 → 2 → 3 ต่อกัน'),
        ],
      },
      {
        id: 'app1', title: 'การใช้งานที่ 1 — Admittance calculations',
        lines: [
          T('โจทย์แบบนี้คือ "ให้ z มา หา y" หรือกลับกัน ทำได้สองทาง: คิดด้วยเลขเชิงซ้อน หรืออ่านจากกราฟในขั้นตอนเดียว'),
          T('ทางที่หนึ่ง — คิดตรง ๆ ด้วยเลขเชิงซ้อน ใช้ตัวอย่างของหนังสือ z = 0.5 + j0.5'),
          M('y = \\frac{1}{0.5 + j0.5} = \\frac{0.5 - j0.5}{(0.5)^2 + (0.5)^2} = \\frac{0.5 - j0.5}{0.5}'),
          R(`y = ${tc(yApp, 0)} \\qquad (\\text{หนังสือ } 1 - j1)`),
          T('ทางที่สอง — บนกราฟ: ลากเส้นตรงจากจุด z ผ่านศูนย์กลางไปอีกด้านหนึ่งของวงกลม SWR จุดที่ได้คือ y ทันที ไม่ต้องคำนวณ'),
          T('ทำไมจุดตรงข้ามจึงใช้ได้ — สายยาว λ/4 ให้'),
          M('z_{in} = \\frac{Z_0^{2}/Z_L}{Z_0} = \\frac{1}{z_L} = y_L'),
          T('และ λ/4 บนสายคือการหมุน 2βl = 2·(2π/λ)·(λ/4) = π นั่นคือครึ่งรอบพอดี'),
          M('\\Gamma_y = \\Gamma_z\\,e^{-j\\pi} = -\\Gamma_z \\qquad (|\\Gamma| \\text{ เท่าเดิม มุมต่างกัน } 180^\\circ)'),
          T(`ตรวจด้วยสเกลรอบกราฟ (แอปคำนวณให้): จุด z อยู่ที่ ${n(wtgZApp, 4)} λ จุด y อยู่ที่ ${n(wtgYApp, 4)} λ ต่างกัน ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 4)} λ พอดี — คือ λ/4 ตามที่หนังสือบอกว่าสองจุดนี้ห่างกันหนึ่งในสี่ความยาวคลื่น`),
          T('และเพราะทั้งสองจุดอยู่บนวงกลมเดียวกัน SWR จึงไม่เปลี่ยน'),
          R(`|\\Gamma| = ${n(abs(gApp), 4)}, \\qquad SWR = ${n(swrApp, 3)} \\qquad \\text{(ทั้งที่จุด } z \\text{ และจุด } y)`),
          W('กับดักที่พบบ่อยที่สุด: เมื่ออ่านจุดตรงข้ามบนกราฟ Z ตัวเลขที่อ่านได้คือ g กับ b ไม่ใช่ r กับ x · ที่ตำแหน่งนั้นเขียนว่า 1 − j1 ต้องอ่านว่า g = 1, b = −1'),
          N('ทางลัดตรวจคำตอบ: SHORT (z = 0) ต้องได้ y = ∞ (OPEN) และศูนย์กลาง (z = 1) ต้องได้ y = 1 คือจุดเดิม เพราะเป็นจุดเดียวที่อยู่ตรงแกนหมุน'),
        ],
        figures: [
          { kind: 'chart', title: 'การใช้งานที่ 1 บนกราฟตัวเต็ม: z กับ y อยู่คนละด้านของศูนย์กลาง', showY: true, scale: true, fine: false,
            points: [
              { z: zApp, label: `z = ${fz(zApp, 1)}`, cls: 'load' },
              { z: yApp, label: `y = ${fz(yApp, 0)}`, cls: 'y' },
            ],
            curves: [{ zs: [zApp, C(1, 0), yApp], cls: 'mid', dashed: true }],
            swr: [swrApp], gCircles: [1], bCircles: [-1],
            caption: `เส้นประคือเส้นผ่านศูนย์กลาง ยาวเท่ากันทั้งสองข้างเพราะ |Γ| เท่าเดิม · อ่านตัวเลขบนกราฟ Y (เขียว) ที่จุดเดิมก็ได้คำตอบเดียวกัน · ค่าบนสเกลรอบนอกต่างกัน ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 3)} λ` },
          { kind: 'table', title: 'ตรวจการหมุน 180° ด้วยหลายค่า (คำนวณโดยแอป จาก y = 1/z)',
            head: ['z', 'y = 1/z', 'สเกล z (λ)', 'สเกล y (λ)', 'ต่างกัน (λ)', 'SWR'],
            rows: [C(0.5, 0.5), C(1, 1), C(2, 0), C(0.4, -0.8), C(1, 0)].map((z) => {
              const y = admittance(z);
              const a = wtgFromGamma(gammaFromz(z));
              const b = wtgFromGamma(gammaFromz(y));
              return [fz(z, 2), fz(y, 3), n(a, 4), n(b, 4), n(((b - a) % 0.5 + 0.5) % 0.5, 4), n(swrFromGamma(gammaFromz(z)), 3)];
            }),
            caption: 'คอลัมน์ "ต่างกัน" ได้ 0.25 λ ทุกแถว ยกเว้นจุดศูนย์กลาง z = 1 ที่อยู่ตรงแกนหมุนพอดี จึงไม่ขยับ' },
          { kind: 'lab', label: `ทดลอง: โหลด ${fz(APP_ZL, 0)} Ω แล้วเปิดปุ่ม Y grid เพื่ออ่าน g กับ b ที่จุดเดียวกัน`, circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 25, X: 25 }]]), showY: true },
        ],
      },
      {
        id: 'app2', title: 'การใช้งานที่ 2 — อิมพีแดนซ์/แอดมิตแตนซ์ที่ตำแหน่งใด ๆ และค่า SWR',
        lines: [
          T('นี่คือการใช้งานที่ตอบคำถามของบทที่ 2 โดยตรง: "ที่ระยะ d จากโหลด เครื่องมองเห็นอะไร" ขั้นตอนมีสี่ข้อ'),
          K('1. normalize: z_L = Z_L / Z₀ แล้วพล็อตจุด\n2. ลากวงกลม SWR คงที่ผ่านจุดนั้น แล้วอ่าน SWR ที่จุดตัดแกนนอนด้านขวา (ค่านี้ใช้ได้ทุกตำแหน่งบนสาย)\n3. อ่านค่าเริ่มต้นบนสเกล toward generator แล้วบวกระยะ d (ตามเข็ม) ถ้าเกิน 0.5 λ ให้ลบ 0.5 ออก\n4. จุดใหม่บนวงกลม SWR คือคำตอบ: อ่านบนสเกล Z ได้ z และอ่านจุดตรงข้ามได้ y'),
          T(`ตัวอย่าง: สาย ${APP_Z0} Ω โหลด Z_L = ${fz(APP_ZL, 0)} Ω หา Z, Y และ SWR ที่ระยะ ${n(dApp, 2)} λ จากโหลดไปทางแหล่งจ่าย`),
          M(`z_L = \\frac{${tc(APP_ZL, 0)}}{${APP_Z0}} = ${tc(zApp, 1)} \\qquad |\\Gamma| = ${n(abs(gApp), 4)} \\;\\Rightarrow\\; SWR = ${n(swrApp, 3)}`),
          T(`เดินบนสเกล: จุดโหลดอยู่ที่ ${n(wtgZApp, 4)} λ บวก ${n(dApp, 2)} λ`),
          M(`${n(wtgZApp, 4)} + ${n(dApp, 2)} = ${n(wtgFromGamma(gApp2), 4)}\\lambda`),
          T('อ่านค่าที่จุดใหม่ (แอปคำนวณจากสมการสายส่งเดียวกัน)'),
          M(`z = ${tc(zApp2, 3)} \\;\\Rightarrow\\; Z = z\\,Z_0 = ${tc(ZApp2, 1)}\\,\\Omega`),
          T('อ่านจุดตรงข้ามบนวงกลมเดียวกัน (การใช้งานที่ 1) จะได้แอดมิตแตนซ์ที่ตำแหน่งเดียวกัน'),
          M(`y = \\frac{1}{z} = ${tc(yApp2, 3)} \\;\\Rightarrow\\; Y = \\frac{y}{Z_0} = ${tc(C(YApp2.re * 1000, YApp2.im * 1000), 3)}\\ \\text{mS}`),
          R(`SWR = ${n(swrFromGamma(gApp2), 3)} \\qquad \\text{(เท่ากับที่โหลด — ไม่เปลี่ยนตามตำแหน่ง)}`),
          T('สังเกตว่าอิมพีแดนซ์เปลี่ยนไปมาก แต่ SWR ตัวเดียวใช้ได้ทั้งสาย — นี่คือเหตุผลที่ SWR meter วัดตำแหน่งไหนก็ได้ค่าเดียวกัน ถ้าสายไร้การสูญเสีย'),
          N('ถ้าโจทย์ให้ระยะไปทางโหลดแทน ให้ลบแทนบวกในขั้นที่ 3 ที่เหลือเหมือนเดิมทุกอย่าง'),
        ],
        figures: [
          { kind: 'chart', title: `การใช้งานที่ 2 บนกราฟตัวเต็ม: เดินจาก z_L ไป ${n(dApp, 2)} λ แล้วอ่านทั้ง z และ y`, showY: true, scale: true, fine: false,
            points: [
              { z: zApp, label: `z_L (สเกล ${n(wtgZApp, 3)}λ)`, cls: 'load' },
              { z: zApp2, label: `z ที่ ${n(dApp, 2)}λ`, cls: 'in' },
              { z: yApp2, label: 'y (จุดตรงข้าม)', cls: 'y' },
            ],
            curves: [
              { zs: swrPath(zApp, dApp), cls: 'net', arrow: true },
              { zs: [zApp2, C(1, 0), yApp2], cls: 'mid', dashed: true },
            ],
            swr: [swrApp],
            caption: 'เส้นทึบ = เดินตามเข็มบนวงกลม SWR · เส้นประ = หมุนอีก 180° เพื่ออ่าน y ที่ตำแหน่งเดียวกัน · สเกลรอบนอกคือค่าที่ใช้บวกระยะในขั้นที่ 3' },
          { kind: 'table', title: `Z, Y และ SWR ที่ตำแหน่งต่าง ๆ บนสาย ${APP_Z0} Ω ที่มีโหลด ${fz(APP_ZL, 0)} Ω (คำนวณโดยแอป)`,
            head: ['d (λ)', 'สเกล toward generator', 'z', 'Z (Ω)', 'y', 'Y (mS)', 'SWR'],
            rows: APP2_DS.map((d) => {
              const Z = lineInput(APP_ZL, APP_Z0, d, 0);
              const z = normalize(Z, APP_Z0);
              const y = admittance(z);
              const Y = admittance(Z);
              return [n(d, 2), `${n(wtgFromGamma(rotateTowardGenerator(gApp, d)), 4)} λ`, fz(z, 3), fz(Z, 1), fz(y, 3), fz(C(Y.re * 1000, Y.im * 1000), 3), n(swrFromGamma(gammaFromZ(Z, APP_Z0)), 3)];
            }),
            caption: 'คอลัมน์ SWR คงที่ทุกแถว · แถว 0.25 λ ให้ z เท่ากับ y_L ของแถวแรกพอดี ตามสมบัติ λ/4 · แถว 0.5 λ กลับมาเท่าโหลดเดิม' },
          { kind: 'lab', label: `ทดลอง: โหลด ${fz(APP_ZL, 0)} Ω ผ่านสาย ${n(dApp, 2)} λ แล้วเลื่อน Probe ดูค่าที่ตำแหน่งอื่น`,
            circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.15, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 25, X: 25 }]]), showY: true },
        ],
      },
      {
        id: 'app3', title: 'การใช้งานที่ 3 — ความยาวสายปลายลัดที่ให้ reactance/susceptance ที่ต้องการ',
        lines: [
          T('กลุ่มที่สามใช้กราฟกลับทาง: แทนที่จะให้ความยาวมาแล้วหาค่า เราให้ค่าที่ต้องการมาแล้วหาความยาว'),
          T('สายปลายลัดมีคลื่นสะท้อนเต็มที่ (|Γ| = 1) จุดจึงวิ่งอยู่บนขอบกราฟเสมอ อิมพีแดนซ์ที่มองเห็นจึงเป็นรีแอกแตนซ์ล้วน ไม่มีส่วนจริง'),
          M('Z_{in} = jZ_0\\tan\\beta l \\;\\Rightarrow\\; X = Z_0\\tan\\beta l, \\qquad \\beta l = 360^\\circ \\times \\frac{l}{\\lambda}'),
          T('และในโดเมนแอดมิตแตนซ์ ซึ่งเป็นโดเมนที่ใช้จริงเมื่อสตับต่อขนาน'),
          M('y_{in} = \\frac{1}{jx} = -j\\cot\\beta l \\;\\Rightarrow\\; b = -\\cot\\beta l'),
          T('การอ่านย้อนกลับ — ถ้าโจทย์ให้รีแอกแตนซ์ที่ต้องการมา ให้แก้สมการเดิมหา l'),
          M('l = \\frac{\\lambda}{2\\pi}\\arctan\\!\\left(\\frac{X}{Z_0}\\right) \\qquad \\text{(บวก } 0.5\\lambda \\text{ ถ้าได้ค่าติดลบ)}'),
          T(`ตัวอย่าง: ต้องการ X = +${n(APP3_XWANT, 0)} Ω จากสายปลายลัด ${APP3_Z0} Ω`),
          M(`x = \\frac{${n(APP3_XWANT, 0)}}{${APP3_Z0}} = ${n(APP3_XWANT / APP3_Z0, 2)} \\;\\Rightarrow\\; \\beta l = \\arctan(${n(APP3_XWANT / APP3_Z0, 2)}) = ${n(360 * APP3_lw, 2)}^\\circ`),
          R(`l = \\frac{${n(360 * APP3_lw, 2)}^\\circ}{360^\\circ}\\lambda = ${n(APP3_lw, 4)}\\lambda`),
          T(`ตรวจย้อนกลับด้วยเอนจินของแอป: สายปลายลัด ${APP3_Z0} Ω ยาว ${n(APP3_lw, 4)} λ ให้ X = ${n(stubInput('short', APP3_Z0, APP3_lw).im, 2)} Ω ตรงตามที่ต้องการ`),
          T(`แปลงเป็นความยาวจริงต้องรู้ความถี่: ที่ ${n(APP3_F / 1e6, 0)} MHz ในสายฉนวนอากาศ`),
          M(`\\lambda = \\frac{c}{f} = ${n(APP3_LAM, 3)}\\ \\text{m} \\;\\Rightarrow\\; l = ${n(APP3_lw, 4)} \\times ${n(APP3_LAM, 3)} = ${n(APP3_lw * APP3_LAM * 100, 1)}\\ \\text{cm}`),
          W('ถ้าสายมี velocity factor (เช่น RG-58 มี vf ≈ 0.66) ต้องใช้ λ = vf·c/f ความยาวจริงจะสั้นลงตามสัดส่วนนั้น'),
          N('หนังสือพูดถึงสายปลายลัดเป็นหลัก เพราะปลายเปิดมีแนวโน้มแผ่คลื่นออกไป (หัวข้อ 8.2) · สายปลายเปิดใช้สูตรเดียวกันแต่เลื่อนไป 0.25 λ คือ X = −Z₀ cot βl'),
        ],
        figures: [
          { kind: 'table', title: `สายปลายลัด ${APP3_Z0} Ω ให้ค่าอะไรบ้าง (คำนวณโดยแอป จาก X = Z₀ tan βl)`,
            head: ['l (λ)', 'βl', 'X (Ω)', 'x = X/Z₀', 'b = −1/x', 'ลักษณะ'],
            rows: APP3_LS.map((l) => {
              const Zs = stubInput('short', APP3_Z0, l);
              const x = isFiniteC(Zs) ? Zs.im / APP3_Z0 : Infinity;
              const kind = !isFiniteC(Zs) ? 'resonance (เหมือน LC ขนาน)' : Zs.im > 0 ? 'inductive' : 'capacitive';
              return [n(l, 3), `${n(360 * l, 0)}°`, isFiniteC(Zs) ? n(Zs.im, 1) : '∞', Number.isFinite(x) ? n(x, 3) : '∞', Number.isFinite(x) ? n(-1 / x, 3) : '0.000', kind];
            }),
            caption: 'สั้นกว่า 0.25 λ ได้ inductive · ยาวกว่านั้นได้ capacitive · ที่ 0.25 λ พอดี X → ∞ และ b = 0 · ค่าซ้ำทุก 0.5 λ' },
          { kind: 'table', title: `กลับทาง: อยากได้ x เท่านี้ ต้องตัดสายปลายลัดยาวเท่าไร (${APP3_Z0} Ω, คำนวณโดยแอป)`,
            head: ['x ที่ต้องการ', 'X = x·Z₀ (Ω)', 'l (λ)', 'ตรวจย้อน: X ที่ได้จริง (Ω)'],
            rows: APP3_XS.map((x) => {
              const l = shortLenForX(x);
              return [n(x, 2), n(x * APP3_Z0, 1), n(l, 4), n(stubInput('short', APP3_Z0, l).im, 1)];
            }),
            caption: 'คอลัมน์สุดท้ายต้องเท่ากับคอลัมน์ที่สองเสมอ ใช้เป็นวิธีตรวจคำตอบ · ค่า x ติดลบต้องใช้สายยาวกว่า 0.25 λ' },
          { kind: 'chart', title: 'บนกราฟตัวเต็ม: เริ่มที่ SHORT แล้วเดินไปตามขอบ (|Γ| = 1) จนถึงค่าที่ต้องการ', scale: true, fine: false,
            points: [
              { z: C(0, 0), label: 'SHORT (l = 0)', cls: 'stub' },
              { z: C(0, APP3_XWANT / APP3_Z0), label: `x = +${n(APP3_XWANT / APP3_Z0, 2)} ที่ l = ${n(APP3_lw, 3)}λ`, cls: 'in' },
              { z: C(0, 1), label: 'x = +1 ที่ l = 0.125λ', cls: 'mid' },
            ],
            curves: [{ zs: linspace(0.0005, APP3_lw, 40).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'stub', arrow: true }],
            xCircles: [APP3_XWANT / APP3_Z0],
            caption: `บนสเกล wavelengths toward generator จุด SHORT อยู่ที่ ${n(wtgShort, 3)} λ พอดี (จุด OPEN อยู่ที่ ${n(wtgOpen, 3)} λ) ค่าที่อ่านได้บนสเกลจึงคือความยาวสตับโดยตรง` },
          { kind: 'lab', label: `ทดลอง: สายปลายลัด ${APP3_Z0} Ω ยาว ${n(APP3_lw, 3)} λ ควรให้ X ≈ +${n(APP3_XWANT, 0)} Ω`,
            circuit: () => buildCircuit(500e6, 50, [['stub_short', 'shunt', { Z0: 50, len: Number(APP3_lw.toFixed(4)) }]]), note: 'ปรับความยาวแล้วดูจุดวิ่งไปตามขอบกราฟ · ค่าที่อ่านได้ควรตรงกับตารางด้านบน' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b7', num: '8', title: 'สายส่งใช้แทน L และ C ได้', titleTh: 'ที่มาของสตับ',
    intro: 'ที่ความถี่สูง การใช้ตัวเหนี่ยวนำหรือตัวเก็บประจุจริงทำได้ยาก แต่สายส่งสั้น ๆ ที่ปลายลัดวงจรหรือปลายเปิดให้รีแอกแตนซ์ได้เหมือนกัน นี่คือที่มาของ stub',
    sections: [
      {
        id: 'shortopen', title: 'สายปลายลัดและปลายเปิดให้รีแอกแตนซ์อะไร',
        lines: [
          T('แทน Z_L = 0 (ลัดวงจร) และ Z_L = ∞ (ปลายเปิด) ลงในสมการสายส่งจะได้'),
          M('\\text{ปลายลัด: } Z_{in} = jZ_0\\tan\\beta l \\qquad \\text{ปลายเปิด: } Z_{in} = -jZ_0\\cot\\beta l'),
          T('ผลคือ'),
          M('l < \\frac{\\lambda}{4}: \\quad \\text{ปลายลัด} \\to \\text{inductive}, \\qquad \\text{ปลายเปิด} \\to \\text{capacitive}'),
          T('และที่ l = λ/4 พอดี ปลายลัดให้ Z_in = ∞ (เหมือนวงจร LC ขนานที่ resonance) ส่วนปลายเปิดให้ Z_in = 0'),
          N('สายส่งสั้น ๆ จึงใช้แทนวงจร LC ที่ความถี่สูงได้ โดยไม่ต้องใช้ชิ้นส่วนจริง'),
        ],
        figures: [
          { kind: 'plot', title: 'รีแอกแตนซ์ของสายปลายลัด X = Z₀ tan βl (Z₀ = 50 Ω)', xLabel: 'ความยาว (λ)', yLabel: 'X (Ω)', xMin: 0, xMax: 0.5, yMin: -300, yMax: 300,
            series: [{ name: 'ปลายลัด', points: linspace(0.001, 0.499, 200).map((l) => [l, 50 * Math.tan(2 * Math.PI * l)] as [number, number]) }],
            xTicks: [0, 0.125, 0.25, 0.375, 0.5], yTicks: [-300, -150, 0, 150, 300],
            caption: 'สั้นกว่า λ/4 เป็นบวก (inductive) · ยาวกว่า λ/4 เป็นลบ (capacitive) · ที่ λ/4 พอดี ค่าพุ่งเป็นอนันต์' },
          { kind: 'plot', title: 'รีแอกแตนซ์ของสายปลายเปิด X = −Z₀ cot βl (Z₀ = 50 Ω)', xLabel: 'ความยาว (λ)', yLabel: 'X (Ω)', xMin: 0, xMax: 0.5, yMin: -300, yMax: 300,
            series: [{ name: 'ปลายเปิด', color: '#dc2626', points: linspace(0.001, 0.499, 200).map((l) => [l, -50 / Math.tan(2 * Math.PI * l)] as [number, number]) }],
            xTicks: [0, 0.125, 0.25, 0.375, 0.5], yTicks: [-300, -150, 0, 150, 300],
            caption: 'ตรงข้ามกับปลายลัดทุกประการ และเลื่อนไปครึ่งหนึ่งของภาพที่แล้ว (0.25 λ)' },
          { kind: 'lab', label: 'ทดลอง: สายปลายลัด 50 Ω ยาว 0.15 λ', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.15, vf: 0.66, lossDb: 0 }]]), note: 'ปรับความยาวแล้วดูจุดวิ่งไปตามขอบกราฟ' },
        ],
      },
      {
        id: 'stub', title: 'stub คืออะไร และทำไมนิยมปลายลัด',
        lines: [
          T('stub คือสายส่งสั้น ๆ ที่ต่อเข้ากับสายหลักเพื่อสร้าง reactance หรือ susceptance ตามต้องการ'),
          T('ส่วนใหญ่ใช้แบบปลายลัดวงจร (short-circuited stub) มากกว่าปลายเปิด เพราะปลายเปิดมีแนวโน้มจะแผ่คลื่นออกไป (radiate) ทำให้เกิดการสูญเสียและรบกวนระบบ'),
          N('ปลายลัดยังปรับความยาวได้ง่ายกว่าในทางปฏิบัติ เพราะเลื่อนตัวลัดวงจรได้'),
        ],
      },
      {
        id: 'ex-stub', title: 'ตัวอย่าง: หาความยาวสตับที่ 150 MHz',
        lines: [
          T('โจทย์จากหนังสือ: โหลดมีแอดมิตแตนซ์ Y_L = 0.004 − j0.002 S สายมี Y₀ = 0.0033 S ที่ความถี่ 150 MHz ใช้ฉนวนอากาศ'),
          T('ขั้นที่ 1 — normalize แอดมิตแตนซ์'),
          M(`y_L = \\frac{Y_L}{Y_0} = \\frac{0.004 - j0.002}{0.0033} = ${tc(C(0.004 / 0.0033, -0.002 / 0.0033), 2)}`),
          T('ขั้นที่ 2 — โหลดมี susceptance เป็น −j0.61 จึงต้องสร้าง +j0.61 มาหักล้าง'),
          M('b_{stub} = +0.61'),
          T('ขั้นที่ 3 — หาความยาวสตับปลายลัดที่ให้ค่านี้'),
          M('y_{stub} = -j\\cot\\beta l = +j0.61 \\;\\Rightarrow\\; \\cot\\beta l = -0.61'),
          R(`l = ${n((() => { let l = Math.atan(-1 / (0.002 / 0.0033 / (1))) / (2 * Math.PI); return ((l % 0.5) + 0.5) % 0.5; })(), 3)}\\lambda \\qquad (\\text{หนังสือ } 0.337\\lambda)`),
          T('ขั้นที่ 4 — แปลงเป็นความยาวจริง เพราะเป็นฉนวนอากาศ'),
          M('\\lambda = \\frac{c}{f} = \\frac{3\\times10^{8}}{150\\times10^{6}} = 2\\ \\text{m}'),
          R(`l = 0.337 \\times 2 \\approx 0.674\\ \\text{m} \\approx 67.4\\ \\text{cm}`),
        ],
        figures: [
          { kind: 'smith', title: 'หาความยาวสตับ: เริ่มจากจุด SHORT แล้วเดินตามขอบกราฟจนถึง b ที่ต้องการ', showY: true,
            points: [{ z: C(0, 0), label: 'SHORT (y = ∞)', cls: 'stub' }, { z: admittance(C(0, 0.61)), label: 'b = +0.61', cls: 'y' }],
            curves: [{ zs: linspace(0.001, 0.337, 40).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'stub', arrow: true }],
            caption: 'สตับปลายลัดเริ่มที่ SHORT เสมอ แล้วเดินไปทาง generator ตามขอบกราฟ (|Γ| = 1)' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b8', num: '9', title: 'หม้อแปลง λ/4 ทีละขั้น', titleTh: 'Quarter-wave transformer และ Example 7-7',
    intro: 'หม้อแปลงหนึ่งในสี่ความยาวคลื่นคือสายส่งยาว λ/4 ที่เลือก Z_T ให้เหมาะสม ใช้แปลงอิมพีแดนซ์ได้ในขั้นตอนเดียว แต่มีเงื่อนไขสำคัญคือโหลดต้องเป็นความต้านทานล้วน',
    sections: [
      {
        id: 'principle', title: 'หลักการและที่มาของสูตร',
        lines: [
          T('จากสมการสายส่ง เมื่อ l = λ/4 จะได้ βl = 90° และ tan βl → ∞ สมการจึงลดรูปเหลือ'),
          M('Z_{in} = \\lim_{\\tan\\beta l \\to \\infty} Z_T\\,\\frac{Z_L + jZ_T\\tan\\beta l}{Z_T + jZ_L\\tan\\beta l} = \\frac{Z_T^{2}}{Z_L}'),
          T('ถ้าต้องการให้ต้นสายเห็น Z₀ พอดี ก็ตั้ง Z_in = Z₀'),
          M('\\frac{Z_T^{2}}{Z_L} = Z_0 \\;\\Rightarrow\\; \\boxed{Z_T = \\sqrt{Z_0 Z_L}}'),
          N('สูตรนี้ต้องการ Z_L ที่เป็นจำนวนจริง เพราะรากที่สองของจำนวนเชิงซ้อนไม่ได้ให้สายส่งที่สร้างได้จริง'),
        ],
        figures: [
          { kind: 'smith', title: 'ผลของสาย λ/4: จุดหมุนครึ่งรอบ (z → 1/z)',
            points: [{ z: C(2, 0), label: 'z_L = 2', cls: 'load' }, { z: C(0.5, 0), label: '1/z = 0.5', cls: 'in' }],
            curves: [{ zs: swrPath(C(2, 0), 0.25), cls: 'net', arrow: true }], swr: [2],
            caption: 'บนกราฟที่ normalize ด้วย Z₀ ของสาย λ/4 เอง การเดิน λ/4 คือการกลับส่วน' },
          { kind: 'lab', label: 'ทดลอง: โหลด 100 Ω กับหม้อแปลง λ/4 ที่ Z_t = 70.7 Ω', circuit: () => buildCircuit(100e6, 50, [['qwt', 'series', { Zt: 70.71 }], ['resistor', 'series', { R: 100 }]]) },
        ],
      },
      {
        id: 'complex', title: 'ปัญหาเมื่อโหลดเป็นจำนวนเชิงซ้อน',
        lines: [
          T('ถ้า Z_L = R + jX เราต่อหม้อแปลงที่โหลดโดยตรงไม่ได้ เพราะสูตรต้องการความต้านทานล้วน'),
          T('ทางแก้คือใช้สายส่งธรรมดา (Z₀ เดิม) เดินจากโหลดไปทางแหล่งจ่ายก่อน จนถึงตำแหน่งที่อิมพีแดนซ์เป็นความต้านทานล้วน (x = 0) แล้วค่อยต่อหม้อแปลงที่จุดนั้น'),
          K('โหลด Z_L ──[ สาย Z₀ ยาว d ]──┤ x = 0 ที่นี่ ├──[ λ/4, Z_T ]── ไปยังแหล่งจ่าย'),
          T('การหาตำแหน่ง x = 0 ก็คือการใช้งานกลุ่มที่ 2 (หัวข้อ 7.6): เดินตามวงกลม SWR จนตัดแกนนอน · วงกลม SWR ตัดแกนนอนสองจุดเสมอ จึงมีคำตอบสองชุด'),
          M('\\text{จุดขวา}: r = SWR \\;\\Rightarrow\\; R\' = SWR \\times Z_0, \\qquad \\text{จุดซ้าย}: r = \\frac{1}{SWR} \\;\\Rightarrow\\; R\' = \\frac{Z_0}{SWR}'),
          N('ตำแหน่ง x = 0 หาได้ง่ายมากบน Smith Chart — นี่คือเหตุผลที่บทที่ 2 บอกว่าการหาจุดนี้ด้วยการคำนวณอย่างเดียวทำได้ยาก · หัวข้อ 9.3 ทำให้ดูทั้งสองจุด'),
        ],
        figures: [
          { kind: 'chart', title: 'ตามแนวคิด Fig. 7-13: เดินจากโหลดเชิงซ้อนจนถึงจุดความต้านทานล้วน แล้วจึงต่อหม้อแปลง λ/4',
            scale: true, fine: false,
            points: [
              { z: z77, label: `z_L = ${fz(z77, 2)}`, cls: 'load' },
              { z: C(swr77, 0), label: `จุดขวา r = ${n(swr77, 2)}`, cls: 'in' },
              { z: C(1 / swr77, 0), label: `จุดซ้าย r = ${n(1 / swr77, 2)}`, cls: 'mid' },
            ],
            curves: [{ zs: swrPath(z77, 0.5), cls: 'net', arrow: true }],
            swr: [swr77], xCircles: [0],
            caption: 'สร้างใหม่ตามแนวคิด Fig. 7-13 ด้วยค่าที่แอปคำนวณเอง ไม่ใช่ภาพจากหนังสือ · เส้นแนวนอนคือ x = 0 ซึ่งวงกลม SWR ตัดสองจุด — ทั้งสองจุดใช้ต่อหม้อแปลง λ/4 ได้' },
        ],
      },
      {
        id: 'ex77', title: 'Example 7-7 ทีละขั้น',
        lines: [
          T('โจทย์: Z_L = 100 − j50 Ω บนสาย Z₀ = 75 Ω · หาตำแหน่งที่ใกล้โหลดที่สุดที่ใส่หม้อแปลง λ/4 ได้ และหาค่า Z_T'),
          T('ขั้นที่ 1 — normalize'),
          M(`z_L = \\frac{100 - j50}{75} = ${tc(z77, 3)}`),
          T('ขั้นที่ 2 — พล็อตจุดแล้วลากวงกลม SWR คงที่'),
          M(`SWR = ${n(swr77, 3)}`),
          T('ขั้นที่ 3 — เดินไปทางแหล่งจ่าย (ตามเข็ม) จนวงกลมตัดแกน x = 0 จุดแรก'),
          M(`d = ${n(ex77.dLambda, 3)}\\lambda \\qquad (\\text{หนังสือ } 0.184\\lambda)`),
          T('ขั้นที่ 4 — อ่านค่าความต้านทานปกติที่จุดนั้น แล้วคูณ Z₀ กลับ'),
          M(`r = ${n(ex77.Rreal / 75, 3)} \\;\\Rightarrow\\; R' = ${n(ex77.Rreal / 75, 3)} \\times 75 = ${n(ex77.Rreal, 1)}\\,\\Omega \\qquad (\\text{หนังสือ } 39.8\\,\\Omega)`),
          T('ขั้นที่ 5 — ออกแบบหม้อแปลง'),
          R(`Z_T = \\sqrt{Z_0 R'} = \\sqrt{75 \\times ${n(ex77.Rreal, 1)}} = ${n(ex77.Zt, 1)}\\,\\Omega \\qquad (\\text{หนังสือ } 54.5\\,\\Omega)`),
          N(`มีอีกคำตอบหนึ่งที่ไกลกว่า: เดินต่อไปจนตัดแกนอีกด้าน จะได้ d = ${n(solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => b.dLambda - a.dLambda)[0].dLambda, 3)} λ, R' = ${n(solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => b.dLambda - a.dLambda)[0].Rreal, 1)} Ω, Z_T = ${n(solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => b.dLambda - a.dLambda)[0].Zt, 1)} Ω · โจทย์ถามจุดที่ใกล้โหลดที่สุดจึงใช้ค่าแรก`),
        ],
        figures: [
          { kind: 'smith', title: 'ขั้นที่ 1–3: พล็อต z_L แล้วเดินตามวงกลม SWR จนถึงแกน x = 0',
            points: [{ z: z77, label: `z_L = ${fz(z77, 2)}`, cls: 'load' }, { z: C(ex77.Rreal / 75, 0), label: `r = ${n(ex77.Rreal / 75, 2)} ที่ ${n(ex77.dLambda, 3)}λ`, cls: 'in' }],
            curves: [{ zs: swrPath(z77, ex77.dLambda), cls: 'net', arrow: true }],
            swr: [swr77], xCircles: [0],
            caption: 'จุดสีเขียวคือ purely resistive point ที่จะใส่หม้อแปลง' },
          { kind: 'circuit', title: 'วงจรที่ได้: สาย 75 Ω ยาว 0.184 λ แล้วต่อหม้อแปลง λ/4 ที่ 54.6 Ω',
            circuit: buildCircuit(100e6, 75, [['qwt', 'series', { Zt: Number(ex77.Zt.toFixed(2)) }], ['tline', 'series', { Z0: 75, len: Number(ex77.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
          { kind: 'lab', label: 'Lab: Example 7-7 ครบวงจร (กด Explain ดูทีละขั้น)',
            circuit: () => buildCircuit(100e6, 75, [['qwt', 'series', { Zt: Number(ex77.Zt.toFixed(2)) }], ['tline', 'series', { Z0: 75, len: Number(ex77.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
          { kind: 'lab', label: 'Lab: เฉพาะโหลด 100 − j50 Ω บนระบบ 75 Ω (ลองเดินเองด้วย Probe)',
            circuit: () => buildCircuit(100e6, 75, [['tline', 'series', { Z0: 75, len: 0.184, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
        ],
      },
      {
        id: 'pattern77', title: 'รูปแบบของโจทย์หม้อแปลง λ/4',
        lines: [
          K('Z_L, Z₀\n   ↓ normalize\nz_L\n   ↓ plot + วงกลม SWR\n   ↓ เดิน toward generator จนถึง x = 0\nอ่าน r แล้วคูณ Z₀ → R′\n   ↓\nZ_T = √(Z₀ · R′)'),
          N('ถ้าโหลดเป็นความต้านทานล้วนอยู่แล้ว ข้ามขั้นเดินสายได้เลย ใช้ Z_T = √(Z₀ R_L) ทันที'),
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b9', num: '10', title: 'Single stub matching ทีละขั้น', titleTh: 'ขั้นตอนหกข้อ และ Example 7-8',
    intro: 'สตับต่อขนานกับสายหลัก จึงต้องทำงานในโดเมนแอดมิตแตนซ์ บทนี้อธิบายเป้าหมาย เหตุผลของทุกขั้นตอน แล้วทำ Example 7-8 ให้ครบ',
    sections: [
      {
        id: 'goal', title: 'เป้าหมายของ stub matching',
        lines: [
          T('เพราะสตับต่อขนาน แอดมิตแตนซ์จึงบวกกันตรง ๆ'),
          M('y_{total} = y_{line} + y_{stub}'),
          T('ถ้าเราเลือกตำแหน่งที่สายมี y = 1 + jb แล้วใส่สตับที่ให้ y_stub = −jb จะได้'),
          M('y_{total} = (1 + jb) + (-jb) = 1'),
          R('y = 1 \\;\\Rightarrow\\; Y = Y_0 \\;\\Rightarrow\\; Z = Z_0 \\;\\Rightarrow\\; SWR = 1'),
          T('นี่คือแก่นทั้งหมดของ single-stub matching'),
        ],
      },
      {
        id: 'whyg1', title: 'ทำไมต้องหาจุดที่ g = 1',
        lines: [
          T('สตับเป็น pure susceptance มันเปลี่ยนได้เฉพาะส่วน jb เท่านั้น เปลี่ยน g ไม่ได้เลย'),
          T('สมมติเลือกจุดผิดที่ y = 0.5 + j1 แล้วใส่สตับ −j1'),
          M('y_{total} = 0.5 + j1 - j1 = 0.5 \\neq 1 \\;\\Rightarrow\\; \\text{ยังไม่แมตช์}'),
          T('แต่ถ้าเลือกจุดที่ y = 1 + j1 แล้วใส่สตับ −j1'),
          M('y_{total} = 1 + j1 - j1 = 1 \\;\\Rightarrow\\; \\text{แมตช์}'),
          N('เราจึงไม่ได้หาวงกลม g = 1 โดยบังเอิญ แต่เพราะมันเป็นเส้นเดียวที่สตับจะพาเราเข้าศูนย์กลางได้'),
        ],
        figures: [
          { kind: 'smith', title: 'วงกลม g = 1 (เขียว) คือเส้นเป้าหมายก่อนใส่สตับ', showY: true, gCircles: [1],
            points: [{ z: admittance(C(1, 1)), label: 'y = 1 + j1 → ใส่สตับได้', cls: 'y' }, { z: admittance(C(0.5, 1)), label: 'y = 0.5 + j1 → ยังไม่ได้', cls: 'mid' }],
            caption: 'ใส่สตับที่จุดบนวงกลม g = 1 เท่านั้นจึงจะถึงศูนย์กลาง' },
        ],
      },
      {
        id: 'procedure', title: 'ขั้นตอนหกข้อ',
        lines: [
          K('1. normalize โหลด z_L = Z_L / Z₀ แล้วพล็อตจุด\n2. แปลงเป็นแอดมิตแตนซ์ y_L (หมุน 180° ผ่านศูนย์กลาง)\n3. เดินตามวงกลม SWR ไปทาง generator จนตัดวงกลม g = 1 → ได้ y = 1 ± jb และได้ระยะ d\n4. เริ่มหาความยาวสตับจากจุด SHORT บนขอบกราฟ\n5. หาค่า susceptance ที่ตรงข้าม: ถ้าสายมี +jb สตับต้องเป็น −jb\n6. อ่านระยะบนสเกลจากจุด SHORT ถึงจุดนั้น = ความยาวสตับ l_s'),
          N('ขั้นที่ 3 มีสองคำตอบเสมอ (วงกลม SWR ตัดวงกลม g = 1 สองจุด) เลือกจุดที่ใกล้โหลดกว่าเพื่อให้ bandwidth กว้างกว่า'),
        ],
      },
      {
        id: 'ex78', title: 'Example 7-8 ทีละขั้น',
        lines: [
          T('โจทย์: Z_L = 450 − j600 Ω บนสาย Z₀ = 300 Ω · หาตำแหน่งและความยาวของสตับปลายลัด'),
          T('ขั้นที่ 1 — normalize และพล็อต'),
          M(`z_L = \\frac{450 - j600}{300} = ${tc(z78, 1)} \\qquad SWR = ${n(swr78, 2)} \\quad (\\text{หนังสือ } 4.6)`),
          T('ขั้นที่ 2 — แปลงเป็นแอดมิตแตนซ์ (หมุน 180° หรืออ่านอีกด้านของวงกลม SWR)'),
          M(`y_L = \\frac{1}{z_L} = ${tc(y78, 2)} \\qquad (\\text{หนังสือ } 0.24 + j0.32)`),
          T('ขั้นที่ 3 — เดินไปทาง generator จนถึงวงกลม g = 1'),
          M(`y = ${tc(ex78.yAtStub, 2)} \\qquad (\\text{หนังสือ } 1 + j1.7)`),
          T(`อ่านระยะจากสเกล wavelengths toward generator: จุด y_L อยู่ที่ ${n(wtg78y, 4)} λ ส่วนจุดที่ g = 1 อยู่ที่ ${n(wtg78g1, 4)} λ (จุด z_L เองอยู่ที่ ${n(wtg78, 4)} λ ซึ่งห่างจาก y_L ครึ่งรอบพอดี)`),
          M(`d = ${n(wtg78g1, 4)} - ${n(wtg78y, 4)} = ${n(ex78.dLambda, 4)}\\lambda \\qquad (\\text{หนังสือ } 0.130\\lambda)`),
          T('ขั้นที่ 4–6 — สตับต้องหักล้าง susceptance ที่เหลือ'),
          M(`b_{stub} = ${n(ex78.bStub, 2)} \\qquad (\\text{หนังสือ } -1.7)`),
          T(`เริ่มจากจุด SHORT ซึ่งอยู่ที่สเกล ${n(wtgShort, 3)} λ พอดี (จุด OPEN อยู่ที่ ${n(wtgOpen, 3)} λ) เดินตามขอบกราฟไปทาง generator จนถึงค่า b นี้`),
          R(`l_s = ${n(ex78.lLambda, 4)}\\lambda - ${n(wtgShort, 3)}\\lambda = ${n(ex78.lLambda, 4)}\\lambda \\qquad (\\text{หนังสือ } 0.085\\lambda)`),
          T('สรุปคำตอบ'),
          R(`d = ${n(ex78.dLambda, 3)}\\lambda, \\qquad l_s = ${n(ex78.lLambda, 3)}\\lambda`),
        ],
        figures: [
          { kind: 'smith', title: 'ขั้นที่ 1–2: จาก z_L ไปเป็น y_L (หมุน 180°)',
            points: [{ z: z78, label: `z_L = ${fz(z78, 1)}`, cls: 'load' }, { z: y78, label: `y_L = ${fz(y78, 2)}`, cls: 'y' }],
            curves: [{ zs: [z78, C(1, 0), y78], cls: 'mid', dashed: true }], swr: [swr78] },
          { kind: 'smith', title: 'ขั้นที่ 3: เดินจาก y_L ไปทาง generator จนถึงวงกลม g = 1', showY: true, gCircles: [1],
            points: [{ z: y78, label: 'y_L', cls: 'y' }, { z: admittance(ex78.yAtStub), label: `y = ${fz(ex78.yAtStub, 2)} ที่ ${n(ex78.dLambda, 3)}λ`, cls: 'in' }],
            curves: [{ zs: swrPath(y78, ex78.dLambda), cls: 'net', arrow: true }], swr: [swr78],
            caption: 'จุดสีเขียวคือตำแหน่งที่จะติดสตับ' },
          { kind: 'smith', title: 'ขั้นที่ 4–6: หาความยาวสตับจากจุด SHORT', showY: true,
            points: [{ z: C(0, 0), label: 'SHORT', cls: 'stub' }, { z: admittance(C(0, ex78.bStub)), label: `b = ${n(ex78.bStub, 2)} → l = ${n(ex78.lLambda, 3)}λ`, cls: 'stub' }],
            curves: [{ zs: linspace(0.001, ex78.lLambda, 30).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'stub', arrow: true }],
            bCircles: [ex78.bStub] },
          { kind: 'smith', title: 'ผลรวม: ใส่สตับแล้วจุดเข้าศูนย์กลาง', showY: true, gCircles: [1],
            points: [{ z: admittance(ex78.yAtStub), label: 'ก่อนใส่สตับ', cls: 'mid' }, { z: C(1, 0), label: 'หลังใส่สตับ → แมตช์', cls: 'in' }],
            curves: [{ zs: shuntPath(admittance(ex78.yAtStub), ex78.bStub), cls: 'y', arrow: true }] },
          { kind: 'circuit', title: 'วงจรที่ได้', circuit: buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex78.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex78.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 450, X: -600 }]]) },
          { kind: 'lab', label: 'Lab: Example 7-8 ครบวงจร', circuit: () => buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex78.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex78.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 450, X: -600 }]]), showY: true },
        ],
      },
      {
        id: 'after', title: 'ทำไมหลังสตับจึงได้ SWR = 1',
        lines: [
          T('ช่วงระหว่างโหลดกับสตับยังไม่แมตช์ จึงยังมีคลื่นนิ่งอยู่ในช่วงนั้น (ยาว d = 0.130 λ)'),
          T('แต่ที่ตำแหน่งสตับ ผลรวมของแอดมิตแตนซ์เป็น y = 1 พอดี ดังนั้นมองจากสตับย้อนไปทางแหล่งจ่าย จะเห็น Z = Z₀ ตลอด สายหลักด้านแหล่งจ่ายจึงแมตช์สมบูรณ์'),
          N('นี่คือเหตุผลที่ตำแหน่งสตับสำคัญพอ ๆ กับความยาวสตับ — ถ้าติดผิดตำแหน่ง ต่อให้ความยาวถูกก็ไม่แมตช์'),
        ],
        figures: [
          { kind: 'table', title: 'SWR ในแต่ละช่วงของวงจร Example 7-8 (คำนวณโดยแอป)', head: ['ช่วง', 'SWR'],
            rows: [['ที่โหลด ถึงตำแหน่งสตับ', n(swr78, 2)], ['จากสตับไปทางแหล่งจ่าย', '1.00']] },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b10', num: '11', title: 'ผลของความถี่ที่เปลี่ยนไป', titleTh: 'ทำไม matching ใช้ได้แค่ที่ความถี่ออกแบบ',
    intro: 'ทั้งสตับและหม้อแปลง λ/4 พึ่งพาความยาวไฟฟ้า เมื่อความถี่เปลี่ยน ความยาวจริงเท่าเดิมแต่ความยาวไฟฟ้าเปลี่ยน matching จึงหลุด บทนี้อธิบายที่มาและคำนวณให้เห็นจริง',
    sections: [
      {
        id: 'physical', title: 'ความยาวจริง กับ ความยาวไฟฟ้า',
        lines: [
          T('ความยาวจริงของสาย (เช่น 3.9 เมตร) ไม่เปลี่ยนตามความถี่ แต่ความยาวคลื่นเปลี่ยน'),
          M('\\lambda = \\frac{v}{f} \\;\\Rightarrow\\; f \\uparrow \\;\\Rightarrow\\; \\lambda \\downarrow'),
          T('ความยาวไฟฟ้าคืออัตราส่วน l/λ จึงเพิ่มขึ้นเมื่อความถี่เพิ่ม'),
          M('\\frac{l}{\\lambda\'} = \\frac{l}{\\lambda}\\cdot\\frac{f\'}{f}'),
          R('f\' = k f \\;\\Rightarrow\\; \\text{ความยาวไฟฟ้าใหม่} = k \\times \\text{ความยาวไฟฟ้าเดิม}'),
        ],
      },
      {
        id: 'ex78f', title: 'Example 7-8 เมื่อความถี่เปลี่ยนจาก 10 เป็น 12 MHz',
        lines: [
          T('ออกแบบไว้ที่ 10 MHz ในสายอากาศ ดังนั้น λ = 30 m'),
          M('d = 0.130 \\times 30 = 3.9\\ \\text{m}, \\qquad l_s = 0.085 \\times 30 = 2.55\\ \\text{m}'),
          T('ที่ 12 MHz ความยาวคลื่นเหลือ 25 m ความยาวจริงเท่าเดิม แต่คิดเป็นความยาวคลื่นใหม่ได้'),
          M(`d' = \\frac{3.9}{25} = ${n(f12.d, 3)}\\lambda', \\qquad l_s' = \\frac{2.55}{25} = ${n(f12.ls, 3)}\\lambda'`),
          T('เมื่อคำนวณใหม่ที่ความถี่นี้ (แอปคำนวณให้)'),
          M(`y_{line} = ${tc(f12.yLine, 2)}, \\qquad y_{stub} = ${tc(f12.yStub, 2)}`),
          M(`y_{total} = ${tc(f12.yTot, 2)} \\;\\Rightarrow\\; z = ${tc(f12.zTot, 2)}`),
          R(`SWR = ${n(f12.swr, 2)} \\qquad (\\text{จาก } 1.00 \\text{ ที่ } 10\\ \\text{MHz})`),
          W('สังเกตว่าเปลี่ยนความถี่เพียง 20 % ทั้งตำแหน่งสตับและความยาวสตับก็ผิดไปพร้อมกัน SWR จึงพุ่งขึ้นทันที'),
          N(`ข้อสังเกตเรื่องการปัดเศษ: ถ้าใช้ค่าที่ปัดแล้วของหนังสือ (d = 0.130 λ, l_s = 0.085 λ) ที่ 10 MHz จะได้ SWR = ${n(ex78AtFreq(10).swr, 3)} ไม่ใช่ 1.000 พอดี · ค่าที่ไม่ปัดคือ d = ${n(ex78.dLambda, 4)} λ และ l_s = ${n(ex78.lLambda, 4)} λ ซึ่งให้ SWR = 1.000`),
        ],
        figures: [
          { kind: 'plot', title: 'SWR ของวงจร Example 7-8 เมื่อความถี่เปลี่ยน (คำนวณโดยแอป)', xLabel: 'ความถี่ (MHz)', yLabel: 'SWR', xMin: 8, xMax: 12, yMin: 1, yMax: 4,
            series: [{ name: 'SWR', points: linspace(8, 12, 81).map((fm) => [fm, Math.min(4, ex78AtFreq(fm).swr)] as [number, number]) }],
            xTicks: [8, 9, 10, 11, 12], yTicks: [1, 2, 3, 4],
            markers: [{ x: 10, y: 1, text: 'ออกแบบที่ 10 MHz' }],
            caption: 'แมตช์สมบูรณ์เฉพาะที่ 10 MHz · ยิ่งห่างจากความถี่ออกแบบ SWR ยิ่งสูง' },
          { kind: 'table', title: 'ความยาวไฟฟ้าและ SWR ที่ความถี่ต่าง ๆ (ความยาวจริงคงที่)', head: ['f (MHz)', 'λ (m)', 'd (λ)', 'l_s (λ)', 'SWR'],
            rows: [8, 9, 10, 11, 12].map((fm) => { const r = ex78AtFreq(fm); return [n(fm, 0), n(300 / fm, 1), n(r.d, 3), n(r.ls, 3), n(r.swr, 2)]; }) },
        ],
      },
      {
        id: 'ex710', title: 'Example 7-10: ออกแบบแล้วตรวจที่ +10 %',
        lines: [
          T('โจทย์: Z_L = 200 Ω บนสาย Z₀ = 300 Ω · หาตำแหน่งและความยาวสตับปลายลัด แล้วหา SWR เมื่อความถี่เพิ่ม 10 %'),
          T('ขั้นที่ 1 — โหลดเป็นความต้านทานล้วน'),
          M(`z_L = \\frac{200}{300} = ${n(z710.re, 3)} \\qquad SWR = ${n(swr710, 2)} \\quad (\\text{หนังสือ } 1.5)`),
          T('ขั้นที่ 2–3 — ทำงานในรูปแอดมิตแตนซ์ แล้วหาจุดตัดวงกลม g = 1'),
          M(`y = ${tc(ex710.yAtStub, 2)} \\qquad (\\text{หนังสือ } 1 - j0.41)`),
          T('สตับจึงต้องสร้าง susceptance ตรงข้าม'),
          M(`b_{stub} = ${n(ex710.bStub, 2)} \\qquad (\\text{หนังสือ } +0.41)`),
          R(`d = ${n(ex710.dLambda, 3)}\\lambda, \\qquad l_s = ${n(ex710.lLambda, 3)}\\lambda`),
          T('ขั้นที่ 4 — เมื่อความถี่เพิ่ม 10 % ความยาวไฟฟ้าทั้งสองคูณ 1.1'),
          M(`d' = ${n(ex710.dLambda, 3)} \\times 1.1 = ${n(ex710.dLambda * 1.1, 3)}\\lambda', \\qquad l_s' = ${n(ex710.lLambda, 3)} \\times 1.1 = ${n(ex710.lLambda * 1.1, 3)}\\lambda'`),
          T('นำค่าใหม่ไปรวมแอดมิตแตนซ์อีกครั้ง จะได้ (แอปคำนวณให้)'),
          R((() => {
            const d = ex710.dLambda * 1.1, ls = ex710.lLambda * 1.1;
            const yl = admittance(normalize(lineInput(EX710.ZL, 300, d, 0), 300));
            const ys = admittance(normalize(stubInput('short', 300, ls), 300));
            const yt = C(yl.re + ys.re, yl.im + ys.im);
            return `SWR = ${n(swrFromGamma(gammaFromz(admittance(yt))), 2)} \\qquad (\\text{จาก } 1.00)`;
          })()),
          N('SWR ขึ้นไม่มากเพราะโหลดเดิมมี SWR เพียง 1.5 อยู่แล้ว ระบบที่ SWR เดิมสูงจะไวต่อความถี่มากกว่า'),
        ],
        figures: [
          { kind: 'smith', title: 'Example 7-10: จาก y_L เดินจนถึงวงกลม g = 1', showY: true, gCircles: [1],
            points: [{ z: admittance(z710), label: `y_L = ${fz(admittance(z710), 2)}`, cls: 'y' }, { z: admittance(ex710.yAtStub), label: `y = ${fz(ex710.yAtStub, 2)}`, cls: 'in' }],
            curves: [{ zs: swrPath(admittance(z710), ex710.dLambda), cls: 'net', arrow: true }], swr: [swr710] },
          { kind: 'lab', label: 'Lab: Example 7-10 (ลองเปลี่ยนความถี่ที่แถบบน Canvas ดู SWR เปลี่ยน)',
            circuit: () => buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex710.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex710.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 200, X: 0 }]]), showY: true },
        ],
      },
      {
        id: 'bandwidth', title: 'ความหมายในเชิง bandwidth',
        lines: [
          T('การตรวจ SWR ที่ความถี่อื่นก็คือการหา bandwidth ของระบบ matching นั่นเอง'),
          T('ถ้ากำหนดเกณฑ์ว่า SWR ≤ 2 ก็ดูว่าช่วงความถี่ใดที่กราฟ SWR ยังต่ำกว่าเส้นนั้น'),
          N(`จากกราฟหัวข้อ 11.2 วงจร Example 7-8 มี SWR ≤ 2 ประมาณช่วง ${(() => { const lo = linspace(6, 10, 200).find((fm) => ex78AtFreq(fm).swr <= 2); const hi = [...linspace(10, 16, 300)].reverse().find((fm) => ex78AtFreq(fm).swr <= 2); return `${n(lo ?? 0, 1)}–${n(hi ?? 0, 1)} MHz`; })()} (คำนวณโดยแอป)`),
          T('วิธีเพิ่ม bandwidth ที่ใช้บ่อยคือเลือกตำแหน่งสตับที่ใกล้โหลดกว่า ใช้ Q ต่ำลง หรือใช้ matching หลายขั้น'),
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b11', num: '12', title: 'สรุปและรูปแบบการทำโจทย์', titleTh: 'ทักษะที่ต้องทำได้',
    intro: 'บทสุดท้ายเปรียบเทียบสองวิธี matching และสรุปเป็นแผนผังเดียวที่ใช้ตอบโจทย์ Smith Chart ได้เกือบทุกข้อ',
    sections: [
      {
        id: 'compare', title: 'หม้อแปลง λ/4 เทียบกับ stub',
        lines: [
          T('ทั้งสองวิธีพาจุดเข้าศูนย์กลางเหมือนกัน แต่คนละกลไก'),
        ],
        figures: [
          { kind: 'table', title: 'เปรียบเทียบสองวิธี', head: ['หัวข้อ', 'หม้อแปลง λ/4', 'สตับขนาน'],
            rows: [
              ['ทำงานในโดเมน', 'อิมพีแดนซ์ (z)', 'แอดมิตแตนซ์ (y)'],
              ['ต้องหาอะไรก่อน', 'จุดที่ x = 0 (ความต้านทานล้วน)', 'จุดที่ g = 1'],
              ['ตัวแปรที่ออกแบบ', 'Z_T ของสาย λ/4', 'ตำแหน่ง d และความยาว l_s'],
              ['สูตรหลัก', 'Z_T = √(Z₀ R′)', 'y_stub = −jb'],
              ['ต้องใช้สายที่มี Z₀ พิเศษไหม', 'ต้อง (Z_T มักไม่ใช่ค่ามาตรฐาน)', 'ไม่ต้อง ใช้สายชนิดเดียวกันได้'],
              ['ปรับจูนหลังติดตั้ง', 'ยาก', 'ง่าย (เลื่อนตัวลัดวงจร)'],
            ] },
          { kind: 'smith', title: 'เส้นทางบนกราฟของสองวิธี สำหรับโหลดเดียวกัน (z = 1.33 − j0.67)', showY: true,
            points: [{ z: z77, label: 'z_L', cls: 'load' }, { z: C(1, 0), label: 'เป้าหมาย', cls: 'in' }],
            curves: [
              { zs: swrPath(z77, ex77.dLambda), cls: 'net', arrow: true },
              { zs: swrPath(admittance(z77), solveSingleStub(EX77.ZL, EX77.Z0, 'short')[0].dLambda), cls: 'y', arrow: true },
            ],
            gCircles: [1], xCircles: [0], swr: [swr77],
            caption: 'ม่วง = เดินไปหาจุด x = 0 สำหรับหม้อแปลง λ/4 · เขียวอมฟ้า = เดินไปหาวงกลม g = 1 สำหรับสตับ' },
        ],
      },
      {
        id: 'flow', title: 'แผนผังเดียวสำหรับทำโจทย์',
        lines: [
          K('Z_L, Z₀\n   ↓\nz_L = Z_L / Z₀        ← normalize เสมอ\n   ↓\nพล็อตจุด + ลากวงกลม SWR คงที่\n   ↓\nอ่าน SWR ที่จุดตัดแกนนอนด้านขวา\n   ↓\nโจทย์ถามอะไร?\n ├─ อิมพีแดนซ์ที่ตำแหน่งอื่น → เดินบนวงกลม SWR ตามระยะ λ (ตามเข็ม = ไปทาง generator)\n ├─ แอดมิตแตนซ์            → หมุน 180° ผ่านศูนย์กลาง\n ├─ หม้อแปลง λ/4          → เดินจนถึง x = 0 อ่าน R′ แล้ว Z_T = √(Z₀R′)\n └─ สตับ                   → แปลงเป็น y, เดินจนถึง g = 1 ได้ 1 ± jb แล้วสร้างสตับ ∓jb'),
        ],
      },
      {
        id: 'skills', title: 'หกทักษะที่ต้องทำได้',
        lines: [
          K('1. normalize และ denormalize ทั้ง Z และ Y\n2. พล็อต r + jx ลงบนกราฟให้ถูกครึ่ง (ระวังเครื่องหมาย)\n3. วาดและอ่านวงกลม SWR คงที่\n4. เดิน toward generator / toward load ด้วยหน่วย λ ให้ถูกทิศ\n5. แปลง Z ↔ Y และออกแบบหม้อแปลง λ/4\n6. ทำ single short-circuited stub matching รวมถึงตรวจเมื่อความถี่เปลี่ยน'),
          N('ทุกทักษะฝึกได้ในแท็บ 🔬 Lab: บทเรียน 14 ระดับสำหรับทักษะ 1–4 และโจทย์ Z/Y กับ B-1…B-4 สำหรับทักษะ 5–6'),
        ],
        figures: [
          { kind: 'lab', label: 'ฝึกทักษะ 1–3: โหลด 25 + j25 Ω บนสาย 50 Ω', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 25, X: 25 }]]) },
          { kind: 'lab', label: 'ฝึกทักษะ 4: สาย 0.15 λ ต่อโหลด 100 − j50 Ω (ใช้ Probe)', circuit: () => buildCircuit(100e6, 75, [['tline', 'series', { Z0: 75, len: 0.15, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
          { kind: 'lab', label: 'ฝึกทักษะ 5: หม้อแปลง λ/4 ของ Example 7-7', circuit: () => buildCircuit(100e6, 75, [['qwt', 'series', { Zt: Number(ex77.Zt.toFixed(2)) }], ['tline', 'series', { Z0: 75, len: Number(ex77.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
          { kind: 'lab', label: 'ฝึกทักษะ 6: สตับของ Example 7-8', circuit: () => buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex78.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex78.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 450, X: -600 }]]), showY: true },
        ],
      },
    ],
  },
];

export const findBasicsChapter = (id: string): Chapter | undefined => BASICS.find((c) => c.id === id);
void seriesPath; void XL; void XC; void W; void wtg78;
