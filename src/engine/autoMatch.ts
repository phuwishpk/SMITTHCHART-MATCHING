// ---------------------------------------------------------------
// Auto-match: from the load of the current circuit, design matching
// networks and return complete NEW circuits that are matched.
// ---------------------------------------------------------------
import { Circuit, CircuitElement, makeElement, isLine, isStub, ELEMENT_SPECS } from './circuit';
import { Complex, C, abs, fmtNum, fmtEng, isFiniteC } from './complex';
import { solveCircuit, solveSweep, sweepMaxSwr, findLoadStart } from './solver';
import { gammaFromZ, normalize, admittance, swrFromGamma } from './rf';
import { solveLMatch, solveSingleStub, solveQwt } from './matching';

export type MatchKind = 'series' | 'shunt' | 'lsection' | 'stub' | 'qwt' | 'line-qwt';

export interface MatchCandidate {
  id: string;
  kind: MatchKind;
  /** short Thai title, e.g. "L-section: C ขนาน → L อนุกรม" */
  title: string;
  /** the complete new circuit (matching network + the original load) */
  circuit: Circuit;
  /** element summary from the source toward the load */
  parts: string[];
  zin: Complex;
  swr: number;
  /** worst SWR across the antenna table, when the load has one */
  bandMaxSwr?: number;
  /** design steps in Thai */
  notes: string[];
}

export interface AutoMatchResult {
  /** impedance of the load group at the design frequency */
  ZL: Complex;
  zL: Complex;
  swrL: number;
  /** true when the circuit already contains a matching network that will be replaced */
  replacesNetwork: boolean;
  /** number of elements kept as "the load" */
  loadCount: number;
  alreadyMatched: boolean;
  candidates: MatchCandidate[];
  /** why no candidate could be produced */
  problem?: string;
}

const clone = (e: CircuitElement): CircuitElement => ({ ...e, params: { ...e.params }, table: e.table?.map((p) => ({ ...p })) });

const el = (type: Parameters<typeof makeElement>[0], orient: 'series' | 'shunt', params: Record<string, number>) => makeElement(type, orient, params);

const nH = (h: number) => Number((h * 1e9).toFixed(3));
const pF = (f: number) => Number((f * 1e12).toFixed(4));
const lam = (l: number) => Number(l.toFixed(4));

const describe = (e: CircuitElement, f: number): string => {
  const spec = ELEMENT_SPECS[e.type];
  const o = e.orient === 'shunt' ? ' ขนาน' : ' อนุกรม';
  switch (e.type) {
    case 'inductor': return `L${o} = ${fmtEng(e.params.L * 1e-9, 'H', 3)}`;
    case 'capacitor': return `C${o} = ${fmtEng(e.params.C * 1e-12, 'F', 3)}`;
    case 'resistor': return `R${o} = ${fmtNum(e.params.R, 2)} Ω`;
    case 'tline': return `สายส่ง ${fmtNum(e.params.Z0, 0)} Ω ยาว ${fmtNum(e.params.len, 3)} λ`;
    case 'qwt': return `หม้อแปลง λ/4, Z_t = ${fmtNum(e.params.Zt, 2)} Ω`;
    case 'stub_short': return `สตับปลายลัด ${fmtNum(e.params.Z0, 0)} Ω ยาว ${fmtNum(e.params.len, 3)} λ`;
    case 'stub_open': return `สตับปลายเปิด ${fmtNum(e.params.Z0, 0)} Ω ยาว ${fmtNum(e.params.len, 3)} λ`;
    default: void f; return spec.name;
  }
};

