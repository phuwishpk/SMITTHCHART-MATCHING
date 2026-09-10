// Quick numeric self-test of the engines (run: npm test)
import { buildCircuit } from './circuit';
import { solveCircuit } from './solver';
import { explainCircuit } from './explain';
import { solveSingleStub, solveDoubleStub, solveQwt, solveLMatch } from './matching';
import { fmtC, fmtNum, abs } from './complex';
import { admittance } from './rf';
import { PROBLEMS, ALL_LESSONS } from './lessons';
import { buildSolution, applySolutionStep } from './solutions';
import { smithMethodSteps } from './smithMethod';
import { courseFiguresFinite, COURSE, ex1Book, ex2Book, ex5Full } from './course';
import { solveSweep, sweepMaxSwr } from './solver';

let fails = 0;
const check = (name: string, ok: boolean, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`);
  if (!ok) fails++;
};
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// 1. Series RL 25 + j25
{
  const c = buildCircuit(100e6, 50, [['resistor', 'series', { R: 25 }], ['inductor', 'series', { L: 39.8 }]]);
  const r = solveCircuit(c);
  check('RL 25+j25', near(r.Zin.re, 25, 0.01) && near(r.Zin.im, 25, 0.2), fmtC(r.Zin, 3, 'Ω') + ' z=' + fmtC(r.zin, 3) + ' SWR=' + fmtNum(r.swrIn, 3));
  check('RL SWR≈2.618', near(r.swrIn, 2.618, 0.01));
  const steps = explainCircuit(r);
  check('RL explain has steps', steps.length >= 8, `${steps.length} steps: ` + steps.map((s) => s.short).join(' → '));
}
// 2. Series RC 50 - j30
{
  const c = buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['capacitor', 'series', { C: 53.05 }]]);
  const r = solveCircuit(c);
  check('RC 50-j30', near(r.Zin.re, 50, 0.01) && near(r.Zin.im, -30, 0.1), fmtC(r.Zin, 3, 'Ω'));
}
// 3. Series RLC resonance
{
  const c = buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['inductor', 'series', { L: 95.5 }], ['capacitor', 'series', { C: 26.5 }]]);
  const r = solveCircuit(c);
  check('RLC resonance matched', r.matched, fmtC(r.Zin, 2, 'Ω') + ' SWR=' + fmtNum(r.swrIn, 3));
}
// 4. Parallel RLC
{
  const c = buildCircuit(100e6, 50, [['resistor', 'shunt', { R: 100 }], ['capacitor', 'shunt', { C: 31.8 }], ['inductor', 'shunt', { L: 79.6 }]]);
  const r = solveCircuit(c);
  const y = admittance(r.zin);
  check('Parallel RLC y≈0.5+j0', near(y.re, 0.5, 0.01) && near(y.im, 0, 0.02), 'y=' + fmtC(y, 3) + ' Z=' + fmtC(r.Zin, 2, 'Ω'));
}
// 5. T-line 0.25 λ inversion, 0.5 λ identity
{
  const c = buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.25, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]);
  const r = solveCircuit(c);
  const zl = r.zL;
  const inv = admittance(zl);
  check('TL λ/4 inversion', near(r.zin.re, inv.re, 1e-6) && near(r.zin.im, inv.im, 1e-6), 'zin=' + fmtC(r.zin, 4) + ' 1/zL=' + fmtC(inv, 4));
  c.elements[0].params.len = 0.5;
  const r2 = solveCircuit(c);
  check('TL λ/2 identity', near(r2.zin.re, zl.re, 1e-6) && near(r2.zin.im, zl.im, 1e-6), 'zin=' + fmtC(r2.zin, 4));
}
// 6. QWT 100 Ω -> 50 Ω
{
  const c = buildCircuit(100e6, 50, [['qwt', 'series', { Zt: Math.sqrt(5000) }], ['resistor', 'series', { R: 100 }]]);
  const r = solveCircuit(c);
  check('QWT matched', r.matched && near(r.Zin.re, 50, 1e-6), fmtC(r.Zin, 4, 'Ω'));
  const q = solveQwt({ re: 100, im: 0 }, 50);
  check('solveQwt Zt=70.71', near(q[0].Zt, 70.71, 0.01), JSON.stringify(q));
  const q2 = solveQwt({ re: 100, im: -50 }, 50);
  console.log('   solveQwt complex load:', q2.map((s) => `d=${fmtNum(s.dLambda, 4)} R=${fmtNum(s.Rreal, 2)} Zt=${fmtNum(s.Zt, 2)}`).join(' | '));
}
// 7. Single stub Pozar Ex 5.2: ZL = 60 - j80, Z0 = 50 -> d = 0.110, 0.260 ; short stub l = 0.095, 0.405
{
  const sols = solveSingleStub({ re: 60, im: -80 }, 50, 'short');
  console.log('   single stub:', sols.map((s) => `d=${fmtNum(s.dLambda, 4)} y=${fmtC(s.yAtStub, 3)} b=${fmtNum(s.bStub, 3)} l=${fmtNum(s.lLambda, 4)}`).join(' | '));
  check('single stub d≈0.110/0.260', near(sols[0].dLambda, 0.110, 0.002) && near(sols[1].dLambda, 0.260, 0.002));
  check('single stub l≈0.095/0.405', near(sols[0].lLambda, 0.095, 0.002) && near(sols[1].lLambda, 0.405, 0.002));
  const c = buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: sols[0].lLambda }], ['tline', 'series', { Z0: 50, len: sols[0].dLambda, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]);
  const r = solveCircuit(c);
  check('single stub circuit matched', abs(r.gammaIn) < 1e-6, fmtC(r.zin, 5) + ' warnings=' + JSON.stringify(r.warnings));
  const so = solveSingleStub({ re: 60, im: -80 }, 50, 'open');
  check('open stub l≈0.345/0.155', near(so[0].lLambda, 0.345, 0.002) && near(so[1].lLambda, 0.155, 0.002), so.map((s) => fmtNum(s.lLambda, 4)).join(','));
}
// 8. Double stub Pozar Ex 5.4: ZL = 60 - j80, d0 = 0, spacing λ/8 -> l1 = 0.100/0.062?, l2 = 0.146/0.204? (book: l1=0.100, l2=0.146 and l1=0.062... )
{
  const ds = solveDoubleStub({ re: 60, im: -80 }, 50, 0, 0.125, 'short');
  console.log('   double stub:', ds.forbidden ? 'FORBIDDEN' : ds.solutions.map((s) => `b1=${fmtNum(s.b1, 3)} b2=${fmtNum(s.b2, 3)} l1=${fmtNum(s.l1Lambda, 4)} l2=${fmtNum(s.l2Lambda, 4)}`).join(' | '));
  check('double stub not forbidden', !ds.forbidden);
  for (const s of ds.solutions) {
    const c = buildCircuit(2e9, 50, [['stub_short', 'shunt', { Z0: 50, len: s.l2Lambda }], ['tline', 'series', { Z0: 50, len: 0.125, vf: 0.66, lossDb: 0 }], ['stub_short', 'shunt', { Z0: 50, len: s.l1Lambda }], ['tline', 'series', { Z0: 50, len: 0, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 60, X: -80 }]]);
    const r = solveCircuit(c);
    check('double stub circuit matched', abs(r.gammaIn) < 1e-6, fmtC(r.zin, 5));
  }
}
// 9. L-match Pozar Ex 5.1: ZL = 200 - j100, Z0 = 100, f = 500 MHz -> B=0.29 (C=0.92pF), X=1.22 (L=38.8nH)
{
  const ls = solveLMatch({ re: 200, im: -100 }, 100, 500e6);
  console.log('   L-match:', ls.map((s) => `${s.topology} X=${fmtNum(s.X, 2)} B=${fmtNum(s.B, 5)} series=${s.seriesEl.type}:${(s.seriesEl.value).toExponential(3)} shunt=${s.shuntEl.type}:${(s.shuntEl.value).toExponential(3)}`).join(' | '));
  const c = buildCircuit(500e6, 100, [['inductor', 'series', { L: 38.8 }], ['capacitor', 'shunt', { C: 0.92 }], ['load', 'series', { R: 200, X: -100 }]]);
  const r = solveCircuit(c);
  check('L-match circuit matched', r.matched, fmtC(r.zin, 4) + ' SWR=' + fmtNum(r.swrIn, 3));
  const steps = explainCircuit(r);
  console.log('   L-match steps:', steps.map((s) => s.short).join(' → '));
}
// 10. π network solution check
{
  // design via two back-to-back L-sections with virtual R_v = 20 Ω
  const c = buildCircuit(100e6, 50, [['capacitor', 'shunt', { C: 39.0 }], ['inductor', 'series', { L: 134.5 }], ['capacitor', 'shunt', { C: 23.9 }], ['load', 'series', { R: 200, X: 0 }]]);
  const r = solveCircuit(c);
  check('π network matched', r.matched, 'zin=' + fmtC(r.zin, 3) + ' SWR=' + fmtNum(r.swrIn, 3));
}
// 11. empty + explain
{
  const r = solveCircuit(buildCircuit(100e6, 50, []));
  check('empty circuit short', r.Zin.re === 0 && r.gammaIn.re === -1, fmtC(r.gammaIn));
  check('empty explain', explainCircuit(r).length === 1);
}
// 12. Lossy line
{
  const c = buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.5, vf: 0.66, lossDb: 3 }], ['load', 'series', { R: 100, X: 0 }]]);
  const r = solveCircuit(c);
  check('lossy line |Γ| reduced', abs(r.gammaIn) < abs(r.gammaL), `|ΓL|=${fmtNum(abs(r.gammaL), 3)} |Γin|=${fmtNum(abs(r.gammaIn), 3)}`);
}

// 13. Solution engine: every lesson/problem with a solution converges when applied step by step
for (const lesson of ALL_LESSONS) {
  if (!lesson.solution) continue;
  let c = lesson.start();
  const info0 = buildSolution(lesson, c)!;
  check(`${lesson.id} solution has derivation`, info0.steps.length >= 2 && info0.targets.length >= 1, `${info0.targets.length} targets, ${info0.steps.length} lines`);
  let n = 0;
  let last = '';
  while (n < 30) {
    const r = applySolutionStep(lesson, c);
    if (!r) break;
    c = r.circuit;
    last = r.what;
    n++;
  }
  const info = buildSolution(lesson, c)!;
  check(`${lesson.id} step-by-step converges`, info.allOk && n > 0 && n < 30, `${n} steps, last: ${last}`);
  // the solution circuit must satisfy every guided step check that has a real condition
  const solC = lesson.solution();
  const rs = solveCircuit(solC);
  const passing = lesson.steps.filter((st) => st.check(solC, rs)).length;
  console.log(`   ${lesson.id}: solution passes ${passing}/${lesson.steps.length} guided checks; zin=${fmtC(rs.zin, 3)} SWR=${fmtNum(rs.swrIn, 2)}`);
  // KaTeX-unsafe characters in derivations
  const bad = info.steps.filter((l) => (l.kind === 'math' || l.kind === 'result') && (/[↓⏚→]/.test(l.tex) || /[^\\];\\Rightarrow/.test(l.tex)));
  check(`${lesson.id} derivation TeX has no unsupported glyphs`, bad.length === 0, bad.map((b) => (b as { tex: string }).tex).join(' | '));
}

// 14. Smith-chart walkthrough: every lesson gets >= 4 steps with finite overlay geometry
for (const lesson of ALL_LESSONS) {
  if (!lesson.solution) continue;
  const walk = smithMethodSteps(lesson, lesson.solution());
  const finite = (v: number) => Number.isFinite(v);
  let geomOk = true;
  for (const st of walk) {
    const h = st.highlight ?? {};
    for (const p of h.points ?? []) if (!finite(p.g.re) || !finite(p.g.im)) geomOk = false;
    for (const a of h.arcs ?? []) if (!finite(a.g.re) || !finite(a.g.im) || !finite(a.lenLambda)) geomOk = false;
    for (const c of h.circles ?? []) if (!finite(c.cx) || !finite(c.cy) || !finite(c.r)) geomOk = false;
    for (const l of st.lines) if ((l.kind === 'math' || l.kind === 'result') && /[↓⏚→]|[^\\];\\Rightarrow/.test(l.tex)) geomOk = false;
  }
  check(`${lesson.id} smith walkthrough`, walk.length >= 4 && geomOk, `${walk.length} steps: ${walk.map((w) => w.short).join(' → ')}`);
}

// 15. Practice problems: solution circuit satisfies the build check, answers are finite, and the
//     answers computed from the solution match hand-computed textbook values where known
const KNOWN: Record<string, Record<string, number>> = {
  pz1: { r: 2, x: 1, gamma: 0.447, swr: 2.618 },
  pz3: { RL: 30, XL: -60 },
  pz5: { Zt: 31.62 },
  py1: { g: 1, b: -1, C: 31.83 },
  py2: { g: 0.4, b: 0.2, G: 0.008, B: 0.004 },
  py3: { g: 0.5, b: -1, r: 0.4, x: 0.8 },
  py4: { gL: 0.3, bL: 0.4, d: 0.110, bAt: 1.47, l: 0.095 },
  py5: { gL: 0.4, bL: 0.2, bC: 0.29, xL: 1.22 },
  py6: { Q: 3.873, X: 96.8, L: 15.41, B: 0.00968, C: 1.541 },
  pb1: { X: -65, C: 12.24 },
  pb2: { Zt: 173.2, swrL: 12 },
  pb3: { g: 0.5, b: 0.25, d: 0.105, l: 0.1435 },
  pb4: { g: 0.25, b: 0.83, Lsh: 1627, Lse: 1129 },
};
for (const pr of PROBLEMS) {
  const sc = pr.solution!();
  const sr = solveCircuit(sc);
  const buildOk = pr.steps[0].check(sc, sr, { answersOk: true });
  const finalOk = pr.steps.every((st) => st.check(sc, sr, { answersOk: true }));
  const vals = pr.answers!.map((a) => [a.key, a.value(sr, sc)] as const);
  const finite = vals.every(([, v]) => Number.isFinite(v));
  let knownOk = true;
  const kn = KNOWN[pr.id];
  if (kn) for (const [k, v] of vals) if (kn[k] !== undefined && Math.abs(v - kn[k]) > Math.max(0.02 * Math.abs(kn[k]), 0.004)) knownOk = false;
  check(`${pr.id} ${pr.title}`, buildOk && finalOk && finite && knownOk, vals.map(([k, v]) => `${k}=${fmtNum(v, 4)}`).join(' '));
}

// 16. Course: book examples verified by sweep; every figure finite
check('Course Ex1 (book values) max SWR <= 2', sweepMaxSwr(solveSweep(ex1Book())) <= 2, solveSweep(ex1Book()).map((p) => fmtNum(p.result.swrIn, 2)).join('/'));
check('Course Ex2 (83 Ω line) max SWR <= 1.55', sweepMaxSwr(solveSweep(ex2Book())) <= 1.55, solveSweep(ex2Book()).map((p) => fmtNum(p.result.swrIn, 2)).join('/'));
check('Course Ex5 (full) max SWR <= 2', sweepMaxSwr(solveSweep(ex5Full())) <= 2, solveSweep(ex5Full()).map((p) => fmtNum(p.result.swrIn, 2)).join('/'));
const cf = courseFiguresFinite();
check('Course figures finite', cf.ok, cf.bad.join(', '));
check('Course has 7 chapters with sections', COURSE.length === 7 && COURSE.every((c) => c.sections.length >= 1), COURSE.map((c) => `${c.num}:${c.sections.length}`).join(' '));

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
if (fails > 0) throw new Error(`${fails} self-test(s) failed`);

// 17. Every SECTION_LINKS target must resolve to a real chapter+section, and every
//     example / lesson / problem should have a link (so the Lab can open the course).
{
  const { SECTION_LINKS, findChapter, sectionLabel } = await import('./course');
  const { EXAMPLES: EXS } = await import('./lessons');
  const badTargets = Object.entries(SECTION_LINKS).filter(([, l]) => !findChapter(l.chapter)?.sections.some((s) => s.id === l.section));
  check('SECTION_LINKS targets exist', badTargets.length === 0, badTargets.map(([k, l]) => `${k}->${l.chapter}/${l.section}`).join(' '));
  const emptyLabels = Object.entries(SECTION_LINKS).filter(([, l]) => !sectionLabel(l));
  check('SECTION_LINKS labels render', emptyLabels.length === 0, emptyLabels.map(([k]) => k).join(' '));
  const missing = [...EXS.map((e) => e.id), ...ALL_LESSONS.map((l) => l.id)].filter((id) => !SECTION_LINKS[id]);
  check('every example/lesson/problem links to the course', missing.length === 0, missing.join(' '));
}

console.log(fails === 0 ? '\nALL PASS (section links)' : `\n${fails} FAILED`);
if (fails > 0) throw new Error(`${fails} self-test(s) failed`);

// 18. Glossary: unique ids, no empty fields, every course link resolves, tooltips render
{
  const { GLOSSARY, tip, searchGlossary, SYMBOLS_SECTION, glossaryEntry } = await import('./glossary');
  const { findChapter } = await import('./course');
  const ids = GLOSSARY.map((g) => g.id);
  check('glossary ids unique', new Set(ids).size === ids.length, ids.filter((id, i) => ids.indexOf(id) !== i).join(' '));
  const empty = GLOSSARY.filter((g) => !g.sym || !g.name || !g.nameTh || !g.short);
  check('glossary entries complete', empty.length === 0, empty.map((g) => g.id).join(' '));
  const badLinks = GLOSSARY.filter((g) => g.link && !findChapter(g.link.chapter)?.sections.some((s) => s.id === g.link!.section));
  check('glossary course links resolve', badLinks.length === 0, badLinks.map((g) => `${g.id}->${g.link!.chapter}/${g.link!.section}`).join(' '));
  check('glossary symbols section exists', !!findChapter(SYMBOLS_SECTION.chapter)?.sections.some((s) => s.id === SYMBOLS_SECTION.section));
  check('glossary tooltips render', ['SWR', 'Gamma', 'r', 'b', 'QWT', 'ANT'].every((id) => tip(id).length > 20 && !!glossaryEntry(id)));
  check('glossary search works', searchGlossary('สตับ').length > 0 && searchGlossary('admittance').length > 0 && searchGlossary('ΓΓΓ').length === 0,
    `สตับ=${searchGlossary('สตับ').length} admittance=${searchGlossary('admittance').length}`);
  console.log(`   glossary: ${GLOSSARY.length} entries`);
}

console.log(fails === 0 ? '\nALL PASS (glossary)' : `\n${fails} FAILED`);
if (fails > 0) throw new Error(`${fails} self-test(s) failed`);

// 19. Marker round-trip: a z marked on the chart maps to Γ and back, and the derived
//     read-outs (y, SWR, wavelengths toward generator) agree with the engine.
{
  const { gammaFromz: gz, zFromGamma: zg, admittance: adm, swrFromGamma: swrG, wtgFromGamma: wtg } = await import('./rf');
  const pts: [number, number][] = [[1, 0], [0.5, 0.5], [2, -1], [0.2, -0.8], [5, 2], [0.1, 0]];
  let ok = true;
  const info: string[] = [];
  for (const [re, im] of pts) {
    const g = gz({ re, im });
    const back = zg(g);
    const y = adm({ re, im });
    const inside = abs(g) <= 1.0001;
    const round = Math.abs(back.re - re) < 1e-9 && Math.abs(back.im - im) < 1e-9;
    const yOk = Math.abs(y.re - re / (re * re + im * im)) < 1e-9;
    const swrOk = Number.isFinite(swrG(g)) && swrG(g) >= 1 - 1e-9;
    const wOk = wtg(g) >= 0 && wtg(g) < 0.5;
    if (!(inside && round && yOk && swrOk && wOk)) ok = false;
    info.push(`${re}${im < 0 ? '' : '+'}${im}j:SWR=${fmtNum(swrG(g), 2)}`);
  }
  check('marker z ↔ Γ round-trip and read-outs', ok, info.join(' '));
  // a negative-r marker must fall outside the unit circle (the UI flags it)
  check('marker with r < 0 is outside the chart', abs(gz({ re: -0.5, im: 0 })) > 1, fmtNum(abs(gz({ re: -0.5, im: 0 })), 3));
}

console.log(fails === 0 ? '\nALL PASS (markers)' : `\n${fails} FAILED`);
if (fails > 0) throw new Error(`${fails} self-test(s) failed`);

// 20. Auto-match must produce a working circuit for every example, lesson and problem
{
  const { autoMatch } = await import('./autoMatch');
  const { EXAMPLES: EXS } = await import('./lessons');
  const targets: { name: string; circuit: ReturnType<typeof solveCircuit>['circuit'] }[] = [
    ...EXS.map((e) => ({ name: `ex:${e.id}`, circuit: e.circuit() })),
    ...ALL_LESSONS.map((l) => ({ name: `${l.id}`, circuit: l.solution ? l.solution() : l.start() })),
  ].filter((t) => t.circuit.elements.length > 0);
  const failed: string[] = [];
  const skipped: string[] = [];
  let total = 0;
  for (const t of targets) {
    const r = autoMatch(t.circuit);
    if (r.problem) { skipped.push(t.name); continue; }
    total += r.candidates.length;
    // every proposal must match at the design frequency, and the built circuit must solve
    const bad = r.candidates.filter((c) => !(c.swr <= 1.05) || solveCircuit(c.circuit).swrIn > 1.05);
    if (r.candidates.length === 0 || bad.length) failed.push(`${t.name}(${bad.length}/${r.candidates.length})`);
  }
  check('auto-match designs a matched circuit everywhere', failed.length === 0, failed.join(' '));
  check('auto-match keeps the load intact', targets.every((t) => {
    const r = autoMatch(t.circuit);
    return r.problem !== undefined || r.candidates.every((c) => c.circuit.elements.slice(-r.loadCount).every((e, i) => e.type === t.circuit.elements.slice(-r.loadCount)[i].type));
  }));
  console.log(`   auto-match: ${targets.length - skipped.length} วงจร, ${total} ข้อเสนอ, ข้าม ${skipped.length} (โหลดไม่มีส่วนจริง: ${skipped.join(' ')})`);
}

console.log(fails === 0 ? '\nALL PASS (auto-match)' : `\n${fails} FAILED`);
if (fails > 0) throw new Error(`${fails} self-test(s) failed`);

// 21. Auto-match modes: 'replace' drops the old network, 'add' keeps the whole circuit
{
  const { autoMatch } = await import('./autoMatch');
  const { EXAMPLES: EXS } = await import('./lessons');
  const withNetwork = ['ex7', 'ex9', 'ex12', 'ex14'];
  const bad: string[] = [];
  for (const id of withNetwork) {
    const c = EXS.find((e) => e.id === id)!.circuit();
    const sig = (els: { type: string; orient: string }[]) => els.map((e) => `${e.type}:${e.orient}`).join(',');
    for (const mode of ['replace', 'add'] as const) {
      const r = autoMatch(c, mode);
      const best = r.candidates[0];
      if (!best) { bad.push(`${id}/${mode}:none`); continue; }
      const res = solveCircuit(best.circuit);
      const keptAll = sig(best.circuit.elements.slice(-c.elements.length)) === sig(c.elements);
      if (res.swrIn > 1.05) bad.push(`${id}/${mode}:swr${fmtNum(res.swrIn, 2)}`);
      if (mode === 'add' && !keptAll) bad.push(`${id}/add:lostOriginal`);
      if (mode === 'add' && best.circuit.elements.length <= c.elements.length) bad.push(`${id}/add:notAdded`);
      if (mode === 'replace' && r.loadCount >= c.elements.length && c.elements.length > 1) bad.push(`${id}/replace:keptNetwork`);
    }
  }
  check('auto-match replace/add modes behave differently and both match', bad.length === 0, bad.join(' '));
}

console.log(fails === 0 ? '\nALL PASS (match modes)' : `\n${fails} FAILED`);
if (fails > 0) throw new Error(`${fails} self-test(s) failed`);

// 22. The Smith Chart fundamentals course: structure, finite figures, textbook numbers
{
  const { BASICS, EX77, EX78, EX710, ex78AtFreq } = await import('./basics');
  const { solveSingleStub: sss, solveQwt: sq } = await import('./matching');
  const { normalize: nz, admittance: adm, swrFromGamma: swrG, gammaFromZ: gZ } = await import('./rf');
  check('basics has a roadmap chapter plus 11 teaching chapters', BASICS.length === 12 && BASICS[0].id === 'b0' && BASICS.every((c) => c.sections.length >= 1),
    BASICS.map((c) => `${c.num}:${c.sections.length}`).join(' '));
  const badFig: string[] = [];
  let figs = 0;
  for (const ch of BASICS)
    for (const sec of ch.sections)
      for (const fg of sec.figures ?? []) {
        figs++;
        if (fg.kind === 'plot') for (const s of fg.series) for (const [x, y] of s.points) if (!Number.isFinite(x) || Number.isNaN(y)) badFig.push(`${ch.id}/${sec.id}`);
        if (fg.kind === 'smith') { for (const p of fg.points ?? []) if (!Number.isFinite(p.z.re) || !Number.isFinite(p.z.im)) badFig.push(`${ch.id}/${sec.id}`);
          for (const cv of fg.curves ?? []) for (const z of cv.zs) if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) badFig.push(`${ch.id}/${sec.id}`); }
        if (fg.kind === 'chart') {
          // the full printed chart: every plotted z, every curve point and every SWR value
          // must be finite, or an SVG coordinate becomes NaN
          for (const p of fg.points ?? []) if (!Number.isFinite(p.z.re) || !Number.isFinite(p.z.im)) badFig.push(`${ch.id}/${sec.id}/chart-pt`);
          for (const cv of fg.curves ?? []) for (const z of cv.zs) if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) badFig.push(`${ch.id}/${sec.id}/chart-curve`);
          for (const v of fg.swr ?? []) if (!Number.isFinite(v) || v < 1) badFig.push(`${ch.id}/${sec.id}/chart-swr`);
          for (const v of [...(fg.rCircles ?? []), ...(fg.xCircles ?? []), ...(fg.gCircles ?? []), ...(fg.bCircles ?? [])]) if (!Number.isFinite(v)) badFig.push(`${ch.id}/${sec.id}/chart-circle`);
          if (fg.readout && (!Number.isFinite(fg.readout.re) || !Number.isFinite(fg.readout.im))) badFig.push(`${ch.id}/${sec.id}/chart-readout`);
        }
        if (fg.kind === 'lab') { const r = solveCircuit(fg.circuit()); if (Number.isNaN(r.swrIn)) badFig.push(`${ch.id}/${sec.id}/lab`); }
        if (fg.kind === 'wave' && !Number.isFinite(fg.gammaMag)) badFig.push(`${ch.id}/${sec.id}/wave`);
      }
  check('basics figures are all finite', badFig.length === 0, [...new Set(badFig)].join(' '));
  // section titles no longer carry their own numbers: the app numbers them by position,
  // so every "บทที่ N.M" / "หัวข้อ N.M" in the prose must resolve to a real section
  {
    const byNum = new Map(BASICS.map((c) => [c.num, c]));
    const refBad: string[] = [];
    const re = /(บทที่|หัวข้อ) (\d+)(?:\.(\d+))?/g;
    const seen = (where: string, txt: string) => {
      for (const m of txt.matchAll(re)) {
        const ch = byNum.get(m[2]);
        if (!ch) refBad.push(`${where}: ไม่มีบทที่ ${m[2]}`);
        else if (m[3] && !ch.sections[parseInt(m[3], 10) - 1]) refBad.push(`${where}: ไม่มีหัวข้อ ${m[2]}.${m[3]}`);
      }
    };
    for (const ch of BASICS) for (const sec of ch.sections) {
      if (/^\d+\.\d+ /.test(sec.title)) refBad.push(`${ch.num}/${sec.id}: title still carries its own number`);
      for (const l of sec.lines) seen(`${ch.num}/${sec.id}`, (l as { text?: string; tex?: string }).text ?? (l as { text?: string; tex?: string }).tex ?? '');
      for (const fg of sec.figures ?? []) if (fg.kind === 'table') for (const row of fg.rows) for (const cell of row) seen(`${ch.num}/${sec.id}/table`, String(cell));
    }
    check('every chapter and section reference in the basics course resolves', refBad.length === 0, [...new Set(refBad)].slice(0, 4).join(' | '));
    // a single backslash before ';' inside a TS string reaches KaTeX as a bare semicolon
    const texBad: string[] = [];
    for (const ch of BASICS) for (const sec of ch.sections) for (const l of sec.lines) {
      const tex = (l as { tex?: string }).tex;
      if (tex && /[^\\];/.test(tex)) texBad.push(`${ch.num}/${sec.id}`);
    }
    check('basics TeX has no stray semicolons (\\; needs a double backslash)', texBad.length === 0, [...new Set(texBad)].slice(0, 4).join(' '));
  }
  // textbook answers
  const a77 = sq(EX77.ZL, EX77.Z0).slice().sort((x, y) => x.dLambda - y.dLambda)[0];
  check('Example 7-7 matches the book (0.184λ, 39.8 Ω, 54.5 Ω)',
    Math.abs(a77.dLambda - 0.184) < 0.002 && Math.abs(a77.Rreal - 39.8) < 0.3 && Math.abs(a77.Zt - 54.5) < 0.3,
    `d=${fmtNum(a77.dLambda, 4)} R'=${fmtNum(a77.Rreal, 2)} Zt=${fmtNum(a77.Zt, 2)}`);
  const a78 = sss(EX78.ZL, EX78.Z0, 'short')[0];
  const y78t = adm(nz(EX78.ZL, EX78.Z0));
  check('Example 7-8 matches the book (SWR 4.6, y_L 0.24+j0.32, d 0.130λ, l 0.085λ)',
    Math.abs(swrG(gZ(EX78.ZL, EX78.Z0)) - 4.6) < 0.05 && Math.abs(y78t.re - 0.24) < 0.005 && Math.abs(y78t.im - 0.32) < 0.005 &&
    Math.abs(a78.dLambda - 0.130) < 0.002 && Math.abs(a78.lLambda - 0.085) < 0.002,
    `SWR=${fmtNum(swrG(gZ(EX78.ZL, EX78.Z0)), 3)} y=${fmtC(y78t, 3)} d=${fmtNum(a78.dLambda, 4)} l=${fmtNum(a78.lLambda, 4)}`);
  const a710 = sss(EX710.ZL, EX710.Z0, 'short')[0];
  check('Example 7-10 matches the book (SWR 1.5, y = 1 − j0.41)',
    Math.abs(swrG(gZ(EX710.ZL, EX710.Z0)) - 1.5) < 0.01 && Math.abs(a710.yAtStub.im + 0.41) < 0.01,
    `SWR=${fmtNum(swrG(gZ(EX710.ZL, EX710.Z0)), 3)} y=${fmtC(a710.yAtStub, 3)}`);
  const f12b = ex78AtFreq(12);
  check('Example 7-8 at 12 MHz gives d = 0.156λ and loses the match',
    Math.abs(f12b.d - 0.156) < 0.001 && f12b.swr > 2, `d=${fmtNum(f12b.d, 4)} SWR=${fmtNum(f12b.swr, 2)}`);
  // the book rounds d and l_s to three decimals, so the design frequency lands at SWR ≈ 1.03, not exactly 1
  check('Example 7-8 still matches at its design frequency', ex78AtFreq(10).swr < 1.05, fmtNum(ex78AtFreq(10).swr, 3));
  console.log(`   basics: ${BASICS.length} chapters, ${BASICS.reduce((a, c) => a + c.sections.length, 0)} sections, ${figs} figures`);
}

