import React, { useEffect } from 'react';
import { useAppState, useDispatch } from '../state/store';
import { LESSONS, EXAMPLES, PROBLEMS, findLesson } from '../engine/lessons';
import { SolutionModalBody } from './SolutionPanel';

export const Modals: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'modal', modal: 'none' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  if (state.modal === 'none') return null;
  const close = () => dispatch({ type: 'modal', modal: 'none' });
  const lesson = findLesson(state.lessonId);
  if (state.modal === 'solution') {
    return (
      <div className="modal-backdrop" onClick={close}>
        <div className="modal wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>📖 วิธีทำ{lesson ? ` — Level ${lesson.level}: ${lesson.title}` : ''}</h2>
            <button className="btn ghost" onClick={close}>✕</button>
          </div>
          {lesson ? <SolutionModalBody lesson={lesson} /> : <div className="modal-body">เลือกบทเรียนก่อน</div>}
        </div>
      </div>
    );
  }
  if (state.modal === 'problems') {
    return (
      <div className="modal-backdrop" onClick={close}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>📝 โจทย์ฝึกหัด: Impedance (Z) และ Admittance (Y)</h2>
            <button className="btn ghost" onClick={close}>✕</button>
          </div>
          <div className="modal-body">
            {(['impedance', 'admittance'] as const).map((cat) => (
              <div key={cat} className="phase">
                <h3>{cat === 'impedance' ? 'ชุด Z — Impedance: normalize, r/x, Γ, SWR, สายส่ง, λ/4' : 'ชุด Y — Admittance: y = 1/z, g/b, อุปกรณ์ขนาน, stub, L-section'}</h3>
                <div className="card-grid">
                  {PROBLEMS.filter((p) => p.category === cat).map((p) => (
                    <button key={p.id} className={`card ${state.lessonId === p.id ? 'active' : ''}`} onClick={() => dispatch({ type: 'lesson', id: p.id })}>
                      <span className="card-lvl">{cat === 'impedance' ? 'IMPEDANCE' : 'ADMITTANCE'} · {p.answers?.length ?? 0} คำตอบ</span>
                      <b>{p.title}</b>
                      <small>{p.learn}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="ex-note">💡 ทุกข้อ: กรอกคำตอบตัวเลข + สร้างวงจรตามโจทย์ ระบบตรวจให้ทันที และมีปุ่ม "เฉลย" พร้อมวิธีทำและวิธีทำบน Smith Chart เหมือนบทเรียน</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{state.modal === 'lessons' ? '📚 บทเรียน: จากง่ายไปยาก (14 ระดับ)' : '🧪 วงจรตัวอย่างสำเร็จรูป'}</h2>
          <button className="btn ghost" onClick={close}>✕</button>
        </div>
        {state.modal === 'lessons' ? (
          <div className="modal-body">
            {[1, 2, 3].map((ph) => (
              <div key={ph} className="phase">
                <h3>
                  Phase {ph}: {ph === 1 ? 'Series R / L / C — ความถี่, Z_L, Normalize, SWR' : ph === 2 ? 'Parallel, Admittance, Transmission Line, Probe, λ/4' : 'Stub Matching, Double Stub, L-Match, π/T'}
                </h3>
                <div className="card-grid">
                  {LESSONS.filter((l) => l.phase === ph).map((l) => (
                    <button key={l.id} className={`card ${state.lessonId === l.id ? 'active' : ''}`} onClick={() => dispatch({ type: 'lesson', id: l.id })}>
                      <span className="card-lvl">Level {l.level}{l.bookPriority && <em title="ตรงกับบท Transmission Lines ในหนังสือ"> ★ หนังสือ</em>}</span>
                      <b>{l.title}</b>
                      <small>{l.learn}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="modal-body">
            <div className="card-grid">
              {EXAMPLES.map((ex) => (
                <button key={ex.id} className="card" onClick={() => dispatch({ type: 'example', id: ex.id })}>
                  <span className="card-lvl">{ex.title}</span>
                  <b>{ex.subtitle}</b>
                  <small>{ex.circuit().elements.map((e) => (e.orient === 'shunt' ? `${e.type}↓` : e.type)).join(' — ')}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
