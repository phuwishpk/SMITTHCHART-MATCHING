/**
 * ตารางแปลไทย → อังกฤษ และฟังก์ชันแปลข้อความ
 *
 * แอปนี้สร้างข้อความคอร์สทั้งหมดตอนโหลดโมดูล (เช่น `SWR = ${n(swr, 2)}`) จึงแปลตอนสร้างไม่ได้
 * เพราะยังไม่รู้ว่าผู้ใช้จะเลือกภาษาอะไร วิธีที่ใช้คือ **แปลตอนแสดงผล** โดยใช้ข้อความไทยเป็นกุญแจ
 * ข้อดีคือถ้ายังไม่มีคำแปล ข้อความไทยเดิมจะแสดงตามปกติ ไม่มีทางขึ้นเป็นช่องว่างหรือรหัสคีย์
 */
import { EXACT, PATTERN } from './translations';

export type Lang = 'th' | 'en';

/** ข้อความที่มีตัวเลขแทรกจะถูกย่อเป็นแบบแผนเดียว เช่น "เดิน 0.125 λ" → "เดิน # λ" */
const shape = (s: string) => s.replace(/-?\d+(?:[.,]\d+)?/g, '#');
const NUMBERS = /-?\d+(?:[.,]\d+)?/g;

export const translate = (text: string, lang: Lang): string => {
  if (lang === 'th' || !text) return text;
  const exact = EXACT[text];
  if (exact) return exact;
  const pattern = PATTERN[shape(text)];
  if (!pattern) return text;
  const nums = text.match(NUMBERS) ?? [];
  let i = 0;
  return pattern.replace(/#/g, () => nums[i++] ?? '#');
};

/**
 * สำเนาภาษาปัจจุบันไว้ระดับโมดูล สำหรับโค้ดที่ไม่ใช่คอมโพเนนต์ (เช่นตัวช่วยจัดรูปแบบข้อความ)
 * คอมโพเนนต์ควรใช้ useT() จาก state/store แทน เพราะต้องรีเรนเดอร์เมื่อเปลี่ยนภาษา
 */
let current: Lang = 'th';
export const setLang = (lang: Lang) => { current = lang; };
export const getLang = (): Lang => current;
export const t = (text: string): string => translate(text, current);

/** จำนวนคำแปลที่มีอยู่ ใช้ตรวจความคืบหน้าได้จากคอนโซล */
export const coverage = () => ({ exact: Object.keys(EXACT).length, pattern: Object.keys(PATTERN).length });
