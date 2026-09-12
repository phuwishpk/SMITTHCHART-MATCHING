import React from 'react';
import { useAppState, useDispatch, useT } from '../state/store';
import { findLesson, EXAMPLES } from '../engine/lessons';
import { SECTION_LINKS, sectionLabel } from '../engine/course';

export const Header: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const t = useT();
  const lesson = findLesson(state.lessonId);
  const example = state.exampleId ? EXAMPLES.find((e) => e.id === state.exampleId) : undefined;
  const linkId = lesson?.id ?? state.exampleId ?? '';
  const exLink = SECTION_LINKS[linkId];
  const exLabel = sectionLabel(exLink);
  // แถบหัวขึ้นบรรทัดใหม่เมื่อจอแคบ ความสูงจึงไม่คงที่ (55px บนจอกว้าง แต่ 119–169px บนมือถือ/แท็บเล็ต)
  // ของที่ตรึงไว้ใต้แถบหัว เช่น แถบสารบัญของคอร์ส ต้องรู้ความสูงจริง ไม่งั้นจะเลื่อนไปซ่อนอยู่ใต้มัน
  const headerRef = React.useRef<HTMLElement>(null);
  React.useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty('--header-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <header className="header" ref={headerRef}>
      <div className="brand">
        <span className="logo">◎</span>
        <div>
          <h1>RF + SMITH CHART LAB</h1>
          <p>Circuit → X_L / X_C → Z_L → z_L → Smith Chart → SWR → Matching</p>
        </div>
      </div>
      <div className="header-mid">
        <div className="seg view-seg">
          <button className={state.view === 'lab' ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: 'lab' })}>🔬 Lab</button>
          <button className={state.view === 'basics' ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: 'basics' })} title={t("เรียน Smith Chart จากพื้นฐานทีละขั้น")}>
            📐 <span className="lg">{t("Smith Chart พื้นฐาน")}</span><span className="sm">{t("พื้นฐาน")}</span>
          </button>
          <button className={state.view === 'course' ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: 'course' })}>
            📖 <span className="lg">Antenna Impedance Matching</span><span className="sm">{t("คอร์ส")}</span>
          </button>
        </div>
        <div className="seg">
          <button className={state.mode === 'guided' ? 'on' : ''} onClick={() => dispatch({ type: 'mode', mode: 'guided' })}>
            <span className="lg">Guided Lab</span><span className="sm">Guided</span>
          </button>
          <button className={state.mode === 'free' ? 'on' : ''} onClick={() => dispatch({ type: 'mode', mode: 'free' })}>
            <span className="lg">Free Circuit Builder</span><span className="sm">Free</span>
          </button>
        </div>
        {lesson && state.mode === 'guided' && (
          <span className="lesson-pill">
            {lesson.kind === 'problem' ? `โจทย์ ${lesson.title}` : `Level ${lesson.level}: ${lesson.title}`}
          </span>
        )}
        {!lesson && example && (
          <span className="lesson-pill example">
            🧪 {example.title}: {example.subtitle.split('(')[0].trim()}
          </span>
        )}
        {state.view === 'lab' && exLink && (
          <button className="chip course-link header-link" title={`เปิดเนื้อหาในคอร์ส: ${exLabel}`} onClick={() => dispatch({ type: 'course_section', chapter: exLink.chapter, section: exLink.section })}>
            📖 <span className="lg">{t("อ่านเนื้อหา ·")} {exLabel.split(' · ')[0]}</span><span className="sm">{t("เนื้อหา")}</span>
          </button>
        )}
      </div>
      <div className="header-actions">
        {/* สลับภาษาทั้งแอป ข้อความที่ยังไม่มีคำแปลจะคงเป็นภาษาไทยไว้ */}
        <div className="seg lang-seg" role="group" aria-label={t("ภาษา / Language")}>
          <button className={state.lang === 'th' ? 'on' : ''} onClick={() => dispatch({ type: 'lang', lang: 'th' })} title={t("ภาษาไทย")}>TH</button>
          <button className={state.lang === 'en' ? 'on' : ''} onClick={() => dispatch({ type: 'lang', lang: 'en' })} title="English">EN</button>
        </div>
        <button className="btn" onClick={() => dispatch({ type: 'modal', modal: 'lessons' })}>
          📚 <span className="lg">{t("บทเรียน (14)")}</span><span className="sm">{t("บทเรียน")}</span>
        </button>
        <button className="btn" onClick={() => dispatch({ type: 'modal', modal: 'problems' })}>
          📝 <span className="lg">{t("โจทย์ Z / Y")}</span><span className="sm">{t("โจทย์")}</span>
        </button>
        <button className="btn" title={t("อธิบายตัวย่อและสัญลักษณ์ทั้งหมดที่ใช้ในเว็บ")} onClick={() => dispatch({ type: 'modal', modal: 'glossary' })}>
          📗 <span className="lg">{t("ตัวย่อ")}</span><span className="sm">{t("ย่อ")}</span>
        </button>
        <button className="btn" onClick={() => dispatch({ type: 'modal', modal: 'examples' })}>
          🧪 <span className="lg">{t("ตัวอย่าง")}</span><span className="sm">{t("ตัวอย่าง")}</span>
        </button>
        <button className="btn ghost" onClick={() => { if (confirm(t('ล้างวงจรและเริ่มใหม่?'))) dispatch({ type: 'reset' }); }}>
          ↺ <span className="lg">{t("รีเซ็ต")}</span><span className="sm">{t("ล้าง")}</span>
        </button>
      </div>
    </header>
  );
};
