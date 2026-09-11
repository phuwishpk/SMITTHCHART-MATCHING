import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GLOSSARY, GROUP_LABEL, GROUP_ORDER, GlossaryEntry, GlossaryFigure, searchGlossary, SYMBOLS_SECTION } from '../engine/glossary';
import { sectionLabel } from '../engine/course';
import { solveCircuit } from '../engine/solver';
import { useDispatch } from '../state/store';
import { Tex } from './Tex';
import { SmithFigure } from './SmithFigure';
import { MiniPlot } from './MiniPlot';
import { WaveFigure } from './WaveFigure';
import { CircuitSchematic } from './CircuitSchematic';

const FigureBody: React.FC<{ fig: GlossaryFigure }> = ({ fig }) => {
  switch (fig.kind) {
    case 'smith':
      return (
        <SmithFigure points={fig.points} curves={fig.curves} swr={fig.swr} showY={fig.showY}
          rCircles={fig.rCircles} xCircles={fig.xCircles} gCircles={fig.gCircles} bCircles={fig.bCircles}
          regions={fig.regions} labels={fig.labels} />
      );
    case 'wave':
      return <WaveFigure gammaMag={fig.gammaMag} gammaDeg={fig.gammaDeg} len={fig.len} />;
    case 'plot':
      return (
        <MiniPlot xLabel={fig.xLabel} yLabel={fig.yLabel} xMin={fig.xMin} xMax={fig.xMax} yMin={fig.yMin} yMax={fig.yMax}
          series={fig.series} xTicks={fig.xTicks} yTicks={fig.yTicks} markers={fig.markers} />
      );
    case 'circuit': {
      const circuit = fig.circuit();
      return <CircuitSchematic circuit={circuit} result={solveCircuit(circuit)} maxHeight={120} />;
    }
  }
};

/**
 * The dialog lists every entry at once, so drawing forty charts up front would make it
 * crawl on a phone. Each picture mounts only once it is close to the viewport, and stays
 * mounted afterwards; the placeholder keeps the row from jumping when it appears.
 */
const Figure: React.FC<{ fig: GlossaryFigure }> = ({ fig }) => {
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <div className="gl-fig" ref={box}>
      {shown ? <FigureBody fig={fig} /> : <div className="gl-fig-wait" />}
      <div className="gl-fig-cap">{fig.caption}</div>
    </div>
  );
};

