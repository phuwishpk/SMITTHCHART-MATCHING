// ---------------------------------------------------------------
// Guided lessons (levels 1–14) and ready-made examples.
// ---------------------------------------------------------------
import { Circuit, buildCircuit, ElementType } from './circuit';
import { SolveResult } from './solver';
import { abs } from './complex';
import { admittance } from './rf';
import { Complex } from './complex';
import { solveSweep, sweepMaxSwr } from './solver';

export interface CheckCtx {
  /** true when every numeric answer the learner typed is within tolerance */
  answersOk: boolean;
}

export interface GuidedStep {
  text: string;
  hint?: string;
  check: (c: Circuit, r: SolveResult, ctx?: CheckCtx) => boolean;
}

/** A numeric answer the learner must type; the expected value is computed from the solution circuit. */
export interface AnswerSpec {
  key: string;
  label: string;
  unit: string;
  /** relative tolerance (fraction) */
  tol: number;
  /** absolute tolerance (used when the expected value is near zero) */
  tolAbs?: number;
  value: (solutionResult: SolveResult, solutionCircuit: Circuit) => number;
  /** short KaTeX hint shown in the derivation */
  tex?: string;
}

export interface Lesson {
  id: string;
  level: number;
  title: string;
  learn: string;
  concept: string[];
  phase: 1 | 2 | 3;
  bookPriority?: boolean;
  start: () => Circuit;
  steps: GuidedStep[];
  /** optional "show solution" that returns a completed circuit */
  solution?: () => Circuit;
  /** ---- practice problems ---- */
  kind?: 'lesson' | 'problem';
  category?: 'impedance' | 'admittance' | 'book';
  /** problem statement shown to the learner */
  statement?: string;
  answers?: AnswerSpec[];
}

export interface Example {
  id: string;
  title: string;
  subtitle: string;
  circuit: () => Circuit;
}

const has = (c: Circuit, t: ElementType, orient?: 'series' | 'shunt') =>
  c.elements.some((e) => e.type === t && (orient ? e.orient === orient : true));
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const paramNear = (c: Circuit, t: ElementType, key: string, v: number, tol: number) =>
  c.elements.some((e) => e.type === t && near(e.params[key], v, tol));
const fNear = (c: Circuit, MHz: number) => near(c.f / 1e6, MHz, 0.5);
const zinNear = (r: SolveResult, re: number, im: number, tol = 0.05) =>
  Number.isFinite(r.zin.re) && near(r.zin.re, re, tol) && near(r.zin.im, im, tol);
const matched = (r: SolveResult) => abs(r.gammaIn) < 0.05;

