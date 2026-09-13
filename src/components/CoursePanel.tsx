import React, { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../engine/i18n';
import { useAppState, useDispatch, useT } from '../state/store';
import { COURSE, Figure } from '../engine/course';
import { BASICS } from '../engine/basics';
import { StepLines, Marked } from './StepLines';
import { FoldButton } from './FoldButton';
import { Narration, NarrationChapter, useNarration } from './Narration';
import { MiniPlot } from './MiniPlot';
import { SmithFigure } from './SmithFigure';
import { SmithFull } from './SmithFull';
import { CourseQuiz } from './CourseQuiz';
import { WaveFigure } from './WaveFigure';
import { ReflectionIntro } from './ReflectionIntro';
import { LinePositionIntro } from './LinePositionIntro';
import { AdmittanceIntro, ShuntAdmittanceIntro, SeriesImpedanceIntro } from './AdmittanceIntro';
import { LNetworkExplorer } from './LNetworkExplorer';
import { SkillRecap } from './SkillRecap';
import { SmithOrigin } from './SmithOrigin';

/** หัวข้อของบท 0 ที่แสดงบนจอ (แต่ละหัวข้อมีคอมโพเนนต์ของตัวเอง) ที่เหลือเก็บไว้ให้ PDF และสคริปต์เสียง */
const B0_SHOWN = new Set(['what', 'origin']);
import { SwrCircleIntro, DistanceIntro } from './SwrDistanceIntro';
import { StubReactanceIntro } from './StubReactanceIntro';
import { SingleStubWalkthrough } from './SingleStubWalkthrough';
import { FrequencyExplorer } from './FrequencyExplorer';
import { FiveMinuteIntro } from './FiveMinuteIntro';
import { CircuitSchematic } from './CircuitSchematic';
import { solveCircuit, solveSweep, sweepMaxSwr } from '../engine/solver';
import { solveLCases } from '../engine/matching';
import { buildCircuit, AntennaPoint } from '../engine/circuit';
import { fmtNum, fmtEng, C } from '../engine/complex';
import { antennaZ } from '../engine/circuit';

const LCases: React.FC<{ table: AntennaPoint[]; f0: number; Z0: number }> = ({ table, f0, Z0 }) => {
  const dispatch = useDispatch();
  const z0 = antennaZ(table, f0);
  const cases = useMemo(() => solveLCases(C(z0.re, z0.im), Z0, f0), [z0.re, z0.im, Z0, f0]);
  const build = (c: (typeof cases)[number]) =>
    buildCircuit(f0, Z0, [
      [c.spec.second.type, c.spec.second.orient, c.spec.second.type === 'inductor' ? { L: Number((c.second! * 1e9).toFixed(2)) } : { C: Number((c.second! * 1e12).toFixed(3)) }],
      [c.spec.first.type, c.spec.first.orient, c.spec.first.type === 'inductor' ? { L: Number((c.first! * 1e9).toFixed(2)) } : { C: Number((c.first! * 1e12).toFixed(3)) }],
      ['antenna', 'series', {}, table],
    ]);
  const val = (v: number | undefined, type: 'inductor' | 'capacitor') => (v === undefined ? '—' : fmtEng(v, type === 'inductor' ? 'H' : 'F', 3));
  return (
    <div className="lcases">
      <div className="lc-head">{t("โหลดที่ f₀ =")} {fmtNum(f0 / 1e6, 2)} MHz: Z = {fmtNum(z0.re, 1)} {z0.im < 0 ? '−' : '+'} j{fmtNum(Math.abs(z0.im), 1)} Ω · z = {fmtNum(z0.re / Z0, 3)} {z0.im < 0 ? '−' : '+'} j{fmtNum(Math.abs(z0.im) / Z0, 3)}</div>
      <table className="lc-table">
        <thead><tr><th>Fig. 4-1</th><th>{t("Table ในหนังสือ (โครงเดียวกัน)")}</th><th>{t("วงจร (ตัวแรกชิดโหลด)")}</th><th>{t("ตัวแรก")}</th><th>{t("ตัวที่สอง")}</th><th>{t("SWR ที่")} {[...table].sort((a, b) => a.f - b.f).map((pt) => fmtNum(pt.f / 1e6, 2)).join(' / ')} MHz</th><th></th></tr></thead>
        <tbody>
          {cases.map((c, i) => {
            const sw = c.feasible ? solveSweep(build(c)) : [];
            return (
              <tr key={c.spec.id} className={c.feasible ? '' : 'infeasible'}>
                <td>({c.spec.id})</td>
                <td>5-{5 + i}</td>
                <td>{c.spec.label}</td>
                <td className="mono">{c.feasible ? `${val(c.first, c.spec.first.type)} (${c.spec.first.orient === 'shunt' ? 'b' : 'x'} = ${fmtNum(c.xb1!, 3)})` : '—'}</td>
                <td className="mono">{c.feasible ? `${val(c.second, c.spec.second.type)} (${c.spec.second.orient === 'shunt' ? 'b' : 'x'} = ${fmtNum(c.xb2!, 3)})` : '—'}</td>
                <td className="mono">{c.feasible ? `${sw.map((p) => fmtNum(p.result.swrIn, 2)).join(' / ')} (max ${fmtNum(sweepMaxSwr(sw), 2)})` : `ทำไม่ได้: ${c.reason}`}</td>
                <td>{c.feasible && <button className="mini wide" onClick={() => { dispatch({ type: 'set_circuit', circuit: build(c), select: null }); dispatch({ type: 'swr_target', value: 2 }); dispatch({ type: 'toggle', key: 'showY', value: true }); dispatch({ type: 'mode', mode: 'free' }); dispatch({ type: 'view', view: 'lab' }); }}>Lab ▶</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const FigureView: React.FC<{ fig: Figure }> = ({ fig }) => {
  const dispatch = useDispatch();
  const t = useT();
  switch (fig.kind) {
    case 'single-stub-walkthrough':
      return <div className="cfig wide"><SingleStubWalkthrough /></div>;
    case 'stub-reactance':
      return <div className="cfig wide stub-figure"><StubReactanceIntro /></div>;
    case 'plot':
      return (
        <figure className="cfig">
          <MiniPlot title={fig.title} xLabel={fig.xLabel} yLabel={fig.yLabel} xMin={fig.xMin} xMax={fig.xMax} yMin={fig.yMin} yMax={fig.yMax} series={fig.series} xTicks={fig.xTicks} yTicks={fig.yTicks} markers={fig.markers} />
          {fig.caption && <figcaption><Marked text={fig.caption} /></figcaption>}
        </figure>
      );
    case 'smith':
      return (
        <figure className="cfig smith">
          <SmithFigure title={fig.title} points={fig.points} curves={fig.curves} swr={fig.swr} showY={fig.showY} rCircles={fig.rCircles} xCircles={fig.xCircles} gCircles={fig.gCircles} bCircles={fig.bCircles} regions={fig.regions} labels={fig.labels} />
          {fig.caption && <figcaption><Marked text={fig.caption} /></figcaption>}
        </figure>
      );
    case 'quiz':
      return (
        <figure className="cfig quiz-fig wide">
          <CourseQuiz question={fig.question} choices={fig.choices} answer={fig.answer} explain={fig.explain} hint={fig.hint} chart={fig.chart} />
        </figure>
      );
    case 'chart':
      return (
        <figure className="cfig chart wide">
          <SmithFull
            title={fig.title}
            points={fig.points}
            curves={fig.curves}
            swr={fig.swr}
            showY={fig.showY}
            scale={fig.scale}
            fine={fig.fine}
            table={fig.table}
            halves={fig.halves}
            angles={fig.angles}
            lcBar={fig.lcBar}
            glyphs={fig.glyphs}
            rays={fig.rays}
            grid={fig.grid}
            readout={fig.readout}
            rCircles={fig.rCircles}
            xCircles={fig.xCircles}
            gCircles={fig.gCircles}
            bCircles={fig.bCircles}
            labels={fig.labels}
          />
          {fig.caption && <figcaption><Marked text={fig.caption} /></figcaption>}
        </figure>
      );
    case 'circuit':
      return (
        <figure className="cfig circuit">
          <CircuitSchematic circuit={fig.circuit} result={solveCircuit(fig.circuit)} title={fig.title} maxHeight={150} />
          {fig.caption && <figcaption><Marked text={fig.caption} /></figcaption>}
        </figure>
      );
    case 'wave':
      return (
        <figure className="cfig">
          <WaveFigure title={fig.title} gammaMag={fig.gammaMag} gammaDeg={fig.gammaDeg} len={fig.len} />
          {fig.caption && <figcaption><Marked text={fig.caption} /></figcaption>}
        </figure>
      );
    case 'table':
      return (
        <figure className="cfig wide">
          <div className="cfig-title">{t(fig.title)}</div>
          <div className="ctable-wrap">
            <table className="ctable">
              <thead><tr>{fig.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{fig.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {fig.caption && <figcaption><Marked text={fig.caption} /></figcaption>}
        </figure>
      );
    case 'lcases':
      return (
        <figure className="cfig wide">
          <div className="cfig-title">{t(fig.title)}</div>
          <LCases table={fig.table} f0={fig.f0} Z0={fig.Z0} />
          {fig.caption && <figcaption><Marked text={fig.caption} /></figcaption>}
        </figure>
      );
    case 'lab':
      return (
        <div className="clab">
          <button
            className="btn primary small"
            onClick={() => {
              dispatch({ type: 'set_circuit', circuit: fig.circuit(), select: null });
              dispatch({ type: 'swr_target', value: fig.swrTarget === undefined ? null : fig.swrTarget });
              dispatch({ type: 'toggle', key: 'showSweep', value: true });
              if (fig.showY !== undefined) dispatch({ type: 'toggle', key: 'showY', value: fig.showY });
              dispatch({ type: 'mode', mode: 'free' });
              dispatch({ type: 'explain_step', i: 0 });
              dispatch({ type: 'view', view: 'lab' });
            }}
          >
            🔬 {t(fig.label)}
          </button>
          {fig.note && <span className="clab-note">{t(fig.note)}</span>}
        </div>
      );
  }
};

export const CoursePanel: React.FC<{ course?: 'caron' | 'basics' }> = ({ course = 'caron' }) => {
  const state = useAppState();
  const t = useT();
  const dispatch = useDispatch();
  const basics = course === 'basics';
  const chapters = basics ? BASICS : COURSE;
  const wantChapter = basics ? state.basicsChapter : state.courseChapter;
  const wantSection = basics ? state.basicsSection : state.courseSection;
  const goChapter = (id: string) => dispatch(basics ? { type: 'basics_chapter', id } : { type: 'course_chapter', id });
  const seen = () => dispatch(basics ? { type: 'basics_section_seen' } : { type: 'course_section_seen' });
  const chapter = chapters.find((c) => c.id === wantChapter) ?? chapters[0];
  // The five-minute introduction is a single guided experience. Its older
  // reference sections remain in the course data for compatibility, but are
  // taught later in the chapters where each concept is actually used.
  const sections = useMemo(
    () => (basics && chapter.id === 'b0' ? chapter.sections.filter((s) => B0_SHOWN.has(s.id)) : chapter.sections),
    [basics, chapter],
  );
  const bodyRef = useRef<HTMLDivElement>(null);
  const narration = useNarration();
  // Wide layouts scroll inside .course-body; stacked (≤1080px) layouts scroll the page.
  // Scrolling the wrong one silently does nothing, so pick whichever actually scrolls.
  const scrollerOf = (box: HTMLElement): { el: HTMLElement; page: boolean } =>
    box.scrollHeight > box.clientHeight + 4
      ? { el: box, page: false }
      : { el: (document.scrollingElement as HTMLElement) ?? document.documentElement, page: true };
  /** ความสูงรวมของแถบที่ตรึงอยู่บนสุดของจอ เวลาหน้าเว็บเป็นตัวเลื่อน ต้องเผื่อระยะนี้ ไม่งั้นหัวข้อจะไปจมอยู่ใต้แถบ */
  const stickyTop = () => {
    const h = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return 0;
      const cs = getComputedStyle(el);
      return cs.display === 'none' || cs.position !== 'sticky' ? 0 : el.getBoundingClientRect().height;
    };
    return h('.header') + h('.course-here');
  };
  const scrollToSection = (secId: string, opts: { smooth?: boolean; highlight?: boolean } = {}) => {
    const box = bodyRef.current;
    const el = box?.querySelector(`#sec-${CSS.escape(secId)}`) as HTMLElement | null;
    if (!box || !el) return false;
    const sc = scrollerOf(box);
    const top = sc.page
      ? el.getBoundingClientRect().top + sc.el.scrollTop - stickyTop() - 10
      : el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8;
    sc.el.scrollTo({ top: Math.max(0, top), behavior: opts.smooth === false ? 'auto' : 'smooth' });
    if (opts.highlight !== false) {
      el.classList.remove('target');
      void el.offsetWidth;
      el.classList.add('target');
      window.setTimeout(() => el.classList.remove('target'), 2400);
    }
    return true;
  };
  /**
   * เลื่อนไปหาหัวข้อ แล้วเลื่อนซ้ำจนหน้าหยุดขยับจริง
   * กราฟกับสมการปรับขนาดหลังวาดเสร็จ ตำแหน่งหัวข้อจึงยังเลื่อนได้อีกหลังเลื่อนครั้งแรก
   * คืนฟังก์ชันสำหรับยกเลิก
   */
  const settleScroll = (id: string, onDone?: () => void) => {
    let timer = 0;
    let cancelled = false;
    let lastTop = Number.NaN;
    let stable = 0;
    const absoluteTop = () => {
      const box = bodyRef.current;
      const el = box?.querySelector(`#sec-${CSS.escape(id)}`) as HTMLElement | null;
      if (!box || !el) return Number.NaN;
      return Math.round(el.getBoundingClientRect().top + scrollerOf(box).el.scrollTop);
    };
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('wheel', finish);
      window.removeEventListener('touchmove', finish);
      onDone?.();
    };
    const step = (i: number) => {
      if (cancelled) return;
      const top = absoluteTop();
      stable = Number.isFinite(top) && top === lastTop ? stable + 1 : 0;
      lastTop = top;
      scrollToSection(id, { smooth: i > 0, highlight: i === 0 });
      // ต้องผ่านรอบที่ 6 (~1.2 วินาที) ก่อนเสมอ เพราะกราฟใหญ่ปรับขนาดช้ากว่านั้น
      // ถ้าดูแค่ว่า "นิ่งสองรอบ" จะหยุดตั้งแต่ 300 มิลลิวินาที แล้วโดนเลย์เอาต์ขยับทีหลัง
      if (i < 6 || (stable < 2 && i < 12)) timer = window.setTimeout(() => step(i + 1), i < 4 ? 140 : 320);
      else finish();
    };
    step(0);
    // ผู้อ่านเลื่อนเองเมื่อไร ให้เลิกตามทันที จะได้ไม่โดนกระชากกลับ
    window.addEventListener('wheel', finish, { passive: true });
    window.addEventListener('touchmove', finish, { passive: true });
    return finish;
  };
  // scroll to the top only when the chapter itself changes — clearing a pending
  // section jump must not undo the jump we just made
  const lastChapter = useRef<string | null>(null);
  useEffect(() => {
    if (lastChapter.current === chapter.id) return;
    lastChapter.current = chapter.id;
    if (wantSection) return;
    const box = bodyRef.current;
    if (box) scrollerOf(box).el.scrollTo({ top: 0 });
  }, [chapter.id, wantSection]);
  // Jump to a section requested from the Lab (or a ?sec= deep link). Figures and KaTeX
  // change the layout after the first paint, so re-run the scroll until it settles.
  useEffect(() => {
    if (!wantSection) return;
    const id = wantSection;
    return settleScroll(id, seen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantSection, chapter.id]);
  // ---- which section is the reader looking at? the sidebar follows it ----
  const [activeSec, setActiveSec] = useState<string>(sections[0]?.id ?? '');
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => { setActiveSec(sections[0]?.id ?? ''); }, [chapter.id, sections]);
  useEffect(() => {
    const box = bodyRef.current;
    if (!box) return;
    let raf = 0;
    const pick = () => {
      raf = 0;
      const sc = scrollerOf(box);
      const top = sc.page ? 0 : box.getBoundingClientRect().top;
      const viewH = sc.page ? window.innerHeight : box.clientHeight;
      // the section whose heading is highest but still above the reading line
      const line = top + (sc.page ? stickyTop() + 24 : Math.min(160, viewH * 0.3));
      let best = sections[0]?.id ?? '';
      for (const sec of sections) {
        const el = box.querySelector(`#sec-${CSS.escape(sec.id)}`) as HTMLElement | null;
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) best = sec.id;
      }
      // at the very bottom the last section is the one being read
      const atEnd = sc.el.scrollTop + viewH >= sc.el.scrollHeight - 4 && sc.el.scrollTop > 4;
      if (atEnd && sections.length) best = sections[sections.length - 1].id;
      setActiveSec((prev) => (prev === best ? prev : best));
    };
    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(pick); };
    box.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    const settle = [80, 400, 900].map((d) => window.setTimeout(pick, d));
    return () => {
      box.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      settle.forEach(clearTimeout);
    };
  }, [chapter.id, sections]);
  // keep the active entry visible inside the sidebar's own scroller
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !activeSec) return;
    const li = nav.querySelector(`[data-sec="${CSS.escape(activeSec)}"]`) as HTMLElement | null;
    if (!li) return;
    const nr = nav.getBoundingClientRect(), lr = li.getBoundingClientRect();
    if (lr.top < nr.top + 4) nav.scrollTo({ top: nav.scrollTop + (lr.top - nr.top) - 12, behavior: 'smooth' });
    else if (lr.bottom > nr.bottom - 4) nav.scrollTo({ top: nav.scrollTop + (lr.bottom - nr.bottom) + 12, behavior: 'smooth' });
  }, [activeSec]);
  const activeIndex = sections.findIndex((x) => x.id === activeSec);
  const progressPct = sections.length > 1
    ? Math.round(((Math.max(activeIndex, 0)) / (sections.length - 1)) * 100)
    : 100;
  const idx = chapters.findIndex((c) => c.id === chapter.id);
  const cancelJump = useRef<(() => void) | null>(null);
  const jump = (secId: string) => {
    setActiveSec(secId);
    setNavOpen(false);
    cancelJump.current?.();
    cancelJump.current = settleScroll(secId);
  };
  // a section of another chapter: the reducer switches chapter and the jump effect scrolls to it
  const jumpAcross = (chId: string, secId: string) => {
    if (chId === chapter.id) { jump(secId); return; }
    dispatch(basics
      ? { type: 'basics_section', chapter: chId, section: secId }
      : { type: 'course_section', chapter: chId, section: secId });
  };
  return (
    <div className={`course ${navOpen ? 'nav-open' : ''}`}>
      {/* stacked layouts scroll the nav away, so a sticky bar keeps the reader's place visible */}
      <div className="course-here">
        <button className="course-here-btn" onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen}>
          <span className="here-ch">{chapter.num ? `${basics ? t('บทที่') : 'Ch.'} ${chapter.num}` : t('บทนำ')}</span>
          <span className="here-sec">
            {activeIndex >= 0 && chapter.num ? `${chapter.num}.${activeIndex + 1} ` : ''}
            {t(sections[activeIndex >= 0 ? activeIndex : 0]?.title ?? chapter.title)}
          </span>
          <span className="here-caret">{navOpen ? '▲' : '▼'}</span>
        </button>
        <div className="course-progress"><i style={{ width: `${progressPct}%` }} /></div>
      </div>
      <aside className="course-nav" ref={navRef}>
        <div className="panel-head"><span className="panel-title">{t(basics ? 'SMITH CHART พื้นฐาน' : 'ANTENNA IMPEDANCE MATCHING')}</span><FoldButton panel="nav" /></div>
        <div className="course-book">{basics
          ? t('เรียนจากศูนย์: ทำไมต้องมี Smith Chart · อ่านกราฟ · วงกลม SWR · แอดมิตแตนซ์ · สตับ · หม้อแปลง λ/4 · ผลของความถี่ — ทุกตัวเลขและทุกภาพคำนวณสดโดยแอป')
          : <>W. N. Caron — <em>Antenna Impedance Matching</em> {t("(ARRL) · เนื้อหาตามส่วนที่มีในไฟล์: บทนำ, Ch. I–V, Ch. VI Ex. 1–6")}</>}</div>
        <ol className="course-toc">
          {chapters.map((c) => (
            <li key={c.id} className={c.id === chapter.id ? 'active' : ''}>
              <button onClick={() => goChapter(c.id)}>
                <span className="cnum">{c.num || '·'}</span>
                <span className="ctitle"><b>{t(c.title)}</b><small>{t(c.titleTh)}</small></span>
              </button>
              {c.id === chapter.id && (
                <ul className="course-sections">
                  {(basics && c.id === 'b0' ? c.sections.filter((x) => B0_SHOWN.has(x.id)) : c.sections).map((s, si) => (
                    <li key={s.id} data-sec={s.id} className={s.id === activeSec ? 'active' : ''}>
                      <button onClick={() => jumpAcross(c.id, s.id)}>
                        {c.num && <span className="snum">{c.num}.{si + 1}</span>}
                        <span className="stitle">{t(s.title)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
        <div className="course-tip">ปุ่ม 🔬 ในเนื้อหาจะโหลดวงจรของตัวอย่างเข้า Lab (พร้อมเป้า SWR) กด "🔬 Lab" ด้านบนเพื่อกลับ</div>
      </aside>
      <div className="course-body" ref={bodyRef}>
        {state.collapsed.nav && (
          <button className="btn small course-unfold" onClick={() => dispatch({ type: 'collapse', panel: 'nav', value: false })} title={t("กางสารบัญกลับมา")}>
            ☰ {t("สารบัญ")}
          </button>
        )}
        <header className="course-header">
          <span className="chip">{chapter.num ? (basics ? `${t('บทที่')} ${chapter.num}` : `Chapter ${chapter.num}`) : t('บทนำ')}</span>
          <h2>{t(chapter.title)}</h2>
          <div className="course-th">{t(chapter.titleTh)}</div>
          <p className="course-intro">{t(chapter.intro)}</p>
          {!basics && <NarrationChapter manifest={narration} chapter={chapter.id} sections={sections} />}
        </header>
        {basics && chapter.id === 'b10' && <FrequencyExplorer />}
        {sections.map((sec, si) => (
          <section key={sec.id} id={`sec-${sec.id}`} className="course-section">
            <h3>{chapter.num && <span className="secnum">{chapter.num}.{si + 1}</span>} {t(sec.title)}</h3>
            {!basics && <Narration manifest={narration} chapter={chapter.id} section={sec.id} />}
            {basics && chapter.id === 'b0' && sec.id === 'what' && <FiveMinuteIntro />}
            {basics && chapter.id === 'b0' && sec.id === 'origin' && <SmithOrigin />}
            {basics && chapter.id === 'b1' && sec.id === 'mismatch' && <ReflectionIntro />}
            {basics && chapter.id === 'b1' && sec.id === 'along' && <LinePositionIntro />}
            {basics && chapter.id === 'b1' && sec.id === 'why' && <LinePositionIntro findReal />}
            {basics && chapter.id === 'b4' && sec.id === 'circle' && <SwrCircleIntro />}
            {basics && chapter.id === 'b5' && sec.id === 'halflambda' && <DistanceIntro />}
            {basics && chapter.id === 'b6' && sec.id === 'y' && <AdmittanceIntro />}
            {!basics && chapter.id === 'ch4' && sec.id === 'lnet' && <LNetworkExplorer />}
            {basics && chapter.id === 'b11' && sec.id === 'recap' && <SkillRecap />}
            {basics && chapter.id === 'b6' && sec.id === 'move' && <ShuntAdmittanceIntro />}
            {basics && chapter.id === 'b6' && sec.id === 'move' && <SeriesImpedanceIntro />}
            {!(basics && (chapter.id === 'b0' || sec.id === 'ex78')) && <StepLines lines={sec.lines} />}
            {!(basics && chapter.id === 'b0') && sec.figures && sec.figures.length > 0 && (
              <div className="cfigs">
                {sec.figures.map((fg, i) => (
                  <FigureView key={i} fig={fg} />
                ))}
              </div>
            )}
            {basics && sec.id === 'ex78' && <details className="stub-reference"><summary>{t("เปิดวิธีคำนวณฉบับเต็มและเทียบค่ากับหนังสือ")}</summary><StepLines lines={sec.lines} /></details>}
          </section>
        ))}
        <div className="course-footer">
          {idx > 0 && <button className="btn" onClick={() => goChapter(chapters[idx - 1].id)}>◀ {basics ? t('บทที่') : 'Chapter'} {chapters[idx - 1].num}</button>}
          <span className="spacer" />
          {idx < chapters.length - 1 && <button className="btn primary" onClick={() => goChapter(chapters[idx + 1].id)}>{basics ? t('บทที่') : 'Chapter'} {chapters[idx + 1].num} ▶</button>}
        </div>
      </div>
    </div>
  );
};
