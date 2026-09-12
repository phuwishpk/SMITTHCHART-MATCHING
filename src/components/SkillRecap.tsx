import React, { useRef } from 'react';
import { t } from '../engine/i18n';
import { useDispatch } from '../state/store';
import { C, Complex, abs, arg, deg, fmtNum } from '../engine/complex';
import {
  normalize, denormalize, admittance, gammaFromz, swrFromGamma, wtgFromGamma,
  rotateTowardGenerator, zFromGamma, returnLossDb, stubSusceptanceNormalized,
} from '../engine/rf';
import { solveQwt, solveSingleStub } from '../engine/matching';
import { buildCircuit, type Circuit } from '../engine/circuit';
import { EX77, EX78, ex78AtFreq } from '../engine/basics';
import { SmithFigure, type SmithPoint, type SmithCurve } from './SmithFigure';

/**
 * บท 11 — การ์ดทักษะการอ่านและพล็อต Smith Chart ทั้ง 13 ใบ
 * แต่ละใบ: ใจความสำคัญบรรทัดเดียว · กดขยายเห็นขั้นตอน ตัวอย่างตัวเลข รูป และปุ่มกระโดดไปบทที่สอนเรื่องนั้น
 * ตัวเลขทุกตัวคำนวณจาก engine ตอนโหลด ไม่ได้พิมพ์ทับ
 */
const n = (x: number, d = 2) => fmtNum(x, d);
const fz = (z: Complex, d = 3) => `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}`;
const lin = (a: number, b: number, k: number) => Array.from({ length: k }, (_, i) => a + ((b - a) * i) / (k - 1));
/** เดินตามวง SWR จาก z0 ไปทางเครื่องส่งเป็นระยะ len (λ) */
const swrPath = (z0: Complex, len: number): Complex[] => lin(0, len, 49).map((d) => zFromGamma(rotateTowardGenerator(gammaFromz(z0), d)));
const seriesPath = (z0: Complex, dx: number): Complex[] => lin(0, dx, 31).map((d) => C(z0.re, z0.im + d));
const shuntPath = (z0: Complex, db: number): Complex[] => { const y = admittance(z0); return lin(0, db, 31).map((d) => admittance(C(y.re, y.im + d))); };

// ---- โหลดประจำคอร์ส 25 + j25 Ω บนสาย 50 Ω ----
const Z0 = 50;
const ZL = C(25, 25);
const z = normalize(ZL, Z0);
const y = admittance(z);
const g = gammaFromz(z);
const swr = swrFromGamma(g);
const wtg = wtgFromGamma(g);
const D = 0.15;
const g2 = rotateTowardGenerator(g, D);
const z2 = zFromGamma(g2);
const bShort125 = stubSusceptanceNormalized('short', 50, 0.125, 50);
const bShort375 = stubSusceptanceNormalized('short', 50, 0.375, 50);
const bOpen125 = stubSusceptanceNormalized('open', 50, 0.125, 50);
// ---- ตัวอย่างจากหนังสือ ----
const z77 = normalize(EX77.ZL, EX77.Z0);
const q77 = solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => a.dLambda - b.dLambda)[0];
const y78 = admittance(normalize(EX78.ZL, EX78.Z0));
const s78 = solveSingleStub(EX78.ZL, EX78.Z0, 'short')[0];
const f10 = ex78AtFreq(10);
const f12 = ex78AtFreq(12);

interface Skill {
  id: string;
  title: string;
  key: string;
  steps: string[];
  example: string[];
  chart: { points?: SmithPoint[]; curves?: SmithCurve[]; swr?: number[]; showY?: boolean; rCircles?: number[]; xCircles?: number[]; gCircles?: number[] };
  link: { section: string; label: string };
  lab?: { label: string; circuit: () => Circuit; showY?: boolean };
}
interface Group { title: string; skills: Skill[] }

