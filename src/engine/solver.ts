// ---------------------------------------------------------------
// Circuit Solver: turns the ladder circuit into impedances at every
// node (walking from the far end back to the RF source) and records
// a trace that the Smith Chart engine and Explanation engine consume.
// ---------------------------------------------------------------
import { Complex, C, add, abs, inv, isFiniteC, scale } from './complex';
import { Circuit, CircuitElement, isLine, isStub } from './circuit';
import {
  XL, XC, gammaFromZ, normalize, swrFromGamma, returnLossDb, mismatchLossDb, lineInput, stubInput, betaL,
} from './rf';

export type StageKind = 'series' | 'shunt' | 'line' | 'stub';

export interface Stage {
  index: number;
  el: CircuitElement;
  kind: StageKind;
  /** impedance looking toward the far end BEFORE this element (ohms) */
  Zbefore: Complex;
  /** impedance looking toward the far end AFTER this element (ohms) */
  Zafter: Complex;
  /** normalized to system Z0 */
  zbefore: Complex;
  zafter: Complex;
  /** element's own series impedance (series kind) */
  Zel?: Complex;
  /** element's own shunt admittance in siemens (shunt / stub kinds) */
  Yel?: Complex;
  /** element's own reactance in ohms (R/L/C series) */
  X?: number;
  /** element's own susceptance in siemens (R/L/C shunt) */
  B?: number;
  /** line / stub info */
  line?: { Z0: number; lenLambda: number; betaL: number; lossDb: number; degrees: number };
  /** Γ-plane path (system-normalized) traversed by this element */
  path: Complex[];
  /** true if this element belongs to the trailing "load" group */
  inLoad: boolean;
}

export interface SolveResult {
  circuit: Circuit;
  stages: Stage[];
  termination: 'short' | 'open' | 'none';
  Zterm: Complex;
  /** index of the first element belonging to the load group (elements.length if none) */
  loadStart: number;
  /** impedance of the load group (ohms), normalized, Γ, SWR */
  ZL: Complex;
  zL: Complex;
  gammaL: Complex;
  swrL: number;
  /** input impedance seen by the source */
  Zin: Complex;
  zin: Complex;
  gammaIn: Complex;
  swrIn: number;
  returnLossDb: number;
  mismatchLossDb: number;
  matched: boolean;
  /** true when the network (non-load) part has at least one stage */
  hasNetwork: boolean;
  warnings: string[];
}

const PATH_N = 40;

const elementSeriesImpedance = (el: CircuitElement, f: number): { Z: Complex; X?: number } => {
  switch (el.type) {
    case 'resistor':
      return { Z: C(el.params.R, 0) };
    case 'inductor': {
      const x = XL(f, el.params.L * 1e-9);
      return { Z: C(0, x), X: x };
    }
    case 'capacitor': {
      const x = XC(f, el.params.C * 1e-12);
      return { Z: Number.isFinite(x) ? C(0, x) : C(Infinity, 0), X: x };
    }
    case 'load':
      return { Z: C(el.params.R, el.params.X) };
    default:
      return { Z: C(0, 0) };
  }
};

const elementShuntAdmittance = (el: CircuitElement, f: number): { Y: Complex; B?: number } => {
  switch (el.type) {
    case 'resistor':
      return { Y: el.params.R <= 0 ? C(Infinity, 0) : C(1 / el.params.R, 0) };
    case 'inductor': {
      const x = XL(f, el.params.L * 1e-9);
      if (x <= 0) return { Y: C(Infinity, 0), B: -Infinity };
      return { Y: C(0, -1 / x), B: -1 / x };
    }
    case 'capacitor': {
      const b = 2 * Math.PI * f * el.params.C * 1e-12;
      return { Y: C(0, b), B: b };
    }
    case 'load': {
      const Z = C(el.params.R, el.params.X);
      return { Y: abs(Z) < 1e-15 ? C(Infinity, 0) : inv(Z) };
    }
    default:
      return { Y: C(0, 0) };
  }
};

const addShunt = (Z: Complex, Y: Complex): Complex => {
  if (!isFiniteC(Y)) return C(0, 0); // shunt short
  if (!isFiniteC(Z)) return abs(Y) < 1e-18 ? C(Infinity, 0) : inv(Y); // open node + Y
  if (abs(Z) < 1e-15) return C(0, 0); // already shorted
  const Ytot = add(inv(Z), Y);
  return abs(Ytot) < 1e-18 ? C(Infinity, 0) : inv(Ytot);
};

