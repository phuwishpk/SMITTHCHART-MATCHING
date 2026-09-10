// ---------------------------------------------------------------
// Explanation Engine: turns a SolveResult into ordered teaching
// steps (Thai text + KaTeX) with Smith-chart highlight hints.
// ---------------------------------------------------------------
import { Complex, abs, arg, deg, fmtNum, isFiniteC } from './complex';
import { ELEMENT_SPECS } from './circuit';
import { SolveResult } from './solver';
import { admittance, wtgFromGamma, readOff } from './rf';

export type StepLine =
  | { kind: 'text'; text: string }
  | { kind: 'math'; tex: string }
  | { kind: 'result'; tex: string }
  | { kind: 'note'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'warn'; text: string };

export interface Highlight {
  elementId?: string;
  rCircle?: number;
  xCircle?: number;
  gCircle?: number;
  bCircle?: number;
  /** 'load' | 'in' | stage index (element index) */
  point?: 'load' | 'in' | number;
  swrCircle?: 'load' | 'in';
  stageIndex?: number;
  showY?: boolean;
  center?: boolean;
  wtg?: [number, number];
  /** ---- free-form overlays (used by the Smith-chart solution walkthrough) ---- */
  points?: { g: Complex; label: string; cls?: 'load' | 'mid' | 'in' | 'y' | 'stub' }[];
  /** Γ-plane polylines */
  paths?: Complex[][];
  /** arcs along constant |Γ| (or explicit radius) starting at g, clockwise (toward generator) by lenLambda */
  arcs?: { g: Complex; lenLambda: number; radius?: number }[];
  /** extra circles in the Γ-plane */
  circles?: { cx: number; cy: number; r: number; cls?: string; label?: string }[];
  /** dashed constant-|Γ| circle of this radius */
  swrRadius?: number;
  /** marks on the wavelengths-toward-generator scale */
  wtgMarks?: { w: number; label: string }[];
  /**
   * Draw the "read it off the radially scaled parameters" construction: swing the
   * radius of this |Γ| down onto the positive real axis (where r = SWR) and drop a
   * line from there to the SWR / RL strip. The strip is forced visible while this is
   * set. `from` says which plotted point the compass starts at.
   */
  readout?: { mag: number; from?: 'load' | 'in'; label?: string };
}

export interface ExplainStep {
  id: string;
  short: string;
  title: string;
  lines: StepLine[];
  highlight?: Highlight;
  tag: 'circuit' | 'element' | 'combine' | 'normalize' | 'plot' | 'swr' | 'network' | 'match';
}