export const LESSONS: Lesson[] = [
  {
    id: 'l1', level: 1, phase: 1, title: 'R Load', learn: 'จุดบนแกน Resistance',
    concept: [
      'ตัวต้านทานล้วนมี x = 0 จุดจึงอยู่บนแกนนอนของ Smith Chart',
      'r = 1 คือศูนย์กลาง (match) r < 1 อยู่ทางซ้าย r > 1 อยู่ทางขวา',
    ],
    start: () => buildCircuit(100e6, 50, []),
    steps: [
      { text: 'ลาก Resistor มาวางบน Canvas', check: (c) => has(c, 'resistor') },
      { text: 'คลิก R แล้วตั้งค่า R = 50 Ω', hint: 'สังเกตว่าจุดอยู่กลางกราฟพอดี (r = 1)', check: (c) => paramNear(c, 'resistor', 'R', 50, 0.5) },
      { text: 'ลองเลื่อน R เป็น 25 Ω แล้วดูจุดเลื่อนไปทางซ้าย (r = 0.5)', check: (c) => paramNear(c, 'resistor', 'R', 25, 1) },
      { text: 'ลองเลื่อน R เป็น 100 Ω แล้วดูจุดเลื่อนไปทางขวา (r = 2)', check: (c) => paramNear(c, 'resistor', 'R', 100, 2) },
    ],
    solution: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }]]),
  },
  {
    id: 'l2', level: 2, phase: 1, title: 'L Load', learn: '+jX, Inductive → ครึ่งบนของกราฟ',
    concept: [
      'X_L = 2πfL เป็นบวก จุดจึงอยู่ครึ่งบนของ Smith Chart',
      'เพิ่ม L หรือเพิ่มความถี่ → X_L มากขึ้น → จุดเลื่อนไปทาง OPEN ตามขอบกราฟ (r = 0)',
    ],
    start: () => buildCircuit(100e6, 50, []),
    steps: [
      { text: 'ลาก Inductor มาวาง', check: (c) => has(c, 'inductor') },
      { text: 'ตั้ง L = 79.6 nH และ f = 100 MHz', hint: 'X_L = 2π(100M)(79.6n) ≈ 50 Ω → x = +1 (จุดบนสุดของกราฟ)', check: (c) => paramNear(c, 'inductor', 'L', 79.6, 1) && fNear(c, 100) },
      { text: 'ลองเลื่อน L ให้มากขึ้น ดูจุดเคลื่อนไปทาง OPEN', check: (c) => c.elements.some((e) => e.type === 'inductor' && e.params.L > 150) },
    ],
    solution: () => buildCircuit(100e6, 50, [['inductor', 'series', { L: 79.6 }]]),
  },
  {
    id: 'l3', level: 3, phase: 1, title: 'C Load', learn: '−jX, Capacitive → ครึ่งล่างของกราฟ',
    concept: [
      'X_C = −1/(2πfC) เป็นลบ จุดจึงอยู่ครึ่งล่างของ Smith Chart',
      'เพิ่ม C หรือเพิ่มความถี่ → |X_C| ลดลง → จุดเลื่อนไปทาง SHORT',
    ],
    start: () => buildCircuit(100e6, 50, []),
    steps: [
      { text: 'ลาก Capacitor มาวาง', check: (c) => has(c, 'capacitor') },
      { text: 'ตั้ง C = 31.8 pF ที่ f = 100 MHz', hint: 'X_C = −1/(2π·100M·31.8p) ≈ −50 Ω → x = −1 (จุดล่างสุด)', check: (c) => paramNear(c, 'capacitor', 'C', 31.8, 0.5) && fNear(c, 100) },
      { text: 'ลองเพิ่ม C ให้มากขึ้น ดูจุดเคลื่อนไปทาง SHORT', check: (c) => c.elements.some((e) => e.type === 'capacitor' && e.params.C > 80) },
    ],
    solution: () => buildCircuit(100e6, 50, [['capacitor', 'series', { C: 31.8 }]]),
  },
  {
    id: 'l4', level: 4, phase: 1, title: 'Series RL', learn: 'Z_L = R + jX_L',
    concept: [
      'R กำหนดวงกลม r, L กำหนดเส้นโค้ง x บวก จุดคือจุดตัด',
      'ตัวอย่างหลัก: R = 25 Ω, L = 39.8 nH, f = 100 MHz → Z_L = 25 + j25 Ω → z_L = 0.5 + j0.5',
    ],
    start: () => buildCircuit(100e6, 50, []),
    steps: [
      { text: 'ลาก Resistor มาวาง แล้วตั้ง R = 25 Ω', check: (c) => paramNear(c, 'resistor', 'R', 25, 0.5) },
      { text: 'ลาก Inductor มาต่ออนุกรม แล้วตั้ง L = 39.8 nH', check: (c) => paramNear(c, 'inductor', 'L', 39.8, 0.3) && has(c, 'inductor', 'series') },
      { text: 'ตั้งความถี่ f = 100 MHz', check: (c) => fNear(c, 100) },
      { text: 'ตรวจ Smith Chart: จุดควรอยู่ที่ z_L = 0.5 + j0.5', check: (_c, r) => zinNear(r, 0.5, 0.5) },
      { text: 'กด "Explain this circuit" แล้วไล่อ่านทีละขั้น: R → X_L → Z_L → Normalize → r, x → SWR', check: (_c, r) => zinNear(r, 0.5, 0.5) },
    ],
    solution: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 25 }], ['inductor', 'series', { L: 39.8 }]]),
  },
  {
    id: 'l5', level: 5, phase: 1, title: 'Series RC', learn: 'Z_L = R − jX_C',
    concept: [
      'C อนุกรมให้ x ลบ จุดจึงอยู่ครึ่งล่าง',
      'R = 50 Ω, C = 53 pF, f = 100 MHz → X_C ≈ −30 Ω → z = 1 − j0.6',
    ],
    start: () => buildCircuit(100e6, 50, []),
    steps: [
      { text: 'ลาก Resistor แล้วตั้ง R = 50 Ω', check: (c) => paramNear(c, 'resistor', 'R', 50, 0.5) },
      { text: 'ลาก Capacitor มาต่ออนุกรม ตั้ง C = 53 pF', check: (c) => paramNear(c, 'capacitor', 'C', 53, 0.6) && has(c, 'capacitor', 'series') },
      { text: 'ตรวจว่าจุดอยู่บนวงกลม r = 1 ครึ่งล่าง (z ≈ 1 − j0.6)', check: (_c, r) => zinNear(r, 1, -0.6, 0.06) },
      { text: 'ต่อ L อนุกรมอีกตัวเพื่อยกจุดกลับมาศูนย์กลาง (ต้องการ X_L = +30 Ω → L ≈ 47.7 nH)', check: (_c, r) => matched(r) },
    ],
    solution: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['capacitor', 'series', { C: 53 }], ['inductor', 'series', { L: 47.7 }]]),
  },
  {
    id: 'l6', level: 6, phase: 1, title: 'Series RLC', learn: 'การหักล้างระหว่าง L กับ C → Resonance',
    concept: [
      'X = X_L + X_C ถ้า X = 0 วงจรเกิด resonance และ Z_L = R',
      'ปรับ C จน X_C = −X_L จุดจะกลับมาบนแกนนอน ถ้า R = Z₀ จะอยู่ที่ศูนย์กลางพอดี',
    ],
    start: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['inductor', 'series', { L: 95.5 }], ['capacitor', 'series', { C: 53 }]]),
    steps: [
      { text: 'ดูค่า: X_L ≈ +60 Ω, X_C ≈ −30 Ω → X = +30 → z = 1 + j0.6', check: (_c, r) => zinNear(r, 1, 0.6, 0.08) || true },
      { text: 'เลื่อนสไลเดอร์ C จน X_C = −60 Ω (C ≈ 26.5 pF) จุดจะกลับมาที่ 1 + j0', hint: 'นี่คือ Resonance และ Matching พร้อมกัน', check: (_c, r) => matched(r) },
      { text: 'ลองเลื่อนความถี่ขึ้น/ลง แล้วสังเกตว่าจุดออกจากศูนย์กลางไปทางไหน', check: (c) => !fNear(c, 100) },
    ],
    solution: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['inductor', 'series', { L: 95.5 }], ['capacitor', 'series', { C: 26.5 }]]),
  },
  {
    id: 'l7', level: 7, phase: 2, title: 'Parallel RL / RC / RLC', learn: 'เริ่มใช้ Admittance (Y = G + jB)',
    concept: [
      'อุปกรณ์ขนานบวก admittance กัน: Y = 1/R + 1/(jωL) + jωC',
      'บน Smith Chart การเพิ่ม susceptance คือการเดินตามวงกลม g คงที่ (เปิดกราฟ Y)',
    ],
    start: () => buildCircuit(100e6, 50, []),
    steps: [
      { text: 'ลาก Resistor ไปวางในช่อง "ขนาน" ใต้สาย (หรือวางแล้วสลับเป็น Shunt) ตั้ง R = 100 Ω', check: (c) => has(c, 'resistor', 'shunt') },
      { text: 'ลาก Capacitor มาวางขนานอีกตัว ตั้ง C = 31.8 pF', hint: 'B_C = 2πfC = 0.02 S → b = 1', check: (c) => has(c, 'capacitor', 'shunt') },
      { text: 'เปิดกราฟ Y (ปุ่ม Y-grid) แล้วดูว่า y = 0.5 + j1', check: (_c, r) => { const y = admittance(r.zin); return Number.isFinite(y.re) && near(y.re, 0.5, 0.06) && near(y.im, 1, 0.1); } },
      { text: 'เพิ่ม Inductor ขนาน ปรับ L จน b หักล้างกัน (L ≈ 79.6 nH) → y = 0.5 + j0 (parallel resonance)', check: (_c, r) => { const y = admittance(r.zin); return Number.isFinite(y.re) && Math.abs(y.im) < 0.06 && has(_c, 'inductor', 'shunt'); } },
    ],
    solution: () => buildCircuit(100e6, 50, [['resistor', 'shunt', { R: 100 }], ['capacitor', 'shunt', { C: 31.8 }], ['inductor', 'shunt', { L: 79.6 }]]),
  },
  {
    id: 'l8', level: 8, phase: 2, bookPriority: true, title: 'Transmission Line + Load', learn: 'Impedance เปลี่ยนตามตำแหน่งบนสาย',
    concept: [
      'บนสายไร้การสูญเสีย |Γ| คงที่ อิมพีแดนซ์ที่ระยะ d จากโหลดอ่านได้โดยหมุนตามวงกลม SWR ไปทาง generator เป็นระยะ d/λ',
      'หมุนครบ 0.5 λ = กลับมาที่เดิม, 0.25 λ = impedance inversion',
    ],
    start: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.1, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]),
    steps: [
      { text: 'ดูจุดโหลด z_L = 2 − j1 (สีแดง) และจุด z_in หลังสาย 0.1 λ (สีเขียว) บนวงกลม SWR เดียวกัน', check: () => true },
      { text: 'คลิกสายส่ง เปิด Probe แล้วลากตำแหน่งวัดไปมา ดูจุดสีม่วงหมุนตามวงกลม SWR', check: (_c, r) => r.stages.some((s) => s.kind === 'line') },
      { text: 'ตั้งความยาวสาย 0.25 λ แล้วดู z_in: จะได้ 1/z_L (impedance inversion)', check: (c) => paramNear(c, 'tline', 'len', 0.25, 0.005) },
      { text: 'ตั้งความยาว 0.5 λ: z_in กลับมาเท่ากับ z_L', check: (c) => paramNear(c, 'tline', 'len', 0.5, 0.005) },
    ],
    solution: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.25, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]),
  },
  {
    id: 'l9', level: 9, phase: 2, bookPriority: true, title: 'Quarter-Wave Transformer', learn: 'Impedance transformation ด้วยสาย λ/4',
    concept: [
      'สาย λ/4 ที่มี Z_t ให้ Z_in = Z_t²/Z_L',
      'เลือก Z_t = √(Z₀·R_L) จะได้ Z_in = Z₀ (ใช้ได้กับโหลดจำนวนจริง)',
    ],
    start: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 100 }]]),
    steps: [
      { text: 'โหลด R = 100 Ω → z = 2 (SWR = 2) ต้องการทำให้เป็น 50 Ω', check: () => true },
      { text: 'ลาก λ/4 Transformer มาวางระหว่าง Source กับ R', check: (c) => has(c, 'qwt') && c.elements.findIndex((e) => e.type === 'qwt') < c.elements.findIndex((e) => e.type === 'resistor') },
      { text: 'ตั้ง Z_t = √(50 × 100) = 70.7 Ω (หรือกดปุ่ม Auto Z_t)', hint: 'สังเกต path หมุนครึ่งรอบมาที่ศูนย์กลาง', check: (_c, r) => matched(r) && has(_c, 'qwt') },
    ],
    solution: () => buildCircuit(100e6, 50, [['qwt', 'series', { Zt: 70.71 }], ['resistor', 'series', { R: 100 }]]),
  },
  {
    id: 'l10', level: 10, phase: 3, bookPriority: true, title: 'Shunt Short Stub', learn: 'Single-stub matching',
    concept: [
      'ขั้นที่ 1: เดินตามวงกลม SWR จากโหลดไปทาง generator ระยะ d จน y = 1 ± jb (อยู่บนวงกลม g = 1)',
      'ขั้นที่ 2: ใส่สตับขนานที่ให้ susceptance ∓jb เพื่อหักล้าง → y = 1 → ศูนย์กลาง',
      'โหลดตัวอย่าง (Pozar Ex.5.2): Z_L = 60 − j80 Ω ที่ Z₀ = 50 Ω',
    ],
    start: () => buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: 0.02 }], ['tline', 'series', { Z0: 50, len: 0.02, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]),
    steps: [
      { text: 'คลิกสตับ แล้วเลื่อนสไลเดอร์ "ตำแหน่งสตับ d" จนจุดหลังสาย (สีส้ม) อยู่บนวงกลม g = 1 (เปิดกราฟ Y ช่วยดู)', hint: 'คำตอบมี 2 ค่า: d ≈ 0.110 λ หรือ 0.260 λ', check: (_c, r) => { const s = r.stages.find((st) => st.kind === 'line'); if (!s) return false; const y = admittance(s.zafter); return Number.isFinite(y.re) && near(y.re, 1, 0.05); } },
      { text: 'เลื่อน "ความยาวสตับ l" จน b ของสตับหักล้าง b ของสาย → จุดเข้าศูนย์กลาง', hint: 'สำหรับ d = 0.110 λ ต้องการ l ≈ 0.095 λ', check: (_c, r) => matched(r) },
      { text: 'เมื่อวงจรถูกต้องแล้ว แถบสรุปจะเปลี่ยนจาก NOT MATCHED เป็น ✓ MATCHED · จากนั้นลองเปลี่ยนความถี่เล็กน้อย ดูว่าหลุดเร็วแค่ไหน (bandwidth)', check: (_c, r) => matched(r) },
    ],
    solution: () => buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: 0.095 }], ['tline', 'series', { Z0: 50, len: 0.11, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]),
  },
  {
    id: 'l11', level: 11, phase: 3, bookPriority: true, title: 'Open Stub', learn: 'เปรียบเทียบกับ Short Stub',
    concept: [
      'สตับปลายเปิดให้ b = tan(βl) ส่วนปลายลัดให้ b = −cot(βl) ต่างกัน λ/4 พอดี',
      'สำหรับ b เดียวกัน ความยาวสตับสองแบบต่างกัน 0.25 λ (ปลายเปิดนิยมใน microstrip)',
    ],
    start: () => buildCircuit(2e9, 50, [['stub_open', 'shunt', { Z0: 50, len: 0.02 }], ['tline', 'series', { Z0: 50, len: 0.11, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]),
    steps: [
      { text: 'ตำแหน่งสตับตั้งไว้ที่ d = 0.110 λ แล้ว (y = 1 + j1.47) เลื่อนความยาวสตับปลายเปิดจน match', hint: 'ต้องการ b = −1.47 → l ≈ 0.345 λ (= 0.095 + 0.25)', check: (_c, r) => matched(r) },
      { text: 'เปรียบเทียบ: short stub ใช้ l ≈ 0.095 λ, open stub ใช้ l ≈ 0.345 λ ต่างกัน 0.25 λ', check: (_c, r) => matched(r) },
    ],
    solution: () => buildCircuit(2e9, 50, [['stub_open', 'shunt', { Z0: 50, len: 0.345 }], ['tline', 'series', { Z0: 50, len: 0.11, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]),
  },
  {
    id: 'l12', level: 12, phase: 3, bookPriority: true, title: 'Double Stub', learn: 'Matching ขั้นสูงโดยไม่ต้องเลื่อนตำแหน่งสตับ',
    concept: [
      'สตับ 2 ตัวห่างกันคงที่ (มัก λ/8) สตับตัวแรกพา y ไปยังวงกลม g = 1 ที่ "หมุนไว้ล่วงหน้า" สตับตัวที่สองหักล้าง b ที่เหลือ',
      'ข้อจำกัด: โหลดที่ g อยู่ในวงกลมต้องห้าม (forbidden region) match ไม่ได้ต้องเลื่อนตำแหน่งสตับตัวแรก',
      'ตัวอย่าง (Pozar Ex.5.4): Z_L = 60 − j80 Ω สตับตัวแรกอยู่ที่โหลด ระยะห่าง λ/8',
    ],
    start: () => buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: 0.02 }], ['tline', 'series', { Z0: 50, len: 0.125, vf: 0.66, lossDb: 0 }], ['stub_short', 'shunt', { Z0: 50, len: 0.02 }], ['tline', 'series', { Z0: 50, len: 0, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]),
    steps: [
      { text: 'เปิดกราฟ Y แล้วเลื่อนความยาวสตับตัวที่ 1 (ใกล้โหลด) จนหลังหมุนผ่านสาย λ/8 จุดตกบนวงกลม g = 1', hint: 'เฉลย: l₁ ≈ 0.232 λ (หรือ 0.396 λ) กดปุ่ม "เฉลย" ในแผงบทเรียนหากติด', check: (_c, r) => { const s = r.stages.filter((st) => st.kind === 'line'); const s2 = s[1]; if (!s2) return false; const y = admittance(s2.zafter); return Number.isFinite(y.re) && near(y.re, 1, 0.06); } },
      { text: 'เลื่อนความยาวสตับตัวที่ 2 (ใกล้แหล่งจ่าย) จน b หักล้าง → ✓ MATCHED', hint: 'เฉลย: l₂ ≈ 0.100 λ (คู่กับ l₁ = 0.232 λ)', check: (_c, r) => matched(r) },
    ],
    solution: () => buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: 0.1 }], ['tline', 'series', { Z0: 50, len: 0.125, vf: 0.66, lossDb: 0 }], ['stub_short', 'shunt', { Z0: 50, len: 0.232 }], ['tline', 'series', { Z0: 50, len: 0, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]),
  },
  {
    id: 'l13', level: 13, phase: 3, title: 'L-Matching Network', learn: 'ใช้ L + C สองตัวพาจุดเข้าศูนย์กลาง',
    concept: [
      'อุปกรณ์อนุกรมเดินตามวงกลม r คงที่, อุปกรณ์ขนานเดินตามวงกลม g คงที่',
      'กลยุทธ์: ตัวแรกพาจุดไปยังวงกลม r = 1 หรือ g = 1, ตัวที่สองเดินตามวงกลมนั้นเข้าศูนย์กลาง',
      'ตัวอย่าง: Z_L = 200 − j100 Ω ที่ 500 MHz (Pozar Ex.5.1)',
    ],
    start: () => buildCircuit(500e6, 100, [['load', 'series', { R: 200, X: -100 }]]),
    steps: [
      { text: 'โหลด z_L = 2 − j1 อยู่ในวงกลม r = 1 (R_L > Z₀) → เริ่มด้วยอุปกรณ์ขนาน', check: () => true },
      { text: 'ลาก Capacitor ไปวางขนาน (ระหว่าง Source กับโหลด) ปรับ C จนจุดตกบนวงกลม r = 1 (เปิดกราฟ Y ช่วย)', hint: 'C ≈ 0.92 pF', check: (_c, r) => { const s = r.stages.find((st) => !st.inLoad); return !!s && s.kind === 'shunt' && Number.isFinite(s.zafter.re) && near(s.zafter.re, 1, 0.08); } },
      { text: 'ลาก Inductor มาต่ออนุกรมด้านแหล่งจ่าย ปรับ L จนจุดเข้าศูนย์กลาง', hint: 'L ≈ 38.8 nH', check: (_c, r) => matched(r) },
    ],
    solution: () => buildCircuit(500e6, 100, [['inductor', 'series', { L: 38.8 }], ['capacitor', 'shunt', { C: 0.92 }], ['load', 'series', { R: 200, X: -100 }]]),
  },
  {
    id: 'l14', level: 14, phase: 3, title: 'π / T Matching', learn: 'Matching network ขั้นสูง (3 อุปกรณ์)',
    concept: [
      'π-network = ขนาน–อนุกรม–ขนาน, T-network = อนุกรม–ขนาน–อนุกรม',
      'มีอิสระเพิ่มขึ้น 1 ตัว จึงเลือก Q (bandwidth) ของวงจรได้',
    ],
    start: () => buildCircuit(100e6, 50, [['capacitor', 'shunt', { C: 20 }], ['inductor', 'series', { L: 60 }], ['capacitor', 'shunt', { C: 20 }], ['load', 'series', { R: 200, X: 0 }]]),
    steps: [
      { text: 'ทดลองปรับ C ตัวใกล้โหลด → จุดเดินตามวงกลม g คงที่', check: () => true },
      { text: 'ปรับ L อนุกรม → จุดเดินตามวงกลม r คงที่', check: () => true },
      { text: 'ปรับ C ตัวใกล้แหล่งจ่ายจนเข้าศูนย์กลาง (✓ MATCHED)', hint: 'เฉลยหนึ่งชุด (R_v = 20 Ω): C ใกล้โหลด ≈ 23.9 pF, L ≈ 134.5 nH, C ใกล้แหล่งจ่าย ≈ 39.0 pF', check: (_c, r) => matched(r) },
    ],
    solution: () => buildCircuit(100e6, 50, [['capacitor', 'shunt', { C: 39.0 }], ['inductor', 'series', { L: 134.5 }], ['capacitor', 'shunt', { C: 23.9 }], ['load', 'series', { R: 200, X: 0 }]]),
  },
];

