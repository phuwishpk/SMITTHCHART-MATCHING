// ---------------------------------------------------------------
// Solution engine for Guided Lab lessons: target values, a
// textbook-style derivation (Thai + KaTeX), and step-by-step apply.
// ---------------------------------------------------------------
import { Circuit, CircuitElement, ELEMENT_SPECS, cloneCircuit, makeElement } from './circuit';
import { Lesson } from './lessons';
import { StepLine, explainCircuit } from './explain';
import { solveCircuit } from './solver';
import { fmtNum, C } from './complex';
import { solveSingleStub, solveDoubleStub, solveQwt, solveLMatch } from './matching';
import { admittance, normalize, lineInput } from './rf';

export interface TargetValue {
  /** index of the element in the solution circuit */
  index: number;
  elementLabel: string;
  key: string;
  label: string;
  unit: string;
  value: number;
  /** student's current value (undefined if the element does not exist yet) */
  current?: number;
  ok: boolean;
}

export type ElementStatus = 'ok' | 'bad' | 'missing' | 'extra';

export interface SolutionInfo {
  circuit: Circuit;
  targets: TargetValue[];
  steps: StepLine[];
  /** status of each element of the SOLUTION circuit (by index) */
  solutionStatus: Record<number, ElementStatus>;
  /** status of each element of the STUDENT circuit (by index) */
  studentStatus: Record<number, ElementStatus>;
  /** true when the student's circuit already has the solution's element sequence */
  structureOk: boolean;
  allOk: boolean;
}

const tn = (x: number, d = 2) => fmtNum(x, d).replace('−', '-');
const ohm = '\\,\\Omega';

const elLabel = (el: CircuitElement, all: CircuitElement[]): string => {
  const spec = ELEMENT_SPECS[el.type];
  const sameType = all.filter((e) => e.type === el.type);
  const n = sameType.length > 1 ? sameType.indexOf(el) + 1 : 0;
  let pos = '';
  if (sameType.length > 1) {
    if (sameType.indexOf(el) === 0) pos = ' (ใกล้แหล่งจ่าย)';
    else if (sameType.indexOf(el) === sameType.length - 1) pos = ' (ใกล้โหลด)';
  }
  return `${spec.symbol}${n ? n : ''}${el.orient === 'shunt' ? '↓' : ''}${pos}`;
};

/** which params of each element type count as "the answer" */
const KEYS: Record<string, string[]> = {
  resistor: ['R'],
  inductor: ['L'],
  capacitor: ['C'],
  tline: ['len'],
  qwt: ['Zt'],
  stub_short: ['len'],
  stub_open: ['len'],
  load: ['R', 'X'],
};

const nearVal = (a: number, b: number, key: string): boolean => {
  if (key === 'len') return Math.abs(a - b) <= 0.004;
  return Math.abs(a - b) <= Math.max(0.03 * Math.abs(b), 0.05);
};

/** Pair student's elements with solution elements by type + orientation, in order. */
const pairElements = (student: Circuit, solution: Circuit): (number | undefined)[] => {
  const used = new Set<number>();
  return solution.elements.map((sol) => {
    const j = student.elements.findIndex((e, idx) => !used.has(idx) && e.type === sol.type && e.orient === sol.orient);
    if (j >= 0) used.add(j);
    return j >= 0 ? j : undefined;
  });
};