// ---------- TeX helpers ----------
const tn = (x: number, d = 2): string => {
  if (!Number.isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
  const s = fmtNum(x, d).replace('−', '-');
  return s;
};
const tc = (z: Complex, d = 2): string => {
  if (!isFiniteC(z)) return '\\infty';
  const sign = z.im < 0 ? '-' : '+';
  return `${tn(z.re, d)} ${sign} j${tn(Math.abs(z.im), d)}`;
};
const tsci = (x: number): string => {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${tn(m, 2)}\\times10^{${e}}`;
};
const ohm = '\\,\\Omega';
const T = (s: string) => `\\text{${s}}`;


const describeOrder = (res: SolveResult): string => {
  const parts = res.circuit.elements.map((e) => {
    const spec = ELEMENT_SPECS[e.type];
    const o = e.orient === 'shunt' ? '↓' : '';
    return `${spec.symbol}${o}`;
  });
  return `Source ── ${parts.join(' ── ')}${res.termination === 'short' ? ' ── GND' : ' ── (open)'}`;
};

export const explainCircuit = (res: SolveResult): ExplainStep[] => {
  const steps: ExplainStep[] = [];
  const { circuit, stages } = res;
  const f = circuit.f;
  const Z0 = circuit.Z0;
  const fMHz = f / 1e6;
  let n = 0;
  const push = (s: Omit<ExplainStep, 'id'>) => {
    n += 1;
    steps.push({ id: `s${n}`, ...s });
  };

  /**
   * The step that teaches the compass transfer: every quantity on the radially
   * scaled strip depends on |Γ| alone, so one radius reads them all.
   */
  const pushReadOff = (g: Complex, from: 'load' | 'in', name: string) => {
    const ro = readOff(g);
    const swrTex = Number.isFinite(ro.swr) ? tn(ro.swr, 2) : '\\infty';
    const rlTex = Number.isFinite(ro.rlDb) ? tn(ro.rlDb, 1) : '\\infty';
    const mlTex = Number.isFinite(ro.mismatchDb) ? tn(ro.mismatchDb, 2) : '\\infty';
    push({
      short: `อ่านค่า ${name}`,
      title: `อ่าน SWR / Return loss จากแถบสเกลด้านล่างกราฟ (${name})`,
      tag: 'swr',
      lines: [
        { kind: 'text', text: `ค่าทั้งสี่บนแถบ RADIALLY SCALED PARAMETERS ขึ้นกับ |Γ| อย่างเดียว จึงอ่านได้จาก "ระยะ" จากศูนย์กลางกราฟถึงจุด ${name} โดยไม่ต้องคำนวณใหม่` },
        { kind: 'text', text: `วิธีทำด้วยมือ: กางวงเวียนจากศูนย์กลางไปที่จุด ${name} → หมุนลงมาแตะแกนนอนด้านขวา จุดที่แตะคือ r = SWR → ลากเส้นดิ่งลงมาที่แถบด้านล่าง แล้วอ่านทุกค่าตรงเส้นนั้น` },
        { kind: 'math', tex: `|\\Gamma| = ${tn(ro.mag, 3)} \\quad\\Rightarrow\\quad SWR = \\frac{1+|\\Gamma|}{1-|\\Gamma|} = ${swrTex}` },
        { kind: 'math', tex: `${T('Return loss')} = -20\\log_{10}|\\Gamma| = ${rlTex}\\ ${T('dB')}, \\qquad ${T('Mismatch loss')} = ${mlTex}\\ ${T('dB')}` },
        { kind: 'result', tex: `${T('อ่านตรงเส้นนี้:')}\\; |\\Gamma| = ${tn(ro.mag, 3)},\\; SWR = ${swrTex},\\; RL = ${rlTex}\\ ${T('dB')},\\; ${T('สะท้อน')} = ${tn(ro.reflPct, 1)}\\%` },
        { kind: 'note', text: 'เส้นประที่ลากลงมาบนกราฟคือการ "ถ่ายระยะ" อันเดียวกับที่ใช้วงเวียนบนกระดาษ Smith Chart จริง ปุ่ม "แถบ SWR/RL" ที่หัวแผงเปิด/ปิดแถบนี้ได้' },
      ],
      highlight: { swrCircle: from, point: from, readout: { mag: ro.mag, from, label: name } },
    });
  };

  if (circuit.elements.length === 0) {
    push({
      short: 'เริ่มต้น',
      title: 'ยังไม่มีอุปกรณ์ในวงจร',
      tag: 'circuit',
      lines: [
        { kind: 'text', text: 'ลากอุปกรณ์จากแผง COMPONENTS ด้านซ้ายมาวางบน Canvas เพื่อเริ่มสร้างวงจร' },
        { kind: 'note', text: 'ตอนนี้แหล่งจ่ายต่อตรงกับสายกลับ (ลัดวงจร) จุดจึงอยู่ที่ SHORT ด้านซ้ายสุดของ Smith Chart (z = 0, Γ = −1)' },
      ],
      highlight: { point: 'in' },
    });
    return steps;
  }

  // ---------- STEP: circuit structure ----------
  const loadStages = stages.filter((s) => s.inLoad); // far-end first
  const netStages = stages.filter((s) => !s.inLoad); // far-end first (nearest to load first)
  const seriesOnlyLoad = loadStages.every((s) => s.kind === 'series');
  const shuntOnlyLoad = loadStages.length > 0 && loadStages.every((s) => s.kind === 'shunt');

  {
    const lines: StepLine[] = [];
    const names = circuit.elements.map((e, i) => {
      const spec = ELEMENT_SPECS[e.type];
      return `${i + 1}. ${spec.name} (${spec.nameTh})${e.orient === 'shunt' ? ' — ต่อขนานลงกราวด์' : e.type === 'tline' || e.type === 'qwt' ? '' : ' — ต่ออนุกรม'}`;
    });
    lines.push({ kind: 'text', text: `วงจรนี้ประกอบด้วย ${circuit.elements.length} อุปกรณ์ (จากแหล่งจ่ายไปทางโหลด):` });
    for (const nm of names) lines.push({ kind: 'text', text: nm });
    lines.push({ kind: 'code', text: describeOrder(res) });
    lines.push({ kind: 'math', tex: `f = ${tn(fMHz, 3)}\\ ${T('MHz')},\\qquad Z_0 = ${tn(Z0)}${ohm}` });
    if (res.hasNetwork) {
      const loadNames = loadStages.map((s) => ELEMENT_SPECS[s.el.type].symbol).reverse().join(', ');
      lines.push({ kind: 'note', text: `ส่วนท้าย (${loadNames || 'ปลายวงจร'}) คือ "โหลด" ส่วนที่เหลือคือ network ที่แปลงอิมพีแดนซ์ของโหลดก่อนถึงแหล่งจ่าย` });
    } else if (seriesOnlyLoad) {
      lines.push({ kind: 'note', text: 'อุปกรณ์ทุกตัวต่ออนุกรมกัน อิมพีแดนซ์รวมจึงเป็นผลบวกของแต่ละตัว' });
    } else if (shuntOnlyLoad) {
      lines.push({ kind: 'note', text: 'อุปกรณ์ทุกตัวต่อขนานกัน จึงสะดวกกว่าถ้าคิดเป็น admittance (Y = 1/Z) แล้วบวกกัน' });
    } else {
      lines.push({ kind: 'note', text: 'มีทั้งอนุกรมและขนาน จะคำนวณเป็นขั้นบันได (ladder) จากปลายวงจรย้อนกลับมาที่แหล่งจ่าย' });
    }
    push({ short: 'วงจร', title: 'โครงสร้างวงจร', tag: 'circuit', lines });
  }

  // ---------- STEP: each lumped element value ----------
  const lumpedInLoad = [...loadStages].reverse(); // source -> load order
  for (const s of lumpedInLoad) {
    const e = s.el;
    const spec = ELEMENT_SPECS[e.type];
    const lines: StepLine[] = [];
    let short = spec.symbol;
    let title = `${spec.name}`;
    if (e.type === 'resistor') {
      title = 'ความต้านทาน R';
      lines.push({ kind: 'text', text: 'ตัวต้านทานให้อิมพีแดนซ์เป็นจำนวนจริงล้วน ไม่ขึ้นกับความถี่' });
      lines.push({ kind: 'result', tex: `R = ${tn(e.params.R)}${ohm}` });
      if (s.kind === 'shunt') {
        lines.push({ kind: 'text', text: 'เพราะต่อขนาน จะใช้ค่า conductance:' });
        lines.push({ kind: 'math', tex: `G = \\frac{1}{R} = \\frac{1}{${tn(e.params.R)}} = ${tn(1 / e.params.R, 4)}\\ ${T('S')}` });
        short = 'G';
      }
    } else if (e.type === 'inductor') {
      const L = e.params.L * 1e-9;
      const x = s.kind === 'series' ? s.X! : 2 * Math.PI * f * L;
      title = 'หา Inductive Reactance X_L';
      short = 'X_L';
      lines.push({ kind: 'text', text: 'ตัวเหนี่ยวนำมีรีแอกแตนซ์เป็นบวก และเพิ่มขึ้นตามความถี่' });
      lines.push({ kind: 'math', tex: `X_L = 2\\pi f L` });
      lines.push({ kind: 'math', tex: `X_L = 2\\pi(${tsci(f)})(${tsci(L)})` });
      lines.push({ kind: 'result', tex: `X_L \\approx ${tn(x)}${ohm}` });
      if (s.kind === 'shunt') {
        lines.push({ kind: 'text', text: 'เพราะต่อขนาน ใช้ค่า susceptance (ลบ สำหรับ L):' });
        lines.push({ kind: 'math', tex: `B_L = -\\frac{1}{X_L} = ${tn(-1 / x, 4)}\\ ${T('S')}` });
        short = 'B_L';
      }
    } else if (e.type === 'capacitor') {
      const Cf = e.params.C * 1e-12;
      const x = s.kind === 'series' ? s.X! : -1 / (2 * Math.PI * f * Cf);
      title = 'หา Capacitive Reactance X_C';
      short = 'X_C';
      lines.push({ kind: 'text', text: 'ตัวเก็บประจุมีรีแอกแตนซ์เป็นลบ และมีขนาดลดลงเมื่อความถี่สูงขึ้น' });
      lines.push({ kind: 'math', tex: `X_C = -\\frac{1}{2\\pi f C}` });
      lines.push({ kind: 'math', tex: `X_C = -\\frac{1}{2\\pi(${tsci(f)})(${tsci(Cf)})}` });
      lines.push({ kind: 'result', tex: `X_C \\approx ${tn(x)}${ohm}` });
      if (s.kind === 'shunt') {
        lines.push({ kind: 'text', text: 'เพราะต่อขนาน ใช้ค่า susceptance (บวก สำหรับ C):' });
        lines.push({ kind: 'math', tex: `B_C = 2\\pi f C = ${tn(2 * Math.PI * f * Cf, 4)}\\ ${T('S')}` });
        short = 'B_C';
      }
    } else if (e.type === 'load') {
      title = 'โหลดที่กำหนดค่า Z_L';
      short = 'Z_L';
      lines.push({ kind: 'text', text: 'โหลดนี้กำหนดอิมพีแดนซ์โดยตรง (เช่น สายอากาศที่วัดค่าได้)' });
      lines.push({ kind: 'result', tex: `Z_L = ${tc({ re: e.params.R, im: e.params.X })}${ohm}` });
    } else if (e.type === 'antenna') {
      title = 'สายอากาศ: อ่านอิมพีแดนซ์จากตารางที่ความถี่นี้';
      short = 'ANT';
      const tb = [...(e.table ?? [])].sort((a, b) => a.f - b.f);
      lines.push({ kind: 'text', text: `อิมพีแดนซ์ของสายอากาศเปลี่ยนตามความถี่ ตารางมี ${tb.length} จุด (${tb.length ? `${fmtNum(tb[0].f / 1e6, 3)}–${fmtNum(tb[tb.length - 1].f / 1e6, 3)} MHz` : '—'}) ค่าที่ f = ${fmtNum(fMHz, 3)} MHz ได้จากการประมาณเชิงเส้นระหว่างจุดที่ใกล้ที่สุด` });
      lines.push({ kind: 'code', text: tb.map((pt) => `${fmtNum(pt.f / 1e6, 3)} MHz: ${fmtNum(pt.R, 2)} ${pt.X < 0 ? '−' : '+'} j${fmtNum(Math.abs(pt.X), 2)} Ω`).join('\n') });
      lines.push({ kind: 'result', tex: `Z_L(f) \\approx ${tc(s.Zel!)}${ohm}` });
      lines.push({ kind: 'note', text: 'เปิด "กวาดความถี่" ที่แผง Smith Chart เพื่อเห็นจุดทุกความถี่เป็นเส้นโค้ง (impedance curve) แบบหนังสือ' });
    }
    push({ short, title, tag: 'element', lines, highlight: { elementId: e.id } });
  }

  // ---------- STEP: combine load ----------
  const ZL = res.ZL;
  const singleLoadBlock = loadStages.length === 1 && (loadStages[0].el.type === 'load' || loadStages[0].el.type === 'antenna');
  if (loadStages.length > 0 && !singleLoadBlock) {
    const lines: StepLine[] = [];
    if (seriesOnlyLoad) {
      const terms = lumpedInLoad.map((s) => {
        const e = s.el;
        if (e.type === 'resistor') return 'R';
        if (e.type === 'inductor') return 'jX_L';
        if (e.type === 'capacitor') return 'jX_C';
        if (e.type === 'antenna') return 'Z_{ant}(f)';
        return 'Z_{L}';
      });
      const Rs = lumpedInLoad.reduce((a, s) => a + (s.Zel?.re ?? 0), 0);
      const Xs = lumpedInLoad.filter((s) => s.el.type !== 'resistor').map((s) => s.Zel?.im ?? 0);
      lines.push({ kind: 'text', text: 'อุปกรณ์ต่ออนุกรม อิมพีแดนซ์จึงบวกกันตรง ๆ' });
      lines.push({ kind: 'math', tex: `Z_L = ${terms.join(' + ')}` });
      if (Xs.length > 1 && Xs.every(Number.isFinite)) {
        lines.push({ kind: 'text', text: 'รีแอกแตนซ์ของ L (บวก) และ C (ลบ) หักล้างกัน:' });
        lines.push({ kind: 'math', tex: `X = ${Xs.map((x) => `(${tn(x)})`).join(' + ')} = ${tn(Xs.reduce((a, b) => a + b, 0))}${ohm}` });
        if (Math.abs(Xs.reduce((a, b) => a + b, 0)) < 0.5) lines.push({ kind: 'note', text: 'X ≈ 0 → วงจรเกิด Resonance ที่ความถี่นี้ อิมพีแดนซ์เหลือแต่ส่วนจริง' });
      }
      lines.push({ kind: 'math', tex: `Z_L = ${tn(Rs)} + j(${tn(Xs.reduce((a, b) => a + b, 0))})` });
      lines.push({ kind: 'result', tex: `Z_L \\approx ${tc(ZL)}${ohm}` });
    } else if (shuntOnlyLoad) {
      const Ys = lumpedInLoad.map((s) => s.Yel!);
      const Ytot = Ys.reduce((a, y) => ({ re: a.re + y.re, im: a.im + y.im }), { re: 0, im: 0 });
      lines.push({ kind: 'text', text: 'อุปกรณ์ต่อขนาน จึงบวก admittance แล้วกลับเป็นอิมพีแดนซ์' });
      lines.push({ kind: 'math', tex: `Y_L = \\sum Y_k = ${Ys.map((y) => `(${tc(y, 4)})`).join(' + ')}` });
      lines.push({ kind: 'math', tex: `Y_L = ${tc(Ytot, 4)}\\ ${T('S')}` });
      lines.push({ kind: 'math', tex: `Z_L = \\frac{1}{Y_L}` });
      lines.push({ kind: 'result', tex: `Z_L \\approx ${tc(ZL)}${ohm}` });
      if (Ys.length > 1 && Math.abs(Ytot.im) < 1e-4 * Math.max(1, abs(Ytot))) lines.push({ kind: 'note', text: 'B ≈ 0 → Parallel resonance: อิมพีแดนซ์เหลือแต่ส่วนจริง (สูงสุด)' });
    } else {
      lines.push({ kind: 'text', text: `เริ่มจากปลายวงจรซึ่งเป็น ${res.termination === 'short' ? 'ลัดวงจร (Z = 0)' : 'ปลายเปิด (Z = ∞)'} แล้วเพิ่มอุปกรณ์ทีละตัวย้อนกลับมาที่แหล่งจ่าย` });
      for (const s of loadStages) {
        const spec = ELEMENT_SPECS[s.el.type];
        if (s.kind === 'series') {
          lines.push({ kind: 'text', text: `${spec.name} อนุกรม: บวกอิมพีแดนซ์` });
          lines.push({ kind: 'math', tex: `Z = ${tc(s.Zbefore)} + (${tc(s.Zel!)}) = ${tc(s.Zafter)}${ohm}` });
        } else {
          const Yb = admittance(s.Zbefore);
          lines.push({ kind: 'text', text: `${spec.name} ขนาน: แปลงเป็น admittance แล้วบวก susceptance` });
          lines.push({ kind: 'math', tex: `Y = \\frac{1}{Z} = ${tc(Yb, 4)}\\ ${T('S')}` });
          lines.push({ kind: 'math', tex: `Y' = Y + (${tc(s.Yel!, 4)}) = ${tc(admittance(s.Zafter), 4)}\\ ${T('S')}` });
          lines.push({ kind: 'math', tex: `Z' = \\frac{1}{Y'} = ${tc(s.Zafter)}${ohm}` });
        }
      }
      lines.push({ kind: 'result', tex: `Z_L \\approx ${tc(ZL)}${ohm}` });
    }
    push({ short: 'Z_L', title: 'รวมเป็น Load Impedance Z_L', tag: 'combine', lines, highlight: { point: 'load' } });
  }

  // ---------- STEP: normalize ----------
  const zL = res.zL;
  {
    const lines: StepLine[] = [];
    lines.push({ kind: 'text', text: 'Smith Chart ใช้ค่าปกติ (normalized) เทียบกับ Z₀ ของระบบ' });
    lines.push({ kind: 'math', tex: `z_L = \\frac{Z_L}{Z_0} = \\frac{${tc(ZL)}}{${tn(Z0)}}` });
    lines.push({ kind: 'result', tex: `z_L = ${tc(zL, 3)}` });
    push({ short: 'Normalize', title: 'ทำให้เป็นค่าปกติ (Normalize)', tag: 'normalize', lines, highlight: { point: 'load' } });
  }
  if (isFiniteC(zL)) {
    push({
      short: 'r',
      title: 'หาวงกลม r คงที่',
      tag: 'plot',
      lines: [
        { kind: 'text', text: 'ส่วนจริงของ z_L บอกว่าจุดอยู่บนวงกลมความต้านทานคงที่ (constant-r circle) วงไหน' },
        { kind: 'result', tex: `r = ${tn(zL.re, 3)}` },
        { kind: 'note', text: 'วงกลม r ทุกวงสัมผัสกันที่จุด OPEN ด้านขวา วงเล็กลงเมื่อ r มากขึ้น' },
      ],
      highlight: { rCircle: zL.re, point: 'load' },
    });
    push({
      short: 'x',
      title: 'หาเส้นโค้ง x คงที่',
      tag: 'plot',
      lines: [
        { kind: 'text', text: 'ส่วนจินตภาพบอกเส้นโค้งรีแอกแตนซ์คงที่ (constant-x arc): x > 0 อยู่ครึ่งบน (inductive), x < 0 อยู่ครึ่งล่าง (capacitive)' },
        { kind: 'result', tex: `x = ${tn(zL.im, 3)}` },
        ...(Math.abs(zL.im) < 1e-3 ? [{ kind: 'note', text: 'x = 0 → จุดอยู่บนแกนนอน (แกน resistance) พอดี' } as StepLine] : []),
      ],
      highlight: { xCircle: zL.im, point: 'load' },
    });
    const g = res.gammaL;
    push({
      short: 'จุด Load',
      title: 'จุดตัดคือตำแหน่งของโหลดบน Smith Chart',
      tag: 'plot',
      lines: [
        { kind: 'text', text: 'จุดตัดของวงกลม r กับเส้นโค้ง x คือจุด z_L ซึ่งสัมพันธ์กับสัมประสิทธิ์การสะท้อน Γ' },
        { kind: 'math', tex: `\\Gamma = \\frac{z_L - 1}{z_L + 1} = \\frac{${tc(zL, 3)} - 1}{${tc(zL, 3)} + 1}` },
        { kind: 'result', tex: `\\Gamma = ${tc(g, 3)} = ${tn(abs(g), 3)}\\angle ${tn(deg(arg(g)), 1)}^\\circ` },
        { kind: 'note', text: `ตำแหน่งบนสเกล wavelengths toward generator ≈ ${fmtNum(wtgFromGamma(g), 3)} λ` },
      ],
      highlight: { rCircle: zL.re, xCircle: zL.im, point: 'load' },
    });
    push({
      short: 'SWR circle',
      title: 'วาดวงกลม SWR คงที่',
      tag: 'swr',
      lines: [
        { kind: 'text', text: 'วงกลมที่มีจุดศูนย์กลางอยู่กลางกราฟและผ่านจุดโหลด คือวงกลม |Γ| คงที่ = วงกลม SWR คงที่' },
        { kind: 'math', tex: `|\\Gamma| = ${tn(abs(g), 3)}` },
        { kind: 'note', text: 'ถ้าต่อสายส่งไร้การสูญเสีย อิมพีแดนซ์ที่ตำแหน่งต่าง ๆ บนสายจะวนอยู่บนวงกลมนี้ ระยะรอบกราฟแทนระยะทางเป็นส่วนของ λ' },
      ],
      highlight: { swrCircle: 'load', point: 'load' },
    });
    const swr = res.swrL;
    push({
      short: 'SWR',
      title: 'คำนวณ SWR ของโหลด',
      tag: 'swr',
      lines: [
        { kind: 'math', tex: `SWR = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|} = \\frac{1 + ${tn(abs(g), 3)}}{1 - ${tn(abs(g), 3)}}` },
        { kind: 'result', tex: `SWR \\approx ${Number.isFinite(swr) ? tn(swr, 2) : '\\infty'}` },
        { kind: 'text', text: `Return loss = ${Number.isFinite(res.hasNetwork ? -20 * Math.log10(Math.max(abs(g), 1e-12)) : res.returnLossDb) ? fmtNum(-20 * Math.log10(Math.max(abs(g), 1e-12)), 1) : '∞'} dB, กำลังสะท้อน |Γ|² = ${fmtNum(abs(g) ** 2 * 100, 1)} %` },
        { kind: 'note', text: 'อ่านค่า SWR ได้จากจุดที่วงกลม SWR ตัดแกนนอนด้านขวา (r = SWR)' },
      ],
      highlight: { swrCircle: 'load', point: 'load', rCircle: Number.isFinite(swr) ? swr : undefined },
    });
    pushReadOff(g, 'load', 'z_L');
  }

  // ---------- STEP: network stages (toward generator) ----------
  if (res.hasNetwork) {
    for (const s of netStages) {
      const spec = ELEMENT_SPECS[s.el.type];
      const lines: StepLine[] = [];
      const zb = s.zbefore;
      const za = s.zafter;
      let short = spec.symbol;
      let title = `${spec.name}`;
      const hl: Highlight = { elementId: s.el.id, stageIndex: s.index, point: s.index };
      if (s.kind === 'line') {
        const ln = s.line!;
        const isQwt = s.el.type === 'qwt';
        title = isQwt ? 'หม้อแปลง λ/4 (Quarter-Wave Transformer)' : `สายส่ง Transmission Line`;
        short = isQwt ? 'λ/4' : 'TL';
        lines.push({ kind: 'text', text: `สายส่ง Z₀ = ${fmtNum(ln.Z0)} Ω ยาว l = ${fmtNum(ln.lenLambda, 3)} λ${ln.lossDb > 0 ? ` (สูญเสีย ${fmtNum(ln.lossDb, 2)} dB)` : ' (ไร้การสูญเสีย)'}` });
        lines.push({ kind: 'math', tex: `\\beta l = \\frac{2\\pi}{\\lambda} l = 2\\pi(${tn(ln.lenLambda, 3)}) = ${tn(ln.betaL, 3)}\\ ${T('rad')} = ${tn(ln.degrees, 1)}^\\circ` });
        if (isQwt) {
          lines.push({ kind: 'text', text: 'สายยาวหนึ่งในสี่คลื่นทำ impedance inversion:' });
          lines.push({ kind: 'math', tex: `Z_{in} = \\frac{Z_t^2}{Z_L} = \\frac{(${tn(ln.Z0)})^2}{${tc(s.Zbefore)}}` });
          lines.push({ kind: 'result', tex: `Z_{in} \\approx ${tc(s.Zafter)}${ohm} \\quad\\Rightarrow\\quad z_{in} = ${tc(za, 3)}` });
          lines.push({ kind: 'note', text: `เลือก Z_t = √(Z₀·R_L) = √(${fmtNum(Z0)}×${fmtNum(s.Zbefore.re)}) = ${fmtNum(Math.sqrt(Z0 * Math.max(0, s.Zbefore.re)), 2)} Ω จะได้ Z_in = Z₀ พอดี (ถ้า Z_L เป็นจำนวนจริง)` });
        } else {
          if (Math.abs(ln.Z0 - Z0) < 1e-9) {
            lines.push({ kind: 'text', text: 'บน Smith Chart: เดินตามวงกลม SWR คงที่ ไปทาง generator (ตามเข็มนาฬิกา) เป็นระยะ l บนสเกลรอบนอก ซึ่งเท่ากับมุม 2βl' });
            lines.push({ kind: 'math', tex: `2\\beta l = ${tn(2 * ln.degrees, 1)}^\\circ` });
            lines.push({ kind: 'math', tex: `z_{in} = \\frac{z_L + j\\tan\\beta l}{1 + j z_L \\tan\\beta l}` });
            lines.push({ kind: 'math', tex: `z_{in} = \\frac{(${tc(zb, 3)}) + j(${tn(Math.tan(ln.betaL), 3)})}{1 + j(${tc(zb, 3)})(${tn(Math.tan(ln.betaL), 3)})}` });
          } else {
            lines.push({ kind: 'text', text: `สายนี้มี Z₀ ต่างจากระบบ จึงต้อง normalize ใหม่ด้วย Z₀ ของสาย (${fmtNum(ln.Z0)} Ω) ก่อนหมุน แล้ว normalize กลับด้วย ${fmtNum(Z0)} Ω` });
            lines.push({ kind: 'math', tex: `z'_L = \\frac{Z_L}{${tn(ln.Z0)}} = ${tc({ re: s.Zbefore.re / ln.Z0, im: s.Zbefore.im / ln.Z0 }, 3)}` });
            lines.push({ kind: 'math', tex: `Z_{in} = Z_0' \\frac{Z_L + jZ_0'\\tan\\beta l}{Z_0' + jZ_L\\tan\\beta l}` });
          }
          lines.push({ kind: 'result', tex: `Z_{in} \\approx ${tc(s.Zafter)}${ohm} \\quad\\Rightarrow\\quad z_{in} = ${tc(za, 3)}` });
          const w1 = wtgFromGamma(s.path[0]);
          lines.push({ kind: 'note', text: `บนสเกล: จาก ${fmtNum(w1, 3)} λ เดินไปอีก ${fmtNum(ln.lenLambda, 3)} λ → ${fmtNum((w1 + ln.lenLambda) % 0.5, 3)} λ (toward generator)` });
          hl.wtg = [w1, ln.lenLambda];
          hl.swrCircle = 'load';
        }
      } else if (s.kind === 'stub') {
        const ln = s.line!;
        const kind = s.el.type === 'stub_short' ? 'short' : 'open';
        const yb = admittance(zb);
        const ya = admittance(za);
        const bNorm = s.B! * Z0;
        title = kind === 'short' ? 'สตับขนานปลายลัดวงจร (Short Stub)' : 'สตับขนานปลายเปิด (Open Stub)';
        short = 'Stub';
        lines.push({ kind: 'text', text: 'สตับต่อขนาน จึงทำงานในโดเมน admittance: y = 1/z (ใช้กราฟ Y หรือหมุนจุด 180°)' });
        lines.push({ kind: 'math', tex: `y = \\frac{1}{z} = \\frac{1}{${tc(zb, 3)}} = ${tc(yb, 3)}` });
        lines.push({ kind: 'text', text: `ความยาวสตับ l = ${fmtNum(ln.lenLambda, 3)} λ → βl = ${fmtNum(ln.degrees, 1)}°` });
        if (kind === 'short') lines.push({ kind: 'math', tex: `b_{stub} = -\\cot\\beta l \\cdot \\frac{Z_0}{Z_{0,stub}} = -\\cot(${tn(ln.degrees, 1)}^\\circ)\\cdot\\frac{${tn(Z0)}}{${tn(ln.Z0)}} = ${tn(bNorm, 3)}` });
        else lines.push({ kind: 'math', tex: `b_{stub} = \\tan\\beta l \\cdot \\frac{Z_0}{Z_{0,stub}} = \\tan(${tn(ln.degrees, 1)}^\\circ)\\cdot\\frac{${tn(Z0)}}{${tn(ln.Z0)}} = ${tn(bNorm, 3)}` });
        lines.push({ kind: 'math', tex: `y' = y + jb_{stub} = ${tc(yb, 3)} + j(${tn(bNorm, 3)}) = ${tc(ya, 3)}` });
        lines.push({ kind: 'result', tex: `z' = \\frac{1}{y'} = ${tc(za, 3)}` });
        if (Math.abs(yb.re - 1) < 0.03) {
          lines.push({ kind: 'note', text: `ก่อนใส่สตับ y อยู่บนวงกลม g = 1 แล้ว (g ≈ ${fmtNum(yb.re, 3)}) จึงต้องการสตับที่ให้ b = ${fmtNum(-yb.im, 3)} เพื่อหักล้าง` });
        } else {
          lines.push({ kind: 'warn', text: `y ยังไม่อยู่บนวงกลม g = 1 (g = ${fmtNum(yb.re, 3)}) ปรับตำแหน่งสตับ (ความยาวสายระหว่างสตับกับโหลด) จน g = 1 ก่อน แล้วค่อยปรับความยาวสตับ` });
        }
        hl.showY = true;
        hl.gCircle = yb.re;
      } else if (s.kind === 'shunt') {
        const yb = admittance(zb);
        const ya = admittance(za);
        title = `${spec.name} ขนาน (ใช้ admittance)`;
        short = `${spec.symbol}↓`;
        lines.push({ kind: 'text', text: 'อุปกรณ์ขนานเพิ่ม susceptance จึงเดินตามวงกลม g คงที่ (บนกราฟ Y)' });
        lines.push({ kind: 'math', tex: `y = \\frac{1}{z} = ${tc(yb, 3)}` });
        lines.push({ kind: 'math', tex: `b_{el} = B\\cdot Z_0 = (${tn(s.B!, 5)})(${tn(Z0)}) = ${tn(s.B! * Z0, 3)}` });
        lines.push({ kind: 'math', tex: `y' = y + jb_{el} = ${tc(ya, 3)}` });
        lines.push({ kind: 'result', tex: `z' = \\frac{1}{y'} = ${tc(za, 3)}` });
        hl.showY = true;
        hl.gCircle = yb.re;
      } else {
        title = `${spec.name} อนุกรม`;
        const x = s.X ?? 0;
        lines.push({ kind: 'text', text: 'อุปกรณ์อนุกรมเพิ่มรีแอกแตนซ์ จึงเดินตามวงกลม r คงที่' });
        if (s.el.type === 'inductor') lines.push({ kind: 'math', tex: `X_L = 2\\pi f L = ${tn(x)}${ohm} \\Rightarrow x = ${tn(x / Z0, 3)}` });
        else if (s.el.type === 'capacitor') lines.push({ kind: 'math', tex: `X_C = -\\frac{1}{2\\pi f C} = ${tn(x)}${ohm} \\Rightarrow x = ${tn(x / Z0, 3)}` });
        else if (s.line) {
          title = `${spec.name} ต่ออนุกรม (series stub)`;
          lines.push({ kind: 'text', text: `สตับที่ต่ออนุกรมกับสาย ทำหน้าที่เป็นรีแอกแตนซ์อนุกรม: ${s.el.type === 'stub_open' ? 'ปลายเปิด X = −Z₀cot βl' : 'ปลายลัด X = Z₀tan βl'} (βl = ${fmtNum(s.line.degrees, 1)}°)` });
          lines.push({ kind: 'math', tex: `X_{stub} = ${tn(x)}${ohm} \\Rightarrow x = ${tn(x / Z0, 3)}` });
        } else lines.push({ kind: 'math', tex: `Z_{el} = ${tc(s.Zel!)}${ohm}` });
        lines.push({ kind: 'math', tex: `z' = z + \\frac{Z_{el}}{Z_0} = ${tc(zb, 3)} + (${tc({ re: s.Zel!.re / Z0, im: s.Zel!.im / Z0 }, 3)})` });
        lines.push({ kind: 'result', tex: `z' = ${tc(za, 3)}` });
        hl.rCircle = zb.re;
      }
      push({ short, title, tag: 'network', lines, highlight: hl });
    }
  }

  // ---------- STEP: final / matching ----------
  {
    const g = res.gammaIn;
    const lines: StepLine[] = [];
    if (res.hasNetwork) {
      lines.push({ kind: 'text', text: 'เปรียบเทียบก่อนและหลัง network:' });
      lines.push({ kind: 'math', tex: `${T('BEFORE:')}\\; z_L = ${tc(res.zL, 3)},\\; SWR = ${Number.isFinite(res.swrL) ? tn(res.swrL, 2) : '\\infty'}` });
      lines.push({ kind: 'math', tex: `${T('AFTER:')}\\;\\; z_{in} = ${tc(res.zin, 3)},\\; SWR = ${Number.isFinite(res.swrIn) ? tn(res.swrIn, 2) : '\\infty'}` });
    } else {
      lines.push({ kind: 'math', tex: `z_{in} = z_L = ${tc(res.zin, 3)},\\qquad SWR = ${Number.isFinite(res.swrIn) ? tn(res.swrIn, 2) : '\\infty'}` });
    }
    if (res.matched) {
      lines.push({ kind: 'result', tex: `\\checkmark\\ ${T('MATCHED')}\\quad z_{in} \\approx 1 + j0,\\ SWR = ${tn(res.swrIn, 2)}` });
      lines.push({ kind: 'note', text: 'จุดอยู่ที่ศูนย์กลาง Smith Chart: ไม่มีคลื่นสะท้อน กำลังส่งไปโหลดทั้งหมด' });
    } else {
      lines.push({ kind: 'math', tex: `|\\Gamma_{in}| = ${tn(abs(g), 3)},\\quad ${T('Return loss')} = ${Number.isFinite(res.returnLossDb) ? tn(res.returnLossDb, 1) : '\\infty'}\\ ${T('dB')}` });
      const z = res.zin;
      const y = admittance(z);
      const hints: string[] = [];
      if (isFiniteC(z)) {
        if (z.im > 0.05) hints.push('z_in เป็น inductive (อยู่ครึ่งบน) → ต่อ C อนุกรมจะลดจุดลงมาหาแกนนอนตามวงกลม r คงที่');
        if (z.im < -0.05) hints.push('z_in เป็น capacitive (อยู่ครึ่งล่าง) → ต่อ L อนุกรมจะยกจุดขึ้นหาแกนนอนตามวงกลม r คงที่');
        if (Math.abs(z.re - 1) < 0.05 && Math.abs(z.im) > 0.05) hints.push('จุดอยู่บนวงกลม r = 1 แล้ว: ใส่รีแอกแตนซ์อนุกรมที่หักล้าง x ก็จะถึงศูนย์กลาง');
        if (isFiniteC(y) && Math.abs(y.re - 1) < 0.05 && Math.abs(y.im) > 0.05) hints.push('จุดอยู่บนวงกลม g = 1 แล้ว: ใส่สตับหรือ L/C ขนานที่ให้ b หักล้างกัน ก็จะถึงศูนย์กลาง');
        if (Math.abs(z.im) < 0.05 && Math.abs(z.re - 1) > 0.05) hints.push('z_in เป็นจำนวนจริงแต่ ≠ 1: ใช้หม้อแปลง λ/4 ที่มี Z_t = √(Z₀·R) ได้เลย');
        if (hints.length === 0) hints.push('ใช้สายส่งหมุนจุดตามวงกลม SWR ไปจนตัดวงกลม g = 1 แล้วใส่สตับขนานหักล้าง b หรือใช้ L-section');
      }
      for (const h of hints) lines.push({ kind: 'note', text: h });
    }
    push({
      short: 'Matching',
      title: res.matched ? '✓ MATCHED — จุดอยู่ที่ศูนย์กลาง' : 'ผลลัพธ์และแนวทาง Matching',
      tag: 'match',
      lines,
      highlight: { point: 'in', swrCircle: 'in', center: true },
    });
    if (res.hasNetwork) pushReadOff(g, 'in', 'z_in');
  }

  return steps;
};
