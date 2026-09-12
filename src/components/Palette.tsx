import React from 'react';
import { t as tr } from '../engine/i18n';
import { ELEMENT_SPECS, ElementType, PALETTE_ORDER } from '../engine/circuit';
import { useAppState, useDispatch } from '../state/store';
import { MaxButton } from './MaxButton';
import { FoldButton } from './FoldButton';
import { tip } from '../engine/glossary';

/** เก็บเป็น id ไม่ใช่ข้อความ เพราะ tip() ต้องถูกเรียกตอนเรนเดอร์ จึงจะได้ภาษาที่ผู้ใช้เลือก */
const GLOSSARY_TIP: Partial<Record<string, string>> = {
  resistor: 'R',
  inductor: 'XL',
  capacitor: 'XC',
  tline: 'TL',
  qwt: 'QWT',
  load: 'ZLblock',
  antenna: 'ANT',
  stub_short: 'Sstub',
  stub_open: 'Ostub',
};

export const Palette: React.FC = () => {
  const dispatch = useDispatch();
  const state = useAppState();
  const n = state.circuit.elements.length;

  const onDragStart = (e: React.DragEvent, t: ElementType) => {
    e.dataTransfer.setData('text/plain', t);
    e.dataTransfer.effectAllowed = 'copy';
    dispatch({ type: 'dragging', value: t });
  };
  const onDragEnd = () => dispatch({ type: 'dragging', value: null });

  return (
    <div className={`palette ${state.collapsed.palette ? 'folded' : ''}`}>
      <div className="panel-head">
        <span className="panel-title">COMPONENTS</span>
        <FoldButton panel="palette" />
        <MaxButton panel="palette" />
      </div>
      <div className="palette-list">
        <div className={`pal-item source ${state.selectedId === 'source' ? 'selected' : ''}`} onClick={() => dispatch({ type: 'select', id: 'source' })} title={tr("แหล่งจ่าย RF (มีอยู่แล้ว) คลิกเพื่อตั้ง f และ Z₀")}>
          <span className="pal-sym" style={{ background: '#475569' }}>~</span>
          <span className="pal-text">
            <b>RF Source</b>
            <small>{tr("f, Z₀ (มีอยู่แล้ว)")}</small>
          </span>
        </div>
        {PALETTE_ORDER.map((t) => {
          const spec = ELEMENT_SPECS[t];
          const both = spec.allowed.length === 2;
          return (
            <div
              key={t}
              className="pal-item"
              draggable
              onDragStart={(e) => onDragStart(e, t)}
              onDragEnd={onDragEnd}
              onClick={() => dispatch({ type: 'add', elType: t, index: n, orient: spec.allowed.includes('series') ? 'series' : 'shunt' })}
              title={`${spec.symbol} — ${tr(spec.nameTh)}\n${tr(spec.description)}${GLOSSARY_TIP[t] ? `\n\n${tip(GLOSSARY_TIP[t])}` : ''}\n\n${tr('ลากไปวางบน Canvas หรือคลิกเพื่อเพิ่มท้ายวงจร')}${both ? ` ${tr('(ปุ่ม ⏚ = เพิ่มแบบขนาน)')}` : ''}`}
            >
              <span className="pal-sym" style={{ background: spec.color }}>{spec.symbol}</span>
              <span className="pal-text">
                <b>{spec.name}</b>
              </span>
              {both && (
                <button className="mini" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'add', elType: t, index: n, orient: 'shunt' }); }} title={tr("เพิ่มแบบขนานลงกราวด์ท้ายวงจร")}>
                  ⏚
                </button>
              )}
            </div>
          );
        })}
        <div className="pal-item ghost" title={tr("กราวด์จะถูกต่อให้อัตโนมัติเมื่อวางอุปกรณ์ในช่อง 'ขนาน' ใต้สาย")}>
          <span className="pal-sym" style={{ background: '#94a3b8' }}>⏚</span>
          <span className="pal-text">
            <b>Ground</b>
            <small>{tr("อัตโนมัติเมื่อวางแบบขนาน")}</small>
          </span>
        </div>
      </div>
      <div className="palette-tip">
        {tr("ลากไปวาง")} <em>{tr("บนสาย")}</em> {tr("= อนุกรม ·")} <em>{tr("ใต้สาย ⏚")}</em> {tr("= ขนานลงกราวด์ · คลิกการ์ด = เพิ่มท้ายวงจร")}
        <button className="chip glossary-chip" onClick={() => dispatch({ type: 'modal', modal: 'glossary' })}>{tr("📗 ตัวย่อทั้งหมด")}</button>
      </div>
    </div>
  );
};
