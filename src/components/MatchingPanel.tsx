import React, { useState } from 'react';
import { useAppState, useDispatch } from '../state/store';
import { autoMatch, MatchCandidate, MatchMode } from '../engine/autoMatch';
import { CircuitSchematic } from './CircuitSchematic';
import { MiniSmith } from './MiniSmith';
import { solveCircuit, findLoadStart } from '../engine/solver';
import { fmtNum, isFiniteC, Complex } from '../engine/complex';

const fz = (z: Complex, d = 2) => (isFiniteC(z) ? `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}` : '∞');

const Card: React.FC<{ c: MatchCandidate; best: boolean; mode: MatchMode }> = ({ c, best, mode }) => {
  const dispatch = useDispatch();
  const res = solveCircuit(c.circuit);
  const use = () => {
    dispatch({ type: 'set_circuit', circuit: c.circuit, select: null });
    dispatch({ type: 'modal', modal: 'none' });
    dispatch({ type: 'explain_all', value: false });
    dispatch({ type: 'explain_step', i: 0 });
    dispatch({ type: 'mode', mode: 'free' });
  };
  return (
    <div className={`mt-card ${best ? 'best' : ''}`}>
      <div className="mt-head">
        <b>{c.title}</b>
        {best && <span className="mt-best">แนะนำ</span>}
        <span className="spacer" />
        <span className="mt-swr">SWR {fmtNum(c.swr, 3)}</span>
        {c.bandMaxSwr !== undefined && <span className="mt-band">ทั้งแบนด์สูงสุด {fmtNum(c.bandMaxSwr, 2)}</span>}
      </div>
      <div className="mt-body">
        <div className="mt-left">
          <CircuitSchematic circuit={c.circuit} result={res} title="วงจรใหม่ (จากแหล่งจ่ายไปทางโหลด)" maxHeight={140} />
          <ul className="mt-parts">
            {c.parts.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="mt-right">
          <MiniSmith result={res} showY={c.circuit.elements.some((e) => e.orient === 'shunt')} caption="ถ้าใช้วงจรนี้" predicted />
          <ul className="mt-notes">
            {c.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <button className="btn primary small" onClick={use}>✓ {mode === 'add' ? 'เพิ่มเข้าวงจรนี้' : 'ใช้วงจรนี้ (แทนที่)'}</button>
        </div>
      </div>
    </div>
  );
};

export const MatchingPanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const hasNetwork = findLoadStart(state.circuit.elements) > 0;
  const [mode, setMode] = useState<MatchMode>('replace');
  const r = autoMatch(state.circuit, mode);
  return (
    <div className="modal-body matching">
      <div className="mt-summary">
        <div className="mt-mode">
          <b>ทำอย่างไรกับวงจรเดิม</b>
          <div className="seg small">
            <button className={mode === 'replace' ? 'on' : ''} onClick={() => setMode('replace')} title="เก็บเฉพาะโหลดท้ายวงจร แล้วแทนที่ matching network เดิมด้วยวงจรใหม่">
              ♻ แทนที่ network เดิม
            </button>
            <button className={mode === 'add' ? 'on' : ''} onClick={() => setMode('add')} title="เก็บวงจรเดิมทั้งชุดไว้ แล้วเพิ่ม matching network ใหม่ต่อด้านแหล่งจ่าย">
              ＋ เพิ่มต่อจากวงจรเดิม
            </button>
          </div>
          {!hasNetwork && <span className="muted">วงจรเดิมยังไม่มี network ทั้งสองแบบจึงให้ผลเหมือนกัน</span>}
        </div>
        <div>
          <b>{mode === 'add' ? 'วงจรเดิมทั้งชุด (ใช้เป็นโหลด)' : 'โหลดปัจจุบัน'}</b> Z = {fz(r.ZL, 2)} Ω · z = {fz(r.zL, 3)} · SWR ก่อนแมตช์ ={' '}
          <b className={r.swrL > 2 ? 'bad' : ''}>{Number.isFinite(r.swrL) ? fmtNum(r.swrL, 2) : '∞'}</b>
          {r.loadCount > 0 && <span className="muted"> · {mode === 'add' ? `ใช้อุปกรณ์ทั้ง ${r.loadCount} ตัวเป็นโหลด` : `ใช้อุปกรณ์ท้ายวงจร ${r.loadCount} ตัวเป็นโหลด`}</span>}
        </div>
        {r.alreadyMatched && <div className="mt-note ok">{mode === 'add' ? 'วงจรเดิมแมตช์อยู่แล้ว (SWR ≈ 1) การเพิ่ม network อีกชุดจึงไม่จำเป็น' : 'โหลดนี้แมตช์อยู่แล้ว (SWR ≈ 1) วงจรด้านล่างเป็นทางเลือกอื่นที่ให้ผลเดียวกัน'}</div>}
        {r.replacesNetwork && <div className="mt-note warn">⚠ วงจรเดิมมี matching network อยู่แล้ว การกด "ใช้วงจรนี้ (แทนที่)" จะแทนที่ด้วยวงจรใหม่ (โหลดยังคงเดิม) · เลือก "เพิ่มต่อจากวงจรเดิม" ถ้าต้องการเก็บของเดิมไว้ทั้งหมด</div>}
        {r.problem && <div className="mt-note warn">{r.problem}</div>}
      </div>
      {r.candidates.length > 0 && (
        <div className="mt-list">
          {r.candidates.map((c, i) => (
            <Card key={c.id} c={c} best={i === 0} mode={mode} />
          ))}
        </div>
      )}
      {r.candidates.length === 0 && !r.problem && <div className="mt-note">ไม่พบวงจรที่เหมาะสม</div>}
      <div className="mt-foot">
        <button className="btn" onClick={() => dispatch({ type: 'modal', modal: 'none' })}>ปิด</button>
        <span className="muted">ทุกวงจรออกแบบที่ความถี่ {fmtNum(state.circuit.f / 1e6, 3)} MHz และ Z₀ = {fmtNum(state.circuit.Z0, 1)} Ω · เรียงจากผลดีที่สุด</span>
      </div>
    </div>
  );
};