export const EXAMPLES: Example[] = [
  { id: 'ex1', title: 'Example 01', subtitle: '50 Ω Resistive Load', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }]]) },
  { id: 'ex2', title: 'Example 02', subtitle: '25 + j25 Ω RL Load', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 25 }], ['inductor', 'series', { L: 39.8 }]]) },
  { id: 'ex3', title: 'Example 03', subtitle: '50 − j30 Ω RC Load', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['capacitor', 'series', { C: 53.05 }]]) },
  { id: 'ex4', title: 'Example 04', subtitle: 'Series RLC Resonance', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['inductor', 'series', { L: 95.5 }], ['capacitor', 'series', { C: 53 }]]) },
  { id: 'ex5', title: 'Example 05', subtitle: 'Mismatched Antenna บนสาย 0.3 λ', circuit: () => buildCircuit(300e6, 50, [['tline', 'series', { Z0: 50, len: 0.3, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
  { id: 'ex6', title: 'Example 06', subtitle: 'Quarter-Wave Transformer', circuit: () => buildCircuit(100e6, 50, [['qwt', 'series', { Zt: 70.71 }], ['resistor', 'series', { R: 100 }]]) },
  { id: 'ex7', title: 'Example 07', subtitle: 'Short Stub Matching (60 − j80 Ω)', circuit: () => buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: 0.095 }], ['tline', 'series', { Z0: 50, len: 0.11, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]) },
  { id: 'ex8', title: 'Example 08', subtitle: 'Double Stub Matching (λ/8)', circuit: () => buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: 0.1 }], ['tline', 'series', { Z0: 50, len: 0.125, vf: 0.66, lossDb: 0 }], ['stub_short', 'shunt', { Z0: 50, len: 0.232 }], ['tline', 'series', { Z0: 50, len: 0, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]) },
  { id: 'ex9', title: 'Example 09', subtitle: 'L-Section Match (200 − j100 Ω)', circuit: () => buildCircuit(500e6, 100, [['inductor', 'series', { L: 38.8 }], ['capacitor', 'shunt', { C: 0.92 }], ['load', 'series', { R: 200, X: -100 }]]) },
  { id: 'ex10', title: 'Example 10', subtitle: 'Parallel RLC', circuit: () => buildCircuit(100e6, 50, [['resistor', 'shunt', { R: 100 }], ['capacitor', 'shunt', { C: 31.8 }], ['inductor', 'shunt', { L: 79.6 }]]) },
  { id: 'ex12', title: 'Caron Ex. 1', subtitle: 'Narrowband 12.0–12.4 MHz: shunt L 1.63 μH + series L 1.255 μH (SWR ≤ 2)', circuit: () => buildCircuit(12.2e6, 50, [['inductor', 'series', { L: 1255 }], ['inductor', 'shunt', { L: 1630 }], ['antenna', 'series', {}, [{ f: 12.0e6, R: 10, X: -60 }, { f: 12.2e6, R: 16.5, X: -55 }, { f: 12.4e6, R: 20, X: -50 }]]]) },
  { id: 'ex13', title: 'Caron Ex. 2', subtitle: 'Line transformer 83 Ω (0.141 λ) 50–54 MHz (SWR ≈ 1.5)', circuit: () => buildCircuit(52e6, 50, [['tline', 'series', { Z0: 83, len: 0.141, vf: 0.66, lossDb: 0 }], ['antenna', 'series', {}, [{ f: 50e6, R: 52, X: -45 }, { f: 51e6, R: 67.5, X: -32.5 }, { f: 52e6, R: 87, X: -20 }, { f: 53e6, R: 120, X: -26 }, { f: 54e6, R: 110, X: -70 }]]]) },
  { id: 'ex14', title: 'Caron Ex. 5', subtitle: 'Short vertical 28–30 MHz: series L, shunt L, RG-8 2.8 ft, 25-Ω stub 5.56 ft', circuit: () => buildCircuit(29e6, 50, [['stub_short', 'shunt', { Z0: 25, len: 0.2484 }], ['tline', 'series', { Z0: 50, len: 0.1251, vf: 0.66, lossDb: 0 }], ['inductor', 'shunt', { L: 272 }], ['inductor', 'series', { L: 467 }], ['antenna', 'series', {}, [{ f: 28e6, R: 20, X: -120 }, { f: 29e6, R: 20, X: -110 }, { f: 30e6, R: 20, X: -100 }]]]) },
  { id: 'ex11', title: 'Example 11', subtitle: 'L-match Z_S = 25 Ω → Z_L = 400 Ω @ 1 GHz (Test & Measurement Tips)', circuit: () => buildCircuit(1e9, 25, [['inductor', 'series', { L: 15.41 }], ['capacitor', 'shunt', { C: 1.541 }], ['load', 'series', { R: 400, X: 0 }]]) },
];


