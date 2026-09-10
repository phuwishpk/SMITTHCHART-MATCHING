import React from 'react';
import { ELEMENT_SPECS, ElementType, PALETTE_ORDER } from '../engine/circuit';
import { useAppState, useDispatch } from '../state/store';
import { MaxButton } from './MaxButton';
import { tip } from '../engine/glossary';

const GLOSSARY_TIP: Partial<Record<string, string>> = {
  resistor: tip('R'),
  inductor: tip('XL'),
  capacitor: tip('XC'),
  tline: tip('TL'),
  qwt: tip('QWT'),
  load: tip('ZLblock'),
  antenna: tip('ANT'),
  stub_short: tip('Sstub'),
  stub_open: tip('Ostub'),
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
    <div className="palette">
      <div className="panel-head">
        <span className="panel-title">COMPONENTS</span>
        <MaxButton panel="palette" />
      </div>
      <div className="palette-list">
        <div className={`pal-item source ${state.selectedId === 'source' ? 'selected' : ''}`} onClick={() => dispatch({ type: 'select', id: 'source' })} title="แหล่งจ่าย RF (มีอยู่แล้ว) คลิกเพื่อตั้ง f และ Z₀">
          <span className="pal-sym" style={{ background: '#475569' }}>~</span>
          <span className="pal-text">
            <b>RF Source</b>
            <small>f, Z₀ (มีอยู่แล้ว)</small>
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
              title={`${spec.symbol} — ${spec.nameTh}\n${spec.description}${GLOSSARY_TIP[t] ? `\n\n${GLOSSARY_TIP[t]}` : ''}\n\nลากไปวางบน Canvas หรือคลิกเพื่อเพิ่มท้ายวงจร${both ? ' (ปุ่ม ⏚ = เพิ่มแบบขนาน)' : ''}`}
            >
              <span className="pal-sym" style={{ background: spec.color }}>{spec.symbol}</span>
              <span className="pal-text">
                <b>{spec.name}</b>
              </span>
              {both && (
                <button className="mini" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'add', elType: t, index: n, orient: 'shunt' }); }} title="เพิ่มแบบขนานลงกราวด์ท้ายวงจร">
                  ⏚
                </button>
              )}
            </div>
          );
        })}
        <div className="pal-item ghost" title="กราวด์จะถูกต่อให้อัตโนมัติเมื่อวางอุปกรณ์ในช่อง 'ขนาน' ใต้สาย">
          <span className="pal-sym" style={{ background: '#94a3b8' }}>⏚</span>
          <span className="pal-text">
            <b>Ground</b>
            <small>อัตโนมัติเมื่อวางแบบขนาน</small>
          </span>
        </div>
      </div>
      <div className="palette-tip">
        ลากไปวาง <em>บนสาย</em> = อนุกรม · <em>ใต้สาย ⏚</em> = ขนานลงกราวด์ · คลิกการ์ด = เพิ่มท้ายวงจร
        <button className="chip glossary-chip" onClick={() => dispatch({ type: 'modal', modal: 'glossary' })}>📗 ตัวย่อทั้งหมด</button>
      </div>
    </div>
  );
};
