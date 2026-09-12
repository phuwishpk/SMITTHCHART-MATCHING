import React, { useEffect } from 'react';
import { t } from '../engine/i18n';
import { useAppState, useDispatch } from '../state/store';
import { LESSONS, EXAMPLES, PROBLEMS, findLesson } from '../engine/lessons';
import { SECTION_LINKS, sectionLabel } from '../engine/course';
import { SolutionModalBody } from './SolutionPanel';
import { GlossaryPanel } from './GlossaryPanel';
import { MatchingPanel } from './MatchingPanel';

export const Modals: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  /** small link under a card that opens the matching section of the course */
  const CourseLink: React.FC<{ id: string }> = ({ id }) => {
    const link = SECTION_LINKS[id];
    const label = sectionLabel(link);
    if (!link || !label) return null;
    return (
      <button className="card-link" title={`เปิดเนื้อหา: ${label}`} onClick={() => dispatch({ type: 'course_section', chapter: link.chapter, section: link.section })}>
        📖 {label}
      </button>
    );
  };
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
            <h2>{t("📖 วิธีทำ")}{lesson ? ` — Level ${lesson.level}: ${lesson.title}` : ''}</h2>
            <button className="btn ghost" onClick={close}>✕</button>
          </div>
          {lesson ? <SolutionModalBody lesson={lesson} /> : <div className="modal-body">{t("เลือกบทเรียนก่อน")}</div>}
        </div>
      </div>
    );
  }
  if (state.modal === 'matching') {
    return (
      <div className="modal-backdrop" onClick={close}>
        <div className="modal wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>{t("⚡ สร้างวงจร matching ให้โหลดนี้")}</h2>
            <button className="btn ghost" onClick={close}>✕</button>
          </div>
          <MatchingPanel />
        </div>
      </div>
    );
  }
  if (state.modal === 'glossary') {
    return (
      <div className="modal-backdrop" onClick={close}>
        <div className="modal wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>{t("📗 ความหมายของตัวย่อและสัญลักษณ์")}</h2>
            <button className="btn ghost" onClick={close}>✕</button>
          </div>
          <GlossaryPanel />
        </div>
      </div>
    );
  }
  if (state.modal === 'problems') {
    return (
      <div className="modal-backdrop" onClick={close}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>{t("📝 โจทย์ฝึกหัด: Impedance (Z) และ Admittance (Y)")}</h2>
            <button className="btn ghost" onClick={close}>✕</button>
          </div>
          <div className="modal-body">
            {(['impedance', 'admittance', 'book'] as const).map((cat) => (
              <div key={cat} className="phase">
                <h3>{cat === 'impedance' ? 'ชุด Z — Impedance: normalize, r/x, Γ, SWR, สายส่ง, λ/4' : cat === 'admittance' ? 'ชุด Y — Admittance: y = 1/z, g/b, อุปกรณ์ขนาน, stub, L-section' : 'ชุดหนังสือ Caron — Antenna Impedance Matching: series stub/C, λ/4 600→50, 80−j40, Example 1'}</h3>
                <div className="card-grid">
                  {PROBLEMS.filter((p) => p.category === cat).map((p) => (
                    <div key={p.id} className="card-wrap">
                      <button className={`card ${state.lessonId === p.id ? 'active' : ''}`} onClick={() => dispatch({ type: 'lesson', id: p.id })}>
                        <span className="card-lvl">{cat === 'impedance' ? 'IMPEDANCE' : cat === 'admittance' ? 'ADMITTANCE' : 'CARON'} · {p.answers?.length ?? 0} {t("คำตอบ")}</span>
                        <b>{p.title}</b>
                        <small>{p.learn}</small>
                      </button>
                      <CourseLink id={p.id} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="ex-note">💡 กดการ์ดเพื่อโหลดโจทย์เข้า Lab · กดแถบ 📖 ใต้การ์ดเพื่อไปอ่านเนื้อหาส่วนที่เกี่ยวข้องในคอร์ส · ทุกข้อ: กรอกคำตอบตัวเลข + สร้างวงจรตามโจทย์ ระบบตรวจให้ทันที และมีปุ่ม "เฉลย" พร้อมวิธีทำและวิธีทำบน Smith Chart เหมือนบทเรียน</div>
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
                    <div key={l.id} className="card-wrap">
                      <button className={`card ${state.lessonId === l.id ? 'active' : ''}`} onClick={() => dispatch({ type: 'lesson', id: l.id })}>
                        <span className="card-lvl">Level {l.level}{l.bookPriority && <em title={t("ตรงกับบท Transmission Lines ในหนังสือ")}> {t("★ หนังสือ")}</em>}</span>
                        <b>{l.title}</b>
                        <small>{l.learn}</small>
                      </button>
                      <CourseLink id={l.id} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="modal-body">
            <div className="card-grid">
              {EXAMPLES.map((ex) => (
                <div key={ex.id} className="card-wrap">
                  <button className={`card ${state.exampleId === ex.id ? 'active' : ''}`} onClick={() => dispatch({ type: 'example', id: ex.id })}>
                    <span className="card-lvl">{ex.title}</span>
                    <b>{ex.subtitle}</b>
                    <small>{ex.circuit().elements.map((e) => (e.orient === 'shunt' ? `${e.type}↓` : e.type)).join(' — ')}</small>
                  </button>
                  <CourseLink id={ex.id} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