const addSeries = (Z: Complex, Zel: Complex): Complex => {
  if (!isFiniteC(Z) || !isFiniteC(Zel)) return C(Infinity, 0);
  return add(Z, Zel);
};

/** Determine where the trailing "load group" begins. */
export const findLoadStart = (elements: CircuitElement[]): number => {
  const n = elements.length;
  if (n === 0) return 0;
  const last = elements[n - 1];
  if (last.type === 'load') return n - 1;
  // trailing lumped elements (R/L/C/load) form the load group
  let i = n - 1;
  while (i >= 0 && !isLine(elements[i].type) && !isStub(elements[i].type)) i--;
  return i + 1;
};

export const solveCircuit = (circuit: Circuit): SolveResult => {
  const { f, Z0, elements } = circuit;
  const warnings: string[] = [];
  const n = elements.length;

  // termination at the far end of the ladder
  let termination: SolveResult['termination'] = 'none';
  let Z: Complex;
  if (n === 0) {
    Z = C(0, 0);
    termination = 'short';
  } else if (elements[n - 1].orient === 'series') {
    Z = C(0, 0);
    termination = 'short';
  } else {
    Z = C(Infinity, 0);
    termination = 'open';
  }
  const Zterm = Z;
  const loadStart = findLoadStart(elements);

  const stages: Stage[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const el = elements[i];
    const Zbefore = Z;
    let Zafter: Complex = Z;
    const path: Complex[] = [];
    const stage: Partial<Stage> = { index: i, el, Zbefore, path, inLoad: i >= loadStart };

    if (isLine(el.type)) {
      const Z0line = el.type === 'qwt' ? el.params.Zt : el.params.Z0;
      const lenLambda = el.type === 'qwt' ? 0.25 : el.params.len;
      const lossDb = el.type === 'qwt' ? 0 : el.params.lossDb ?? 0;
      stage.kind = 'line';
      stage.line = { Z0: Z0line, lenLambda, betaL: betaL(lenLambda), lossDb, degrees: (lenLambda * 360) };
      Zafter = lineInput(Zbefore, Z0line, lenLambda, lossDb);
      for (let k = 0; k <= PATH_N; k++) {
        const t = k / PATH_N;
        path.push(gammaFromZ(lineInput(Zbefore, Z0line, lenLambda * t, lossDb * t), Z0));
      }
    } else if (isStub(el.type)) {
      const kind = el.type === 'stub_short' ? 'short' : 'open';
      const Zs = stubInput(kind, el.params.Z0, el.params.len);
      const Ys = isFiniteC(Zs) ? (abs(Zs) < 1e-15 ? C(Infinity, 0) : inv(Zs)) : C(0, 0);
      stage.kind = 'stub';
      stage.Yel = Ys;
      stage.B = isFiniteC(Ys) ? Ys.im : (kind === 'short' ? -Infinity : Infinity);
      stage.line = { Z0: el.params.Z0, lenLambda: el.params.len, betaL: betaL(el.params.len), lossDb: 0, degrees: el.params.len * 360 };
      Zafter = addShunt(Zbefore, Ys);
      if (isFiniteC(Ys)) {
        for (let k = 0; k <= PATH_N; k++) {
          const t = k / PATH_N;
          path.push(gammaFromZ(addShunt(Zbefore, scale(Ys, t)), Z0));
        }
      } else {
        path.push(gammaFromZ(Zbefore, Z0), gammaFromZ(Zafter, Z0));
      }
      if (i === n - 1) warnings.push('สตับตัวสุดท้ายต่อกับปลายเปิด: อิมพีแดนซ์ที่เห็นคืออิมพีแดนซ์ของสตับเอง');
    } else if (el.orient === 'series') {
      const { Z: Zel, X } = elementSeriesImpedance(el, f);
      stage.kind = 'series';
      stage.Zel = Zel;
      stage.X = X;
      Zafter = addSeries(Zbefore, Zel);
      if (isFiniteC(Zel) && isFiniteC(Zbefore)) {
        for (let k = 0; k <= PATH_N; k++) {
          const t = k / PATH_N;
          path.push(gammaFromZ(add(Zbefore, scale(Zel, t)), Z0));
        }
      } else {
        path.push(gammaFromZ(Zbefore, Z0), gammaFromZ(Zafter, Z0));
      }
      if (!isFiniteC(Zbefore) && i < n - 1) warnings.push(`${el.type} อนุกรมต่ออยู่กับปลายเปิด จึงไม่มีผลต่ออิมพีแดนซ์`);
    } else {
      const { Y: Yel, B } = elementShuntAdmittance(el, f);
      stage.kind = 'shunt';
      stage.Yel = Yel;
      stage.B = B;
      Zafter = addShunt(Zbefore, Yel);
      if (isFiniteC(Yel) && isFiniteC(Zbefore) && abs(Zbefore) > 1e-15) {
        for (let k = 0; k <= PATH_N; k++) {
          const t = k / PATH_N;
          path.push(gammaFromZ(addShunt(Zbefore, scale(Yel, t)), Z0));
        }
      } else if (isFiniteC(Yel) && !isFiniteC(Zbefore)) {
        // from open node: y grows from 0 to Yel
        for (let k = 0; k <= PATH_N; k++) {
          const t = k / PATH_N;
          path.push(gammaFromZ(addShunt(Zbefore, scale(Yel, t)), Z0));
        }
      } else {
        path.push(gammaFromZ(Zbefore, Z0), gammaFromZ(Zafter, Z0));
      }
      if (abs(Zbefore) < 1e-15) warnings.push(`${el.type} ขนานถูกลัดวงจรโดยส่วนที่อยู่ถัดไป จึงไม่มีผล`);
    }

    stage.Zafter = Zafter;
    stage.zbefore = normalize(Zbefore, Z0);
    stage.zafter = normalize(Zafter, Z0);
    stages.push(stage as Stage);
    Z = Zafter;
  }

  // stages were pushed from far end to source; keep that order (index descending)
  const Zin = Z;
  const zin = normalize(Zin, Z0);
  const gammaIn = gammaFromZ(Zin, Z0);
  const swrIn = swrFromGamma(gammaIn);

  // load group impedance = Zafter of the stage at index loadStart (or the termination)
  let ZL = Zterm;
  const loadStage = stages.find((s) => s.index === loadStart);
  if (loadStage) ZL = loadStage.Zafter;
  else if (n > 0 && loadStart === n) ZL = Zterm;
  const zL = normalize(ZL, Z0);
  const gammaL = gammaFromZ(ZL, Z0);

  return {
    circuit,
    stages,
    termination,
    Zterm,
    loadStart,
    ZL,
    zL,
    gammaL,
    swrL: swrFromGamma(gammaL),
    Zin,
    zin,
    gammaIn,
    swrIn,
    returnLossDb: returnLossDb(gammaIn),
    mismatchLossDb: mismatchLossDb(gammaIn),
    matched: abs(gammaIn) < 0.05,
    hasNetwork: loadStart > 0,
    warnings,
  };
};