const jumpTo = (id: string) => {
  const el = document.getElementById(`gl-${id}`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  window.setTimeout(() => el.classList.remove('flash'), 1800);
};

const Row: React.FC<{ e: GlossaryEntry; byId: Map<string, GlossaryEntry> }> = ({ e, byId }) => {
  const dispatch = useDispatch();
  const label = sectionLabel(e.link);
  return (
    <div className="gl-row" id={`gl-${e.id}`}>
      <div className="gl-sym">{e.tex ? <Tex tex={e.tex} /> : e.sym}</div>
      <div className="gl-body">
        <div className="gl-name">
          <b>{e.nameTh}</b>
          <span className="gl-en">{e.name}</span>
          {e.unit && <span className="gl-unit">หน่วย {e.unit}</span>}
        </div>
        <div className="gl-short">{e.short}</div>
        {e.plain && <div className="gl-plain">{e.plain}</div>}
        {e.formula && <div className="gl-formula"><Tex tex={e.formula} block /></div>}
        {e.read && <div className="gl-line read"><span className="gl-tag">อ่านว่า / ดูตรงไหน</span>{e.read}</div>}
        {e.example && <div className="gl-line example"><span className="gl-tag">ตัวอย่าง</span>{e.example}</div>}
        {e.confuse && <div className="gl-line confuse"><span className="gl-tag">อย่าสับสนกับ</span>{e.confuse}</div>}
        {e.fig && <Figure fig={e.fig} />}
        {e.detail?.map((d, i) => (
          <div key={i} className="gl-detail">· {d}</div>
        ))}
        <div className="gl-foot">
          {e.seeAlso?.filter((id) => byId.has(id)).map((id) => (
            <button key={id} className="chip gl-see" onClick={() => jumpTo(id)}>
              {byId.get(id)!.sym} · {byId.get(id)!.nameTh}
            </button>
          ))}
          {e.link && label && (
            <button className="gl-link" onClick={() => dispatch({ type: 'course_section', chapter: e.link!.chapter, section: e.link!.section })}>
              📖 อ่านเนื้อหา: {label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The whole symbol set as one table: what it looks like, how it is said out loud, what it stands
 * for, and its unit. Meant to be read straight through before the detailed entries below, and it
 * narrows with the search box like everything else. A row jumps to the full entry.
 */
const QuickTable: React.FC<{ entries: GlossaryEntry[] }> = ({ entries }) => {
  const groups = GROUP_ORDER.map((g) => ({ g, items: entries.filter((e) => e.group === g) })).filter((x) => x.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <details className="gl-quick" open>
      <summary>📋 ตารางตัวแปรทั้งหมด — แต่ละตัวอ่านว่าอะไร และแทนอะไร ({entries.length} ตัว)</summary>
      <div className="gl-quick-scroll">
        <table className="gl-quick-table">
          <thead>
            <tr><th>สัญลักษณ์</th><th>อ่านว่า</th><th>แทนอะไร</th><th>หน่วย</th></tr>
          </thead>
          <tbody>
            {groups.map(({ g, items }) => (
              <React.Fragment key={g}>
                <tr className="gl-quick-group"><td colSpan={4}>{GROUP_LABEL[g]}</td></tr>
                {items.map((e) => (
                  <tr key={e.id} onClick={() => jumpTo(e.id)} title="กดเพื่อไปที่คำอธิบายเต็ม">
                    <td className="gl-quick-sym">{e.tex ? <Tex tex={e.tex} /> : e.sym}</td>
                    <td className="gl-quick-say">{e.say ?? '—'}</td>
                    <td>{e.nameTh}<span className="gl-quick-en">{e.name}</span></td>
                    <td className="gl-quick-unit">{e.unit ?? '—'}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
};

export const GlossaryPanel: React.FC = () => {
  const dispatch = useDispatch();
  const [q, setQ] = useState('');
  const found = useMemo(() => searchGlossary(q), [q]);
  const byId = useMemo(() => new Map(GLOSSARY.map((e) => [e.id, e])), []);
  const groups = GROUP_ORDER.map((g) => ({ g, items: found.filter((e) => e.group === g) })).filter((x) => x.items.length > 0);
  return (
    <div className="modal-body glossary">
      <div className="gl-search">
        <input autoFocus type="search" value={q} placeholder="ค้นหาสัญลักษณ์ เช่น Γ, SWR, b, βl, VF, stub…" onChange={(ev) => setQ(ev.target.value)} />
        <span className="muted">{found.length} / {GLOSSARY.length} รายการ</span>
        {q && <button className="mini wide" onClick={() => setQ('')}>ล้าง</button>}
        <button className="chip course-link" onClick={() => dispatch({ type: 'course_section', chapter: SYMBOLS_SECTION.chapter, section: SYMBOLS_SECTION.section })}>
          📖 ดูในคอร์ส
        </button>
      </div>
      <QuickTable entries={found} />
      {groups.length === 0 && <div className="gl-empty">ไม่พบสัญลักษณ์ที่ค้นหา ลองพิมพ์เป็นภาษาอังกฤษ เช่น admittance หรือ stub</div>}
      {groups.map(({ g, items }) => (
        <div key={g} className="gl-group">
          <h3>{GROUP_LABEL[g]}</h3>
          <div className="gl-list">
            {items.map((e) => (
              <Row key={e.id} e={e} byId={byId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