/** Design matching networks for the load of `circuit` and return complete new circuits. */
export const autoMatch = (circuit: Circuit): AutoMatchResult => {
  const res = solveCircuit(circuit);
  const loadStart = findLoadStart(circuit.elements);
  const loadEls = circuit.elements.slice(loadStart).map(clone);
  const Z0 = circuit.Z0;
  const f = circuit.f;
  const ZL = res.ZL;
  const zL = normalize(ZL, Z0);
  const swrL = swrFromGamma(gammaFromZ(ZL, Z0));
  const hasSweep = loadEls.some((e) => e.type === 'antenna');
  const base: AutoMatchResult = {
    ZL, zL, swrL,
    replacesNetwork: loadStart > 0,
    loadCount: loadEls.length,
    alreadyMatched: abs(res.gammaL) < 0.02,
    candidates: [],
  };
  if (loadEls.length === 0) return { ...base, problem: 'ยังไม่มีโหลดในวงจร — วางอุปกรณ์อย่างน้อยหนึ่งตัว (เช่น Load Z_L หรือ Antenna) ก่อน' };
  if (!isFiniteC(ZL)) return { ...base, problem: 'ปลายวงจรเปิดอยู่ (Z_L = ∞) จึงไม่มีกำลังส่งเข้าโหลด ให้ปิดปลายวงจรด้วยโหลดก่อน' };
  if (ZL.re <= 1e-6) return { ...base, problem: 'โหลดมีส่วนจริงเป็นศูนย์ (หรือติดลบ) จึงไม่ดูดกำลัง วงจร passive ไม่สามารถ match ได้' };

  const make = (id: string, kind: MatchKind, title: string, net: CircuitElement[], notes: string[]): MatchCandidate | null => {
    const c: Circuit = { f, Z0, elements: [...net, ...loadEls.map(clone)] };
    const r = solveCircuit(c);
    if (!isFiniteC(r.zin)) return null;
    const swr = r.swrIn;
    if (!Number.isFinite(swr) || swr > 1.2) return null; // must actually match at the design frequency
    return {
      id, kind, title, circuit: c,
      parts: [...net.map((e) => describe(e, f)), ...(loadEls.length ? [`โหลดเดิม: ${loadEls.map((e) => ELEMENT_SPECS[e.type].symbol + (e.orient === 'shunt' ? '↓' : '')).join(' — ')}`] : [])],
      zin: r.zin, swr,
      bandMaxSwr: hasSweep ? sweepMaxSwr(solveSweep(c)) : undefined,
      notes,
    };
  };

  const out: (MatchCandidate | null)[] = [];
  const RL = ZL.re;
  const XL = ZL.im;
  const yL = admittance(zL);

  // ---- 1. single series element (only when the load already sits on the r = 1 circle) ----
  if (Math.abs(RL - Z0) / Z0 < 0.02 && Math.abs(XL) > 1e-6) {
    const X = -XL;
    const e = X > 0 ? el('inductor', 'series', { L: nH(X / (2 * Math.PI * f)) }) : el('capacitor', 'series', { C: pF(-1 / (2 * Math.PI * f * X)) });
    out.push(make('series1', 'series', `อุปกรณ์อนุกรมตัวเดียว: ${X > 0 ? 'L' : 'C'}`, [e], [
      `โหลดอยู่บนวงกลม r = 1 พอดี (R_L ≈ Z₀ = ${fmtNum(Z0)} Ω) จึงเหลือแค่หักล้างรีแอกแตนซ์`,
      `ต้องการ X = ${fmtNum(X, 2)} Ω ที่ ${fmtNum(f / 1e6, 3)} MHz`,
    ]));
  }
  // ---- 2. single shunt element (load on the g = 1 circle) ----
  if (isFiniteC(yL) && Math.abs(yL.re - 1) < 0.02 && Math.abs(yL.im) > 1e-6) {
    const b = -yL.im;
    const B = b / Z0;
    const e = B > 0 ? el('capacitor', 'shunt', { C: pF(B / (2 * Math.PI * f)) }) : el('inductor', 'shunt', { L: nH(-1 / (2 * Math.PI * f * B)) });
    out.push(make('shunt1', 'shunt', `อุปกรณ์ขนานตัวเดียว: ${B > 0 ? 'C' : 'L'}`, [e], [
      'โหลดอยู่บนวงกลม g = 1 พอดี จึงเหลือแค่หักล้าง susceptance',
      `ต้องการ b = ${fmtNum(b, 3)} (B = ${fmtNum(B, 5)} S)`,
    ]));
  }

  // ---- 3. L-sections (two lumped elements) ----
  for (const [i, sol] of solveLMatch(ZL, Z0, f).entries()) {
    const series = sol.seriesEl.type === 'inductor'
      ? el('inductor', 'series', { L: nH(sol.seriesEl.value) })
      : el('capacitor', 'series', { C: pF(sol.seriesEl.value) });
    const shunt = sol.shuntEl.type === 'inductor'
      ? el('inductor', 'shunt', { L: nH(sol.shuntEl.value) })
      : el('capacitor', 'shunt', { C: pF(sol.shuntEl.value) });
    // 'shunt-first' = the shunt element sits at the load, so from the source: series then shunt
    const net = sol.topology === 'shunt-first' ? [series, shunt] : [shunt, series];
    const first = sol.topology === 'shunt-first' ? shunt : series;
    const second = sol.topology === 'shunt-first' ? series : shunt;
    const label = `L-section: ${ELEMENT_SPECS[first.type].symbol}${first.orient === 'shunt' ? ' ขนาน' : ' อนุกรม'} (ชิดโหลด) → ${ELEMENT_SPECS[second.type].symbol}${second.orient === 'shunt' ? ' ขนาน' : ' อนุกรม'}`;
    out.push(make(`l${i}`, 'lsection', label, net, [
      RL > Z0
        ? `R_L = ${fmtNum(RL, 1)} Ω > Z₀ = ${fmtNum(Z0)} Ω → โหลดอยู่ในวงกลม r = 1 จึงเริ่มด้วยอุปกรณ์ขนานเพื่อพาจุดออกไปตัดวงกลม r = 1`
        : `R_L = ${fmtNum(RL, 1)} Ω < Z₀ = ${fmtNum(Z0)} Ω → เริ่มด้วยอุปกรณ์อนุกรมเพื่อพาจุดไปตัดวงกลม g = 1`,
      `b (ขนาน) = ${fmtNum(sol.B * Z0, 3)} · x (อนุกรม) = ${fmtNum(sol.X / Z0, 3)}`,
      'อุปกรณ์อนุกรมเดินตามวงกลม r คงที่ อุปกรณ์ขนานเดินตามวงกลม g คงที่ จนถึงศูนย์กลาง',
    ]));
  }

  // ---- 4. single stub (line + shunt stub), short and open ----
  for (const kind of ['short', 'open'] as const) {
    for (const [i, sol] of solveSingleStub(ZL, Z0, kind).entries()) {
      const stub = el(kind === 'short' ? 'stub_short' : 'stub_open', 'shunt', { Z0, len: lam(sol.lLambda) });
      const line = el('tline', 'series', { Z0, len: lam(sol.dLambda), vf: 0.66, lossDb: 0 });
      out.push(make(`stub-${kind}-${i}`, 'stub', `สตับ${kind === 'short' ? 'ปลายลัด' : 'ปลายเปิด'}: สาย ${fmtNum(sol.dLambda, 3)} λ + สตับ ${fmtNum(sol.lLambda, 3)} λ`, [stub, line], [
        `เดินจากโหลดไปทาง generator ${fmtNum(sol.dLambda, 3)} λ จนถึงวงกลม g = 1 (y = ${fmtNum(sol.yAtStub.re, 2)} ${sol.yAtStub.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(sol.yAtStub.im), 2)})`,
        `สตับต้องให้ b = ${fmtNum(sol.bStub, 3)} → ความยาว ${fmtNum(sol.lLambda, 3)} λ`,
        'ใช้สายส่งล้วน เหมาะกับความถี่สูงที่หา L/C ค่าน้อย ๆ ยาก',
      ]));
    }
  }

  // ---- 5. quarter-wave transformer (with a rotating line first when the load is complex) ----
  for (const [i, sol] of solveQwt(ZL, Z0).entries()) {
    const qwt = el('qwt', 'series', { Zt: Number(sol.Zt.toFixed(3)) });
    const net = sol.dLambda > 1e-4
      ? [qwt, el('tline', 'series', { Z0, len: lam(sol.dLambda), vf: 0.66, lossDb: 0 })]
      : [qwt];
    out.push(make(`qwt${i}`, sol.dLambda > 1e-4 ? 'line-qwt' : 'qwt',
      sol.dLambda > 1e-4 ? `λ/4 + สาย ${fmtNum(sol.dLambda, 3)} λ: Z_t = ${fmtNum(sol.Zt, 2)} Ω` : `หม้อแปลง λ/4: Z_t = ${fmtNum(sol.Zt, 2)} Ω`, net, [
        sol.dLambda > 1e-4
          ? `โหลดไม่ใช่จำนวนจริง จึงต่อสาย ${fmtNum(sol.dLambda, 3)} λ ก่อนเพื่อหมุนจุดมาที่แกนนอน ได้ R = ${fmtNum(sol.Rreal, 2)} Ω`
          : `โหลดเป็นจำนวนจริง R = ${fmtNum(sol.Rreal, 2)} Ω อยู่แล้ว`,
        `Z_t = √(Z₀ · R) = √(${fmtNum(Z0)} × ${fmtNum(sol.Rreal, 2)}) = ${fmtNum(sol.Zt, 2)} Ω`,
      ]));
  }

  const candidates = out.filter((c): c is MatchCandidate => c !== null);
  // best first: worst-in-band SWR (broadband loads) then SWR at f, then fewer elements
  candidates.sort((a, b) => (a.bandMaxSwr ?? a.swr) - (b.bandMaxSwr ?? b.swr) || a.swr - b.swr || a.circuit.elements.length - b.circuit.elements.length);
  return {
    ...base,
    candidates,
    problem: candidates.length === 0 ? 'ยังหาวงจร matching ที่ใช้ได้ไม่พบสำหรับโหลดนี้ ลองปรับค่าโหลดหรือความถี่' : undefined,
  };
};

/** true when the element belongs to a matching network rather than the load */
export const isNetworkElement = (e: CircuitElement): boolean => isLine(e.type) || isStub(e.type);
void C;
