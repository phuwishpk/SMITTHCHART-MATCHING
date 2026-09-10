import React, { useMemo, useState } from 'react';
import { GLOSSARY, GROUP_LABEL, GROUP_ORDER, GlossaryEntry, searchGlossary, SYMBOLS_SECTION } from '../engine/glossary';
import { sectionLabel } from '../engine/course';
import { useDispatch } from '../state/store';
import { Tex } from './Tex';

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
