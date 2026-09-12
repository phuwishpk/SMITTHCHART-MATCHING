/**
 * ตารางแปลไทย → อังกฤษ ใช้ข้อความไทยเป็นกุญแจ
 * แยกเป็นไฟล์ตามแหล่งที่มา จะได้เติมทีละส่วนโดยไม่ชนกัน
 *
 * PATTERN ใช้กับข้อความที่มีตัวเลขแทรก เก็บโดยแทนตัวเลขทุกตัวด้วย #
 * เช่น "เดิน 0.125 λ ได้ 90 องศา" เก็บเป็น "เดิน # λ ได้ # องศา"
 */
import { UI } from './ui';
import { BASICS } from './basics';
import { CARON } from './caron';
import { GLOSSARY } from './glossary';
import { LESSONS } from './lessons';
import { PATTERNS } from './patterns';

export const EXACT: Record<string, string> = { ...UI, ...BASICS, ...CARON, ...GLOSSARY, ...LESSONS };
export const PATTERN: Record<string, string> = { ...PATTERNS };
