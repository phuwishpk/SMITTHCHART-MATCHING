// ---------------------------------------------------------------
// Matching helpers (analytic where the textbook gives them):
//  - quarter-wave transformer
//  - single shunt stub (Pozar §5.2)
//  - double stub (Pozar §5.3)
//  - L-section (Pozar §5.1)
// ---------------------------------------------------------------
import { Complex, C, abs, arg, isFiniteC } from './complex';
import { gammaFromZ, zFromGamma, admittance, normalize, rotateTowardGenerator, lineInput } from './rf';

const mod05 = (l: number): number => {
  let v = l % 0.5;
  if (v < 0) v += 0.5;
  return v;
};

/** stub length (λ) giving normalized susceptance bNorm (relative to Y0sys) on main line */
export const stubLengthForSusceptance = (kind: 'short' | 'open', bNorm: number, Z0s: number, Z0sys: number): number => {
  if (!Number.isFinite(bNorm)) return 0;
  if (kind === 'short') {
    if (Math.abs(bNorm) < 1e-12) return 0.25;
    return mod05(Math.atan(-Z0sys / (bNorm * Z0s)) / (2 * Math.PI));
  }
  return mod05(Math.atan((bNorm * Z0s) / Z0sys) / (2 * Math.PI));
};

// ---------- Quarter-wave transformer ----------
export interface QwtSolution {
  /** line length (λ) to insert between load and transformer to make Z real (0 if already real) */
  dLambda: number;
  /** real impedance at the transformer end */
  Rreal: number;
  Zt: number;
}

