import React, { useEffect, useRef } from 'react';
import { useAppState, useDispatch } from '../state/store';
import { Lesson } from '../engine/lessons';
import { buildSolution, applySolutionStep, TargetValue } from '../engine/solutions';
import { fmtNum } from '../engine/complex';
import { StepLines } from './StepLines';
import { CircuitSchematic } from './CircuitSchematic';
import { MiniSmith } from './MiniSmith';
import { solveCircuit } from '../engine/solver';
import { smithMethodSteps } from '../engine/smithMethod';
import type { ExplainStep } from '../engine/explain';

const fmtT = (v: number | undefined, key: string) => (v === undefined ? '—' : fmtNum(v, key === 'len' ? 3 : 2));

/** `hideAnswer` keeps the checklist — what is needed, what you have, right or wrong — but not the number to copy. */
const TargetTable: React.FC<{ targets: TargetValue[]; compact?: boolean; hideAnswer?: boolean }> = ({ targets, compact, hideAnswer }) => (
  <table className={`sol-table ${compact ? 'compact' : ''}`}>
    <thead>
      <tr><th>อุปกรณ์</th><th>ค่า</th>{!hideAnswer && <th>เฉลย</th>}<th>ของคุณ</th><th></th></tr>
    </thead>
    <tbody>
      {targets.map((t, i) => (
        <tr key={i} className={t.ok ? 'ok' : t.current === undefined ? 'missing' : 'bad'}>
          <td className="mono">{t.elementLabel}</td>
          <td>{t.label}</td>
          {!hideAnswer && <td className="mono">{fmtT(t.value, t.key)} {t.unit}</td>}
          <td className="mono">{t.current === undefined ? 'ยังไม่มี' : `${fmtT(t.current, t.key)} ${t.unit}`}</td>
          <td className="mark">{t.ok ? '✓' : '✗'}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const SolutionActions: React.FC<{ lesson: Lesson; allOk: boolean }> = ({ lesson, allOk }) => {
  const state = useAppState();
  const dispatch = useDispatch();
  const stepApply = () => {
    const r = applySolutionStep(lesson, state.circuit);
    if (r) dispatch({ type: 'solution_step', circuit: r.circuit, what: r.what });
  };
  const applyAndExplain = () => {
    dispatch({ type: 'lesson_solution' });
    dispatch({ type: 'modal', modal: 'none' });
    dispatch({ type: 'explain_all', value: false });
    dispatch({ type: 'explain_step', i: 0 });
  };
  return (
    <div className="sol-actions">
      <button className="btn primary small" disabled={allOk} onClick={stepApply} title="ใส่ค่าเฉลยทีละค่า แล้วดูจุดบน Smith Chart ขยับ">
        ▶ เติมค่าเฉลยถัดไป
      </button>
      <button className="btn small" disabled={allOk} onClick={() => dispatch({ type: 'lesson_solution' })}>
        ใช้เฉลยทั้งหมด
      </button>
      <button className="btn small" onClick={applyAndExplain}>
        ใช้เฉลย + อธิบายทีละขั้น
      </button>
      <button className="btn small" onClick={() => dispatch({ type: 'modal', modal: state.modal === 'solution' ? 'none' : 'solution' })}>
        📖 วิธีทำ
      </button>
    </div>
  );
};

/** Smith-chart walkthrough stepper (drives the overlay on the main Smith chart). */
export const SmithWalk: React.FC<{ lesson: Lesson; compact?: boolean; steps?: ExplainStep[]; mask?: boolean }> = ({ lesson, compact, steps, mask }) => {
  const state = useAppState();
  const dispatch = useDispatch();
  const walk = steps ?? (lesson.solution ? smithMethodSteps(lesson, lesson.solution()) : []);
  if (walk.length === 0) return null;
  const active = state.solutionStep !== null;
  const idx = active ? Math.min(state.solutionStep!, walk.length - 1) : -1;
  const cur = idx >= 0 ? walk[idx] : undefined;
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // bring the step card into view inside the scrollable guide strip only (never scroll the window)
    const card = cardRef.current;
    const box = card?.closest('.guide') as HTMLElement | null;
    if (!card || !box) return;
    const top = card.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8;
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [idx]);
  return (
    <div className={`walk ${compact ? 'compact' : ''}`}>
      <div className="walk-head">
        <b>🧭 วิธีทำบน Smith Chart</b>
        {!active ? (
          <button className="btn primary small" onClick={() => { dispatch({ type: 'solution_walk', i: 0 }); dispatch({ type: 'modal', modal: 'none' }); }}>▶ เริ่มไล่ทีละขั้นบนกราฟ</button>
        ) : (
          <button className="btn small" onClick={() => dispatch({ type: 'solution_walk', i: null })}>✕ ปิดไฮไลต์</button>
        )}
        <span className="muted">{walk.length} ขั้น · ไฮไลต์บนแผง SMITH CHART ด้านขวา</span>
      </div>
      <div className="stepper walk-stepper">
        {walk.map((st, i) => (
          <React.Fragment key={st.id}>
            <button className={`chip step-chip tag-${st.tag} ${i === idx ? 'on' : ''} ${i < idx ? 'done' : ''}`} onClick={() => { dispatch({ type: 'solution_walk', i }); dispatch({ type: 'modal', modal: 'none' }); }}>
              <span className="n">{i + 1}</span> {st.tag === 'match' && i <= idx ? '✓ ' : ''}{mask && i > idx + 1 ? 'ขั้นถัดไป' : st.short}
            </button>
            {i < walk.length - 1 && <span className="arrow">→</span>}
          </React.Fragment>
        ))}
      </div>
      {cur && (
        <div className="walk-card" ref={cardRef}>
          <div className="step-head"><span className="step-num">ขั้น {idx + 1}/{walk.length}</span><span className="step-title">{cur.title}</span></div>
          <StepLines lines={cur.lines} />
          <div className="step-nav">
            <button className="btn small" disabled={idx <= 0} onClick={() => dispatch({ type: 'solution_walk', i: idx - 1 })}>◀ ก่อนหน้า</button>
            <span className="step-pos">{idx + 1} / {walk.length}</span>
            <button className="btn small" disabled={idx >= walk.length - 1} onClick={() => dispatch({ type: 'solution_walk', i: idx + 1 })}>ถัดไป ▶</button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Compact row shown inside the Guided Lab strip. */
export const SolutionRow: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const state = useAppState();
  const info = buildSolution(lesson, state.circuit);
  // The answer circuit is the end of the story, so it waits: walk the chart first, or finish the
  // circuit yourself, or say outright that you want to see it. Peeking resets with the lesson.
  const [peek, setPeek] = React.useState(false);
  React.useEffect(() => setPeek(false), [lesson.id]);
  const walk = React.useMemo(() => (lesson.solution ? smithMethodSteps(lesson, lesson.solution()) : []), [lesson]);
  if (!info) return <div className="sol-row"><span className="muted">บทเรียนนี้ไม่มีเฉลยตายตัว</span></div>;
  const walkAt = state.solutionStep === null ? -1 : Math.min(state.solutionStep, walk.length - 1);
  const walkDone = walk.length > 0 && walkAt >= walk.length - 1;
  const show = peek || info.allOk || walkDone;
  const why = info.allOk ? 'วงจรของคุณตรงกับเฉลยแล้ว' : walkDone ? 'ไล่ครบทุกขั้นบนกราฟแล้ว' : 'คุณกดขอดูเอง';
  return (
    <div className="sol-row">
      <div className="sol-head">
        <b>เฉลย</b>
        <span className={`sol-status ${info.allOk ? 'ok' : ''}`}>{info.allOk ? '✓ ตรงกับเฉลยทุกค่าแล้ว' : `${info.targets.filter((t) => t.ok).length}/${info.targets.length} ค่าตรงเฉลย${info.structureOk ? '' : ' · โครงวงจรยังไม่ตรง'}`}</span>
        {state.lastSolutionStep && <span className="sol-last">ล่าสุด: {state.lastSolutionStep}</span>}
      </div>
      {show ? (
        <>
          <div className="sol-reveal-why">เปิดวงจรเฉลยแล้ว เพราะ{why}</div>
          <div className="sol-grid">
            <div className="sol-circuit">
              <CircuitSchematic circuit={info.circuit} result={solveCircuit(info.circuit)} status={info.solutionStatus} title="วงจรเฉลย (✓ = ค่าของคุณตรงแล้ว, ✗ = ยังไม่ตรง/ยังไม่มี)" maxHeight={150} />
            </div>
            <TargetTable targets={info.targets} compact />
          </div>
          <details className="sol-derive-inline" open>
            <summary>📖 คำอธิบายละเอียดของวงจรนี้</summary>
            <StepLines lines={info.steps} />
          </details>
        </>
      ) : (
        <div className="sol-hidden">
          <div className="sol-hidden-head">🔒 ยังไม่แสดงวงจรเฉลย</div>
          <p>
            วงจรคือ “คำตอบ” ของบทนี้ จึงเก็บไว้ทีหลัง · ไล่ดูวิธีทำบนกราฟให้ครบทั้ง {walk.length} ขั้นก่อน
            {walkAt >= 0 ? ` (ตอนนี้อยู่ขั้นที่ ${walkAt + 1})` : ''} แล้ววงจรกับค่าทุกตัวจะแสดงพร้อมคำอธิบายละเอียด
          </p>
          <TargetTable targets={info.targets} compact hideAnswer />
          <div className="sol-hidden-note">ตารางนี้บอกได้ว่าค่าไหนยังไม่ตรง โดยยังไม่บอกตัวเลขเฉลย</div>
          <button className="btn small" onClick={() => setPeek(true)}>👁 ข้ามไปดูวงจรเฉลยเลย</button>
        </div>
      )}
      <SolutionActions lesson={lesson} allOk={info.allOk} />
      <SmithWalk lesson={lesson} compact steps={walk} mask={!show} />
    </div>
  );
};

/** Full derivation used in the modal. */
export const SolutionModalBody: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const state = useAppState();
  const dispatch = useDispatch();
  const info = buildSolution(lesson, state.circuit);
  if (!info) return <div className="modal-body">บทเรียนนี้ไม่มีเฉลยตายตัว</div>;
  const solRes = solveCircuit(info.circuit);
  const stuRes = solveCircuit(state.circuit);
  const needY = info.circuit.elements.some((e) => e.orient === 'shunt');
  return (
    <div className="modal-body sol-modal">
      <div className="sol-compare">
        <div className="sol-cmp-card yours">
          <CircuitSchematic circuit={state.circuit} result={stuRes} status={info.studentStatus} title="วงจรของคุณ (ตอนนี้)" maxHeight={170} />
          <MiniSmith result={stuRes} showY={needY} caption="ของคุณ" />
        </div>
        <div className="sol-cmp-card answer">
          <CircuitSchematic circuit={info.circuit} result={solRes} status={info.solutionStatus} title="วงจรเฉลย" maxHeight={170} />
          <MiniSmith result={solRes} showY={needY} caption="เฉลย" />
        </div>
      </div>
      <div className="sol-cols">
        <div className="sol-derive">
          <h3>วิธีทำ (คำนวณตามหนังสือ)</h3>
          <StepLines lines={info.steps} />
          <h3 style={{ marginTop: 14 }}>วิธีทำบน Smith Chart (เชิงกราฟ)</h3>
          <ol className="walk-list">
            {smithMethodSteps(lesson, info.circuit).map((st, i) => (
              <li key={st.id}>
                <div className="walk-list-head">
                  <b>{i + 1}. {st.title}</b>
                  <button className="mini wide" onClick={() => { dispatch({ type: 'solution_walk', i }); dispatch({ type: 'modal', modal: 'none' }); }} title="ปิดหน้านี้แล้วไฮไลต์ขั้นนี้บน Smith Chart">ดูบนกราฟ ▶</button>
                </div>
                <StepLines lines={st.lines} />
              </li>
            ))}
          </ol>
        </div>
        <div className="sol-side">
          <h3>ค่าเฉลย</h3>
          <TargetTable targets={info.targets} />
          <div className="sol-meta">f = {fmtNum(info.circuit.f / 1e6, 4)} MHz · Z₀ = {fmtNum(info.circuit.Z0, 1)} Ω</div>
          <SolutionActions lesson={lesson} allOk={info.allOk} />
        </div>
      </div>
    </div>
  );
};
