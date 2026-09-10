import React from 'react';
import { useAppState, useDispatch } from '../state/store';
import { autoMatch, MatchCandidate } from '../engine/autoMatch';
import { CircuitSchematic } from './CircuitSchematic';
import { MiniSmith } from './MiniSmith';
import { solveCircuit } from '../engine/solver';
import { fmtNum, isFiniteC, Complex } from '../engine/complex';

const fz = (z: Complex, d = 2) => (isFiniteC(z) ? `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}` : '∞');

const Card: React.FC<{ c: MatchCandidate; best: boolean }> = ({ c, best }) => {
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
          <MiniSmith result={res} showY={c.circuit.elements.some((e) => e.orient === 'shunt')} caption="หลังใส่วงจร" />
          <ul className="mt-notes">
            {c.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <button className="btn primary small" onClick={use}>✓ ใช้วงจรนี้</button>
        </div>
      </div>
    </div>
  );
};

export const MatchingPanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const r = autoMatch(state.circuit);
  return (
    <div className="modal-body matching">
      <div className="mt-summary">
        <div>
          <b>โหลดปัจจุบัน</b> Z_L = {fz(r.ZL, 2)} Ω · z_L = {fz(r.zL, 3)} · SWR ก่อนแมตช์ ={' '}
          <b className={r.swrL > 2 ? 'bad' : ''}>{Number.isFinite(r.swrL) ? fmtNum(r.swrL, 2) : '∞'}</b>
          {r.loadCount > 0 && <span className="muted"> · ใช้อุปกรณ์ท้ายวงจร {r.loadCount} ตัวเป็นโหลด</span>}
        </div>
        {r.alreadyMatched && <div className="mt-note ok">วงจรนี้แมตช์อยู่แล้ว (SWR ≈ 1) วงจรด้านล่างเป็นทางเลือกอื่นที่ให้ผลเดียวกัน</div>}
        {r.replacesNetwork && <div className="mt-note warn">⚠ วงจรเดิมมี matching network อยู่แล้ว การกด "ใช้วงจรนี้" จะแทนที่ด้วยวงจรใหม่ (โหลดยังคงเดิม)</div>}
        {r.problem && <div className="mt-note warn">{r.problem}</div>}
      </div>
      {r.candidates.length > 0 && (
        <div className="mt-list">
          {r.candidates.map((c, i) => (
            <Card key={c.id} c={c} best={i === 0} />
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