// ---------------------------------------------------------------
// Practice problems: Impedance (Z) set and Admittance (Y) set.
// Expected answers are computed from the solution circuit so the
// numbers can never drift from the engine.
// ---------------------------------------------------------------
const yOf = (z: Complex) => admittance(z);
const ansOk = (ctx?: CheckCtx) => !!ctx?.answersOk;
const stageOf = (r: SolveResult, kind: 'line' | 'shunt' | 'series' | 'stub', nth = 0) => r.stages.filter((s) => s.kind === kind)[nth];

export const PROBLEMS: Lesson[] = [
  // ================= IMPEDANCE =================
  {
    id: 'pz1', level: 1, phase: 1, kind: 'problem', category: 'impedance', title: 'Z-1 อ่านค่าโหลดบน Smith Chart', learn: 'Normalize → r, x → |Γ| → SWR',
    statement: 'โหลด Z_L = 100 + j50 Ω ต่อกับระบบ Z₀ = 50 Ω จงหาค่าปกติ z_L = r + jx, ขนาดสัมประสิทธิ์การสะท้อน |Γ| และ SWR จากนั้นสร้างวงจรด้วยบล็อก Load Z_L เพื่อตรวจคำตอบบน Smith Chart',
    concept: ['z = Z/Z₀ · Γ = (z − 1)/(z + 1) · SWR = (1 + |Γ|)/(1 − |Γ|)'],
    start: () => buildCircuit(100e6, 50, []),
    answers: [
      { key: 'r', label: 'r', unit: '', tol: 0.02, value: (r) => r.zin.re, tex: 'r = R_L/Z_0' },
      { key: 'x', label: 'x', unit: '', tol: 0.02, value: (r) => r.zin.im, tex: 'x = X_L/Z_0' },
      { key: 'gamma', label: '|Γ|', unit: '', tol: 0.03, value: (r) => abs(r.gammaIn), tex: '|\\Gamma| = |z-1|/|z+1|' },
      { key: 'swr', label: 'SWR', unit: '', tol: 0.03, value: (r) => r.swrIn, tex: 'SWR = (1+|\\Gamma|)/(1-|\\Gamma|)' },
    ],
    steps: [
      { text: 'วางบล็อก Load Z_L แล้วตั้ง R_L = 100 Ω, X_L = 50 Ω (Z₀ = 50 Ω)', check: (_c, r) => zinNear(r, 2, 1) },
      { text: 'กรอกคำตอบ r, x, |Γ|, SWR แล้วกด "ตรวจคำตอบ" (เทียบกับค่าที่อ่านได้จากแผง SMITH CHART)', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 50, [['load', 'series', { R: 100, X: 50 }]]),
  },
  {
    id: 'pz2', level: 2, phase: 1, kind: 'problem', category: 'impedance', title: 'Z-2 ออกแบบ RC อนุกรมให้ได้จุดที่กำหนด', learn: 'จาก z ที่ต้องการ ย้อนกลับไปหาค่าอุปกรณ์',
    statement: 'ต้องการโหลด z_L = 1 − j1 (Z₀ = 50 Ω) ที่ความถี่ 100 MHz โดยใช้ R ต่ออนุกรมกับ C จงหาค่า R และ C แล้วสร้างวงจรให้จุดตกที่ z = 1 − j1',
    concept: ['X_C = −1/(2πfC) → C = 1/(2πf|X_C|)'],
    start: () => buildCircuit(100e6, 50, []),
    answers: [
      { key: 'R', label: 'R', unit: 'Ω', tol: 0.02, value: (_r, c) => c.elements.find((e) => e.type === 'resistor')!.params.R, tex: 'R = r Z_0' },
      { key: 'C', label: 'C', unit: 'pF', tol: 0.03, value: (_r, c) => c.elements.find((e) => e.type === 'capacitor')!.params.C, tex: 'C = 1/(2\\pi f |X_C|)' },
    ],
    steps: [
      { text: 'สร้างวงจร Source — R — C (อนุกรม) แล้วปรับค่าจนจุดอยู่ที่ z = 1 − j1', check: (_c, r) => zinNear(r, 1, -1, 0.04) && has(_c, 'resistor') && has(_c, 'capacitor', 'series') },
      { text: 'กรอกคำตอบ R และ C แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['capacitor', 'series', { C: 31.83 }]]),
  },
  {
    id: 'pz3', level: 3, phase: 1, kind: 'problem', category: 'impedance', title: 'Z-3 จากจุดบนกราฟกลับเป็นค่าจริง', learn: 'Denormalize ด้วย Z₀ ที่ไม่ใช่ 50 Ω',
    statement: 'บน Smith Chart ของระบบ Z₀ = 75 Ω มีจุดโหลดที่ r = 0.4, x = −0.8 จงหา Z_L = R_L + jX_L (Ω) และ SWR แล้วตั้ง Z₀ = 75 Ω และสร้างวงจรด้วยบล็อก Load Z_L ให้ตรงกับจุดนี้',
    concept: ['Z = z·Z₀ · จุดเดียวกันบนกราฟแทนอิมพีแดนซ์ต่างกันเมื่อ Z₀ ต่างกัน'],
    start: () => buildCircuit(100e6, 75, []),
    answers: [
      { key: 'RL', label: 'R_L', unit: 'Ω', tol: 0.02, value: (r) => r.Zin.re, tex: 'R_L = r Z_0' },
      { key: 'XL', label: 'X_L', unit: 'Ω', tol: 0.02, value: (r) => r.Zin.im, tex: 'X_L = x Z_0' },
      { key: 'swr', label: 'SWR', unit: '', tol: 0.03, value: (r) => r.swrIn },
    ],
    steps: [
      { text: 'ตั้ง Z₀ = 75 Ω (แถบบน Canvas) แล้ววางบล็อก Load Z_L ให้จุดอยู่ที่ 0.4 − j0.8', check: (c, r) => Math.abs(c.Z0 - 75) < 0.5 && zinNear(r, 0.4, -0.8, 0.04) },
      { text: 'กรอกคำตอบ R_L, X_L, SWR แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 75, [['load', 'series', { R: 30, X: -60 }]]),
  },
  {
    id: 'pz4', level: 4, phase: 2, kind: 'problem', category: 'impedance', title: 'Z-4 อิมพีแดนซ์ที่ต้นสายส่ง', learn: 'หมุนตามวงกลม SWR เป็นระยะ l/λ',
    statement: 'โหลด Z_L = 25 + j25 Ω ต่อกับสายส่ง Z₀ = 50 Ω ยาว 0.15 λ จงหา z_in = r_in + jx_in ที่ต้นสาย และ SWR บนสาย แล้วสร้างวงจร Source — TL(0.15 λ) — Load เพื่อตรวจ',
    concept: ['สายไร้การสูญเสีย: |Γ| และ SWR คงที่ตลอดสาย จุดหมุนตามเข็ม 2βl = 720°·(l/λ)'],
    start: () => buildCircuit(100e6, 50, []),
    answers: [
      { key: 'rin', label: 'r_in', unit: '', tol: 0.03, value: (r) => r.zin.re },
      { key: 'xin', label: 'x_in', unit: '', tol: 0.03, tolAbs: 0.03, value: (r) => r.zin.im },
      { key: 'swr', label: 'SWR', unit: '', tol: 0.03, value: (r) => r.swrIn },
    ],
    steps: [
      { text: 'สร้างวงจร Source — Transmission Line (50 Ω, 0.15 λ) — Load Z_L (25 + j25)', check: (c, r) => has(c, 'tline') && paramNear(c, 'tline', 'len', 0.15, 0.003) && Number.isFinite(r.zL.re) && near(r.zL.re, 0.5, 0.03) && near(r.zL.im, 0.5, 0.03) },
      { text: 'กรอกคำตอบ r_in, x_in, SWR แล้วกด "ตรวจคำตอบ" (ลองใช้ Probe ดูค่าตามตำแหน่งบนสาย)', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.15, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 25, X: 25 }]]),
  },
  {
    id: 'pz5', level: 5, phase: 2, kind: 'problem', category: 'impedance', title: 'Z-5 ออกแบบหม้อแปลง λ/4', learn: 'Z_t = √(Z₀·R_L)',
    statement: 'โหลดตัวต้านทาน 20 Ω ต้องการ match กับสาย 50 Ω ด้วยหม้อแปลงหนึ่งในสี่คลื่น จงหา Z_t และ SWR ของโหลดก่อน match แล้วสร้างวงจร Source — λ/4 — R ให้ ✓ MATCHED',
    concept: ['Z_in = Z_t²/R_L = Z₀ → Z_t = √(Z₀ R_L)'],
    start: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 20 }]]),
    answers: [
      { key: 'Zt', label: 'Z_t', unit: 'Ω', tol: 0.02, value: (_r, c) => c.elements.find((e) => e.type === 'qwt')!.params.Zt, tex: 'Z_t = \\sqrt{Z_0 R_L}' },
      { key: 'swrL', label: 'SWR ก่อน match', unit: '', tol: 0.03, value: (r) => r.swrL },
    ],
    steps: [
      { text: 'วาง λ/4 Transformer ระหว่าง Source กับ R แล้วตั้ง Z_t ให้ได้ ✓ MATCHED', check: (c, r) => has(c, 'qwt') && matched(r) },
      { text: 'กรอกคำตอบ Z_t และ SWR ก่อน match แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 50, [['qwt', 'series', { Zt: 31.62 }], ['resistor', 'series', { R: 20 }]]),
  },
  // ================= ADMITTANCE =================
  {
    id: 'py1', level: 1, phase: 2, kind: 'problem', category: 'admittance', title: 'Y-1 แปลง z เป็น y แล้ว match ด้วยตัวขนาน', learn: 'y = 1/z · จุดบนวงกลม g = 1 ใส่ b ขนานหักล้างได้ทันที',
    statement: 'โหลด z_L = 0.5 + j0.5 (R = 25 Ω อนุกรม L = 39.8 nH ที่ 100 MHz, Z₀ = 50 Ω) จงหา y_L = g + jb ระบุว่าอยู่บนวงกลม g เท่าใด และต้องต่อตัวเก็บประจุขนานกี่ pF ที่ต้นวงจรจึงจะ match พอดี แล้วสร้างวงจรให้ ✓ MATCHED',
    concept: ['y = 1/z = (r − jx)/(r² + x²) · อุปกรณ์ขนานเดินตามวงกลม g คงที่ · b_C = 2πfC·Z₀'],
    start: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 25 }], ['inductor', 'series', { L: 39.8 }]]),
    answers: [
      { key: 'g', label: 'g', unit: '', tol: 0.02, value: (r) => yOf(stageOf(r, 'shunt').zbefore).re, tex: 'g = r/(r^2+x^2)' },
      { key: 'b', label: 'b', unit: '', tol: 0.02, value: (r) => yOf(stageOf(r, 'shunt').zbefore).im, tex: 'b = -x/(r^2+x^2)' },
      { key: 'C', label: 'C ขนาน', unit: 'pF', tol: 0.03, value: (_r, c) => c.elements.find((e) => e.type === 'capacitor')!.params.C, tex: 'C = b_C/(2\\pi f Z_0)' },
    ],
    steps: [
      { text: 'เปิดกราฟ Y แล้วอ่าน y ของโหลด (จุดเดิม อ่านด้วยวงกลมสีเขียว)', check: () => true },
      { text: 'ลาก Capacitor วางขนาน (⏚) ระหว่าง Source กับ R ปรับ C จน ✓ MATCHED', check: (c, r) => has(c, 'capacitor', 'shunt') && matched(r) },
      { text: 'กรอกคำตอบ g, b และ C แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 50, [['capacitor', 'shunt', { C: 31.83 }], ['resistor', 'series', { R: 25 }], ['inductor', 'series', { L: 39.8 }]]),
  },
  {
    id: 'py2', level: 2, phase: 2, kind: 'problem', category: 'admittance', title: 'Y-2 หา admittance ของสายอากาศ', learn: 'y = g + jb และ Y = G + jB (S)',
    statement: 'สายอากาศมี Z_L = 100 − j50 Ω บนระบบ Z₀ = 50 Ω จงหา y_L = g + jb (ค่าปกติ) และ Y_L = G + jB (หน่วย S) แล้วสร้างวงจรด้วยบล็อก Load Z_L และเปิดกราฟ Y ตรวจคำตอบ',
    concept: ['Y = 1/Z · y = Y·Z₀ = Y/Y₀'],
    start: () => buildCircuit(300e6, 50, []),
    answers: [
      { key: 'g', label: 'g', unit: '', tol: 0.02, value: (r) => yOf(r.zin).re },
      { key: 'b', label: 'b', unit: '', tol: 0.02, value: (r) => yOf(r.zin).im },
      { key: 'G', label: 'G', unit: 'S', tol: 0.02, value: (r) => yOf(r.zin).re / r.circuit.Z0, tex: 'G = g/Z_0' },
      { key: 'B', label: 'B', unit: 'S', tol: 0.02, value: (r) => yOf(r.zin).im / r.circuit.Z0, tex: 'B = b/Z_0' },
    ],
    steps: [
      { text: 'วางบล็อก Load Z_L = 100 − j50 Ω แล้วเปิดกราฟ Y', check: (_c, r) => zinNear(r, 2, -1) },
      { text: 'กรอกคำตอบ g, b, G, B แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(300e6, 50, [['load', 'series', { R: 100, X: -50 }]]),
  },
  {
    id: 'py3', level: 3, phase: 2, kind: 'problem', category: 'admittance', title: 'Y-3 วงจร RL ขนาน', learn: 'บวก admittance ของอุปกรณ์ขนาน แล้วกลับเป็น z',
    statement: 'R = 100 Ω ต่อขนานกับ L = 79.6 nH ที่ 100 MHz (Z₀ = 50 Ω) จงหา y = g + jb และ z = r + jx แล้วสร้างวงจรโดยวาง R และ L แบบขนาน (⏚) เพื่อตรวจ',
    concept: ['g = Z₀/R · b_L = −Z₀/(2πfL) · z = 1/y'],
    start: () => buildCircuit(100e6, 50, []),
    answers: [
      { key: 'g', label: 'g', unit: '', tol: 0.02, value: (r) => yOf(r.zin).re, tex: 'g = Z_0/R' },
      { key: 'b', label: 'b', unit: '', tol: 0.02, value: (r) => yOf(r.zin).im, tex: 'b_L = -Z_0/(2\\pi f L)' },
      { key: 'r', label: 'r', unit: '', tol: 0.02, value: (r) => r.zin.re },
      { key: 'x', label: 'x', unit: '', tol: 0.02, value: (r) => r.zin.im },
    ],
    steps: [
      { text: 'วาง Resistor แบบขนาน (⏚) ตั้ง 100 Ω และ Inductor แบบขนาน ตั้ง 79.6 nH', check: (c, r) => has(c, 'resistor', 'shunt') && has(c, 'inductor', 'shunt') && Number.isFinite(r.zin.re) && near(yOf(r.zin).re, 0.5, 0.03) && near(yOf(r.zin).im, -1, 0.05) },
      { text: 'กรอกคำตอบ g, b, r, x แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 50, [['resistor', 'shunt', { R: 100 }], ['inductor', 'shunt', { L: 79.58 }]]),
  },
  {
    id: 'py4', level: 4, phase: 3, kind: 'problem', category: 'admittance', title: 'Y-4 Single-stub matching (Pozar 5.2)', learn: 'หา d ที่ g = 1 แล้วหา l ของสตับจาก b',
    statement: 'โหลด Z_L = 60 − j80 Ω, Z₀ = 50 Ω ที่ 2 GHz จงหา (1) y_L = g_L + jb_L (2) ระยะ d จากโหลดที่น้อยที่สุดที่ทำให้ g = 1 (3) ค่า b ที่จุดนั้น (4) ความยาวสตับปลายลัดวงจร l ที่หักล้าง b แล้วสร้างวงจร Source — Stub(⏚) — TL(d) — Load ให้ ✓ MATCHED',
    concept: ['เดินตามวงกลม SWR จนตัดวงกลม g = 1 · สตับลัดวงจร: b = −cot βl'],
    start: () => buildCircuit(2e9, 50, [['load', 'series', { R: 60, X: -80 }]]),
    answers: [
      { key: 'gL', label: 'g_L', unit: '', tol: 0.03, value: (r) => yOf(r.zL).re },
      { key: 'bL', label: 'b_L', unit: '', tol: 0.03, value: (r) => yOf(r.zL).im },
      { key: 'd', label: 'd', unit: 'λ', tol: 0.03, tolAbs: 0.004, value: (r) => stageOf(r, 'line').el.params.len },
      { key: 'bAt', label: 'b ที่ตำแหน่งสตับ', unit: '', tol: 0.03, value: (r) => yOf(stageOf(r, 'line').zafter).im },
      { key: 'l', label: 'l สตับ', unit: 'λ', tol: 0.03, tolAbs: 0.004, value: (r) => stageOf(r, 'stub').el.params.len },
    ],
    steps: [
      { text: 'วาง Short Stub (⏚) และ Transmission Line ระหว่าง Source กับโหลด แล้วปรับ d และ l จน ✓ MATCHED', check: (c, r) => has(c, 'stub_short') && has(c, 'tline') && matched(r) },
      { text: 'กรอกคำตอบทั้ง 5 ค่า แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: 0.095 }], ['tline', 'series', { Z0: 50, len: 0.1104, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]),
  },
  {
    id: 'py5', level: 5, phase: 3, kind: 'problem', category: 'admittance', title: 'Y-5 L-section ด้วย admittance (Pozar 5.1)', learn: 'C ขนานพา y ไปตัดวงกลม r = 1 แล้ว L อนุกรมเข้าศูนย์กลาง',
    statement: 'Z_L = 200 − j100 Ω, Z₀ = 100 Ω ที่ 500 MHz จงหา (1) y_L (2) susceptance ปกติ b ของ C ขนานที่ทำให้จุดตกบนวงกลม r = 1 (เลือกค่าบวก) (3) reactance ปกติ x ของ L อนุกรมที่พาจุดเข้าศูนย์กลาง แล้วสร้างวงจร Source — L — C(⏚) — Load ให้ ✓ MATCHED',
    concept: ['อุปกรณ์ขนานเดินตามวงกลม g คงที่ · อุปกรณ์อนุกรมเดินตามวงกลม r คงที่'],
    start: () => buildCircuit(500e6, 100, [['load', 'series', { R: 200, X: -100 }]]),
    answers: [
      { key: 'gL', label: 'g_L', unit: '', tol: 0.03, value: (r) => yOf(r.zL).re },
      { key: 'bL', label: 'b_L', unit: '', tol: 0.03, value: (r) => yOf(r.zL).im },
      { key: 'bC', label: 'b ของ C', unit: '', tol: 0.04, value: (r) => (stageOf(r, 'shunt').B ?? 0) * r.circuit.Z0, tex: 'b = B Z_0 = 2\\pi f C Z_0' },
      { key: 'xL', label: 'x ของ L', unit: '', tol: 0.04, value: (r) => (r.stages.find((st) => st.el.type === 'inductor')!.X ?? 0) / r.circuit.Z0, tex: 'x = X/Z_0 = 2\\pi f L/Z_0' },
    ],
    steps: [
      { text: 'วาง Capacitor แบบขนาน (⏚) หน้าโหลด และ Inductor อนุกรมถัดจาก Source ปรับจน ✓ MATCHED', check: (c, r) => has(c, 'capacitor', 'shunt') && has(c, 'inductor', 'series') && matched(r) },
      { text: 'กรอกคำตอบ g_L, b_L, b ของ C, x ของ L แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(500e6, 100, [['inductor', 'series', { L: 38.98 }], ['capacitor', 'shunt', { C: 0.9228 }], ['load', 'series', { R: 200, X: -100 }]]),
  },
  {
    id: 'py6', level: 6, phase: 3, kind: 'problem', category: 'admittance', title: 'Y-6 L-match แหล่งจ่าย 25 Ω → โหลด 400 Ω (Q method)', learn: 'Z_S ≠ 50 Ω: ตั้ง Z₀ = Z_S แล้วออกแบบด้วย Q = √(R_L/R_S − 1)',
    statement: 'แหล่งจ่าย V_S มีอิมพีแดนซ์ Z_S = 25 Ω ที่ f = 1 GHz ต้องการส่งกำลังสูงสุดให้โหลด Z_L = 400 Ω ด้วย L-section (L อนุกรม + C ขนานที่โหลด) จงหา Q ของวงจร, รีแอกแตนซ์ X_L (Ω) และค่า L (nH), susceptance B (S) และค่า C (pF) จากนั้นตั้ง Z₀ = 25 Ω แล้วสร้างวงจร Source — L — C(⏚) — Load 400 Ω ให้ ✓ MATCHED',
    concept: ['ในแอป Z₀ = อิมพีแดนซ์แหล่งจ่าย Z_S (ศูนย์กลางกราฟ = conjugate match กับแหล่งจ่าย)', 'R_L > R_S → C ขนานที่โหลด, L อนุกรม · Q = √(R_L/R_S − 1) · X_L = Q·R_S · B_C = Q/R_L'],
    start: () => buildCircuit(1e9, 25, [['load', 'series', { R: 400, X: 0 }]]),
    answers: [
      { key: 'Q', label: 'Q', unit: '', tol: 0.02, value: (r) => Math.sqrt(r.ZL.re / r.circuit.Z0 - 1), tex: 'Q = \\sqrt{R_L/R_S - 1}' },
      { key: 'X', label: 'X_L', unit: 'Ω', tol: 0.03, value: (r) => r.stages.find((st) => st.el.type === 'inductor')!.X ?? 0, tex: 'X_L = Q R_S' },
      { key: 'L', label: 'L', unit: 'nH', tol: 0.03, value: (_r, c) => c.elements.find((e) => e.type === 'inductor')!.params.L, tex: 'L = X_L/(2\\pi f)' },
      { key: 'B', label: 'B', unit: 'S', tol: 0.03, value: (r) => stageOf(r, 'shunt').B ?? 0, tex: 'B = Q/R_L' },
      { key: 'C', label: 'C', unit: 'pF', tol: 0.03, value: (_r, c) => c.elements.find((e) => e.type === 'capacitor')!.params.C, tex: 'C = B/(2\\pi f)' },
    ],
    steps: [
      { text: 'ตั้ง Z₀ = 25 Ω (= Z_S) แล้ววาง Capacitor แบบขนาน (⏚) หน้าโหลด และ Inductor อนุกรมถัดจาก Source ปรับจน ✓ MATCHED', check: (c, r) => Math.abs(c.Z0 - 25) < 0.5 && has(c, 'capacitor', 'shunt') && has(c, 'inductor', 'series') && matched(r) },
      { text: 'กรอกคำตอบ Q, X_L, L, B, C แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(1e9, 25, [['inductor', 'series', { L: 15.41 }], ['capacitor', 'shunt', { C: 1.541 }], ['load', 'series', { R: 400, X: 0 }]]),
  },
];

// ================= BOOK (Caron) =================
const CH2 = [{ f: 175e6, R: 32, X: 42 }, { f: 200e6, R: 50, X: 65 }, { f: 225e6, R: 100, X: 65 }];
const EX1 = [{ f: 12.0e6, R: 10, X: -60 }, { f: 12.2e6, R: 16.5, X: -55 }, { f: 12.4e6, R: 20, X: -50 }];
const bandMax = (c: Circuit) => sweepMaxSwr(solveSweep(c));
PROBLEMS.push(
  {
    id: 'pb1', level: 1, phase: 2, kind: 'problem', category: 'book', title: 'B-1 Series capacitor แทน series stub (Caron Ch. II)', learn: 'จาก curve 175–225 MHz หา X ที่ต้องชดเชยที่ 200 MHz แล้วแปลงเป็น C',
    statement: 'สาย Z₀ = 50 Ω โหลด 175 MHz: 32 + j42, 200 MHz: 50 + j65, 225 MHz: 100 + j65 Ω ต้องการ match ดีที่สุดที่ 200 MHz ด้วยตัวเก็บประจุอนุกรม จงหารีแอกแตนซ์ X ที่ต้องเพิ่มที่ 200 MHz, ค่า C (pF) และ SWR ที่ 175 MHz หลังใส่ C แล้วสร้างวงจร Source — C — ANT (ตาราง Ch.II) ให้จุด 200 MHz อยู่ที่ศูนย์กลาง',
    concept: ['ที่ 200 MHz z = 1 + j1.3 อยู่บนวงกลม r = 1 → ต้องการ x = −1.3 · C = 1/(2πf|X|)'],
    start: () => buildCircuit(200e6, 50, [['antenna', 'series', {}, CH2]]),
    answers: [
      { key: 'X', label: 'X ที่ต้องเพิ่ม', unit: 'Ω', tol: 0.02, value: (r) => r.stages.find((st) => st.el.type === 'capacitor')!.X ?? 0, tex: 'X = -X_L(200\\,\\text{MHz})' },
      { key: 'C', label: 'C', unit: 'pF', tol: 0.03, value: (_r, c) => c.elements.find((e) => e.type === 'capacitor')!.params.C, tex: 'C = 1/(2\\pi f|X|)' },
      { key: 'swr175', label: 'SWR ที่ 175 MHz', unit: '', tol: 0.04, value: (_r, c) => solveSweep(c)[0].result.swrIn },
    ],
    steps: [
      { text: 'ลาก Capacitor ต่ออนุกรมหน้าเสาอากาศ ปรับ C จนจุด 200 MHz (ความถี่ออกแบบ) เข้าศูนย์กลาง ✓ MATCHED', check: (c, r) => has(c, 'capacitor', 'series') && matched(r) },
      { text: 'กรอกคำตอบ X, C และ SWR ที่ 175 MHz (อ่านจากตารางแบนด์ใต้ Smith Chart) แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(200e6, 50, [['capacitor', 'series', { C: 12.24 }], ['antenna', 'series', {}, CH2]]),
  },
  {
    id: 'pb2', level: 2, phase: 2, kind: 'problem', category: 'book', title: 'B-2 Quarter-wave transformer 600 Ω → 50 Ω (Caron Ch. II)', learn: 'Z_t = √(Z₀ Z_L)',
    statement: 'ต้องการเชื่อมสายอากาศ 600 Ω เข้ากับสาย 50 Ω ด้วยสายส่งหนึ่งในสี่คลื่น จงหา Z_t และ SWR ของโหลด 600 Ω ก่อน match แล้วสร้างวงจร Source — λ/4 — R 600 Ω ให้ ✓ MATCHED',
    concept: ['Z_t = √(600 × 50) ≈ 173 Ω'],
    start: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 600 }]]),
    answers: [
      { key: 'Zt', label: 'Z_t', unit: 'Ω', tol: 0.02, value: (_r, c) => c.elements.find((e) => e.type === 'qwt')!.params.Zt, tex: 'Z_t = \\sqrt{Z_0 Z_L}' },
      { key: 'swrL', label: 'SWR ก่อน match', unit: '', tol: 0.03, value: (r) => r.swrL },
    ],
    steps: [
      { text: 'วาง λ/4 Transformer หน้า R = 600 Ω ตั้ง Z_t ให้ ✓ MATCHED', check: (c, r) => has(c, 'qwt') && matched(r) },
      { text: 'กรอกคำตอบ Z_t และ SWR ก่อน match แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 50, [['qwt', 'series', { Zt: 173.2 }], ['resistor', 'series', { R: 600 }]]),
  },
  {
    id: 'pb3', level: 3, phase: 3, kind: 'problem', category: 'book', title: 'B-3 Z_A = 80 − j40 Ω → 50 Ω ด้วยสาย + shorted stub (Caron Ch. IV)', learn: 'Z → Y → หมุนจน g = 1 → สตับหักล้าง b',
    statement: 'โหลด Z_A = 80 − j40 Ω บนระบบ 50 Ω จงหา y_A, ระยะ d (น้อยสุด) ของสาย 50 Ω จากโหลดที่ทำให้ g = 1 และความยาวสตับปลายลัดขนาน l แล้วสร้างวงจร Source — Stub(⏚) — TL(d) — Load ให้ ✓ MATCHED',
    concept: ['z_A = 1.6 − j0.8 อยู่ใน Region 1 (r > 1) ใช้สายสั้น ๆ ย้ายจุดไปที่ g = 1 แล้วใส่ตัวขนาน'],
    start: () => buildCircuit(100e6, 50, [['load', 'series', { R: 80, X: -40 }]]),
    answers: [
      { key: 'g', label: 'g_A', unit: '', tol: 0.03, value: (r) => yOf(r.zL).re },
      { key: 'b', label: 'b_A', unit: '', tol: 0.03, value: (r) => yOf(r.zL).im },
      { key: 'd', label: 'd', unit: 'λ', tol: 0.03, tolAbs: 0.004, value: (r) => stageOf(r, 'line').el.params.len },
      { key: 'l', label: 'l สตับ', unit: 'λ', tol: 0.03, tolAbs: 0.004, value: (r) => stageOf(r, 'stub').el.params.len },
    ],
    steps: [
      { text: 'วาง Short Stub (⏚) และ Transmission Line ระหว่าง Source กับโหลด ปรับ d และ l จน ✓ MATCHED', check: (c, r) => has(c, 'stub_short', 'shunt') && has(c, 'tline') && matched(r) },
      { text: 'กรอกคำตอบ g_A, b_A, d, l แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(100e6, 50, [['stub_short', 'shunt', { Z0: 50, len: 0.1435 }], ['tline', 'series', { Z0: 50, len: 0.1049, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 80, X: -40 }]]),
  },
  {
    id: 'pb4', level: 4, phase: 3, kind: 'problem', category: 'book', title: 'B-4 Narrowband matching 12.0–12.4 MHz, SWR ≤ 2 (Caron Ex. 1)', learn: 'L-network กรณี (g) shunt L → series L กับโหลด 3 ความถี่',
    statement: 'เสาอากาศ 12.0 MHz: 10 − j60, 12.2 MHz: 16.5 − j55, 12.4 MHz: 20 − j50 Ω ต้องการ SWR ≤ 2:1 ทั้งสามความถี่ ใช้ shunt inductor ที่เสาอากาศและ series inductor ไปทางสาย 50 Ω ออกแบบที่ 12.2 MHz ให้เข้าศูนย์กลาง จงหา y_L ที่ 12.2 MHz, L_shunt และ L_series แล้วสร้างวงจรให้ SWR สูงสุดในแบนด์ ≤ 2 (หนังสือใช้ 1.63 μH และ 1.255 μH ซึ่งผ่านเกณฑ์เช่นกัน)',
    concept: ['ใช้ตัวแก้ 8 กรณีใน Course Chapter V ตรวจได้ · ตั้ง "เป้า SWR ≤ 2" ที่แผง Smith Chart'],
    start: () => buildCircuit(12.2e6, 50, [['antenna', 'series', {}, EX1]]),
    answers: [
      { key: 'g', label: 'g_L (12.2 MHz)', unit: '', tol: 0.03, value: (r) => yOf(r.zL).re },
      { key: 'b', label: 'b_L (12.2 MHz)', unit: '', tol: 0.03, value: (r) => yOf(r.zL).im },
      { key: 'Lsh', label: 'L shunt', unit: 'nH', tol: 0.04, value: (_r, c) => c.elements.find((e) => e.type === 'inductor' && e.orient === 'shunt')!.params.L },
      { key: 'Lse', label: 'L series', unit: 'nH', tol: 0.04, value: (_r, c) => c.elements.find((e) => e.type === 'inductor' && e.orient === 'series')!.params.L },
    ],
    steps: [
      { text: 'วาง Inductor แบบขนาน (⏚) หน้าเสาอากาศ และ Inductor อนุกรมถัดจาก Source ปรับจนทุกความถี่มี SWR ≤ 2 (ดูตารางแบนด์)', check: (c) => has(c, 'inductor', 'shunt') && has(c, 'inductor', 'series') && bandMax(c) <= 2.0 },
      { text: 'กรอกคำตอบ g_L, b_L, L shunt, L series แล้วกด "ตรวจคำตอบ"', check: (_c, _r, ctx) => ansOk(ctx) },
    ],
    solution: () => buildCircuit(12.2e6, 50, [['inductor', 'series', { L: 1129 }], ['inductor', 'shunt', { L: 1627 }], ['antenna', 'series', {}, EX1]]),
  },
);

export const ALL_LESSONS: Lesson[] = [...LESSONS, ...PROBLEMS];
export const findLesson = (id: string | null | undefined): Lesson | undefined => (id ? ALL_LESSONS.find((l) => l.id === id) : undefined);
