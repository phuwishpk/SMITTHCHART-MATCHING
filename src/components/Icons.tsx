import React from 'react';

/**
 * ไอคอนเส้นชุดเดียวของแถบหัว
 *
 * เลิกใช้อิโมจิเพราะรูปเปลี่ยนไปตามระบบปฏิบัติการ และพอย่อเหลือ 16px อิโมจิหนังสือ
 * (📚 📖 📗) กลายเป็นก้อนสีที่แยกจากกันไม่ออก · SVG เส้นคมทุกขนาดและรับสีจาก currentColor
 */
export type IconName =
  | 'menu' | 'lessons' | 'problems' | 'glossary' | 'examples' | 'reset'
  | 'lab' | 'basics' | 'course' | 'check';

const PATHS: Record<IconName, React.ReactNode> = {
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  /* หนังสือซ้อนกัน = คลังบทเรียน */
  lessons: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v13H5.5A1.5 1.5 0 0 0 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14v13h4.5a1.5 1.5 0 0 1 1.5 1.5z" /><path d="M10 4h4v13h-4z" /></>,
  /* กระดาษคำถาม */
  problems: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></>,
  /* หนังสือมีที่คั่น = อภิธานตัวย่อ */
  glossary: <><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v18H6.5A1.5 1.5 0 0 1 5 19.5z" /><path d="M5 17.5h14" /><path d="M10 3v7l2.4-1.6L14.8 10V3" /></>,
  /* บีกเกอร์ = ตัวอย่างสำเร็จรูป */
  examples: <><path d="M9.5 3h5" /><path d="M10.5 3v6.2L5.4 18a2 2 0 0 0 1.7 3h9.8a2 2 0 0 0 1.7-3l-5.1-8.8V3" /><path d="M7.7 14h8.6" /></>,
  reset: <><path d="M3 4v6h6" /><path d="M4.6 14a8 8 0 1 0 1-6" /></>,
  /* วงจร = แล็บ */
  lab: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M9.5 2v2M14.5 2v2M9.5 20v2M14.5 20v2M2 9.5h2M2 14.5h2M20 9.5h2M20 14.5h2" /></>,
  /* วงกลมนอกกับวงต้านทาน = Smith chart */
  basics: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><circle cx="15" cy="12" r="6" /></>,
  course: <><path d="M3 4h5a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H3z" /><path d="M21 4h-5a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H21z" /></>,
  check: <><path d="M20 6.5 9.5 17 4 11.5" /></>,
};

export const Icon: React.FC<{ name: IconName; size?: number }> = ({ name, size = 16 }) => (
  <svg className="icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {PATHS[name]}
  </svg>
);