// 23. Radially scaled parameters: the strip's ticks must sit where the maths says,
//     and one |Γ| must read the same value on every row (that is why one compass
//     setting reads SWR, return loss and reflected power at once).
{
  const { readOff, magFromSwr, magFromRlDb, magFromReflPct, swrFromGamma: swrG, returnLossDb: rlDb, gammaFromz: gz, zFromGamma: zFromG } = await import('./rf');
  const absC = abs;
  const bad: string[] = [];
  for (const swr of [1, 1.2, 1.5, 2, 3, 5, 10, 50]) {
    const m = magFromSwr(swr);
    const back = swrG({ re: m, im: 0 });
    if (!near(back, swr, Math.max(1e-6, swr * 1e-9))) bad.push(`SWR ${swr} -> m ${m} -> ${back}`);
  }
  for (const rl of [0, 1, 3, 6, 10, 20, 40]) {
    const m = magFromRlDb(rl);
    const back = rlDb({ re: m, im: 0 });
    if (!near(back, rl, 1e-9)) bad.push(`RL ${rl} -> m ${m} -> ${back}`);
  }
  for (const pct of [0, 1, 10, 25, 50, 100]) {
    const m = magFromReflPct(pct);
    if (!near(m * m * 100, pct, 1e-9)) bad.push(`refl ${pct}% -> m ${m}`);
  }
  check('radial scale ticks invert exactly', bad.length === 0, bad.slice(0, 3).join(' | '));

  // a known point: z = 25 + j25 on 50 Ω  ->  |Γ| = 0.447, SWR = 2.62, RL = 7.0 dB, 20 % reflected
  const g = gz({ re: 0.5, im: 0.5 });
  const ro = readOff(g);
  check('read-off of z = 0.5 + j0.5 gives |Γ| 0.447, SWR 2.62, RL 7.0 dB, 20 %',
    near(ro.mag, 0.4472, 5e-4) && near(ro.swr, 2.618, 2e-3) && near(ro.rlDb, 6.99, 0.02) && near(ro.reflPct, 20, 0.05),
    `|Γ|=${fmtNum(ro.mag, 4)} SWR=${fmtNum(ro.swr, 3)} RL=${fmtNum(ro.rlDb, 2)} refl=${fmtNum(ro.reflPct, 2)}%`);

  // the SWR read on the strip must equal the r where the constant-|Γ| circle crosses
  // the positive real axis — the construction the chart draws
  const axisBad: string[] = [];
  for (const z of [{ re: 0.5, im: 0.5 }, { re: 2, im: -1 }, { re: 0.2, im: 0 }, { re: 4, im: 3 }]) {
    const gg = gz(z);
    const m = Math.min(absC(gg), 1);
    const rAtAxis = zFromG({ re: m, im: 0 }).re; // Γ = |Γ| ∠0 lies on the +r axis
    if (!near(rAtAxis, swrG(gg), 1e-6 * Math.max(1, swrG(gg)))) axisBad.push(fmtC(z, 2));
  }
  check('SWR equals r where the |Γ| circle crosses the right-hand axis', axisBad.length === 0, axisBad.join(' '));

  // matched load: every reading collapses to the ideal
  const ro0 = readOff({ re: 0, im: 0 });
  check('a matched load reads SWR 1, RL ∞, 0 % reflected',
    ro0.swr === 1 && !Number.isFinite(ro0.rlDb) && ro0.reflPct === 0, '');
  // total reflection: SWR ∞, RL 0 dB, 100 %
  const ro1 = readOff({ re: -1, im: 0 });
  check('a short circuit reads SWR ∞, RL 0 dB, 100 % reflected',
    !Number.isFinite(ro1.swr) && near(ro1.rlDb, 0, 1e-9) && near(ro1.reflPct, 100, 1e-9), '');
}