export const buildSolution = (lesson: Lesson, student: Circuit): SolutionInfo | null => {
  if (!lesson.solution) return null;
  const solution = lesson.solution();
  const pairs = pairElements(student, solution);
  const structureOk =
    student.elements.length === solution.elements.length &&
    solution.elements.every((sol, i) => {
      const st = student.elements[i];
      return st && st.type === sol.type && st.orient === sol.orient;
    });
  const targets: TargetValue[] = [];
  solution.elements.forEach((sol, i) => {
    const keys = KEYS[sol.type] ?? [];
    const spec = ELEMENT_SPECS[sol.type];
    const j = pairs[i];
    for (const key of keys) {
      const p = spec.params.find((pp) => pp.key === key)!;
      const current = j !== undefined ? student.elements[j].params[key] : undefined;
      targets.push({
        index: i,
        elementLabel: elLabel(sol, solution.elements),
        key,
        label: p.labelTh,
        unit: p.unit,
        value: sol.params[key],
        current,
        ok: current !== undefined && nearVal(current, sol.params[key], key),
      });
    }
  });
  const fOk = Math.abs(student.f - solution.f) <= 0.005 * solution.f;
  const steps = deriveSteps(lesson, solution);
  const solutionStatus: Record<number, ElementStatus> = {};
  const studentStatus: Record<number, ElementStatus> = {};
  solution.elements.forEach((_sol, i) => {
    const j = pairs[i];
    const ts = targets.filter((t) => t.index === i);
    const st: ElementStatus = j === undefined ? 'missing' : ts.every((t) => t.ok) ? 'ok' : 'bad';
    solutionStatus[i] = st;
    if (j !== undefined) studentStatus[j] = st;
  });
  student.elements.forEach((_e, j) => {
    if (studentStatus[j] === undefined) studentStatus[j] = 'extra';
  });
  return { circuit: solution, targets, steps, solutionStatus, studentStatus, structureOk, allOk: structureOk && fOk && targets.every((t) => t.ok) };
};

/**
 * Apply ONE step of the solution to the student's circuit:
 *  1. if the element sequence differs -> rebuild the structure (keeping the
 *     student's values for elements that already exist)
 *  2. else set the first target value that is still wrong
 * Returns the new circuit and a description of what changed.
 */
export const applySolutionStep = (lesson: Lesson, student: Circuit): { circuit: Circuit; what: string } | null => {
  const info = buildSolution(lesson, student);
  if (!info) return null;
  const sol = info.circuit;
  if (Math.abs(student.f - sol.f) > 0.005 * sol.f || Math.abs(student.Z0 - sol.Z0) > 1e-9) {
    return { circuit: { ...cloneCircuit(student), f: sol.f, Z0: sol.Z0 }, what: `ตั้ง f = ${tn(sol.f / 1e6, 4)} MHz, Z₀ = ${tn(sol.Z0)} Ω` };
  }
  if (!info.structureOk) {
    const pairs = pairElements(student, sol);
    const elements = sol.elements.map((se, i) => {
      const j = pairs[i];
      if (j !== undefined) {
        const st = student.elements[j];
        return { ...st, params: { ...st.params } };
      }
      // new element: start from spec defaults so the student still applies the value themselves
      const fresh = makeElement(se.type, se.orient);
      if ('Z0' in fresh.params) fresh.params.Z0 = sol.Z0;
      if (se.type === 'load') fresh.params = { ...se.params };
      if (se.type === 'tline') fresh.params = { ...fresh.params, Z0: se.params.Z0, vf: se.params.vf, lossDb: se.params.lossDb };
      return fresh;
    });
    return { circuit: { ...sol, elements }, what: `จัดโครงวงจรตามเฉลย: ${sol.elements.map((e) => elLabel(e, sol.elements)).join(' — ')}` };
  }
  const next = info.targets.find((t) => !t.ok);
  if (!next) return null;
  const c = cloneCircuit(student);
  c.elements[next.index].params[next.key] = next.value;
  return { circuit: c, what: `ตั้ง ${next.elementLabel}: ${next.label} = ${tn(next.value, 4)} ${next.unit}` };
};

