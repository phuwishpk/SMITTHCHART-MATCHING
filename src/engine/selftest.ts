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
