import React from 'react';
import { t } from '../engine/i18n';

type Axis = 'left' | 'right' | 'palette';

/** ตัวแปร CSS ที่แต่ละที่จับเขียน · ค่าเริ่มต้นอยู่ใน styles.css ถ้าไม่มีค่าผู้ใช้ */
const VAR: Record<Axis, string> = { left: '--left-user', right: '--right-user', palette: '--palette-h' };
const LIMIT: Record<Axis, [number, number]> = { left: [150, 520], right: [320, 900], palette: [120, 640] };
/** แผงที่ที่จับตัวนั้นคุมขนาดอยู่ ใช้วัดขนาดปัจจุบันก่อนเริ่มลาก */
const PANEL: Record<Axis, string> = { left: '.col-left', right: '.col-right', palette: '.palette' };
const KEY = (axis: Axis) => `lab.split.${axis}`;

const read = (axis: Axis): number | null => {
  try {
    const v = Number(localStorage.getItem(KEY(axis)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
};
const clamp = (axis: Axis, v: number) => Math.min(LIMIT[axis][1], Math.max(LIMIT[axis][0], Math.round(v)));

/** คืนค่าที่ผู้ใช้เคยลากไว้ทั้งหมด ให้ App เอาไปตั้งเป็น style ของ .main ตอนเรนเดอร์แรก */
export const savedSplits = (): React.CSSProperties => {
  const out: Record<string, string> = {};
  for (const axis of ['left', 'right', 'palette'] as Axis[]) {
    const v = read(axis);
    if (v !== null) out[VAR[axis]] = `${v}px`;
  }
  return out as React.CSSProperties;
};

interface Props {
  axis: Axis;
  /** px ที่ใช้เมื่อยังไม่เคยลาก — ใช้ตอนกดลูกศรและตอนดับเบิลคลิกเพื่อรีเซ็ต */
  fallback: number;
  label: string;
}

/**
 * ที่จับสำหรับลากปรับขนาดแผงในหน้า Lab
 * เขียนค่าเป็นตัวแปร CSS บนกล่อง .main ที่ครอบอยู่ จึงไม่ต้องรีเรนเดอร์ React ระหว่างลาก
 */
export const Splitter: React.FC<Props> = ({ axis, fallback, label }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ start: number; from: number } | null>(null);
  const host = () => ref.current?.closest('.main') as HTMLElement | null;
  /** ขนาดที่เห็นอยู่จริง ณ ตอนนี้ ใช้เป็นจุดตั้งต้นของการลาก จะได้ไม่กระโดดในครั้งแรก */
  const current = () => {
    const el = host();
    if (!el) return fallback;
    const v = parseFloat(el.style.getPropertyValue(VAR[axis]));
    if (Number.isFinite(v)) return v;
    const panel = el.querySelector(PANEL[axis]) as HTMLElement | null;
    if (panel) {
      const box = panel.getBoundingClientRect();
      return axis === 'palette' ? box.height : box.width;
    }
    return read(axis) ?? fallback;
  };
  const apply = (v: number) => {
    const el = host();
    if (!el) return;
    const next = clamp(axis, v);
    el.style.setProperty(VAR[axis], `${next}px`);
    try { localStorage.setItem(KEY(axis), String(next)); } catch { /* โหมดส่วนตัวเขียนไม่ได้ ไม่เป็นไร */ }
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { start: axis === 'palette' ? e.clientY : e.clientX, from: current() };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const now = axis === 'palette' ? e.clientY : e.clientX;
    // แผงขวาโตเมื่อลากไปทางซ้าย จึงกลับเครื่องหมาย
    const delta = (now - drag.current.start) * (axis === 'right' ? -1 : 1);
    apply(drag.current.from + delta);
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const back = axis === 'palette' ? 'ArrowUp' : 'ArrowLeft';
    const fwd = axis === 'palette' ? 'ArrowDown' : 'ArrowRight';
    if (e.key !== back && e.key !== fwd) return;
    e.preventDefault();
    const dir = (e.key === fwd ? 1 : -1) * (axis === 'right' ? -1 : 1);
    apply(current() + dir * 16);
  };
  const reset = () => {
    const el = host();
    if (!el) return;
    el.style.removeProperty(VAR[axis]);
    try { localStorage.removeItem(KEY(axis)); } catch { /* ไม่เป็นไร */ }
  };
  return <div ref={ref} className={`splitter splitter-${axis === 'palette' ? 'h' : 'v'}`}
    role="separator" tabIndex={0}
    aria-orientation={axis === 'palette' ? 'horizontal' : 'vertical'}
    aria-label={label}
    title={`${label} · ${t('ดับเบิลคลิกเพื่อคืนขนาดเดิม')}`}
    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    onDoubleClick={reset} onKeyDown={onKey} />;
};