// ---------- derivations ----------
const deriveSteps = (lesson: Lesson, sol: Circuit): StepLine[] => {
  const f = sol.f;
  const Z0 = sol.Z0;
  const w = 2 * Math.PI * f;
  const L: StepLine[] = [];
  const get = (type: string, nth = 0) => sol.elements.filter((e) => e.type === type)[nth];
  const text = (t: string) => L.push({ kind: 'text', text: t });
  const math = (t: string) => L.push({ kind: 'math', tex: t });
  const result = (t: string) => L.push({ kind: 'result', tex: t });
  const note = (t: string) => L.push({ kind: 'note', text: t });

  switch (lesson.id) {
    case 'l1': {
      text('โหลดตัวต้านทานล้วน x = 0 จุดจึงอยู่บนแกนนอน ต้องการให้อยู่ที่ศูนย์กลาง (z = 1)');
      math(`z = \\frac{R}{Z_0} = 1 \\;\\Rightarrow\\; R = Z_0 = ${tn(Z0)}${ohm}`);
      result(`R = ${tn(Z0)}${ohm}`);
      note('R = 25 Ω → z = 0.5 (ซ้ายของศูนย์กลาง), R = 100 Ω → z = 2 (ขวาของศูนย์กลาง)');
      break;
    }
    case 'l2': {
      const Lh = get('inductor').params.L * 1e-9;
      text('ต้องการ x = +1 (จุดบนสุดของวงกลม r = 0) จึงต้องมี X_L = Z₀');
      math(`X_L = 2\\pi f L = Z_0 \\;\\Rightarrow\\; L = \\frac{Z_0}{2\\pi f} = \\frac{${tn(Z0)}}{2\\pi(${tn(f / 1e6)}\\times10^{6})}`);
      result(`L \\approx ${tn(Lh * 1e9, 1)}\\ \\text{nH} \\quad (X_L = ${tn(w * Lh, 1)}${ohm},\\ x = ${tn(w * Lh / Z0, 2)})`);
      break;
    }
    case 'l3': {
      const Cf = get('capacitor').params.C * 1e-12;
      text('ต้องการ x = −1 (จุดล่างสุด) จึงต้องมี |X_C| = Z₀');
      math(`|X_C| = \\frac{1}{2\\pi f C} = Z_0 \\;\\Rightarrow\\; C = \\frac{1}{2\\pi f Z_0} = \\frac{1}{2\\pi(${tn(f / 1e6)}\\times10^{6})(${tn(Z0)})}`);
      result(`C \\approx ${tn(Cf * 1e12, 1)}\\ \\text{pF} \\quad (X_C = ${tn(-1 / (w * Cf), 1)}${ohm},\\ x = ${tn(-1 / (w * Cf) / Z0, 2)})`);
      break;
    }
    case 'l4': {
      const R = get('resistor').params.R;
      const Lh = get('inductor').params.L * 1e-9;
      const XL = w * Lh;
      text('เป้าหมาย z_L = 0.5 + j0.5 → Z_L = 25 + j25 Ω ที่ Z₀ = 50 Ω');
      math(`R = 0.5 \\times Z_0 = ${tn(R)}${ohm}`);
      math(`X_L = 0.5 \\times Z_0 = 25${ohm} \\;\\Rightarrow\\; L = \\frac{X_L}{2\\pi f} = \\frac{25}{2\\pi(${tn(f / 1e6)}\\times10^{6})}`);
      result(`L \\approx ${tn(Lh * 1e9, 1)}\\ \\text{nH} \\quad\\Rightarrow\\quad Z_L = ${tn(R)} + j${tn(XL, 1)}${ohm},\\ z_L = ${tn(R / Z0, 2)} + j${tn(XL / Z0, 2)}`);
      break;
    }
    case 'l5': {
      const R = get('resistor').params.R;
      const Cf = get('capacitor').params.C * 1e-12;
      const XC = -1 / (w * Cf);
      const Lh = get('inductor').params.L * 1e-9;
      text('ขั้นที่ 1: R = 50 Ω กับ C = 53 pF อนุกรม');
      math(`X_C = -\\frac{1}{2\\pi f C} = ${tn(XC, 1)}${ohm} \\;\\Rightarrow\\; z = ${tn(R / Z0, 2)} ${XC < 0 ? '-' : '+'} j${tn(Math.abs(XC) / Z0, 2)}`);
      text('ขั้นที่ 2: จุดอยู่บนวงกลม r = 1 แล้ว ใส่ L อนุกรมเพื่อหักล้าง X_C (เดินขึ้นตามวงกลม r = 1)');
      math(`X_L = -X_C = ${tn(-XC, 1)}${ohm} \\;\\Rightarrow\\; L = \\frac{X_L}{2\\pi f} = \\frac{${tn(-XC, 1)}}{2\\pi(${tn(f / 1e6)}\\times10^{6})}`);
      result(`L \\approx ${tn(Lh * 1e9, 1)}\\ \\text{nH} \\quad\\Rightarrow\\quad Z = ${tn(R)} + j0${ohm} = Z_0\\ \\checkmark`);
      break;
    }
    case 'l6': {
      const Lh = get('inductor').params.L * 1e-9;
      const Cf = get('capacitor').params.C * 1e-12;
      const XL = w * Lh;
      text('Resonance เกิดเมื่อ X_L + X_C = 0');
      math(`X_L = 2\\pi f L = ${tn(XL, 1)}${ohm}`);
      math(`X_C = -X_L \\;\\Rightarrow\\; C = \\frac{1}{2\\pi f X_L} = \\frac{1}{2\\pi(${tn(f / 1e6)}\\times10^{6})(${tn(XL, 1)})}`);
      result(`C \\approx ${tn(Cf * 1e12, 1)}\\ \\text{pF}`);
      math(`f_0 = \\frac{1}{2\\pi\\sqrt{LC}} = ${tn(1 / (2 * Math.PI * Math.sqrt(Lh * Cf)) / 1e6, 1)}\\ \\text{MHz}`);
      note('ที่ resonance Z = R = 50 Ω = Z₀ จุดจึงอยู่ที่ศูนย์กลางพอดี: match + resonance พร้อมกัน');
      break;
    }
    case 'l7': {
      const R = get('resistor').params.R;
      const Cf = get('capacitor').params.C * 1e-12;
      const Lh = get('inductor').params.L * 1e-9;
      const BC = w * Cf;
      text('อุปกรณ์ขนานคิดเป็น admittance (normalize ด้วย Y₀ = 1/Z₀)');
      math(`g = \\frac{Z_0}{R} = \\frac{${tn(Z0)}}{${tn(R)}} = ${tn(Z0 / R, 2)}`);
      math(`b_C = 2\\pi f C\\, Z_0 = (${tn(BC, 4)})(${tn(Z0)}) = ${tn(BC * Z0, 2)}`);
      text('Parallel resonance เมื่อ b_L + b_C = 0');
      math(`b_L = -\\frac{Z_0}{2\\pi f L} = -b_C \\;\\Rightarrow\\; L = \\frac{1}{(2\\pi f)^2 C}`);
      result(`L \\approx ${tn(Lh * 1e9, 1)}\\ \\text{nH} \\quad\\Rightarrow\\quad y = ${tn(Z0 / R, 2)} + j0,\\ z = ${tn(R / Z0, 2)} + j0`);
      break;
    }
    case 'l8': {
      text('ไม่มีค่าที่ต้อง "แก้" ในบทนี้ แต่ให้สังเกตสมบัติของสายส่ง');
      math(`z_{in} = \\frac{z_L + j\\tan\\beta l}{1 + jz_L\\tan\\beta l}`);
      math(`l = \\tfrac{\\lambda}{4}:\\ \\beta l = 90^\\circ \\Rightarrow z_{in} = \\frac{1}{z_L} \\quad (\\text{impedance inversion})`);
      math(`l = \\tfrac{\\lambda}{2}:\\ \\beta l = 180^\\circ \\Rightarrow z_{in} = z_L`);
      note('บน Smith Chart: หมุนตามวงกลม SWR ไปทาง generator ครึ่งรอบ = λ/4, หนึ่งรอบ = λ/2');
      break;
    }
    case 'l9': {
      const q = get('qwt');
      const R = get('resistor').params.R;
      text('หม้อแปลง λ/4 ทำ impedance inversion: Z_in = Z_t²/Z_L');
      math(`Z_{in} = Z_0 \\;\\Rightarrow\\; Z_t = \\sqrt{Z_0 R_L} = \\sqrt{(${tn(Z0)})(${tn(R)})}`);
      result(`Z_t \\approx ${tn(q.params.Zt, 2)}${ohm}`);
      note('ใช้ได้กับโหลดจำนวนจริง ถ้าโหลดมีส่วนจินตภาพ ให้ใส่สายส่งหมุนจุดมาที่แกนนอนก่อน (ปุ่มช่วยใน PROPERTIES)');
      break;
    }
    case 'l10':
    case 'l11': {
      const load = get('load');
      const ZL = C(load.params.R, load.params.X);
      const kind = lesson.id === 'l10' ? 'short' : 'open';
      const stub = get(kind === 'short' ? 'stub_short' : 'stub_open');
      const sols = solveSingleStub(ZL, Z0, kind, stub.params.Z0);
      const RL = ZL.re;
      const XL = ZL.im;
      const zl = normalize(ZL, Z0);
      text(`โหลด Z_L = ${tn(RL)} ${XL < 0 ? '−' : '+'} j${tn(Math.abs(XL))} Ω → z_L = ${tn(zl.re, 2)} ${zl.im < 0 ? '−' : '+'} j${tn(Math.abs(zl.im), 2)} (Pozar Ex. 5.2)`);
      text('ขั้นที่ 1 หา d: หมุนจากโหลดไปทาง generator จนส่วนจริงของ admittance เป็น 1 (ตัดวงกลม g = 1) สูตรวิเคราะห์: t = tan βd');
      math(`t = \\frac{X_L \\pm \\sqrt{R_L[(Z_0 - R_L)^2 + X_L^2]/Z_0}}{R_L - Z_0}`);
      math(`d/\\lambda = \\tfrac{1}{2\\pi}\\tan^{-1} t \\ (t \\ge 0) \\quad\\text{หรือ}\\quad \\tfrac{1}{2\\pi}(\\pi + \\tan^{-1} t)\\ (t<0)`);
      for (const s of sols) math(`d = ${tn(s.dLambda, 3)}\\lambda:\\quad y(d) = ${tn(s.yAtStub.re, 2)} ${s.yAtStub.im < 0 ? '-' : '+'} j${tn(Math.abs(s.yAtStub.im), 2)}`);
      text(`ขั้นที่ 2 หา l: สตับต้องให้ b_{stub} = −b เพื่อหักล้าง${kind === 'short' ? ' สตับลัดวงจร: b = −cot βl' : ' สตับปลายเปิด: b = tan βl'}`);
      if (kind === 'short') math(`l/\\lambda = \\tfrac{1}{2\\pi}\\tan^{-1}\\!\\left(\\frac{Y_0}{B}\\right)`);
      else math(`l/\\lambda = -\\tfrac{1}{2\\pi}\\tan^{-1}\\!\\left(\\frac{B}{Y_0}\\right)`);
      for (const s of sols) math(`b = ${tn(-s.bStub, 2)} \\Rightarrow b_{stub} = ${tn(s.bStub, 2)} \\Rightarrow l = ${tn(s.lLambda, 3)}\\lambda`);
      const pick = sols[0];
      result(`\\text{เฉลยที่ใช้: } d = ${tn(pick.dLambda, 3)}\\lambda,\\quad l = ${tn(pick.lLambda, 3)}\\lambda \\quad\\Rightarrow\\quad y = 1 + j0\\ \\checkmark`);
      if (kind === 'open') note('สตับปลายเปิดยาวกว่าสตับลัดวงจร 0.25 λ พอดี (0.095 + 0.25 = 0.345 λ) เพราะปลายเปิดกับปลายลัดต่างกันครึ่งรอบบน Smith Chart');
      else note('คำตอบที่ 2 (d = 0.260 λ, l = 0.405 λ) ก็ match ได้ แต่สายยาวกว่าจึงมี bandwidth แคบกว่า');
      break;
    }
    case 'l12': {
      const load = get('load');
      const ZL = C(load.params.R, load.params.X);
      const spacing = get('tline', 0).params.len;
      const d0 = get('tline', 1).params.len;
      const ds = solveDoubleStub(ZL, Z0, d0, spacing, 'short', get('stub_short').params.Z0);
      const yL = admittance(normalize(lineInput(ZL, Z0, d0, 0), Z0));
      const t = Math.tan(2 * Math.PI * spacing);
      text(`สตับตัวแรกอยู่ที่โหลด (d₀ = ${tn(d0, 3)} λ) ระยะห่างสตับ = ${tn(spacing, 3)} λ → t = tan βd = ${tn(t, 2)} (Pozar Ex. 5.4)`);
      math(`y_L = \\frac{1}{z_L} = ${tn(yL.re, 2)} ${yL.im < 0 ? '-' : '+'} j${tn(Math.abs(yL.im), 2)} \\quad (g_L = ${tn(yL.re, 2)},\\ b_L = ${tn(yL.im, 2)})`);
      text('ขั้นที่ 1: สตับตัวแรกเพิ่ม b₁ เพื่อให้หลังหมุนผ่านระยะห่างแล้วตกบนวงกลม g = 1');
      math(`b_1 = -b_L + \\frac{1 \\pm \\sqrt{(1+t^2)g_L - g_L^2 t^2}}{t}`);
      math(`\\sqrt{(1+${tn(t * t, 2)})(${tn(yL.re, 2)}) - (${tn(yL.re, 2)})^2(${tn(t * t, 2)})} = ${tn(Math.sqrt((1 + t * t) * yL.re - yL.re * yL.re * t * t), 3)}`);
      for (const s of ds.solutions) math(`b_1 = ${tn(s.b1, 3)} \\Rightarrow l_1 = ${tn(s.l1Lambda, 3)}\\lambda \\quad\\text{(short stub: } l = \\tfrac{1}{2\\pi}\\tan^{-1}\\tfrac{1}{-b_1}\\text{)}`);
      text('ขั้นที่ 2: หมุนผ่านระยะห่างแล้วได้ y₂ = 1 + jb₂′ สตับตัวที่สองใส่ b₂ = −b₂′');
      for (const s of ds.solutions) math(`y_2 = 1 ${s.y2before.im < 0 ? '-' : '+'} j${tn(Math.abs(s.y2before.im), 3)} \\Rightarrow b_2 = ${tn(s.b2, 3)} \\Rightarrow l_2 = ${tn(s.l2Lambda, 3)}\\lambda`);
      const pick = ds.solutions.reduce((a, b) => (a.l1Lambda + a.l2Lambda < b.l1Lambda + b.l2Lambda ? a : b));
      result(`\\text{เฉลยที่ใช้ (สตับสั้นกว่า): } l_1 = ${tn(pick.l1Lambda, 3)}\\lambda\\ (\\text{ใกล้โหลด}),\\quad l_2 = ${tn(pick.l2Lambda, 3)}\\lambda\\ (\\text{ใกล้แหล่งจ่าย})`);
      note(`ข้อจำกัด: ถ้า g_L > (1 + t²)/t² = ${tn((1 + t * t) / (t * t), 2)} จะอยู่ใน forbidden region และ match ไม่ได้ ต้องเลื่อนสตับตัวแรกออกจากโหลด`);
      break;
    }
    case 'l13': {
      const load = get('load');
      const ZL = C(load.params.R, load.params.X);
      const ls = solveLMatch(ZL, Z0, f);
      const zl = normalize(ZL, Z0);
      text(`z_L = ${tn(zl.re, 2)} ${zl.im < 0 ? '−' : '+'} j${tn(Math.abs(zl.im), 2)} อยู่ในวงกลม r = 1 (R_L > Z₀) → ใช้ L-section แบบ "ขนานที่โหลด แล้วอนุกรม" (Pozar Ex. 5.1)`);
      math(`B = \\frac{X_L \\pm \\sqrt{R_L/Z_0}\\sqrt{R_L^2 + X_L^2 - Z_0 R_L}}{R_L^2 + X_L^2},\\qquad X = \\frac{1}{B} + \\frac{X_L Z_0}{R_L} - \\frac{Z_0}{B R_L}`);
      for (const s of ls) {
        const sh = s.shuntEl;
        const se = s.seriesEl;
        math(`B = ${tn(s.B, 5)}\\ \\text{S} \\Rightarrow ${sh.type === 'capacitor' ? `C = \\frac{B}{2\\pi f} = ${tn(sh.value * 1e12, 2)}\\ \\text{pF}` : `L = \\frac{-1}{2\\pi f B} = ${tn(sh.value * 1e9, 1)}\\ \\text{nH}`};\\quad X = ${tn(s.X, 1)}${ohm} \\Rightarrow ${se.type === 'inductor' ? `L = \\frac{X}{2\\pi f} = ${tn(se.value * 1e9, 1)}\\ \\text{nH}` : `C = \\frac{-1}{2\\pi f X} = ${tn(se.value * 1e12, 2)}\\ \\text{pF}`}`);
      }
      const pick = ls[0];
      result(`\\text{เฉลยที่ใช้: } C_{shunt} \\approx ${tn(pick.shuntEl.value * 1e12, 2)}\\ \\text{pF},\\quad L_{series} \\approx ${tn(pick.seriesEl.value * 1e9, 1)}\\ \\text{nH}`);
      note('บน Smith Chart: C ขนานเดินตามวงกลม g คงที่ไปตัดวงกลม r = 1 แล้ว L อนุกรมเดินตามวงกลม r = 1 เข้าศูนย์กลาง');
      break;
    }
    case 'l14': {
      const RL = get('load').params.R;
      const Rv = 20;
      const Q1 = Math.sqrt(RL / Rv - 1);
      const Q2 = Math.sqrt(Z0 / Rv - 1);
      const B1 = Q1 / RL;
      const B2 = Q2 / Z0;
      const X1 = Q1 * Rv;
      const X2 = Q2 * Rv;
      text(`π-network ออกแบบเป็น L-section สองชุดต่อหลังชนกัน โดยเลือกความต้านทานเสมือนตรงกลาง R_v = ${Rv} Ω (R_v < ทั้ง Z₀ และ R_L)`);
      math(`\\text{ฝั่งโหลด: } Q_1 = \\sqrt{R_L/R_v - 1} = \\sqrt{${tn(RL)}/${Rv} - 1} = ${tn(Q1, 3)}`);
      math(`B_1 = Q_1/R_L = ${tn(B1, 4)}\\ \\text{S} \\Rightarrow C_1 = B_1/2\\pi f = ${tn(B1 / w * 1e12, 1)}\\ \\text{pF};\\quad X_1 = Q_1 R_v = ${tn(X1, 1)}${ohm}`);
      math(`\\text{ฝั่งแหล่งจ่าย: } Q_2 = \\sqrt{Z_0/R_v - 1} = ${tn(Q2, 3)}`);
      math(`B_2 = Q_2/Z_0 = ${tn(B2, 4)}\\ \\text{S} \\Rightarrow C_2 = ${tn(B2 / w * 1e12, 1)}\\ \\text{pF};\\quad X_2 = Q_2 R_v = ${tn(X2, 1)}${ohm}`);
      math(`L = \\frac{X_1 + X_2}{2\\pi f} = \\frac{${tn(X1 + X2, 1)}}{2\\pi(${tn(f / 1e6)}\\times10^{6})} = ${tn((X1 + X2) / w * 1e9, 1)}\\ \\text{nH}`);
      result(`C_{\\text{ใกล้โหลด}} \\approx ${tn(B1 / w * 1e12, 1)}\\ \\text{pF},\\quad L \\approx ${tn((X1 + X2) / w * 1e9, 1)}\\ \\text{nH},\\quad C_{\\text{ใกล้แหล่งจ่าย}} \\approx ${tn(B2 / w * 1e12, 1)}\\ \\text{pF}`);
      note('เลือก R_v ต่ำลง → Q สูงขึ้น → bandwidth แคบลง นี่คืออิสระตัวที่สามของ π-network');
      break;
    }
    case 'py6': {
      const RL = get('load').params.R;
      const RS = Z0;
      const Q = Math.sqrt(RL / RS - 1);
      const XL = Q * RS;
      const B = Q / RL;
      text(`แหล่งจ่าย R_S = ${tn(RS)} Ω ต่ำกว่าโหลด R_L = ${tn(RL)} Ω → ใช้ L-section แบบ "C ขนานที่โหลด + L อนุกรม" (ในแอปตั้ง Z₀ = R_S เพื่อให้ศูนย์กลางกราฟคือแหล่งจ่าย)`);
      math(`Q = \\sqrt{\\frac{R_L}{R_S} - 1} = \\sqrt{\\frac{${tn(RL)}}{${tn(RS)}} - 1} = ${tn(Q, 3)}`);
      text('ฝั่งอนุกรม (ด้านแหล่งจ่าย): รีแอกแตนซ์ต้องเป็น Q เท่าของ R_S');
      math(`X_L = Q R_S = ${tn(Q, 3)} \\times ${tn(RS)} = ${tn(XL, 1)}${ohm} \\Rightarrow L = \\frac{X_L}{2\\pi f} = \\frac{${tn(XL, 1)}}{2\\pi(${tn(f / 1e9, 2)}\\times10^{9})} = ${tn(XL / w * 1e9, 2)}\\ \\text{nH}`);
      text('ฝั่งขนาน (ด้านโหลด): susceptance ต้องเป็น Q เท่าของ 1/R_L');
      math(`B_C = \\frac{Q}{R_L} = \\frac{${tn(Q, 3)}}{${tn(RL)}} = ${tn(B, 5)}\\ \\text{S} \\Rightarrow C = \\frac{B_C}{2\\pi f} = ${tn(B / w * 1e12, 3)}\\ \\text{pF}`);
      result(`L \\approx ${tn(XL / w * 1e9, 2)}\\ \\text{nH},\\quad C \\approx ${tn(B / w * 1e12, 3)}\\ \\text{pF} \\quad\\Rightarrow\\quad Z_{in} = ${tn(RS)}${ohm} = Z_S^*\\ \\checkmark`);
      note('บน Smith Chart (normalize ด้วย 25 Ω): โหลด z = 16 อยู่ขวาสุด C ขนานพาจุดตามวงกลม g = 1/16 ลงมาตัดวงกลม r = 1 แล้ว L อนุกรมพาขึ้นตามวงกลม r = 1 เข้าศูนย์กลาง · Bandwidth ≈ f/Q');
      break;
    }
    default:
      if (lesson.kind === 'problem' && lesson.answers) {
        const sr = solveCircuit(sol);
        text('คำตอบ (คำนวณจากวงจรเฉลย):');
        for (const a of lesson.answers) {
          const v = a.value(sr, sol);
          math(`${a.tex ? a.tex + ' = ' : a.label.replace(/ /g, '\\ ') + ' = '}${tn(v, Math.abs(v) < 0.1 ? 4 : 3)}${a.unit ? '\\ \\text{' + a.unit + '}' : ''}`);
        }
        if (lesson.category === 'admittance') {
          // impedance seen by the first shunt element (nearest the load) if any, else the load itself
          const firstShunt = sr.stages.find((st) => st.kind === 'shunt' || st.kind === 'stub');
          const zl = normalize(firstShunt ? firstShunt.Zbefore : sr.ZL, sr.circuit.Z0);
          const y = admittance(zl);
          text('แปลง z → y:');
          math(`y = \\frac{1}{z} = \\frac{r - jx}{r^2 + x^2} = \\frac{${tn(zl.re, 3)} ${zl.im < 0 ? '+' : '-'} j${tn(Math.abs(zl.im), 3)}}{${tn(zl.re * zl.re + zl.im * zl.im, 3)}} = ${tn(y.re, 3)} ${y.im < 0 ? '-' : '+'} j${tn(Math.abs(y.im), 3)}`);
        }
        text('ที่มาโดยละเอียด (Explanation Engine ของวงจรเฉลย):');
        for (const st of explainCircuit(sr).slice(1)) {
          L.push({ kind: 'text', text: `▸ ${st.title}` });
          for (const ln of st.lines) if (ln.kind === 'math' || ln.kind === 'result') L.push(ln);
        }
      } else {
        text('บทเรียนนี้ไม่มีเฉลยตายตัว ลองสำรวจตามขั้นตอนที่กำหนด');
      }
  }
  void solveQwt;
  return L;
};
