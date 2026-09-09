// ---------------------------------------------------------------
// Graphical (Smith-chart) solution walkthrough for a lesson's
// solution circuit: the textbook procedure step by step, each step
// carrying overlay geometry for the SmithChart component.
// ---------------------------------------------------------------
import { Circuit, ELEMENT_SPECS } from './circuit';
import { Lesson } from './lessons';
import { ExplainStep, Highlight, StepLine } from './explain';
import { solveCircuit, Stage } from './solver';
import { Complex, abs, arg, deg, fmtNum, isFiniteC } from './complex';
import { admittance, gammaFromz, wtgFromGamma, swrFromGamma } from './rf';

const tn = (x: number, d = 2) => fmtNum(x, d).replace('−', '-');
const tc = (z: Complex, d = 2): string => {
  if (!isFiniteC(z)) return '\\infty';
  return `${tn(z.re, d)} ${z.im < 0 ? '-' : '+'} j${tn(Math.abs(z.im), d)}`;
};
const fz = (z: Complex, d = 2): string => (isFiniteC(z) ? `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}` : '∞');
const mod05 = (w: number) => ((w % 0.5) + 0.5) % 0.5;

export const smithMethodSteps = (lesson: Lesson, sol: Circuit): ExplainStep[] => {
  const res = solveCircuit(sol);
  const Z0 = sol.Z0;
  const steps: ExplainStep[] = [];
  let n = 0;
  const push = (short: string, title: string, lines: StepLine[], highlight: Highlight, tag: ExplainStep['tag'] = 'plot') => {
    n += 1;
    steps.push({ id: `m${n}`, short, title, lines, highlight, tag });
  };
  const T = (text: string): StepLine => ({ kind: 'text', text });
  const M = (tex: string): StepLine => ({ kind: 'math', tex });
  const N = (text: string): StepLine => ({ kind: 'note', text });
  const R = (tex: string): StepLine => ({ kind: 'result', tex });

  const ladder = res.stages; // far end -> source
  const loadStages = ladder.filter((s) => s.inLoad);
  const netStages = ladder.filter((s) => !s.inLoad);
  const gL = res.gammaL;
  const zL = res.zL;
  const yL = admittance(zL);

  push('เตรียมกราฟ', 'เตรียม Smith Chart', [
    T(`Normalize ทุกค่าด้วย Z₀ = ${fmtNum(Z0)} Ω ศูนย์กลางกราฟคือ z = 1 (match) ซ้ายสุดคือ SHORT (z = 0) ขวาสุดคือ OPEN (z = ∞)`),
    N('ครึ่งบน = inductive (+jx), ครึ่งล่าง = capacitive (−jx) · เดินตามเข็มนาฬิกา = ไปทาง generator'),
  ], { center: true });

  // ---------- load construction ----------
  const singleLoadBlock = loadStages.length === 1 && loadStages[0].el.type === 'load';
  if (!singleLoadBlock && loadStages.length > 0) {
    const termG = gammaFromz(res.termination === 'open' ? { re: Infinity, im: 0 } : { re: 0, im: 0 });
    push('จุดเริ่ม', `เริ่มจากปลายวงจร (${res.termination === 'open' ? 'OPEN' : 'SHORT'})`, [
      T(`อุปกรณ์ในโหลดต่อกันเป็นขั้นบันได เริ่มพล็อตจากปลายวงจรซึ่งเป็น ${res.termination === 'open' ? 'ปลายเปิด z = ∞ (จุดขวาสุด)' : 'ลัดวงจร z = 0 (จุดซ้ายสุด)'} แล้วเพิ่มอุปกรณ์ทีละตัวเข้าหาแหล่งจ่าย`),
    ], { points: [{ g: termG, label: res.termination === 'open' ? 'z = ∞' : 'z = 0', cls: 'mid' }] });
    // pure series (or pure shunt) load groups: order does not matter, so walk source -> load
    // (R first, then L ...) which matches the textbook narrative; mixed groups keep ladder order
    const allSeries = loadStages.every((st) => st.kind === 'series');
    const allShunt = loadStages.every((st) => st.kind === 'shunt');
    if ((allSeries || allShunt) && loadStages.length > 1) {
      const ordered = [...loadStages].reverse();
      let Zacc: Complex = allSeries ? { re: 0, im: 0 } : { re: Infinity, im: 0 };
      let Yacc: Complex = { re: 0, im: 0 };
      for (const st of ordered) {
        const Zb = Zacc;
        const path: Complex[] = [];
        let Za: Complex;
        if (allSeries) {
          Za = { re: Zb.re + st.Zel!.re, im: Zb.im + st.Zel!.im };
          for (let k = 0; k <= 40; k++) {
            const t = k / 40;
            path.push(gammaFromz({ re: (Zb.re + t * st.Zel!.re) / Z0, im: (Zb.im + t * st.Zel!.im) / Z0 }));
          }
        } else {
          const Ya = { re: Yacc.re + st.Yel!.re, im: Yacc.im + st.Yel!.im };
          for (let k = 0; k <= 40; k++) {
            const t = k / 40;
            const Yt = { re: Yacc.re + t * st.Yel!.re, im: Yacc.im + t * st.Yel!.im };
            const zt = admittance({ re: Yt.re * Z0, im: Yt.im * Z0 });
            path.push(gammaFromz(zt));
          }
          Za = admittance({ re: Ya.re, im: Ya.im });
          Yacc = Ya;
        }
        pushStageStep({ ...st, Zbefore: Zb, Zafter: Za, zbefore: { re: Zb.re / Z0, im: Zb.im / Z0 }, zafter: { re: Za.re / Z0, im: Za.im / Z0 }, path }, false);
        Zacc = Za;
      }
    } else {
      for (const st of loadStages) pushStageStep(st, false);
    }
  }
  push('จุด z_L', `จุดโหลด z_L = ${fz(zL)}`, [
    T(`ส่วนจริง r = ${fmtNum(zL.re, 2)} → วงกลม r คงที่ · ส่วนจินตภาพ x = ${fmtNum(zL.im, 2)} → เส้นโค้ง x คงที่ จุดตัดคือโหลด`),
    M(`z_L = ${tc(zL)}\\qquad \\Gamma_L = ${tn(abs(gL), 3)}\\angle ${tn(deg(arg(gL)), 1)}^\\circ`),
    N(`ตำแหน่งบนสเกล wavelengths toward generator: ${fmtNum(wtgFromGamma(gL), 3)} λ`),
  ], { rCircle: zL.re, xCircle: zL.im, points: [{ g: gL, label: 'z_L', cls: 'load' }], wtgMarks: [{ w: wtgFromGamma(gL), label: `${fmtNum(wtgFromGamma(gL), 3)}λ` }] });

  const swrL = swrFromGamma(gL);
  push('SWR circle', 'วาดวงกลม SWR คงที่ผ่านจุดโหลด', [
    T('ใช้วงเวียนปักที่ศูนย์กลาง รัศมีถึงจุดโหลด วงกลมนี้คือ |Γ| คงที่ = SWR คงที่'),
    M(`|\\Gamma| = ${tn(abs(gL), 3)}\\qquad SWR = \\frac{1+|\\Gamma|}{1-|\\Gamma|} = ${Number.isFinite(swrL) ? tn(swrL, 2) : '\\infty'}`),
    N('อ่านค่า SWR ได้จากจุดที่วงกลมตัดแกนจริงด้านขวา (r = SWR) · ทุกจุดบนสายส่งไร้การสูญเสียจะอยู่บนวงกลมนี้'),
  ], { swrRadius: abs(gL), points: [{ g: gL, label: 'z_L', cls: 'load' }], rCircle: Number.isFinite(swrL) ? swrL : undefined });

  // ---------- network ----------
  if (netStages.length > 0) {
    const hasShunt = netStages.some((s) => s.kind === 'shunt' || s.kind === 'stub');
    if (hasShunt) {
      push('y_L', 'อุปกรณ์ขนานใช้ admittance: หา y_L', [
        T('หมุนจุดโหลด 180° ผ่านศูนย์กลาง (หรืออ่านจากกราฟ Y สีเขียว) จะได้ admittance y = 1/z'),
        M(`y_L = \\frac{1}{z_L} = ${tc(yL)}`),
        N('บนกราฟ Y: อุปกรณ์ขนานเดินตามวงกลม g คงที่ · สตับก็เป็นอุปกรณ์ขนาน'),
      ], { showY: true, gCircle: yL.re, bCircle: yL.im, points: [{ g: gL, label: `y_L = ${fz(yL)}`, cls: 'y' }] });
    }
    // double stub: rotated g=1 circle
    if (lesson.id === 'l12') {
      const spacingEl = sol.elements.find((e, i) => e.type === 'tline' && i > 0 && sol.elements[i - 1].type === 'stub_short');
      const spacing = spacingEl ? spacingEl.params.len : 0.125;
      const th = 4 * Math.PI * spacing; // rotate toward LOAD = counter-clockwise
      const cx = -0.5 * Math.cos(th);
      const cy = -0.5 * Math.sin(th);
      push('วงกลมหมุน', `วาดวงกลม g = 1 ที่หมุนไปทางโหลด ${fmtNum(spacing, 3)} λ`, [
        T(`สตับตัวที่ 2 อยู่ห่างจากตัวแรก ${fmtNum(spacing, 3)} λ จุดที่ "หลังหมุนไปทาง generator ${fmtNum(spacing, 3)} λ แล้วตกบนวงกลม g = 1" คือวงกลม g = 1 ที่หมุนย้อนไปทางโหลด (ทวนเข็ม) เป็นมุม ${fmtNum(deg(th), 0)}°`),
        N('สตับตัวแรกต้องพา y_L ไปให้ตกบนวงกลมที่หมุนนี้ ถ้า g_L อยู่ในบริเวณที่วงกลม g คงที่ไม่ตัดวงกลมนี้ = forbidden region'),
      ], { showY: true, gCircle: yL.re, circles: [{ cx, cy, r: 0.5, cls: 'rot', label: `g = 1 หมุน ${fmtNum(spacing, 3)}λ` }], points: [{ g: gL, label: 'y_L', cls: 'y' }] });
    }
    netStages.forEach((s, i) => pushStageStep(s, true, s.kind === 'stub' && netStages.slice(i + 1).some((t) => t.kind === 'stub')));
  }

  // ---------- final ----------
  const gin = res.gammaIn;
  if (res.matched) {
    push('✓ ศูนย์กลาง', '✓ MATCHED — จุดถึงศูนย์กลาง', [
      R(`z_{in} = ${tc(res.zin, 3)} \\approx 1 + j0,\\quad SWR = ${tn(res.swrIn, 2)}`),
      N('ไม่มีคลื่นสะท้อน กำลังส่งไปโหลดทั้งหมด'),
    ], { center: true, points: [{ g: gin, label: 'z_in', cls: 'in' }] }, 'match');
  } else {
    push('z_in', `จุดสุดท้าย z_in = ${fz(res.zin)}`, [
      M(`z_{in} = ${tc(res.zin, 3)},\\qquad SWR = ${Number.isFinite(res.swrIn) ? tn(res.swrIn, 2) : '\\infty'}`),
      N(lesson.level <= 3 ? 'บทนี้ดูตำแหน่งของจุดเป็นหลัก ยังไม่ต้อง match' : 'บทนี้ไม่ได้ match ที่ศูนย์กลาง แต่ให้สังเกตการเคลื่อนที่ของจุด'),
    ], { swrRadius: abs(gin), points: [{ g: gin, label: 'z_in', cls: 'in' }] });
  }
  return steps;

  // ---------- helpers ----------
  function pushStageStep(s: Stage, isNet: boolean, firstOfDouble = false) {
    const spec = ELEMENT_SPECS[s.el.type];
    const gb = gammaFromz(s.zbefore);
    const ga = gammaFromz(s.zafter);
    const after = { g: ga, label: isNet ? `หลัง ${spec.symbol}` : `z = ${fz(s.zafter)}`, cls: (isNet ? 'mid' : 'mid') as 'mid' };
    if (s.kind === 'series') {
      const x = s.X ?? 0;
      if (s.el.type === 'resistor' || s.el.type === 'load') {
        push(spec.symbol, `${spec.name} อนุกรม: เพิ่มส่วนจริง`, [
          T(`ตัวต้านทานเพิ่ม r โดย x คงเดิม จุดจึงเลื่อนตามเส้นโค้ง x = ${fmtNum(s.zbefore.im, 2)} จาก r = ${fmtNum(s.zbefore.re, 2)} ไป r = ${fmtNum(s.zafter.re, 2)}`),
          M(`z = ${tc(s.zbefore)} + ${tn(s.Zel!.re / Z0, 2)} = ${tc(s.zafter)}`),
        ], { xCircle: s.zbefore.im, rCircle: s.zafter.re, paths: [s.path], points: [after] });
      } else {
        const up = x > 0;
        push(spec.symbol, `${spec.name} อนุกรม: เลื่อนตามวงกลม r = ${fmtNum(s.zbefore.re, 2)}`, [
          T(`อุปกรณ์อนุกรมเพิ่มรีแอกแตนซ์ x = ${fmtNum(x / Z0, 2)} (${up ? 'บวก → เลื่อนขึ้นตามเข็ม' : 'ลบ → เลื่อนลงทวนเข็ม'}) โดย r คงเดิม`),
          M(`z = ${tc(s.zbefore)} ${up ? '+' : '-'} j${tn(Math.abs(x) / Z0, 2)} = ${tc(s.zafter)}`),
          N(`ค่าจริง: ${s.el.type === 'inductor' ? 'X_L = 2πfL' : 'X_C = −1/(2πfC)'} = ${fmtNum(x, 1)} Ω`),
        ], { rCircle: s.zbefore.re, paths: [s.path], points: [after] });
      }
    } else if (s.kind === 'shunt') {
      const yb = admittance(s.zbefore);
      const ya = admittance(s.zafter);
      const b = (s.B ?? 0) * Z0;
      push(`${spec.symbol}↓`, `${spec.name} ขนาน: เลื่อนตามวงกลม g = ${fmtNum(yb.re, 2)} (กราฟ Y)`, [
        T(`อุปกรณ์ขนานเพิ่ม susceptance b = ${fmtNum(b, 2)} (${b > 0 ? 'C: บวก → เลื่อนตามเข็ม' : 'L: ลบ → เลื่อนทวนเข็ม'}) โดย g คงเดิม`),
        M(`y = ${tc(yb)} ${b >= 0 ? '+' : '-'} j${tn(Math.abs(b), 2)} = ${tc(ya)} \\quad\\Rightarrow\\quad z = ${tc(s.zafter)}`),
      ], { showY: true, gCircle: yb.re, paths: [s.path], points: [{ ...after, cls: 'y', label: `y = ${fz(ya)}` }] });
    } else if (s.kind === 'line') {
      const ln = s.line!;
      const isQwt = s.el.type === 'qwt';
      const w1 = wtgFromGamma(gb);
      const w2 = mod05(w1 + ln.lenLambda);
      if (isQwt) {
        const zt1 = { re: s.Zbefore.re / ln.Z0, im: s.Zbefore.im / ln.Z0 };
        push('λ/4', `หม้อแปลง λ/4: normalize ใหม่ด้วย Z_t = ${fmtNum(ln.Z0, 1)} Ω แล้วหมุนครึ่งรอบ`, [
          T('สายนี้มี Z₀ ต่างจากระบบ จึงต้องคิดบน Smith Chart ที่ normalize ด้วย Z_t ก่อน'),
          M(`z' = \\frac{Z_L}{Z_t} = ${tc(zt1, 3)} \\xrightarrow{\\ \\lambda/4\\ (180^\\circ)\\ } \\frac{1}{z'} = ${tc(admittance(zt1), 3)}`),
          M(`Z_{in} = ${tn(admittance(zt1).re, 3)} \\times ${tn(ln.Z0, 1)} = ${tc(s.Zafter, 1)}\\,\\Omega \\Rightarrow z_{in} = ${tc(s.zafter, 3)}`),
          N('เส้นทางที่วาดคือผลลัพธ์เมื่อแปลงกลับมาบนกราฟของระบบ (Z₀) จึงไม่ใช่วงกลมรอบศูนย์กลาง'),
        ], { paths: [s.path], points: [{ g: gb, label: 'z_L', cls: 'load' }, { g: ga, label: 'z_in', cls: 'in' }] });
      } else {
        push('TL', `สายส่ง ${fmtNum(ln.lenLambda, 3)} λ: เดินตามวงกลม SWR ไปทาง generator`, [
          T(`อ่านตำแหน่งจุดเริ่มบนสเกลรอบนอก = ${fmtNum(w1, 3)} λ แล้วเดินตามเข็ม (toward generator) เป็นระยะ ${fmtNum(ln.lenLambda, 3)} λ → ${fmtNum(w2, 3)} λ`),
          M(`2\\beta l = 2(360^\\circ)(${tn(ln.lenLambda, 3)}) = ${tn(2 * ln.degrees, 1)}^\\circ`),
          M(`z: ${tc(s.zbefore)} \\rightarrow ${tc(s.zafter)}${ln.Z0 !== Z0 ? '\\quad(\\text{normalize ด้วย } Z_0 \\text{ ของสายก่อน})' : ''}`),
          N(`|Γ| ไม่เปลี่ยน (สายไร้การสูญเสีย) จุดจึงอยู่บนวงกลม SWR เดิม`),
        ], { swrRadius: abs(gb), arcs: [{ g: gb, lenLambda: ln.lenLambda }], paths: [s.path], points: [{ g: gb, label: `${fmtNum(w1, 3)}λ`, cls: 'load' }, { g: ga, label: `${fmtNum(w2, 3)}λ`, cls: 'mid' }], wtgMarks: [{ w: w1, label: `${fmtNum(w1, 3)}λ` }, { w: w2, label: `${fmtNum(w2, 3)}λ` }] });
      }
    } else if (s.kind === 'stub') {
      const ln = s.line!;
      const kind = s.el.type === 'stub_short' ? 'short' : 'open';
      const yb = admittance(s.zbefore);
      const ya = admittance(s.zafter);
      const bStub = (s.B ?? 0) * Z0;
      const gEnd: Complex = kind === 'short' ? { re: -1, im: 0 } : { re: 1, im: 0 };
      const gStub = { re: Math.cos(arg(gEnd) - 4 * Math.PI * ln.lenLambda), im: Math.sin(arg(gEnd) - 4 * Math.PI * ln.lenLambda) };
      if (firstOfDouble) {
        push('y ที่สตับ 1', `สตับตัวแรก: y = ${fz(yb)} บนวงกลม g = ${fmtNum(yb.re, 2)}`, [
          T(`ใน double stub สตับตัวแรกไม่ต้องทำให้ g = 1 แต่ต้องเพิ่ม b₁ เพื่อเลื่อนจุดตามวงกลม g = ${fmtNum(yb.re, 2)} ไปจน "ตกบนวงกลม g = 1 ที่หมุนไว้" (มี 2 จุดตัด เลือกจุดที่ให้สตับสั้นกว่า)`),
          M(`y = ${tc(yb)} \\Rightarrow b_1 = ${tn(bStub, 3)} \\Rightarrow y_1 = ${tc(ya)}`),
          N('ถ้าวงกลม g คงที่ของโหลดไม่ตัดวงกลมที่หมุนไว้เลย = forbidden region ต้องเลื่อนสตับตัวแรกออกจากโหลด'),
        ], { showY: true, gCircle: yb.re, points: [{ g: gb, label: `y = ${fz(yb)}`, cls: 'y' }, { g: ga, label: `y₁ = ${fz(ya)}`, cls: 'stub' }] });
      } else {
        push('y ที่สตับ', `ตำแหน่งสตับ: y = ${fz(yb)}`, [
          T(`ที่ตำแหน่งนี้ y อยู่บนวงกลม g = ${fmtNum(yb.re, 2)}${Math.abs(yb.re - 1) < 0.03 ? ' = 1 พอดี ✓' : ' (ยังไม่ใช่ 1: ต้องเลื่อนตำแหน่งสตับก่อน)'} จึงต้องการสตับที่ให้ b = ${fmtNum(-yb.im, 2)} เพื่อหักล้าง`),
          M(`y = ${tc(yb)} \\Rightarrow b_{stub} = ${tn(-yb.im, 2)}`),
        ], { showY: true, gCircle: yb.re, bCircle: yb.im, points: [{ g: gb, label: `y = ${fz(yb)}`, cls: 'y' }] });
      }
      push('ยาวสตับ', `หาความยาวสตับ${kind === 'short' ? 'ปลายลัดวงจร' : 'ปลายเปิด'}จากขอบกราฟ`, [
        T(`สตับ${kind === 'short' ? 'ลัดวงจรเริ่มที่ y = ∞ (จุด SHORT ซ้ายสุด)' : 'ปลายเปิดเริ่มที่ y = 0 (จุด OPEN ขวาสุด)'} เดินตามขอบกราฟ (|Γ| = 1) ไปทาง generator จนถึงเส้นโค้ง b = ${fmtNum(bStub, 2)}`),
        M(`l = ${tn(ln.lenLambda, 3)}\\lambda \\quad (${kind === 'short' ? 'b = -\\cot\\beta l' : 'b = \\tan\\beta l'} = ${tn(bStub, 2)})`),
        N(kind === 'short' ? 'สตับปลายเปิดที่ให้ b เท่ากันจะยาวต่างกัน 0.25 λ' : 'สตับลัดวงจรที่ให้ b เท่ากันจะสั้นกว่า/ยาวกว่า 0.25 λ'),
      ], { showY: true, bCircle: bStub, arcs: [{ g: gEnd, lenLambda: ln.lenLambda, radius: 1 }], points: [{ g: gEnd, label: kind === 'short' ? 'y = ∞' : 'y = 0', cls: 'stub' }, { g: gStub, label: `b = ${fmtNum(bStub, 2)}`, cls: 'stub' }], wtgMarks: [{ w: mod05(wtgFromGamma(gEnd) + ln.lenLambda), label: `l = ${fmtNum(ln.lenLambda, 3)}λ` }] });
      push('ใส่สตับ', `ใส่สตับ: เลื่อนตามวงกลม g = ${fmtNum(yb.re, 2)} ด้วย b = ${fmtNum(bStub, 2)}`, [
        M(`y' = ${tc(yb)} + j(${tn(bStub, 2)}) = ${tc(ya)}`),
        T(firstOfDouble ? 'จุดตกบนวงกลม g = 1 ที่หมุนไว้แล้ว ขั้นต่อไปหมุนผ่านสายระหว่างสตับ จุดจะไปตกบนวงกลม g = 1 จริง' : Math.abs(ya.re - 1) < 0.03 && Math.abs(ya.im) < 0.03 ? 'b หักล้างกันพอดี จุดมาถึงศูนย์กลาง' : 'จุดเลื่อนไปตามวงกลม g คงที่'),
      ], { showY: true, gCircle: yb.re, paths: [s.path], points: [{ g: ga, label: `y = ${fz(ya)}`, cls: 'y' }] });
    }
  }
};