/** Impedance at a probe position `d` (in λ, measured from the line's load end) inside a line stage. */
export const probeOnLine = (stage: Stage, dLambda: number, Z0sys: number): { Z: Complex; z: Complex; gamma: Complex } => {
  const ln = stage.line!;
  const d = Math.max(0, Math.min(ln.lenLambda, dLambda));
  const Z = lineInput(stage.Zbefore, ln.Z0, d, ln.lossDb * (ln.lenLambda > 0 ? d / ln.lenLambda : 0));
  return { Z, z: normalize(Z, Z0sys), gamma: gammaFromZ(Z, Z0sys) };
};

/** |V(d)| / |V+| standing wave envelope along a line stage (from load end). */
export const standingWave = (stage: Stage, samples = 120): { d: number; v: number; i: number }[] => {
  const ln = stage.line!;
  const gL = gammaFromZ(stage.Zbefore, ln.Z0);
  const alphaL = ln.lossDb / 8.685889638;
  const out: { d: number; v: number; i: number }[] = [];
  for (let k = 0; k <= samples; k++) {
    const d = (ln.lenLambda * k) / samples;
    const a = ln.lenLambda > 0 ? (alphaL * d) / ln.lenLambda : 0;
    const ph = -2 * betaL(d);
    const g = { re: abs(gL) * Math.exp(-2 * a) * Math.cos(Math.atan2(gL.im, gL.re) + ph), im: abs(gL) * Math.exp(-2 * a) * Math.sin(Math.atan2(gL.im, gL.re) + ph) };
    const v = Math.hypot(1 + g.re, g.im);
    const i = Math.hypot(1 - g.re, -g.im);
    out.push({ d, v, i });
  }
  return out;
};