export const solveQwt = (ZL: Complex, Z0: number): QwtSolution[] => {
  const sols: QwtSolution[] = [];
  if (!isFiniteC(ZL)) return sols;
  const g = gammaFromZ(ZL, Z0);
  if (Math.abs(ZL.im) < 1e-9 && ZL.re > 0) {
    sols.push({ dLambda: 0, Rreal: ZL.re, Zt: Math.sqrt(Z0 * ZL.re) });
    return sols;
  }
  // rotate toward generator until Γ is real: angle -> 0 (Rmax) or π (Rmin)
  const th = arg(g);
  for (const target of [0, Math.PI]) {
    let dth = th - target; // clockwise rotation needed (rad)
    dth = ((dth % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const d = dth / (4 * Math.PI);
    const gr = rotateTowardGenerator(g, d);
    const zr = zFromGamma(gr);
    const R = zr.re * Z0;
    if (R > 0 && Number.isFinite(R)) sols.push({ dLambda: d, Rreal: R, Zt: Math.sqrt(Z0 * R) });
  }
  return sols;
};

// ---------- Single shunt stub ----------
export interface SingleStubSolution {
  dLambda: number;
  /** normalized admittance at the stub position (should be 1 + jb) */
  yAtStub: Complex;
  /** required stub normalized susceptance (adds to cancel) */
  bStub: number;
  lLambda: number;
}

export const solveSingleStub = (ZL: Complex, Z0: number, kind: 'short' | 'open', Z0s: number = Z0): SingleStubSolution[] => {
  if (!isFiniteC(ZL)) return [];
  const RL = ZL.re;
  const XL = ZL.im;
  const ts: number[] = [];
  if (Math.abs(RL - Z0) < 1e-9) {
    ts.push(-XL / (2 * Z0));
  } else {
    const root = Math.sqrt((RL * ((Z0 - RL) ** 2 + XL ** 2)) / Z0);
    ts.push((XL + root) / (RL - Z0), (XL - root) / (RL - Z0));
  }
  const sols: SingleStubSolution[] = [];
  for (const t of ts) {
    let d = t >= 0 ? Math.atan(t) / (2 * Math.PI) : (Math.PI + Math.atan(t)) / (2 * Math.PI);
    d = mod05(d);
    const Zd = lineInput(ZL, Z0, d, 0);
    const y = admittance(normalize(Zd, Z0));
    const bStub = -y.im;
    const l = stubLengthForSusceptance(kind, bStub, Z0s, Z0);
    sols.push({ dLambda: d, yAtStub: y, bStub, lLambda: l });
  }
  sols.sort((a, b) => a.dLambda - b.dLambda);
  return sols;
};

// ---------- Double stub ----------
export interface DoubleStubSolution {
  b1: number;
  b2: number;
  l1Lambda: number;
  l2Lambda: number;
  /** admittance after stub 1 (normalized) */
  y1: Complex;
  /** admittance arriving at stub 2 before stub 2 (normalized) */
  y2before: Complex;
}

/**
 * Double stub: stub1 sits at distance d0 (λ) from the load, stub2 is
 * spacing s (λ) further toward the generator.
 */
export const solveDoubleStub = (
  ZL: Complex,
  Z0: number,
  d0: number,
  spacing: number,
  kind: 'short' | 'open',
  Z0s: number = Z0,
): { solutions: DoubleStubSolution[]; forbidden: boolean; gL: number } => {
  if (!isFiniteC(ZL)) return { solutions: [], forbidden: true, gL: Infinity };
  const Zd0 = lineInput(ZL, Z0, d0, 0);
  const yL = admittance(normalize(Zd0, Z0));
  const gL = yL.re;
  const bL = yL.im;
  const t = Math.tan(2 * Math.PI * spacing);
  const disc = (1 + t * t) * gL - gL * gL * t * t;
  if (disc < 0 || Math.abs(t) < 1e-12) return { solutions: [], forbidden: true, gL };
  const sols: DoubleStubSolution[] = [];
  for (const sgn of [1, -1]) {
    const b1 = -bL + (1 + sgn * Math.sqrt(disc)) / t;
    const y1 = C(gL, bL + b1);
    // propagate through spacing toward generator
    const z1 = admittanceInverse(y1);
    const Z1ohm = isFiniteC(z1) ? { re: z1.re * Z0, im: z1.im * Z0 } : C(Infinity, 0);
    const Z2 = lineInput(Z1ohm, Z0, spacing, 0);
    const y2 = admittance(normalize(Z2, Z0));
    const b2 = -y2.im;
    sols.push({
      b1,
      b2,
      l1Lambda: stubLengthForSusceptance(kind, b1, Z0s, Z0),
      l2Lambda: stubLengthForSusceptance(kind, b2, Z0s, Z0),
      y1,
      y2before: y2,
    });
  }
  return { solutions: sols, forbidden: false, gL };
};

const admittanceInverse = (y: Complex): Complex => (abs(y) < 1e-15 ? C(Infinity, 0) : { re: y.re / (y.re ** 2 + y.im ** 2), im: -y.im / (y.re ** 2 + y.im ** 2) });

// ---------- L-section ----------
export interface LMatchSolution {
  /** 'shunt-first' : shunt B at load then series X toward source; 'series-first': series X at load then shunt B */
  topology: 'shunt-first' | 'series-first';
  X: number; // ohms (series)
  B: number; // siemens (shunt)
  seriesEl: { type: 'inductor' | 'capacitor'; value: number }; // SI
  shuntEl: { type: 'inductor' | 'capacitor'; value: number }; // SI
}

export const solveLMatch = (ZL: Complex, Z0: number, f: number): LMatchSolution[] => {
  if (!isFiniteC(ZL)) return [];
  const RL = ZL.re;
  const XL = ZL.im;
  const w = 2 * Math.PI * f;
  const sols: LMatchSolution[] = [];
  const toSeries = (X: number) => (X >= 0 ? { type: 'inductor' as const, value: X / w } : { type: 'capacitor' as const, value: -1 / (w * X) });
  const toShunt = (B: number) => (B >= 0 ? { type: 'capacitor' as const, value: B / w } : { type: 'inductor' as const, value: -1 / (w * B) });
  if (RL > Z0) {
    const root = Math.sqrt(RL / Z0) * Math.sqrt(RL * RL + XL * XL - Z0 * RL);
    for (const sgn of [1, -1]) {
      const B = (XL + sgn * root) / (RL * RL + XL * XL);
      const X = 1 / B + (XL * Z0) / RL - Z0 / (B * RL);
      sols.push({ topology: 'shunt-first', X, B, seriesEl: toSeries(X), shuntEl: toShunt(B) });
    }
  } else if (RL < Z0) {
    for (const sgn of [1, -1]) {
      const X = sgn * Math.sqrt(RL * (Z0 - RL)) - XL;
      const B = (sgn * Math.sqrt((Z0 - RL) / RL)) / Z0;
      sols.push({ topology: 'series-first', X, B, seriesEl: toSeries(X), shuntEl: toShunt(B) });
    }
  } else {
    // RL == Z0: only need to cancel XL with a series element
    const X = -XL;
    sols.push({ topology: 'series-first', X, B: 0, seriesEl: toSeries(X), shuntEl: { type: 'capacitor', value: 0 } });
  }
  return sols;
};

// ---------- the eight L-network configurations (Caron Fig. 4-1 a–h) ----------
export type LCase = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export interface LCaseSpec {
  id: LCase;
  /** element adjacent to the load first, then the element toward the source */
  first: { orient: 'shunt' | 'series'; type: 'inductor' | 'capacitor' };
  second: { orient: 'shunt' | 'series'; type: 'inductor' | 'capacitor' };
  label: string;
}
export const L_CASES: LCaseSpec[] = [
  { id: 'a', first: { orient: 'shunt', type: 'capacitor' }, second: { orient: 'series', type: 'inductor' }, label: 'shunt C → series L' },
  { id: 'b', first: { orient: 'series', type: 'inductor' }, second: { orient: 'shunt', type: 'capacitor' }, label: 'series L → shunt C' },
  { id: 'c', first: { orient: 'shunt', type: 'inductor' }, second: { orient: 'series', type: 'capacitor' }, label: 'shunt L → series C' },
  { id: 'd', first: { orient: 'series', type: 'capacitor' }, second: { orient: 'shunt', type: 'inductor' }, label: 'series C → shunt L' },
  { id: 'e', first: { orient: 'shunt', type: 'capacitor' }, second: { orient: 'series', type: 'capacitor' }, label: 'shunt C → series C' },
  { id: 'f', first: { orient: 'series', type: 'capacitor' }, second: { orient: 'shunt', type: 'capacitor' }, label: 'series C → shunt C' },
  { id: 'g', first: { orient: 'shunt', type: 'inductor' }, second: { orient: 'series', type: 'inductor' }, label: 'shunt L → series L' },
  { id: 'h', first: { orient: 'series', type: 'inductor' }, second: { orient: 'shunt', type: 'inductor' }, label: 'series L → shunt L' },
];

export interface LCaseResult {
  spec: LCaseSpec;
  feasible: boolean;
  /** element values in SI (H or F) — first (at load), second (toward source) */
  first?: number;
  second?: number;
  /** normalized reactance / susceptance added */
  xb1?: number;
  xb2?: number;
  reason?: string;
}

/**
 * Solve all eight L-network cases for load ZL at frequency f (system Z0).
 * "first" is the element adjacent to the load. Each case is feasible only when the
 * required signs of the two reactive elements agree with its L/C types.
 */
export const solveLCases = (ZL: Complex, Z0: number, f: number): LCaseResult[] => {
  const w = 2 * Math.PI * f;
  const z = normalize(ZL, Z0);
  const y = admittance(z);
  const out: LCaseResult[] = [];
  for (const spec of L_CASES) {
    const res: LCaseResult = { spec, feasible: false };
    const cands: { xb1: number; xb2: number }[] = [];
    if (spec.first.orient === 'shunt') {
      // add jb1 so that the re-converted impedance lands on r = 1
      const g = y.re;
      const b = y.im;
      if (g > 0 && g <= 1) {
        const root = Math.sqrt(g - g * g);
        for (const sgn of [1, -1]) {
          const b1 = sgn * root - b;
          const y1 = { re: g, im: b + b1 };
          const z1 = admittance(y1); // r = 1 - j x'
          cands.push({ xb1: b1, xb2: -z1.im });
        }
      } else res.reason = 'g > 1: โหลดอยู่ในวงกลม g = 1 ใช้ตัวขนานก่อนไม่ได้';
    } else {
      const r = z.re;
      const x = z.im;
      if (r > 0 && r <= 1) {
        const root = Math.sqrt(r - r * r);
        for (const sgn of [1, -1]) {
          const x1 = sgn * root - x;
          const z1 = { re: r, im: x + x1 };
          const y1 = admittance(z1); // g = 1 - j b'
          cands.push({ xb1: x1, xb2: -y1.im });
        }
      } else res.reason = 'r > 1: โหลดอยู่ในวงกลม r = 1 ใช้ตัวอนุกรมก่อนไม่ได้';
    }
    const signOk = (v: number, orient: 'shunt' | 'series', type: 'inductor' | 'capacitor') =>
      orient === 'series' ? (type === 'inductor' ? v > 0 : v < 0) : type === 'capacitor' ? v > 0 : v < 0;
    const pick = cands.find((cd) => signOk(cd.xb1, spec.first.orient, spec.first.type) && signOk(cd.xb2, spec.second.orient, spec.second.type));
    if (pick) {
      const toVal = (v: number, orient: 'shunt' | 'series', type: 'inductor' | 'capacitor') => {
        if (orient === 'series') {
          const X = v * Z0;
          return type === 'inductor' ? X / w : -1 / (w * X);
        }
        const B = v / Z0;
        return type === 'capacitor' ? B / w : -1 / (w * B);
      };
      res.feasible = true;
      res.xb1 = pick.xb1;
      res.xb2 = pick.xb2;
      res.first = toVal(pick.xb1, spec.first.orient, spec.first.type);
      res.second = toVal(pick.xb2, spec.second.orient, spec.second.type);
    } else if (!res.reason) res.reason = 'เครื่องหมายของค่าที่ต้องการไม่ตรงกับชนิด L/C ของวงจรนี้';
    out.push(res);
  }
  return out;
};
