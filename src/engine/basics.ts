// ---------------------------------------------------------------
// "Smith Chart พื้นฐาน" — a from-scratch course that derives the chart
// and then works the textbook examples (7-7, 7-8, 7-10) step by step.
// Every number and every figure is computed by this app's engines.
// ---------------------------------------------------------------
import type { Chapter } from './course';
import { StepLine } from './explain';
import { Complex, C, abs, arg, deg, fmtNum, isFiniteC } from './complex';
import { buildCircuit } from './circuit';
import {
  gammaFromZ, gammaFromz, zFromGamma, normalize, denormalize, admittance, swrFromGamma,
  rotateTowardGenerator, wtgFromGamma, lineInput, stubInput, returnLossDb, XL, XC,
} from './rf';
import { solveSingleStub, solveQwt } from './matching';

// ---------- small helpers ----------
const T = (text: string): StepLine => ({ kind: 'text', text });
const M = (tex: string): StepLine => ({ kind: 'math', tex });
const N = (text: string): StepLine => ({ kind: 'note', text });
const W = (text: string): StepLine => ({ kind: 'warn', text });
const R = (tex: string): StepLine => ({ kind: 'result', tex });
const K = (text: string): StepLine => ({ kind: 'code', text });

const n = (x: number, d = 2) => fmtNum(x, d).replace('−', '-');
const fz = (z: Complex, d = 2): string => (isFiniteC(z) ? `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}` : '∞');
const tc = (z: Complex, d = 2): string => (isFiniteC(z) ? `${n(z.re, d)} ${z.im < 0 ? '-' : '+'} j${n(Math.abs(z.im), d)}` : '\\infty');
const linspace = (a: number, b: number, k: number) => Array.from({ length: k }, (_, i) => a + ((b - a) * i) / (k - 1));

/** path along the constant-SWR circle, from z0 toward the generator */
const swrPath = (z0: Complex, len: number, k = 48): Complex[] =>
  linspace(0, len, k).map((l) => zFromGamma(rotateTowardGenerator(gammaFromz(z0), l)));
/** the top of the constant-r circle, where a label for that family reads cleanly */
const rTag = (r: number): Complex => zFromGamma(C(r / (1 + r), 1 / (1 + r)));
/** a point just inside the rim on the ray where the constant-x arc starts, to label that family */
const xTag = (x: number, k = 0.86): Complex => {
  const a = Math.PI - 2 * Math.atan(x);
  return zFromGamma(C(k * Math.cos(a), k * Math.sin(a)));
};
/** path when a series reactance dx is added */
const seriesPath = (z0: Complex, dx: number, k = 30): Complex[] => linspace(0, dx, k).map((d) => C(z0.re, z0.im + d));
/** path when a shunt susceptance db is added */
const shuntPath = (z0: Complex, db: number, k = 30): Complex[] => {
  const y0 = admittance(z0);
  return linspace(0, db, k).map((d) => admittance(C(y0.re, y0.im + d)));
};

// ---------- textbook data, checked against the engine ----------
export const EX77 = { ZL: C(100, -50), Z0: 75 };
export const EX78 = { ZL: C(450, -600), Z0: 300 };
export const EX710 = { ZL: C(200, 0), Z0: 300 };
const ex77 = solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => a.dLambda - b.dLambda)[0];
const ex78 = solveSingleStub(EX78.ZL, EX78.Z0, 'short')[0];
const ex710 = solveSingleStub(EX710.ZL, EX710.Z0, 'short')[0];
const z77 = normalize(EX77.ZL, EX77.Z0);
const z78 = normalize(EX78.ZL, EX78.Z0);
const y78 = admittance(z78);
const z710 = normalize(EX710.ZL, EX710.Z0);
const swr77 = swrFromGamma(gammaFromZ(EX77.ZL, EX77.Z0));
const swr78 = swrFromGamma(gammaFromZ(EX78.ZL, EX78.Z0));
const swr710 = swrFromGamma(gammaFromZ(EX710.ZL, EX710.Z0));
const wtg78 = wtgFromGamma(gammaFromZ(EX78.ZL, EX78.Z0));
const wtg78y = wtgFromGamma(gammaFromz(y78));
const wtg78g1 = wtgFromGamma(gammaFromz(ex78.yAtStub));
/** where the two poles sit on this app's wavelengths-toward-generator scale */
const wtgShort = wtgFromGamma(gammaFromz(C(0, 0)));
const wtgOpen = wtgFromGamma(gammaFromz(C(Infinity, 0)));

/** Example 7-8 re-checked at another frequency with the physical lengths kept */
export const ex78AtFreq = (fMHz: number) => {
  const k = fMHz / 10;
  const d = 0.130 * k;
  const ls = 0.085 * k;
  const Zd = lineInput(EX78.ZL, EX78.Z0, d, 0);
  const yLine = admittance(normalize(Zd, EX78.Z0));
  const yStub = admittance(normalize(stubInput('short', EX78.Z0, ls), EX78.Z0));
  const yTot = C(yLine.re + yStub.re, yLine.im + yStub.im);
  const zTot = admittance(yTot);
  return { k, d, ls, yLine, yStub, yTot, zTot, swr: swrFromGamma(gammaFromz(zTot)) };
};
const f12 = ex78AtFreq(12);

// ---------- the three "Applications" the book names, worked with one load ----------
const APP_Z0 = 50;
const APP_ZL = C(25, 25);
const zApp = normalize(APP_ZL, APP_Z0);
const yApp = admittance(zApp);
const gApp = gammaFromz(zApp);
const swrApp = swrFromGamma(gApp);
const wtgZApp = wtgFromGamma(gApp);
const wtgYApp = wtgFromGamma(gammaFromz(yApp));
const Y0App = 1 / APP_Z0;
const YApp = admittance(APP_ZL);
/** application 2: what the line looks like a bit away from the load */
const dApp = 0.15;
const APP2_DS = [0, 0.05, 0.1, 0.15, 0.25, 0.5];
const gApp2 = rotateTowardGenerator(gApp, dApp);
const zApp2 = zFromGamma(gApp2);
const ZApp2 = C(zApp2.re * APP_Z0, zApp2.im * APP_Z0);
const yApp2 = admittance(zApp2);
const YApp2 = C(yApp2.re / APP_Z0, yApp2.im / APP_Z0);
/** application 3: how long a shorted line has to be for a wanted reactance */
const APP3_Z0 = 50;
const APP3_LS = [0.05, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.375, 0.4, 0.45];
const APP3_XS = [0.3, 0.6, 1, 2, -0.6, -1, -2];
const APP3_XWANT = 30;
/** inverse of X = Z0 tan(2*pi*l) for a shorted line, in wavelengths */
const shortLenForX = (x: number): number => {
  const l = Math.atan(x) / (2 * Math.PI);
  return l < 0 ? l + 0.5 : l;
};
const APP3_lw = shortLenForX(APP3_XWANT / APP3_Z0);
const APP3_F = 500e6;
const APP3_LAM = 299792458 / APP3_F;
/** a lossy line for the inward-spiral figure: 200 ohm load on 50 ohm, 6 dB per wavelength */
const LOSSY_ZL = C(200, 0);
const LOSSY_Z0 = 50;
const lossyZ = (d: number): Complex => normalize(lineInput(LOSSY_ZL, LOSSY_Z0, d, 6 * d), LOSSY_Z0);

/** chapter 5: one load walked around its own SWR circle, read on all three printed rings.
 *  wtg and the printed angle are the same number in two costumes: angle = 180 - 720*wtg. */
const B5_Z = C(0.5, 0.5);
const b5g = gammaFromz(B5_Z);
const b5wtg = wtgFromGamma(b5g);
const b5ang = deg(arg(b5g));
const b5wtl = ((0.5 - b5wtg) % 0.5 + 0.5) % 0.5;
const b5swr = swrFromGamma(b5g);
const b5at = (d: number) => zFromGamma(rotateTowardGenerator(b5g, d));
/** the worked walk of the chapter: 0.1 lambda toward the generator */
const B5_D = 0.1;
const b5g2 = rotateTowardGenerator(b5g, B5_D);
const b5z2 = zFromGamma(b5g2);
const b5wtg2 = wtgFromGamma(b5g2);
const b5ang2 = deg(arg(b5g2));
/** the same distance walked the other way, toward the load */
const b5gBack = rotateTowardGenerator(b5g, -B5_D);
const b5zBack = zFromGamma(b5gBack);
const b5wtgBack = wtgFromGamma(b5gBack);
/** the wrap-around example: a start reading that crosses 0.5 */
const B5_WRAP_START = 0.45;
const B5_WRAP_D = 0.10;

/** chapter 7: what a lumped part costs and what a stub costs, at each frequency.
 *  VF 0.66 is the usual solid-polyethylene coax figure and is stated as an assumption in the text. */
const STUB_Z0 = 50;
const STUB_F = 100e6;
const STUB_VF = 0.66;
const STUB_LS = [0.05, 0.1, 0.125, 0.15, 0.2, 0.3, 0.375];
const STUB_FS = [100e6, 500e6, 1e9, 3e9, 10e9];
/** wavelength in the cable (not in air) */
const lamIn = (f: number, vf = STUB_VF) => (299792458 * vf) / f;
/** the lumped value a wanted reactance needs at one frequency */
const lFromX = (X: number, f: number) => (X / (2 * Math.PI * f)) * 1e9;
const cFromX = (X: number, f: number) => (1 / (2 * Math.PI * f * -X)) * 1e12;
/** a stub cut to 0.125 lambda at STUB_F, then used at some other frequency:
 *  its PHYSICAL length is fixed, so its electrical length scales with f */
const STUB_FIX = 0.125;
const stubXat = (f: number) => STUB_Z0 * Math.tan(2 * Math.PI * STUB_FIX * (f / STUB_F));
const indXat = (f: number) => 2 * Math.PI * f * (lFromX(STUB_Z0, STUB_F) * 1e-9);

/** chapter 7 worked example: the shorted stub that cancels a load's susceptance.
 *  Book data — Y_L = 0.004 - j0.002 S on a line of Y0 = 0.0033 S at 150 MHz, air dielectric. */
const EXS_F = 150e6;
const EXS_YL = C(0.004, -0.002);
const EXS_Y0 = 0.0033;
const exsY = C(EXS_YL.re / EXS_Y0, EXS_YL.im / EXS_Y0);
const exsB = -exsY.im;
/** shorted stub: y = -j cot(2*pi*l), so cot(2*pi*l) = -b */
const exsL = (() => {
  const a = Math.atan(-1 / exsB) / (2 * Math.PI);
  return ((a % 0.5) + 0.5) % 0.5;
})();
/** what the stub actually achieves: the susceptance is gone, the conductance is not */
const exsYtot = C(exsY.re, exsY.im + exsB);
const exsSwr = swrFromGamma(gammaFromz(admittance(exsYtot)));
const EXS_LAM = 299792458 / EXS_F;

/** chapter 6.4: the z-versus-y mix-up — mirror the point first, then walk, and every later reading is y */
const gMirror = gammaFromz(yApp);
const gMirrorWalk = rotateTowardGenerator(gMirror, dApp);
const zMirrorWalk = zFromGamma(gMirrorWalk);
const ZQuarter = C(yApp.re * APP_Z0, yApp.im * APP_Z0);
/** chapter 6.5: which way one added element moves the point.
 *  a series element adds jx in the impedance domain (r is untouched), a shunt element
 *  adds jb in the admittance domain (g is untouched) — so each rides one printed circle. */
const zAfterX = (x: number): Complex => C(zApp.re, zApp.im + x);
const zAfterB = (b: number): Complex => admittance(C(yApp.re, yApp.im + b));
/** the element values shown in the movement table (illustrative); every result is computed */
const MOVE_XS = [-1, -0.5, -0.25, 0.25, 0.5, 1];
const MOVE_BS = [-1, -0.5, -0.25, 0.25, 0.5, 1, 1.5];
/** the running example already sits on g = 1, so ONE shunt susceptance lands it on the centre */
const MOVE_B1 = -yApp.im;
const MOVE_ZB1 = zAfterB(MOVE_B1);
/** the best a series reactance alone can do: it can only slide along r = 0.5 */
const MOVE_XBEST = -zApp.im;
const MOVE_SWR_XBEST = swrFromGamma(gammaFromz(zAfterX(MOVE_XBEST)));
/** first distance toward the generator at which the line shows r = 1.
 *  |Γ| alone fixes the two crossings z = 1 ± jx with x = 2|Γ|/√(1 − |Γ|²). */
const MOVE_XR1 = (2 * abs(gApp)) / Math.sqrt(1 - abs(gApp) ** 2);
const MOVE_DR1 = Math.min(
  (((wtgFromGamma(gammaFromz(C(1, MOVE_XR1))) - wtgZApp) % 0.5) + 0.5) % 0.5,
  (((wtgFromGamma(gammaFromz(C(1, -MOVE_XR1))) - wtgZApp) % 0.5) + 0.5) % 0.5,
);
const MOVE_ZR1 = zFromGamma(rotateTowardGenerator(gApp, MOVE_DR1));
/** the same load done by rule 2 instead: the stub solver puts the stub at the load itself */
const MOVE_SS = solveSingleStub(APP_ZL, APP_Z0, 'short')[0];
/** turning b = +1 into a real capacitor needs a frequency; 100 MHz is the assumed one */
const MOVE_F = 100e6;
const MOVE_CPF = ((MOVE_B1 / APP_Z0) / (2 * Math.PI * MOVE_F)) * 1e12;
/** chapter 11.4: what a VNA actually reads — reference plane, cable rotation, cable loss.
 *  Only f, vf, the cable length and the dB/m figure are assumed; everything else is computed. */
const VNA_F = 100e6;
const VNA_VF = 0.66;
const VNA_LEN_M = 0.5;
const VNA_LOSS_PER_M = 0.17;
const VNA_BIGLOSS = 3;
const VNA_LAM = (299792458 * VNA_VF) / VNA_F;
const VNA_LEN = VNA_LEN_M / VNA_LAM;
const VNA_LOSS = VNA_LEN_M * VNA_LOSS_PER_M;
const VNA_LOSSES = [0, VNA_LOSS, 0.5, 1.5, VNA_BIGLOSS];
const vnaZ = (lossDb: number): Complex => lineInput(APP_ZL, APP_Z0, VNA_LEN, lossDb);
const vnaG = (lossDb: number): Complex => gammaFromZ(vnaZ(lossDb), APP_Z0);
/** the point as the reference plane creeps down the cable, the stated loss shared along it */
const vnaPath = (lossDb: number, k = 73): Complex[] =>
  linspace(0, VNA_LEN, k).map((l) => normalize(lineInput(APP_ZL, APP_Z0, l, (lossDb * l) / VNA_LEN), APP_Z0));
const ZVna0 = vnaZ(0);
const zVna0 = normalize(ZVna0, APP_Z0);
const gVna0 = vnaG(0);
const zVnaL = normalize(vnaZ(VNA_BIGLOSS), APP_Z0);
/** de-embedding: rotate the measured point back toward the load by the same electrical length */
const zVnaBack = zFromGamma(rotateTowardGenerator(gVna0, -VNA_LEN));
const ZVnaBack = C(zVnaBack.re * APP_Z0, zVnaBack.im * APP_Z0);

export const BASICS: Chapter[] = [
  {
    id: 'b0', num: '', title: 'อ่านหน้านี้ก่อน: รู้จัก Smith Chart ในห้านาที', titleTh: 'เริ่มจากภาพและการทดลอง ยังไม่ต้องจำเส้นตารางหรือสูตร',
    intro: 'ใช้ภาพทดลองสี่ขั้นเพื่อรู้ว่า Smith Chart แก้ปัญหาอะไร หนึ่งจุดหมายถึงอะไร และควรมองตำแหน่งบนกราฟอย่างไร เมื่อจบหน้านี้ขอให้จำได้เพียงสามเรื่อง แล้วค่อยเรียนวิธีอ่านตัวเลขในบทถัดไป',
    sections: [
      {
        id: 'what', title: 'ทดลองดูภาพรวมทีละขั้น',
        lines: [
          T('Smith Chart คือกระดาษกราฟแผ่นเดียวที่ใช้แทนการคำนวณสายส่ง (transmission line) ที่ยุ่งยาก แทนที่จะแก้สมการจำนวนเชิงซ้อนทีละบรรทัด เราพล็อตค่าโหลดเป็นจุดหนึ่งจุด แล้วเลื่อนจุดนั้นไปตามกฎง่าย ๆ ไม่กี่ข้อ คำตอบก็อ่านได้จากกราฟเลย'),
          T('งานสามอย่างที่วิศวกร RF ใช้กราฟนี้ทำบ่อยที่สุดคือ'),
          K('1. ดูว่าโหลดที่ต่ออยู่ “แมตช์” กับสายดีแค่ไหน (สะท้อนกลับมากหรือน้อย)\n2. หาว่าอิมพีแดนซ์ที่มองเห็นเปลี่ยนไปเป็นเท่าไร เมื่อขยับจุดวัดไปตามสาย\n3. ออกแบบวงจร matching เพื่อกำจัดคลื่นสะท้อนให้หมด'),
          T('กราฟจริงมีเส้นตารางถี่ยิบจนดูน่ากลัว แต่โครงของมันมีแค่ไม่กี่อย่าง รูปข้างล่างคือกราฟตัวจริงพร้อมป้ายกำกับครบทุกส่วน อ่านเจ็ดข้อนี้ให้ครบก่อน แล้วเส้นถี่ ๆ ที่เหลือจะค่อย ๆ เข้าที่เองในบทต่อ ๆ ไป'),
          K('1. จุดกลาง = อิมพีแดนซ์อ้างอิง z = 1 · Γ = 0 · ไม่มีคลื่นสะท้อน — เป็นเป้าหมายของการแมตช์ทุกวิธี\n2. ขอบวงนอก = r 0 คือไม่มีส่วนต้านทานจริงเหลืออยู่เลย และ |Γ| = 1 คือสะท้อนกลับหมดทั้งลูก\n3. ปลายซ้ายของแกนนอน = SHORT (z = 0) มุมของ Γ อ่านได้ 180°\n4. ปลายขวาของแกนนอน = OPEN (z = ∞) มุมของ Γ อ่านได้ 0°\n5. ครึ่งบน = รีแอกแตนซ์แบบเหนี่ยวนำ +jx · ครึ่งล่าง = แบบเก็บประจุ −jx · บนแกนนอนพอดีคือความต้านทานล้วน\n6. เส้นที่พิมพ์ไว้มีสองตระกูล คือวงกลม r คงที่ กับส่วนโค้ง x คงที่ และทั้งสองตัดกันเป็นมุมฉากทุกจุด\n7. วงกลมสีแดง = วง |Γ| คงที่ ยิ่งวงเล็กยิ่งสะท้อนน้อย ยิ่งวงโตยิ่งสะท้อนมาก'),
          T('ลูกศรสีดำสองคู่ในรูปบอกทิศที่ค่าเพิ่มขึ้น เดินตามส่วนโค้ง x คงที่ไปทางขวา ค่า r เพิ่มขึ้นเรื่อย ๆ จนถึง ∞ ที่ขอบขวา · เดินตามวงกลม r คงที่ขึ้นข้างบน รีแอกแตนซ์แบบเหนี่ยวนำเพิ่มขึ้น ลงข้างล่างคือแบบเก็บประจุเพิ่มขึ้น'),
          N('หน้านี้ยังไม่ต้องจำสูตรอะไรเลย ขอแค่จำผังใบนี้ให้ติดตา — ทุกบทหลังจากนี้คือการอ่านค่าจากผังใบเดียวกันนี้ทั้งหมด'),
        ],
        figures: [
          { kind: 'chart', title: 'แผนที่ Smith Chart — จำแค่นี้ก่อน', scale: false, fine: false, table: false,
            halves: true, angles: true, lcBar: true,
            points: [
              { z: C(1, 0), label: 'MATCH · z = 1', cls: 'in' },
              { z: C(Infinity, 0), label: 'OPEN · z = ∞', cls: 'stub' },
              { z: C(0, 0), label: 'SHORT · z = 0', cls: 'stub' },
            ],
            glyphs: [
              { z: zFromGamma(C(-0.62, 0.36)), kind: 'L' },
              { z: zFromGamma(C(-0.62, -0.36)), kind: 'C' },
            ],
            curves: [
              // one full turn on a constant-|Γ| circle, started at the top so its label lands there
              { zs: swrPath(C(0.6, 0.8), 0.5, 73), cls: 'gam', label: 'วง |Γ| คงที่' },
              // along a constant-x arc, r grows
              { zs: linspace(0.12, 1.7, 24).map((r) => C(r, 0.65)), cls: 'dir', arrow: true, label: 'r เพิ่มขึ้น' },
              { zs: linspace(0.12, 1.7, 24).map((r) => C(r, -0.65)), cls: 'dir', arrow: true, label: 'r เพิ่มขึ้น' },
              // along a constant-r circle, |x| grows
              { zs: linspace(0.30, 1.5, 24).map((x) => C(0.30, x)), cls: 'dir', arrow: true, label: 'x เหนี่ยวนำเพิ่ม' },
              { zs: linspace(-0.30, -1.5, 24).map((x) => C(0.30, x)), cls: 'dir', arrow: true, label: 'x เก็บประจุเพิ่ม' },
            ],
            labels: [
              { z: zFromGamma(C(-0.36, 0.70)), text: 'ครึ่งบน · +jx · เหนี่ยวนำ' },
              { z: zFromGamma(C(-0.36, -0.70)), text: 'ครึ่งล่าง · −jx · เก็บประจุ' },
              { z: zFromGamma(C(0.60, -0.28)), text: 'วงกลม r คงที่' },
              { z: zFromGamma(C(0.52, -0.56)), text: 'ส่วนโค้ง x คงที่' },
              { z: zFromGamma(C(-0.02, -0.955)), text: 'ขอบวงนอก · r = 0 · |Γ| = 1' },
            ],
            caption: 'ผังนี้จำลองตามผังอ้างอิงมาตรฐานของ Smith Chart · ครึ่งบน (เทา) คือรีแอกแตนซ์แบบเหนี่ยวนำ +jx ครึ่งล่าง (ส้ม) คือแบบเก็บประจุ −jx · เส้นดำคือทิศที่ค่าเพิ่มขึ้น ตามส่วนโค้ง x คงที่แล้ว r เพิ่ม ตามวงกลม r คงที่แล้ว |x| เพิ่ม · วงแดงคือวง |Γ| คงที่ ยิ่งวงเล็กยิ่งสะท้อนน้อย จุดกลางคือ Γ = 0 ไม่มีคลื่นสะท้อน · มุมของ Γ อ่านที่ปลายแกน 0° ทางขวา 180° ทางซ้าย' },
          { kind: 'table', title: 'ป้ายทุกอันในผังใบนั้นแปลว่าอะไร และได้ใช้ตอนไหน',
            head: ['ส่วนของกราฟ', 'ความหมาย', 'สังเกตอย่างไร', 'ได้ใช้ตอนไหน'],
            rows: [
              ['จุดกลาง', 'z = 1 · Γ = 0 · ไม่มีคลื่นสะท้อน', 'เป็นจุดอ้างอิงของกราฟ ไม่มีค่าอะไรต้องอ่าน', 'เป็นเส้นชัยของงาน matching ทุกวิธี'],
              ['ขอบวงนอก', 'r = 0 และ |Γ| = 1 คือสะท้อนกลับหมดทั้งลูก', 'จุดที่อยู่บนขอบไม่มีส่วนต้านทานจริงเหลือเลย มีแต่รีแอกแตนซ์ล้วน', 'สายปลายลัดและสายปลายเปิดวิ่งอยู่บนขอบนี้'],
              ['ปลายซ้ายของแกนนอน', 'SHORT · z = 0 · Γ ขนาด 1 มุม 180°', 'อยู่สุดขอบด้านซ้ายพอดี', 'จุดตั้งต้นของสตับปลายลัด'],
              ['ปลายขวาของแกนนอน', 'OPEN · z = ∞ · Γ ขนาด 1 มุม 0°', 'อยู่สุดขอบด้านขวาพอดี เป็นจุดที่เส้นโค้ง x ทุกเส้นวิ่งไปรวมกัน', 'จุดตั้งต้นของสตับปลายเปิด'],
              ['ครึ่งบน (แรเงาเทา)', 'x เป็นบวก · รีแอกแตนซ์แบบเหนี่ยวนำ', 'ดูเครื่องหมายของ x อย่างเดียว ไม่เกี่ยวกับ r', 'บอกว่าต้องหักล้างด้วยอุปกรณ์ชนิดไหน'],
              ['ครึ่งล่าง (แรเงาส้ม)', 'x เป็นลบ · รีแอกแตนซ์แบบเก็บประจุ', 'ดูเครื่องหมายของ x เหมือนกัน', 'เหมือนกัน แต่ต้องใช้อุปกรณ์คนละชนิด'],
              ['แกนนอนที่ผ่ากลาง', 'x = 0 · เป็นความต้านทานล้วน', 'จุดที่ไม่มีส่วนจินตภาพเหลืออยู่เลย', 'เป็นจุดที่อ่านค่า SWR ได้ง่ายที่สุด'],
              ['วงกลม r คงที่', 'ทุกจุดบนวงเดียวกันมี r เท่ากัน', 'วงที่โตที่สุดคือ r = 0 ซึ่งก็คือขอบวงนอก แล้วเล็กลงเรื่อย ๆ จนยุบเป็นจุด r = ∞ ทางขวา', 'อุปกรณ์ที่ต่ออนุกรมพาจุดไถลไปตามวงนี้'],
              ['ส่วนโค้ง x คงที่', 'ทุกจุดบนส่วนโค้งเดียวกันมี x เท่ากัน', 'ทุกเส้นออกจากขอบแล้ววิ่งไปรวมกันที่จุด OPEN', 'ใช้อ่านค่า x ของจุดที่พล็อตไว้'],
              ['วง |Γ| คงที่ (สีแดง)', 'ทุกจุดบนวงเดียวกันสะท้อนเท่ากันหมด', 'รัศมีของวงคือ |Γ| · วงเล็ก = สะท้อนน้อย วงโต = สะท้อนมาก', 'ต่อสายเพิ่มเท่าไร จุดก็ยังวิ่งอยู่บนวงเดิม'],
            ],
            caption: 'ตารางนี้คือคำอธิบายของป้ายทุกอันในรูปข้างบน เรียงจากจุดกลางออกไปหาขอบ · คอลัมน์ขวาสุดบอกว่าแต่ละอย่างจะได้ใช้จริงตอนไหน เพื่อให้เห็นว่าไม่มีเส้นไหนวาดไว้เล่น ๆ' },
          { kind: 'smith', title: 'ตระกูลที่หนึ่ง — วงกลม r คงที่ (ความต้านทานปกติเท่ากันทั้งวง)',
            rCircles: [0.2, 0.5, 1, 2],
            labels: [0.2, 0.5, 1, 2].map((r) => ({ z: rTag(r), text: `r = ${r}` })),
            points: [{ z: C(0.5, 0.9), cls: 'load' }, { z: C(0.5, -0.9), cls: 'load' }],
            caption: 'วงที่เน้นไว้คือ r = 0.2 · 0.5 · 1 · 2 · ทุกวงแตะขอบขวาที่จุด OPEN จุดเดียวกันหมด · จุดแดงสองจุดอยู่คนละครึ่งกราฟ แต่อยู่บนวงเดียวกัน จึงมี r เท่ากันคือ 0.5 ต่างกันแค่ x · วง r = 1 คือวงที่ลากผ่านจุดกลาง จึงเป็นวงสำคัญที่สุดตอนทำ matching' },
          { kind: 'smith', title: 'ตระกูลที่สอง — ส่วนโค้ง x คงที่ (รีแอกแตนซ์ปกติเท่ากันทั้งเส้น)',
            xCircles: [0.5, 1, 2, -0.5, -1, -2],
            labels: [0.5, 1, 2, -0.5, -1, -2].map((x) => ({ z: xTag(x), text: `x = ${x > 0 ? '+' : '−'}${Math.abs(x)}` })),
            points: [{ z: C(0.3, 1), cls: 'mid' }, { z: C(0.3, -1), cls: 'mid' }],
            caption: 'เส้นโค้งที่เน้นไว้คือ x = ±0.5 · ±1 · ±2 · เส้นบวกอยู่ครึ่งบน เส้นลบอยู่ครึ่งล่าง และเป็นภาพสะท้อนของกันและกันรอบแกนนอน · ทุกเส้นวิ่งไปจบที่จุด OPEN ทางขวาเหมือนกันหมด ส่วน x = 0 คือแกนนอนตรงกลางนั่นเอง' },
          { kind: 'smith', title: 'สองครึ่งของกราฟ — เครื่องหมายของ x เป็นตัวตัดสินอย่างเดียว',
            xCircles: [0.5, -0.5], rCircles: [0.5],
            points: [
              { z: C(0.5, 0.5), label: '25 + j25 Ω', cls: 'load' },
              { z: C(0.5, -0.5), label: '25 − j25 Ω', cls: 'y' },
            ],
            labels: [
              { z: zFromGamma(C(-0.35, 0.72)), text: 'ครึ่งบน · แบบเหนี่ยวนำ' },
              { z: zFromGamma(C(-0.35, -0.72)), text: 'ครึ่งล่าง · แบบเก็บประจุ' },
            ],
            caption: `โหลดสองตัวนี้ต่างกันแค่เครื่องหมายของ X แต่ไปอยู่คนละครึ่งกราฟทันที · ทั้งคู่มี r = 0.5 เท่ากันจึงอยู่บนวงกลม r เดียวกัน และมี |Γ| = ${n(abs(gammaFromz(C(0.5, 0.5))), 4)} เท่ากันด้วย แปลว่าสะท้อนเท่ากัน (คำนวณโดยแอป) · ต่างกันตรงที่ต้องใช้อุปกรณ์คนละชนิดในการหักล้าง` },
          { kind: 'smith', title: 'วง |Γ| คงที่ — คนละจุด แต่สะท้อนเท่ากัน',
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))],
            points: [
              { z: C(0.5, 0.5), label: `z = ${fz(C(0.5, 0.5), 1)}`, cls: 'load' },
              { z: C(2, -1), label: `z = ${fz(C(2, -1), 0)}`, cls: 'mid' },
            ],
            caption: `จุดสองจุดนี้เป็นคนละอิมพีแดนซ์กันโดยสิ้นเชิง อยู่คนละครึ่งกราฟด้วยซ้ำ แต่อยู่ห่างจากจุดกลางเท่ากัน จึงมี |Γ| = ${n(abs(gammaFromz(C(0.5, 0.5))), 4)} เท่ากันและสะท้อนกลับเท่ากัน (คำนวณโดยแอป) · นี่คือความหมายของ “วง |Γ| คงที่” — ระยะจากจุดกลางบอกว่าสะท้อนมากแค่ไหน ส่วนตำแหน่งรอบวงบอกว่าเป็นอิมพีแดนซ์ตัวไหน · รู้แค่ |Γ| จึงยังบอกไม่ได้ว่าโหลดเป็นแบบเหนี่ยวนำหรือแบบเก็บประจุ` },
          { kind: 'quiz',
            question: `พล็อตโหลดตัวหนึ่งแล้วได้จุดอยู่ครึ่งล่าง และอยู่ค่อนไปทางขอบ (z = ${fz(C(0.2, -0.5), 1)}) อ่านผังใบนั้นแล้วบอกได้ทันทีว่าอะไร`,
            choices: [
              'โหลดออกฤทธิ์แบบเก็บประจุ และสะท้อนกลับมาก เพราะอยู่ครึ่งล่างและอยู่ไกลจากจุดกลาง',
              'โหลดออกฤทธิ์แบบเหนี่ยวนำ และสะท้อนน้อย เพราะครึ่งล่างคือฝั่งที่แมตช์ดี',
              'บอกไม่ได้เลยถ้ายังไม่รู้ความถี่',
              'โหลดเป็นความต้านทานล้วน เพราะทุกจุดในกราฟอยู่บนแกนนอน',
            ],
            answer: 0,
            explain: `ครึ่งล่างแปลว่า x เป็นลบ คือออกฤทธิ์แบบเก็บประจุ · ระยะจากจุดกลางแปลว่าสะท้อนมากหรือน้อย จุดนี้มี |Γ| = ${n(abs(gammaFromz(C(0.2, -0.5))), 3)} ซึ่งค่อนข้างมาก (คำนวณโดยแอป) · ความถี่ไม่จำเป็นสำหรับการอ่านสองข้อนี้ เพราะ z เป็นค่าที่ normalize แล้ว ความถี่จะจำเป็นก็ต่อเมื่อจะแปลงกลับเป็นค่า L หรือ C จริง ๆ`,
            hint: 'ดูสองอย่างเท่านั้น — อยู่ครึ่งไหน และอยู่ห่างจากจุดกลางแค่ไหน',
            chart: { scale: false, fine: false, table: false, halves: true, xCircles: [-0.5],
              curves: [{ zs: swrPath(C(0.2, -0.5), 0.5, 73), cls: 'gam' }],
              points: [{ z: C(0.2, -0.5), label: `z = ${fz(C(0.2, -0.5), 1)}`, cls: 'load' }, { z: C(1, 0), label: 'จุดกลาง', cls: 'in' }] } },
        ],
      },
      {
        id: 'landmarks', title: 'จุดกลาง ครึ่งบน และครึ่งล่าง',
        lines: [
          T('จุดกลางของกราฟ คือจุดที่ทุกอย่างลงตัว โหลดเท่ากับอิมพีแดนซ์ของสายพอดี ไม่มีคลื่นสะท้อนเลย เรียกจุดนี้ว่า MATCH และเขียนแทนด้วย z = 1 เป้าหมายของงาน matching ทั้งหมดในคอร์สนี้คือ “ลากจุดให้มาถึงตรงนี้”'),
          T('ขอบซ้ายสุดของกราฟคือ short circuit เขียนว่า z = 0 ส่วนขอบขวาสุดคือ open circuit เขียนว่า z = ∞ ทั้งสองจุดนี้สะท้อนคลื่นกลับหมดทั้งลูก'),
          T('เส้นตรงแนวนอนที่ลากผ่านจุดกลางแบ่งกราฟเป็นสองครึ่ง ครึ่งบนคือโหลดที่มีค่า +jX หรือมีลักษณะเป็นตัวเหนี่ยวนำ (inductive) ครึ่งล่างคือ −jX หรือมีลักษณะเป็นตัวเก็บประจุ (capacitive) ส่วนบนเส้นแนวนอนพอดีคือโหลดที่เป็นความต้านทานล้วน ไม่มีส่วนเชิงซ้อน'),
          T('กฎข้อสุดท้ายเป็นเรื่องระยะ **ยิ่งใกล้จุดกลาง ยิ่งสะท้อนน้อย ยิ่งใกล้ขอบ ยิ่งสะท้อนมาก**'),
          N('มองกราฟให้เหมือนเป้ายิงธนู: กลางเป้าคือแมตช์สมบูรณ์ ขอบนอกคือสะท้อนกลับทั้งหมด · ตัวเลขที่วัดความ “ไกลจากกลาง” นี้คือ SWR ซึ่งจะได้เรียนในบทต่อ ๆ ไป'),
          T('รูปแรกคือจุดสำคัญเดียวกันนี้พร้อมค่าจริงของสาย 50 Ω ส่วนรูปที่สองคือกฎเรื่องระยะ ลองเทียบดูว่าโหลดตัวไหนอยู่ใกล้จุดกลางกว่ากัน'),
        ],
        figures: [
          { kind: 'smith', title: `จุดสำคัญบนกราฟ พร้อมค่าจริงของสาย ${APP_Z0} Ω`, xCircles: [0],
            points: [
              { z: C(0, 0), label: 'SHORT z = 0', cls: 'stub' },
              { z: normalize(C(APP_Z0, 0), APP_Z0), label: 'MATCH z = 1', cls: 'in' },
              { z: C(1e6, 0), label: 'OPEN z = ∞', cls: 'stub' },
              { z: zApp, label: `z = ${fz(zApp, 1)}`, cls: 'load' },
              { z: normalize(C(2 * APP_Z0, 0), APP_Z0), label: `z = ${n((2 * APP_Z0) / APP_Z0, 0)}`, cls: 'mid' },
              { z: normalize(C(APP_ZL.re, -APP_ZL.im), APP_Z0), label: `z = ${fz(normalize(C(APP_ZL.re, -APP_ZL.im), APP_Z0), 1)}`, cls: 'y' },
            ],
            labels: [
              { z: zFromGamma(C(0.10, 0.70)), text: 'ครึ่งบน = +jX แบบเหนี่ยวนำ' },
              { z: zFromGamma(C(0.10, -0.70)), text: 'ครึ่งล่าง = −jX แบบเก็บประจุ' },
            ],
            caption: `โหลด ${fz(APP_ZL, 0)} Ω อยู่ครึ่งบน · ${fz(C(APP_ZL.re, -APP_ZL.im), 0)} Ω อยู่ครึ่งล่าง · ${n(2 * APP_Z0, 0)} Ω (ค่าสมมุติ) ไม่มีส่วน j จึงตกบนเส้นแนวนอนพอดี · ${APP_Z0} Ω คือจุดกลาง · ค่า z ทุกตัวคำนวณโดยแอป` },
          { kind: 'smith', title: 'กฎเรื่องระยะ: ยิ่งไกลจากจุดกลาง ยิ่งสะท้อนมาก',
            points: [
              { z: normalize(C(60, 10), APP_Z0), label: `${fz(C(60, 10), 0)} Ω`, cls: 'in' },
              { z: zApp, label: `${fz(APP_ZL, 0)} Ω`, cls: 'load' },
              { z: normalize(C(10, 30), APP_Z0), label: `${fz(C(10, 30), 0)} Ω`, cls: 'stub' },
            ],
            swr: [swrFromGamma(gammaFromZ(C(60, 10), APP_Z0)), swrApp, swrFromGamma(gammaFromZ(C(10, 30), APP_Z0))],
            caption: `โหลดสามตัวบนสาย ${APP_Z0} Ω (สองตัวนอกเหนือจากตัวอย่างประจำคอร์สเป็นค่าสมมุติ) · ระยะจากจุดกลางคิดเป็น ${n(abs(gammaFromZ(C(60, 10), APP_Z0)) * 100, 0)}%, ${n(abs(gApp) * 100, 0)}% และ ${n(abs(gammaFromZ(C(10, 30), APP_Z0)) * 100, 0)}% ของรัศมี คำนวณโดยแอป · ตัวเลข SWR ที่ติดอยู่ข้างวงยังไม่ต้องสนใจตอนนี้ ดูแค่ว่าวงไหนใหญ่กว่ากัน` },
        ],
      },
      {
        id: 'onepoint', title: 'หนึ่งจุดบนกราฟแทนค่าอะไร',
        lines: [
          T('หนึ่งจุด แทน อิมพีแดนซ์หนึ่งค่า ซึ่งมีสองส่วนเสมอ คือส่วนต้านทาน R กับส่วนรีแอกแตนซ์ X ที่เขียนติดกันเป็น R + jX โอห์ม'),
          T(`ก่อนพล็อตลงกราฟ เราหารค่าโหลดด้วยอิมพีแดนซ์ของสายก่อน (ในคอร์สนี้ส่วนใหญ่ใช้สาย ${APP_Z0} Ω) เพื่อให้กราฟใบเดียวใช้ได้กับสายทุกชนิด ค่าที่หารแล้วเขียนด้วยตัวเล็ก z และไม่มีหน่วย`),
          R(`Z_L = ${tc(APP_ZL, 0)}\\,\\Omega \\;\\Rightarrow\\; z_L = ${tc(zApp, 1)}`),
          T(`โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω ตัวนี้จะเป็นตัวอย่างประจำของคอร์ส เจอซ้ำเกือบทุกบท ค่า z ของมันมีส่วน +j จึงตกอยู่ครึ่งบนของกราฟ และอยู่ค่อนไปทางซ้ายของจุดกลาง`),
          N('ตารางข้างล่างคำนวณโดยแอป ลองไล่ดูว่าค่าไหนไปตกตรงไหนของแผนที่ในหัวข้อแรก'),
        ],
        figures: [
          { kind: 'table', title: `หนึ่งจุด = หนึ่งค่าโหลด (สาย ${APP_Z0} Ω — คำนวณโดยแอป)`,
            head: ['โหลดจริง Z (Ω)', 'ค่าที่กราฟใช้ z', 'ไปตกตรงไหนบนแผนที่'],
            rows: ([
              [C(APP_Z0, 0), 'จุดกลางพอดี — MATCH'],
              [APP_ZL, 'ครึ่งบน (มี +j) — ตัวอย่างประจำของคอร์สนี้'],
              [C(APP_ZL.re, -APP_ZL.im), 'ครึ่งล่าง (มี −j)'],
              [C(0, 0), 'ขอบซ้ายสุด — SHORT'],
              [C(Infinity, 0), 'ขอบขวาสุด — OPEN'],
            ] as [Complex, string][]).map(([Z, where]) => [fz(Z, 0), fz(normalize(Z, APP_Z0), 1), where]),
            caption: 'ตัวเลขในคอลัมน์กลางไม่มีหน่วย เพราะโดนหารด้วยค่าของสายไปแล้ว จะแปลงกลับเป็นโอห์มก็แค่คูณกลับเข้าไป' },
          { kind: 'lab', label: `ลองเลย: โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω`,
            circuit: () => buildCircuit(100e6, APP_Z0, [['load', 'series', { R: APP_ZL.re, X: APP_ZL.im }]]),
            note: 'จุดสีแดงคือโหลดตัวนี้ อยู่ครึ่งบนของกราฟ ตัวเลขรอบ ๆ ยังไม่ต้องสนใจตอนนี้' },
        ],
      },
      {
        id: 'paths', title: 'จะเริ่มอ่านจากตรงไหน',
        lines: [
          T('บทแรกของคอร์สเริ่มจากคำถามว่า ทำไมถึงต้องมีกราฟใบนี้ตั้งแต่แรก แล้วค่อย ๆ สร้างกราฟขึ้นมาทีละชั้นจนใช้ออกแบบวงจรได้ ถ้ายังไม่เคยเรียนเรื่องสายส่งมาก่อน ให้อ่านเรียงไปตามลำดับ ไม่ต้องข้าม'),
          T('แต่ถ้ามีเป้าหมายอยู่แล้ว เลือกหนึ่งในสี่เส้นทางนี้ แล้วดูป้ายในคอลัมน์ขวาของตาราง'),
          K('เริ่มจากศูนย์ → อ่านทุกแถวเรียงจากแถวแรกลงไป ไม่ต้องข้าม\nต้องการอ่านค่า Z / SWR → อ่านสองแถวแรกพอเป็นพื้น แล้วข้ามไปแถวป้าย “อ่านค่า”\nต้องการออกแบบ Matching → เก็บแถวป้าย “พื้นฐาน” ให้ครบก่อน แล้วต่อด้วยแถวป้าย “Matching”\nต้องการทบทวนสูตร → เริ่มที่แถวป้าย “ทบทวน” แล้วค่อยย้อนกลับมาเฉพาะเรื่องที่ติด'),
          N('เกือบทุกบทมีกล่อง 🔬 Lab ให้กดเข้าไปลากค่าจริงดูได้ ถ้าอ่านแล้วยังไม่เห็นภาพ ให้เปิด Lab ควบคู่ไปด้วยเสมอ'),
        ],
        figures: [
          { kind: 'table', title: 'แผนที่คอร์ส: เรื่องไหนอยู่บทไหน',
            head: ['บทที่', 'เรื่องของบทนั้น', 'ป้ายเส้นทาง'],
            rows: [
              ['1', 'ปัญหาที่ทำให้ต้องมี Smith Chart — สายส่งกับโหลดที่ไม่แมตช์', 'พื้นฐาน'],
              ['2', 'Smith Chart คืออะไร และทำไมต้อง normalize', 'พื้นฐาน'],
              ['3', 'อ่านกราฟให้เป็น: วงกลม r และส่วนโค้ง x', 'พื้นฐาน · อ่านค่า'],
              ['4', 'วงกลม SWR คงที่ และวิธีอ่านค่า SWR', 'พื้นฐาน · อ่านค่า'],
              ['5', 'ระยะทางบนกราฟ: หนึ่งรอบเท่ากับ λ/2', 'พื้นฐาน · อ่านค่า'],
              ['6', 'แอดมิตแตนซ์ y และการหมุน 180°', 'พื้นฐาน · อ่านค่า · Matching'],
              ['7', 'สายส่งใช้แทน L และ C ได้ (ที่มาของสตับ)', 'Matching'],
              ['8', 'หม้อแปลง λ/4 ทีละขั้น', 'Matching'],
              ['9', 'Single stub matching ทีละขั้น', 'Matching'],
              ['10', 'ผลของความถี่ที่เปลี่ยนไป', 'Matching'],
              ['11', 'สรุป เปรียบเทียบสองวิธี และแผนผังทำโจทย์', 'ทบทวน'],
            ],
            caption: 'ถ้าไม่แน่ใจว่าตัวเองอยู่ตรงไหน ให้ใช้เส้นทาง “เริ่มจากศูนย์” คืออ่านตั้งแต่แถวแรก' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b1', num: '1', title: 'ปัญหาที่ทำให้ต้องมี Smith Chart', titleTh: 'เริ่มจากสายส่งกับโหลดที่ไม่แมตช์',
    intro: 'บทนี้เริ่มจากเครื่องส่งหนึ่งเครื่อง สายหนึ่งเส้น และโหลดที่ปลายสาย ลองเปลี่ยนโหลดเพื่อดูการสะท้อน แล้วค่อยเรียนว่าทำไมการเปลี่ยนตำแหน่งวัดจึงทำให้ค่าที่อ่านได้เปลี่ยน และ Smith Chart ช่วยเราอย่างไร',
    sections: [
      {
        id: 'mismatch', title: 'สายกับโหลดไม่เข้ากัน: พลังงานบางส่วนสะท้อนกลับ',
        lines: [
          N('ก่อนอ่านต่อ ลองเลือก 100 Ω: แม้ไม่มีส่วน j ก็ยังสะท้อน เพราะโหลดไม่เท่ากับสาย 50 Ω ส่วน SWR = 1 หมายถึงไม่มีคลื่นสะท้อนที่จุดต่อที่กำลังพิจารณา'),
        ],
        figures: [
          { kind: 'quiz', question: 'ต่อโหลดตัวต้านทาน 100 Ω กับสาย 50 Ω จะมีคลื่นสะท้อนหรือไม่?', choices: ['ไม่มี เพราะเป็นตัวต้านทานล้วน', 'มี เพราะโหลดไม่เท่ากับอิมพีแดนซ์ของสาย'], answer: 1, explain: 'มีคลื่นสะท้อน แม้ไม่มีส่วนรีแอกแตนซ์ โหลด 100 Ω บนสาย 50 Ω ให้ SWR = 2 การแมตช์ต้องดูทั้งค่าและส่วนรีแอกแตนซ์ ไม่ใช่ดูว่ามี j หรือไม่เพียงอย่างเดียว' },
          { kind: 'lab', label: 'ทดลองใน Lab: โหลด 100 + j50 Ω บนสาย 50 Ω', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 100, X: 50 }]]), note: 'กด Explain เพื่อดูการคำนวณ Γ และ SWR ทีละขั้น' },
        ],
      },
      {
        id: 'along', title: 'โหลดเดิม ทำไมย้ายจุดวัดแล้วได้ค่าไม่เหมือนเดิม?',
        lines: [
          N('จำไว้สองอย่าง: โหลดที่ปลายสายไม่เปลี่ยน และ SWR คงเดิมบนสายไร้การสูญเสีย สิ่งที่เปลี่ยนคืออิมพีแดนซ์เมื่อมองจากตำแหน่งอื่น'),
        ],
        figures: [
          { kind: 'table', title: 'สามตำแหน่งที่ควรสังเกต: โหลดเดิม 100 + j50 Ω บนสาย 50 Ω',
            head: ['ระยะจากโหลด', 'อิมพีแดนซ์ที่มองเห็น', 'สิ่งที่สังเกต'],
            rows: [
              ['0 λ', '100 + j50 Ω', 'มองที่โหลดโดยตรง'],
              ['0.25 λ', '20 − j10 Ω', 'เปลี่ยนจากลักษณะเหนี่ยวนำเป็นเก็บประจุ'],
              ['0.5 λ', '100 + j50 Ω', 'กลับมาเท่าค่าเดิม — จุดบนกราฟครบหนึ่งรอบ'],
            ],
            caption: 'ทุกแถวมี SWR เท่ากันประมาณ 2.62 แม้ค่าอิมพีแดนซ์จะต่างกัน' },
          { kind: 'quiz', question: 'เลื่อนจุดวัดบนสายไร้การสูญเสียแล้วค่าเปลี่ยนจาก 100 + j50 Ω เป็น 20 − j10 Ω เกิดอะไรขึ้น?',
            choices: ['โหลดถูกเปลี่ยนเป็นตัวใหม่', 'โหลดเดิม แต่กำลังมองผ่านสายคนละความยาว', 'การสะท้อนหายไปแล้ว'],
            answer: 1, explain: 'อุปกรณ์ที่ปลายสายยังเป็นตัวเดิม การเปลี่ยนความยาวสายระหว่างจุดวัดกับโหลดเปลี่ยนสัดส่วนแรงดันต่อกระแสที่อ่านได้ แต่ SWR ยังคงเดิม' },
          { kind: 'lab', label: 'ลองต่อใน Lab: เลื่อน Probe บนสายส่ง', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.5, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: 50 }]]), note: 'โหลดและสายใช้ค่าเดียวกับภาพทดลองด้านบน' },
        ],
      },
      {
        id: 'why', title: 'Smith Chart ช่วยหาจุดที่ต้องการได้อย่างไร?',
        lines: [
          T('สมการกับ Smith Chart อธิบายระบบเดียวกัน สมการช่วยคำนวณตัวเลข ส่วนกราฟช่วยเห็นเส้นทางและตำแหน่งที่ต้องการ เช่น จุดที่ X = 0 จากนั้นจึงอ่านค่าหรือใช้สูตรตรวจสอบ'),
          N('ตัวอย่างนี้มีจุดความต้านทานล้วนสองตำแหน่งในระยะครึ่งคลื่น ทั้งคู่ยังมี SWR ประมาณ 2.62 จึงต้องออกแบบวงจรเพิ่มเติมเพื่อแมตช์'),
        ],
        figures: [
          { kind: 'quiz', question: 'จุดวัดมี X = 0 แล้ว แปลว่าแมตช์กับสาย 50 Ω หรือยัง?',
            choices: ['แมตช์แล้วทุกกรณี', 'ยังต้องดูว่า R เท่ากับ 50 Ω ด้วยหรือไม่'],
            answer: 1, explain: 'ความต้านทานล้วนไม่ได้แปลว่าแมตช์ ตัวอย่างเช่น 100 + j0 Ω ยังไม่แมตช์กับสาย 50 Ω ต้องได้ 50 + j0 Ω ที่จุดต่อที่พิจารณา' },
          { kind: 'table', title: 'ก่อนจบบท: สามคำถามที่เราตอบได้แล้ว',
            head: ['คำถาม', 'สิ่งที่ได้เรียน'],
            rows: [
              ['เมื่อใดเกิดคลื่นสะท้อน?', 'เมื่ออิมพีแดนซ์โหลดไม่เท่ากับอิมพีแดนซ์คุณลักษณะของสาย'],
              ['ทำไมตำแหน่งวัดจึงสำคัญ?', 'เพราะแต่ละจุดมองผ่านสายคนละความยาว จึงเห็นอิมพีแดนซ์ต่างกัน'],
              ['Smith Chart ช่วยอะไร?', 'แสดงค่าที่อ่านได้เป็นตำแหน่งบนกราฟ ทำให้ตามเส้นทางและหาจุดเป้าหมายได้'],
            ],
            caption: 'บทถัดไปจะสอนนำค่าโอห์มมาเป็นจุดบนกราฟทีละขั้น ยังไม่ต้องจำเส้นตารางทั้งหมดในบทนี้' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b2', num: '2', title: 'Smith Chart คืออะไร และทำไมต้อง normalize', titleTh: 'กราฟที่แทนการแก้สมการสายส่ง',
    intro: 'Smith Chart คือ polar impedance diagram — กราฟที่จัดวงกลมและส่วนโค้งไว้ให้นำค่าของสายส่งที่ไม่แมตช์มาพล็อตและอ่านผลได้โดยไม่ต้องแก้สมการจำนวนเชิงซ้อนซ้ำ ๆ',
    sections: [
      {
        id: 'what', title: 'กราฟนี้ช่วยลดงานอะไร',
        lines: [
          T('แทนที่จะแทนค่าในสมการนี้ทุกครั้งที่เปลี่ยนตำแหน่ง'),
          M('Z_{in} = Z_0\\,\\frac{Z_L + jZ_0\\tan\\beta l}{Z_0 + jZ_L\\tan\\beta l}'),
          T('เราทำเพียงสามขั้น'),
          K('Z_L  →  พล็อตจุดบนกราฟ  →  หมุนไปตามระยะที่ต้องการ  →  อ่าน Z_in ออกมา'),
          N('กราฟไม่ได้แทนที่ทฤษฎี แต่แทนที่ "การคำนวณซ้ำ" — สมการด้านบนยังเป็นที่มาของทุกเส้นบนกราฟ'),
          T('รูปข้างล่างเดินสามขั้นนี้ให้ดูด้วยตัวอย่างประจำคอร์ส แล้วตารางถัดไปเอาคำตอบของสองวิธีมาวางเทียบกันทีละแถว'),
        ],
        figures: [
          { kind: 'chart', title: `สามขั้นบนกราฟ: พล็อต → หมุน → อ่าน (โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω เดิน ${n(dApp, 2)} λ)`,
            scale: true, fine: false,
            points: [
              { z: zApp, label: `① พล็อต z_L = ${fz(zApp, 1)}`, cls: 'load' },
              { z: zApp2, label: `③ อ่าน z = ${fz(zApp2, 2)}`, cls: 'in' },
            ],
            curves: [{ zs: swrPath(zApp, dApp), cls: 'net', arrow: true }],
            swr: [swrApp],
            caption: `② คือการหมุนตามลูกศร ${n(dApp, 2)} λ บนวงกลม SWR · ปลายลูกศรอ่านได้ z = ${fz(zApp2, 3)} คูณ ${APP_Z0} กลับได้ Z = ${fz(ZApp2, 1)} Ω ซึ่งตรงกับการแทนค่าในสมการด้านบนทุกหลัก (คำนวณโดยแอป)` },
          { kind: 'table', title: `สองทางให้คำตอบเดียวกัน (โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω — คำนวณโดยแอป)`,
            head: ['ระยะ d (λ)', 'แทนค่าในสมการทีละครั้ง (Ω)', 'หมุนบนกราฟแล้วคูณ Z₀ กลับ (Ω)', 'ค่าบนสเกลรอบกราฟ (λ)'],
            rows: [0, 0.05, 0.1, dApp, 0.25].map((d) => [
              n(d, 2),
              fz(lineInput(APP_ZL, APP_Z0, d, 0), 2),
              fz(denormalize(zFromGamma(rotateTowardGenerator(gApp, d)), APP_Z0), 2),
              n(wtgFromGamma(rotateTowardGenerator(gApp, d)), 4),
            ]),
            caption: 'คอลัมน์ที่สองมาจากการแทนค่าในสมการใหม่ทุกแถว คอลัมน์ที่สามมาจากการหมุนจุดเดิมบนกราฟใบเดียว ได้ตรงกันทุกแถว — สิ่งที่กราฟลดให้คือการแทนค่าซ้ำ ไม่ใช่ความถูกต้อง' },
        ],
      },
      {
        id: 'gamma', title: 'ที่มาของกราฟ: ระนาบของ Γ',
        lines: [
          T('Smith Chart จริง ๆ แล้วคือระนาบของสัมประสิทธิ์การสะท้อน Γ ที่วาดวงกลม r และ x ทับลงไป เริ่มจากนิยาม'),
          M('\\Gamma = \\frac{Z_L - Z_0}{Z_L + Z_0} = \\frac{z - 1}{z + 1}, \\qquad z = \\frac{1 + \\Gamma}{1 - \\Gamma}'),
          T('ถ้าโหลดเป็น passive (ไม่จ่ายกำลังกลับเข้าสาย) และ Z₀ เป็นจำนวนจริงบวก จะได้ |Γ| ≤ 1 เสมอ จุดทั้งหมดจึงตกอยู่ในวงกลมรัศมี 1 — นี่คือขอบของ Smith Chart'),
          N('เงื่อนไขนี้จำเป็น: ถ้าโหลดเป็น active เช่นทรานซิสเตอร์ที่ไม่เสถียร (มี R < 0) หรือถ้า Z₀ เป็นจำนวนเชิงซ้อน จุดจะออกไปนอกวงกลมรัศมี 1 ได้ · คอร์สนี้คิดเฉพาะกรณี passive และ Z₀ จริงบวก'),
          T('เมื่อแทน z = r + jx ลงในสมการแล้วแยกส่วนจริงกับส่วนจินตภาพ จะได้สมการวงกลมสองชุด'),
          M('\\left(\\Gamma_r - \\frac{r}{1+r}\\right)^2 + \\Gamma_i^2 = \\left(\\frac{1}{1+r}\\right)^2 \\qquad \\text{(วงกลม r คงที่)}'),
          M('\\left(\\Gamma_r - 1\\right)^2 + \\left(\\Gamma_i - \\frac{1}{x}\\right)^2 = \\left(\\frac{1}{x}\\right)^2 \\qquad \\text{(วงกลม x คงที่)}'),
          N('วงกลม r ทุกวงมีจุดศูนย์กลางอยู่บนแกนนอนและสัมผัสกันที่จุด OPEN ด้านขวา ส่วนวงกลม x มีจุดศูนย์กลางอยู่บนเส้นตั้งฉากที่ผ่านจุด OPEN จึงเห็นเป็นส่วนโค้งภายในวงกลมหน่วย'),
        ],
        figures: [
          { kind: 'smith', title: 'วงกลม r = 0.5, 1, 2 (ฟ้า) และเส้นโค้ง x = ±0.5, ±1 (ส้ม) บนระนาบ Γ',
            rCircles: [0.5, 1, 2], xCircles: [0.5, -0.5, 1, -1],
            points: [{ z: C(1, 0), label: 'ศูนย์กลาง z = 1', cls: 'in' }],
            caption: 'ทุกจุดในวงกลมหน่วยแทนอิมพีแดนซ์หนึ่งค่า ระยะจากศูนย์กลางคือ |Γ| และมุมคือ ∠Γ' },
        ],
      },
      {
        id: 'norm', title: 'ทำไมต้อง normalize ก่อนพล็อต',
        lines: [
          T('Smith Chart มาตรฐานไม่ได้สร้างมาสำหรับ 50 Ω หรือ 75 Ω หรือ 300 Ω โดยเฉพาะ แต่สร้างให้ใช้ได้กับทุกค่า Z₀ จึงต้องเปลี่ยนอิมพีแดนซ์จริงเป็นค่าปกติก่อน'),
          M('z = \\frac{Z}{Z_0} = \\frac{R + jX}{Z_0} = r + jx, \\qquad r = \\frac{R}{Z_0}, \\quad x = \\frac{X}{Z_0}'),
          T('ข้อดีคือกราฟใบเดียวใช้ได้กับทุกระบบ และเมื่ออ่านค่าเสร็จก็คูณ Z₀ กลับเพื่อได้ค่าจริง'),
          M('Z = z\\,Z_0'),
        ],
        figures: [
{ kind: 'quiz',
  question: `ถ้าสายมี Z₀ = ${APP_Z0} Ω และอ่านค่าจากกราฟได้ z = ${fz(C(2, -1), 0)} แล้วอิมพีแดนซ์จริง Z เป็นเท่าไร`,
  choices: [
    `${fz(normalize(C(2, -1), APP_Z0), 2)} Ω`,
    `${fz(denormalize(C(2, -1), APP_Z0), 0)} Ω`,
    `${fz(C(2, -1), 0)} Ω`,
    `${fz(denormalize(C(2, 1), APP_Z0), 0)} Ω`,
  ],
  answer: 1,
  explain: `ค่าบนกราฟไม่มีหน่วย ต้องคูณกลับด้วย Z₀ เสมอ: Z = z·Z₀ = (${fz(C(2, -1), 0)}) × ${APP_Z0} = ${fz(denormalize(C(2, -1), APP_Z0), 0)} Ω`,
},
          { kind: 'table', title: 'อิมพีแดนซ์จริงเดียวกัน เมื่อ normalize ด้วย Z₀ ต่างกัน (คำนวณโดยแอป)',
            head: ['Z จริง', 'Z₀ = 50 Ω', 'Z₀ = 75 Ω', 'Z₀ = 300 Ω'],
            rows: [C(25, 25), C(100, -50), C(450, -600), C(50, 0)].map((Z) => [fz(Z, 0) + ' Ω', fz(normalize(Z, 50), 3), fz(normalize(Z, 75), 3), fz(normalize(Z, 300), 3)]),
            caption: 'จุดบนกราฟจะต่างกันไปตาม Z₀ ที่ใช้ normalize จึงต้องระบุ Z₀ ทุกครั้ง' },
        ],
      },
      {
        id: 'ex-norm', title: 'ตัวอย่างการ normalize ทีละขั้น',
        lines: [
          T('โจทย์: สาย Z₀ = 50 Ω โหลด Z_L = 25 + j25 Ω'),
          M('z_L = \\frac{25 + j25}{50} = \\frac{25}{50} + j\\frac{25}{50}'),
          R(`z_L = ${tc(normalize(C(25, 25), 50), 1)}`),
          T('เวลาใช้ Smith Chart จึงไม่พล็อต 25 + j25 แต่พล็อต 0.5 + j0.5'),
          N(`ตรวจย้อนกลับ: 0.5 × 50 = 25 Ω และ 0.5 × 50 = 25 Ω ✓ · จุดนี้ให้ SWR = ${n(swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)}`),
        ],
        figures: [
{ kind: 'quiz',
  question: `สาย Z₀ = ${APP_Z0} Ω ต่อโหลด Z_L = ${fz(APP_ZL, 0)} Ω ต้องพล็อตจุดใดลงบน Smith Chart`,
  choices: [
    `${fz(APP_ZL, 0)}`,
    `${fz(C(APP_ZL.re / APP_Z0, APP_ZL.im), 1)}`,
    `${fz(zApp, 1)}`,
    `${fz(yApp, 0)}`,
  ],
  answer: 2,
  explain: `หารด้วย Z₀ ทั้งส่วนจริงและส่วนจินตภาพ: z_L = (${fz(APP_ZL, 0)})/${APP_Z0} = ${fz(zApp, 1)} · ส่วน ${fz(yApp, 0)} คือ y_L ไม่ใช่ z_L`,
  chart: { rCircles: [0.5, 1, 2], xCircles: [0.5, -0.5, 1, -1], scale: false, fine: false },
},
          { kind: 'smith', title: 'จุด z_L = 0.5 + j0.5 คือจุดตัดของวงกลม r = 0.5 กับเส้นโค้ง x = +0.5',
            rCircles: [0.5], xCircles: [0.5], points: [{ z: C(0.5, 0.5), label: 'z_L = 0.5 + j0.5', cls: 'load' }],
            caption: 'r บอกว่าอยู่วงไหน x บอกว่าอยู่ส่วนโค้งไหน จุดตัดคือคำตอบ' },
          { kind: 'lab', label: 'ทดลอง: R 25 Ω อนุกรม L 39.8 nH ที่ 100 MHz ให้ z = 0.5 + j0.5', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 25 }], ['inductor', 'series', { L: 39.8 }]]), note: 'กด Explain ดูขั้น Normalize' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b3', num: '3', title: 'อ่านกราฟให้เป็น: วงกลม r และส่วนโค้ง x', titleTh: 'พิกัดของ Smith Chart',
    intro: 'บทนี้เป็นการฝึกอ่านพิกัด: วงกลมความต้านทานคงที่ ส่วนโค้งรีแอกแตนซ์คงที่ ความหมายของเครื่องหมาย +j และ −j การตัดกันแบบตั้งฉาก และความหมายของจุดสำคัญบนกราฟ',
    sections: [
      {
        id: 'rcircle', title: 'วงกลมความต้านทานคงที่ (r)',
        lines: [
          T('วงกลมที่ปิดสนิทและมีจุดศูนย์กลางอยู่บนเส้นแนวนอนของกราฟ แทนค่าความต้านทานปกติ'),
          M('r = \\frac{R}{Z_0}'),
          T('แต่ละค่ามีวงกลมของตัวเอง เช่น r = 0.2, 0.5, 1, 2, 5 · ยิ่ง r มาก วงยิ่งเล็กและเข้าใกล้ขอบขวา'),
          M('\\text{จุดศูนย์กลาง} = \\left(\\frac{r}{1+r},\\,0\\right), \\qquad \\text{รัศมี} = \\frac{1}{1+r}'),
          T('ดังนั้นถ้า z = 0.5 + j0.7 ให้เริ่มจากวงกลม r = 0.5 ก่อนเสมอ แล้วค่อยหาส่วนโค้ง x = +0.7 จุดตัดคือคำตอบ'),
        ],
        figures: [
          { kind: 'smith', title: 'วงกลม r = 0.2, 0.5, 1, 2, 5', rCircles: [0.2, 0.5, 1, 2, 5],
            points: [{ z: C(0.2, 0), label: 'r=0.2', cls: 'mid' }, { z: C(1, 0), label: 'r=1', cls: 'in' }, { z: C(5, 0), label: 'r=5', cls: 'mid' }],
            caption: 'ทุกวงสัมผัสกันที่จุด OPEN ด้านขวา · วง r = 0 คือขอบกราฟ · r = ∞ คือจุด OPEN' },
          { kind: 'chart', title: 'วงกลม r ชุดเดียวกันบนกราฟตัวเต็ม (กราฟเดียวกับที่ใช้ในหน้า Lab)',
            rCircles: [0.2, 0.5, 1, 2, 5], scale: false,
            points: [{ z: C(0.2, 0), label: 'r = 0.2', cls: 'mid' }, { z: C(1, 0), label: 'r = 1', cls: 'in' }, { z: C(5, 0), label: 'r = 5', cls: 'mid' }],
            caption: 'กราฟพิมพ์จริงมีวงกลมละเอียดกว่านี้มาก แต่เป็นวงชุดเดียวกัน · เส้นหนาสีน้ำเงินคือวงที่ยกมาให้ดู' },
          { kind: 'table', title: 'ตำแหน่งของวงกลม r (คำนวณจากสูตร)', head: ['r', 'ศูนย์กลาง Γ', 'รัศมี', 'R จริงเมื่อ Z₀ = 50 Ω'],
            rows: [0.2, 0.5, 1, 2, 5].map((r) => [n(r, 2), n(r / (1 + r), 3), n(1 / (1 + r), 3), `${n(r * 50, 0)} Ω`]) },
        ],
      },
      {
        id: 'xarc', title: 'ส่วนโค้งรีแอกแตนซ์คงที่ (x)',
        lines: [
          T('อีกชุดหนึ่งคือส่วนโค้งที่อยู่สองด้านของเส้นแนวนอนกลางกราฟ แทนค่ารีแอกแตนซ์ปกติ'),
          M('x = \\frac{X}{Z_0}, \\qquad \\text{ศูนย์กลาง} = \\left(1,\\,\\frac{1}{x}\\right), \\qquad \\text{รัศมี} = \\left|\\frac{1}{x}\\right|'),
          T('เราจึงอ่าน z = r + jx จากจุดตัดของวงกลม r กับส่วนโค้ง x เช่น z = 0.5 + j0.5 คือจุดที่วงกลม r = 0.5 ตัดกับส่วนโค้ง x = +0.5'),
          N('เส้นแนวนอนกลางกราฟคือ x = 0 ทุกจุดบนเส้นนี้เป็นความต้านทานล้วน'),
        ],
        figures: [
{ kind: 'quiz',
  question: 'จุดสีแดงบนกราฟอยู่บนวงกลม r = 2 และอยู่บนส่วนโค้ง x = −1 จุดนี้คือ z เท่าไร',
  choices: [
    `${fz(C(2, 1), 0)}`,
    `${fz(C(1, -2), 0)}`,
    `${fz(C(2, -1), 0)}`,
    `${fz(admittance(C(2, -1)), 1)}`,
  ],
  answer: 2,
  explain: `อ่าน r จากวงกลม อ่าน x จากส่วนโค้ง แล้วประกอบเป็น z = r + jx = ${fz(C(2, -1), 0)} · ส่วนโค้งอยู่ครึ่งล่างจึงเป็นลบ และบนสาย ${APP_Z0} Ω จุดนี้คือ Z = ${fz(denormalize(C(2, -1), APP_Z0), 0)} Ω`,
  chart: { rCircles: [2], xCircles: [-1], scale: false, fine: false,
    points: [{ z: C(2, -1), label: 'จุดที่ต้องอ่าน', cls: 'load' }] },
},
          { kind: 'smith', title: 'ส่วนโค้ง x = +0.5, +1, +2 (ครึ่งบน) และ −0.5, −1, −2 (ครึ่งล่าง)',
            xCircles: [0.5, 1, 2, -0.5, -1, -2],
            points: [{ z: C(0.5, 0.5), label: '0.5 + j0.5', cls: 'load' }, { z: C(0.5, -0.5), label: '0.5 − j0.5', cls: 'mid' }],
            rCircles: [0.5],
            caption: 'สองจุดนี้มี r เท่ากันแต่เครื่องหมายของ x ต่างกัน จึงอยู่คนละครึ่งของกราฟ' },
          { kind: 'chart', title: 'อ่าน z = 0.5 + j0.5 จากกราฟตัวเต็ม: หาวงกลม r = 0.5 ก่อน แล้วไล่ตามส่วนโค้ง x = +0.5',
            rCircles: [0.5], xCircles: [0.5], scale: false,
            points: [{ z: C(0.5, 0.5), label: 'z = 0.5 + j0.5', cls: 'load' }],
            caption: 'บนกราฟจริงตัวเลข r อยู่บนแกนนอน ส่วนตัวเลข x อยู่รอบขอบ · จุดตัดเดียวคือคำตอบ' },
        ],
      },
      {
        id: 'sign', title: 'ความหมายของ +j และ −j',
        lines: [
          T('ในอิมพีแดนซ์ Z = R + jX'),
          M('X > 0 \\;\\Rightarrow\\; \\text{inductive} \\quad (\\text{เช่น } 50 + j30\\,\\Omega)'),
          M('X < 0 \\;\\Rightarrow\\; \\text{capacitive} \\quad (\\text{เช่น } 50 - j30\\,\\Omega)'),
          W('**เครื่องหมายของ x ผิด = อยู่คนละครึ่งกราฟ** ผลลัพธ์ทั้งหมดจะผิดตาม — 0.5 + j0.5 อยู่ครึ่งบน ส่วน 0.5 − j0.5 อยู่ครึ่งล่าง'),
          T('ที่มาของเครื่องหมาย: X_L = 2πfL เป็นบวกเสมอ ส่วน X_C = −1/(2πfC) เป็นลบเสมอ'),
          T('คำที่ต้องแยกให้ออก: ความเหนี่ยวนำ (inductance, L, หน่วยเฮนรี) กับความจุ (capacitance, C, หน่วยฟารัด) เป็นคุณสมบัติของตัวอุปกรณ์เอง ไม่ขึ้นกับความถี่ · ส่วนรีแอกแตนซ์ X ที่อ่านบนกราฟเป็นผลของ L หรือ C ที่ความถี่หนึ่ง ๆ จึงเปลี่ยนเมื่อความถี่เปลี่ยน'),
          M('X_L = 2\\pi f L \\quad (\\text{จาก inductance } L), \\qquad X_C = -\\frac{1}{2\\pi f C} \\quad (\\text{จาก capacitance } C)'),
          N('พูดให้ตรง: จุดครึ่งบนคือโหลดที่ออกฤทธิ์แบบ inductive · จุดครึ่งล่างคือโหลดที่ออกฤทธิ์แบบ capacitive · ค่า capacitance ที่ทำให้เกิดแบบนั้นหาได้จาก C = −1/(2πf·X)'),
        ],
        figures: [
{ kind: 'quiz',
  question: `จุด z = ${fz(C(0.5, 0.8), 1)} อยู่ครึ่งบนหรือครึ่งล่างของกราฟ`,
  choices: [
    'ครึ่งล่าง เพราะ r < 1',
    'อยู่บนเส้นแนวนอนกลางกราฟ',
    'บอกไม่ได้ ถ้ายังไม่รู้ Z₀',
    'ครึ่งบน เพราะ x เป็นบวก (inductive)',
  ],
  answer: 3,
  explain: `เครื่องหมายของ x เป็นตัวชี้ครึ่งกราฟเพียงอย่างเดียว x = +0.8 จึงอยู่ครึ่งบนเสมอ · บนสาย ${APP_Z0} Ω จุดนี้คือ Z = ${fz(denormalize(C(0.5, 0.8), APP_Z0), 0)} Ω ซึ่งมี X > 0 และให้ SWR = ${n(swrFromGamma(gammaFromz(C(0.5, 0.8))), 2)}`,
  chart: { rCircles: [0.5], xCircles: [0.8, -0.8], scale: false, fine: false,
    points: [{ z: C(0.5, 0.8), label: 'ตำแหน่ง ก', cls: 'mid' }, { z: C(0.5, -0.8), label: 'ตำแหน่ง ข', cls: 'mid' }] },
},
          { kind: 'lab', label: 'ทดลอง: R 50 Ω + L (inductive) → ครึ่งบน', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['inductor', 'series', { L: 47.7 }]]) },
          { kind: 'lab', label: 'ทดลอง: R 50 Ω + C (capacitive) → ครึ่งล่าง', circuit: () => buildCircuit(100e6, 50, [['resistor', 'series', { R: 50 }], ['capacitor', 'series', { C: 53 }]]) },
        ],
      },
      {
        id: 'ortho', title: 'วงกลมทั้งสองชุดตัดกันแบบตั้งฉาก',
        lines: [
          T('ชุดวงกลม r และชุดส่วนโค้ง x ถูกออกแบบให้ตัดกันแบบ orthogonal — ถ้าลากเส้นสัมผัสที่จุดตัด เส้นสัมผัสทั้งสองจะตั้งฉากกัน'),
          T('เหตุผลเชิงคณิตศาสตร์: การแปลง Γ = (z − 1)/(z + 1) เป็น conformal mapping ซึ่งรักษามุมระหว่างเส้นไว้ เส้น r คงที่กับเส้น x คงที่ในระนาบ z ตั้งฉากกันอยู่แล้ว จึงยังตั้งฉากกันหลังการแปลง'),
          N('ผลที่ได้คือระบบพิกัดที่อ่านค่า r และ x ได้อย่างเป็นระบบเหมือนกราฟกระดาษกราฟธรรมดา'),
        ],
        figures: [
          { kind: 'smith', title: 'ที่จุด z = 1 + j1 วงกลม r = 1 กับส่วนโค้ง x = 1 ตัดกันเป็นมุมฉาก',
            rCircles: [1], xCircles: [1], points: [{ z: C(1, 1), label: 'z = 1 + j1', cls: 'load' }] },
          { kind: 'chart', title: 'ความตั้งฉากบนกราฟตัวเต็ม: ทุกจุดตัดของสองชุดเส้นเป็นมุมฉาก',
            rCircles: [1], xCircles: [1, -1], scale: false,
            points: [{ z: C(1, 1), label: 'z = 1 + j1', cls: 'load' }, { z: C(1, -1), label: 'z = 1 − j1', cls: 'mid' }],
            caption: 'เพราะเป็นระบบพิกัดตั้งฉาก จึงอ่าน r กับ x แยกกันได้ทีละแกน เหมือนกระดาษกราฟ' },
        ],
      },
      {
        id: 'center', title: 'จุดกลางกราฟ คือจุดที่แมตช์',
        lines: [
          T('จุดตรงกลางหมายถึง z = 1 + j0 เพราะ'),
          M('z = \\frac{Z}{Z_0} = 1 \\;\\Rightarrow\\; Z = Z_0'),
          T('เช่น สาย 50 Ω ต่อโหลด 50 + j0 Ω จะได้ z_L = 50/50 = 1 จึงอยู่กลางกราฟพอดี และ'),
          R('\\Gamma = 0, \\qquad SWR = 1 \\qquad \\text{(perfect match)}'),
          N('เป้าหมายของการทำ matching ทุกวิธีในคอร์สนี้ คือการย้ายจุดจากที่ใดก็ตามมาให้ถึงศูนย์กลางนี้'),
        ],
        figures: [
{ kind: 'quiz',
  question: 'บนแกนแนวนอนของกราฟ จุดซ้ายสุด จุดกลาง และจุดขวาสุด คือ z เท่าใดตามลำดับ',
  choices: [
    'z = ∞ (OPEN) · z = 1 (แมตช์) · z = 0 (SHORT)',
    'z = −1 · z = 0 · z = +1',
    'z = 0 (SHORT) · z = 1 (แมตช์) · z = ∞ (OPEN)',
    'z = 0 (SHORT) · z = 0.5 · z = 1 (แมตช์)',
  ],
  answer: 2,
  explain: `ซ้ายสุดคือลัดวงจร Γ = ${fz(gammaFromz(C(0, 0)), 0)} กลางคือแมตช์ Γ = ${fz(gammaFromz(C(1, 0)), 0)} และ SWR = ${n(swrFromGamma(gammaFromz(C(1, 0))), 0)} ขวาสุดคือปลายเปิด Γ = ${fz(gammaFromz(C(Infinity, 0)), 0)} · ตัวเลข −1, 0, +1 คือค่าของ Γ ไม่ใช่ z`,
  chart: { rCircles: [1], scale: false, fine: false,
    points: [
      { z: C(0, 0), label: 'ซ้ายสุด', cls: 'stub' },
      { z: C(1, 0), label: 'ศูนย์กลาง', cls: 'in' },
      { z: C(1e6, 0), label: 'ขวาสุด', cls: 'stub' },
    ] },
},
          { kind: 'smith', title: 'จุดสำคัญสี่จุดบนกราฟ',
            points: [
              { z: C(1, 0), label: 'ศูนย์กลาง z = 1 (matched)', cls: 'in' },
              { z: C(0, 0), label: 'SHORT z = 0', cls: 'stub' },
              { z: C(1e6, 0), label: 'OPEN z = ∞', cls: 'stub' },
            ],
            rCircles: [1], caption: 'ซ้ายสุด = ลัดวงจร (Γ = −1) · ขวาสุด = ปลายเปิด (Γ = +1) · กลาง = แมตช์ (Γ = 0)' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b4', num: '4', title: 'วงกลม SWR คงที่', titleTh: 'สิ่งที่ไม่เปลี่ยนเมื่อเดินไปตามสาย',
    intro: 'บท 3 สอนวางจุดโหลด บทนี้ชวนดูว่าถ้าเลื่อนจุดวัดไปตามสาย จุดบนกราฟจะไปไหน เป้าหมายคือเห็นว่าอิมพีแดนซ์เปลี่ยนได้ แต่ SWR ยังเท่าเดิม แล้วฝึกอ่าน SWR จากวงกลมโดยไม่ต้องคำนวณใหม่ทุกจุด',
    sections: [
      {
        id: 'circle', title: 'ทำไมจุดจึงเดินอยู่บนวงกลมเดียว',
        lines: [
          T('เริ่มจากสามสิ่งบนภาพทดลอง: จุดกลางกราฟคือแมตช์ จุดโหลดคืออิมพีแดนซ์ที่ปลายสาย และระยะจากกลางกราฟถึงจุดโหลดคือ |Γ| อ่านว่า “ขนาดแกมมา” โดยขอบกราฟมีรัศมี 1'),
          K('ลากวงกลมด้วยวงเวียน\n1. ปักเข็มที่กลางกราฟ z = 1\n2. กางวงเวียนให้ปลายดินสอแตะจุดโหลด\n3. วาดให้ครบรอบ — ทุกจุดบนวงนี้มี |Γ| และ SWR เท่ากัน'),
          T('วงกลมนี้บอกกลุ่มอิมพีแดนซ์ที่มี SWR เท่ากัน และเป็นเส้นทางของจุดวัดบนสายสม่ำเสมอไร้การสูญเสียที่ใช้ Z₀ เดียวกับกราฟ เมื่อเลื่อนจุดวัด ขนาดของสัมประสิทธิ์การสะท้อนคงเดิม เปลี่ยนเพียงมุม'),
          M('\\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l} \\;\\Rightarrow\\; |\\Gamma(l)| = |\\Gamma_L| = \\text{คงที่}'),
          T('เพราะ |Γ| คือรัศมีจากศูนย์กลางกราฟ จุดจึงหมุนอยู่บนวงกลมรัศมีเดิม และเพราะ SWR ขึ้นกับ |Γ| อย่างเดียว'),
          M('SWR = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|} = \\text{คงที่ตลอดสาย เฉพาะบนสายไร้การสูญเสีย}'),
          R('\\text{สายสม่ำเสมอไร้การสูญเสีย: } Z \\text{ อาจเปลี่ยน แต่ } SWR \\text{ คงที่}'),
          N('ข้อยกเว้นที่ควรเห็นภาพ: ถ้าโหลดแมตช์อยู่แล้ว |Γ| = 0 วงกลมหดเหลือจุดกลาง ค่า Z = Z₀ และ SWR = 1 ทุกตำแหน่ง'),
          W('**SWR คงที่เป็นสมบัติของสายไร้การสูญเสียเท่านั้น** ถ้าสายมีการสูญเสีย |Γ| จะเล็กลงเมื่อเดินเข้าหาแหล่งจ่าย SWR ที่วัดได้จึงต่ำลงเรื่อย ๆ (ดูหัวข้อ 4.4)'),
          T('รูปแรกเดินครบหนึ่งรอบให้ดูว่าจุดไม่เคยหลุดออกจากวงกลมเดิม ส่วนรูปที่สองพล็อต r, x และ |Γ| เทียบกับระยะทาง — สังเกตว่ามีเส้นเดียวเท่านั้นที่แบนราบ'),
        ],
        figures: [
          { kind: 'chart', title: `เดินครบ 0.5 λ ก็วนกลับที่เดิม — สี่จุดบนวงกลมเดียวกัน (z_L = ${fz(zApp, 1)})`,
            scale: true, fine: false,
            points: [
              { z: zApp, label: '0 λ (โหลด)', cls: 'load' },
              { z: zFromGamma(rotateTowardGenerator(gApp, 0.125)), label: '0.125 λ', cls: 'in' },
              { z: zFromGamma(rotateTowardGenerator(gApp, 0.25)), label: '0.25 λ', cls: 'y' },
              { z: zFromGamma(rotateTowardGenerator(gApp, 0.375)), label: '0.375 λ', cls: 'mid' },
            ],
            curves: [{ zs: swrPath(zApp, 0.5), cls: 'net', arrow: true }],
            swr: [swrApp],
            caption: `ค่า z ของสี่จุดต่างกัน แต่ระยะจากกลางกราฟเท่ากัน คือ |Γ| = ${n(abs(gApp), 4)} และ SWR = ${n(swrApp, 3)} ทุกจุด · วงนี้มีศูนย์กลางที่กลางกราฟ อย่าสับสนกับวง r คงที่ในเส้นตาราง` },
          { kind: 'plot', title: `r และ x แกว่งตลอดทาง แต่ |Γ| ไม่ขยับเลย (z_L = ${fz(zApp, 1)})`,
            xLabel: 'ระยะจากโหลดไปทางแหล่งจ่าย (λ)', yLabel: 'ค่าปกติ (ไม่มีหน่วย)',
            xMin: 0, xMax: 0.5, yMin: -1.5, yMax: 3,
            series: [
              { name: 'r', points: linspace(0, 0.5, 101).map((d) => [d, zFromGamma(rotateTowardGenerator(gApp, d)).re] as [number, number]) },
              { name: 'x', color: '#dc2626', points: linspace(0, 0.5, 101).map((d) => [d, zFromGamma(rotateTowardGenerator(gApp, d)).im] as [number, number]) },
              { name: '|Γ|', color: '#059669', points: linspace(0, 0.5, 101).map((d) => [d, abs(rotateTowardGenerator(gApp, d))] as [number, number]) },
            ],
            xTicks: [0, 0.125, 0.25, 0.375, 0.5],
            markers: [{ x: 0.25, y: abs(rotateTowardGenerator(gApp, 0.25)), text: `|Γ| = ${n(abs(gApp), 4)} ทุกตำแหน่ง`, color: '#059669' }],
            caption: `เส้นเขียวคือรัศมีของจุดบนกราฟ แบนราบตลอดสาย ดังนั้น SWR = ${n(swrApp, 3)} ก็คงที่ตลอดสายด้วย · สังเกตว่ายอดสูงสุดของเส้น r แตะ ${n(swrApp, 3)} ซึ่งเท่ากับ SWR พอดี — เป็นวิธีอ่าน SWR ที่จะใช้ในหัวข้อถัดไป` },
        ],
      },
      {
        id: 'ex-swr', title: 'ตัวอย่าง: z = 0.5 + j0.5 เดินไป 0.100 λ',
        lines: [
          T('โจทย์: โหลด 25 + j25 Ω ต่อกับสาย 50 Ω ไร้การสูญเสีย อยากทราบ z และ SWR ที่จุดวัดห่างโหลด 0.100 λ ไปทางเครื่องส่ง'),
          K('ขั้นที่ 1: หารค่าโหลดด้วย 50 Ω → z_L = 0.5 + j0.5 แล้วพล็อตจุด\nขั้นที่ 2: วาดวงกลมศูนย์กลางตรงกลางกราฟผ่านจุดโหลด\nขั้นที่ 3: อ่าน SWR ของวงนี้ก่อน แล้วค่อยหาจุดวัดใหม่'),
          R(`SWR = ${n(swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)} \\qquad (\\text{หนังสือ } 2.6)`),
          T('เดินจากโหลดไปทางแหล่งจ่าย 0.100 λ (ตามเข็มนาฬิกา) จะได้'),
          N('0.100 λ ตรงกับมุมหมุนบนกราฟ 72° ในบทนี้ให้สังเกตวงกลมเดิมก่อน บท 5 จะสอนแปลงระยะและอ่านสเกลทีละขั้น'),
          R(`z = ${tc(zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.1)), 2)} \\qquad (\\text{หนังสือ } 1.4 + j1.1)`),
          T('อิมพีแดนซ์เปลี่ยนไปมาก แต่ทั้งสองจุดอยู่บนวงกลมเดียวกัน SWR จึงยังเท่าเดิม'),
        ],
        figures: [
{ kind: 'quiz',
  question: `จาก z = ${fz(zApp, 1)} เดินไปทางแหล่งจ่าย 0.100 λ จนได้ z = ${fz(zFromGamma(rotateTowardGenerator(gApp, 0.1)), 2)} แล้ว SWR ที่จุดใหม่เป็นเท่าไร`,
  choices: [
    'SWR = 1 เพราะเดินมาแล้วจึงแมตช์',
    `SWR = ${n(zFromGamma(rotateTowardGenerator(gApp, 0.1)).re, 2)}`,
    'บอกไม่ได้ ต้องคำนวณใหม่ทุกตำแหน่ง',
    `SWR = ${n(swrApp, 2)} เท่าเดิม`,
  ],
  answer: 3,
  explain: `สายไร้การสูญเสียทำให้ |Γ| = ${n(abs(gApp), 4)} คงที่ SWR จึงยังเป็น ${n(swrApp, 3)} เท่าที่โหลด · ค่า ${n(zFromGamma(rotateTowardGenerator(gApp, 0.1)).re, 2)} คือ r ที่จุดใหม่ ไม่ใช่ SWR`,
  chart: { swr: [swrApp], scale: false, fine: false,
    points: [
      { z: zApp, label: 'z_L', cls: 'load' },
      { z: zFromGamma(rotateTowardGenerator(gApp, 0.1)), label: 'ที่ 0.1 λ', cls: 'in' },
    ] },
},
          { kind: 'smith', title: 'จาก z = 0.5 + j0.5 เดินไปทางแหล่งจ่าย 0.100 λ',
            points: [{ z: C(0.5, 0.5), label: 'z_L = 0.5 + j0.5', cls: 'load' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.1)), label: `0.1λ → ${fz(zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.1)), 2)}`, cls: 'in' }],
            curves: [{ zs: swrPath(C(0.5, 0.5), 0.1), cls: 'net', arrow: true }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))],
            caption: 'ทั้งสองจุดอยู่บนวงกลม SWR เดียวกัน' },
          { kind: 'lab', label: 'ทดลอง: z = 0.5 + j0.5 ผ่านสาย 0.100 λ', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.1, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 25, X: 25 }]]) },
        ],
      },
      {
        id: 'read-swr', title: 'วิธีอ่านค่า SWR จากกราฟ',
        lines: [
          K('อ่าน SWR ใน 3 ขั้น\n1. วาดวงกลมผ่านจุดโหลด โดยมีศูนย์กลางอยู่กลางกราฟ\n2. ตามวงไปยังจุดตัดแกนนอนด้านขวาของกลางกราฟ\n3. อ่านค่า r ที่จุดตัดนั้น — ตัวเลขนี้เท่ากับ SWR'),
          M('r_{\\max} = SWR, \\qquad r_{\\min} = \\frac{1}{SWR}'),
          T('เหตุผล: จุดขวาสุดของวงกลมคือจุดที่แรงดันสูงสุด (E_max) ซึ่งอิมพีแดนซ์เป็นความต้านทานล้วนและมีค่าสูงสุด'),
          N(`ตัวอย่าง: ถ้าตัดที่ r = 2.6 ก็คือ SWR = 2.6 · จุดซ้ายสุดจะเป็น r = 1/2.6 = ${n(1 / 2.6, 3)}`),
          W('อ่านค่าปกติ r ไม่ใช่ค่า R หน่วยโอห์ม: บนระบบ 50 Ω จุด r = 2.6 คือ R = 130 Ω แต่ SWR ยังคือ 2.6 ซึ่งไม่มีหน่วย และกฎ r = SWR ใช้ที่จุดตัดด้านขวานี้เท่านั้น'),
        ],
        figures: [
{ kind: 'quiz',
  question: 'จุด ก อยู่ใกล้ศูนย์กลาง จุด ข อยู่ไกลศูนย์กลาง จุดใดมี SWR ต่ำกว่า',
  choices: [
    'จุด ข เพราะอยู่ไกลศูนย์กลางกว่า',
    'เท่ากัน เพราะอยู่บนกราฟใบเดียวกัน',
    'จุด ก เพราะอยู่ใกล้ศูนย์กลางกว่า',
    'ขึ้นกับว่าจุดอยู่ครึ่งบนหรือครึ่งล่าง',
  ],
  answer: 2,
  explain: `ระยะจากศูนย์กลางคือ |Γ| และ SWR = (1+|Γ|)/(1−|Γ|) · จุด ก (${fz(C(1.2, 0.4), 1)}) มี |Γ| = ${n(abs(gammaFromz(C(1.2, 0.4))), 3)} จึง SWR = ${n(swrFromGamma(gammaFromz(C(1.2, 0.4))), 2)} ส่วนจุด ข (${fz(zApp, 1)}) มี |Γ| = ${n(abs(gApp), 3)} จึง SWR = ${n(swrApp, 2)}`,
  chart: { swr: [swrFromGamma(gammaFromz(C(1.2, 0.4))), swrApp], scale: false, fine: false,
    points: [{ z: C(1.2, 0.4), label: 'จุด ก', cls: 'in' }, { z: zApp, label: 'จุด ข', cls: 'load' }] },
},
          { kind: 'smith', title: 'วงกลม SWR ตัดแกนนอนที่ r = SWR (ขวา) และ r = 1/SWR (ซ้าย)',
            points: [{ z: C(0.5, 0.5), label: 'z_L', cls: 'load' }, { z: C(swrFromGamma(gammaFromz(C(0.5, 0.5))), 0), label: `r = ${n(swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)} = SWR`, cls: 'in' }, { z: C(1 / swrFromGamma(gammaFromz(C(0.5, 0.5))), 0), label: `r = ${n(1 / swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)}`, cls: 'mid' }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))] },
          { kind: 'chart', title: 'อ่าน SWR บนกราฟตัวเต็มด้วยการกวาดรัศมี (แบบเดียวกับที่หน้า Lab วาดให้)',
            readout: C(0.5, 0.5), scale: false,
            points: [{ z: C(0.5, 0.5), label: 'z_L = 0.5 + j0.5', cls: 'load' }],
            caption: `เส้นทึบคือรัศมีวงเวียน เส้นโค้งประคือการกวาดลงแกนนอนครึ่งขวา จุดที่แตะอ่าน r ได้เท่ากับ SWR พอดี · เส้นประที่ลากลงข้างล่างพาไปที่แถบ SWR/RL ใต้กราฟ ซึ่งอ่านค่าที่เหลือได้ในคราวเดียว: |Γ| = ${n(abs(gammaFromz(C(0.5, 0.5))), 3)} · SWR = ${n(swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)} · RL = ${n(returnLossDb(gammaFromz(C(0.5, 0.5))), 1)} dB (คำนวณโดยแอป) · แถบด้านล่างวางตามผังมาตรฐาน: กว้างเท่าเส้นผ่านศูนย์กลาง จุด CENTER อยู่ใต้จุดกลางกราฟพอดี ระยะเท่ารัศมีวัดจาก CENTER ไปทางซ้ายอ่าน SWR / return loss / |Γ| วัดไปทางขวาอ่าน loss / transmission · เส้นประจึงลากดิ่งลงมาชนจุดอ่านค่าได้ตรง ๆ ทั้งสองข้าง` },
        ],
      },
      {
        id: 'lossy', title: 'สายที่มีการสูญเสีย: เกลียวเข้าหาศูนย์กลาง',
        lines: [
          T('ลองนึกภาพโหลดเดิมต่อผ่านสายที่ยาวและสูญเสียมาก สัญญาณเดินหน้าอ่อนลงกว่าจะถึงโหลด และส่วนที่สะท้อนยังอ่อนลงอีกตอนเดินกลับมายังจุดวัด เมื่อเทียบกับคลื่นเดินหน้าที่จุดวัด จึงเห็น |Γ| เล็กลง'),
          M('|\\Gamma(l)| = |\\Gamma_L|\\,e^{-2\\alpha l}'),
          T('l คือระยะจากโหลดไปทางเครื่องส่ง และ α คืออัตราการลดทอนแอมพลิจูดต่อหน่วยระยะ ตัวคูณ 2 มาจากระยะขาไปและขากลับ ภาพนี้ใช้แบบจำลองสายที่มี Z₀ จริงคงที่เหมือนค่าอ้างอิงของกราฟ'),
          T('เส้นทางจึงไม่เป็นวงกลม แต่เป็นเกลียวเข้าหาศูนย์กลาง (inward spiral) และ SWR ที่วัดได้ที่ต้นสายจะต่ำกว่าที่โหลดจริง'),
          W('**SWR ที่ต้นสายต่ำ ไม่ได้แปลว่าโหลดแมตช์ดี** อาจเป็นเพราะสายกินกำลังไปมากก็ได้'),
          N('ในบทเรียนพื้นฐานทั้งหมดต่อจากนี้ เราถือว่าสายไร้การสูญเสีย'),
          K('ก่อนขึ้นบท 5 ให้ตอบได้สามข้อ\n• อยู่บนวงกลมศูนย์กลางเดียวกันและรัศมีเท่ากัน → SWR เท่ากัน\n• อ่าน r ที่จุดตัดแกนนอนด้านขวา → ได้ SWR\n• บท 5 จะตอบต่อว่า ต้องหมุนไปทางไหน และไกลเท่าไร'),
        ],
        figures: [
          { kind: 'chart', title: `สายที่มีการสูญเสีย: เส้นทางเป็นเกลียวเข้าหาศูนย์กลาง (โหลด ${n(LOSSY_ZL.re, 0)} Ω บนสาย ${LOSSY_Z0} Ω, 6 dB ต่อความยาวคลื่น — คำนวณโดยแอป)`,
            scale: false, fine: false,
            points: [
              { z: lossyZ(0), label: `z_L = ${fz(lossyZ(0), 2)}`, cls: 'load' },
              { z: lossyZ(1), label: `ที่ 1.0 λ → ${fz(lossyZ(1), 2)}`, cls: 'in' },
            ],
            curves: [
              { zs: linspace(0, 1, 121).map(lossyZ), cls: 'net', arrow: true },
              { zs: swrPath(lossyZ(0), 0.5), cls: 'mid', dashed: true },
            ],
            swr: [swrFromGamma(gammaFromz(lossyZ(0))), swrFromGamma(gammaFromz(lossyZ(1)))],
            caption: 'เส้นทึบ = เกลียวของสายที่มีการสูญเสีย · เส้นประ = วงกลม SWR คงที่ของสายไร้การสูญเสีย · วงกลมสองวงคือ SWR ที่โหลดและที่ 1.0 λ' },
          { kind: 'table', title: '|Γ| และ SWR ลดลงอย่างไรเมื่อเดินไปตามสายที่มีการสูญเสีย (คำนวณโดยแอป)',
            head: ['ระยะจากโหลด', 'z ที่มองเห็น', '|Γ|', 'SWR'],
            rows: [0, 0.25, 0.5, 0.75, 1].map((d) => [`${n(d, 2)} λ`, fz(lossyZ(d), 3), n(abs(gammaFromz(lossyZ(d))), 3), n(swrFromGamma(gammaFromz(lossyZ(d))), 2)]),
            caption: 'ทุกครึ่งความยาวคลื่นจุดกลับมาที่มุมเดิม แต่รัศมีเล็กลง จึงไม่ทับจุดเดิมอีกต่อไป' },
          { kind: 'lab', label: 'ทดลอง: โหลด 200 Ω ผ่านสาย 0.5 λ ที่มี loss 3 dB', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.5, vf: 0.66, lossDb: 3 }], ['load', 'series', { R: 200, X: 0 }]]), note: 'เทียบจุด z_L (แดง) กับ z_in (เขียว) จะเห็นว่า z_in เข้าใกล้ศูนย์กลางกว่า' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b5', num: '5', title: 'ระยะทางบนกราฟ', titleTh: 'รู้วงที่ต้องเดินแล้ว ต่อไปเลือกทิศและระยะ',
    intro: 'ต่อจากบท 4 ที่รู้ว่าจุดวัดเดินอยู่บนวง SWR เดิม บทนี้เพิ่มสามทักษะ: แปลงระยะบนสายเป็นมุม เลือกทิศหมุน และอ่านสเกลเมื่อวนข้ามเลข 0.5 โดยใช้โหลดและสายตัวเดิมตลอด',
    sections: [
      {
        id: 'halflambda', title: 'เดินบนสายหนึ่งรอบ = λ/2 ไม่ใช่ λ',
        lines: [
          T('เริ่มจากภาพก่อน · เอาปลายวัดไปแตะที่โหลด แล้วค่อย ๆ เลื่อนถอยออกมาตามสาย จุดบนกราฟจะเริ่มวิ่งเป็นวงกลม (บทที่ 4 บอกไว้แล้วว่าวิ่งบนวง SWR เดิม) · คำถามของบทนี้มีข้อเดียว คือ "เลื่อนไปเท่าไรจึงครบหนึ่งรอบ"'),
          T('คำตอบคือ ครึ่งความยาวคลื่น ไม่ใช่หนึ่งความยาวคลื่น · เลื่อนไป λ/2 จุดก็กลับมาทับที่เดิมพอดี'),
          W('ตรงนี้คือจุดที่คนพลาดมากที่สุดในบทนี้ · **เดิน 0.5 λ = หมุนครบ 360°** · เดิน 0.25 λ = หมุนครึ่งรอบ 180° · เดิน 0.125 λ = หมุนหนึ่งในสี่รอบ 90° · ถ้าเผลอคิดว่า 1 λ คือหนึ่งรอบ ทุกคำตอบจะคลาดไปเท่าตัว'),
          T('เหตุผลอยู่ที่คำว่า "ไปกลับ" · คลื่นสะท้อนต้องวิ่งจากจุดที่เราวัดไปถึงโหลดแล้ววิ่งกลับมา เป็นระยะสองเท่าของที่เราเลื่อน ส่วนคลื่นที่เดินหน้าไม่ได้วิ่งเพิ่ม · สิ่งที่กราฟพล็อตคือ "ผลต่าง" ของสองคลื่นนี้ ผลต่างจึงเปลี่ยนเร็วเป็นสองเท่าของระยะที่เราขยับ'),
          K('จำเป็นสูตรเดียว: มุมที่หมุนบนกราฟ = 720° × ระยะ (หน่วย λ)\n  เดิน 0.100 λ  →  720 × 0.100 = 72°\n  เดิน 0.125 λ  →  720 × 0.125 = 90°\n  เดิน 0.250 λ  →  720 × 0.250 = 180°\n  เดิน 0.500 λ  →  720 × 0.500 = 360°  (ครบรอบ กลับที่เดิม)\nย้อนกลับ: อยากหมุน 90°  →  ระยะ = 90 ÷ 720 = 0.125 λ'),
          T('เขียนเป็นสูตรมาตรฐาน ให้ l เป็นระยะจริงบนสาย และ β เป็นตัวแปลงระยะให้เป็นมุม'),
          M('\\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l}, \\qquad \\beta = \\frac{2\\pi}{\\lambda}'),
          T('เลข 2 หน้า βl คือ "ไปกลับ" ที่พูดถึงเมื่อครู่ · แทน l = λ/2 ลงไปจะได้'),
          M('2\\beta l = 2\\cdot\\frac{2\\pi}{\\lambda}\\cdot\\frac{\\lambda}{2} = 2\\pi \\;\\Rightarrow\\; \\text{ครบหนึ่งรอบพอดี}'),
          R('\\text{หมุน } 360^\\circ \\text{ บนกราฟ} \\;\\Leftrightarrow\\; \\text{เดิน } 0.5\\lambda \\text{ บนสายส่งสม่ำเสมอ}'),
          W('ระวังสองมุมนี้ให้ดี เพราะชื่อคล้ายกันมาก · βl คือ "ความยาวไฟฟ้าของสาย" (สาย λ/4 มี βl = 90°) · ส่วนมุมที่จุดหมุนไปบนกราฟคือ 2βl (สาย λ/4 ทำให้จุดหมุน 180°)'),
          N(`λ ในบทนี้คือความยาวคลื่นในสาย ณ ความถี่ที่ใช้งาน ไม่ใช่ในอากาศ · ถ้าสายมีการสูญเสีย จุดยังหมุนครบรอบทุกครึ่งความยาวคลื่นเหมือนเดิม แต่รัศมีหดลง จึงไม่กลับมาทับจุดเดิมเป๊ะ · ส่วนโหลดที่แมตช์แล้วอยู่กลางกราฟ ไม่มีรัศมีให้หมุน เดินเท่าไรก็อยู่ที่เดิม`),
        ],
        figures: [
          { kind: 'chart', title: `หนึ่งรอบแบ่งเป็นสี่ช่วง · โหลด z = ${fz(B5_Z, 1)} เดินทีละ 0.125 λ`,
            scale: true, fine: false, table: false,
            swr: [b5swr],
            points: [
              { z: b5at(0), label: `เริ่ม 0 λ · ${n(deg(arg(b5g)), 0)}°`, cls: 'load' },
              { z: b5at(0.125), label: `0.125 λ · หมุน 90°`, cls: 'gen' },
              { z: b5at(0.25), label: `0.25 λ · หมุน 180°`, cls: 'y' },
              { z: b5at(0.375), label: `0.375 λ · หมุน 270°`, cls: 'ld' },
            ],
            curves: [
              { zs: swrPath(B5_Z, 0.125), cls: 'gen', arrow: true },
              { zs: swrPath(zFromGamma(rotateTowardGenerator(b5g, 0.125)), 0.125), cls: 'y', arrow: true },
              { zs: swrPath(zFromGamma(rotateTowardGenerator(b5g, 0.25)), 0.125), cls: 'ld', arrow: true },
              { zs: swrPath(zFromGamma(rotateTowardGenerator(b5g, 0.375)), 0.125), cls: 'load', arrow: true, dashed: true },
            ],
            caption: `สี่ลูกศรคือสี่ช่วงเท่า ๆ กัน ช่วงละ 0.125 λ = 90° · ครบสี่ช่วงคือ 0.5 λ = 360° จุดกลับมาทับจุดแดงที่ออกเดิน · สังเกตว่าทุกจุดอยู่บนวงเดียวกัน (SWR = ${n(b5swr, 3)}) รัศมีไม่เปลี่ยนเลย เปลี่ยนแต่มุม (คำนวณโดยแอป)` },
          { kind: 'table', title: `เดินเท่านี้ หมุนเท่าไร และไปอยู่ที่ไหน — โหลด z = ${fz(B5_Z, 1)} (คำนวณโดยแอป)`,
            head: ['เดินไป (λ)', 'หมุนไป (องศา)', 'z ที่จุดใหม่', 'สเกล toward generator'],
            rows: [0, 0.05, 0.125, 0.25, 0.375, 0.5].map((d) => [
              n(d, 3),
              `${n(720 * d, 0)}°`,
              fz(b5at(d), 2),
              `${n(wtgFromGamma(rotateTowardGenerator(b5g, d)), 4)} λ`,
            ]),
            caption: 'คอลัมน์ที่สองคือ 720 คูณคอลัมน์แรกตรง ๆ · แถวสุดท้าย (0.5 λ) ให้ z เท่ากับแถวแรกพอดี เพราะครบรอบแล้ว' },
{ kind: 'quiz',
  question: 'หมุนครบหนึ่งรอบเต็ม (360°) บน Smith Chart ตรงกับการเดินบนสายเป็นระยะเท่าไร',
  choices: ['0.25 λ', '0.5 λ', '1 λ', '2 λ'],
  answer: 1,
  explain: `มุมที่หมุนคือ 2βl ไม่ใช่ βl เมื่อ l = λ/2 จึงได้ 2βl = 360° พอดี · ตรวจได้จากเอนจิน เดินจาก z = ${fz(zApp, 1)} ครบ 0.5 λ แล้วได้ z = ${fz(zFromGamma(rotateTowardGenerator(gApp, 0.5)), 1)} คือจุดเดิม`,
  hint: 'คลื่นสะท้อนวิ่งไปกลับ ระยะจึงนับสองเท่า',
  chart: { swr: [swrApp], scale: true, fine: false, table: false,
    points: [
      { z: zApp, label: 'เริ่ม / จบ', cls: 'load' },
      { z: zFromGamma(rotateTowardGenerator(gApp, 0.125)), label: '0.125 λ', cls: 'gen' },
      { z: zFromGamma(rotateTowardGenerator(gApp, 0.25)), label: '0.25 λ', cls: 'y' },
      { z: zFromGamma(rotateTowardGenerator(gApp, 0.375)), label: '0.375 λ', cls: 'ld' },
    ] },
},
        ],
      },
      {
        id: 'rings', title: 'สามวงสเกลรอบกราฟ และวิธีอ่านค่าจากมัน',
        lines: [
          T('รอบนอกของกราฟมีสเกลพิมพ์อยู่สามวง ทั้งสามวงบอกเรื่องเดียวกันคือ "จุดนี้อยู่ที่มุมไหน" เพียงแต่พูดคนละภาษา'),
          K('วงในสุด  ANGLE OF REFLECTION COEFFICIENT (°)  → มุมของ Γ เป็นองศา  −180° ถึง +180°\nวงกลาง   WAVELENGTHS TOWARD GENERATOR        → ระยะเป็น λ นับตามเข็ม   0 ถึง 0.5\nวงนอกสุด  WAVELENGTHS TOWARD LOAD              → ระยะเป็น λ นับทวนเข็ม   0 ถึง 0.5'),
          T('วิธีอ่านเหมือนกันทั้งสามวง คือลากไม้บรรทัดจากจุดศูนย์กลางผ่านจุดที่พล็อตไว้ ต่อออกไปจนชนวงสเกล แล้วอ่านตัวเลขตรงที่เส้นชน · เส้นเดียวให้ค่าครบทั้งสามวง'),
          T('ทั้งสามวงแปลงกลับไปมาได้ด้วยเลขสองตัวเท่านั้น'),
          M('\\angle\\Gamma = 180^\\circ - 720^\\circ \\times (\\text{สเกล toward generator})'),
          M('\\text{สเกล toward load} = 0.5 - \\text{สเกล toward generator}'),
          T(`ลองกับโหลดประจำบทนี้ z = ${fz(B5_Z, 1)} · เส้นไม้บรรทัดเส้นเดียวชนสเกลทั้งสามวง อ่านได้ว่า`),
          R(`\\angle\\Gamma = ${n(b5ang, 2)}^\\circ, \\qquad \\text{toward gen} = ${n(b5wtg, 4)}\\lambda, \\qquad \\text{toward load} = ${n(b5wtl, 4)}\\lambda`),
          T(`ตรวจด้วยสูตร: 180 − 720 × ${n(b5wtg, 4)} = ${n(180 - 720 * b5wtg, 2)}° ตรงกับมุมที่อ่านได้ · และ 0.5 − ${n(b5wtg, 4)} = ${n(b5wtl, 4)} λ ตรงกับวงนอกสุด (คำนวณโดยแอป)`),
          W('**อย่าอ่านสลับวง** · สองวงนอกหน้าตาเหมือนกันมาก ต่างกันแค่ทิศที่ตัวเลขเพิ่ม · เลือกใช้วงเดียวตลอดทั้งข้อ แล้วอย่าเปลี่ยนกลางคัน'),
          N('ทำไมถึงเป็น 720 ต่อหนึ่ง λ · เพราะหนึ่งรอบ 360° กินระยะแค่ 0.5 λ ถ้าเดินเต็ม 1 λ ก็ได้สองรอบ = 720° · เลข 720 จึงเป็นเลข 2 ตัวเดิมที่ซ่อนอยู่ใน 2βl นั่นเอง'),
        ],
        figures: [
          { kind: 'chart', title: 'ลากเส้นจากศูนย์กลางผ่านจุด แล้วอ่านตัวเลขตรงที่เส้นชนสเกล',
            scale: true, fine: false, table: false,
            swr: [b5swr],
            points: [{ z: B5_Z, label: `z = ${fz(B5_Z, 1)}`, cls: 'load' }],
            rays: [{ z: B5_Z, cls: 'load', label: `${n(b5ang, 0)}° · ${n(b5wtg, 3)}λ` }],
            caption: `เส้นประคือไม้บรรทัด จุดกลม 3 จุดคือที่เส้นชนสเกลทั้งสามวง · อ่านจากในออกนอก: มุม ${n(b5ang, 2)}° → toward generator ${n(b5wtg, 4)} λ → toward load ${n(b5wtl, 4)} λ · ทั้งสามคือมุมเดียวกัน เขียนคนละแบบ (คำนวณโดยแอป)` },
          { kind: 'table', title: 'จุดสำคัญอ่านได้เท่าไรบนทั้งสามวง (คำนวณโดยแอป)',
            head: ['จุด', 'มุม ∠Γ', 'toward generator', 'toward load'],
            rows: ([[C(0, 0), 'SHORT (z = 0)'], [C(1e9, 0), 'OPEN (z = ∞)'], [B5_Z, `z = ${fz(B5_Z, 1)}`], [C(2, 1), 'z = 2 + j1'], [C(0.2, -0.5), 'z = 0.2 − j0.5']] as [Complex, string][])
              .map(([z, name]) => {
                const g = gammaFromz(z);
                const w = wtgFromGamma(g);
                return [name, `${n(deg(arg(g)), 1)}°`, `${n(w, 4)} λ`, `${n(((0.5 - w) % 0.5 + 0.5) % 0.5, 4)} λ`];
              }),
            caption: 'ลองเช็กสักแถว: เอาคอลัมน์ toward generator คูณ 720 แล้วเอา 180 ตั้งลบ จะได้คอลัมน์มุมพอดี · SHORT อยู่ที่ 0 λ และ 180° ส่วน OPEN อยู่ที่ 0.25 λ และ 0°' },
{ kind: 'quiz',
  question: `จุดหนึ่งอ่านสเกล toward generator ได้ 0.125 λ มุม ∠Γ ของจุดนั้นเป็นเท่าไร`,
  choices: ['90°', '−90°', '45°', '180°'],
  answer: 0,
  explain: 'ใช้สูตร ∠Γ = 180° − 720° × 0.125 = 180° − 90° = 90° · ตรวจอีกทาง: 0.125 λ คือหนึ่งในสี่รอบจาก SHORT ซึ่งอยู่ที่ 180° หมุนตามเข็มไป 90° จึงเหลือ 90°',
  hint: 'แทนลงสูตร ∠Γ = 180° − 720° × (ค่าที่อ่านได้)' },
        ],
      },
      {
        id: 'direction', title: 'เลือกทิศ: ตามเข็ม = ไปทางเครื่องส่ง · ทวนเข็ม = ไปทางโหลด',
        lines: [
          T('รู้แล้วว่าเดินเท่าไรหมุนเท่าไร เหลืออีกข้อเดียวคือหมุนไปทางไหน · เริ่มจากถามตัวเองว่าจุดที่เราสนใจอยู่ "ใกล้เครื่องส่งกว่า" หรือ "ใกล้โหลดกว่า" จุดที่เราเริ่มต้น'),
          T('เครื่องส่ง (generator) คือต้นทางที่ป้อนกำลังเข้ามา ส่วนโหลด (load) คือปลายทางที่ปลายสาย · กฎบนกราฟมีสองบรรทัด และใช้ได้กับกราฟทุกใบในโลก'),
          R('\\text{เดินเข้าหาเครื่องส่ง (Toward Generator)} = \\text{หมุนตามเข็มนาฬิกา}'),
          R('\\text{เดินเข้าหาโหลด (Toward Load)} = \\text{หมุนทวนเข็มนาฬิกา}'),
          K('วิธีจำแบบไม่ต้องท่อง: มองสเกล toward generator (วงกลาง) ตัวเลขมันไล่ขึ้นตามเข็มอยู่แล้ว\nเดินไปทางเครื่องส่ง = ค่าบนสเกลเพิ่มขึ้น = หมุนตามเข็ม\nเดินกลับไปทางโหลด  = ค่าบนสเกลลดลง  = หมุนทวนเข็ม'),
          T('ที่มาของกฎ: ในสูตร Γ(l) = Γ_L e^(−j2βl) มีเครื่องหมายลบอยู่หน้ามุม เมื่อ l เพิ่มขึ้น (เดินออกจากโหลดไปทางเครื่องส่ง) มุมจึงลดลง และมุมที่ลดลงบนระนาบเชิงซ้อนคือการหมุนตามเข็มนาฬิกา'),
          T(`ดูตัวเลขจริงจากภาพข้างล่าง · เริ่มที่ z = ${fz(B5_Z, 1)} ซึ่งอยู่ที่สเกล ${n(b5wtg, 4)} λ แล้วเดิน ${n(B5_D, 2)} λ`),
          K(`ไปทางเครื่องส่ง (แดง)  สเกล ${n(b5wtg, 4)} + ${n(B5_D, 2)} = ${n(b5wtg2, 4)} λ   มุม ${n(b5ang, 1)}° → ${n(b5ang2, 1)}°   ได้ z = ${fz(b5z2, 2)}\nไปทางโหลด     (น้ำเงิน) สเกล ${n(b5wtg, 4)} − ${n(B5_D, 2)} = ${n(b5wtgBack, 4)} λ   มุม ${n(b5ang, 1)}° → ${n(deg(arg(b5gBack)), 1)}°   ได้ z = ${fz(b5zBack, 2)}`),
          N(`ระยะเท่ากันเป๊ะ แต่ได้อิมพีแดนซ์คนละค่าเลย · นี่คือเหตุผลที่โจทย์ทุกข้อต้องบอกทิศมาด้วย ไม่ใช่บอกแค่ระยะ · ทั้งสองจุดยังอยู่บนวง SWR = ${n(b5swr, 3)} วงเดิม (คำนวณโดยแอป)`),
          W('ในแอปนี้วงกลางคือ toward generator และวงนอกสุดคือ toward load ตามข้อตกลงมาตรฐาน · กราฟที่พิมพ์จากที่อื่นอาจวางสลับกัน ให้ยึดชื่อที่พิมพ์บนกราฟใบนั้นเสมอ อย่ายึดตำแหน่ง'),
        ],
        figures: [
          { kind: 'chart', title: `ระยะเท่ากัน ${n(B5_D, 2)} λ แต่คนละทิศ ได้คนละจุด`,
            scale: true, fine: false, table: false,
            swr: [b5swr],
            points: [
              { z: B5_Z, label: `เริ่ม z = ${fz(B5_Z, 1)}`, cls: 'load' },
              { z: b5z2, label: `ตามเข็ม → เครื่องส่ง`, cls: 'gen' },
              { z: b5zBack, label: `ทวนเข็ม → โหลด`, cls: 'ld' },
            ],
            curves: [
              { zs: swrPath(B5_Z, B5_D), cls: 'gen', arrow: true, label: 'toward generator' },
              { zs: swrPath(B5_Z, -B5_D), cls: 'ld', arrow: true, label: 'toward load' },
            ],
            rays: [
              { z: b5z2, cls: 'gen', label: `${n(b5wtg2, 3)}λ` },
              { z: b5zBack, cls: 'ld', label: `${n(b5wtgBack, 3)}λ` },
            ],
            caption: `ลูกศรแดงคือเดินเข้าหาเครื่องส่ง หมุนตามเข็ม ค่าบนสเกลเพิ่มจาก ${n(b5wtg, 4)} เป็น ${n(b5wtg2, 4)} λ · ลูกศรน้ำเงินคือเดินกลับไปทางโหลด หมุนทวนเข็ม ค่าลดลงเหลือ ${n(b5wtgBack, 4)} λ · เส้นประสองเส้นคือไม้บรรทัดที่ลากออกไปอ่านสเกลของจุดปลายทั้งสอง (คำนวณโดยแอป)` },
{ kind: 'quiz',
  question: 'จากจุดโหลด ถ้าจะเดินไปทางแหล่งจ่าย (toward generator) ต้องหมุนไปทางไหน',
  choices: ['ตามเข็มนาฬิกา', 'ทวนเข็มนาฬิกา', 'เข้าหาศูนย์กลาง', 'ออกไปทางขอบกราฟ'],
  answer: 0,
  explain: `เครื่องหมายลบใน Γ(l) = Γ_L e^(−j2βl) ทำให้มุมลดลงเมื่อ l เพิ่มขึ้น ซึ่งคือตามเข็มนาฬิกา · ตรวจจากสเกล: z = ${fz(B5_Z, 1)} อยู่ที่ ${n(b5wtg, 4)} λ เดินไป ${n(B5_D, 2)} λ แล้วได้ ${n(b5wtg2, 4)} λ คือค่าที่เพิ่มขึ้น · ตัวเลือก "เข้าหาศูนย์กลาง" ผิดเพราะสายไร้การสูญเสียไม่เปลี่ยนรัศมี`,
  hint: 'ดูว่าตัวเลขบนสเกล toward generator ไล่ขึ้นไปทางไหน',
  chart: { swr: [b5swr], scale: true, fine: false, table: false,
    points: [{ z: B5_Z, label: 'z_L', cls: 'load' }, { z: b5z2, label: 'ตามเข็ม', cls: 'gen' }, { z: b5zBack, label: 'ทวนเข็ม', cls: 'ld' }],
    curves: [{ zs: swrPath(B5_Z, B5_D), cls: 'gen', arrow: true }, { zs: swrPath(B5_Z, -B5_D), cls: 'ld', arrow: true }] },
},
        ],
      },
      {
        id: 'scale', title: 'ทำโจทย์ทีละขั้น: อ่าน → บวก → อ่านกลับ',
        lines: [
          T('ตัวเลขรอบกราฟเป็น "พิกัด" ไม่ใช่ "ระยะจากโหลด" · เหมือนหน้าปัดนาฬิกา ที่เข็มจะเริ่มตรงไหนก็ได้ ระยะที่เดินคือผลต่างของพิกัดสองค่า ไม่ใช่ตัวพิกัดเอง'),
          T('ทุกโจทย์เรื่องระยะทำได้ด้วยสี่ขั้นนี้เสมอ'),
          K('ขั้น 1  ลากไม้บรรทัดจากศูนย์กลางผ่านจุดเริ่ม ออกไปชนสเกล → อ่าน "พิกัดเริ่ม"\nขั้น 2  บวกระยะที่โจทย์ให้ (ถ้าไปทางเครื่องส่ง) หรือลบ (ถ้าไปทางโหลด)\nขั้น 3  ถ้าผลลัพธ์เกิน 0.5 ให้ลบ 0.5 · ถ้าติดลบ ให้บวก 0.5  (กราฟวนซ้ำทุกครึ่งคลื่น)\nขั้น 4  ลากไม้บรรทัดกลับเข้าไปที่พิกัดใหม่ ตัดวง SWR ตรงไหน จุดนั้นคือคำตอบ'),
          T(`ทำตามสี่ขั้นกับโจทย์จริง: โหลด z = ${fz(B5_Z, 1)} เดินไปทางเครื่องส่ง ${n(B5_D, 2)} λ`),
          M(`\\text{ขั้น 1:}\\quad \\text{พิกัดเริ่ม} = ${n(b5wtg, 4)}\\lambda`),
          M(`\\text{ขั้น 2:}\\quad ${n(b5wtg, 4)} + ${n(B5_D, 2)} = ${n(b5wtg + B5_D, 4)}\\lambda`),
          M(`\\text{ขั้น 3:}\\quad ${n(b5wtg + B5_D, 4)} < 0.5 \\;\\Rightarrow\\; \\text{ไม่ต้องลบ พิกัดปลาย} = ${n(b5wtg2, 4)}\\lambda`),
          R(`\\text{ขั้น 4:}\\quad z = ${tc(b5z2, 3)} \\qquad (SWR = ${n(b5swr, 3)} \\text{ เท่าเดิม})`),
          T('ทีนี้กรณีที่คนพลาดบ่อยที่สุด คือเดินแล้ววนข้ามเลข 0.5'),
          M(`${n(B5_WRAP_START, 2)} + ${n(B5_WRAP_D, 2)} = ${n(B5_WRAP_START + B5_WRAP_D, 2)} \\;\\Rightarrow\\; ${n(B5_WRAP_START + B5_WRAP_D, 2)} - 0.50 = ${n(B5_WRAP_START + B5_WRAP_D - 0.5, 2)}`),
          W(`พิกัดปลายคือ ${n(B5_WRAP_START + B5_WRAP_D - 0.5, 2)} แต่ระยะที่เดินจริงยังเป็น ${n(B5_WRAP_D, 2)} λ ไม่ใช่ ${n(B5_WRAP_START + B5_WRAP_D - 0.5, 2)} λ · การลบ 0.5 เป็นแค่การพับตัวเลขให้อยู่ในหน้าปัด ไม่ได้ทำให้เดินน้อยลง`),
          T('เดินย้อนทิศก็ใช้หลักเดียวกัน แค่กลายเป็นลบ แล้วถ้าติดลบให้บวก 0.5 กลับเข้ามา'),
          M('0.05 - 0.10 = -0.05 \\;\\Rightarrow\\; -0.05 + 0.50 = 0.45'),
          N('ถ้าโจทย์ให้พิกัดเริ่มกับพิกัดปลายมา แล้วถามว่าเดินเท่าไร จะมีคำตอบได้หลายค่าเสมอ เช่น จาก 0.45 ไป 0.05 ทางเครื่องส่ง เดิน 0.10 λ ก็ถึง เดิน 0.60 λ หรือ 1.10 λ ก็ถึงเหมือนกัน · ต้องใช้เงื่อนไข "สายสั้นที่สุด" หรือความยาวจริงของสายมาช่วยเลือก'),
        ],
        figures: [
          { kind: 'chart', title: `สี่ขั้นในภาพเดียว: จาก ${n(b5wtg, 4)} λ เดินไป ${n(B5_D, 2)} λ ถึง ${n(b5wtg2, 4)} λ`,
            scale: true, fine: false, table: false,
            swr: [b5swr],
            points: [
              { z: B5_Z, label: `เริ่ม ${n(b5wtg, 3)}λ`, cls: 'load' },
              { z: b5z2, label: `ปลาย ${n(b5wtg2, 3)}λ`, cls: 'gen' },
            ],
            rays: [
              { z: B5_Z, cls: 'load', label: `ขั้น 1 · ${n(b5wtg, 4)}λ` },
              { z: b5z2, cls: 'gen', label: `ขั้น 4 · ${n(b5wtg2, 4)}λ` },
            ],
            curves: [{ zs: swrPath(B5_Z, B5_D), cls: 'gen', arrow: true, label: `ขั้น 2 · เดิน ${n(B5_D, 2)}λ` }],
            caption: `เส้นประแดงคือไม้บรรทัดของขั้น 1 (อ่านพิกัดเริ่ม) · ลูกศรหนาคือขั้น 2 (เดินไปตามวง SWR) · เส้นประของจุดปลายคือขั้น 4 (ลากกลับเข้ามาอ่านคำตอบ) · ขั้น 3 ไม่ต้องใช้ในข้อนี้เพราะผลรวมยังไม่ถึง 0.5 · z ปลายทาง = ${fz(b5z2, 3)} (คำนวณโดยแอป)` },
          { kind: 'chart', title: `กรณีวนข้าม 0.5: เริ่มที่ ${n(B5_WRAP_START, 2)} λ เดินไปอีก ${n(B5_WRAP_D, 2)} λ`,
            scale: true, fine: false, table: false,
            swr: [b5swr],
            points: [
              { z: zFromGamma(rotateTowardGenerator(b5g, B5_WRAP_START - b5wtg)), label: `เริ่ม ${n(B5_WRAP_START, 2)}λ`, cls: 'load' },
              { z: zFromGamma(rotateTowardGenerator(b5g, B5_WRAP_START + B5_WRAP_D - b5wtg)), label: `ปลาย ${n(B5_WRAP_START + B5_WRAP_D - 0.5, 2)}λ`, cls: 'gen' },
            ],
            rays: [
              { z: zFromGamma(rotateTowardGenerator(b5g, B5_WRAP_START - b5wtg)), cls: 'load', label: `${n(B5_WRAP_START, 2)}λ` },
              { z: zFromGamma(rotateTowardGenerator(b5g, B5_WRAP_START + B5_WRAP_D - b5wtg)), cls: 'gen', label: `${n(B5_WRAP_START + B5_WRAP_D - 0.5, 2)}λ` },
            ],
            curves: [{ zs: swrPath(zFromGamma(rotateTowardGenerator(b5g, B5_WRAP_START - b5wtg)), B5_WRAP_D), cls: 'gen', arrow: true, label: `เดิน ${n(B5_WRAP_D, 2)}λ` }],
            caption: `ลูกศรเดินข้ามเลข 0 ของสเกลไปจริง ๆ · พิกัดจึงพับจาก ${n(B5_WRAP_START + B5_WRAP_D, 2)} กลับมาเป็น ${n(B5_WRAP_START + B5_WRAP_D - 0.5, 2)} λ แต่ความยาวของลูกศรยังเท่ากับ ${n(B5_WRAP_D, 2)} λ เท่าเดิม · ดูที่ "ความยาวลูกศร" ไม่ใช่ที่ "ตัวเลขพิกัด"` },
{ kind: 'quiz', question: 'ใช้สเกล Toward Generator เริ่มที่ 0.45 เดินไปทางเครื่องส่งอีก 0.10 λ พิกัดปลายเป็นเท่าไร?',
  choices: ['0.55', '0.05', '0.35', '0.10'], answer: 1,
  hint: 'บวกก่อน แล้วค่อยพับให้อยู่ในช่วง 0 ถึง 0.5',
  explain: '0.45 + 0.10 = 0.55 เกินหนึ่งรอบของสเกล จึงลบ 0.50 เหลือ 0.05 · ระยะที่เดินยังเป็น 0.10 λ ไม่ใช่ 0.05 λ' },
{ kind: 'quiz',
  question: `z_L = ${fz(zApp, 1)} อยู่ที่สเกล ${n(wtgZApp, 4)} λ ถ้าเดินไปทางแหล่งจ่ายอีก ${n(dApp, 3)} λ จะไปอยู่ที่สเกลเท่าไร`,
  choices: [
    `${n(((wtgZApp - dApp) % 0.5 + 0.5) % 0.5, 4)} λ`,
    `${n(dApp, 4)} λ`,
    `${n(wtgFromGamma(gApp2), 4)} λ`,
    `${n(wtgZApp, 4)} λ`,
  ],
  answer: 2,
  hint: 'toward generator คือบวก ไม่ใช่ลบ',
  explain: `toward generator คือบวกเข้ากับค่าเริ่มต้น: ${n(wtgZApp, 4)} + ${n(dApp, 3)} = ${n(wtgFromGamma(gApp2), 4)} λ (ถ้าเกิน 0.5 ให้ลบ 0.5 ออก) · จุดใหม่คือ z = ${fz(zApp2, 2)} · ตัวเลือกแรกคือเผลอลบ ซึ่งเป็นการเดินกลับไปทางโหลด`,
  chart: { swr: [swrApp], scale: true, fine: false, table: false,
    points: [{ z: zApp, label: 'z_L', cls: 'load' }, { z: zApp2, label: 'จุดใหม่', cls: 'gen' }],
    rays: [{ z: zApp, cls: 'load', label: `${n(wtgZApp, 3)}λ` }, { z: zApp2, cls: 'gen', label: `${n(wtgFromGamma(gApp2), 3)}λ` }],
    curves: [{ zs: swrPath(zApp, dApp), cls: 'gen', arrow: true }] },
},
          { kind: 'table', title: 'ตำแหน่งบนสเกลของจุดสำคัญ (คำนวณโดยแอป)', head: ['z', 'ตำแหน่งบนสเกล toward generator'],
            rows: ([[C(0, 0), 'SHORT'], [C(1e6, 0), 'OPEN'], [C(0.5, 0.5), '0.5 + j0.5'], [C(1.5, -2), '1.5 − j2'], [C(1, 0), 'ศูนย์กลาง (แมตช์)']] as [Complex, string][])
              .map(([z, name]) => [name, abs(gammaFromz(z)) < 1e-10 ? 'ไม่มีมุม จึงไม่ใช้สเกลรอบนอก' : `${n(wtgFromGamma(gammaFromz(z)), 4)} λ`]),
            caption: 'อ่านค่าเริ่มต้นจากตำแหน่งจุดของโจทย์ ไม่ต้องจำตารางนี้ · จุดศูนย์กลางไม่มีมุม จึงไม่กำหนดพิกัดสเกลให้' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b6', num: '6', title: 'แอดมิตแตนซ์และการหมุน 180°', titleTh: 'ทำไม Z → Y จึงเป็นการหมุนครึ่งรอบ',
    intro: 'แอดมิตแตนซ์คืออีกวิธีหนึ่งในการบอกความสัมพันธ์ระหว่างแรงดันกับกระแสของโหลดเดียวกัน เราใช้ Z สะดวกเมื่อต่ออนุกรม และใช้ Y สะดวกเมื่อต่อขนาน บทนี้เริ่มจากภาพทดลอง แล้วแยกให้ชัดระหว่าง “เปลี่ยนวิธีอ่านค่า” กับ “เดินบนสายจริง”',
    sections: [
      {
        id: 'y', title: 'โหลดเดียวกัน อ่านได้ทั้ง Z และ Y',
        lines: [
          T('หลังทดลองภาพด้านบน ให้จำความหมายก่อนสูตร: อิมพีแดนซ์ Z มองเป็น “แรงดันต่อกระแส” ส่วนแอดมิตแตนซ์ Y มองกลับกันเป็น “กระแสต่อแรงดัน” โหลดไม่ได้เปลี่ยน เพียงเปลี่ยนภาษาที่ใช้อธิบาย'),
          M('Y = \\frac{1}{Z} = G + jB \\quad [\\text{S}], \\qquad y = \\frac{1}{z} = g + jb'),
          K('Z = R + jX      → R: resistance, X: reactance\nY = G + jB      → G: conductance, B: susceptance\nz และ y          → ค่าปกติ ไม่มีหน่วย'),
          T('เหตุผลที่ Y มีประโยชน์มากคือวงจรขนาน: แขนงทุกแขนงรับแรงดันเดียวกัน กระแสจึงรวมกัน และ Y ของแต่ละแขนงบวกกันได้ตรง ๆ ส่วนวงจรอนุกรมมีกระแสเดียวกัน จึงบวก Z ได้ตรง ๆ'),
          R('\\text{อนุกรม: } Z_{total}=Z_1+Z_2 \\qquad \\text{ขนาน: } Y_{total}=Y_1+Y_2'),
          T('เมื่อกลับส่วนจำนวนเชิงซ้อน เครื่องหมายส่วนจินตภาพจะกลับด้าน แต่ต้องหารทั้งส่วนจริงและส่วนจินตภาพด้วย r²+x² ด้วย จึงห้ามเพียงสลับเครื่องหมาย j'),
          M('y = \\frac{1}{r + jx} = \\frac{r - jx}{r^2 + x^2} \\;\\Rightarrow\\; g = \\frac{r}{r^2+x^2}, \\quad b = \\frac{-x}{r^2+x^2}'),
          W('จุดตรวจคำตอบ: **ถ้า x เป็นบวกแบบเหนี่ยวนำ ค่า b ต้องเป็นลบ** และถ้า x เป็นลบแบบเก็บประจุ ค่า b ต้องเป็นบวก'),
          T('เมื่อต้องใช้ Smith Chart เราแปลงเป็นค่าปกติ สาย Z₀ มีค่าอ้างอิงฝั่งแอดมิตแตนซ์ Y₀ = 1/Z₀'),
          M('Y_0 = \\frac{1}{Z_0}, \\qquad y = \\frac{Y}{Y_0} = Y Z_0'),
          T('สองทางให้คำตอบเดียวกันเสมอ เพราะ y = Y/Y₀ = (1/Z)·Z₀ = Z₀/Z = 1/z จะกลับส่วนก่อนแล้ว normalize หรือ normalize ก่อนแล้วกลับส่วน ก็ได้เท่ากัน'),
          T(`ตัวอย่างจริง: สาย ${APP_Z0} Ω มี Y₀ = 1/${APP_Z0} = ${n(Y0App, 4)} S · โหลด Z_L = ${fz(APP_ZL, 0)} Ω มี Y_L = 1/Z_L = ${fz(YApp, 4)} S`),
          M(`y_L = \\frac{Y_L}{Y_0} = \\frac{${tc(YApp, 3)}}{${n(Y0App, 3)}} = ${tc(yApp, 0)} \\qquad = \\; \\frac{1}{z_L} = \\frac{1}{${tc(zApp, 1)}}`),
          T('เมื่ออ่าน y จากกราฟแล้ว แปลงกลับเป็นค่าจริงด้วย Y = y/Z₀'),
          M('Y = y\\,Y_0 = \\frac{y}{Z_0}'),
          N('หน่วยของ Y คือซีเมนส์ (S) และมักพบเป็น mS = 10⁻³ S ส่วน y ไม่มีหน่วยเหมือน z · คำว่า immittance เป็นคำรวมที่หมายถึง impedance หรือ admittance'),
        ],
        figures: [
          { kind: 'table', title: 'Y₀ ของสายมาตรฐาน และโหลดตัวเดียวกันในสองโดเมน (คำนวณโดยแอป)',
            head: ['Z₀ (Ω)', 'Y₀ = 1/Z₀ (S)', 'z_L = Z_L/Z₀', 'Y_L = 1/Z_L (S)', 'y_L = Y_L·Z₀'],
            rows: [50, 75, 300].map((Z0) => [n(Z0, 0), n(1 / Z0, 5), fz(normalize(APP_ZL, Z0), 3), fz(YApp, 4), fz(C(YApp.re * Z0, YApp.im * Z0), 3)]),
            caption: `โหลดเดียวกัน Z_L = ${fz(APP_ZL, 0)} Ω · คอลัมน์สุดท้ายเท่ากับ 1/z_L ของคอลัมน์ที่สามเสมอ · Y_L ไม่ขึ้นกับสาย แต่ y_L ขึ้นกับ Z₀ ที่ใช้ normalize` },
        ],
      },
      {
        id: 'convert', title: 'คำนวณตัวอย่าง z = 0.5 + j0.5 ทีละขั้น',
        lines: [
          T('ภาพทดลองให้คำตอบทันทีว่าค่า y อยู่ตรงข้ามเมื่อใช้กริด Z ใบเดียว ตอนนี้ตรวจตัวเลขด้วยการคำนวณ โดยคูณทั้งเศษและส่วนด้วยคอนจูเกต 0.5 − j0.5'),
          M('y = \\frac{1}{0.5 + j0.5} = \\frac{0.5 - j0.5}{0.5^2 + 0.5^2} = \\frac{0.5 - j0.5}{0.5}'),
          R(`y = ${tc(admittance(C(0.5, 0.5)), 0)}`),
          K('ตรวจเร็ว\n1. ส่วนจริง g ต้องเป็นบวก: ได้ +1 ✓\n2. z มี +j ดังนั้น y ต้องมี −j: ได้ −j1 ✓\n3. คูณกลับ: (0.5+j0.5)(1−j1) = 1 ✓'),
          T('บนกราฟมีสองวิธี: เปิดกริด Y แล้วอ่าน y ที่ marker เดิม หรือใช้กริด Z ใบเดียวแล้วลากเส้นผ่านศูนย์กลางไปอ่านตัวเลขที่จุดตรงข้าม ทั้งสองวิธีให้ 1 − j1'),
        ],
        figures: [
{ kind: 'quiz',
  question: `ถ้ามีกริด Z ใบเดียว จุดช่วยอ่าน y ของ z = ${fz(zApp, 1)} อยู่ตรงไหน`,
  choices: [
    'จุดตรงข้ามผ่านศูนย์กลาง ห่างกันครึ่งรอบ',
    'จุดที่สะท้อนข้ามเส้นแนวนอน (คอนจูเกต)',
    'จุดเดิม แต่อ่านบนวงกลม r แทน',
    'จุดที่ใกล้ศูนย์กลางกว่าเดิม เพราะ y เล็กกว่า z',
  ],
  answer: 0,
  explain: `เมื่อนำ y = 1/z ไปอ่านด้วยเส้นของกริด Z ตำแหน่งช่วยอ่านจะอยู่ตรงข้าม 180° และมีรัศมีเท่าเดิม จึงได้ y = ${fz(yApp, 0)} · บนสเกลรอบกราฟจุดทั้งสองห่างกัน ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 3)} λ`,
  chart: { swr: [swrApp], showY: true, scale: false, fine: false,
    points: [{ z: zApp, label: 'z', cls: 'load' }] },
},
          { kind: 'smith', title: 'เมื่อใช้กริด Z ใบเดียว: จุดโหลดกับจุดช่วยอ่าน y อยู่ตรงข้ามกัน',
            points: [{ z: C(0.5, 0.5), label: 'z = 0.5 + j0.5', cls: 'load' }, { z: admittance(C(0.5, 0.5)), label: 'y = 1 − j1 (อ่านบนสเกล Z)', cls: 'y' }],
            curves: [{ zs: [C(0.5, 0.5), C(1, 0), admittance(C(0.5, 0.5))], cls: 'mid', dashed: true }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))],
            caption: 'เส้นประคือวิธีใช้ดินสอช่วยอ่านค่า y บนกริด Z ไม่ได้แปลว่า marker ของโหลดจริงย้ายตำแหน่ง' },
          { kind: 'smith', title: 'อีกวิธี: เปิดกราฟ Y (เขียว) ทับกราฟ Z แล้วอ่านค่าจากจุดเดิม', showY: true,
            points: [{ z: C(0.5, 0.5), label: 'จุดเดียวกัน', cls: 'load' }], gCircles: [1], bCircles: [-1],
            caption: 'จุดเดิมอ่านได้ทั้ง z = 0.5 + j0.5 บนสเกล Z และ y = 1 − j1 บนสเกล Y' },
          { kind: 'lab', label: 'ทดลอง: โหลด 25 + j25 Ω แล้วเปิดปุ่ม Y grid', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 25, X: 25 }]]), showY: true },
        ],
      },
      {
        id: 'why180', title: 'ทำไม “จุดตรงข้าม 180°” จึงใช้หา y ได้',
        lines: [
          T('ต้องแยกสองเหตุการณ์ที่ให้จุดปลายเดียวกัน แต่มีความหมายต่างกัน'),
          K('เหตุการณ์ A: หา y ของโหลดเดิม\n→ ไม่ได้ต่อสาย ไม่ได้ย้ายจุดวัด\n→ จุดตรงข้ามเป็นเพียงตำแหน่งช่วยอ่านตัวเลขบนกริด Z\n\nเหตุการณ์ B: ต่อสายจริงยาว λ/4\n→ จุดวัดย้ายไปอีกระนาบหนึ่ง\n→ อิมพีแดนซ์ปกติที่ต้นสายมีตัวเลขเท่ากับ y ของโหลดเดิม'),
          T('เหตุการณ์ B เป็นที่มาที่จำง่าย เพราะสาย λ/4 ทำให้'),
          M('z_{in} = \\frac{1}{z_L} = y_L'),
          T('และระยะ λ/4 ทำให้จุดอิมพีแดนซ์หมุนครึ่งรอบบน Smith Chart พอดี ดังนั้นปลายทางของการเดินจริงจึงตรงกับตำแหน่งช่วยอ่าน y'),
          M('\\Gamma_{in}=\\Gamma_L e^{-j2\\beta l}, \\quad l=\\lambda/4 \\Rightarrow e^{-j\\pi}=-1'),
          N('ตรวจด้วยจุดสุดขั้ว: สายปลายลัดยาว λ/4 มองจากต้นสายเหมือนปลายเปิด แต่การคำนวณ y = 1/z ของโหลดลัดวงจรเป็นเพียงการกลับส่วนของค่าเดิม'),
        ],
        figures: [
          { kind: 'chart', title: `เดินบนสายจริง 0.25 λ = หมุนครึ่งรอบพอดี (โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω)`,
            scale: true, fine: false,
            points: [
              { z: zApp, label: `z_L = ${fz(zApp, 1)} (สเกล ${n(wtgZApp, 4)} λ)`, cls: 'load' },
              { z: yApp, label: `ปลายทาง = y_L = ${fz(yApp, 0)} (สเกล ${n(wtgYApp, 4)} λ)`, cls: 'y' },
            ],
            curves: [
              { zs: swrPath(zApp, 0.25), cls: 'net', arrow: true },
              { zs: [zApp, C(1, 0), yApp], cls: 'mid', dashed: true },
            ],
            swr: [swrApp],
            caption: `เส้นทึบคือการเดินจริงบนสาย 0.25 λ เส้นประคือการลากตรงผ่านศูนย์กลาง ปลายทางจุดเดียวกัน · ค่าบนสเกลรอบนอกต่างกัน ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 4)} λ พอดี · แอปคำนวณ: สาย 0.25 λ ให้ Z = ${fz(lineInput(APP_ZL, APP_Z0, 0.25, 0), 1)} Ω ซึ่งเท่ากับ Z₀²/Z_L` },
          { kind: 'smith', title: 'ตรวจกฎด้วยคู่ที่สุดขั้ว: SHORT อยู่ตรงข้าม OPEN',
            points: [
              { z: C(0, 0), label: 'z = 0 (SHORT)', cls: 'stub' },
              { z: C(1, 0), label: 'แกนหมุน z = 1', cls: 'in' },
              { z: C(1e6, 0), label: 'z = ∞ (OPEN)', cls: 'stub' },
            ],
            curves: [{ zs: [C(0, 0), C(1, 0), C(1e6, 0)], cls: 'mid', dashed: true }],
            caption: `หมุน 180° จาก z = 0 แล้วไปโผล่ที่ z = ∞ พอดี · ตรวจกับของจริงด้วยเอนจินของแอป: สายปลายลัด ${APP_Z0} Ω ยาว 0.25 λ มองจากต้นสายเห็นเป็น Z = ${fz(stubInput('short', APP_Z0, 0.25), 0)} คือปลายเปิด` },
        ],
      },
      {
        id: 'zvsy', title: 'จุดเดิมบนกราฟ Z/Y กับจุดตรงข้ามบนกราฟ Z ต่างกันอย่างไร',
        lines: [
          T('ตรงนี้เป็นจุดที่ผู้เริ่มต้นสับสนมากที่สุด เพราะประโยค “อ่าน y ที่จุดเดิม” และ “หา y ที่จุดตรงข้าม” ถูกทั้งคู่ แต่พูดถึงกริดคนละแบบ'),
          K('ถ้ามีกริด Z และ Y ซ้อนกัน → marker อยู่ที่เดิม แล้วเปลี่ยนจากอ่านเส้นดำเป็นเส้นเขียว\nถ้ามีกริด Z อย่างเดียว       → ลากไปจุดตรงข้าม แล้วอ่านเลข r,x ตรงนั้นในชื่อ g,b'),
          T(`ตัวอย่างเดียวกัน: ที่ marker จริงอ่านกริด Z ได้ z = ${fz(zApp, 1)} และอ่านกริด Y ได้ y = ${fz(yApp, 0)} สองตัวเลขไม่เท่ากัน แต่บรรยายโหลดเดียวกัน ณ จุดวัดเดียวกัน`),
          T('ตำแหน่งจริงบน Smith Chart คือสัมประสิทธิ์การสะท้อน Γ ซึ่งคำนวณจาก z หรือ y ได้ค่าเดียวกัน เมื่อใช้สูตรของแต่ละโดเมนให้ถูก'),
          M('\\Gamma = \\frac{z-1}{z+1} = \\frac{1-y}{1+y}'),
          R(`\\frac{(${tc(zApp, 1)})-1}{(${tc(zApp, 1)})+1} = ${tc(gApp, 1)} = \\frac{1-(${tc(yApp, 0)})}{1+(${tc(yApp, 0)})}`),
          T('กริด Y คือกริด Z ที่หมุน 180° รอบศูนย์กลาง วิธีจุดตรงข้ามจึงเป็นการเลียนแบบการหมุนกริดด้วยการย้ายปลายดินสอแทน'),
          W('ถ้าเดินต่อจากจุดตรงข้าม ทำได้ แต่ต้องอ่านและเขียนค่าต่อไปทั้งหมดเป็น y = g + jb อย่าเปลี่ยนชื่อกลับเป็น z = r + jx กลางทาง'),
          T(`ตัวอย่าง: เดิน ${n(dApp, 2)} λ จาก marker จริง ได้ z = ${fz(zApp2, 3)} หรือ Z = ${fz(ZApp2, 1)} Ω ส่วนเดินระยะเดียวกันจากจุดช่วยอ่าน จะได้ตัวเลข ${fz(zMirrorWalk, 3)} ซึ่งต้องตีความเป็น y ของระนาบใหม่ ไม่ใช่ z`),
          N('ในแอป ปุ่ม Y grid ใช้วิธี marker อยู่ที่เดิม จึงลดโอกาสสลับชื่อ r,x กับ g,b และยังเห็นเส้นทางของอุปกรณ์ขนานได้โดยตรง'),
        ],
        figures: [
          { kind: 'smith', title: 'วิธี ก "หมุนจุด" — มีแต่กริด Z จุดจึงต้องย้ายไปอีกด้าน',
            points: [
              { z: zApp, label: `z = ${fz(zApp, 1)} (สภาพจริงของสาย)`, cls: 'load' },
              { z: yApp, label: 'อ่าน r, x ที่นี่ แล้วเรียกว่า g, b', cls: 'y' },
            ],
            curves: [{ zs: [zApp, C(1, 0), yApp], cls: 'mid', dashed: true }],
            swr: [swrApp], rCircles: [yApp.re], xCircles: [yApp.im],
            caption: `ดินสอย้ายจาก ${n(wtgZApp, 4)} λ ไป ${n(wtgYApp, 4)} λ บนสเกลรอบนอก — ห่างกัน 0.25 λ · วงกลม r = ${n(yApp.re, 0)} กับส่วนโค้ง x = ${n(yApp.im, 0)} ที่ตัดกันตรงจุดใหม่ คือตัวเลขที่ต้องอ่านว่า g กับ b · จุดนี้ไม่ใช่สภาพของสายที่ระนาบเดิมอีกต่อไป` },
          { kind: 'smith', title: 'วิธี ข "ซ้อนกริด Y" — จุดเดิมไม่ขยับ เปลี่ยนแค่เส้นที่ใช้อ่าน', showY: true,
            points: [{ z: zApp, label: 'จุดเดียว อ่านได้ทั้ง z และ y', cls: 'load' }],
            swr: [swrApp], rCircles: [zApp.re], xCircles: [zApp.im], gCircles: [yApp.re], bCircles: [yApp.im],
            caption: `เส้นดำสองเส้นที่ผ่านจุดคือ r = ${n(zApp.re, 1)} และ x = ${n(zApp.im, 1)} · เส้นเขียวสองเส้นที่ผ่านจุดเดียวกันคือ g = ${n(yApp.re, 0)} และ b = ${n(yApp.im, 0)} · ตำแหน่งบนสเกลรอบนอกยังเป็น ${n(wtgZApp, 4)} λ เท่าเดิม ระยะทางที่จะเดินต่อจึงยังนับจากจุดนี้ได้` },
          { kind: 'table', title: 'หลังหมุนจุดแล้ว อะไรยังใช้ได้ อะไรใช้ไม่ได้ (คำนวณโดยแอป)',
            head: ['สิ่งที่อ่านหรือทำต่อ', 'วิธี ก หมุนจุด (กริด Z ใบเดียว)', 'วิธี ข ซ้อนกริด Y (จุดไม่ขยับ)'],
            rows: [
              ['ค่า g กับ b ที่ได้', `ถูก — ${fz(yApp, 0)}`, `ถูก — ${fz(yApp, 0)}`],
              ['|Γ| และ SWR', `ถูก — ${n(swrApp, 3)} (รัศมีเท่าเดิม)`, `ถูก — ${n(swrApp, 3)} (จุดเดิม)`],
              ['ค่าบนสเกล wavelengths', `เลื่อนไป 0.25 λ เพราะเป็นสเกลช่วยอ่าน Y`, `ตำแหน่ง marker จริงคงเดิม`],
              ['เดินระยะทางต่อจากจุดนี้', `ทำได้ ถ้าอ่านผลต่อเป็น y เช่น ${fz(zMirrorWalk, 3)}`, `ทำได้ และอ่าน z/y จากกริดที่ตรงกัน`],
              ['จุดนี้คือ Γ จริงของระนาบนั้นหรือไม่', 'ไม่ใช่ เป็นตำแหน่งช่วยอ่านบนกริด Z', 'ใช่'],
            ],
            caption: 'สองวิธีให้ค่า g และ b เท่ากัน วิธีซ้อนกริดเหมาะกับการใช้แอป ส่วนวิธีจุดตรงข้ามใช้ได้สะดวกเมื่อมีกระดาษกริด Z เพียงชุดเดียว' },
          { kind: 'chart', title: `ถ้าเดินต่อจากจุดช่วยอ่าน ต้องรักษาภาษา Y: ระยะ ${n(dApp, 2)} λ เท่ากัน`, showY: true, scale: true, fine: false,
            points: [
              { z: zApp, label: `z_L ที่ ${n(wtgZApp, 3)} λ`, cls: 'load' },
              { z: zApp2, label: `ถูก: z = ${fz(zApp2, 2)}`, cls: 'in' },
              { z: yApp, label: `จุดกระจก ที่ ${n(wtgYApp, 3)} λ`, cls: 'y' },
              { z: zMirrorWalk, label: `คู่กัน: อ่านเป็น y = ${fz(zMirrorWalk, 2)}`, cls: 'mid' },
            ],
            curves: [
              { zs: swrPath(zApp, dApp), cls: 'net', arrow: true, label: `เดินจากจุดจริง ${n(dApp, 2)} λ` },
              { zs: swrPath(yApp, dApp), cls: 'y', arrow: true, label: `เดินจากจุดกระจก ${n(dApp, 2)} λ` },
              { zs: [zApp2, C(1, 0), zMirrorWalk], cls: 'mid', dashed: true },
            ],
            swr: [swrApp],
            caption: `ปลายทางยังตรงข้ามกันเสมอ · marker จริงอ่านเป็น z = ${fz(zApp2, 2)} ส่วนจุดช่วยอ่านต้องอ่านเป็น y = ${fz(zMirrorWalk, 2)} · ความผิดเกิดเมื่อเอาตัวเลข y ไปเรียกว่า z ไม่ได้เกิดจากการเดินต่อเอง` },
        ],
      },
      {
        id: 'move', title: 'ใส่อุปกรณ์แล้วจุดเดินไปทางไหน — อนุกรมไถลบนวง r · ขนานไถลบนวง g',
        lines: [
          T('สองหัวข้อก่อนหน้าอธิบายว่า z กับ y คือจุดเดียวกันคนละสเกล หัวข้อนี้เก็บผลที่ใช้งานได้จริงที่สุดของเรื่องนั้น: เมื่อ "ใส่อุปกรณ์ไร้การสูญเสียเพิ่มหนึ่งตัว" จุดบนกราฟจะเดินไปตามเส้นไหน'),
          T('กฎมีสองข้อ และแต่ละข้อพิสูจน์จบในบรรทัดเดียว เพราะอุปกรณ์บวกเข้าไปเฉพาะในโดเมนที่มันต่ออยู่เท่านั้น'),
          T('กฎข้อ 1 — ต่ออนุกรม อิมพีแดนซ์บวกกัน จึงต้องคิดในโดเมน Z'),
          M(`z' = z + jx_s = r + j(x + x_s) \\;\\Rightarrow\\; r' = r`),
          T('ส่วนจริงไม่ถูกแตะเลย จุดจึงไถลไปตาม "วงกลม r คงที่" ซึ่งเป็นเส้นดำที่พิมพ์อยู่บนกราฟ Z อยู่แล้ว'),
          T('กฎข้อ 2 — ต่อขนาน แอดมิตแตนซ์บวกกัน จึงต้องคิดในโดเมน Y'),
          M(`y' = y + jb_p = g + j(b + b_p) \\;\\Rightarrow\\; g' = g`),
          T('คราวนี้ส่วนจริงฝั่งแอดมิตแตนซ์ไม่ถูกแตะ จุดจึงไถลไปตาม "วงกลม g คงที่" ซึ่งเป็นเส้นสีเขียวของกริด Y'),
          N('กริด Y จึงมีไว้ให้เห็นเส้นทางของอุปกรณ์ขนานโดยตรง: เปิดเส้นสีเขียว อ่าน g และ b ที่ marker เดิม แล้วเลื่อนไปตามวง g คงที่'),
          T('ทิศทางบนกราฟชุดนี้: ค่าบวกไปตามเข็ม ค่าลบไปทวนเข็ม โดยแต่ละกรณีอยู่บนเส้นของตัวเอง ไม่ใช่วงกลม SWR'),
          K('อนุกรม L → x_s > 0 → ไถลตามเข็ม บนวง r เดิม   (r ไม่เปลี่ยน)\nอนุกรม C → x_s < 0 → ไถลทวนเข็ม บนวง r เดิม   (r ไม่เปลี่ยน)\nขนาน  C → b_p > 0 → ไถลตามเข็ม บนวง g เดิม   (g ไม่เปลี่ยน)\nขนาน  L → b_p < 0 → ไถลทวนเข็ม บนวง g เดิม   (g ไม่เปลี่ยน)'),
          T('ผลที่ตามมาทันทีคือ "ทางลงจอด" สองเส้น — วงกลม r = 1 กับวงกลม g = 1 เป็นสองวงเดียวบนกราฟที่ลากผ่านจุดศูนย์กลาง'),
          M(`r = 1 \\;\\Rightarrow\\; z = 1 + jx, \\quad x_s = -x \\;\\Rightarrow\\; z' = 1`),
          M(`g = 1 \\;\\Rightarrow\\; y = 1 + jb, \\quad b_p = -b \\;\\Rightarrow\\; y' = 1`),
          T('ทั้งสองบรรทัดจบที่ศูนย์กลางกราฟ ซึ่งเป็นจุดเดียวที่ SWR = 1 — การแมตช์ทุกวิธีจึงเล็งไปที่สองวงนี้ก่อน แล้วค่อยใส่อุปกรณ์ตัวสุดท้ายหักล้างส่วนจินตภาพที่เหลือ'),
          T(`ลองกับตัวอย่างประจำคอร์ส z = ${fz(zApp, 1)} ซึ่งมี y = ${fz(yApp, 0)}`),
          R(`r = ${n(zApp.re, 1)} \\neq 1 \\qquad \\text{แต่} \\qquad g = ${n(yApp.re, 0)}`),
          T('อ่านสองค่านี้ออกก็รู้คำตอบทันที: โหลดตัวนี้แมตช์ได้ด้วยอุปกรณ์ขนานตัวเดียว แต่แมตช์ด้วยอุปกรณ์อนุกรมตัวเดียวไม่ได้'),
          T(`ฝั่งขนาน — จุดนั่งอยู่บนวง g = 1 พอดีอยู่แล้ว ใส่ susceptance ขนาน b_p = ${n(MOVE_B1, 0)} เพื่อหักล้าง b = ${n(yApp.im, 0)} ก็จบงาน`),
          R(`y' = (${tc(yApp, 0)}) + j${n(MOVE_B1, 0)} = 1 \\;\\Rightarrow\\; z' = ${tc(MOVE_ZB1, 0)} \\;\\Rightarrow\\; SWR = ${n(swrFromGamma(gammaFromz(MOVE_ZB1)), 3)}`),
          T(`ฝั่งอนุกรม — จุดนั่งอยู่บนวง r = ${n(zApp.re, 1)} ใส่ x_s เท่าไรส่วนจริงก็ยังเป็น ${n(zApp.re, 1)} จึงไม่มีทางถึงศูนย์กลาง ค่าที่ดีที่สุดคือ x_s = ${n(MOVE_XBEST, 2)} ซึ่งพาไปได้แค่ z = ${fz(zAfterX(MOVE_XBEST), 1)}`),
          R(`SWR_{\\min} = ${n(MOVE_SWR_XBEST, 3)} \\qquad \\text{(ดีที่สุดของอุปกรณ์อนุกรมตัวเดียว — ยังไม่แมตช์)}`),
          T('วิธีแก้ของฝั่งอนุกรมคือ "เดินก่อน แล้วค่อยใส่" — ต่อสายอีกนิดให้จุดวิ่งบนวงกลม SWR จนไปนั่งบนวง r = 1 แล้วจึงใส่ reactance อนุกรม (แอปคำนวณระยะให้)'),
          M(`d = ${n(MOVE_DR1, 4)}\\lambda \\;\\Rightarrow\\; z = ${tc(MOVE_ZR1, 3)} \\;\\Rightarrow\\; x_s = ${n(-MOVE_ZR1.im, 3)} \\;\\Rightarrow\\; z' = 1`),
          N(`สมมาตรกันพอดี: ฝั่งขนานต้องเดินหาวง g = 1 (โหลดตัวนี้อยู่บนวงนั้นแล้ว เอนจินจึงให้ d = ${n(MOVE_SS.dLambda, 3)} λ คือติดสตับที่ขั้วโหลดได้เลย โดยใช้สตับปลายลัดยาว ${n(MOVE_SS.lLambda, 3)} λ) ส่วนฝั่งอนุกรมต้องเดินหาวง r = 1 (ได้ d = ${n(MOVE_DR1, 4)} λ) · ขั้นตอนหกข้อของ single stub ในบทที่ 9 ก็คือกฎข้อ 2 ที่ทำเต็มรูปแบบ`),
          W('กฎสองข้อนี้ใช้ได้เฉพาะอุปกรณ์ก้อนเดียวที่ต่ออยู่ ณ ระนาบเดียวกัน (L, C หรือสตับ) · **ถ้าสิ่งที่เพิ่มเข้ามาคือสายส่ง จุดจะเดินบนวงกลม SWR แทน** ไม่ใช่วง r และไม่ใช่วง g'),
          K('เส้นทางที่เป็นไปได้บนกราฟมีสามแบบเท่านั้น\n  ต่อสายเพิ่ม     → วิ่งบนวงกลม SWR คงที่  (|Γ| เท่าเดิม เปลี่ยนแต่มุม)\n  ใส่อุปกรณ์อนุกรม → ไถลบนวงกลม r คงที่    (r เท่าเดิม)\n  ใส่อุปกรณ์ขนาน   → ไถลบนวงกลม g คงที่    (g เท่าเดิม)'),
          N('รูปทุกรูปในหัวข้อนี้ใช้สีชุดเดียวกัน: ชมพู = เดินไปตามสาย · แดง = อุปกรณ์อนุกรม (โดเมน Z) · เขียวน้ำเงิน = อุปกรณ์ขนาน (โดเมน Y) · เขียว = จุดที่แมตช์แล้ว'),
          N('ข้อควรระวังที่ต่อจากหัวข้อก่อนโดยตรง: เวลาไถลบนวง g ต้องใช้ "วิธี ข ซ้อนกริด Y" คือจุดไม่ขยับแล้วอ่านเส้นเขียว · ถ้าเผลอหมุนจุดไปฝั่งกระจกก่อนแล้วไถลบนวง r ที่นั่น ตัวเลขจะดูสมเหตุสมผลทุกอย่าง แต่เป็นคำตอบของอุปกรณ์คนละชนิด'),
        ],
        figures: [
          { kind: 'chart', title: `สองเส้นทางจากจุดเดียวกัน: อนุกรมไถลบนวง r = ${n(zApp.re, 1)} · ขนานไถลบนวง g = ${n(yApp.re, 0)}`,
            showY: true, scale: false, fine: false,
            points: [
              { z: zApp, label: `เริ่มที่ z = ${fz(zApp, 1)} (y = ${fz(yApp, 0)})`, cls: 'load' },
              { z: zAfterX(1), label: `อนุกรม x_s = +1 ได้ z = ${fz(zAfterX(1), 1)}`, cls: 'mid' },
              { z: MOVE_ZB1, label: `ขนาน b_p = +${n(MOVE_B1, 0)} ได้ z = ${fz(MOVE_ZB1, 0)} แมตช์`, cls: 'in' },
              { z: zAfterB(-1), label: `ขนาน b_p = −1 ได้ z = ${fz(zAfterB(-1), 2)}`, cls: 'y' },
            ],
            curves: [
              { zs: seriesPath(zApp, 1), cls: 'load', arrow: true, label: 'อนุกรม +jx' },
              { zs: seriesPath(zApp, -1), cls: 'load', dashed: true, label: 'อนุกรม −jx' },
              { zs: shuntPath(zApp, MOVE_B1), cls: 'y', arrow: true, label: 'ขนาน +jb' },
              { zs: shuntPath(zApp, -1), cls: 'y', dashed: true, label: 'ขนาน −jb' },
            ],
            swr: [swrApp], rCircles: [zApp.re], gCircles: [yApp.re],
            caption: `เส้นแดงทั้งสองเส้นอยู่บนวง r = ${n(zApp.re, 1)} ตลอด ไม่ว่าจะใส่ x_s เท่าไร · เส้นเขียวน้ำเงินทั้งสองเส้นอยู่บนวง g = ${n(yApp.re, 0)} ตลอด · เส้นทึบคือค่าบวก (ตามเข็ม) เส้นประคือค่าลบ (ทวนเข็ม) · วงกลม SWR เดิม (${n(swrApp, 3)}) วาดไว้ให้เทียบ — อุปกรณ์พาจุดออกจากวงนั้นเสมอ ต่างจากการต่อสายที่วิ่งอยู่บนวงนั้น` },
          { kind: 'smith', title: 'ทางลงจอดสองเส้น: วง r = 1 สำหรับอุปกรณ์อนุกรม และวง g = 1 สำหรับอุปกรณ์ขนาน',
            showY: true, rCircles: [1], gCircles: [1],
            points: [
              { z: C(1, 1), label: 'z = 1 + j1 อยู่บนวง r = 1', cls: 'mid' },
              { z: zApp, label: `z = ${fz(zApp, 1)} อยู่บนวง g = 1`, cls: 'load' },
              { z: C(1, 0), label: 'ศูนย์กลาง z = 1', cls: 'in' },
            ],
            curves: [
              { zs: seriesPath(C(1, 1), -1), cls: 'load', arrow: true, label: 'อนุกรม x_s = −1' },
              { zs: shuntPath(zApp, MOVE_B1), cls: 'y', arrow: true, label: `ขนาน b_p = +${n(MOVE_B1, 0)}` },
            ],
            caption: `สองวงนี้ตัดกันที่ศูนย์กลางพอดี จึงเป็นทางเดียวที่อุปกรณ์ตัวเดียวจะพาจุดเข้าเส้นชัยได้ · อยู่บนวง r = 1 เมื่อไร อุปกรณ์อนุกรมตัวเดียวจบงาน · อยู่บนวง g = 1 เมื่อไร อุปกรณ์ขนานตัวเดียวจบงาน · จุดที่ไม่ได้อยู่บนวงไหนเลย ต้องใช้อย่างน้อยสองขั้นเสมอ` },
          { kind: 'chart', title: 'ถ้าจะใช้อุปกรณ์อนุกรมกับโหลดตัวนี้ ต้องเดินไปหาวง r = 1 ก่อน',
            scale: true, fine: false,
            points: [
              { z: zApp, label: `z_L ที่สเกล ${n(wtgZApp, 3)} λ`, cls: 'load' },
              { z: MOVE_ZR1, label: `เดิน ${n(MOVE_DR1, 4)} λ ได้ z = ${fz(MOVE_ZR1, 2)}`, cls: 'mid' },
              { z: C(1, 0), label: `ใส่ x_s = ${n(-MOVE_ZR1.im, 2)} แล้วแมตช์`, cls: 'in' },
            ],
            curves: [
              { zs: swrPath(zApp, MOVE_DR1), arrow: true, label: 'ขั้นที่ 1 เดินไปตามสาย' },
              { zs: seriesPath(MOVE_ZR1, -MOVE_ZR1.im), cls: 'load', arrow: true, label: 'ขั้นที่ 2 ไถลบนวง r = 1' },
            ],
            swr: [swrApp], rCircles: [1],
            caption: `ขั้นที่ 1 (ชมพู) อยู่บนวงกลม SWR — |Γ| เท่าเดิม แค่หมุน · ขั้นที่ 2 (แดง) อยู่บนวง r = 1 — r เท่าเดิม แต่ |Γ| ลดลงจนเป็นศูนย์ · เทียบกับฝั่งขนานที่ไม่ต้องเดินเลย เพราะโหลดตัวนี้อยู่บนวง g = 1 อยู่แล้ว (เอนจินให้ d = ${n(MOVE_SS.dLambda, 3)} λ)` },
          { kind: 'plot', title: 'ใส่ค่าเท่ากันแต่คนละโดเมน ได้ SWR ต่างกันคนละเรื่อง (คำนวณโดยแอป)',
            xLabel: 'ค่าที่ใส่ — x_s สำหรับอนุกรม / b_p สำหรับขนาน', yLabel: 'SWR หลังใส่อุปกรณ์',
            xMin: -2, xMax: 2, yMin: 1, yMax: 6, xTicks: [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2], yTicks: [1, 2, 3, 4, 5, 6],
            series: [
              { name: 'อนุกรม x_s (ไถลบนวง r)', color: '#dc2626', points: linspace(-2, 2, 161).map((x) => [x, swrFromGamma(gammaFromz(zAfterX(x)))] as [number, number]) },
              { name: 'ขนาน b_p (ไถลบนวง g)', color: '#0f766e', points: linspace(-2, 2, 161).map((b) => [b, swrFromGamma(gammaFromz(zAfterB(b)))] as [number, number]) },
            ],
            markers: [
              { x: MOVE_B1, y: 1, text: `b_p = +${n(MOVE_B1, 0)} ให้ SWR = 1`, color: '#0f766e' },
              { x: MOVE_XBEST, y: MOVE_SWR_XBEST, text: `x_s = ${n(MOVE_XBEST, 2)} ดีที่สุดได้แค่ ${n(MOVE_SWR_XBEST, 2)}`, color: '#dc2626' },
            ],
            caption: `เส้นเขียวน้ำเงินแตะ SWR = 1 ได้ เพราะวง g = ${n(yApp.re, 0)} ลากผ่านศูนย์กลาง · เส้นแดงมีก้นบ่ออยู่ที่ ${n(MOVE_SWR_XBEST, 2)} เพราะวง r = ${n(zApp.re, 1)} ไม่ผ่านศูนย์กลาง เข้าใกล้ที่สุดได้แค่ตอนที่รีแอกแตนซ์รวมเป็นศูนย์ · เส้นที่หลุดออกนอกกรอบด้านบนคือค่าที่ SWR เกิน 6` },
          { kind: 'table', title: `ใส่อุปกรณ์หนึ่งตัวเข้ากับ z = ${fz(zApp, 1)} แล้วได้อะไร (คำนวณโดยแอป)`,
            head: ['อุปกรณ์ที่ใส่', 'z ใหม่', 'y ใหม่', 'r', 'g', 'SWR'],
            rows: [
              ...MOVE_XS.map((x) => {
                const z = zAfterX(x);
                const y = admittance(z);
                return [`อนุกรม x_s = ${n(x, 2)}`, fz(z, 3), fz(y, 3), n(z.re, 3), n(y.re, 3), n(swrFromGamma(gammaFromz(z)), 3)];
              }),
              ...MOVE_BS.map((b) => {
                const z = zAfterB(b);
                const y = admittance(z);
                return [`ขนาน b_p = ${n(b, 2)}`, fz(z, 3), fz(y, 3), n(z.re, 3), n(y.re, 3), n(swrFromGamma(gammaFromz(z)), 3)];
              }),
            ],
            caption: `อ่านคอลัมน์ r กับ g เทียบกัน: แถวอนุกรมทุกแถวมี r = ${n(zApp.re, 3)} เท่ากันหมด ส่วนแถวขนานทุกแถวมี g = ${n(yApp.re, 3)} เท่ากันหมด — นั่นคือกฎสองข้อในรูปตัวเลข · แถวเดียวที่ SWR = 1 คือ b_p = ${n(MOVE_B1, 2)} ซึ่งหักล้าง b = ${n(yApp.im, 0)} พอดี · ค่า x_s และ b_p ที่ยกมาเป็นค่าสมมุติ ส่วนตัวเลขทุกช่องคำนวณโดยแอป` },
          { kind: 'lab', label: `ทดลอง: โหลด ${fz(APP_ZL, 0)} Ω กับตัวเก็บประจุขนาน ${n(MOVE_CPF, 2)} pF — แมตช์ด้วยอุปกรณ์ตัวเดียว`,
            circuit: () => buildCircuit(MOVE_F, APP_Z0, [['capacitor', 'shunt', { C: Number(MOVE_CPF.toFixed(2)) }], ['load', 'series', { R: APP_ZL.re, X: APP_ZL.im }]]),
            showY: true,
            note: `b_p = ${n(MOVE_B1, 0)} คือ B = b_p/Z₀ = ${n(MOVE_B1 / APP_Z0, 3)} S ที่ความถี่สมมุติ ${n(MOVE_F / 1e6, 0)} MHz จึงได้ C = B/(2πf) = ${n(MOVE_CPF, 2)} pF · เปิดปุ่ม Y grid แล้วลากสไลเดอร์ C ดู จุดจะไถลอยู่บนวง g = ${n(yApp.re, 0)} ตลอด และแตะศูนย์กลางที่ค่านี้ค่าเดียว` },
          { kind: 'quiz',
            question: `จุดหนึ่งบนสาย ${APP_Z0} Ω อ่านได้ z = ${fz(zApp, 1)} ถ้าต่อตัวเก็บประจุ "ขนาน" ที่จุดนั้นให้ b_p = +${n(MOVE_B1, 0)} จุดจะไปอยู่ที่ใด`,
            choices: [
              `ไถลไปตามวงกลม g = ${n(yApp.re, 0)} จนถึงศูนย์กลาง z = ${fz(MOVE_ZB1, 0)} คือแมตช์พอดี`,
              `ไถลไปตามวงกลม r = ${n(zApp.re, 1)} ขึ้นไปที่ z = ${fz(zAfterX(MOVE_B1), 1)}`,
              `ไถลไปตามวงกลม g = ${n(yApp.re, 0)} แต่ไปอีกทาง จบที่ y = ${fz(C(yApp.re, yApp.im - MOVE_B1), 0)}`,
              `หมุนไปตามวงกลม SWR เหมือนต่อสายเพิ่ม ค่า SWR จึงยังเป็น ${n(swrApp, 3)} เท่าเดิม`,
            ],
            answer: 0,
            explain: `อุปกรณ์ขนานบวกกันในโดเมนแอดมิตแตนซ์ y' = y + jb_p ส่วนจริงจึงคงที่ที่ g = ${n(yApp.re, 0)} · ที่จุดนี้ y = ${fz(yApp, 0)} บวก j${n(MOVE_B1, 0)} ได้ y' = 1 พอดี ซึ่งคือ z = ${fz(MOVE_ZB1, 0)} และ SWR = ${n(swrFromGamma(gammaFromz(MOVE_ZB1)), 3)} · ตัวเลือกที่ 2 คือคำตอบของ reactance อนุกรม (ใช้กฎผิดโดเมน) ตัวเลือกที่ 3 คือใส่เครื่องหมายกลับด้าน และตัวเลือกที่ 4 คือเส้นทางของสายส่ง ไม่ใช่ของอุปกรณ์`,
            hint: 'ดูก่อนว่าจุดนี้มี g เท่าไร ถ้า g = 1 อยู่แล้ว อุปกรณ์ขนานตัวเดียวก็พาถึงศูนย์กลางได้',
            chart: { showY: true, scale: false, fine: false, swr: [swrApp], rCircles: [zApp.re], gCircles: [yApp.re],
              points: [{ z: zApp, label: `z = ${fz(zApp, 1)}`, cls: 'load' }, { z: C(1, 0), label: 'ศูนย์กลาง', cls: 'in' }],
              curves: [{ zs: shuntPath(zApp, MOVE_B1), cls: 'y', arrow: true }, { zs: seriesPath(zApp, MOVE_B1), cls: 'load', dashed: true }] } },
        ],
      },
      {
        id: 'apps', title: 'สรุปการใช้งานสามกลุ่ม',
        lines: [
          T('หนังสือระบุการใช้งาน Smith Chart ที่สำคัญไว้สามกลุ่ม'),
          K('1. คำนวณ admittance จาก impedance (และกลับกัน)\n2. หา impedance หรือ admittance ที่ตำแหน่งใด ๆ บนสาย พร้อมอ่าน SWR\n3. หาความยาวของสายปลายลัดวงจร เพื่อสร้าง reactance หรือ susceptance ตามที่ต้องการ'),
          T('สามหัวข้อถัดไป (6.7, 6.8, 6.9) ทำทีละกลุ่มพร้อมตัวอย่างที่คำนวณครบ'),
          N('ทั้งสามกลุ่มจะถูกใช้ซ้ำในบทที่ 8 (หม้อแปลง λ/4 ใช้กลุ่มที่ 2) และบทที่ 9 (stub matching ใช้ทั้งสามกลุ่มพร้อมกัน) — ขั้นตอนหกข้อของ stub matching ก็คือการเรียงกลุ่ม 1 → 2 → 3 ต่อกัน'),
          T('รูปข้างล่างเอาทั้งสามกลุ่มมาวางบนกราฟใบเดียวด้วยตัวอย่างประจำคอร์ส จะเห็นว่าแต่ละกลุ่มคือการขยับจุดคนละแบบ ไม่ใช่กราฟคนละใบ'),
        ],
        figures: [
          { kind: 'chart', title: 'สามกลุ่มการใช้งาน วางบนกราฟใบเดียว', scale: false, fine: false,
            points: [
              { z: zApp, label: `z_L = ${fz(zApp, 1)}`, cls: 'load' },
              { z: yApp, label: `① จุดช่วยอ่าน y = ${fz(yApp, 0)}`, cls: 'y' },
              { z: zApp2, label: `② ที่ ${n(dApp, 2)} λ บนสาย`, cls: 'in' },
              { z: normalize(stubInput('short', APP3_Z0, APP3_lw), APP3_Z0), label: `③ ปลายสตับ x = ${n(APP3_XWANT / APP3_Z0, 1)}`, cls: 'stub' },
            ],
            curves: [
              { zs: [zApp, C(1, 0), yApp], cls: 'mid', dashed: true },
              { zs: swrPath(zApp, dApp), cls: 'net', arrow: true },
              { zs: linspace(0, APP3_lw, 40).map((l) => normalize(stubInput('short', APP3_Z0, l), APP3_Z0)), cls: 'stub', arrow: true },
            ],
            swr: [swrApp],
            caption: `① เส้นประผ่านศูนย์กลาง = ย้ายดินสอไปยังจุดช่วยอ่าน y บนกริด Z · ② ลูกศรบนวงกลม SWR = เดินไปตามสายจริง · ③ ลูกศรบนขอบกราฟ = ไล่ความยาวสายปลายลัดจาก SHORT จนได้ x ที่ต้องการ` },
          { kind: 'table', title: 'สามกลุ่มใช้ทำอะไร และขยับจุดอย่างไร',
            head: ['กลุ่ม', 'คำถามของโจทย์', 'การขยับจุดบนกราฟ', `ตัวอย่างประจำคอร์ส (สาย ${APP_Z0} Ω — คำนวณโดยแอป)`],
            rows: [
              ['1', 'ให้ z มา หา y (หรือกลับกัน)', 'marker เดิมบนกริด Y หรือจุดช่วยอ่านตรงข้ามบนกริด Z', `z = ${fz(zApp, 1)} → y = ${fz(yApp, 0)}`],
              ['2', `ที่ระยะ ${n(dApp, 2)} λ จากโหลด มองเห็นอะไร`, 'เดินตามเข็มบนวงกลม SWR คงที่', `Z = ${fz(ZApp2, 1)} Ω, SWR = ${n(swrFromGamma(gApp2), 3)} เท่าที่โหลด`],
              ['3', `อยากได้ X = +${n(APP3_XWANT, 0)} Ω ต้องตัดสายยาวเท่าไร`, 'ไล่ไปตามขอบกราฟ เริ่มจากจุด SHORT', `สายปลายลัดยาว ${n(APP3_lw, 4)} λ ให้ X = ${n(stubInput('short', APP3_Z0, APP3_lw).im, 1)} Ω`],
            ],
            caption: 'สามแถวนี้คือสามหัวข้อถัดไปตามลำดับ · ขั้นตอนของ stub matching ก็คือแถว 1 → 2 → 3 ต่อกัน' },
        ],
      },
      {
        id: 'app1', title: 'การใช้งานที่ 1 — Admittance calculations',
        lines: [
          T('โจทย์แบบนี้คือ "ให้ z มา หา y" หรือกลับกัน ทำได้สองทาง: คิดด้วยเลขเชิงซ้อน หรืออ่านจากกราฟในขั้นตอนเดียว'),
          T('ทางที่หนึ่ง — คิดตรง ๆ ด้วยเลขเชิงซ้อน ใช้ตัวอย่างของหนังสือ z = 0.5 + j0.5'),
          M('y = \\frac{1}{0.5 + j0.5} = \\frac{0.5 - j0.5}{(0.5)^2 + (0.5)^2} = \\frac{0.5 - j0.5}{0.5}'),
          R(`y = ${tc(yApp, 0)} \\qquad (\\text{หนังสือ } 1 - j1)`),
          T('ทางที่สอง — ถ้ามีกริด Z เพียงชุดเดียว ให้ลากเส้นตรงจากจุด z ผ่านศูนย์กลางไปอีกด้านหนึ่ง จุดนั้นเป็น “จุดช่วยอ่าน y” แล้วอ่านตัวเลขเดิมในชื่อ g และ b'),
          T('เหตุผลทางพีชคณิตคือ เมื่อเอา y = 1/z ไปวางด้วยสมการพิกัดของกริด Z ตำแหน่งจะกลับเครื่องหมายพอดี'),
          M('F(z)=\\frac{z-1}{z+1},\\qquad F(y)=\\frac{y-1}{y+1}=\\frac{1/z-1}{1/z+1}=-F(z)'),
          T('จึงได้จุดตรงข้ามที่มีระยะจากศูนย์กลางเท่าเดิม ส่วนสายจริงยาว λ/4 ก็ให้ค่าอินพุตเท่ากับ y_L เช่นกัน'),
          M('z_{in} = \\frac{Z_0^{2}/Z_L}{Z_0} = \\frac{1}{z_L} = y_L'),
          T('และ λ/4 บนสายคือการหมุน 2βl = 2·(2π/λ)·(λ/4) = π นั่นคือครึ่งรอบพอดี'),
          M('\\Gamma_{in}=\\Gamma_L e^{-j\\pi}=-\\Gamma_L \\qquad (|\\Gamma| \\text{ เท่าเดิม มุมต่างกัน } 180^\\circ)'),
          T(`ตรวจด้วยสเกลรอบกราฟ (แอปคำนวณให้): จุด z อยู่ที่ ${n(wtgZApp, 4)} λ จุด y อยู่ที่ ${n(wtgYApp, 4)} λ ต่างกัน ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 4)} λ พอดี — คือ λ/4 ตามที่หนังสือบอกว่าสองจุดนี้ห่างกันหนึ่งในสี่ความยาวคลื่น`),
          T('ทั้งจุดช่วยอ่านและจุดที่เกิดจากสาย λ/4 มีรัศมี |Γ| เท่าเดิม จึงอยู่บนวงกลม SWR เดียวกัน'),
          R(`|\\Gamma| = ${n(abs(gApp), 4)}, \\qquad SWR = ${n(swrApp, 3)} \\qquad \\text{(ทั้งที่จุด } z \\text{ และจุด } y)`),
          W('กับดักที่พบบ่อยที่สุด: เมื่ออ่านจุดตรงข้ามบนกราฟ Z ตัวเลขที่อ่านได้คือ g กับ b ไม่ใช่ r กับ x · ที่ตำแหน่งนั้นเขียนว่า 1 − j1 ต้องอ่านว่า g = 1, b = −1'),
          N('ทางลัดตรวจคำตอบ: SHORT (z = 0) ต้องได้ y = ∞ (OPEN) และศูนย์กลาง (z = 1) ต้องได้ y = 1 คือจุดเดิม เพราะเป็นจุดเดียวที่อยู่ตรงแกนหมุน'),
        ],
        figures: [
          { kind: 'chart', title: 'การใช้งานที่ 1: จุดโหลดกับจุดช่วยอ่าน y บนกริด Z', showY: true, scale: true, fine: false,
            points: [
              { z: zApp, label: `z = ${fz(zApp, 1)}`, cls: 'load' },
              { z: yApp, label: `y = ${fz(yApp, 0)}`, cls: 'y' },
            ],
            curves: [{ zs: [zApp, C(1, 0), yApp], cls: 'mid', dashed: true }],
            swr: [swrApp], gCircles: [1], bCircles: [-1],
            caption: `จุดอีกด้านเป็นเพียงตำแหน่งช่วยอ่านบนกริด Z · ถ้าใช้กริด Y สีเขียว ให้อ่าน y ที่ marker โหลดเดิมได้เลย · สเกลรอบนอกของจุดช่วยอ่านต่างจาก marker ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 3)} λ` },
          { kind: 'table', title: 'ตรวจการหมุน 180° ด้วยหลายค่า (คำนวณโดยแอป จาก y = 1/z)',
            head: ['z', 'y = 1/z', 'สเกล z (λ)', 'สเกล y (λ)', 'ต่างกัน (λ)', 'SWR'],
            rows: [C(0.5, 0.5), C(1, 1), C(2, 0), C(0.4, -0.8), C(1, 0)].map((z) => {
              const y = admittance(z);
              const a = wtgFromGamma(gammaFromz(z));
              const b = wtgFromGamma(gammaFromz(y));
              return [fz(z, 2), fz(y, 3), n(a, 4), n(b, 4), n(((b - a) % 0.5 + 0.5) % 0.5, 4), n(swrFromGamma(gammaFromz(z)), 3)];
            }),
            caption: 'คอลัมน์ "ต่างกัน" ได้ 0.25 λ ทุกแถว ยกเว้นจุดศูนย์กลาง z = 1 ที่อยู่ตรงแกนหมุนพอดี จึงไม่ขยับ' },
          { kind: 'lab', label: `ทดลอง: โหลด ${fz(APP_ZL, 0)} Ω แล้วเปิดปุ่ม Y grid เพื่ออ่าน g กับ b ที่จุดเดียวกัน`, circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 25, X: 25 }]]), showY: true },
        ],
      },
      {
        id: 'app2', title: 'การใช้งานที่ 2 — อิมพีแดนซ์/แอดมิตแตนซ์ที่ตำแหน่งใด ๆ และค่า SWR',
        lines: [
          T('นี่คือการใช้งานที่ตอบคำถามของบทที่ 1 โดยตรง: "ที่ระยะ d จากโหลด เครื่องมองเห็นอะไร" ขั้นตอนมีสี่ข้อ'),
          K('1. normalize: z_L = Z_L / Z₀ แล้วพล็อตจุด\n2. ลากวงกลม SWR คงที่ผ่านจุดนั้น แล้วอ่าน SWR ที่จุดตัดแกนนอนด้านขวา (ค่านี้ใช้ได้ทุกตำแหน่งบนสาย)\n3. อ่านค่าเริ่มต้นบนสเกล toward generator แล้วบวกระยะ d (ตามเข็ม) ถ้าเกิน 0.5 λ ให้ลบ 0.5 ออก\n4. จุดใหม่บนวงกลม SWR คือคำตอบ: อ่านบนสเกล Z ได้ z และอ่านจุดตรงข้ามได้ y'),
          T(`ตัวอย่าง: สาย ${APP_Z0} Ω โหลด Z_L = ${fz(APP_ZL, 0)} Ω หา Z, Y และ SWR ที่ระยะ ${n(dApp, 2)} λ จากโหลดไปทางแหล่งจ่าย`),
          M(`z_L = \\frac{${tc(APP_ZL, 0)}}{${APP_Z0}} = ${tc(zApp, 1)} \\qquad |\\Gamma| = ${n(abs(gApp), 4)} \\;\\Rightarrow\\; SWR = ${n(swrApp, 3)}`),
          T(`เดินบนสเกล: จุดโหลดอยู่ที่ ${n(wtgZApp, 4)} λ บวก ${n(dApp, 2)} λ`),
          M(`${n(wtgZApp, 4)} + ${n(dApp, 2)} = ${n(wtgFromGamma(gApp2), 4)}\\lambda`),
          T('อ่านค่าที่จุดใหม่ (แอปคำนวณจากสมการสายส่งเดียวกัน)'),
          M(`z = ${tc(zApp2, 3)} \\;\\Rightarrow\\; Z = z\\,Z_0 = ${tc(ZApp2, 1)}\\,\\Omega`),
          T('อ่านจุดตรงข้ามบนวงกลมเดียวกัน (การใช้งานที่ 1) จะได้แอดมิตแตนซ์ที่ตำแหน่งเดียวกัน'),
          M(`y = \\frac{1}{z} = ${tc(yApp2, 3)} \\;\\Rightarrow\\; Y = \\frac{y}{Z_0} = ${tc(C(YApp2.re * 1000, YApp2.im * 1000), 3)}\\ \\text{mS}`),
          R(`SWR = ${n(swrFromGamma(gApp2), 3)} \\qquad \\text{(เท่ากับที่โหลด — ไม่เปลี่ยนตามตำแหน่ง)}`),
          T('สังเกตว่าอิมพีแดนซ์เปลี่ยนไปมาก แต่ SWR ตัวเดียวใช้ได้ทั้งสาย — นี่คือเหตุผลที่ SWR meter วัดตำแหน่งไหนก็ได้ค่าเดียวกัน ถ้าสายไร้การสูญเสีย'),
          N('ถ้าโจทย์ให้ระยะไปทางโหลดแทน ให้ลบแทนบวกในขั้นที่ 3 ที่เหลือเหมือนเดิมทุกอย่าง'),
        ],
        figures: [
          { kind: 'chart', title: `การใช้งานที่ 2 บนกราฟตัวเต็ม: เดินจาก z_L ไป ${n(dApp, 2)} λ แล้วอ่านทั้ง z และ y`, showY: true, scale: true, fine: false,
            points: [
              { z: zApp, label: `z_L (สเกล ${n(wtgZApp, 3)}λ)`, cls: 'load' },
              { z: zApp2, label: `z ที่ ${n(dApp, 2)}λ`, cls: 'in' },
              { z: yApp2, label: 'y (จุดตรงข้าม)', cls: 'y' },
            ],
            curves: [
              { zs: swrPath(zApp, dApp), cls: 'net', arrow: true },
              { zs: [zApp2, C(1, 0), yApp2], cls: 'mid', dashed: true },
            ],
            swr: [swrApp],
            caption: 'เส้นทึบ = เดินตามเข็มบนวงกลม SWR · เส้นประ = หมุนอีก 180° เพื่ออ่าน y ที่ตำแหน่งเดียวกัน · สเกลรอบนอกคือค่าที่ใช้บวกระยะในขั้นที่ 3' },
          { kind: 'table', title: `Z, Y และ SWR ที่ตำแหน่งต่าง ๆ บนสาย ${APP_Z0} Ω ที่มีโหลด ${fz(APP_ZL, 0)} Ω (คำนวณโดยแอป)`,
            head: ['d (λ)', 'สเกล toward generator', 'z', 'Z (Ω)', 'y', 'Y (mS)', 'SWR'],
            rows: APP2_DS.map((d) => {
              const Z = lineInput(APP_ZL, APP_Z0, d, 0);
              const z = normalize(Z, APP_Z0);
              const y = admittance(z);
              const Y = admittance(Z);
              return [n(d, 2), `${n(wtgFromGamma(rotateTowardGenerator(gApp, d)), 4)} λ`, fz(z, 3), fz(Z, 1), fz(y, 3), fz(C(Y.re * 1000, Y.im * 1000), 3), n(swrFromGamma(gammaFromZ(Z, APP_Z0)), 3)];
            }),
            caption: 'คอลัมน์ SWR คงที่ทุกแถว เพราะสายไร้การสูญเสีย · แถว 0.25 λ ให้ z เท่ากับ y_L ของแถวแรกพอดี ตามสมบัติ λ/4 · แถว 0.5 λ กลับมาเท่าโหลดเดิม' },
          { kind: 'lab', label: `ทดลอง: โหลด ${fz(APP_ZL, 0)} Ω ผ่านสาย ${n(dApp, 2)} λ แล้วเลื่อน Probe ดูค่าที่ตำแหน่งอื่น`,
            circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.15, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 25, X: 25 }]]), showY: true },
        ],
      },
      {
        id: 'app3', title: 'การใช้งานที่ 3 — ความยาวสายปลายลัดที่ให้ reactance/susceptance ที่ต้องการ',
        lines: [
          T('กลุ่มที่สามใช้กราฟกลับทาง: แทนที่จะให้ความยาวมาแล้วหาค่า เราให้ค่าที่ต้องการมาแล้วหาความยาว'),
          T('สายปลายลัดมีคลื่นสะท้อนเต็มที่ (|Γ| = 1) จุดจึงวิ่งอยู่บนขอบกราฟเสมอ อิมพีแดนซ์ที่มองเห็นจึงเป็นรีแอกแตนซ์ล้วน ไม่มีส่วนจริง'),
          M('Z_{in} = jZ_0\\tan\\beta l \\;\\Rightarrow\\; X = Z_0\\tan\\beta l, \\qquad \\beta l = 360^\\circ \\times \\frac{l}{\\lambda}'),
          T('และในโดเมนแอดมิตแตนซ์ ซึ่งเป็นโดเมนที่ใช้จริงเมื่อสตับต่อขนาน'),
          M('y_{in} = \\frac{1}{jx} = -j\\cot\\beta l \\;\\Rightarrow\\; b = -\\cot\\beta l'),
          T('การอ่านย้อนกลับ — ถ้าโจทย์ให้รีแอกแตนซ์ที่ต้องการมา ให้แก้สมการเดิมหา l'),
          M('l = \\frac{\\lambda}{2\\pi}\\arctan\\!\\left(\\frac{X}{Z_0}\\right) \\qquad \\text{(บวก } 0.5\\lambda \\text{ ถ้าได้ค่าติดลบ)}'),
          T(`ตัวอย่าง: ต้องการ X = +${n(APP3_XWANT, 0)} Ω จากสายปลายลัด ${APP3_Z0} Ω`),
          M(`x = \\frac{${n(APP3_XWANT, 0)}}{${APP3_Z0}} = ${n(APP3_XWANT / APP3_Z0, 2)} \\;\\Rightarrow\\; \\beta l = \\arctan(${n(APP3_XWANT / APP3_Z0, 2)}) = ${n(360 * APP3_lw, 2)}^\\circ`),
          R(`l = \\frac{${n(360 * APP3_lw, 2)}^\\circ}{360^\\circ}\\lambda = ${n(APP3_lw, 4)}\\lambda`),
          T(`ตรวจย้อนกลับด้วยเอนจินของแอป: สายปลายลัด ${APP3_Z0} Ω ยาว ${n(APP3_lw, 4)} λ ให้ X = ${n(stubInput('short', APP3_Z0, APP3_lw).im, 2)} Ω ตรงตามที่ต้องการ`),
          T(`แปลงเป็นความยาวจริงต้องรู้ความถี่: ที่ ${n(APP3_F / 1e6, 0)} MHz ในสายฉนวนอากาศ`),
          M(`\\lambda = \\frac{c}{f} = ${n(APP3_LAM, 3)}\\ \\text{m} \\;\\Rightarrow\\; l = ${n(APP3_lw, 4)} \\times ${n(APP3_LAM, 3)} = ${n(APP3_lw * APP3_LAM * 100, 1)}\\ \\text{cm}`),
          W('ถ้าสายมี velocity factor (เช่น RG-58 มี vf ≈ 0.66) ต้องใช้ λ = vf·c/f ความยาวจริงจะสั้นลงตามสัดส่วนนั้น'),
          N('หนังสือพูดถึงสายปลายลัดเป็นหลัก เพราะปลายเปิดมีแนวโน้มแผ่คลื่นออกไป (หัวข้อ 7.2) · สายปลายเปิดใช้สูตรเดียวกันแต่เลื่อนไป 0.25 λ คือ X = −Z₀ cot βl'),
        ],
        figures: [
{ kind: 'quiz',
  question: 'ต้องการรีแอกแตนซ์ x = +1 จากสายปลายลัด ต้องตัดสายยาวเท่าไร',
  choices: [
    `${n(shortLenForX(1) / 2, 4)} λ`,
    `${n(shortLenForX(1), 3)} λ`,
    `${n(0.25, 2)} λ`,
    `${n(shortLenForX(-1), 3)} λ`,
  ],
  answer: 1,
  explain: `x = tan βl ดังนั้น βl = arctan(1) = 45° และ 45°/360° = ${n(shortLenForX(1), 3)} λ · ตรวจย้อนด้วยเอนจิน สายปลายลัด ${APP3_Z0} Ω ยาว ${n(shortLenForX(1), 3)} λ ให้ X = ${n(stubInput('short', APP3_Z0, shortLenForX(1)).im, 1)} Ω คือ x = +1 พอดี`,
  chart: { xCircles: [1], scale: true, fine: false,
    points: [{ z: C(0, 0), label: 'SHORT (l = 0)', cls: 'stub' }, { z: C(0, 1), label: 'ค่าที่ต้องการ x = +1', cls: 'in' }] },
},
          { kind: 'table', title: `สายปลายลัด ${APP3_Z0} Ω ให้ค่าอะไรบ้าง (คำนวณโดยแอป จาก X = Z₀ tan βl)`,
            head: ['l (λ)', 'βl', 'X (Ω)', 'x = X/Z₀', 'b = −1/x', 'ลักษณะ'],
            rows: APP3_LS.map((l) => {
              const Zs = stubInput('short', APP3_Z0, l);
              const x = isFiniteC(Zs) ? Zs.im / APP3_Z0 : Infinity;
              const kind = !isFiniteC(Zs) ? 'resonance (เหมือน LC ขนาน)' : Zs.im > 0 ? 'inductive' : 'capacitive';
              return [n(l, 3), `${n(360 * l, 0)}°`, isFiniteC(Zs) ? n(Zs.im, 1) : '∞', Number.isFinite(x) ? n(x, 3) : '∞', Number.isFinite(x) ? n(-1 / x, 3) : '0.000', kind];
            }),
            caption: 'สั้นกว่า 0.25 λ ได้ inductive · ยาวกว่านั้นได้ capacitive · ที่ 0.25 λ พอดี X → ∞ และ b = 0 · ค่าซ้ำทุก 0.5 λ' },
          { kind: 'table', title: `กลับทาง: อยากได้ x เท่านี้ ต้องตัดสายปลายลัดยาวเท่าไร (${APP3_Z0} Ω, คำนวณโดยแอป)`,
            head: ['x ที่ต้องการ', 'X = x·Z₀ (Ω)', 'l (λ)', 'ตรวจย้อน: X ที่ได้จริง (Ω)'],
            rows: APP3_XS.map((x) => {
              const l = shortLenForX(x);
              return [n(x, 2), n(x * APP3_Z0, 1), n(l, 4), n(stubInput('short', APP3_Z0, l).im, 1)];
            }),
            caption: 'คอลัมน์สุดท้ายต้องเท่ากับคอลัมน์ที่สองเสมอ ใช้เป็นวิธีตรวจคำตอบ · ค่า x ติดลบต้องใช้สายยาวกว่า 0.25 λ' },
          { kind: 'chart', title: 'บนกราฟตัวเต็ม: เริ่มที่ SHORT แล้วเดินไปตามขอบ (|Γ| = 1) จนถึงค่าที่ต้องการ', scale: true, fine: false,
            points: [
              { z: C(0, 0), label: 'SHORT (l = 0)', cls: 'stub' },
              { z: C(0, APP3_XWANT / APP3_Z0), label: `x = +${n(APP3_XWANT / APP3_Z0, 2)} ที่ l = ${n(APP3_lw, 3)}λ`, cls: 'in' },
              { z: C(0, 1), label: 'x = +1 ที่ l = 0.125λ', cls: 'mid' },
            ],
            curves: [{ zs: linspace(0.0005, APP3_lw, 40).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'stub', arrow: true }],
            xCircles: [APP3_XWANT / APP3_Z0],
            caption: `บนสเกล wavelengths toward generator จุด SHORT อยู่ที่ ${n(wtgShort, 3)} λ พอดี (จุด OPEN อยู่ที่ ${n(wtgOpen, 3)} λ) ค่าที่อ่านได้บนสเกลจึงคือความยาวสตับโดยตรง` },
          { kind: 'lab', label: `ทดลอง: สายปลายลัด ${APP3_Z0} Ω ยาว ${n(APP3_lw, 3)} λ ควรให้ X ≈ +${n(APP3_XWANT, 0)} Ω`,
            circuit: () => buildCircuit(500e6, 50, [['stub_short', 'shunt', { Z0: 50, len: Number(APP3_lw.toFixed(4)) }]]), note: 'ปรับความยาวแล้วดูจุดวิ่งไปตามขอบกราฟ · ค่าที่อ่านได้ควรตรงกับตารางด้านบน' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b7', num: '7', title: 'สายส่งใช้แทน L และ C ได้', titleTh: 'ที่มาของสตับ',
    intro: 'บทที่ 6 จบลงที่ว่า ถ้าอยากย้ายจุดบนกราฟต้องใส่รีแอกแตนซ์หรือซัสเซปแตนซ์เข้าไป ซึ่งปกติก็คือตัวเหนี่ยวนำหรือตัวเก็บประจุ · บทนี้ตอบคำถามถัดไปว่า ที่ความถี่สูงเราไม่ค่อยใช้อุปกรณ์สองอย่างนั้น แล้วใช้อะไรแทน คำตอบคือสายส่งสั้น ๆ ชิ้นเดียวที่เรียกว่า stub และบทนี้จะไล่ตั้งแต่ว่าทำไมมันทำแทนกันได้ ไปจนถึงคำนวณความยาวจริงเป็นเซนติเมตร',
    sections: [
      {
        id: 'why', title: 'ทำไมความถี่สูงจึงไม่ใช้ตัวเหนี่ยวนำกับตัวเก็บประจุจริง',
        lines: [
          T('ที่ความถี่ต่ำ ถ้าต้องการรีแอกแตนซ์สักค่า เราก็ซื้อตัวเหนี่ยวนำหรือตัวเก็บประจุมาบัดกรีลงไป จบ · แต่พอความถี่สูงขึ้น วิธีนี้ค่อย ๆ ใช้ไม่ได้ ด้วยเหตุผลสามข้อที่ต่อเนื่องกัน'),
          K('1. ค่าที่ต้องใช้เล็กลงเรื่อย ๆ ตามความถี่ จนเล็กกว่าค่าที่ตัวอุปกรณ์เองมีติดมาแล้ว\n2. ขาอุปกรณ์ รูเจาะ และลายทองแดงที่ต่อถึงมัน ก็เป็นตัวเหนี่ยวนำและตัวเก็บประจุไปด้วยในตัว\n3. อุปกรณ์จริงทุกตัวมีความถี่เรโซแนนซ์ของตัวเอง เลยความถี่นั้นไปแล้ว ตัวเก็บประจุจะกลายเป็นตัวเหนี่ยวนำ และกลับกัน'),
          T(`ดูข้อ 1 เป็นตัวเลข · ถ้าอยากได้ X = +${n(STUB_Z0, 0)} Ω บนสาย ${STUB_Z0} Ω ที่ ${n(STUB_F / 1e6, 0)} MHz ต้องใช้ตัวเหนี่ยวนำ ${n(lFromX(STUB_Z0, STUB_F), 2)} nH ซึ่งหาซื้อได้สบาย · แต่ที่ 3 GHz ค่าเดียวกันเหลือแค่ ${n(lFromX(STUB_Z0, 3e9), 2)} nH ซึ่งพอ ๆ กับความเหนี่ยวนำของลวดสั้น ๆ เส้นหนึ่งเท่านั้นเอง (คำนวณโดยแอป)`),
          T('ทีนี้ลองมองอีกทาง สายส่งไม่ใช่ “อุปกรณ์” เลย มันเป็นแค่ทองแดงรูปร่างหนึ่ง กัดลายลงบนแผ่นวงจรได้ตรง ๆ ไม่ต้องบัดกรี ไม่มีค่าความคลาดเคลื่อนของผู้ผลิต และทำซ้ำได้เหมือนกันทุกแผ่น'),
          T('ข้อแลกเปลี่ยนอยู่ที่ “ขนาด” เพราะความยาวของสายคิดเป็นเศษส่วนของความยาวคลื่น ยิ่งความถี่ต่ำ ความยาวคลื่นยิ่งยาว สตับก็ยิ่งยาวตามจนใส่ลงบอร์ดไม่ได้'),
          R(`\\text{สตับ } ${STUB_FIX}\\lambda \\text{ บนสาย VF } ${STUB_VF}: \\quad ${n(STUB_F / 1e6, 0)}\\,\\text{MHz} \\to ${n(STUB_FIX * lamIn(STUB_F) * 100, 1)}\\,\\text{cm}, \\quad 1\\,\\text{GHz} \\to ${n(STUB_FIX * lamIn(1e9) * 100, 2)}\\,\\text{cm}, \\quad 3\\,\\text{GHz} \\to ${n(STUB_FIX * lamIn(3e9) * 100, 2)}\\,\\text{cm}`),
          N(`สรุปเป็นกฎคร่าว ๆ: ความถี่ต่ำ อุปกรณ์จริงชนะเพราะเล็ก · ความถี่สูง สตับชนะเพราะแม่นและถูก · จุดสลับกันอยู่ราวหลักร้อย MHz ถึง 1 GHz แล้วแต่ว่าบอร์ดมีที่ว่างแค่ไหน · ตัวเลข VF = ${STUB_VF} ที่ใช้ในบทนี้เป็นค่าสมมุติของสายโคแอกซ์ฉนวนพลาสติกทั่วไป`),
        ],
        figures: [
          { kind: 'table', title: `ค่าที่ต้องใช้ เมื่อความถี่เปลี่ยน — ทั้งแบบอุปกรณ์จริงและแบบสตับ (สาย ${STUB_Z0} Ω · VF ${STUB_VF} · คำนวณโดยแอป)`,
            head: ['ความถี่', `ตัวเหนี่ยวนำที่ให้ X = +${n(STUB_Z0, 0)} Ω`, `ตัวเก็บประจุที่ให้ X = −${n(STUB_Z0, 0)} Ω`, 'ความยาวคลื่นในสาย', `สตับ ${STUB_FIX} λ ยาวจริงเท่าไร`],
            rows: STUB_FS.map((f) => [
              f >= 1e9 ? `${n(f / 1e9, 0)} GHz` : `${n(f / 1e6, 0)} MHz`,
              `${n(lFromX(STUB_Z0, f), 2)} nH`,
              `${n(cFromX(-STUB_Z0, f), 2)} pF`,
              `${n(lamIn(f) * 100, 2)} cm`,
              `${n(STUB_FIX * lamIn(f) * 100, 2)} cm`,
            ]),
            caption: `อ่านสองคอลัมน์กลางเทียบกับคอลัมน์ขวา · ยิ่งลงไปข้างล่าง อุปกรณ์จริงยิ่งเล็กจนทำยาก แต่สตับยิ่งสั้นจนใส่ลงบอร์ดได้สบาย · ที่ ${n(STUB_F / 1e6, 0)} MHz สตับยาวตั้ง ${n(STUB_FIX * lamIn(STUB_F) * 100, 1)} cm ซึ่งยาวเกินไปสำหรับแผ่นวงจรเล็ก ๆ จึงยังนิยมใช้อุปกรณ์จริงอยู่` },
        ],
      },
      {
        id: 'shortopen', title: 'สายปลายลัดและปลายเปิดให้รีแอกแตนซ์อะไร',
        lines: [
          T('เริ่มจากภาพในหัวก่อน ยังไม่ต้องมีสูตร · ปลายสายที่ “ลัดวงจร” คือเอาตัวนำสองเส้นมาเชื่อมติดกัน ตรงจุดนั้นแรงดันคร่อมสายจะเป็นศูนย์เสมอ เพราะไฟฟ้าลัดถึงกันหมด แต่กระแสไหลได้เต็มที่'),
          T('ปลายสายที่ “เปิด” คือปล่อยปลายไว้เฉย ๆ ตรงจุดนั้นกระแสจะเป็นศูนย์เสมอ เพราะไม่มีทางไปต่อ แต่แรงดันคร่อมสายมีได้เต็มที่'),
          T('ทีนี้ค่อย ๆ ถอยออกมาจากปลายสายทีละนิด อัตราส่วนของแรงดันต่อกระแสที่มองเห็น ณ จุดที่ถอยมานั้นจะไม่เท่าเดิมแล้ว และอัตราส่วนนี้เองคือ “อิมพีแดนซ์ขาเข้า” Z_in ที่เรามองเห็น · เพราะสายไม่กินกำลัง (ถือว่าไร้การสูญเสีย) Z_in ที่ได้จึงเป็นรีแอกแตนซ์ล้วน ไม่มีส่วนจริง'),
          T('นั่นคือเหตุผลที่สายส่งชิ้นหนึ่งทำตัวเป็น L หรือเป็น C ได้ — ไม่ใช่เพราะมันมีขดลวดหรือแผ่นเพลตอยู่ข้างใน แต่เพราะระยะทางทำให้อัตราส่วนแรงดันต่อกระแสเลื่อนไป'),
          T('เขียนเป็นสูตร ได้จากการแทน Z_L = 0 (ลัดวงจร) และ Z_L = ∞ (ปลายเปิด) ลงในสมการสายส่ง'),
          M('\\text{ปลายลัด: } Z_{in} = jZ_0\\tan\\beta l \\qquad \\text{ปลายเปิด: } Z_{in} = -jZ_0\\cot\\beta l'),
          T('ในสูตรมีตัวเดียวที่ต้องทำความเข้าใจคือ βl · อ่านว่า “เบตาแอล” และแปลตรงตัวว่า สายชิ้นนี้ยาวคิดเป็นกี่ส่วนของความยาวคลื่น แล้วแปลงเป็นองศา'),
          M('\\beta l = 2\\pi \\frac{l}{\\lambda} \\;\\text{เรเดียน} \\;=\\; 360^\\circ \\times \\frac{l}{\\lambda}'),
          K('l = 0.125 λ  →  βl = 45°  →  tan 45° = 1\nl = 0.250 λ  →  βl = 90°  →  tan ไม่มีค่าจำกัด ต้องดูขีดจำกัดสองด้าน\nl = 0.375 λ  →  βl = 135° →  tan 135° = −1'),
          T(`ลองแทนค่าจริงหนึ่งครั้ง · สายปลายลัด ${STUB_Z0} Ω ยาว ${STUB_FIX} λ ได้ X = ${n(STUB_Z0, 0)} × tan 45° = +${n(stubInput('short', STUB_Z0, STUB_FIX).im, 0)} Ω ซึ่งเป็นค่าบวก จึงออกฤทธิ์แบบเหนี่ยวนำ ส่วนปลายเปิดยาวเท่ากันได้ X = ${n(stubInput('open', STUB_Z0, STUB_FIX).im, 0)} Ω ซึ่งเป็นค่าลบ จึงออกฤทธิ์แบบเก็บประจุ (คำนวณโดยแอป)`),
          T('สรุปเป็นกฎที่ต้องจำสองบรรทัด'),
          M('0 < l < \\frac{\\lambda}{4}: \\quad \\text{ปลายลัด} \\to \\text{inductive}, \\qquad \\text{ปลายเปิด} \\to \\text{capacitive}'),
          T('และที่ l = λ/4 พอดี ปลายลัดให้ Z_in = ∞ (เหมือนวงจร LC ขนานที่เรโซแนนซ์) ส่วนปลายเปิดให้ Z_in = 0 · เลย λ/4 ไปแล้ว เครื่องหมายจะสลับกัน แล้ววนซ้ำทุก ๆ ครึ่งความยาวคลื่น'),
          W('**กฎ “ปลายลัด = แบบเหนี่ยวนำ” ใช้ได้เฉพาะช่วง l < λ/4 เท่านั้น** · ที่ l = 0.3 λ สายปลายลัดให้ X = ' + `${n(stubInput('short', STUB_Z0, 0.3).im, 1)} Ω ซึ่งติดลบ คือกลายเป็นแบบเก็บประจุไปแล้ว (คำนวณโดยแอป) · ทุกครั้งที่เห็นความยาวสตับ ต้องดูก่อนว่าเกิน λ/4 หรือยัง`),
          N('บนกราฟจำง่ายกว่าสูตร: สตับปลายลัดออกเดินจากจุด SHORT ส่วนสตับปลายเปิดออกเดินจากจุด OPEN ทั้งคู่เดินไปตามขอบวงนอก (|Γ| = 1) เพราะสายไร้การสูญเสียไม่กินกำลังเลย · ยาวขึ้นเท่าไรก็แค่เดินไกลขึ้นรอบขอบ'),
        ],
        figures: [
          { kind: 'table', title: `ความยาวสตับเท่านี้ ให้รีแอกแตนซ์เท่าไร — สาย ${STUB_Z0} Ω (คำนวณโดยแอป)`,
            head: ['ความยาว (λ)', 'βl', `ปลายลัด X (Ω)`, 'ออกฤทธิ์แบบ', `ปลายเปิด X (Ω)`, 'ออกฤทธิ์แบบ'],
            rows: STUB_LS.map((l) => {
              const xs = stubInput('short', STUB_Z0, l).im;
              const xo = stubInput('open', STUB_Z0, l).im;
              const kind = (x: number) => (x > 0 ? 'เหนี่ยวนำ' : 'เก็บประจุ');
              return [n(l, 3), `${n(360 * l, 1)}°`, n(xs, 1), kind(xs), n(xo, 1), kind(xo)];
            }),
            caption: `อ่านจากบนลงล่าง · สามแถวแรกยังสั้นกว่า λ/4 ปลายลัดจึงเป็นบวกและปลายเปิดเป็นลบตามกฎ · พอเลย λ/4 (สองแถวล่าง) ทั้งคู่สลับเครื่องหมายกันหมด · ที่ ${STUB_FIX} λ พอดี ทั้งคู่ให้ขนาดเท่ากับ Z₀ คือ ${n(STUB_Z0, 0)} Ω เพราะ tan 45° = 1` },
          { kind: 'smith', title: 'สตับเดินอยู่บนขอบกราฟเสมอ — ปลายลัดออกจาก SHORT ปลายเปิดออกจาก OPEN',
            points: [
              { z: C(0, 0), label: 'SHORT · l = 0', cls: 'stub' },
              { z: C(0, stubInput('short', STUB_Z0, STUB_FIX).im / STUB_Z0), label: `ปลายลัด ${STUB_FIX} λ`, cls: 'load' },
              { z: C(0, stubInput('open', STUB_Z0, STUB_FIX).im / STUB_Z0), label: `ปลายเปิด ${STUB_FIX} λ`, cls: 'y' },
            ],
            curves: [
              { zs: linspace(0.002, 0.23, 40).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'load', arrow: true },
              { zs: linspace(0.02, 0.23, 40).map((l) => C(0, -1 / Math.tan(2 * Math.PI * l))), cls: 'y', arrow: true },
            ],
            caption: 'เส้นแดงคือสตับปลายลัด เดินบนขอบด้านบนจาก SHORT · เส้นเขียวคือสตับปลายเปิด เดินบนขอบด้านล่างจาก OPEN · ทั้งคู่หมุนตามเข็มเมื่อยาวขึ้น และมี |Γ| = 1 · รูปนี้หยุดลูกศรที่ 0.23 λ ก่อนถึง λ/4 เล็กน้อย เมื่อถึง λ/4 จริง ปลายลัดจะไปถึง OPEN และปลายเปิดจะไปถึง SHORT' },
{ kind: 'quiz',
  question: 'สายปลายลัดที่ยาวน้อยกว่า λ/4 ให้รีแอกแตนซ์แบบใด',
  choices: [
    'capacitive คือ X ติดลบ',
    'เป็นศูนย์ เพราะปลายมันลัดวงจรอยู่แล้ว',
    'เป็นอนันต์ เหมือน LC ขนานที่ resonance',
    'inductive คือ X เป็นบวก',
  ],
  answer: 3,
  explain: `X = Z₀ tan βl และ tan เป็นบวกตลอดช่วง 0 < βl < 90° · สายปลายลัด ${APP3_Z0} Ω ยาว 0.05 λ ให้ X = ${n(stubInput('short', APP3_Z0, 0.05).im, 1)} Ω และยาว 0.15 λ ให้ X = ${n(stubInput('short', APP3_Z0, 0.15).im, 1)} Ω เป็นบวกทั้งคู่`,
  chart: { scale: true, fine: false,
    points: [
      { z: C(0, 0), label: 'SHORT (l = 0)', cls: 'stub' },
      { z: C(0, Math.tan(2 * Math.PI * 0.05)), label: 'l = 0.05 λ', cls: 'in' },
      { z: C(0, Math.tan(2 * Math.PI * 0.15)), label: 'l = 0.15 λ', cls: 'in' },
    ] },
},
          { kind: 'stub-reactance' },
          { kind: 'quiz', question: 'สายปลายลัด 50 Ω ยาว λ/4 พอดี ขาเข้ามีสภาพใด และรอยขาดบนกราฟ X หมายถึงอะไร?',
            choices: ['ขาเข้าเหมือนเปิด สูตรไม่มีค่า X จำกัด จึงไม่เชื่อมกราฟผ่านศูนย์', 'ขาเข้าเหมือนลัด เพราะปลายจริงลัดอยู่', 'แมตช์ 50 Ω เพราะอยู่ตรงกลางแกนความยาว', 'X = 300 Ω เพราะเส้นกราฟไปได้สูงสุดเท่านั้น'],
            answer: 0,
            explain: 'ที่ λ/4 สายปลายลัดแปลงเป็นเหมือนปลายเปิดที่ขาเข้า ในแบบอุดมคติ X มีขีดจำกัด +∞ เมื่อเข้าใกล้จากด้านสั้นกว่า และ −∞ จากด้านยาวกว่า ส่วน ±300 Ω เป็นเพียงขอบเขตแสดงผลของกราฟ ไม่ใช่ขีดจำกัดของสูตร' },
          { kind: 'lab', label: 'ทดลอง: สายปลายลัด 50 Ω ยาว 0.15 λ', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.15, vf: 0.66, lossDb: 0 }]]), note: 'ปรับความยาวแล้วดูจุดวิ่งไปตามขอบกราฟ' },
        ],
      },
      {
        id: 'aslc', title: 'สตับยาวเท่านี้ เท่ากับตัวเหนี่ยวนำกี่ nH',
        lines: [
          T('หัวข้อที่แล้วบอกว่าสตับให้รีแอกแตนซ์ได้ หัวข้อนี้ตอบให้ชัดไปเลยว่า “เท่ากับอุปกรณ์ตัวไหน” เพราะเป็นคำถามแรกที่คนเพิ่งเรียนมักติด'),
          T('วิธีคิดมีสองขั้นเท่านั้น ขั้นแรกหาว่ารีแอกแตนซ์ที่สตับให้คือกี่โอห์ม ขั้นที่สองถามว่าอุปกรณ์จริงตัวไหนให้โอห์มเท่านั้นที่ความถี่นี้'),
          M('X > 0 \\;\\Rightarrow\\; L = \\frac{X}{2\\pi f} \\qquad X < 0 \\;\\Rightarrow\\; C = \\frac{1}{2\\pi f\\,|X|}'),
          T(`ลองกับสตับปลายลัด ${STUB_FIX} λ บนสาย ${STUB_Z0} Ω ที่ ${n(STUB_F / 1e6, 0)} MHz · ขั้นแรกได้ X = +${n(stubInput('short', STUB_Z0, STUB_FIX).im, 0)} Ω · ขั้นที่สองได้`),
          R(`L = \\frac{${n(stubInput('short', STUB_Z0, STUB_FIX).im, 0)}}{2\\pi \\times ${n(STUB_F / 1e6, 0)}\\times 10^{6}} = ${n(lFromX(stubInput('short', STUB_Z0, STUB_FIX).im, STUB_F), 2)}\\ \\text{nH}`),
          T(`แปลว่าสตับปลายลัดชิ้นนี้กับตัวเหนี่ยวนำ ${n(lFromX(stubInput('short', STUB_Z0, STUB_FIX).im, STUB_F), 2)} nH ให้ผลเหมือนกันทุกประการ ที่ความถี่ ${n(STUB_F / 1e6, 0)} MHz`),
          W(`ขีดเส้นใต้คำว่า “ที่ความถี่นั้น” ให้หนา ๆ · ตัวเหนี่ยวนำจริงมีค่า L เท่าเดิมทุกความถี่ รีแอกแตนซ์ของมันจึงโตเป็นเส้นตรงตามความถี่ · แต่สตับมีความยาวจริงคงที่ พอความถี่เปลี่ยน ความยาวทางไฟฟ้าของมันเปลี่ยนตาม รีแอกแตนซ์จึงวิ่งตาม tan ซึ่งพุ่งเป็นอนันต์เมื่อสตับกลายเป็น λ/4 พอดี`),
          T(`สำหรับสตับชิ้นนี้ ความถี่ที่ทำให้มันยาวเท่ากับ λ/4 คือ ${n((0.25 / STUB_FIX) * (STUB_F / 1e6), 0)} MHz — แค่สองเท่าของความถี่ออกแบบเท่านั้นเอง · ต่ำกว่านั้นสองเส้นยังเกาะกันพอได้ แต่ยิ่งเข้าใกล้ยิ่งแยกจากกันเร็ว`),
          N('นี่คือเหตุผลเชิงลึกว่าทำไมวงจรที่ใช้สตับถึงมี bandwidth แคบกว่าที่คนคาด และเป็นเรื่องเดียวกับที่จะเจอเต็ม ๆ ในบทที่ 10'),
        ],
        figures: [
          { kind: 'table', title: `สตับปลายลัดและปลายเปิด เทียบเป็นอุปกรณ์จริงที่ ${n(STUB_F / 1e6, 0)} MHz บนสาย ${STUB_Z0} Ω (คำนวณโดยแอป)`,
            head: ['ความยาว (λ)', 'ปลายลัดให้ X', 'เท่ากับอุปกรณ์', 'ปลายเปิดให้ X', 'เท่ากับอุปกรณ์'],
            rows: STUB_LS.filter((l) => l < 0.25).map((l) => {
              const xs = stubInput('short', STUB_Z0, l).im;
              const xo = stubInput('open', STUB_Z0, l).im;
              return [n(l, 3), `+${n(xs, 1)} Ω`, `L = ${n(lFromX(xs, STUB_F), 2)} nH`, `${n(xo, 1)} Ω`, `C = ${n(cFromX(xo, STUB_F), 2)} pF`];
            }),
            caption: `ตารางนี้อ่านได้สองทาง · จากซ้ายไปขวาคือ “มีสตับยาวเท่านี้ ได้อุปกรณ์อะไร” · จากขวามาซ้ายคือ “อยากได้ ${n(lFromX(STUB_Z0, STUB_F), 2)} nH ต้องตัดสายยาวเท่าไร” ซึ่งเป็นคำถามที่ใช้จริงตอนออกแบบ · ทุกค่าในตารางใช้ได้ที่ ${n(STUB_F / 1e6, 0)} MHz เท่านั้น` },
          { kind: 'plot', title: `ตัวเหนี่ยวนำจริงกับสตับที่ “เท่ากัน” ตรงกันแค่จุดเดียว (คำนวณโดยแอป)`,
            xLabel: 'ความถี่ (MHz)', yLabel: 'X (Ω)', xMin: 20, xMax: 170, yMin: 0, yMax: 250,
            xTicks: [20, 50, 100, 150], yTicks: [0, 50, 100, 150, 200, 250],
            series: [
              { name: `ตัวเหนี่ยวนำ ${n(lFromX(STUB_Z0, STUB_F), 2)} nH`, points: linspace(20, 170, 76).map((fm) => [fm, indXat(fm * 1e6)] as [number, number]) },
              { name: `สตับปลายลัด ${STUB_FIX} λ (ตัดที่ ${n(STUB_F / 1e6, 0)} MHz)`, color: '#dc2626', points: linspace(20, 170, 76).map((fm) => [fm, stubXat(fm * 1e6)] as [number, number]) },
            ],
            markers: [{ x: STUB_F / 1e6, y: STUB_Z0, text: `ตรงกันที่ ${n(STUB_F / 1e6, 0)} MHz` }],
            caption: `สองเส้นตัดกันที่ ${n(STUB_F / 1e6, 0)} MHz พอดี ซึ่งเป็นความถี่ที่เราตัดสตับ · ต่ำกว่านั้นสตับให้ค่าน้อยกว่าตัวเหนี่ยวนำเล็กน้อย · สูงกว่านั้นสตับพุ่งแซงขึ้นไปเรื่อย ๆ จนถึง ${n((0.25 / STUB_FIX) * (STUB_F / 1e6), 0)} MHz ที่มันกลายเป็น λ/4 แล้วค่าเป็นอนันต์ · “เท่ากัน” ของสตับจึงหมายถึงเท่ากันที่จุดเดียว ไม่ใช่ทั้งย่าน` },
          { kind: 'lab', label: `ทดลอง: เทียบตัวเหนี่ยวนำ ${n(lFromX(STUB_Z0, STUB_F), 2)} nH กับสตับปลายลัด ${STUB_FIX} λ`,
            circuit: () => buildCircuit(STUB_F, STUB_Z0, [['stub_short', 'shunt', { Z0: STUB_Z0, len: STUB_FIX }], ['load', 'series', { R: APP_ZL.re, X: APP_ZL.im }]]),
            showY: true,
            note: `เปลี่ยนบล็อกสตับเป็นตัวเหนี่ยวนำ ${n(lFromX(STUB_Z0, STUB_F), 2)} nH ดู จุดบนกราฟจะไปอยู่ที่เดิมเป๊ะ · แล้วลองกวาดความถี่ดู จุดของสองแบบจะเริ่มแยกจากกัน` },
        ],
      },
      {
        id: 'stub', title: 'stub คืออะไร และทำไมนิยมปลายลัด',
        lines: [
          T('stub คือสายส่งสั้น ๆ ที่ต่อเข้ากับสายหลักเพื่อสร้าง reactance หรือ susceptance ตามต้องการ'),
          T('ส่วนใหญ่ใช้แบบปลายลัดวงจร (short-circuited stub) มากกว่าปลายเปิด เพราะปลายเปิดมีแนวโน้มจะแผ่คลื่นออกไป (radiate) ทำให้เกิดการสูญเสียและรบกวนระบบ'),
          N('ปลายลัดยังปรับความยาวได้ง่ายกว่าในทางปฏิบัติ เพราะเลื่อนตัวลัดวงจรได้'),
          T(`ภาพด้านล่างคือ stub ที่ต่อจริงกับสายหลัก และตารางเทียบปลายลัดกับปลายเปิดด้วยโหลดประจำคอร์ส ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω — ทั้งสองแบบให้ SWR = 1 เท่ากัน ต่างกันแค่ความยาวสตับ λ/4 (คำนวณโดยแอป)`),
        ],
        figures: [
          { kind: 'circuit',
            title: `รูปร่างของ stub: สายกิ่งสั้น ๆ ปลายลัดลงกราวด์ ต่อขนานกับสายหลัก (โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω)`,
            circuit: buildCircuit(100e6, APP_Z0, [
              ['stub_short', 'shunt', { Z0: APP_Z0, len: Number(solveSingleStub(APP_ZL, APP_Z0, 'short')[1].lLambda.toFixed(4)) }],
              ['tline', 'series', { Z0: APP_Z0, len: Number(solveSingleStub(APP_ZL, APP_Z0, 'short')[1].dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }],
              ['load', 'series', { R: APP_ZL.re, X: APP_ZL.im }],
            ]),
            caption: `สตับไม่ได้ส่งกำลังไปไหน ปลายมันลัดลงกราวด์ · ที่นี่ยาว ${n(solveSingleStub(APP_ZL, APP_Z0, 'short')[1].lLambda, 3)} λ ต่อห่างจากโหลด ${n(solveSingleStub(APP_ZL, APP_Z0, 'short')[1].dLambda, 3)} λ (คำนวณโดยแอป) หน้าที่เดียวของมันคือสร้าง susceptance b = ${n(solveSingleStub(APP_ZL, APP_Z0, 'short')[1].bStub, 2)}` },
          { kind: 'table',
            title: `ปลายลัดกับปลายเปิดทำงานแทนกันได้ ต่างกันแค่ความยาว — โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω (คำนวณโดยแอป)`,
            head: ['คำตอบ', 'ชนิดปลายสตับ', 'ตำแหน่ง d (λ)', 'b ที่สตับต้องสร้าง', 'ความยาวสตับ l_s (λ)', 'SWR หลังใส่สตับ'],
            rows: [0, 1].flatMap((i) => (['short', 'open'] as const).map((kind) => {
              const s = solveSingleStub(APP_ZL, APP_Z0, kind)[i];
              const yl = admittance(normalize(lineInput(APP_ZL, APP_Z0, s.dLambda, 0), APP_Z0));
              const ys = admittance(normalize(stubInput(kind, APP_Z0, s.lLambda), APP_Z0));
              const yt = C(yl.re + ys.re, yl.im + ys.im);
              return [`ที่ ${i + 1}`, kind === 'short' ? 'ปลายลัด (short)' : 'ปลายเปิด (open)', n(s.dLambda, 4), n(s.bStub, 3), n(s.lLambda, 4), n(swrFromGamma(gammaFromz(admittance(yt))), 3)];
            })),
            caption: 'ทั้งสองแบบแมตช์ได้เท่ากัน จึงเลือกด้วยเหตุผลทางกายภาพ: ปลายเปิดแผ่คลื่นออกไปและไวต่อสิ่งรอบข้าง ส่วนปลายลัดปิดสนามไว้ในสายและเลื่อนตัวลัดวงจรเพื่อจูนได้' },
        ],
      },
      {
        id: 'ex-stub', title: `ตัวอย่างเต็มขั้น: หาความยาวสตับที่ ${n(EXS_F / 1e6, 0)} MHz`,
        lines: [
          T(`โจทย์จากหนังสือ: โหลดมีแอดมิตแตนซ์ Y_L = ${n(EXS_YL.re, 3)} ${EXS_YL.im < 0 ? '−' : '+'} j${n(Math.abs(EXS_YL.im), 3)} S ต่ออยู่กับสายที่มี Y₀ = ${n(EXS_Y0, 4)} S ทำงานที่ ${n(EXS_F / 1e6, 0)} MHz และใช้ฉนวนอากาศ · ต้องการสตับปลายลัดมาหักล้างส่วนจินตภาพของโหลด ถามว่าสตับต้องยาวกี่เซนติเมตร`),
          T('ก่อนเริ่ม ขอตอบคำถามที่ควรสงสัยก่อนหนึ่งข้อ — ทำไมโจทย์ให้มาเป็นแอดมิตแตนซ์ ไม่ใช่อิมพีแดนซ์ · เพราะสตับต่อ “ขนาน” กับสายหลัก และของที่ต่อขนานกันจะบวกกันได้ก็ต่อเมื่ออยู่ในรูปแอดมิตแตนซ์เท่านั้น (กฎข้อ 2 ของบทที่ 6)'),
          T('ขั้นที่ 1 — ทำให้เป็นค่าปกติ โดยหารด้วย Y₀'),
          M(`y_L = \\frac{Y_L}{Y_0} = \\frac{${n(EXS_YL.re, 3)} - j${n(Math.abs(EXS_YL.im), 3)}}{${n(EXS_Y0, 4)}} = ${tc(exsY, 4)}`),
          T(`ขั้นที่ 2 — ดูเฉพาะส่วนจินตภาพ · โหลดมี b = ${n(exsY.im, 4)} ซึ่งติดลบ สตับจึงต้องสร้างค่าบวกขนาดเท่ากันมาหักล้างพอดี`),
          R(`b_{stub} = ${n(exsB, 4)}`),
          T('ขั้นที่ 3 — หาความยาวสตับปลายลัดที่ให้ซัสเซปแตนซ์เท่านั้น · สตับปลายลัดมี z = j tan βl เมื่อกลับเป็นแอดมิตแตนซ์จึงได้'),
          M(`y_{stub} = \\frac{1}{j\\tan\\beta l} = -j\\cot\\beta l \\;\\Rightarrow\\; -\\cot\\beta l = ${n(exsB, 4)}`),
          R(`l = ${n(exsL, 4)}\\lambda \\qquad (\\text{หนังสือปัดเป็น } 0.337\\lambda)`),
          T('ขั้นที่ 4 — แปลงเป็นความยาวจริง · โจทย์บอกว่าเป็นฉนวนอากาศ จึงใช้ VF = 1 ได้เลย ไม่ต้องคูณลด'),
          M(`\\lambda = \\frac{c}{f} = \\frac{3\\times10^{8}}{${n(EXS_F / 1e6, 0)}\\times10^{6}} \\approx ${n(EXS_LAM, 3)}\\ \\text{m}`),
          R(`l = ${n(exsL, 4)} \\times ${n(EXS_LAM, 3)} = ${n(exsL * EXS_LAM, 4)}\\ \\text{m} \\approx ${n(exsL * EXS_LAM * 100, 1)}\\ \\text{cm}`),
          T('ขั้นที่ 5 — ตรวจคำตอบ ซึ่งเป็นขั้นที่คนข้ามบ่อยที่สุด · เอาแอดมิตแตนซ์สองก้อนมาบวกกัน'),
          R(`y_{รวม} = (${tc(exsY, 4)}) + j${n(exsB, 4)} = ${tc(exsYtot, 4)}`),
          W(`ดูให้ดี — **ส่วนจินตภาพหายไปจริง แต่ยังไม่แมตช์** เพราะส่วนจริงยังเป็น ${n(exsYtot.re, 4)} ไม่ใช่ 1 · SWR ที่ได้จึงเป็น ${n(exsSwr, 4)} ไม่ใช่ 1 (คำนวณโดยแอป) · แปลว่าสตับตัวนี้ “หักล้างส่วนจินตภาพสำเร็จ” แต่ “ยังไม่แมตช์”`),
          T('เหตุผลอยู่ที่กฎข้อ 2 ของบทที่ 6 อีกครั้ง — สตับขนานเปลี่ยนได้แต่ b ส่วน g ไม่ถูกแตะเลย ถ้าจุดที่เราติดสตับมี g ไม่เท่ากับ 1 ต่อให้หักล้าง b หมดก็ได้แค่ลงมานั่งบนแกนนอน ยังไม่ถึงจุดกลาง'),
          T('ทางแก้คือ “เลือกตำแหน่งติดสตับให้ดีก่อน” · เดินจากโหลดไปตามสายจนถึงจุดที่ g = 1 พอดี แล้วค่อยติดสตับตรงนั้น คราวนี้หักล้าง b เสร็จก็ถึงจุดกลางพอดี — นั่นคือวิธี single stub matching เต็มรูปแบบ ซึ่งเป็นเนื้อหาทั้งบทของบทที่ 9'),
          N('หัวข้อนี้จึงเป็นครึ่งหนึ่งของเรื่อง คือ “สตับยาวเท่าไรให้ b เท่าที่ต้องการ” ส่วนอีกครึ่งคือ “ติดตรงไหน” อยู่ในบทที่ 9'),
        ],
        figures: [
          { kind: 'smith', title: 'ขั้นที่ 3 บนกราฟ: ออกจากจุด SHORT แล้วเดินตามขอบจนได้ b ที่ต้องการ', showY: true,
            points: [
              { z: C(0, 0), label: 'SHORT · l = 0', cls: 'stub' },
              { z: admittance(C(0, exsB)), label: `b = ${n(exsB, 2)}`, cls: 'y' },
            ],
            curves: [{ zs: linspace(0.001, exsL, 40).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'stub', arrow: true }],
            caption: `สตับปลายลัดออกเดินจาก SHORT เสมอ แล้ววิ่งไปตามขอบกราฟ (|Γ| = 1) เพราะมันไม่กินกำลัง · เดินไป ${n(exsL, 4)} λ ก็ถึงจุดที่ให้ b = ${n(exsB, 4)} พอดี ซึ่งเป็นค่าที่ต้องการ (คำนวณโดยแอป) · เปิดกริด Y ไว้จะเห็นเส้น b วิ่งตัดขอบตรงจุดนั้น` },
          { kind: 'smith', title: 'ขั้นที่ 5: หักล้าง b หมดแล้ว แต่ยังไม่ถึงจุดกลาง',
            gCircles: [exsY.re], showY: true,
            points: [
              { z: admittance(exsY), label: `y_L = ${fz(exsY, 2)}`, cls: 'load' },
              { z: admittance(exsYtot), label: `y = ${n(exsYtot.re, 2)} + j0`, cls: 'mid' },
              { z: C(1, 0), label: 'เป้าหมาย · ยังไปไม่ถึง', cls: 'goal' },
            ],
            curves: [{ zs: shuntPath(admittance(exsY), exsB), cls: 'y', arrow: true }],
            caption: `วงกลมประตรงกลางคือเป้าหมาย y = 1 ที่ยังไปไม่ถึง (จุดทึบคือค่าที่ได้จริง) · สตับพาจุดไถลไปตามวงกลม g = ${n(exsY.re, 4)} ซึ่งเป็นค่าเดิมของโหลด · ไถลจนส่วนจินตภาพเป็นศูนย์ก็สุดทางแล้ว ได้ SWR = ${n(exsSwr, 4)} (คำนวณโดยแอป) · จุดกลางอยู่บนวง g = 1 คนละวงกัน สตับตัวเดียวที่ตำแหน่งนี้จึงไปไม่ถึง` },
        ],
      },
      {
        id: 'traps', title: 'ห้าข้อผิดพลาดที่เจอบ่อยที่สุดเรื่องสตับ',
        lines: [
          T('หัวข้อนี้เก็บกวาดจุดที่คนเพิ่งเรียนพลาดซ้ำ ๆ ไว้ที่เดียว อ่านจบแล้วย้อนกลับมาดูทุกครั้งที่คำตอบออกมาแปลก'),
          K(`1. ลืมคูณ VF — ความยาวสตับที่คำนวณได้เป็น “ความยาวคลื่นในสาย” ไม่ใช่ในอากาศ\n2. สลับปลายลัดกับปลายเปิด — สองอย่างนี้ต่างกันพอดี λ/4 ผิดทีเดียวคลาดไปทั้งคำตอบ\n3. คิดว่าหักล้าง b หมดแล้วจะแมตช์ทันที — ต้องอยู่บนวง g = 1 ก่อนเท่านั้น\n4. ใช้ความยาวเดิมข้ามความถี่ — ${STUB_FIX} λ ที่ ${n(STUB_F / 1e6, 0)} MHz ไม่ใช่ ${STUB_FIX} λ ที่ความถี่อื่น\n5. ต่อสตับแบบอนุกรม — วิธีมาตรฐานในคอร์สนี้ต่อขนานทั้งหมด เพราะคิดในโดเมนแอดมิตแตนซ์`),
          T(`ข้อ 1 เป็นข้อที่ทำให้สายผิดความยาวมากที่สุด · สตับ ${STUB_FIX} λ ที่ ${n(STUB_F / 1e6, 0)} MHz ถ้าคิดในอากาศจะได้ ${n(STUB_FIX * (299792458 / STUB_F) * 100, 1)} cm แต่ถ้าเป็นสายที่มี VF = ${STUB_VF} ความยาวจริงเหลือแค่ ${n(STUB_FIX * lamIn(STUB_F) * 100, 1)} cm — ต่างกันเกือบ ${n(((1 / STUB_VF) - 1) * 100, 0)} %`),
          T(`ข้อ 2 ตรวจง่ายมาก · ที่ความยาวเท่ากัน ปลายลัดกับปลายเปิดให้รีแอกแตนซ์คนละเครื่องหมายเสมอ ถ้าคำนวณออกมาแล้วเครื่องหมายไม่ตรงกับที่ต้องการ แปลว่าหยิบผิดชนิด`),
          W(`ข้อ 4 มีตัวเลขให้ดูชัด ๆ · สตับที่ตัดไว้สำหรับ ${n(STUB_F / 1e6, 0)} MHz พอเอาไปใช้ที่ ${n(1.5 * STUB_F / 1e6, 0)} MHz จะให้ X = ${n(stubXat(1.5 * STUB_F), 1)} Ω แทนที่จะเป็น ${n(STUB_Z0, 0)} Ω คือผิดไปเกินสองเท่า (คำนวณโดยแอป)`),
          N('ข้อ 3 เป็นข้อที่สำคัญที่สุดในเชิงแนวคิด และเป็นสะพานเข้าสู่บทที่ 9 พอดี — สตับกำหนดได้แค่ b ส่วน g ต้องจัดการด้วยการเลือกตำแหน่งเท่านั้น'),
        ],
        figures: [
          { kind: 'table', title: 'ห้าข้อผิดพลาด อาการที่เห็น และวิธีตรวจ',
            head: ['ข้อผิดพลาด', 'อาการที่จะเห็น', 'ตรวจอย่างไร'],
            rows: [
              ['ลืมคูณ VF', 'ตัดสายยาวเกินความจำเป็น วัดจริงแล้วไม่แมตช์', 'ถามตัวเองว่า λ ที่ใช้เป็นในอากาศหรือในสาย'],
              ['สลับปลายลัด/ปลายเปิด', 'ได้รีแอกแตนซ์ตรงข้ามกับที่ต้องการ', 'ดูเครื่องหมายของ X ที่คำนวณได้ ตรงกับที่ต้องการหรือไม่'],
              ['คิดว่าหักล้าง b แล้วจบ', 'ส่วนจินตภาพเป็นศูนย์ แต่ SWR ยังไม่ใช่ 1', 'ดูค่า g ที่ตำแหน่งติดสตับ ต้องเป็น 1 เท่านั้น'],
              ['ใช้ความยาวเดิมข้ามความถี่', 'แมตช์ดีที่ความถี่เดียว แล้วแย่ลงเร็วมาก', 'คำนวณ βl ใหม่ที่ความถี่ใหม่ทุกครั้ง'],
              ['ต่อสตับแบบอนุกรม', 'ตัวเลขดูสมเหตุสมผล แต่เป็นคำตอบของวงจรคนละแบบ', 'สตับต่อขนาน ต้องบวกกันในโดเมนแอดมิตแตนซ์'],
            ],
            caption: 'สามข้อแรกเป็นความผิดพลาดตอนคำนวณ ส่วนสองข้อหลังเป็นความผิดพลาดตอนเข้าใจแนวคิด ซึ่งแก้ยากกว่าเพราะตัวเลขที่ได้ยังดูสมเหตุสมผลอยู่' },
          { kind: 'quiz',
            question: `ติดสตับปลายลัดขนานเข้าที่จุดหนึ่งบนสาย แล้วหักล้างซัสเซปแตนซ์ของจุดนั้นจนเหลือ y = ${n(exsYtot.re, 2)} + j0 · ผลคืออะไร`,
            choices: [
              `ยังไม่แมตช์ เพราะ g = ${n(exsYtot.re, 2)} ไม่ใช่ 1 · SWR ที่ได้คือ ${n(exsSwr, 3)}`,
              'แมตช์แล้ว เพราะส่วนจินตภาพเป็นศูนย์ SWR จึงเป็น 1',
              'บอกไม่ได้ ต้องรู้ความยาวสตับก่อน',
              'ยังไม่แมตช์ และแก้ได้ด้วยการต่อสตับเพิ่มอีกตัวที่จุดเดิม',
            ],
            answer: 0,
            explain: `SWR = 1 ต้องการ y = 1 พอดี ไม่ใช่แค่ส่วนจินตภาพเป็นศูนย์ · ที่ y = ${n(exsYtot.re, 4)} + j0 จะได้ z = ${n(1 / exsYtot.re, 4)} และ SWR = ${n(exsSwr, 4)} (คำนวณโดยแอป) · ตัวเลือกสุดท้ายผิดเพราะสตับตัวที่สองที่จุดเดิมก็ยังเปลี่ยนได้แต่ b เหมือนเดิม จุดจะไถลกลับไปมาบนวง g เดิมเท่านั้น ต้องเปลี่ยน “ตำแหน่ง” เท่านั้นถึงจะเปลี่ยน g ได้`,
            hint: 'ถามตัวเองว่าจุดกลางของกราฟมี g เท่าไร แล้วจุดนี้มี g เท่าไร',
            chart: { scale: false, fine: false, table: false, grid: 'light', showY: true, gCircles: [exsYtot.re, 1],
              points: [{ z: admittance(exsYtot), label: `y = ${n(exsYtot.re, 2)} + j0`, cls: 'mid' }, { z: C(1, 0), label: 'y = 1 · ยังไปไม่ถึง', cls: 'goal' }] } },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b8', num: '8', title: 'หม้อแปลง λ/4 ทีละขั้น', titleTh: 'Quarter-wave transformer และ Example 7-7',
    intro: 'หม้อแปลงหนึ่งในสี่ความยาวคลื่นคือสายส่งยาว λ/4 ที่เลือก Z_T ให้เหมาะสม ใช้แปลงอิมพีแดนซ์ได้ในขั้นตอนเดียว แต่มีเงื่อนไขสำคัญคือโหลดต้องเป็นความต้านทานล้วน',
    sections: [
      {
        id: 'principle', title: 'หลักการและที่มาของสูตร',
        lines: [
          T('จากสมการสายส่ง เมื่อ l = λ/4 จะได้ βl = 90° และ tan βl → ∞ สมการจึงลดรูปเหลือ'),
          M('Z_{in} = \\lim_{\\tan\\beta l \\to \\infty} Z_T\\,\\frac{Z_L + jZ_T\\tan\\beta l}{Z_T + jZ_L\\tan\\beta l} = \\frac{Z_T^{2}}{Z_L}'),
          T('ถ้าต้องการให้ต้นสายเห็น Z₀ พอดี ก็ตั้ง Z_in = Z₀'),
          M('\\frac{Z_T^{2}}{Z_L} = Z_0 \\;\\Rightarrow\\; \\boxed{Z_T = \\sqrt{Z_0 Z_L}}'),
          N('สูตรนี้ต้องการ Z_L ที่เป็นจำนวนจริง เพราะรากที่สองของจำนวนเชิงซ้อนไม่ได้ให้สายส่งที่สร้างได้จริง'),
        ],
        figures: [
          { kind: 'smith', title: 'ผลของสาย λ/4: จุดหมุนครึ่งรอบ (z → 1/z)',
            points: [{ z: C(2, 0), label: 'z_L = 2', cls: 'load' }, { z: C(0.5, 0), label: '1/z = 0.5', cls: 'in' }],
            curves: [{ zs: swrPath(C(2, 0), 0.25), cls: 'net', arrow: true }], swr: [2],
            caption: 'บนกราฟที่ normalize ด้วย Z₀ ของสาย λ/4 เอง การเดิน λ/4 คือการกลับส่วน' },
          { kind: 'lab', label: 'ทดลอง: โหลด 100 Ω กับหม้อแปลง λ/4 ที่ Z_t = 70.7 Ω', circuit: () => buildCircuit(100e6, 50, [['qwt', 'series', { Zt: 70.71 }], ['resistor', 'series', { R: 100 }]]) },
        ],
      },
      {
        id: 'complex', title: 'ปัญหาเมื่อโหลดเป็นจำนวนเชิงซ้อน',
        lines: [
          T('ถ้า Z_L = R + jX เราต่อหม้อแปลงที่โหลดโดยตรงไม่ได้ เพราะสูตรต้องการความต้านทานล้วน'),
          T('ทางแก้คือใช้สายส่งธรรมดา (Z₀ เดิม) เดินจากโหลดไปทางแหล่งจ่ายก่อน จนถึงตำแหน่งที่อิมพีแดนซ์เป็นความต้านทานล้วน (x = 0) แล้วค่อยต่อหม้อแปลงที่จุดนั้น'),
          K('โหลด Z_L ──[ สาย Z₀ ยาว d ]──┤ x = 0 ที่นี่ ├──[ λ/4, Z_T ]── ไปยังแหล่งจ่าย'),
          T('การหาตำแหน่ง x = 0 ก็คือการใช้งานกลุ่มที่ 2 (หัวข้อ 6.8): เดินตามวงกลม SWR จนตัดแกนนอน · วงกลม SWR ตัดแกนนอนสองจุดเสมอ จึงมีคำตอบสองชุด'),
          M('\\text{จุดขวา}: r = SWR \\;\\Rightarrow\\; R\' = SWR \\times Z_0, \\qquad \\text{จุดซ้าย}: r = \\frac{1}{SWR} \\;\\Rightarrow\\; R\' = \\frac{Z_0}{SWR}'),
          N('ตำแหน่ง x = 0 หาได้ง่ายมากบน Smith Chart — นี่คือเหตุผลที่บทที่ 1 บอกว่าการหาจุดนี้ด้วยการคำนวณอย่างเดียวทำได้ยาก · หัวข้อ 8.3 ทำให้ดูทั้งสองจุด'),
        ],
        figures: [
          { kind: 'chart', title: 'ตามแนวคิด Fig. 7-13: เดินจากโหลดเชิงซ้อนจนถึงจุดความต้านทานล้วน แล้วจึงต่อหม้อแปลง λ/4',
            scale: true, fine: false,
            points: [
              { z: z77, label: `z_L = ${fz(z77, 2)}`, cls: 'load' },
              { z: C(swr77, 0), label: `จุดขวา r = ${n(swr77, 2)}`, cls: 'in' },
              { z: C(1 / swr77, 0), label: `จุดซ้าย r = ${n(1 / swr77, 2)}`, cls: 'mid' },
            ],
            curves: [{ zs: swrPath(z77, 0.5), cls: 'net', arrow: true }],
            swr: [swr77], xCircles: [0],
            caption: 'สร้างใหม่ตามแนวคิด Fig. 7-13 ด้วยค่าที่แอปคำนวณเอง ไม่ใช่ภาพจากหนังสือ · เส้นแนวนอนคือ x = 0 ซึ่งวงกลม SWR ตัดสองจุด — ทั้งสองจุดใช้ต่อหม้อแปลง λ/4 ได้' },
        ],
      },
      {
        id: 'ex77', title: 'Example 7-7 ทีละขั้น',
        lines: [
          T('โจทย์: Z_L = 100 − j50 Ω บนสาย Z₀ = 75 Ω · หาตำแหน่งที่ใกล้โหลดที่สุดที่ใส่หม้อแปลง λ/4 ได้ และหาค่า Z_T'),
          T('ขั้นที่ 1 — normalize'),
          M(`z_L = \\frac{100 - j50}{75} = ${tc(z77, 3)}`),
          T('ขั้นที่ 2 — พล็อตจุดแล้วลากวงกลม SWR คงที่'),
          M(`SWR = ${n(swr77, 3)}`),
          T('ขั้นที่ 3 — เดินไปทางแหล่งจ่าย (ตามเข็ม) จนวงกลมตัดแกน x = 0 จุดแรก'),
          M(`d = ${n(ex77.dLambda, 3)}\\lambda \\qquad (\\text{หนังสือ } 0.184\\lambda)`),
          T('ขั้นที่ 4 — อ่านค่าความต้านทานปกติที่จุดนั้น แล้วคูณ Z₀ กลับ'),
          M(`r = ${n(ex77.Rreal / 75, 3)} \\;\\Rightarrow\\; R' = ${n(ex77.Rreal / 75, 3)} \\times 75 = ${n(ex77.Rreal, 1)}\\,\\Omega \\qquad (\\text{หนังสือ } 39.8\\,\\Omega)`),
          T('ขั้นที่ 5 — ออกแบบหม้อแปลง'),
          R(`Z_T = \\sqrt{Z_0 R'} = \\sqrt{75 \\times ${n(ex77.Rreal, 1)}} = ${n(ex77.Zt, 1)}\\,\\Omega \\qquad (\\text{หนังสือ } 54.5\\,\\Omega)`),
          N(`มีอีกคำตอบหนึ่งที่ไกลกว่า: เดินต่อไปจนตัดแกนอีกด้าน จะได้ d = ${n(solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => b.dLambda - a.dLambda)[0].dLambda, 3)} λ, R' = ${n(solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => b.dLambda - a.dLambda)[0].Rreal, 1)} Ω, Z_T = ${n(solveQwt(EX77.ZL, EX77.Z0).slice().sort((a, b) => b.dLambda - a.dLambda)[0].Zt, 1)} Ω · โจทย์ถามจุดที่ใกล้โหลดที่สุดจึงใช้ค่าแรก`),
        ],
        figures: [
          { kind: 'smith', title: 'ขั้นที่ 1–3: พล็อต z_L แล้วเดินตามวงกลม SWR จนถึงแกน x = 0',
            points: [{ z: z77, label: `z_L = ${fz(z77, 2)}`, cls: 'load' }, { z: C(ex77.Rreal / 75, 0), label: `r = ${n(ex77.Rreal / 75, 2)} ที่ ${n(ex77.dLambda, 3)}λ`, cls: 'in' }],
            curves: [{ zs: swrPath(z77, ex77.dLambda), cls: 'net', arrow: true }],
            swr: [swr77], xCircles: [0],
            caption: 'จุดสีเขียวคือ purely resistive point ที่จะใส่หม้อแปลง' },
          { kind: 'circuit', title: 'วงจรที่ได้: สาย 75 Ω ยาว 0.184 λ แล้วต่อหม้อแปลง λ/4 ที่ 54.6 Ω',
            circuit: buildCircuit(100e6, 75, [['qwt', 'series', { Zt: Number(ex77.Zt.toFixed(2)) }], ['tline', 'series', { Z0: 75, len: Number(ex77.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
          { kind: 'lab', label: 'Lab: Example 7-7 ครบวงจร (กด Explain ดูทีละขั้น)',
            circuit: () => buildCircuit(100e6, 75, [['qwt', 'series', { Zt: Number(ex77.Zt.toFixed(2)) }], ['tline', 'series', { Z0: 75, len: Number(ex77.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
          { kind: 'lab', label: 'Lab: เฉพาะโหลด 100 − j50 Ω บนระบบ 75 Ω (ลองเดินเองด้วย Probe)',
            circuit: () => buildCircuit(100e6, 75, [['tline', 'series', { Z0: 75, len: 0.184, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
        ],
      },
      {
        id: 'pattern77', title: 'รูปแบบของโจทย์หม้อแปลง λ/4',
        lines: [
          K('Z_L, Z₀\n   ↓ normalize\nz_L\n   ↓ plot + วงกลม SWR\n   ↓ เดิน toward generator จนถึง x = 0\nอ่าน r แล้วคูณ Z₀ → R′\n   ↓\nZ_T = √(Z₀ · R′)'),
          N('ถ้าโหลดเป็นความต้านทานล้วนอยู่แล้ว ข้ามขั้นเดินสายได้เลย ใช้ Z_T = √(Z₀ R_L) ทันที'),
          T(`ตารางด้านล่างเดินแผนผังนี้กับสองโจทย์พร้อมกัน: Example 7-7 ของหนังสือ และโหลดประจำคอร์ส ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω — ทุกช่องคำนวณโดยแอป`),
        ],
        figures: [
          { kind: 'table', title: 'แผนผังเดียวกัน ใช้ได้กับทุกโจทย์ — เทียบสองโจทย์ทีละขั้น (คำนวณโดยแอป)',
            head: ['ขั้นตอน', 'Example 7-7 (Z₀ = 75 Ω)', `โหลดประจำคอร์ส (Z₀ = ${APP_Z0} Ω)`],
            rows: (() => {
              const q = solveQwt(APP_ZL, APP_Z0).slice().sort((a, b) => a.dLambda - b.dLambda)[0];
              return [
                ['1. โจทย์ให้ Z_L', `${fz(EX77.ZL, 0)} Ω`, `${fz(APP_ZL, 0)} Ω`],
                ['2. normalize → z_L', fz(z77, 3), fz(zApp, 1)],
                ['3. ลากวงกลม SWR', n(swr77, 3), n(swrApp, 3)],
                ['4. เดินไป generator จนถึง x = 0', `d = ${n(ex77.dLambda, 4)} λ`, `d = ${n(q.dLambda, 4)} λ`],
                ['5. อ่าน r ที่จุดนั้น', n(ex77.Rreal / EX77.Z0, 3), n(q.Rreal / APP_Z0, 3)],
                ['6. R′ = r × Z₀', `${n(ex77.Rreal, 1)} Ω`, `${n(q.Rreal, 1)} Ω`],
                ['7. Z_T = √(Z₀ R′)', `${n(ex77.Zt, 1)} Ω`, `${n(q.Zt, 1)} Ω`],
              ];
            })(),
            caption: `ขั้นที่ 5 ได้ r เป็น SWR หรือ 1/SWR เสมอ ไม่มีค่าอื่น · โหลดครึ่งล่าง (capacitive) อย่าง Example 7-7 เจอจุดซ้าย r = ${n(1 / swr77, 3)} ก่อน ส่วนโหลดครึ่งบน (inductive) อย่างโหลดประจำคอร์ส เจอจุดขวา r = ${n(swrApp, 3)} ก่อน` },
          { kind: 'chart', title: `แผนผังเดียวกันบนกราฟ: โหลดประจำคอร์ส z = ${fz(zApp, 1)} เดินไปหาจุด x = 0`,
            scale: true, fine: false,
            points: [
              { z: zApp, label: `z_L = ${fz(zApp, 1)}`, cls: 'load' },
              { z: C(swrApp, 0), label: `r = SWR = ${n(swrApp, 3)} ที่ ${n(solveQwt(APP_ZL, APP_Z0).slice().sort((a, b) => a.dLambda - b.dLambda)[0].dLambda, 3)} λ`, cls: 'in' },
              { z: C(1 / swrApp, 0), label: `r = 1/SWR = ${n(1 / swrApp, 3)}`, cls: 'mid' },
            ],
            curves: [{ zs: swrPath(zApp, solveQwt(APP_ZL, APP_Z0).slice().sort((a, b) => a.dLambda - b.dLambda)[0].dLambda), cls: 'net', arrow: true }],
            swr: [swrApp], xCircles: [0],
            caption: `จุด z_L อยู่ที่สเกล ${n(wtgZApp, 4)} λ · เดินตามเข็มจนวงกลม SWR ตัดแกนนอน จะพบจุดขวา r = ${n(swrApp, 3)} ก่อน แล้วจึงถึงจุดซ้าย r = ${n(1 / swrApp, 3)} — ต่อหม้อแปลง λ/4 ได้ทั้งสองจุด` },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b9', num: '9', title: 'Single stub matching ทีละขั้น', titleTh: 'ขั้นตอนหกข้อ และ Example 7-8',
    intro: 'สตับต่อขนานกับสายหลัก จึงต้องทำงานในโดเมนแอดมิตแตนซ์ บทนี้อธิบายเป้าหมาย เหตุผลของทุกขั้นตอน แล้วทำ Example 7-8 ให้ครบ',
    sections: [
      {
        id: 'goal', title: 'เป้าหมายของ stub matching',
        lines: [
          T('เพราะสตับต่อขนาน แอดมิตแตนซ์จึงบวกกันตรง ๆ'),
          M('y_{total} = y_{line} + y_{stub}'),
          T('ถ้าเราเลือกตำแหน่งที่สายมี y = 1 + jb แล้วใส่สตับที่ให้ y_stub = −jb จะได้'),
          M('y_{total} = (1 + jb) + (-jb) = 1'),
          R('y = 1 \\;\\Rightarrow\\; Y = Y_0 \\;\\Rightarrow\\; Z = Z_0 \\;\\Rightarrow\\; SWR = 1'),
          T('นี่คือแก่นทั้งหมดของ single-stub matching'),
          T(`ภาพด้านล่างใช้โหลดประจำคอร์ส ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω ซึ่งมี y = ${fz(yApp, 0)} จึงต้องการสตับที่ให้ b = +${n(-yApp.im, 0)} มาหักล้างให้เหลือ y = 1 พอดี`),
        ],
        figures: [
          { kind: 'smith', title: 'เป้าหมายเดียว: บวก susceptance ของสตับให้ y รวมเป็น 1 พอดี', showY: true,
            gCircles: [1], bCircles: [yApp.im], swr: [swrApp],
            points: [
              { z: zApp, label: `y_line = ${fz(yApp, 0)}`, cls: 'y' },
              { z: C(1, 0), label: 'y_total = 1 → แมตช์', cls: 'in' },
            ],
            curves: [{ zs: shuntPath(zApp, -yApp.im), cls: 'y', arrow: true }],
            caption: `สตับพาจุดเดินไปตามวงกลม g = 1 เท่านั้น (g ไม่เปลี่ยน) จนถึงศูนย์กลาง · โหลดนี้มี y = ${fz(yApp, 0)} อยู่บนวงกลม g = 1 พอดีอยู่แล้ว จึงติดสตับได้ที่ขั้วโหลดเลย (d = 0)` },
          { kind: 'table', title: 'y_line + y_stub = y_total ในสองโจทย์ (คำนวณโดยแอป)',
            head: ['วงจร', 'd (λ)', 'y_line', 'y_stub', 'y_total', 'SWR'],
            rows: (() => {
              const f0 = (z: Complex) => fz(C(z.re, Math.abs(z.im) < 1e-9 ? 0 : z.im), 2);
              const row = (name: string, ZL: Complex, Z0: number, s: { dLambda: number; lLambda: number }) => {
                const yl = admittance(normalize(lineInput(ZL, Z0, s.dLambda, 0), Z0));
                const ys = admittance(normalize(stubInput('short', Z0, s.lLambda), Z0));
                const yt = C(yl.re + ys.re, yl.im + ys.im);
                return [name, n(s.dLambda, 4), f0(yl), f0(ys), f0(yt), n(swrFromGamma(gammaFromz(admittance(yt))), 3)];
              };
              return [
                row(`โหลดประจำคอร์ส ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω`, APP_ZL, APP_Z0, solveSingleStub(APP_ZL, APP_Z0, 'short')[0]),
                row(`Example 7-8: ${fz(EX78.ZL, 0)} Ω บนสาย ${EX78.Z0} Ω`, EX78.ZL, EX78.Z0, ex78),
              ];
            })(),
            caption: 'คนละโหลด คนละระยะ คนละความยาวสตับ แต่คอลัมน์ y_total เป็น 1 เหมือนกัน — นั่นคือเป้าหมายเดียวของทั้งบท' },
        ],
      },
      {
        id: 'whyg1', title: 'ทำไมต้องหาจุดที่ g = 1',
        lines: [
          T('สตับเป็น pure susceptance มันเปลี่ยนได้เฉพาะส่วน jb เท่านั้น เปลี่ยน g ไม่ได้เลย'),
          T('สมมติเลือกจุดผิดที่ y = 0.5 + j1 แล้วใส่สตับ −j1'),
          M('y_{total} = 0.5 + j1 - j1 = 0.5 \\neq 1 \\;\\Rightarrow\\; \\text{ยังไม่แมตช์}'),
          T('แต่ถ้าเลือกจุดที่ y = 1 + j1 แล้วใส่สตับ −j1'),
          M('y_{total} = 1 + j1 - j1 = 1 \\;\\Rightarrow\\; \\text{แมตช์}'),
          N('เราจึงไม่ได้หาวงกลม g = 1 โดยบังเอิญ แต่เพราะมันเป็นเส้นเดียวที่สตับจะพาเราเข้าศูนย์กลางได้'),
        ],
        figures: [
          { kind: 'smith', title: 'วงกลม g = 1 (เขียว) คือเส้นเป้าหมายก่อนใส่สตับ', showY: true, gCircles: [1],
            points: [{ z: admittance(C(1, 1)), label: 'y = 1 + j1 → ใส่สตับได้', cls: 'y' }, { z: admittance(C(0.5, 1)), label: 'y = 0.5 + j1 → ยังไม่ได้', cls: 'mid' }],
            caption: 'ใส่สตับที่จุดบนวงกลม g = 1 เท่านั้นจึงจะถึงศูนย์กลาง' },
        ],
      },
      {
        id: 'procedure', title: 'ขั้นตอนหกข้อ',
        lines: [
          K('1. normalize โหลด z_L = Z_L / Z₀ แล้วพล็อตจุด\n2. แปลงเป็นแอดมิตแตนซ์ y_L (หมุน 180° ผ่านศูนย์กลาง)\n3. เดินตามวงกลม SWR ไปทาง generator จนตัดวงกลม g = 1 → ได้ y = 1 ± jb และได้ระยะ d\n4. เริ่มหาความยาวสตับจากจุด SHORT บนขอบกราฟ\n5. หาค่า susceptance ที่ตรงข้าม: ถ้าสายมี +jb สตับต้องเป็น −jb\n6. อ่านระยะบนสเกลจากจุด SHORT ถึงจุดนั้น = ความยาวสตับ l_s'),
          N('ขั้นที่ 3 มีสองคำตอบเสมอ (วงกลม SWR ตัดวงกลม g = 1 สองจุด) · โจทย์ส่วนใหญ่ใช้จุดที่ใกล้โหลดกว่า แต่ถ้าสนใจ bandwidth ต้องเทียบทั้งสองคำตอบด้วย frequency sweep ไม่ใช่เดาจากระยะ'),
        ],
        figures: [
{ kind: 'quiz',
  question: 'ใน single stub matching ต้องติดสตับไว้ที่ตำแหน่งใดบนสายหลัก',
  choices: [
    'ที่ขั้วโหลดพอดี',
    'ที่ระยะ λ/4 จากโหลดเสมอ',
    'ที่จุดแรกซึ่งสายมี g = 1 เมื่อเดินจากโหลดไปทาง generator',
    'ที่ปลายสายฝั่งแหล่งจ่าย',
  ],
  answer: 2,
  explain: `สตับเป็น susceptance ล้วน แก้ได้แต่ b แก้ g ไม่ได้ จึงต้องติดที่จุดซึ่ง g = 1 อยู่แล้ว · ในตัวอย่าง 7-8 จุดนั้นอยู่ที่ d = ${n(ex78.dLambda, 3)} λ ซึ่งสายมี y = ${fz(ex78.yAtStub, 2)}`,
  chart: { showY: true, gCircles: [1], swr: [swr78], scale: false, fine: false,
    points: [{ z: y78, label: 'y_L', cls: 'y' }] },
},
        ],
      },
      {
        id: 'ex78', title: 'Example 7-8 ทีละขั้น',
        lines: [
          T('โจทย์: Z_L = 450 − j600 Ω บนสาย Z₀ = 300 Ω · หาตำแหน่งและความยาวของสตับปลายลัด'),
          T('ขั้นที่ 1 — normalize และพล็อต'),
          M(`z_L = \\frac{450 - j600}{300} = ${tc(z78, 1)} \\qquad SWR = ${n(swr78, 2)} \\quad (\\text{หนังสือ } 4.6)`),
          T('ขั้นที่ 2 — แปลงเป็นแอดมิตแตนซ์ (หมุน 180° หรืออ่านอีกด้านของวงกลม SWR)'),
          M(`y_L = \\frac{1}{z_L} = ${tc(y78, 2)} \\qquad (\\text{หนังสือ } 0.24 + j0.32)`),
          T('ขั้นที่ 3 — เดินไปทาง generator จนถึงวงกลม g = 1'),
          M(`y = ${tc(ex78.yAtStub, 2)} \\qquad (\\text{หนังสือ } 1 + j1.7)`),
          T(`อ่านระยะจากสเกล wavelengths toward generator: จุด y_L อยู่ที่ ${n(wtg78y, 4)} λ ส่วนจุดที่ g = 1 อยู่ที่ ${n(wtg78g1, 4)} λ (จุด z_L เองอยู่ที่ ${n(wtg78, 4)} λ ซึ่งห่างจาก y_L ครึ่งรอบพอดี)`),
          M(`d = ${n(wtg78g1, 4)} - ${n(wtg78y, 4)} = ${n(ex78.dLambda, 4)}\\lambda \\qquad (\\text{หนังสือ } 0.130\\lambda)`),
          T('ขั้นที่ 4–6 — สตับต้องหักล้าง susceptance ที่เหลือ'),
          M(`b_{stub} = ${n(ex78.bStub, 2)} \\qquad (\\text{หนังสือ } -1.7)`),
          T(`เริ่มจากจุด SHORT ซึ่งอยู่ที่สเกล ${n(wtgShort, 3)} λ พอดี (จุด OPEN อยู่ที่ ${n(wtgOpen, 3)} λ) เดินตามขอบกราฟไปทาง generator จนถึงค่า b นี้`),
          R(`l_s = ${n(ex78.lLambda, 4)}\\lambda - ${n(wtgShort, 3)}\\lambda = ${n(ex78.lLambda, 4)}\\lambda \\qquad (\\text{หนังสือ } 0.085\\lambda)`),
          T('สรุปคำตอบ'),
          R(`d = ${n(ex78.dLambda, 3)}\\lambda, \\qquad l_s = ${n(ex78.lLambda, 3)}\\lambda`),
        ],
        figures: [
          { kind: 'single-stub-walkthrough' },
          { kind: 'lab', label: 'Lab: Example 7-8 ครบวงจร', circuit: () => buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex78.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex78.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 450, X: -600 }]]), showY: true },
        ],
      },
      {
        id: 'after', title: 'ทำไมหลังสตับจึงได้ SWR = 1',
        lines: [
          T('ช่วงระหว่างโหลดกับสตับยังไม่แมตช์ จึงยังมีคลื่นนิ่งอยู่ในช่วงนั้น (ยาว d = 0.130 λ)'),
          T('แต่ที่ตำแหน่งสตับ ผลรวมของแอดมิตแตนซ์เป็น y = 1 พอดี ดังนั้นมองจากสตับย้อนไปทางแหล่งจ่าย จะเห็น Z = Z₀ ตลอด สายหลักด้านแหล่งจ่ายจึงแมตช์สมบูรณ์'),
          N('นี่คือเหตุผลที่ตำแหน่งสตับสำคัญพอ ๆ กับความยาวสตับ — ถ้าติดผิดตำแหน่ง ต่อให้ความยาวถูกก็ไม่แมตช์'),
        ],
        figures: [
          { kind: 'table', title: 'SWR ในแต่ละช่วงของวงจร Example 7-8 (คำนวณโดยแอป)', head: ['ช่วง', 'SWR'],
            rows: [['ที่โหลด ถึงตำแหน่งสตับ', n(swr78, 2)], ['จากสตับไปทางแหล่งจ่าย', '1.00']] },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b10', num: '10', title: 'ผลของความถี่ที่เปลี่ยนไป', titleTh: 'แมตช์สมบูรณ์ที่ความถี่ออกแบบ และยังใช้ได้ในช่วง bandwidth รอบ ๆ นั้น',
    intro: 'บทก่อนเราเลือกตำแหน่งและความยาวสตับให้แมตช์ที่ความถี่หนึ่ง บทนี้ใช้วงจรเดิม แล้วเปลี่ยนเฉพาะความถี่ของเครื่องส่ง ค่อย ๆ ดูว่าเหตุใดสายยาวเท่าเดิมจึงให้ผลไม่เหมือนเดิม และยังใช้ได้ดีในช่วงความถี่ใดบ้าง',
    sections: [
      {
        id: 'physical', title: 'ความยาวจริง กับ ความยาวไฟฟ้า',
        lines: [
          T('เริ่มจากสิ่งที่เราทำจริง: มีสายและสตับที่ตัดเสร็จแล้ว ต่อกับโหลดเดิมอยู่ จากนั้นหมุนความถี่เครื่องส่งจาก 10 เป็น 12 MHz โดยไม่ย้ายจุดต่อสตับและไม่ตัดสายใหม่'),
          T('สิ่งที่คงเดิมในตัวอย่าง: ระยะจากโหลดถึงสตับ d = 3.9 เมตร ความยาวแขนงสตับ l_s = 2.55 เมตร ค่าโหลด และสายอ้างอิง 300 Ω · สิ่งที่เปลี่ยน: ความยาวคลื่น สัดส่วนของคลื่นที่อยู่ในสาย มุมเฟส และอิมพีแดนซ์รวมที่เครื่องส่งเห็น'),
          T('ความถี่ f บอกจำนวนรอบที่สัญญาณสั่นในหนึ่งวินาที ส่วน λ อ่านว่าแลมบ์ดา คือระยะจากยอดคลื่นหนึ่งถึงยอดถัดไป เมื่อคลื่นเดินทางเร็วเท่าเดิมแต่สั่นถี่ขึ้น ระยะระหว่างยอดจึงสั้นลง'),
          T('ความยาวจริงของสาย (เช่น 3.9 เมตร) ไม่เปลี่ยนตามความถี่ แต่ความยาวคลื่นเปลี่ยน'),
          M('\\lambda = \\frac{v}{f} \\;\\Rightarrow\\; f \\uparrow \\;\\Rightarrow\\; \\lambda \\downarrow'),
          T('ในตัวอย่างใช้ v = 300 ล้านเมตรต่อวินาที ที่ 10 ล้านรอบต่อวินาทีจึงเดินทางได้ 30 เมตรต่อหนึ่งรอบ แต่ที่ 12 ล้านรอบต่อวินาทีจะเหลือ 25 เมตรต่อหนึ่งรอบ'),
          T('ความยาวไฟฟ้าบอกว่าสายยาวกี่ส่วนของหนึ่งคลื่น หาได้จากความยาวจริงหารด้วย λ เช่น 3.9 ÷ 30 = 0.130 หมายถึงสายกินระยะ 13% ของหนึ่งคลื่น ไม่ใช่สายยาว 0.130 เมตร'),
          T('เมื่อเปลี่ยนเป็น 12 MHz สายเดิม 3.9 เมตรหารด้วยคลื่นใหม่ 25 เมตรได้ 0.156 หรือ 15.6% ของหนึ่งคลื่น คำว่า “ยาวขึ้นทางไฟฟ้า” หมายถึงสัดส่วนนี้เพิ่มขึ้น ตัวสายไม่ได้ยืดออก'),
          M('\\frac{l}{\\lambda\'} = \\frac{l}{\\lambda}\\cdot\\frac{f\'}{f}'),
          R('f\' = k f \\;\\Rightarrow\\; \\text{ความยาวไฟฟ้าใหม่} = k \\times \\text{ความยาวไฟฟ้าเดิม}'),
          T('k คืออัตราส่วนความถี่ใหม่ต่อความถี่เดิม ในกรณีนี้ k = 12/10 = 1.2 ความยาวไฟฟ้าทั้งสายหลักและสตับจึงคูณ 1.2 พร้อมกัน ส่วนความยาวคลื่นหารด้วย 1.2 จาก 30 เหลือ 25 เมตร'),
          N('แยกมุมสองแบบ: เฟสของคลื่นที่เดินทางตามสายเปลี่ยน 360° × (l/λ) แต่จุด Γ บน Smith Chart หมุน 720° × (l/λ) เพราะการสะท้อนสัมพันธ์กับการเดินทางไปและกลับ สาย λ/4 จึงทำให้เฟสขาเดียวเปลี่ยน 90° แต่จุดบน Smith Chart หมุน 180°'),
          T('สองภาพด้านล่างแยกเหตุกับผลออกจากกัน: ความยาวคลื่นหดลงเมื่อความถี่สูงขึ้น (ภาพแรก) สายเส้นเดิมจึงยาวขึ้นเมื่อวัดเป็น λ (ภาพที่สอง) — ใช้สายจริงของ Example 7-8 คือ d = 3.9 m และ l_s = 2.55 m'),
        ],
        figures: [
          { kind: 'plot', title: 'เหตุ: ความยาวคลื่นหดลงเมื่อความถี่สูงขึ้น (λ = v/f, สายอากาศ)',
            xLabel: 'ความถี่ (MHz)', yLabel: 'λ (m)', xMin: 8, xMax: 14, yMin: 0, yMax: 40,
            series: [{ name: 'λ', points: linspace(8, 14, 121).map((fm) => [fm, 3.9 / ex78AtFreq(fm).d] as [number, number]) }],
            xTicks: [8, 10, 12, 14], yTicks: [0, 10, 20, 30, 40],
            markers: [
              { x: 10, y: 3.9 / ex78AtFreq(10).d, text: `${n(3.9 / ex78AtFreq(10).d, 1)} m ที่ 10 MHz` },
              { x: 12, y: 3.9 / ex78AtFreq(12).d, text: `${n(3.9 / ex78AtFreq(12).d, 1)} m ที่ 12 MHz` },
            ],
            caption: 'คำนวณจากสายจริง 3.9 m หารด้วยความยาวไฟฟ้าที่แอปคำนวณ (λ = l ÷ (l/λ)) · ตัวสายไม่ได้เปลี่ยน สิ่งที่เปลี่ยนคือไม้บรรทัดที่ใช้วัดมัน' },
          { kind: 'plot', title: 'ผล: สายจริงสองเส้นของ Example 7-8 ยาวขึ้นเรื่อย ๆ เมื่อวัดเป็น λ',
            xLabel: 'ความถี่ (MHz)', yLabel: 'ความยาวไฟฟ้า (λ)', xMin: 8, xMax: 14, yMin: 0, yMax: 0.2,
            series: [
              { name: 'ตำแหน่งสตับ d (สาย 3.9 m)', points: linspace(8, 14, 121).map((fm) => [fm, ex78AtFreq(fm).d] as [number, number]) },
              { name: 'ความยาวสตับ l_s (สาย 2.55 m)', color: '#059669', points: linspace(8, 14, 121).map((fm) => [fm, ex78AtFreq(fm).ls] as [number, number]) },
            ],
            xTicks: [8, 10, 12, 14], yTicks: [0, 0.05, 0.1, 0.15, 0.2],
            markers: [
              { x: 10, y: ex78AtFreq(10).d, text: `d = ${n(ex78AtFreq(10).d, 3)} λ` },
              { x: 10, y: ex78AtFreq(10).ls, text: `l_s = ${n(ex78AtFreq(10).ls, 3)} λ`, color: '#059669' },
            ],
            caption: `เส้นตรงผ่านจุดกำเนิดทั้งคู่ เพราะความยาวไฟฟ้าแปรตรงกับ f · ที่ 12 MHz สายเดิมกลายเป็น d = ${n(ex78AtFreq(12).d, 3)} λ และ l_s = ${n(ex78AtFreq(12).ls, 3)} λ ซึ่งไม่ใช่ค่าที่ออกแบบไว้อีกต่อไป` },
        ],
      },
      {
        id: 'ex78f', title: 'Example 7-8 เมื่อความถี่เปลี่ยนจาก 10 เป็น 12 MHz',
        lines: [
          T('เป้าหมายของตัวอย่างนี้คือดูว่าการหักล้างที่เคยพอดีเปลี่ยนไปอย่างไร ให้ตามสามตำแหน่ง: โหลด → จุดต่อสตับก่อนรวมแขนง → ผลรวมที่เครื่องส่งเห็น'),
          W('ตัวอย่างนี้สมมติว่า Z_L, Z₀, VF และ loss ไม่เปลี่ยนตามความถี่ เพื่อแยกให้เห็นผลของ electrical length เพียงอย่างเดียว · อุปกรณ์หรือเสาอากาศจริงมักมี Z_L(f) ที่เปลี่ยนไปด้วย ผลรวมจึงต่างจากนี้'),
          T('ออกแบบไว้ที่ 10 MHz ในสายอากาศ ดังนั้น λ = 30 m'),
          M('d = 0.130 \\times 30 = 3.9\\ \\text{m}, \\qquad l_s = 0.085 \\times 30 = 2.55\\ \\text{m}'),
          T('ที่ 12 MHz ความยาวคลื่นเหลือ 25 m ความยาวจริงเท่าเดิม แต่คิดเป็นความยาวคลื่นใหม่ได้'),
          M(`d' = \\frac{3.9}{25} = ${n(f12.d, 3)}\\lambda', \\qquad l_s' = \\frac{2.55}{25} = ${n(f12.ls, 3)}\\lambda'`),
          T('เครื่องหมายขีดบน d′, l_s′ และ λ′ หมายถึงค่าที่ความถี่ใหม่ โดย d′ และ l_s′ ในสมการนี้เขียนในหน่วยคลื่นใหม่ ระยะจริงบนโต๊ะยังเป็น 3.9 และ 2.55 เมตร'),
          T('ทำไมใช้ y? เพราะสตับต่อขนานกับสายหลักที่จุดเดียวกัน แอดมิตแตนซ์ Y ของแขนงขนานจึงบวกกันได้ง่าย เมื่อ normalize ด้วย Y₀ = 1/300 S จะได้ y = g + jb ที่ไม่มีหน่วย โดย g เป็นส่วนจริง และ b เป็นส่วนจินตภาพ'),
          T('เมื่อคำนวณใหม่ที่ความถี่นี้ (แอปคำนวณให้)'),
          M(`y_{line} = ${tc(f12.yLine, 2)}, \\qquad y_{stub} = ${tc(f12.yStub, 2)}`),
          T(`อ่านตัวเลขทีละส่วน: สายหลักให้ g = ${n(f12.yLine.re, 3)} และ b = +${n(f12.yLine.im, 3)} ส่วนสตับให้ g = 0 และ b = ${n(f12.yStub.im, 3)} การรวมจึงนำส่วนจริงบวกส่วนจริง และส่วนจินตภาพบวกส่วนจินตภาพ`),
          M(`y_{total} = ${tc(f12.yTot, 2)} \\;\\Rightarrow\\; z = ${tc(f12.zTot, 2)}`),
          T(`เงื่อนไขแมตช์คือ y รวม = 1 + j0 แต่ตอนนี้ส่วนจริงเป็น ${n(f12.yTot.re, 3)} ซึ่งไม่ใช่ 1 และยังมีส่วนจินตภาพ ${n(f12.yTot.im, 3)} ซึ่งไม่ใช่ 0 จึงคลาดจากเป้าหมายทั้งสองส่วน สตับอุดมคติเปลี่ยนได้เฉพาะ b จึงไม่สามารถแก้ g ที่คลาดไปได้ด้วยตัวมันเอง`),
          T(`กลับจาก y เป็น z = 1/y แล้วคูณด้วย 300 Ω ได้ Z_in ≈ ${fz(C(f12.zTot.re * 300, f12.zTot.im * 300), 1)} Ω นี่คือค่าที่เครื่องส่งเห็นผ่านวงจรทั้งหมด แม้โหลดที่ปลายสายยังเป็น 450 − j600 Ω เหมือนเดิม`),
          M('\\Gamma=\\frac{z-1}{z+1},\\qquad SWR=\\frac{1+|\\Gamma|}{1-|\\Gamma|}'),
          R(`SWR = ${n(f12.swr, 2)} \\qquad (\\text{จาก } ${n(ex78AtFreq(10).swr, 3)} \\text{ ที่ } 10\\ \\text{MHz})`),
          T(`SWR ≈ ${n(f12.swr, 2)} หมายถึงอัตราส่วนแรงดันสูงสุดต่อแรงดันต่ำสุดบนสายฝั่งเครื่องส่ง กำลังสะท้อนกลับต้องคำนวณจาก |Γ|² × 100 ซึ่งกรณีนี้ประมาณ ${n(abs(gammaFromz(f12.zTot)) ** 2 * 100, 1)}% ไม่ได้แปลว่ากำลังสะท้อนเป็น ${n(f12.swr, 2)} เท่า`),
          N('ลำดับเหตุผลของกรณีนี้: ความถี่เพิ่ม → คลื่นสั้นลง → สายหลักและสตับมีความยาวไฟฟ้าเพิ่ม → ค่าที่จุดต่อสตับและค่าที่สตับเติมเปลี่ยนพร้อมกัน → หักล้างไม่พอดี → จุดรวมออกจากศูนย์กลาง'),
          N(`ข้อสังเกตเรื่องการปัดเศษ: ถ้าใช้ค่าที่ปัดแล้วของหนังสือ (d = 0.130 λ, l_s = 0.085 λ) ที่ 10 MHz จะได้ SWR = ${n(ex78AtFreq(10).swr, 3)} ไม่ใช่ 1.000 พอดี · ค่าที่ไม่ปัดคือ d = ${n(ex78.dLambda, 4)} λ และ l_s = ${n(ex78.lLambda, 4)} λ ซึ่งให้ SWR = 1.000`),
        ],
        figures: [
          { kind: 'plot', title: 'SWR ของวงจร Example 7-8 เมื่อความถี่เปลี่ยน (คำนวณโดยแอป)', xLabel: 'ความถี่ (MHz)', yLabel: 'SWR', xMin: 8, xMax: 12, yMin: 1, yMax: 4,
            series: [{ name: 'SWR', points: linspace(8, 12, 81).map((fm) => [fm, Math.min(4, ex78AtFreq(fm).swr)] as [number, number]) }],
            xTicks: [8, 9, 10, 11, 12], yTicks: [1, 2, 3, 4],
            markers: [{ x: 10, y: ex78AtFreq(10).swr, text: 'ออกแบบที่ 10 MHz' }],
            caption: 'ใกล้แมตช์ที่ 10 MHz (SWR ≈ 1.028 เพราะใช้ความยาวปัดตามหนังสือ) · เมื่อห่างจากย่านออกแบบ SWR สูงขึ้น' },
          { kind: 'table', title: 'ความยาวไฟฟ้าและ SWR ที่ความถี่ต่าง ๆ (ความยาวจริงคงที่)', head: ['f (MHz)', 'λ (m)', 'd (λ)', 'l_s (λ)', 'SWR'],
            rows: [8, 9, 10, 11, 12].map((fm) => { const r = ex78AtFreq(fm); return [n(fm, 0), n(300 / fm, 1), n(r.d, 3), n(r.ls, 3), n(r.swr, 2)]; }) },
        ],
      },
      {
        id: 'ex710', title: 'Example 7-10: ออกแบบแล้วตรวจที่ +10 %',
        lines: [
          T('โจทย์: Z_L = 200 Ω บนสาย Z₀ = 300 Ω · หาตำแหน่งและความยาวสตับปลายลัด แล้วหา SWR เมื่อความถี่เพิ่ม 10 %'),
          T('ขั้นที่ 1 — โหลดเป็นความต้านทานล้วน'),
          M(`z_L = \\frac{200}{300} = ${n(z710.re, 3)} \\qquad SWR = ${n(swr710, 2)} \\quad (\\text{หนังสือ } 1.5)`),
          T('ขั้นที่ 2–3 — ทำงานในรูปแอดมิตแตนซ์ แล้วหาจุดตัดวงกลม g = 1'),
          M(`y = ${tc(ex710.yAtStub, 2)} \\qquad (\\text{หนังสือ } 1 - j0.41)`),
          T('สตับจึงต้องสร้าง susceptance ตรงข้าม'),
          M(`b_{stub} = ${n(ex710.bStub, 2)} \\qquad (\\text{หนังสือ } +0.41)`),
          R(`d = ${n(ex710.dLambda, 3)}\\lambda, \\qquad l_s = ${n(ex710.lLambda, 3)}\\lambda`),
          T('ขั้นที่ 4 — เมื่อความถี่เพิ่ม 10 % ความยาวไฟฟ้าทั้งสองคูณ 1.1'),
          M(`d' = ${n(ex710.dLambda, 3)} \\times 1.1 = ${n(ex710.dLambda * 1.1, 3)}\\lambda', \\qquad l_s' = ${n(ex710.lLambda, 3)} \\times 1.1 = ${n(ex710.lLambda * 1.1, 3)}\\lambda'`),
          T('นำค่าใหม่ไปรวมแอดมิตแตนซ์อีกครั้ง จะได้ (แอปคำนวณให้)'),
          R((() => {
            const d = ex710.dLambda * 1.1, ls = ex710.lLambda * 1.1;
            const yl = admittance(normalize(lineInput(EX710.ZL, 300, d, 0), 300));
            const ys = admittance(normalize(stubInput('short', 300, ls), 300));
            const yt = C(yl.re + ys.re, yl.im + ys.im);
            return `SWR = ${n(swrFromGamma(gammaFromz(admittance(yt))), 2)} \\qquad (\\text{จาก } 1.00)`;
          })()),
          T('คำว่าเพิ่ม 10% หมายถึงนำความถี่เดิมคูณ 1.1 ถ้าอ้างอิงที่ 10 MHz ความถี่ใหม่คือ 11 MHz จากนั้นนำ d และ l_s ในหน่วย λ คูณ 1.1 ทั้งคู่ ไม่ใช่ออกแบบสตับใหม่ให้แมตช์ที่ 11 MHz'),
          N('สำหรับวงจรนี้ที่ +10% ได้ SWR ประมาณ 1.32 จึงยังผ่านเกณฑ์ 2 แต่ไม่ได้แมตช์พอดี ขณะที่ Example 7-8 ที่ +10% ได้ประมาณ 1.63 การเปรียบเทียบนี้บอกผลของสองวงจรที่คำนวณ ไม่ใช่กฎว่าโหลด SWR ต่ำกว่าจะมี bandwidth กว้างกว่าเสมอ'),
        ],
        figures: [
          { kind: 'smith', title: 'Example 7-10: จาก y_L เดินจนถึงวงกลม g = 1', showY: true, gCircles: [1],
            points: [{ z: z710, label: `y_L = ${fz(admittance(z710), 2)}`, cls: 'y' }, { z: admittance(ex710.yAtStub), label: `y = ${fz(ex710.yAtStub, 2)}`, cls: 'in' }],
            curves: [{ zs: swrPath(z710, ex710.dLambda), cls: 'net', arrow: true }], swr: [swr710],
            caption: 'ใช้พิกัด Γ ของโหลดจริงและอ่านค่าจากกริด Y ที่จุดเดิม เส้นทางจึงจบที่ตำแหน่งต่อสตับบนวง g = 1' },
          { kind: 'lab', label: 'Lab: Example 7-10 (ลองเปลี่ยนความถี่ที่แถบบน Canvas ดู SWR เปลี่ยน)',
            circuit: () => buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex710.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex710.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 200, X: 0 }]]), showY: true },
        ],
      },
      {
        id: 'bandwidth', title: 'ความหมายในเชิง bandwidth',
        lines: [
          T('แยก “แมตช์พอดี” ออกจาก “ผ่านเกณฑ์ที่เลือก”: แมตช์พอดีต้อง SWR = 1 แต่หากงานนี้กำหนดให้ SWR ≤ 2 ค่าระหว่าง 1 กับ 2 ก็ถือว่าผ่านได้ การตรวจทีละความถี่จะบอกว่าช่วงใดยังผ่านต่อเนื่องกัน'),
          T('การตรวจ SWR ที่ความถี่อื่นก็คือการหา bandwidth ของระบบ matching นั่นเอง'),
          T('ถ้ากำหนดเกณฑ์ว่า SWR ≤ 2 ก็ดูว่าช่วงความถี่ใดที่กราฟ SWR ยังต่ำกว่าเส้นนั้น'),
          T('อ่านกราฟตามนี้: 1. แกนนอนคือความถี่ 2. แกนตั้งคือ SWR 3. วาดเส้นแนวนอนที่ SWR = 2 4. หาจุดตัดของเส้น SWR กับเส้นเกณฑ์ทั้งสองข้าง 5. อ่านความถี่ของจุดตัดเป็น f₁ และ f₂'),
          T('กรณี Example 7-8 ได้ f₁ ≈ 8.75 MHz และ f₂ ≈ 11.52 MHz ดังนั้น bandwidth ≈ 11.52 − 8.75 = 2.77 MHz คิดเป็นประมาณ 27.8% ของความถี่ออกแบบ 10 MHz เมื่อใช้ค่าขอบที่ยังไม่ปัดเศษ'),
          T('ตัวอย่างการตัดสิน: 10 MHz และ 11 MHz อยู่ในช่วงจึงผ่านเกณฑ์ แต่ 12 MHz อยู่นอกช่วงและมี SWR ≈ 2.36 จึงไม่ผ่านเกณฑ์ 2 ถ้าเปลี่ยนเกณฑ์เป็น 3 ที่ 12 MHz จะผ่าน โดยวงจรและค่า SWR เดิมไม่ได้เปลี่ยน'),
          N('อยู่นอก bandwidth ตามเกณฑ์นี้ไม่ได้หมายความว่าส่งกำลังไม่ได้เลย และ bandwidth สำหรับคุณภาพการแมตช์นี้ไม่ใช่อัตราการส่งข้อมูล หน่วย MHz บอกความกว้างของช่วงความถี่'),
          N(`จากกราฟหัวข้อ 10.2 วงจร Example 7-8 มี SWR ≤ 2 ประมาณช่วง ${(() => { const lo = linspace(6, 10, 200).find((fm) => ex78AtFreq(fm).swr <= 2); const hi = [...linspace(10, 16, 300)].reverse().find((fm) => ex78AtFreq(fm).swr <= 2); return `${n(lo ?? 0, 1)}–${n(hi ?? 0, 1)} MHz`; })()} (คำนวณโดยแอป)`),
          W('Bandwidth ขึ้นกับ Q ของโหลด, topology, ตำแหน่งสตับ, ค่า Z₀, การสูญเสีย และการเปลี่ยนของ Z_L(f) · ตำแหน่งสตับที่ใกล้โหลดกว่าไม่ได้รับประกันว่า bandwidth จะกว้างกว่าเสมอ จึงควรตรวจด้วย frequency sweep ทุกครั้ง'),
          N('แนวทางที่มักช่วยได้คือลด Q ของเครือข่าย หรือใช้ matching หลายขั้น (multi-section) แต่ทุกครั้งต้องยืนยันด้วยกราฟ SWR–ความถี่ของวงจรจริง'),
          T('กราฟด้านล่างวางเส้นเกณฑ์ SWR = 2 ทับกราฟ SWR–ความถี่ ช่วงความถี่ที่กราฟยังอยู่ใต้เส้นคือ bandwidth ตามเกณฑ์นี้'),
        ],
        figures: [
          { kind: 'plot', title: 'อ่าน bandwidth จากกราฟ: ช่วงที่ SWR ยังอยู่ใต้เส้นเกณฑ์ (วงจร Example 7-8 คำนวณโดยแอป)',
            xLabel: 'ความถี่ (MHz)', yLabel: 'SWR', xMin: 8, xMax: 13, yMin: 1, yMax: 4,
            series: [
              { name: 'SWR ของวงจร', points: linspace(8, 13, 201).map((fm) => [fm, ex78AtFreq(fm).swr] as [number, number]) },
              { name: 'เกณฑ์ SWR = 2', color: '#dc2626', dashed: true, points: [[8, 2], [13, 2]] },
            ],
            xTicks: [8, 9, 10, 11, 12, 13], yTicks: [1, 2, 3, 4],
            markers: (() => {
              const lo = linspace(8, 10, 401).find((fm) => ex78AtFreq(fm).swr <= 2) ?? 10;
              const hi = [...linspace(10, 13, 601)].reverse().find((fm) => ex78AtFreq(fm).swr <= 2) ?? 10;
              return [{ x: lo, y: 2, text: `${n(lo, 2)} MHz` }, { x: hi, y: 2, text: `${n(hi, 2)} MHz` }];
            })(),
            caption: 'จุดแดงสองจุดคือขอบแบนด์ · ช่วงระหว่างจุดทั้งสองคือย่านที่ยังใช้งานได้ตามเกณฑ์ SWR ≤ 2 ส่วนนอกช่วงนั้นถือว่าหลุดแมตช์แล้ว' },
          { kind: 'table', title: 'bandwidth ของวงจร Example 7-8 ที่เกณฑ์ SWR ≤ 2 (คำนวณโดยแอป)',
            head: ['รายการ', 'ค่า'],
            rows: (() => {
              const lo = linspace(8, 10, 401).find((fm) => ex78AtFreq(fm).swr <= 2) ?? 10;
              const hi = [...linspace(10, 13, 601)].reverse().find((fm) => ex78AtFreq(fm).swr <= 2) ?? 10;
              return [
                ['ความถี่ออกแบบ f₀', '10 MHz'],
                ['SWR ที่ f₀', n(ex78AtFreq(10).swr, 3)],
                ['ขอบล่าง f₁ (SWR = 2)', `${n(lo, 2)} MHz`],
                ['ขอบบน f₂ (SWR = 2)', `${n(hi, 2)} MHz`],
                ['bandwidth = f₂ − f₁', `${n(hi - lo, 2)} MHz`],
                ['bandwidth เชิงสัดส่วน', `${n(((hi - lo) / 10) * 100, 1)} %`],
              ];
            })(),
            caption: `เกณฑ์ที่ต่างกันให้แบนด์วิดท์ต่างกัน ถ้าเปลี่ยนเป็น SWR ≤ 1.5 ช่วงจะแคบลงทันที · SWR ที่ f₀ ไม่ใช่ 1.000 พอดีเพราะใช้ความยาวที่ปัดเศษของหนังสือ (ดูหัวข้อ 10.2)` },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b11', num: '11', title: 'สรุปและรูปแบบการทำโจทย์', titleTh: 'ทักษะที่ต้องทำได้',
    intro: 'บทสุดท้ายเปรียบเทียบสองวิธี matching และสรุปเป็นแผนผังเดียวที่ใช้ตอบโจทย์ Smith Chart ได้เกือบทุกข้อ',
    sections: [
      {
        id: 'compare', title: 'หม้อแปลง λ/4 เทียบกับ stub',
        lines: [
          T('ทั้งสองวิธีพาจุดเข้าศูนย์กลางเหมือนกัน แต่คนละกลไก'),
        ],
        figures: [
          { kind: 'table', title: 'เปรียบเทียบสองวิธี', head: ['หัวข้อ', 'หม้อแปลง λ/4', 'สตับขนาน'],
            rows: [
              ['ทำงานในโดเมน', 'อิมพีแดนซ์ (z)', 'แอดมิตแตนซ์ (y)'],
              ['ต้องหาอะไรก่อน', 'จุดที่ x = 0 (ความต้านทานล้วน)', 'จุดที่ g = 1'],
              ['ตัวแปรที่ออกแบบ', 'Z_T ของสาย λ/4', 'ตำแหน่ง d และความยาว l_s'],
              ['สูตรหลัก', 'Z_T = √(Z₀ R′)', 'y_stub = −jb'],
              ['ต้องใช้สายที่มี Z₀ พิเศษไหม', 'ต้อง (Z_T มักไม่ใช่ค่ามาตรฐาน)', 'ไม่ต้อง ใช้สายชนิดเดียวกันได้'],
              ['ปรับจูนหลังติดตั้ง', 'ยาก', 'ง่าย (เลื่อนตัวลัดวงจร)'],
            ] },
          { kind: 'smith', title: 'เส้นทางบนกราฟของสองวิธี สำหรับโหลดเดียวกัน (z = 1.33 − j0.67)', showY: true,
            points: [{ z: z77, label: 'z_L', cls: 'load' }, { z: C(1, 0), label: 'เป้าหมาย · ยังไปไม่ถึง', cls: 'goal' }],
            curves: [
              { zs: swrPath(z77, ex77.dLambda), cls: 'net', arrow: true },
              { zs: swrPath(admittance(z77), solveSingleStub(EX77.ZL, EX77.Z0, 'short')[0].dLambda), cls: 'y', arrow: true },
            ],
            gCircles: [1], xCircles: [0], swr: [swr77],
            caption: 'ม่วง = เดินไปหาจุด x = 0 สำหรับหม้อแปลง λ/4 · เขียวอมฟ้า = เดินไปหาวงกลม g = 1 สำหรับสตับ' },
        ],
      },
      {
        id: 'flow', title: 'แผนผังเดียวสำหรับทำโจทย์',
        lines: [
          K('Z_L, Z₀\n   ↓\nz_L = Z_L / Z₀        ← normalize เสมอ\n   ↓\nพล็อตจุด + ลากวงกลม SWR คงที่\n   ↓\nอ่าน SWR ที่จุดตัดแกนนอนด้านขวา\n   ↓\nโจทย์ถามอะไร?\n ├─ อิมพีแดนซ์ที่ตำแหน่งอื่น → เดินบนวงกลม SWR ตามระยะ λ (ตามเข็ม = ไปทาง generator)\n ├─ แอดมิตแตนซ์            → หมุน 180° ผ่านศูนย์กลาง\n ├─ หม้อแปลง λ/4          → เดินจนถึง x = 0 อ่าน R′ แล้ว Z_T = √(Z₀R′)\n └─ สตับ                   → แปลงเป็น y, เดินจนถึง g = 1 ได้ 1 ± jb แล้วสร้างสตับ ∓jb'),
          T(`ตารางด้านล่างเดินแผนผังนี้ให้ดูทีละกิ่ง ด้วยโหลดประจำคอร์ส ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω และภาพถัดไปคือกราฟใบเดียวที่ตอบได้ทุกกิ่ง`),
        ],
        figures: [
          { kind: 'table', title: `แผนผังเดินจริงทีละกิ่ง — โหลด ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω (คำนวณโดยแอป)`,
            head: ['โจทย์ถามอะไร', 'ทำอะไรบนกราฟ', 'คำตอบของโหลดนี้'],
            rows: (() => {
              const q = solveQwt(APP_ZL, APP_Z0).slice().sort((a, b) => a.dLambda - b.dLambda)[0];
              const s = solveSingleStub(APP_ZL, APP_Z0, 'short')[0];
              const zw = zFromGamma(rotateTowardGenerator(gApp, 0.15));
              return [
                ['SWR บนสาย', 'อ่าน r ที่จุดตัดแกนนอนด้านขวาของวงกลม SWR', `SWR = ${n(swrApp, 3)}`],
                ['อิมพีแดนซ์ห่างโหลด 0.15 λ', 'เดินตามวงกลม SWR ตามเข็ม 0.15 λ', `z = ${fz(zw, 3)} → Z = ${fz(denormalize(zw, APP_Z0), 1)} Ω`],
                ['แอดมิตแตนซ์ของโหลด', 'หมุน 180° ผ่านศูนย์กลาง', `y = ${fz(yApp, 0)} → Y = ${fz(denormalize(yApp, 1 / APP_Z0), 4)} S`],
                ['หม้อแปลง λ/4', 'เดินจนถึง x = 0 อ่าน R′ แล้ว Z_T = √(Z₀R′)', `d = ${n(q.dLambda, 3)} λ, R′ = ${n(q.Rreal, 1)} Ω, Z_T = ${n(q.Zt, 1)} Ω`],
                ['สตับขนานปลายลัด', 'แปลงเป็น y เดินจนถึง g = 1 แล้วสร้างสตับ ∓jb', `d = ${n(s.dLambda, 3)} λ, b = ${n(s.bStub, 2)}, l_s = ${n(s.lLambda, 3)} λ`],
              ];
            })(),
            caption: 'ทุกกิ่งเริ่มจากสองอย่างเดียวกันเสมอ: จุด z_L และวงกลม SWR ของมัน · ที่ต่างกันคือ "เดินไปหยุดที่เส้นไหน"' },
          { kind: 'chart', title: 'กราฟใบเดียว ตอบได้ทุกกิ่งของแผนผัง', scale: true, fine: false,
            points: [
              { z: zApp, label: `z_L = ${fz(zApp, 1)} ที่ ${n(wtgZApp, 4)} λ`, cls: 'load' },
              { z: yApp, label: `y_L = ${fz(yApp, 0)} (หมุน 180°)`, cls: 'y' },
              { z: C(swrApp, 0), label: `x = 0 → R′ = ${n(swrApp * APP_Z0, 1)} Ω`, cls: 'in' },
            ],
            curves: [
              { zs: [zApp, C(1, 0), yApp], cls: 'mid', dashed: true },
              { zs: swrPath(zApp, solveQwt(APP_ZL, APP_Z0).slice().sort((a, b) => a.dLambda - b.dLambda)[0].dLambda), cls: 'net', arrow: true },
            ],
            swr: [swrApp], xCircles: [0], rCircles: [1],
            caption: 'เส้นประ = กิ่ง "แอดมิตแตนซ์" (หมุน 180°) · ลูกศร = กิ่ง "หม้อแปลง λ/4" (เดินจนตัดเส้น x = 0) · วงกลม r = 1 ที่เน้นไว้คือวงกลม g = 1 เมื่ออ่านจุด y — สังเกตว่า y_L ตกลงบนวงนี้พอดี จึงติดสตับได้ที่ d = 0' },
        ],
      },
      {
        id: 'skills', title: 'หกทักษะที่ต้องทำได้',
        lines: [
          K('1. normalize และ denormalize ทั้ง Z และ Y\n2. พล็อต r + jx ลงบนกราฟให้ถูกครึ่ง (ระวังเครื่องหมาย)\n3. วาดและอ่านวงกลม SWR คงที่\n4. เดิน toward generator / toward load ด้วยหน่วย λ ให้ถูกทิศ\n5. แปลง Z ↔ Y และออกแบบหม้อแปลง λ/4\n6. ทำ single short-circuited stub matching รวมถึงตรวจเมื่อความถี่เปลี่ยน'),
          N('ทุกทักษะฝึกได้ในแท็บ 🔬 Lab: บทเรียน 14 ระดับสำหรับทักษะ 1–4 และโจทย์ Z/Y กับ B-1…B-4 สำหรับทักษะ 5–6'),
        ],
        figures: [
          { kind: 'lab', label: 'ฝึกทักษะ 1–3: โหลด 25 + j25 Ω บนสาย 50 Ω', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 25, X: 25 }]]) },
          { kind: 'lab', label: 'ฝึกทักษะ 4: สาย 0.15 λ ต่อโหลด 100 − j50 Ω (ใช้ Probe)', circuit: () => buildCircuit(100e6, 75, [['tline', 'series', { Z0: 75, len: 0.15, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
          { kind: 'lab', label: 'ฝึกทักษะ 5: หม้อแปลง λ/4 ของ Example 7-7', circuit: () => buildCircuit(100e6, 75, [['qwt', 'series', { Zt: Number(ex77.Zt.toFixed(2)) }], ['tline', 'series', { Z0: 75, len: Number(ex77.dLambda.toFixed(4)), vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: -50 }]]) },
          { kind: 'lab', label: 'ฝึกทักษะ 6: สตับของ Example 7-8', circuit: () => buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex78.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex78.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 450, X: -600 }]]), showY: true },
        ],
      },
      {
        id: 'mistakes', title: 'ข้อผิดพลาดที่พบบ่อย',
        lines: [
          T('เก้าข้อนี้คือที่มาของคำตอบผิดเกือบทั้งหมด ทั้งในการบ้านและในงานจริง ให้ไล่อ่านทวนก่อนสรุปคำตอบทุกครั้ง'),
          K('1. ลืม normalize                    → พล็อต Z จริงลงกราฟตรง ๆ แทน z = Z/Z₀\n2. ใช้ Z₀ ผิดค่า                     → หารด้วย 75 Ω ทั้งที่สายเป็น 50 Ω\n3. สลับ inductive กับ capacitive     → +jx อยู่ครึ่งบน, −jx อยู่ครึ่งล่าง\n4. สลับ toward generator กับ toward load → ตามเข็ม / ทวนเข็ม\n5. อ่านระยะโดยไม่ wrap ที่ 0.5 λ     → ค่าที่เกิน 0.5 ต้องลบ 0.5 ออก\n6. บวก shunt admittance บนกริดอิมพีแดนซ์ → ต้องหมุนไปที่กริด y ก่อนบวก\n7. เปลี่ยนความถี่แล้วยังใช้ความยาวไฟฟ้าเดิม → ความยาวจริงคงที่ แต่ l/λ เปลี่ยน\n8. ลืมว่า single stub มีสองคำตอบเสมอ → เป็นการ "เลือก" ไม่ใช่มีทางเดียว\n9. ลืมเงื่อนไขของกฎแต่ละข้อ          → lossless, passive, Z₀ จริงบวก, สายสม่ำเสมอ'),
          W('**ข้อ 1 กับข้อ 2 อันตรายที่สุด เพราะกราฟยังอ่านออกมาเป็นตัวเลขสวย ๆ ได้ตามปกติ** ผิดโดยไม่มีสัญญาณเตือน'),
          T(`ตารางด้านล่างใช้โหลดประจำคอร์ส Z_L = ${fz(APP_ZL, 0)} Ω บนสาย ${APP_Z0} Ω (z_L = ${fz(zApp, 1)}, y_L = ${fz(yApp, 0)}, SWR = ${n(swrApp, 3)}) — คำนวณโดยแอปทั้งหมด`),
          N(`ข้อ 6 เห็นชัดที่สุดกับโหลดนี้: y_L = ${fz(yApp, 0)} อยู่บนวงกลม g = 1 อยู่แล้ว บวก shunt b = +1 บนกริด y จะได้ y = ${fz(C(yApp.re, yApp.im + 1), 0)} คือแมตช์พอดี แต่ถ้าเผลอบวก j1 ลงบนกริด z จะได้ ${fz(C(zApp.re, zApp.im + 1), 1)} ซึ่งไม่แมตช์`),
          N('ทวนแต่ละข้อได้ที่: ข้อ 1–2 บทที่ 2.3 · ข้อ 3 บทที่ 3.3 · ข้อ 4 บทที่ 5.2 · ข้อ 5 บทที่ 5.3 · ข้อ 6 บทที่ 6.3 · ข้อ 7 บทที่ 10.1 · ข้อ 8 บทที่ 9.3 · ข้อ 9 บทที่ 4.4'),
        ],
        figures: [
          { kind: 'table', title: 'ทำผิดแล้วได้อะไร เทียบกับที่ถูกต้อง (คำนวณโดยแอป)',
            head: ['ข้อผิดพลาด', 'ผลที่ได้ถ้าทำผิด', 'ที่ถูกต้อง'],
            rows: [
              ['1. ลืม normalize', `พล็อต ${fz(APP_ZL, 0)} เป็น z → SWR = ${n(swrFromGamma(gammaFromz(APP_ZL)), 1)}`, `z = ${fz(zApp, 1)} → SWR = ${n(swrApp, 3)}`],
              ['2. ใช้ Z₀ = 75 Ω แทน 50 Ω', `z = ${fz(normalize(APP_ZL, 75), 3)} → SWR = ${n(swrFromGamma(gammaFromZ(APP_ZL, 75)), 2)}`, `z = ${fz(zApp, 1)} → SWR = ${n(swrApp, 3)}`],
              ['3. สลับเครื่องหมาย x', `${fz(C(zApp.re, -zApp.im), 1)} → y = ${fz(admittance(C(zApp.re, -zApp.im)), 0)}`, `${fz(zApp, 1)} → y = ${fz(yApp, 0)}`],
              ['4. หมุนผิดทิศ 0.1 λ', `ทวนเข็ม (toward load) → z = ${fz(zFromGamma(rotateTowardGenerator(gApp, -0.1)), 3)}`, `ตามเข็ม (toward generator) → z = ${fz(zFromGamma(rotateTowardGenerator(gApp, 0.1)), 3)}`],
              ['5. ไม่ wrap ที่ 0.5 λ', `${n(wtgZApp, 4)} + 0.45 = ${n(wtgZApp + 0.45, 4)} λ (ไม่มีบนสเกล)`, `${n((wtgZApp + 0.45) % 0.5, 4)} λ → z = ${fz(zFromGamma(rotateTowardGenerator(gApp, 0.45)), 3)}`],
              ['6. บวก shunt b บนกริด z', `z + j1 = ${fz(C(zApp.re, zApp.im + 1), 2)} (ยังไม่แมตช์)`, `y + j1 = ${fz(C(yApp.re, yApp.im + 1), 0)} → z = ${fz(admittance(C(yApp.re, yApp.im + 1)), 0)}`],
              ['7. ไม่คิดความยาวไฟฟ้าใหม่', 'คิดว่ายังได้ SWR = 1.00 ที่ 12 MHz', `จริง ๆ d = ${n(ex78AtFreq(12).d, 3)} λ → SWR = ${n(ex78AtFreq(12).swr, 2)}`],
            ],
            caption: 'ทุกแถวใช้โหลดเดียวกัน ยกเว้นแถว 7 ที่ใช้วงจร Example 7-8' },
          { kind: 'table', title: 'ข้อ 8 — สตับเดี่ยวของ Example 7-8 มีสองคำตอบ และทั้งคู่ให้ SWR = 1 (คำนวณโดยแอป)',
            head: ['คำตอบ', 'd (λ)', 'y ที่ตำแหน่งสตับ', 'b ของสตับ', 'l_s ปลายลัด (λ)'],
            rows: solveSingleStub(EX78.ZL, EX78.Z0, 'short').map((s, i) => [`ที่ ${i + 1}`, n(s.dLambda, 4), fz(s.yAtStub, 3), n(s.bStub, 3), n(s.lLambda, 4)]),
            caption: 'หนังสือหยิบคำตอบแรกมาใช้ แต่คำตอบที่สองก็แมตช์ได้เท่ากัน · เลือกจากความยาวสายที่ทำได้จริงและจาก bandwidth ที่กวาดความถี่แล้ว' },
          { kind: 'chart', title: 'ข้อ 3 และข้อ 6 บนกราฟใบเดียวกัน (คำนวณโดยแอป)', showY: true, scale: false,
            points: [
              { z: zApp, label: `ถูก: z_L = ${fz(zApp, 1)}`, cls: 'load' },
              { z: C(zApp.re, -zApp.im), label: `ผิดข้อ 3: ${fz(C(zApp.re, -zApp.im), 1)}`, cls: 'mid' },
              { z: C(zApp.re, zApp.im + 1), label: `ผิดข้อ 6: ${fz(C(zApp.re, zApp.im + 1), 1)}`, cls: 'in' },
              { z: admittance(C(yApp.re, yApp.im + 1)), label: `ถูกข้อ 6: z = ${fz(admittance(C(yApp.re, yApp.im + 1)), 0)}`, cls: 'y' },
            ],
            gCircles: [1], swr: [swrApp],
            caption: 'จุดสีแดงคือคำตอบที่ถูก · จุดผิดข้อ 3 อยู่คนละครึ่งกราฟ · จุดผิดข้อ 6 หลุดออกนอกวงกลม SWR เดิม ส่วนที่ถูกต้องลงกลางกราฟพอดี' },
        ],
      },
      {
        id: 'vna', title: 'จากกราฟสู่การวัดจริง: ระนาบอ้างอิง สายวัด และการคาลิเบรต',
        lines: [
          T('ทั้งคอร์สนี้เป็นจุดบนกระดาษ หัวข้อสุดท้ายเชื่อมมันเข้ากับเครื่องมือจริง เพราะเครื่องวัดที่ใช้กันทุกวันนี้แสดงผลเป็น Smith Chart ใบเดียวกันนี้ตรง ๆ'),
          T('VNA (vector network analyzer) ไม่ได้วัด Z โดยตรง มันวัดคลื่นสะท้อนแล้วรายงานเป็น Γ ซึ่งบนหน้าจอเรียกว่า S₁₁ จากนั้นจึงคำนวณ Z ให้ดู'),
          M('S_{11} = \\Gamma = \\frac{Z - Z_0}{Z + Z_0} \\;\\Rightarrow\\; Z = Z_0\\,\\frac{1+\\Gamma}{1-\\Gamma}'),
          T('คำถามที่ต้องถามทุกครั้งคือ "Γ ที่ระนาบไหน" เพราะค่าที่วัดได้เป็นของระนาบอ้างอิง (reference plane) เสมอ ซึ่งคือระนาบที่คาลิเบรตไว้ ไม่ใช่ระนาบที่โหลดอยู่ ถ้าคาลิเบรตไว้ที่หัวต่อของเครื่อง สายวัดทั้งเส้นจะถูกนับรวมเป็นส่วนหนึ่งของสิ่งที่ถูกวัด'),
          T(`ทำเป็นตัวเลขด้วยโหลดประจำคอร์ส Z_L = ${fz(APP_ZL, 0)} Ω บนระบบ ${APP_Z0} Ω ต่อผ่านสายวัดยาว ${n(VNA_LEN_M, 2)} m ที่มี velocity factor ${n(VNA_VF, 2)} วัดที่ ${n(VNA_F / 1e6, 0)} MHz (ความยาวสาย velocity factor และความถี่ เป็นค่าสมมุติ ที่เหลือแอปคำนวณให้ทั้งหมด)`),
          M(`\\lambda = \\frac{vf \\cdot c}{f} = ${n(VNA_LAM, 4)}\\ \\text{m} \\;\\Rightarrow\\; l = \\frac{${n(VNA_LEN_M, 2)}}{${n(VNA_LAM, 4)}} = ${n(VNA_LEN, 4)}\\lambda`),
          T('สายเส้นนี้จึงหมุนจุดไปตามวงกลม SWR เป็นมุม'),
          M(`2\\beta l = 2 \\times 360^\\circ \\times ${n(VNA_LEN, 4)} = ${n(720 * VNA_LEN, 1)}^\\circ`),
          T('ผลคือโหลดตัวเดิม ที่ไม่ได้ถูกแตะเลย ให้ค่าอ่านคนละตัวเลขที่สองระนาบ'),
          R(`Z_{\\text{ที่โหลด}} = ${tc(APP_ZL, 0)}\\,\\Omega \\qquad Z_{\\text{ที่หัวต่อเครื่อง}} = ${tc(ZVna0, 2)}\\,\\Omega`),
          N(`สายเส้นนี้ยาวเกือบ λ/4 พอดี (${n(VNA_LEN, 4)} λ) ค่าที่อ่านได้จึงเกือบเท่ากับ Z₀²/Z_L = ${fz(ZQuarter, 0)} Ω ซึ่งก็คือจุด "ตรงข้าม" ของหัวข้อ 6.4 นั่นเอง · ถ้าไม่รู้ว่ามีสายคั่นอยู่ จะสรุปผิดทันทีว่าโหลดเป็น capacitive ทั้งที่ของจริงเป็น inductive`),
          W(`SWR อย่างเดียวบอกไม่ได้ว่ากำลังดูระนาบไหน — บนสายไร้การสูญเสีย SWR ที่หัวต่อเครื่องกับที่โหลดเท่ากันเป๊ะ (${n(swrFromGamma(gVna0), 3)} ทั้งคู่) return loss ก็เท่ากัน สิ่งที่เปลี่ยนมีอย่างเดียวคือมุมของ Γ`),
          T('คาลิเบรตคือการย้ายระนาบอ้างอิง ไม่ใช่การ "ทำให้เครื่องแม่นขึ้น" เฉย ๆ เมื่อทำ SOL (short-open-load) ที่ปลายสายวัด เครื่องจะรู้จักสายเส้นนั้นแล้วหักผลของมันออก ผลบนกราฟคือหมุนจุดกลับไปทาง load เป็นมุมเท่าเดิม'),
          M(`\\Gamma_{\\text{ที่โหลด}} = \\Gamma_{\\text{ที่วัดได้}}\\;e^{+j2\\beta l} \\qquad (${n(720 * VNA_LEN, 1)}^\\circ \\text{ ทวนเข็ม})`),
          R(`${tc(ZVna0, 2)} \\;\\longrightarrow\\; ${tc(ZVnaBack, 1)}\\,\\Omega \\qquad \\text{กลับมาเท่าโหลดเดิมพอดี}`),
          N(`ฟังก์ชัน port extension หรือ de-embedding ในเครื่องรุ่นใหม่ทำสิ่งเดียวกันโดยไม่ต้องต่อมาตรฐาน คือหมุนกลับให้ตามความยาวที่เราป้อน · ความละเอียดที่ต้องการ: ที่ ${n(VNA_F / 1e6, 0)} MHz ระนาบอ้างอิงที่คลาดไป 1 mm ทำให้มุมของ Γ เพี้ยนไป ${n(720 / (VNA_LAM * 1000), 3)}° และตัวเลขนี้โตขึ้นตามความถี่ จึงต้องใช้ cal kit ที่ระบุ offset ของหัวต่อไว้จริง ๆ`),
          T('สายที่มีการสูญเสียทำสองอย่างพร้อมกัน คือหมุน และดึงจุดเข้าหาศูนย์กลาง เส้นทางจึงเป็นเกลียวแทนที่จะเป็นวงกลม'),
          M('\\Gamma_{\\text{ที่วัดได้}} = \\Gamma_L\\,e^{-2\\alpha l}\\,e^{-j2\\beta l}'),
          T(`สายในตัวอย่างนี้สั้นมาก การสูญเสียจึงแทบไม่มีผล: ${n(VNA_LOSS_PER_M, 2)} dB/m × ${n(VNA_LEN_M, 2)} m = ${n(VNA_LOSS, 3)} dB เที่ยวเดียว ทำให้ SWR ที่อ่านได้ลดจาก ${n(swrApp, 3)} เหลือ ${n(swrFromGamma(vnaG(VNA_LOSS)), 3)} เท่านั้น แต่ถ้าเป็นสายฟีดยาว ๆ หรือความถี่สูงขึ้น ตัวเลขจะเริ่มหลอกอย่างชัดเจน`),
          R(`\\text{loss } ${n(VNA_BIGLOSS, 1)}\\ \\text{dB} \\;\\Rightarrow\\; SWR_{\\text{ที่เครื่อง}} = ${n(swrFromGamma(vnaG(VNA_BIGLOSS)), 3)} \\quad \\text{แต่ที่โหลดจริงยังเป็น } ${n(swrApp, 3)}`),
          T('มีความสัมพันธ์ที่ใช้ตรวจในหัวได้ทันที เพราะคลื่นเดินผ่านสายสองเที่ยว return loss ที่วัดได้จึงดูดีขึ้นเป็นสองเท่าของการสูญเสียในสาย'),
          M('RL_{\\text{วัดได้}} = RL_{\\text{จริง}} + 2L_{\\text{สาย}}'),
          R(`${n(returnLossDb(gApp), 2)} + 2 \\times ${n(VNA_BIGLOSS, 1)} = ${n(returnLossDb(vnaG(VNA_BIGLOSS)), 2)}\\ \\text{dB} \\qquad \\text{(ตรงกับที่แอปคำนวณ)}`),
          W('อาการคลาสสิกในสนาม: เสาอากาศเสื่อมหรือสายฟีดเปียกน้ำ แต่ SWR ที่หน้าเครื่องกลับ "ดีขึ้น" — ไม่ใช่เพราะเสาดีขึ้น แต่เพราะสายกินกำลังสะท้อนไปเสียก่อน · เทียบกับเกลียวเข้าศูนย์กลางในหัวข้อ 4.4'),
          N('สรุปสามข้อ: (1) ค่าที่ VNA อ่านคือ Γ ที่ระนาบอ้างอิง ไม่ใช่ที่โหลด (2) สายที่ต่อเพิ่มหมุนจุดตามเข็มบนวงกลม SWR เป็นมุม 2βl (3) คาลิเบรตคือการหมุนกลับ ส่วนการสูญเสียคือรัศมีที่หายไป ซึ่งการคาลิเบรตที่ปลายสายจะหักออกให้ด้วยเช่นกัน'),
        ],
        figures: [
          { kind: 'chart', title: `สายวัด ${n(VNA_LEN_M, 2)} m (= ${n(VNA_LEN, 4)} λ) พาจุดไปไหน และคาลิเบรตพากลับมาอย่างไร`, scale: true, fine: false,
            points: [
              { z: zApp, label: `ระนาบที่โหลด: ${fz(APP_ZL, 0)} Ω`, cls: 'load' },
              { z: zVna0, label: `ระนาบที่เครื่อง: ${fz(ZVna0, 1)} Ω`, cls: 'in' },
            ],
            curves: [
              { zs: vnaPath(0), cls: 'net', arrow: true, label: 'ต่อสายวัด → ตามเข็ม' },
              { zs: vnaPath(0).slice().reverse(), cls: 'y', dashed: true, arrow: true, label: 'คาลิเบรต → ทวนเข็ม' },
            ],
            swr: [swrApp],
            caption: `สองจุดนี้คือโหลดตัวเดียวกัน ต่างกันแค่ระนาบอ้างอิง · บนสเกลรอบนอกจุดเลื่อนจาก ${n(wtgZApp, 4)} λ ไป ${n(wtgFromGamma(gVna0), 4)} λ คือ ${n(VNA_LEN, 4)} λ พอดีตามความยาวสาย · วงกลม SWR วงเดียวกันทั้งคู่ เพราะสายไร้การสูญเสียไม่เปลี่ยนรัศมี` },
          { kind: 'table', title: 'โหลดตัวเดียวกัน อ่านได้สองแบบ เพราะระนาบอ้างอิงคนละที่ (สายไร้การสูญเสีย — คำนวณโดยแอป)',
            head: ['ระนาบอ้างอิง', 'Z ที่อ่านได้ (Ω)', 'z', '|Γ|', 'มุมของ Γ', 'สเกล (λ)', 'SWR', 'return loss (dB)'],
            rows: [
              ['ที่โหลด (คาลิเบรตที่ปลายสายแล้ว)', fz(APP_ZL, 1), fz(zApp, 2), n(abs(gApp), 4), `${n(deg(arg(gApp)), 1)}°`, n(wtgZApp, 4), n(swrApp, 3), n(returnLossDb(gApp), 2)],
              [`ที่หัวต่อเครื่อง (สาย ${n(VNA_LEN_M, 2)} m อยู่ในระบบ)`, fz(ZVna0, 1), fz(zVna0, 2), n(abs(gVna0), 4), `${n(deg(arg(gVna0)), 1)}°`, n(wtgFromGamma(gVna0), 4), n(swrFromGamma(gVna0), 3), n(returnLossDb(gVna0), 2)],
            ],
            caption: `|Γ| SWR และ return loss เท่ากันทุกตัว ต่างกันเฉพาะมุม ${n(deg(arg(gApp)) - deg(arg(gVna0)), 1)}° ซึ่งเท่ากับ 2βl ของสายเส้นนี้พอดี · นี่คือเหตุผลที่ SWR meter บอกไม่ได้ว่าโหลดเป็นอะไร บอกได้แค่ว่าสะท้อนมากแค่ไหน` },
          { kind: 'chart', title: `สายเส้นเดียวกันแต่มีการสูญเสีย ${n(VNA_BIGLOSS, 1)} dB (ค่าสมมุติ): หมุนด้วย เข้าศูนย์กลางด้วย`, scale: false, fine: false,
            points: [
              { z: zApp, label: `ที่โหลด SWR = ${n(swrApp, 2)}`, cls: 'load' },
              { z: zVna0, label: 'ไร้การสูญเสีย', cls: 'in' },
              { z: zVnaL, label: `สูญเสีย ${n(VNA_BIGLOSS, 1)} dB → SWR = ${n(swrFromGamma(vnaG(VNA_BIGLOSS)), 2)}`, cls: 'mid' },
            ],
            curves: [
              { zs: vnaPath(0), cls: 'net', dashed: true },
              { zs: vnaPath(VNA_BIGLOSS), cls: 'mid', arrow: true },
            ],
            swr: [swrApp, swrFromGamma(vnaG(VNA_BIGLOSS))],
            caption: `เส้นประ = สายไร้การสูญเสีย เดินอยู่บนวงกลมเดิม · เส้นทึบ = สายที่มีการสูญเสีย รัศมีหดลงระหว่างทาง · วงกลมสองวงคือ SWR ที่โหลดและ SWR ที่เครื่องอ่านได้ ซึ่งต่ำกว่าความจริง` },
          { kind: 'table', title: `ค่าที่เครื่องอ่านได้ที่ปลายสาย ${n(VNA_LEN, 4)} λ เมื่อการสูญเสียของสายต่างกัน (ค่า loss เป็นค่าสมมุติ ที่เหลือคำนวณโดยแอป)`,
            head: ['loss ของสาย (dB เที่ยวเดียว)', 'Z ที่อ่านได้ (Ω)', '|Γ|', 'SWR ที่อ่านได้', 'return loss (dB)', 'มุมของ Γ', 'SWR จริงที่โหลด'],
            rows: VNA_LOSSES.map((L) => [n(L, 3), fz(vnaZ(L), 2), n(abs(vnaG(L)), 4), n(swrFromGamma(vnaG(L)), 3), n(returnLossDb(vnaG(L)), 2), `${n(deg(arg(vnaG(L))), 1)}°`, n(swrApp, 3)]),
            caption: `คอลัมน์มุมของ Γ เท่ากันทุกแถว เพราะการสูญเสียลดแต่รัศมี ไม่หมุน · ยิ่ง loss มาก SWR ที่เครื่องยิ่งต่ำและ return loss ยิ่งดูดี ทั้งที่โหลดไม่ได้เปลี่ยนเลย · แถวสุดท้ายอ่านได้ ${n(swrFromGamma(vnaG(VNA_BIGLOSS)), 2)} แทนที่จะเป็น ${n(swrApp, 2)}` },
          { kind: 'lab', label: `ทดลอง: โหลด ${fz(APP_ZL, 0)} Ω ต่อผ่านสายวัด ${n(VNA_LEN, 3)} λ (ไร้การสูญเสีย)`,
            circuit: () => buildCircuit(VNA_F, APP_Z0, [['tline', 'series', { Z0: APP_Z0, len: Number(VNA_LEN.toFixed(3)), vf: VNA_VF, lossDb: 0 }], ['load', 'series', { R: APP_ZL.re, X: APP_ZL.im }]]),
            note: 'จุดโหลดคือระนาบที่โหลด จุด input คือระนาบที่เครื่อง · ลองเลื่อนความยาวสายแล้วดูจุด input วิ่งรอบวงกลม SWR ขณะที่จุดโหลดอยู่กับที่ — นั่นคือสิ่งที่การคาลิเบรตหักออกให้' },
          { kind: 'lab', label: `ทดลอง: สายเส้นเดิมแต่ตั้ง loss = ${n(VNA_BIGLOSS, 1)} dB`,
            circuit: () => buildCircuit(VNA_F, APP_Z0, [['tline', 'series', { Z0: APP_Z0, len: Number(VNA_LEN.toFixed(3)), vf: VNA_VF, lossDb: VNA_BIGLOSS }], ['load', 'series', { R: APP_ZL.re, X: APP_ZL.im }]]),
            note: `SWR ที่ input ควรอ่านได้ราว ${n(swrFromGamma(vnaG(VNA_BIGLOSS)), 2)} ทั้งที่ที่โหลดยังเป็น ${n(swrApp, 2)} · ลด loss กลับเป็น 0 แล้วดูว่า SWR ทั้งสองฝั่งกลับมาเท่ากัน` },
        ],
      },
    ],
  },
];

export const findBasicsChapter = (id: string): Chapter | undefined => BASICS.find((c) => c.id === id);
void seriesPath; void XL; void XC; void W; void wtg78;
