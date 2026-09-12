/**
 * จุดแปลภาษาชั้นเดียวของทั้งแอป
 *
 * แอปสร้างข้อความคอร์สทั้งหมดตอนโหลดโมดูล จึงแปลตอนสร้างไม่ได้ (ยังไม่รู้ภาษาที่ผู้ใช้เลือก)
 * ที่ผ่านมาจึงต้องห่อ t() ทีละจุดในคอมโพเนนต์ ซึ่งพลาดได้ง่ายเมื่อข้อความถูกส่งเป็น prop
 * ไฟล์นี้ย้ายการแปลไปไว้ที่ jsx runtime แทน ทุกข้อความที่ถูกเรนเดอร์จริงจึงผ่านตัวแปลเสมอ
 * ถ้าไม่มีคำแปล translate() คืนข้อความไทยเดิม หน้าจอจึงไม่มีทางว่างหรือขึ้นเป็นรหัสคีย์
 */
import { t } from '../engine/i18n';

const THAI = /[฀-๿]/;

/** prop ที่เก็บข้อความให้คนอ่าน (ไม่ใช่ค่าใช้งานภายใน) */
const TEXT_PROPS = new Set([
  'title', 'aria-label', 'aria-valuetext', 'aria-description', 'aria-placeholder',
  'placeholder', 'alt', 'label', 'summary', 'caption', 'tex', 'text', 'note',
]);

/**
 * ข้อความใน JSX มักมีช่องว่างหัวท้ายติดมาด้วย (เช่น `{' · ข้อความ'}`) ซึ่งไม่ได้อยู่ในกุญแจคำแปล
 * จึงลองแปลเฉพาะเนื้อความ แล้วใส่ช่องว่างเดิมกลับเข้าไป
 */
const one = (v: unknown): unknown => {
  if (typeof v !== 'string' || !THAI.test(v)) return v;
  const translated = t(v);
  if (translated !== v) return translated;
  const core = v.trim();
  if (!core || core === v) return v;
  const out = t(core);
  if (out === core) return v;
  const lead = v.slice(0, v.indexOf(core[0]));
  return lead + out + v.slice(lead.length + core.length);
};

export const translateProps = (props: unknown): unknown => {
  if (!props || typeof props !== 'object') return props;
  const src = props as Record<string, unknown>;
  let out = src;
  const set = (k: string, v: unknown) => {
    if (out === src) out = { ...src };
    out[k] = v;
  };
  for (const k in src) {
    const v = src[k];
    if (k === 'children') {
      if (typeof v === 'string') { const n = one(v); if (n !== v) set(k, n); }
      else if (Array.isArray(v)) {
        let changed = false;
        const arr = v.map((c) => { const n = one(c); if (n !== c) changed = true; return n; });
        if (changed) set(k, arr);
      }
    } else if (TEXT_PROPS.has(k) && typeof v === 'string') {
      const n = one(v);
      if (n !== v) set(k, n);
    }
  }
  return out;
};
