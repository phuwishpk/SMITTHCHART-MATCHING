// TEMP verification script — simulates CoursePanel.tsx 'lab' handler dispatch sequence
import { reducer } from '../state/store';
import { ex1Load } from './course';
import { solveSweep } from './solver';

// student state restored from localStorage with sweep previously switched off
const start: any = { circuit: ex1Load(), showSweep: false, showY: false, swrTarget: null, mode: 'guided', lessonId: 'l1', explainStep: 3, view: 'course', modal: 'none', selectedId: null, probe: null };
const fig = { circuit: ex1Load, swrTarget: 2 as number | undefined, showY: undefined as boolean | undefined };
let s = start;
s = reducer(s, { type: 'set_circuit', circuit: fig.circuit(), select: null });
s = reducer(s, { type: 'swr_target', value: fig.swrTarget === undefined ? null : fig.swrTarget });
if (fig.showY !== undefined) s = reducer(s, { type: 'toggle', key: 'showY', value: fig.showY });
s = reducer(s, { type: 'mode', mode: 'free' });
s = reducer(s, { type: 'explain_step', i: 0 });
s = reducer(s, { type: 'view', view: 'lab' });
console.log('after lab dispatches:', { showSweep: s.showSweep, swrTarget: s.swrTarget, view: s.view, mode: s.mode });

const sw = solveSweep(ex1Load());
console.log('solveSweep(ex1Load) points:', sw.length);
for (const p of sw) {
  const g = Math.hypot(p.result.gammaIn.re, p.result.gammaIn.im);
  console.log(`  f=${(p.f / 1e6).toFixed(2)} MHz  z_in=${p.result.zin.re.toFixed(3)}${p.result.zin.im < 0 ? '-' : '+'}j${Math.abs(p.result.zin.im).toFixed(3)}  |Gamma|=${g.toFixed(3)}  SWR=${p.result.swrIn.toFixed(2)}`);
}
