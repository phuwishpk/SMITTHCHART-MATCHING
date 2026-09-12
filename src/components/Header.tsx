import React from 'react';
import { useAppState, useDispatch, useT } from '../state/store';
import { findLesson, EXAMPLES } from '../engine/lessons';
import { SECTION_LINKS, sectionLabel } from '../engine/course';
import { Icon, IconName } from './Icons';

/** ปุ่มหนึ่งอันของแถบเครื่องมือ · ใช้ข้อมูลชุดเดียวกันทั้งในแถบลัดและในเมนูมุมขวา จะได้ไม่หลุดกัน */
interface ActionItem {
  id: string;
  icon: IconName;
  label: string;
  /** ป้ายสั้นสำหรับจอแคบ */
  short: string;
  title?: string;
  run: () => void;
}

/** เมนูรวมทุกคำสั่งที่มุมขวาบน · เป็นทางเดียวที่จะเรียกแถบปุ่มลัดกลับมาหลังผู้ใช้ซ่อนมันไป */
const HeaderMenu: React.FC<{ actions: ActionItem[] }> = ({ actions }) => {
  const state = useAppState();
  const dispatch = useDispatch();
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    // pointerdown ไม่ใช่ click เพราะปุ่มในเมนูต้องได้ทำงานก่อนเมนูปิด
    // และต้องดักที่ช่วง capture เพราะแคนวาสกับ palette หยุด pointerdown ไว้เองตอนลากอุปกรณ์
    // ถ้าดักช่วง bubble เมนูจะค้างเปิดเมื่อคลิกลงบนพื้นที่พวกนั้น
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="menu-wrap" ref={wrap}>
      <button className="btn menu-btn" aria-haspopup="menu" aria-expanded={open} title="เมนูรวมคำสั่งทั้งหมด"
        onClick={() => setOpen((o) => !o)}>
        <Icon name="menu" /><span className="lg">เมนู</span>
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <span className="menu-label">ภาษา / Language</span>
          <div className="seg lang-seg menu-lang" role="group">
            <button className={state.lang === 'th' ? 'on' : ''} onClick={() => dispatch({ type: 'lang', lang: 'th' })}>ไทย</button>
            <button className={state.lang === 'en' ? 'on' : ''} onClick={() => dispatch({ type: 'lang', lang: 'en' })}>English</button>
          </div>
          <div className="menu-sep" />
          {actions.map((a) => (
            <button key={a.id} role="menuitem" className="menu-item" title={a.title}
              onClick={() => { setOpen(false); a.run(); }}>
              <Icon name={a.icon} />{a.label}
            </button>
          ))}
          <div className="menu-sep" />
          <button role="menuitemcheckbox" aria-checked={state.quickBar} className="menu-item menu-toggle"
            title="ซ่อนปุ่มลัดเพื่อให้แถบหัวโล่ง · กดอีกครั้งเพื่อเรียกกลับมา"
            onClick={() => dispatch({ type: 'quickbar' })}>
            <span className={`menu-check ${state.quickBar ? 'on' : ''}`}>{state.quickBar && <Icon name="check" size={13} />}</span>
            แสดงปุ่มลัดบนแถบหัว
          </button>
        </div>
      )}
    </div>
  );
};