// 24. Every circuit gets a "read it off the scales" step, and the |Γ| it asks the
//     chart to draw must be the |Γ| of the point it names.
{
  const { magFromSwr: magFromSwr2, zFromGamma: zFromG2 } = await import('./rf');
  const bad: string[] = [];
  let withNetwork = 0;
  for (const lesson of ALL_LESSONS) {
    const circuit = lesson.solution ? lesson.solution() : lesson.start();
    if (circuit.elements.length === 0) continue;
    const res = solveCircuit(circuit);
    const steps = explainCircuit(res);
    const ro = steps.filter((st) => st.highlight?.readout);
    if (ro.length === 0) { bad.push(`${lesson.id}: no read-off step`); continue; }
    for (const st of ro) {
      const r = st.highlight!.readout!;
      const g = r.from === 'load' ? res.gammaL : res.gammaIn;
      if (Math.abs(abs(r.g) - abs(g)) > 1e-9) bad.push(`${lesson.id}/${r.from}: mag ${abs(r.g)} vs ${abs(g)}`);
      if (!(abs(r.g) >= 0 && abs(r.g) <= 1.0001)) bad.push(`${lesson.id}: mag out of range ${abs(r.g)}`);
    }
    if (res.hasNetwork) { withNetwork++; if (ro.length < 2) bad.push(`${lesson.id}: network but only ${ro.length} read-off step(s)`); }
  }
  check('every circuit explains how to read SWR/RL off the scales', bad.length === 0, bad.slice(0, 3).join(' | '));
  check('circuits with a matching network read off twice (load and input)', withNetwork > 5, `${withNetwork} with a network`);

  // the walkthrough carries the same construction
  const walkBad: string[] = [];
  for (const lesson of ALL_LESSONS) {
    if (!lesson.solution) continue;
    const sol = lesson.solution();
    const w = smithMethodSteps(lesson, sol);
    const solRes = solveCircuit(sol);
    const ro = w.filter((st) => st.highlight?.readout);
    if (ro.length === 0) walkBad.push(lesson.id);
    for (const st of ro) {
      const r = st.highlight!.readout!;
      // the walkthrough draws the SOLUTION's point, never the learner's live circuit
      const gw = r.from === 'load' ? solRes.gammaL : solRes.gammaIn;
      if (!Number.isFinite(abs(r.g)) || abs(r.g) < 0 || abs(r.g) > 1.0001) walkBad.push(`${lesson.id}:mag`);
      if (Math.abs(abs(r.g) - abs(gw)) > 1e-9) walkBad.push(`${lesson.id}:${r.from} ${abs(r.g)} vs ${abs(gw)}`);
    }
  }
  check('the Smith-chart walkthrough also shows the read-off', walkBad.length === 0, walkBad.slice(0, 4).join(' '));

  // the axis the chart draws the ruler on really is the SWR axis
  const rulerBad: string[] = [];
  for (const swr of [1.5, 2, 3, 5, 10]) {
    const m = magFromSwr2(swr);
    const zAtTick = zFromG2({ re: m, im: 0 });
    if (Math.abs(zAtTick.re - swr) > 1e-9 || Math.abs(zAtTick.im) > 1e-12) rulerBad.push(`${swr}->${fmtNum(zAtTick.re, 4)}`);
  }
  check('the SWR ruler ticks land on r = SWR', rulerBad.length === 0, rulerBad.join(' '));
}

console.log(fails === 0 ? '\nALL PASS (basics course)' : `\n${fails} FAILED`);
if (fails > 0) throw new Error(`${fails} self-test(s) failed`);