const GROUPS: Group[] = [
  { title: 'อ่านค่า', skills: [
    { id: 'norm', title: 'หารด้วย Z₀ ก่อนเสมอ (normalize)',
      key: 'กราฟใบเดียวใช้กับสายทุกชนิด เพราะสิ่งที่พล็อตคือค่าที่หารด้วย Z₀ แล้ว ไม่ใช่โอห์ม',
      steps: ['เขียน Z_L = R + jX (Ω) และ Z₀ ของสายที่โหลดต่ออยู่', 'หารทั้งสองส่วนด้วย Z₀: z = R/Z₀ + j(X/Z₀)', 'ค่าที่ได้ไม่มีหน่วย ใช้ z นี้ไปพล็อต'],
      example: [`Z_L = ${fz(ZL, 0)} Ω บนสาย ${Z0} Ω`, `z = 25/50 + j(25/50) = ${fz(z, 1)}`],
      chart: { points: [{ z, label: `z = ${fz(z, 1)}`, cls: 'load' }], rCircles: [z.re], xCircles: [z.im] },
      link: { section: 'norm', label: 'บทที่ 2.3' } },
    { id: 'plot', title: 'พล็อตจุด: วง r ตัดกับส่วนโค้ง x',
      key: 'r บอกว่าวงไหน x บอกว่าส่วนโค้งไหน จุดคือที่ตัดกัน · +x อยู่ครึ่งบน −x อยู่ครึ่งล่าง',
      steps: ['หาวงกลม r = ส่วนจริงของ z (วงที่ตัดแกนนอนตรงเลขนั้น)', 'หาส่วนโค้ง x = ส่วนจินตภาพ · บวกอยู่ครึ่งบน ลบอยู่ครึ่งล่าง', 'จุดตัดของสองเส้นคือจุดโหลด'],
      example: [`z = ${fz(z, 1)} → วง r = ${n(z.re, 1)} ตัดโค้ง x = +${n(z.im, 1)} → ครึ่งบน`, `ถ้าเป็น ${fz(C(z.re, -z.im), 1)} จุดจะไปครึ่งล่างที่ตำแหน่งกระจก`],
      chart: { points: [{ z, label: `+j${n(z.im, 1)}`, cls: 'load' }, { z: C(z.re, -z.im), label: `−j${n(z.im, 1)}`, cls: 'mid' }], rCircles: [z.re], xCircles: [z.im] },
      link: { section: 'sign', label: 'บทที่ 3.3' } },
    { id: 'denorm', title: 'อ่านจุดกลับเป็นโอห์ม (denormalize)',
      key: 'อ่าน r กับ x จากเส้นที่ผ่านจุด แล้วคูณ Z₀ กลับ — ต้องใช้ Z₀ ของสาย ณ จุดนั้น',
      steps: ['ดูว่าจุดอยู่บนวง r ไหน และส่วนโค้ง x ไหน', 'Z = (r + jx) × Z₀', 'ถ้าสายเปลี่ยน Z₀ ต้องคูณด้วยค่าใหม่ ไม่ใช่ค่าเดิม'],
      example: [`จุด ${fz(z2, 3)} บนสาย 50 Ω → Z = ${fz(denormalize(z2, 50), 2)} Ω`, `จุดเดียวกันบนสาย 75 Ω จะเป็น ${fz(denormalize(z2, 75), 2)} Ω`],
      chart: { points: [{ z: z2, label: fz(z2, 2), cls: 'in' }], rCircles: [Math.round(z2.re * 10) / 10] },
      link: { section: 'ex-norm', label: 'บทที่ 2.4' } },
    { id: 'gamma', title: 'อ่าน Γ: ระยะจากจุดกลางคือขนาด มุมอ่านรอบขอบ',
      key: '|Γ| = ระยะจากจุดกลาง ÷ รัศมีกราฟ (กลาง = 0 ขอบ = 1) · มุมอ่านที่สเกลองศารอบนอก',
      steps: ['วัดระยะจากจุดกลางถึงจุด เทียบกับรัศมีทั้งหมด → |Γ|', 'ลากเส้นจากจุดกลางผ่านจุดออกไปถึงสเกลองศา → มุมของ Γ', 'return loss = −20 log|Γ| อ่านจากแถบใต้กราฟได้เลย ไม่ต้องคิด'],
      example: [`z = ${fz(z, 1)} → |Γ| = ${n(abs(g), 4)} · มุม ${n(deg(arg(g)), 1)}°`, `return loss = ${n(returnLossDb(g), 2)} dB`],
      chart: { points: [{ z, label: `|Γ| = ${n(abs(g), 3)}`, cls: 'load' }], curves: [{ zs: [C(1, 0), z], cls: 'y', dashed: true }], swr: [swr] },
      link: { section: 'gamma', label: 'บทที่ 2.2' } },
    { id: 'swr', title: 'วง SWR: กางวงเวียนจากจุดกลาง อ่าน r ที่จุดตัดขวา',
      key: 'ทุกจุดบนวงเดียวกันสะท้อนเท่ากัน · เลข r ตรงจุดที่วงตัดแกนนอนด้านขวาคือ SWR',
      steps: ['กางวงเวียนจากจุดกลางถึงจุดโหลด แล้วลากให้ครบวง', 'ดูจุดที่วงตัดแกนนอนทางขวาของจุดกลาง', 'อ่าน r ตรงนั้น = SWR (ทางซ้ายอ่านได้ 1/SWR)'],
      example: [`วงผ่าน ${fz(z, 1)} ตัดแกนขวาที่ r = ${n(swr, 3)} → SWR = ${n(swr, 3)}`, `ตัดแกนซ้ายที่ r = ${n(1 / swr, 3)} = 1/SWR`],
      chart: { points: [{ z, label: 'z_L', cls: 'load' }, { z: C(swr, 0), label: `r = ${n(swr, 2)} = SWR`, cls: 'in' }, { z: C(1 / swr, 0), label: `r = ${n(1 / swr, 2)}`, cls: 'mid' }], swr: [swr] },
      link: { section: 'read-swr', label: 'บทที่ 4.3' } },
  ] },
  { title: 'เดินบนกราฟ', skills: [
    { id: 'scale', title: 'อ่านสเกลรอบนอก (wavelengths toward generator)',
      key: 'ลากเส้นจากจุดกลางผ่านจุดออกไปชนสเกล · เลขที่อ่านได้คือตำแหน่งเริ่มต้น ไม่จำเป็นต้องเป็น 0',
      steps: ['ลากรัศมีจากจุดกลางผ่านจุดโหลดออกไปถึงวงสเกล', 'อ่านเลขบนวง toward generator (เลขไล่ขึ้นตามเข็ม)', 'จดไว้เป็นจุดเริ่ม แล้วค่อยบวกระยะในข้อถัดไป'],
      example: [`z = ${fz(z, 1)} อยู่ที่สเกล ${n(wtg, 4)} λ`, `มุมกับสเกลแปลงกันได้: (180° − ${n(deg(arg(g)), 1)}°) ÷ 720° = ${n(wtg, 4)} λ`],
      chart: { points: [{ z, label: `${n(wtg, 4)} λ`, cls: 'load' }], curves: [{ zs: [C(1, 0), z, zFromGamma(C(g.re / abs(g), g.im / abs(g)))], cls: 'y', dashed: true }] },
      link: { section: 'rings', label: 'บทที่ 5.2' } },
    { id: 'walk', title: 'เดินตามสาย: บวกระยะบนสเกล หมุนตามเข็ม',
      key: 'ไปทางเครื่องส่ง = ตามเข็ม · เดิน 0.5 λ = ครบรอบ · เกิน 0.5 ให้ลบ 0.5 · จุดวิ่งอยู่บนวง SWR เดิมตลอด',
      steps: ['อ่านสเกลของจุดเริ่ม (ข้อ 6)', 'บวกระยะ (หน่วย λ) ถ้าไปทางเครื่องส่ง · ลบ ถ้ากลับหาโหลด', 'ผลเกิน 0.5 ให้ลบ 0.5 · ติดลบให้บวก 0.5', 'ลากรัศมีจากเลขใหม่เข้ามาตัดวง SWR = จุดใหม่ แล้วอ่าน r + jx'],
      example: [`เริ่ม ${n(wtg, 4)} + ${n(D, 2)} = ${n(wtgFromGamma(g2), 4)} λ (หมุน ${n(720 * D, 0)}°)`, `ได้ z = ${fz(z2, 3)} → Z = ${fz(denormalize(z2, Z0), 2)} Ω · SWR ยัง ${n(swr, 3)}`],
      chart: { points: [{ z, label: 'เริ่ม', cls: 'load' }, { z: z2, label: `${n(D, 2)} λ`, cls: 'in' }], curves: [{ zs: swrPath(z, D), cls: 'net', arrow: true }], swr: [swr] },
      link: { section: 'scale', label: 'บทที่ 5.4' },
      lab: { label: 'เปิด Lab: สาย 0.15 λ ต่อโหลดนี้ (ใช้ Probe เลื่อนดู)', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: D, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: ZL.re, X: ZL.im }]]) } },
    { id: 'y', title: 'z ↔ y: จุดตรงข้ามผ่านจุดกลาง',
      key: 'หมุน 180° ผ่านจุดกลางได้ y · หรือเปิดกริด Y แล้วอ่านที่จุดเดิม · ต้องใช้ y ทุกครั้งที่จะต่อของขนาน',
      steps: ['จากจุด z ลากเส้นผ่านจุดกลางไปอีกด้าน ระยะเท่ากัน', 'อ่านค่าที่จุดนั้นด้วยกริด Z = y (g + jb)', 'ทางลัด: เปิดกริด Y (เส้นเขียว) แล้วอ่านตรงจุด z เดิมได้เลย ไม่ต้องหมุน'],
      example: [`z = ${fz(z, 1)} → y = ${fz(y, 0)}`, `g = 1 พอดี แปลว่าโหลดนี้อยู่บนวง g = 1 — ใส่ตัวขนานตัวเดียวก็แมตช์ได้`],
      chart: { showY: true, gCircles: [1], points: [{ z, label: 'z', cls: 'load' }, { z: y, label: `y = ${fz(y, 0)}`, cls: 'y' }], curves: [{ zs: [z, y], cls: 'y', dashed: true }] },
      link: { section: 'convert', label: 'บทที่ 6.2' } },
  ] },
  { title: 'ใส่อุปกรณ์และออกแบบ', skills: [
    { id: 'move', title: 'ใส่อุปกรณ์: อนุกรมไถลบนวง r · ขนานไถลบนวง g',
      key: 'อุปกรณ์เปลี่ยนแค่ส่วนจินตภาพในโดเมนของมัน · อนุกรม: L ตามเข็ม C ทวนเข็ม · ขนาน: C ตามเข็ม L ทวนเข็ม',
      steps: ['อนุกรม → อยู่บนกริด Z ไถลตามวง r เดิม (+x ตามเข็ม −x ทวนเข็ม)', 'ขนาน → เปิดกริด Y ไถลตามวง g เดิม (+b ตามเข็ม −b ทวนเข็ม)', 'เล็งให้ตัวแรกพาจุดถึงวง r = 1 หรือ g = 1 แล้วตัวถัดไปหักล้างส่วนที่เหลือ'],
      example: [`อนุกรม x_s = −${n(z.im, 1)} → z = ${fz(C(z.re, 0), 1)} ยังไม่แมตช์ (r ไม่เปลี่ยน SWR = ${n(1 / z.re, 0)})`, `ขนาน b_p = +1 → y = 1 + j0 → ศูนย์กลาง แมตช์พอดี`],
      chart: { showY: true, rCircles: [z.re], gCircles: [1], points: [{ z, label: 'เริ่ม', cls: 'load' }, { z: C(z.re, 0), label: 'อนุกรม −j0.5', cls: 'mid' }, { z: C(1, 0), label: 'ขนาน +j1', cls: 'in' }], curves: [{ zs: seriesPath(z, -z.im), cls: 'load', arrow: true }, { zs: shuntPath(z, 1), cls: 'y', arrow: true }] },
      link: { section: 'move', label: 'บทที่ 6.5' } },
    { id: 'stub', title: 'สตับ: อ่าน b จากขอบกราฟ',
      key: 'ปลายลัดเริ่มที่ SHORT ปลายเปิดเริ่มที่ OPEN · เดินตามขอบตามเข็มเท่าความยาวสตับ แล้วอ่าน b บนกริด Y',
      steps: ['ปลายลัด เริ่มที่จุดซ้ายสุด · ปลายเปิด เริ่มที่จุดขวาสุด', 'เดินตามขอบกราฟตามเข็มเป็นระยะเท่าความยาวสตับ', 'อ่าน b ที่จุดนั้นบนกริด Y · b ลบทำตัวเป็น L · b บวกทำตัวเป็น C'],
      example: [`ปลายลัด 0.125 λ → b = ${n(bShort125, 0)} · 0.375 λ → b = +${n(bShort375, 0)}`, `ปลายเปิด 0.125 λ → b = +${n(bOpen125, 0)} · สั้นกว่า λ/4: ปลายลัดเป็น L ปลายเปิดเป็น C`],
      chart: { showY: true, points: [{ z: C(0, 0), label: 'SHORT', cls: 'mid' }, { z: C(0, 1), label: '0.125 λ → b = −1', cls: 'stub' }, { z: C(0, -1), label: '0.375 λ → b = +1', cls: 'stub' }], curves: [{ zs: swrPath(C(0, 0), 0.125), cls: 'stub', arrow: true }, { zs: swrPath(C(0, 0), 0.375), cls: 'stub', dashed: true, arrow: true }] },
      link: { section: 'stub', label: 'บทที่ 7.4' } },
    { id: 'qwt', title: 'หม้อแปลง λ/4: เดินจนถึงแกนนอน แล้ว Z_t = √(Z₀ R′)',
      key: 'λ/4 ใช้กับโหลดจริงเท่านั้น · โหลดเชิงซ้อนต้องเดินสายก่อนจนจุดตัดแกนนอน (x = 0) แล้วอ่าน R′',
      steps: ['เดินตามวง SWR ตามเข็มจนตัดแกนนอน (มีสองจุด เลือกจุดใกล้ก่อน) จดระยะ d', 'อ่าน r ตรงนั้น → R′ = r × Z₀', 'Z_t = √(Z₀ × R′) แล้วต่อสาย λ/4 ที่มีอิมพีแดนซ์ Z_t'],
      example: [`Example 7-7: โหลด ${fz(EX77.ZL, 0)} Ω บนสาย ${EX77.Z0} Ω → เดิน d = ${n(q77.dLambda, 3)} λ ถึง R′ = ${n(q77.Rreal, 2)} Ω`, `Z_t = √(${EX77.Z0} × ${n(q77.Rreal, 2)}) = ${n(q77.Zt, 2)} Ω`],
      chart: { points: [{ z: z77, label: 'z_L', cls: 'load' }, { z: C(q77.Rreal / EX77.Z0, 0), label: `R′ = ${n(q77.Rreal, 1)} Ω`, cls: 'in' }], curves: [{ zs: swrPath(z77, q77.dLambda), cls: 'net', arrow: true }], swr: [swrFromGamma(gammaFromz(z77))] },
      link: { section: 'ex77', label: 'บทที่ 8.3' },
      lab: { label: 'เปิด Lab: หม้อแปลง λ/4 ของ Example 7-7', circuit: () => buildCircuit(100e6, EX77.Z0, [['qwt', 'series', { Zt: Number(q77.Zt.toFixed(2)) }], ['tline', 'series', { Z0: EX77.Z0, len: Number(q77.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: EX77.ZL.re, X: EX77.ZL.im }]]) } },
    { id: 'sstub', title: 'Single stub: เดินถึงวง g = 1 แล้วใส่ b ตรงข้าม',
      key: 'ทำในโดเมน Y ทั้งหมด · เดินสายจนจุดตกบนวง g = 1 → อ่าน b → สตับให้ −b → y = 1 · มีสองคำตอบเสมอ',
      steps: ['แปลง z_L → y_L (ข้อ 8)', 'เดินตามวง SWR ตามเข็มจนตัดวง g = 1 · จดระยะ d และอ่าน b ตรงนั้น', 'หาความยาวสตับที่ให้ −b จากขอบกราฟ (ข้อ 10)', 'ผลรวม y = 1 + j0 → ศูนย์กลาง · อีกคำตอบคือจุดตัดวง g = 1 อีกจุด'],
      example: [`Example 7-8: โหลด ${fz(EX78.ZL, 0)} Ω บนสาย ${EX78.Z0} Ω → y_L = ${fz(y78, 2)} → เดิน d = ${n(s78.dLambda, 4)} λ ได้ y = ${fz(s78.yAtStub, 3)}`, `สตับปลายลัดยาว ${n(s78.lLambda, 4)} λ ให้ b = ${n(s78.bStub, 3)} → y = 1 + j0`],
      chart: { rCircles: [1], points: [{ z: y78, label: 'y_L', cls: 'y' }, { z: s78.yAtStub, label: `y ที่ d`, cls: 'mid' }, { z: C(1, 0), label: 'แมตช์', cls: 'in' }], curves: [{ zs: swrPath(y78, s78.dLambda), cls: 'net', arrow: true }, { zs: seriesPath(s78.yAtStub, s78.bStub), cls: 'stub', arrow: true }], swr: [swrFromGamma(gammaFromz(y78))] },
      link: { section: 'procedure', label: 'บทที่ 9.3' },
      lab: { label: 'เปิด Lab: สตับของ Example 7-8', showY: true, circuit: () => buildCircuit(10e6, EX78.Z0, [['stub_short', 'shunt', { Z0: EX78.Z0, len: Number(s78.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: EX78.Z0, len: Number(s78.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: EX78.ZL.re, X: EX78.ZL.im }]]) } },
    { id: 'freq', title: 'ความถี่เปลี่ยน: ความยาวจริงเท่าเดิม แต่ l/λ เปลี่ยน',
      key: 'ทุกอย่างบนกราฟคิดเป็น λ · ความถี่ขึ้น λ สั้นลง สายเส้นเดิมจึง "ยาวขึ้น" ในหน่วย λ → จุดหมุนไกลกว่าเดิม',
      steps: ['คูณความยาวไฟฟ้าทุกค่าด้วย f′/f (ทั้ง d, l_s และสายทุกเส้น)', 'เดินซ้ำทุกขั้นด้วยความยาวใหม่', 'อ่าน SWR ใหม่ แล้วเทียบเกณฑ์ (เช่น ≤ 2) เพื่อหา bandwidth'],
      example: [`Example 7-8 ออกแบบที่ 10 MHz: SWR = ${n(f10.swr, 3)}`, `ที่ 12 MHz: d = 0.130 × 1.2 = ${n(f12.d, 3)} λ, l_s = ${n(f12.ls, 3)} λ → SWR = ${n(f12.swr, 2)}`],
      chart: { points: [{ z: f10.zTot, label: '10 MHz', cls: 'in' }, { z: f12.zTot, label: `12 MHz · SWR ${n(f12.swr, 2)}`, cls: 'load' }], swr: [f12.swr] },
      link: { section: 'ex78f', label: 'บทที่ 10.2' } },
  ] },
];

/** บทที่แต่ละทักษะอาศัยอยู่ ใช้กระโดดไปอ่านฉบับเต็ม */
const CHAPTER_OF: Record<string, string> = {
  norm: 'b2', 'ex-norm': 'b2', gamma: 'b2', sign: 'b3', 'read-swr': 'b4', rings: 'b5', scale: 'b5',
  convert: 'b6', move: 'b6', stub: 'b7', ex77: 'b8', procedure: 'b9', ex78f: 'b10',
};

export const SkillRecap: React.FC = () => {
  const dispatch = useDispatch();
  const host = useRef<HTMLDivElement>(null);
  const setAll = (open: boolean) => host.current?.querySelectorAll('details').forEach((d) => { d.open = open; });
  const openLab = (lab: NonNullable<Skill['lab']>) => {
    dispatch({ type: 'set_circuit', circuit: lab.circuit(), select: null });
    dispatch({ type: 'swr_target', value: null });
    dispatch({ type: 'toggle', key: 'showSweep', value: true });
    if (lab.showY !== undefined) dispatch({ type: 'toggle', key: 'showY', value: lab.showY });
    dispatch({ type: 'mode', mode: 'free' });
    dispatch({ type: 'explain_step', i: 0 });
    dispatch({ type: 'view', view: 'lab' });
  };
  let counter = 0;
  return <div className="skill-recap" ref={host}>
    <div className="sk-toolbar">
      <span className="ri-eyebrow">{t("13 ทักษะ · กดการ์ดเพื่อดูขั้นตอน ตัวอย่างตัวเลข และรูป · ทุกตัวเลขคำนวณโดยแอป")}</span>
      <span className="ri-choices"><button type="button" onClick={() => setAll(true)}>{t("ขยายทั้งหมด")}</button><button type="button" onClick={() => setAll(false)}>{t("ย่อทั้งหมด")}</button></span>
    </div>
    {GROUPS.map((grp) => <React.Fragment key={grp.title}>
      <div className="sk-group">{grp.title}</div>
      {grp.skills.map((sk) => {
        counter += 1;
        return <details key={sk.id} className="sk-card" id={`skill-${sk.id}`}>
          <summary>
            <span className="sk-num">{counter}</span>
            <span><span className="sk-title">{sk.title}</span><span className="sk-key">{sk.key}</span></span>
            <span className="sk-open">{t("กดดู")} ▾</span>
          </summary>
          <div className="sk-body">
            <div>
              <b>{t("ขั้นตอน")}</b>
              <ol>{sk.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <div className="sk-ex"><b>{t("ตัวอย่าง")}</b>{sk.example.map((s, i) => <div key={i}>{s}</div>)}</div>
            </div>
            <SmithFigure {...sk.chart} />
            <div className="sk-actions">
              <button type="button" className="btn small" onClick={() => dispatch({ type: 'basics_section', chapter: CHAPTER_OF[sk.link.section], section: sk.link.section })}>📖 {t("อ่านฉบับเต็ม")} · {sk.link.label}</button>
              {sk.lab && <button type="button" className="btn primary small" onClick={() => openLab(sk.lab as NonNullable<Skill['lab']>)}>🔬 {sk.lab.label}</button>}
            </div>
          </div>
        </details>;
      })}
    </React.Fragment>)}
  </div>;
};