export const Header: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const t = useT();
  const lesson = findLesson(state.lessonId);
  const example = state.exampleId ? EXAMPLES.find((e) => e.id === state.exampleId) : undefined;
  const linkId = lesson?.id ?? state.exampleId ?? '';
  const exLink = SECTION_LINKS[linkId];
  const exLabel = sectionLabel(exLink);
  // แถบหัวขึ้นบรรทัดใหม่เมื่อจอแคบ ความสูงจึงไม่คงที่ และยังเปลี่ยนอีกเมื่อผู้ใช้ซ่อนแถบปุ่มลัด
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

  const actions: ActionItem[] = [
    { id: 'lessons', icon: 'lessons', label: 'บทเรียน (14)', short: 'บทเรียน', run: () => dispatch({ type: 'modal', modal: 'lessons' }) },
    { id: 'problems', icon: 'problems', label: 'โจทย์ Z / Y', short: 'โจทย์', run: () => dispatch({ type: 'modal', modal: 'problems' }) },
    { id: 'glossary', icon: 'glossary', label: 'ตัวย่อ', short: 'ย่อ', title: 'อธิบายตัวย่อและสัญลักษณ์ทั้งหมดที่ใช้ในเว็บ', run: () => dispatch({ type: 'modal', modal: 'glossary' }) },
    { id: 'examples', icon: 'examples', label: 'ตัวอย่าง', short: 'ตัวอย่าง', run: () => dispatch({ type: 'modal', modal: 'examples' }) },
    { id: 'reset', icon: 'reset', label: 'รีเซ็ต', short: 'ล้าง', run: () => { if (confirm(t('ล้างวงจรและเริ่มใหม่?'))) dispatch({ type: 'reset' }); } },
  ];

  return (
    <header className="header" ref={headerRef}>
      <div className="brand">
        {/* โลโก้ต่อท้ายชื่อแอปบนบรรทัดเดียวกัน · ถ้ายังไม่มีไฟล์ public/logo.png จะซ่อนรูปไว้เฉย ๆ ไม่ขึ้นรูปแตก */}
        <h1>+ SMITH CHART LAB</h1>
        <img className="brand-logo" src="logo.png" alt="SIET · KMITL" onError={(e) => { e.currentTarget.hidden = true; }} />
      </div>
      <div className="header-mid">
        <div className="seg view-seg">
          <button className={state.view === 'lab' ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: 'lab' })}>
            <Icon name="lab" />Lab
          </button>
          <button className={state.view === 'basics' ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: 'basics' })} title="เรียน Smith Chart จากพื้นฐานทีละขั้น">
            <Icon name="basics" /><span className="lg">Smith Chart พื้นฐาน</span><span className="sm">พื้นฐาน</span>
          </button>
          <button className={state.view === 'course' ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: 'course' })}>
            <Icon name="course" /><span className="lg">Antenna Impedance Matching</span><span className="sm">คอร์ส</span>
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
            {example.title}: {example.subtitle.split('(')[0].trim()}
          </span>
        )}
        {state.view === 'lab' && exLink && (
          <button className="chip course-link header-link" title={`${t("เปิดเนื้อหาในคอร์ส:")} ${exLabel}`} onClick={() => dispatch({ type: 'course_section', chapter: exLink.chapter, section: exLink.section })}>
            <Icon name="course" size={13} /><span className="lg">{t("อ่านเนื้อหา ·")} {exLabel.split(' · ')[0]}</span><span className="sm">{t("เนื้อหา")}</span>
          </button>
        )}
      </div>
      <div className="header-actions">
        {state.quickBar && (
          <div className="quick-bar">
            {/* สลับภาษาทั้งแอป ข้อความที่ยังไม่มีคำแปลจะคงเป็นภาษาไทยไว้ */}
            <div className="seg lang-seg" role="group" aria-label="ภาษา / Language">
              <button className={state.lang === 'th' ? 'on' : ''} onClick={() => dispatch({ type: 'lang', lang: 'th' })} title="ภาษาไทย">TH</button>
              <button className={state.lang === 'en' ? 'on' : ''} onClick={() => dispatch({ type: 'lang', lang: 'en' })} title="English">EN</button>
            </div>
            {actions.map((a) => (
              <button key={a.id} className="btn" title={a.title} onClick={a.run}>
                <Icon name={a.icon} /><span className="lg">{a.label}</span><span className="sm">{a.short}</span>
              </button>
            ))}
          </div>
        )}
        <HeaderMenu actions={actions} />
      </div>
    </header>
  );
};
