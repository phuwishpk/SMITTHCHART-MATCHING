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

export const BASICS: Chapter[] = [
  // ============================================================
  {
    id: 'b1', num: '1', title: 'ปัญหาที่ทำให้ต้องมี Smith Chart', titleTh: 'เริ่มจากสายส่งกับโหลดที่ไม่แมตช์',
    intro: 'ก่อนจะอ่านกราฟได้ ต้องเห็นปัญหาก่อนว่าทำไมการคำนวณสายส่งด้วยมือจึงยาก บทนี้เริ่มจากสายส่งที่มีอิมพีแดนซ์คุณลักษณะ Z₀ ต่อกับโหลด Z_L แล้วดูว่าเกิดอะไรขึ้นเมื่อทั้งสองไม่เท่ากัน',
    sections: [
      {
        id: 'mismatch', title: '1.1 เมื่อ Z_L ไม่เท่ากับ Z₀ จะเกิดคลื่นสะท้อน',
        lines: [
          T('สมมติสายส่งมีอิมพีแดนซ์คุณลักษณะ Z₀ และปลายสายต่อโหลดที่มีอิมพีแดนซ์ Z_L = R + jX'),
          M('Z_L = Z_0 \;\\Rightarrow\; \\text{แมตช์พอดี ไม่มีคลื่นสะท้อน (ในอุดมคติ)}'),
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
        id: 'along', title: '1.2 อิมพีแดนซ์ที่มองเห็นเปลี่ยนไปตามตำแหน่งบนสาย',
        lines: [
          T('สิ่งสำคัญที่สุดของบทนี้: อิมพีแดนซ์ที่เรา "มองเห็น" ไม่ได้เท่ากับ Z_L ทุกตำแหน่ง เมื่อเดินจากโหลดเข้าหาแหล่งจ่าย ค่าที่วัดได้จะเปลี่ยนไปเรื่อย ๆ ตามสมการสายส่ง'),
          M('Z_{in}(l) = Z_0\\,\\frac{Z_L + jZ_0\\tan\\beta l}{Z_0 + jZ_L\\tan\\beta l}, \\qquad \\beta l = \\frac{2\\pi}{\\lambda}\\,l'),
          T('สำหรับสายไร้การสูญเสีย มีสมบัติสองข้อที่เป็นรากฐานของ Smith Chart:'),
          M('l = \\frac{\\lambda}{2}: \; Z_{in} = Z_L \\qquad\\text{(ค่ากลับมาเท่าเดิมทุกครึ่งความยาวคลื่น)}'),
          M('l = \\frac{\\lambda}{4}: \; Z_{in} = \\frac{Z_0^{2}}{Z_L} \;\\Rightarrow\; z_{in} = \\frac{1}{z_L} = y_L \\qquad\\text{(กลายเป็นแอดมิตแตนซ์ปกติของโหลด)}'),
          T('ข้อแรกทำให้กราฟหนึ่งรอบแทนระยะเพียง λ/2 ข้อที่สองทำให้การแปลง Z ↔ Y กลายเป็นการหมุนครึ่งรอบ ทั้งสองข้อจะกลับมาอีกในบทที่ 5 และ 6'),
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
        id: 'why', title: '1.3 ทำไมการคำนวณอย่างเดียวจึงยาก',
        lines: [
          T('ลองดูโหลด inductive เช่น Z_L = 100 + j50 Ω เมื่อเดินไปตามสาย บางตำแหน่งค่าที่เห็นยังเป็น inductive (R + jX) บางตำแหน่งกลายเป็น capacitive (R − jX)'),
          T('ระหว่างสองตำแหน่งนั้น ต้องมีจุดหนึ่งที่ X = 0 พอดี นั่นคือจุดที่อิมพีแดนซ์เป็นความต้านทานล้วน'),
          M('Z = R + j0 \\qquad \\text{(purely resistive point)}'),
          T('การหาตำแหน่งนี้ด้วยการแก้สมการสายส่งที่มีจำนวนเชิงซ้อนซ้ำ ๆ ทำได้ยากและเสียเวลา โดยเฉพาะเมื่อโหลดเป็นจำนวนเชิงซ้อน — Smith Chart ทำให้อ่านตำแหน่งนี้ได้ทันทีจากกราฟ'),
          N('จุด X = 0 นี้สำคัญมากในบทที่ 8 เพราะหม้อแปลง λ/4 ใช้ได้เฉพาะกับโหลดที่เป็นความต้านทานล้วนเท่านั้น'),
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
    id: 'b2', num: '2', title: 'Smith Chart คืออะไร และทำไมต้อง normalize', titleTh: 'กราฟที่แทนการแก้สมการสายส่ง',
    intro: 'Smith Chart คือ polar impedance diagram — กราฟที่จัดวงกลมและส่วนโค้งไว้ให้นำค่าของสายส่งที่ไม่แมตช์มาพล็อตและอ่านผลได้โดยไม่ต้องแก้สมการจำนวนเชิงซ้อนซ้ำ ๆ',
    sections: [
      {
        id: 'what', title: '2.1 กราฟนี้ช่วยลดงานอะไร',
        lines: [
          T('แทนที่จะแทนค่าในสมการนี้ทุกครั้งที่เปลี่ยนตำแหน่ง'),
          M('Z_{in} = Z_0\\,\\frac{Z_L + jZ_0\\tan\\beta l}{Z_0 + jZ_L\\tan\\beta l}'),
          T('เราทำเพียงสามขั้น'),
          K('Z_L  →  พล็อตจุดบนกราฟ  →  หมุนไปตามระยะที่ต้องการ  →  อ่าน Z_in ออกมา'),
          N('กราฟไม่ได้แทนที่ทฤษฎี แต่แทนที่ "การคำนวณซ้ำ" — สมการด้านบนยังเป็นที่มาของทุกเส้นบนกราฟ'),
        ],
      },
      {
        id: 'gamma', title: '2.2 ที่มาของกราฟ: ระนาบของ Γ',
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
        id: 'norm', title: '2.3 ทำไมต้อง normalize ก่อนพล็อต',
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
        id: 'ex-norm', title: '2.4 ตัวอย่างการ normalize ทีละขั้น',
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
    id: 'b3', num: '3', title: 'อ่านกราฟให้เป็น: วงกลม r และส่วนโค้ง x', titleTh: 'พิกัดของ Smith Chart',
    intro: 'บทนี้เป็นการฝึกอ่านพิกัด: วงกลมความต้านทานคงที่ ส่วนโค้งรีแอกแตนซ์คงที่ ความหมายของเครื่องหมาย +j และ −j การตัดกันแบบตั้งฉาก และความหมายของจุดสำคัญบนกราฟ',
    sections: [
      {
        id: 'rcircle', title: '3.1 วงกลมความต้านทานคงที่ (r)',
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
          { kind: 'table', title: 'ตำแหน่งของวงกลม r (คำนวณจากสูตร)', head: ['r', 'ศูนย์กลาง Γ', 'รัศมี', 'R จริงเมื่อ Z₀ = 50 Ω'],
            rows: [0.2, 0.5, 1, 2, 5].map((r) => [n(r, 2), n(r / (1 + r), 3), n(1 / (1 + r), 3), `${n(r * 50, 0)} Ω`]) },
        ],
      },
      {
        id: 'xarc', title: '3.2 ส่วนโค้งรีแอกแตนซ์คงที่ (x)',
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
        ],
      },
      {
        id: 'sign', title: '3.3 ความหมายของ +j และ −j',
        lines: [
          T('ในอิมพีแดนซ์ Z = R + jX'),
          M('X > 0 \;\\Rightarrow\; \\text{inductive} \\quad (\\text{เช่น } 50 + j30\\,\\Omega)'),
          M('X < 0 \;\\Rightarrow\; \\text{capacitive} \\quad (\\text{เช่น } 50 - j30\\,\\Omega)'),
          W('เครื่องหมายผิดหมายถึงอยู่คนละด้านของกราฟ ผลลัพธ์ทั้งหมดจะผิดตาม — 0.5 + j0.5 อยู่ครึ่งบน ส่วน 0.5 − j0.5 อยู่ครึ่งล่าง'),
          T('ที่มาของเครื่องหมาย: X_L = 2πfL เป็นบวกเสมอ ส่วน X_C = −1/(2πfC) เป็นลบเสมอ'),
        ],
        figures: [
          { kind: 'lab', label: 'ทดลอง: R 50 Ω + L (inductive) → ครึ่งบน', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['inductor', 'series', { L: 47.7 }]]) },
          { kind: 'lab', label: 'ทดลอง: R 50 Ω + C (capacitive) → ครึ่งล่าง', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['capacitor', 'series', { C: 53 }]]) },
        ],
      },
      {
        id: 'ortho', title: '3.4 วงกลมทั้งสองชุดตัดกันแบบตั้งฉาก',
        lines: [
          T('ชุดวงกลม r และชุดส่วนโค้ง x ถูกออกแบบให้ตัดกันแบบ orthogonal — ถ้าลากเส้นสัมผัสที่จุดตัด เส้นสัมผัสทั้งสองจะตั้งฉากกัน'),
          T('เหตุผลเชิงคณิตศาสตร์: การแปลง Γ = (z − 1)/(z + 1) เป็น conformal mapping ซึ่งรักษามุมระหว่างเส้นไว้ เส้น r คงที่กับเส้น x คงที่ในระนาบ z ตั้งฉากกันอยู่แล้ว จึงยังตั้งฉากกันหลังการแปลง'),
          N('ผลที่ได้คือระบบพิกัดที่อ่านค่า r และ x ได้อย่างเป็นระบบเหมือนกราฟกระดาษกราฟธรรมดา'),
        ],
        figures: [
          { kind: 'smith', title: 'ที่จุด z = 1 + j1 วงกลม r = 1 กับส่วนโค้ง x = 1 ตัดกันเป็นมุมฉาก',
            rCircles: [1], xCircles: [1], points: [{ z: C(1, 1), label: 'z = 1 + j1', cls: 'load' }] },
        ],
      },
      {
        id: 'center', title: '3.5 จุดกลางกราฟ คือจุดที่แมตช์',
        lines: [
          T('จุดตรงกลางหมายถึง z = 1 + j0 เพราะ'),
          M('z = \\frac{Z}{Z_0} = 1 \;\\Rightarrow\; Z = Z_0'),
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
    id: 'b4', num: '4', title: 'วงกลม SWR คงที่', titleTh: 'สิ่งที่ไม่เปลี่ยนเมื่อเดินไปตามสาย',
    intro: 'เมื่อพล็อตโหลดแล้ว ลากวงกลมที่มีศูนย์กลางอยู่กลางกราฟผ่านจุดโหลด วงกลมนี้คือ constant SWR circle และเป็นเส้นทางที่จุดจะเดินเมื่อเราขยับไปตามสายไร้การสูญเสีย',
    sections: [
      {
        id: 'circle', title: '4.1 ทำไมจุดจึงเดินอยู่บนวงกลมเดียว',
        lines: [
          T('บนสายไร้การสูญเสีย ขนาดของสัมประสิทธิ์การสะท้อนไม่เปลี่ยน เปลี่ยนแต่มุม'),
          M('\\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l} \;\\Rightarrow\; |\\Gamma(l)| = |\\Gamma_L| = \\text{คงที่}'),
          T('เพราะ |Γ| คือรัศมีจากศูนย์กลางกราฟ จุดจึงหมุนอยู่บนวงกลมรัศมีเดิม และเพราะ SWR ขึ้นกับ |Γ| อย่างเดียว'),
          M('SWR = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|} = \\text{คงที่ตลอดสาย}'),
          R('Z \\text{ เปลี่ยนทุกตำแหน่ง แต่ } SWR \\text{ ไม่เปลี่ยน}'),
        ],
      },
      {
        id: 'ex-swr', title: '4.2 ตัวอย่าง: z = 0.5 + j0.5 เดินไป 0.100 λ',
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
        id: 'read-swr', title: '4.3 วิธีอ่านค่า SWR จากกราฟ',
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
        ],
      },
      {
        id: 'lossy', title: '4.4 สายที่มีการสูญเสีย: เกลียวเข้าหาศูนย์กลาง',
        lines: [
          T('ทุกอย่างข้างต้นใช้กับสายไร้การสูญเสีย ถ้าสายมีการสูญเสีย คลื่นสะท้อนถูกลดทอนทั้งขาไปและขากลับ ทำให้ |Γ| ลดลงเรื่อย ๆ'),
          M('|\\Gamma(l)| = |\\Gamma_L|\\,e^{-2\\alpha l}'),
          T('เส้นทางจึงไม่เป็นวงกลม แต่เป็นเกลียวเข้าหาศูนย์กลาง (inward spiral) และ SWR ที่วัดได้ที่ต้นสายจะต่ำกว่าที่โหลดจริง'),
          W('SWR ที่ต้นสายต่ำ ไม่ได้แปลว่าโหลดแมตช์ดี อาจเป็นเพราะสายกินกำลังไปมากก็ได้'),
          N('ในบทเรียนพื้นฐานทั้งหมดต่อจากนี้ เราถือว่าสายไร้การสูญเสีย'),
        ],
        figures: [
          { kind: 'lab', label: 'ทดลอง: โหลด 200 Ω ผ่านสาย 0.5 λ ที่มี loss 3 dB', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.5, vf: 0.66, lossDb: 3 }], ['load', 'series', { R: 200, X: 0 }]]), note: 'เทียบจุด z_L (แดง) กับ z_in (เขียว) จะเห็นว่า z_in เข้าใกล้ศูนย์กลางกว่า' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b5', num: '5', title: 'ระยะทางบนกราฟ', titleTh: 'หนึ่งรอบเท่ากับครึ่งความยาวคลื่น',
    intro: 'จุดที่สับสนบ่อยที่สุดคือกราฟหนึ่งรอบแทนระยะเท่าไร และทิศไหนคือไปทางแหล่งจ่าย บทนี้ตอบทั้งสองข้อพร้อมที่มา',
    sections: [
      {
        id: 'halflambda', title: '5.1 หนึ่งรอบ = λ/2 ไม่ใช่ λ',
        lines: [
          T('จากสมการการหมุนของ Γ'),
          M('\\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l}, \\qquad \\beta = \\frac{2\\pi}{\\lambda}'),
          T('มุมที่หมุนคือ 2βl ดังนั้นเมื่อ l = λ/2'),
          M('2\\beta l = 2\\cdot\\frac{2\\pi}{\\lambda}\\cdot\\frac{\\lambda}{2} = 2\\pi \;\\Rightarrow\; \\text{ครบหนึ่งรอบพอดี}'),
          R('360^\\circ \\text{ บนกราฟ} \;\\Leftrightarrow\; 0.5\\lambda \\text{ บนสาย}'),
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
        id: 'direction', title: '5.2 ทิศทาง: toward generator กับ toward load',
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
        id: 'scale', title: '5.3 วิธีอ่านระยะจากสเกลรอบนอก',
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
    id: 'b6', num: '6', title: 'แอดมิตแตนซ์และการหมุน 180°', titleTh: 'ทำไม Z → Y จึงเป็นการหมุนครึ่งรอบ',
    intro: 'อุปกรณ์ที่ต่อขนานบวกกันด้วยแอดมิตแตนซ์ ไม่ใช่อิมพีแดนซ์ บทนี้อธิบายการแปลง Z ↔ Y บนกราฟและที่มาว่าทำไมจึงเป็นการหมุนครึ่งรอบพอดี',
    sections: [
      {
        id: 'y', title: '6.1 นิยามและค่าปกติ',
        lines: [
          M('Y = \\frac{1}{Z}, \\qquad y = \\frac{1}{z} = g + jb'),
          T('โดย g คือ conductance ปกติ และ b คือ susceptance ปกติ'),
          M('y = \\frac{1}{r + jx} = \\frac{r - jx}{r^2 + x^2} \;\\Rightarrow\; g = \\frac{r}{r^2+x^2}, \\quad b = \\frac{-x}{r^2+x^2}'),
          W('สังเกตเครื่องหมาย: โหลด inductive มี x > 0 แต่ b < 0 — เครื่องหมายกลับกันเสมอเมื่อเปลี่ยนโดเมน'),
        ],
      },
      {
        id: 'convert', title: '6.2 ตัวอย่างการแปลงด้วยเลขเชิงซ้อน',
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
        id: 'why180', title: '6.3 ที่มาของการหมุน 180°',
        lines: [
          T('จากบทที่ 1 สายยาว λ/4 ทำให้'),
          M('z_{in} = \\frac{1}{z_L} = y_L'),
          T('และจากบทที่ 5 ระยะ λ/4 คือครึ่งรอบของกราฟ (180°) ดังนั้นการหา y จึงเท่ากับการหมุนจุด z ไป 180° ซึ่งก็คือการลากเส้นผ่านศูนย์กลางไปอีกด้านหนึ่งนั่นเอง'),
          M('\\Gamma_y = \\Gamma_z\\,e^{-j\\pi} = -\\Gamma_z'),
          N('ตรวจได้ง่าย: ถ้า z = 0 (SHORT, Γ = −1) แล้ว y = ∞ (OPEN, Γ = +1) ซึ่งอยู่ตรงข้ามกันพอดี'),
        ],
      },
      {
        id: 'apps', title: '6.4 สรุปการใช้งานสามกลุ่ม',
        lines: [
          T('หนังสือระบุการใช้งาน Smith Chart ที่สำคัญไว้สามกลุ่ม'),
          K('1. คำนวณ admittance จาก impedance (และกลับกัน)\n2. หา impedance หรือ admittance ที่ตำแหน่งใด ๆ บนสาย พร้อมอ่าน SWR\n3. หาความยาวของสายปลายลัดวงจร เพื่อสร้าง reactance หรือ susceptance ตามที่ต้องการ'),
          N('กลุ่มที่ 3 คือหัวใจของ stub matching ซึ่งจะเรียนในบทที่ 7 และ 9'),
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b7', num: '7', title: 'สายส่งใช้แทน L และ C ได้', titleTh: 'ที่มาของสตับ',
    intro: 'ที่ความถี่สูง การใช้ตัวเหนี่ยวนำหรือตัวเก็บประจุจริงทำได้ยาก แต่สายส่งสั้น ๆ ที่ปลายลัดวงจรหรือปลายเปิดให้รีแอกแตนซ์ได้เหมือนกัน นี่คือที่มาของ stub',
    sections: [
      {
        id: 'shortopen', title: '7.1 สายปลายลัดและปลายเปิดให้รีแอกแตนซ์อะไร',
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
        id: 'stub', title: '7.2 stub คืออะไร และทำไมนิยมปลายลัด',
        lines: [
          T('stub คือสายส่งสั้น ๆ ที่ต่อเข้ากับสายหลักเพื่อสร้าง reactance หรือ susceptance ตามต้องการ'),
          T('ส่วนใหญ่ใช้แบบปลายลัดวงจร (short-circuited stub) มากกว่าปลายเปิด เพราะปลายเปิดมีแนวโน้มจะแผ่คลื่นออกไป (radiate) ทำให้เกิดการสูญเสียและรบกวนระบบ'),
          N('ปลายลัดยังปรับความยาวได้ง่ายกว่าในทางปฏิบัติ เพราะเลื่อนตัวลัดวงจรได้'),
        ],
      },
      {
        id: 'ex-stub', title: '7.3 ตัวอย่าง: หาความยาวสตับที่ 150 MHz',
        lines: [
          T('โจทย์จากหนังสือ: โหลดมีแอดมิตแตนซ์ Y_L = 0.004 − j0.002 S สายมี Y₀ = 0.0033 S ที่ความถี่ 150 MHz ใช้ฉนวนอากาศ'),
          T('ขั้นที่ 1 — normalize แอดมิตแตนซ์'),
          M(`y_L = \\frac{Y_L}{Y_0} = \\frac{0.004 - j0.002}{0.0033} = ${tc(C(0.004 / 0.0033, -0.002 / 0.0033), 2)}`),
          T('ขั้นที่ 2 — โหลดมี susceptance เป็น −j0.61 จึงต้องสร้าง +j0.61 มาหักล้าง'),
          M('b_{stub} = +0.61'),
          T('ขั้นที่ 3 — หาความยาวสตับปลายลัดที่ให้ค่านี้'),
          M('y_{stub} = -j\\cot\\beta l = +j0.61 \;\\Rightarrow\; \\cot\\beta l = -0.61'),
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
    id: 'b8', num: '8', title: 'หม้อแปลง λ/4 ทีละขั้น', titleTh: 'Quarter-wave transformer และ Example 7-7',
    intro: 'หม้อแปลงหนึ่งในสี่ความยาวคลื่นคือสายส่งยาว λ/4 ที่เลือก Z_T ให้เหมาะสม ใช้แปลงอิมพีแดนซ์ได้ในขั้นตอนเดียว แต่มีเงื่อนไขสำคัญคือโหลดต้องเป็นความต้านทานล้วน',
    sections: [
      {
        id: 'principle', title: '8.1 หลักการและที่มาของสูตร',
        lines: [
          T('จากสมการสายส่ง เมื่อ l = λ/4 จะได้ βl = 90° และ tan βl → ∞ สมการจึงลดรูปเหลือ'),
          M('Z_{in} = \\lim_{\\tan\\beta l \\to \\infty} Z_T\\,\\frac{Z_L + jZ_T\\tan\\beta l}{Z_T + jZ_L\\tan\\beta l} = \\frac{Z_T^{2}}{Z_L}'),
          T('ถ้าต้องการให้ต้นสายเห็น Z₀ พอดี ก็ตั้ง Z_in = Z₀'),
          M('\\frac{Z_T^{2}}{Z_L} = Z_0 \;\\Rightarrow\; \\boxed{Z_T = \\sqrt{Z_0 Z_L}}'),
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
        id: 'complex', title: '8.2 ปัญหาเมื่อโหลดเป็นจำนวนเชิงซ้อน',
        lines: [
          T('ถ้า Z_L = R + jX เราต่อหม้อแปลงที่โหลดโดยตรงไม่ได้ เพราะสูตรต้องการความต้านทานล้วน'),
          T('ทางแก้คือใช้สายส่งธรรมดา (Z₀ เดิม) เดินจากโหลดไปทางแหล่งจ่ายก่อน จนถึงตำแหน่งที่อิมพีแดนซ์เป็นความต้านทานล้วน (x = 0) แล้วค่อยต่อหม้อแปลงที่จุดนั้น'),
          K('โหลด Z_L ──[ สาย Z₀ ยาว d ]──┤ x = 0 ที่นี่ ├──[ λ/4, Z_T ]── ไปยังแหล่งจ่าย'),
          N('ตำแหน่ง x = 0 หาได้ง่ายมากบน Smith Chart: เดินตามวงกลม SWR จนตัดแกนนอน — นี่คือเหตุผลที่บทที่ 1 บอกว่าการหาจุดนี้ด้วยการคำนวณอย่างเดียวทำได้ยาก'),
        ],
      },
      {
        id: 'ex77', title: '8.3 Example 7-7 ทีละขั้น',
        lines: [
          T('โจทย์: Z_L = 100 − j50 Ω บนสาย Z₀ = 75 Ω · หาตำแหน่งที่ใกล้โหลดที่สุดที่ใส่หม้อแปลง λ/4 ได้ และหาค่า Z_T'),
          T('ขั้นที่ 1 — normalize'),
          M(`z_L = \\frac{100 - j50}{75} = ${tc(z77, 3)}`),
          T('ขั้นที่ 2 — พล็อตจุดแล้วลากวงกลม SWR คงที่'),
          M(`SWR = ${n(swr77, 3)}`),
          T('ขั้นที่ 3 — เดินไปทางแหล่งจ่าย (ตามเข็ม) จนวงกลมตัดแกน x = 0 จุดแรก'),
          M(`d = ${n(ex77.dLambda, 3)}\\lambda \\qquad (\\text{หนังสือ } 0.184\\lambda)`),
          T('ขั้นที่ 4 — อ่านค่าความต้านทานปกติที่จุดนั้น แล้วคูณ Z₀ กลับ'),
          M(`r = ${n(ex77.Rreal / 75, 3)} \;\\Rightarrow\; R' = ${n(ex77.Rreal / 75, 3)} \\times 75 = ${n(ex77.Rreal, 1)}\\,\\Omega \\qquad (\\text{หนังสือ } 39.8\\,\\Omega)`),
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
        id: 'pattern77', title: '8.4 รูปแบบของโจทย์หม้อแปลง λ/4',
        lines: [
          K('Z_L, Z₀\n   ↓ normalize\nz_L\n   ↓ plot + วงกลม SWR\n   ↓ เดิน toward generator จนถึง x = 0\nอ่าน r แล้วคูณ Z₀ → R′\n   ↓\nZ_T = √(Z₀ · R′)'),
          N('ถ้าโหลดเป็นความต้านทานล้วนอยู่แล้ว ข้ามขั้นเดินสายได้เลย ใช้ Z_T = √(Z₀ R_L) ทันที'),
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b9', num: '9', title: 'Single stub matching ทีละขั้น', titleTh: 'ขั้นตอนหกข้อ และ Example 7-8',
    intro: 'สตับต่อขนานกับสายหลัก จึงต้องทำงานในโดเมนแอดมิตแตนซ์ บทนี้อธิบายเป้าหมาย เหตุผลของทุกขั้นตอน แล้วทำ Example 7-8 ให้ครบ',
    sections: [
      {
        id: 'goal', title: '9.1 เป้าหมายของ stub matching',
        lines: [
          T('เพราะสตับต่อขนาน แอดมิตแตนซ์จึงบวกกันตรง ๆ'),
          M('y_{total} = y_{line} + y_{stub}'),
          T('ถ้าเราเลือกตำแหน่งที่สายมี y = 1 + jb แล้วใส่สตับที่ให้ y_stub = −jb จะได้'),
          M('y_{total} = (1 + jb) + (-jb) = 1'),
          R('y = 1 \;\\Rightarrow\; Y = Y_0 \;\\Rightarrow\; Z = Z_0 \;\\Rightarrow\; SWR = 1'),
          T('นี่คือแก่นทั้งหมดของ single-stub matching'),
        ],
      },
      {
        id: 'whyg1', title: '9.2 ทำไมต้องหาจุดที่ g = 1',
        lines: [
          T('สตับเป็น pure susceptance มันเปลี่ยนได้เฉพาะส่วน jb เท่านั้น เปลี่ยน g ไม่ได้เลย'),
          T('สมมติเลือกจุดผิดที่ y = 0.5 + j1 แล้วใส่สตับ −j1'),
          M('y_{total} = 0.5 + j1 - j1 = 0.5 \\neq 1 \;\\Rightarrow\; \\text{ยังไม่แมตช์}'),
          T('แต่ถ้าเลือกจุดที่ y = 1 + j1 แล้วใส่สตับ −j1'),
          M('y_{total} = 1 + j1 - j1 = 1 \;\\Rightarrow\; \\text{แมตช์}'),
          N('เราจึงไม่ได้หาวงกลม g = 1 โดยบังเอิญ แต่เพราะมันเป็นเส้นเดียวที่สตับจะพาเราเข้าศูนย์กลางได้'),
        ],
        figures: [
          { kind: 'smith', title: 'วงกลม g = 1 (เขียว) คือเส้นเป้าหมายก่อนใส่สตับ', showY: true, gCircles: [1],
            points: [{ z: admittance(C(1, 1)), label: 'y = 1 + j1 → ใส่สตับได้', cls: 'y' }, { z: admittance(C(0.5, 1)), label: 'y = 0.5 + j1 → ยังไม่ได้', cls: 'mid' }],
            caption: 'ใส่สตับที่จุดบนวงกลม g = 1 เท่านั้นจึงจะถึงศูนย์กลาง' },
        ],
      },
      {
        id: 'procedure', title: '9.3 ขั้นตอนหกข้อ',
        lines: [
          K('1. normalize โหลด z_L = Z_L / Z₀ แล้วพล็อตจุด\n2. แปลงเป็นแอดมิตแตนซ์ y_L (หมุน 180° ผ่านศูนย์กลาง)\n3. เดินตามวงกลม SWR ไปทาง generator จนตัดวงกลม g = 1 → ได้ y = 1 ± jb และได้ระยะ d\n4. เริ่มหาความยาวสตับจากจุด SHORT บนขอบกราฟ\n5. หาค่า susceptance ที่ตรงข้าม: ถ้าสายมี +jb สตับต้องเป็น −jb\n6. อ่านระยะบนสเกลจากจุด SHORT ถึงจุดนั้น = ความยาวสตับ l_s'),
          N('ขั้นที่ 3 มีสองคำตอบเสมอ (วงกลม SWR ตัดวงกลม g = 1 สองจุด) เลือกจุดที่ใกล้โหลดกว่าเพื่อให้ bandwidth กว้างกว่า'),
        ],
      },
      {
        id: 'ex78', title: '9.4 Example 7-8 ทีละขั้น',
        lines: [
          T('โจทย์: Z_L = 450 − j600 Ω บนสาย Z₀ = 300 Ω · หาตำแหน่งและความยาวของสตับปลายลัด'),
          T('ขั้นที่ 1 — normalize และพล็อต'),
          M(`z_L = \\frac{450 - j600}{300} = ${tc(z78, 1)} \\qquad SWR = ${n(swr78, 2)} \\quad (\\text{หนังสือ } 4.6)`),
          T('ขั้นที่ 2 — แปลงเป็นแอดมิตแตนซ์ (หมุน 180° หรืออ่านอีกด้านของวงกลม SWR)'),
          M(`y_L = \\frac{1}{z_L} = ${tc(y78, 2)} \\qquad (\\text{หนังสือ } 0.24 + j0.32)`),
          T('ขั้นที่ 3 — เดินไปทาง generator จนถึงวงกลม g = 1'),
          M(`y = ${tc(ex78.yAtStub, 2)} \\qquad (\\text{หนังสือ } 1 + j1.7)`),
          T('อ่านระยะจากสเกล: จุดโหลดอยู่ที่ 0.051 λ จุดที่ g = 1 อยู่ที่ 0.181 λ'),
          M(`d = 0.181 - 0.051 = ${n(ex78.dLambda, 3)}\\lambda \\qquad (\\text{หนังสือ } 0.130\\lambda)`),
          T('ขั้นที่ 4–6 — สตับต้องหักล้าง susceptance ที่เหลือ'),
          M(`b_{stub} = ${n(ex78.bStub, 2)} \\qquad (\\text{หนังสือ } -1.7)`),
          T('เริ่มจากจุด SHORT (สเกล 0.250 λ) เดินตามขอบกราฟจนถึงค่านี้ ได้สเกล 0.335 λ'),
          R(`l_s = 0.335 - 0.250 = ${n(ex78.lLambda, 3)}\\lambda \\qquad (\\text{หนังสือ } 0.085\\lambda)`),
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
        id: 'after', title: '9.5 ทำไมหลังสตับจึงได้ SWR = 1',
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
    id: 'b10', num: '10', title: 'ผลของความถี่ที่เปลี่ยนไป', titleTh: 'ทำไม matching ใช้ได้แค่ที่ความถี่ออกแบบ',
    intro: 'ทั้งสตับและหม้อแปลง λ/4 พึ่งพาความยาวไฟฟ้า เมื่อความถี่เปลี่ยน ความยาวจริงเท่าเดิมแต่ความยาวไฟฟ้าเปลี่ยน matching จึงหลุด บทนี้อธิบายที่มาและคำนวณให้เห็นจริง',
    sections: [
      {
        id: 'physical', title: '10.1 ความยาวจริง กับ ความยาวไฟฟ้า',
        lines: [
          T('ความยาวจริงของสาย (เช่น 3.9 เมตร) ไม่เปลี่ยนตามความถี่ แต่ความยาวคลื่นเปลี่ยน'),
          M('\\lambda = \\frac{v}{f} \;\\Rightarrow\; f \\uparrow \;\\Rightarrow\; \\lambda \\downarrow'),
          T('ความยาวไฟฟ้าคืออัตราส่วน l/λ จึงเพิ่มขึ้นเมื่อความถี่เพิ่ม'),
          M('\\frac{l}{\\lambda\'} = \\frac{l}{\\lambda}\\cdot\\frac{f\'}{f}'),
          R('f\' = k f \;\\Rightarrow\; \\text{ความยาวไฟฟ้าใหม่} = k \\times \\text{ความยาวไฟฟ้าเดิม}'),
        ],
      },
      {
        id: 'ex78f', title: '10.2 Example 7-8 เมื่อความถี่เปลี่ยนจาก 10 เป็น 12 MHz',
        lines: [
          T('ออกแบบไว้ที่ 10 MHz ในสายอากาศ ดังนั้น λ = 30 m'),
          M('d = 0.130 \\times 30 = 3.9\\ \\text{m}, \\qquad l_s = 0.085 \\times 30 = 2.55\\ \\text{m}'),
          T('ที่ 12 MHz ความยาวคลื่นเหลือ 25 m ความยาวจริงเท่าเดิม แต่คิดเป็นความยาวคลื่นใหม่ได้'),
          M(`d' = \\frac{3.9}{25} = ${n(f12.d, 3)}\\lambda', \\qquad l_s' = \\frac{2.55}{25} = ${n(f12.ls, 3)}\\lambda'`),
          T('เมื่อคำนวณใหม่ที่ความถี่นี้ (แอปคำนวณให้)'),
          M(`y_{line} = ${tc(f12.yLine, 2)}, \\qquad y_{stub} = ${tc(f12.yStub, 2)}`),
          M(`y_{total} = ${tc(f12.yTot, 2)} \;\\Rightarrow\; z = ${tc(f12.zTot, 2)}`),
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
        id: 'ex710', title: '10.3 Example 7-10: ออกแบบแล้วตรวจที่ +10 %',
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
        id: 'bandwidth', title: '10.4 ความหมายในเชิง bandwidth',
        lines: [
          T('การตรวจ SWR ที่ความถี่อื่นก็คือการหา bandwidth ของระบบ matching นั่นเอง'),
          T('ถ้ากำหนดเกณฑ์ว่า SWR ≤ 2 ก็ดูว่าช่วงความถี่ใดที่กราฟ SWR ยังต่ำกว่าเส้นนั้น'),
          N(`จากกราฟหัวข้อ 10.2 วงจร Example 7-8 มี SWR ≤ 2 ประมาณช่วง ${(() => { const lo = linspace(6, 10, 200).find((fm) => ex78AtFreq(fm).swr <= 2); const hi = [...linspace(10, 16, 300)].reverse().find((fm) => ex78AtFreq(fm).swr <= 2); return `${n(lo ?? 0, 1)}–${n(hi ?? 0, 1)} MHz`; })()} (คำนวณโดยแอป)`),
          T('วิธีเพิ่ม bandwidth ที่ใช้บ่อยคือเลือกตำแหน่งสตับที่ใกล้โหลดกว่า ใช้ Q ต่ำลง หรือใช้ matching หลายขั้น'),
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b11', num: '11', title: 'สรุปและรูปแบบการทำโจทย์', titleTh: 'ทักษะที่ต้องทำได้',
    intro: 'บทสุดท้ายเปรียบเทียบสองวิธี matching และสรุปเป็นแผนผังเดียวที่ใช้ตอบโจทย์ Smith Chart ได้เกือบทุกข้อ',
    sections: [
      {
        id: 'compare', title: '11.1 หม้อแปลง λ/4 เทียบกับ stub',
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
        id: 'flow', title: '11.2 แผนผังเดียวสำหรับทำโจทย์',
        lines: [
          K('Z_L, Z₀\n   ↓\nz_L = Z_L / Z₀        ← normalize เสมอ\n   ↓\nพล็อตจุด + ลากวงกลม SWR คงที่\n   ↓\nอ่าน SWR ที่จุดตัดแกนนอนด้านขวา\n   ↓\nโจทย์ถามอะไร?\n ├─ อิมพีแดนซ์ที่ตำแหน่งอื่น → เดินบนวงกลม SWR ตามระยะ λ (ตามเข็ม = ไปทาง generator)\n ├─ แอดมิตแตนซ์            → หมุน 180° ผ่านศูนย์กลาง\n ├─ หม้อแปลง λ/4          → เดินจนถึง x = 0 อ่าน R′ แล้ว Z_T = √(Z₀R′)\n └─ สตับ                   → แปลงเป็น y, เดินจนถึง g = 1 ได้ 1 ± jb แล้วสร้างสตับ ∓jb'),
        ],
      },
      {
        id: 'skills', title: '11.3 หกทักษะที่ต้องทำได้',
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
