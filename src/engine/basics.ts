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

/** chapter 6.4: the z-versus-y mix-up — mirror the point first, then walk, and every later reading is y */
const gMirror = gammaFromz(yApp);
const gMirrorWalk = rotateTowardGenerator(gMirror, dApp);
const zMirrorWalk = zFromGamma(gMirrorWalk);
const ZMirrorWalk = C(zMirrorWalk.re * APP_Z0, zMirrorWalk.im * APP_Z0);
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
    id: 'b0', num: '', title: 'อ่านหน้านี้ก่อน: รู้จัก Smith Chart ในห้านาที', titleTh: 'สำหรับคนที่เพิ่งเห็นกราฟนี้ครั้งแรก ยังไม่ต้องคำนวณอะไร',
    intro: 'หน้านี้ยังไม่มีอะไรต้องคำนวณ มีแค่ห้าเรื่องที่ควรรู้ก่อนเปิดบทแรก คือกราฟนี้ใช้ทำอะไร จุดกลางคืออะไร ครึ่งบนกับครึ่งล่างต่างกันตรงไหน หนึ่งจุดบนกราฟแทนค่าอะไร และควรเริ่มอ่านจากตรงไหน',
    sections: [
      {
        id: 'what', title: 'Smith Chart ใช้ทำอะไร',
        lines: [
          T('Smith Chart คือกระดาษกราฟแผ่นเดียวที่ใช้แทนการคำนวณสายส่ง (transmission line) ที่ยุ่งยาก แทนที่จะแก้สมการจำนวนเชิงซ้อนทีละบรรทัด เราพล็อตค่าโหลดเป็นจุดหนึ่งจุด แล้วเลื่อนจุดนั้นไปตามกฎง่าย ๆ ไม่กี่ข้อ คำตอบก็อ่านได้จากกราฟเลย'),
          T('งานสามอย่างที่วิศวกร RF ใช้กราฟนี้ทำบ่อยที่สุดคือ'),
          K('1. ดูว่าโหลดที่ต่ออยู่ “แมตช์” กับสายดีแค่ไหน (สะท้อนกลับมากหรือน้อย)\n2. หาว่าอิมพีแดนซ์ที่มองเห็นเปลี่ยนไปเป็นเท่าไร เมื่อขยับจุดวัดไปตามสาย\n3. ออกแบบวงจร matching เพื่อกำจัดคลื่นสะท้อนให้หมด'),
          T('กราฟจริงมีเส้นตารางถี่ยิบจนดูน่ากลัว แต่โครงของมันมีแค่ไม่กี่อย่าง รูปข้างล่างคือ “แผนที่” ที่ต้องจำให้ได้ก่อน ส่วนเส้นถี่ ๆ ค่อยว่ากันในบทต่อ ๆ ไป'),
          N('หน้านี้ยังไม่ต้องจำสูตรอะไรเลย ขอแค่จำแผนที่ใบนี้ให้ติดตา'),
        ],
        figures: [
          { kind: 'chart', title: 'แผนที่ Smith Chart — จำแค่นี้ก่อน', scale: false, fine: false, grid: 'light', table: false,
            points: [
              { z: C(1, 0), label: 'MATCH · z = 1', cls: 'in' },
              { z: C(Infinity, 0), label: 'OPEN · z = ∞', cls: 'stub' },
              { z: C(0, 0), label: 'SHORT · z = 0', cls: 'stub' },
            ],
            curves: [
              // a bare radius: the further a point sits from the middle, the more it reflects
              { zs: [0, 0.2, 0.4, 0.58].map((t) => zFromGamma(C(-0.940 * t, -0.342 * t))), arrow: true, dashed: true },
            ],
            labels: [
              { z: zFromGamma(C(0.02, 0.52)), text: 'ครึ่งบน · x เป็นบวก · เหนี่ยวนำ' },
              { z: zFromGamma(C(0.02, -0.52)), text: 'ครึ่งล่าง · x เป็นลบ · เก็บประจุ' },
              { z: zFromGamma(C(-0.02, 0.16)), text: 'ใกล้กลาง = สะท้อนน้อย' },
              { z: zFromGamma(C(-0.68, -0.32)), text: 'ใกล้ขอบ = สะท้อนมาก' },
            ],
            caption: 'เส้นจาง ๆ คือเส้นตารางของกราฟจริงที่เหลือไว้ไม่กี่เส้น ให้เห็นว่าหน้าตาเป็นอย่างไร แต่หน้าแรกยังไม่ต้องอ่านค่าจากมัน · จำแค่สามจุดนี้ เส้นแบ่งครึ่งกลาง และกฎว่ายิ่งไกลจากจุดกลางยิ่งสะท้อนมาก · เส้นตารางเต็มพร้อมตัวเลขจะเริ่มใช้ในบทที่ 3' },
        ],
      },
      {
        id: 'landmarks', title: 'จุดกลาง ครึ่งบน และครึ่งล่าง',
        lines: [
          T('จุดกลางของกราฟ คือจุดที่ทุกอย่างลงตัว โหลดเท่ากับอิมพีแดนซ์ของสายพอดี ไม่มีคลื่นสะท้อนเลย เรียกจุดนี้ว่า MATCH และเขียนแทนด้วย z = 1 เป้าหมายของงาน matching ทั้งหมดในคอร์สนี้คือ “ลากจุดให้มาถึงตรงนี้”'),
          T('ขอบซ้ายสุดของกราฟคือ short circuit เขียนว่า z = 0 ส่วนขอบขวาสุดคือ open circuit เขียนว่า z = ∞ ทั้งสองจุดนี้สะท้อนคลื่นกลับหมดทั้งลูก'),
          T('เส้นตรงแนวนอนที่ลากผ่านจุดกลางแบ่งกราฟเป็นสองครึ่ง ครึ่งบนคือโหลดที่มีค่า +jX หรือมีลักษณะเป็นตัวเหนี่ยวนำ (inductive) ครึ่งล่างคือ −jX หรือมีลักษณะเป็นตัวเก็บประจุ (capacitive) ส่วนบนเส้นแนวนอนพอดีคือโหลดที่เป็นความต้านทานล้วน ไม่มีส่วนเชิงซ้อน'),
          T('กฎข้อสุดท้ายเป็นเรื่องระยะ ยิ่งจุดอยู่ใกล้จุดกลางเท่าไร แปลว่าแมตช์ดี สะท้อนน้อย ยิ่งจุดถูกผลักออกไปใกล้ขอบเท่าไร แปลว่าแมตช์แย่ สะท้อนมาก'),
          N('มองกราฟให้เหมือนเป้ายิงธนู: กลางเป้าคือแมตช์สมบูรณ์ ขอบนอกคือสะท้อนกลับทั้งหมด · ตัวเลขที่วัดความ “ไกลจากกลาง” นี้คือ SWR ซึ่งจะได้เรียนในบทต่อ ๆ ไป'),
          T('รูปแรกคือจุดสำคัญเดียวกันนี้พร้อมค่าจริงของสาย 50 Ω ส่วนรูปที่สองคือกฎเรื่องระยะ ลองเทียบดูว่าโหลดตัวไหนอยู่ใกล้จุดกลางกว่ากัน'),
        ],
        figures: [
          { kind: 'smith', title: `จุดสำคัญบนกราฟ พร้อมค่าจริงของสาย ${APP_Z0} Ω`, xCircles: [0],
            points: [
              { z: normalize(C(APP_Z0, 0), APP_Z0), label: 'MATCH z = 1', cls: 'in' },
              { z: C(0, 0), label: 'SHORT z = 0', cls: 'stub' },
              { z: C(1e6, 0), label: 'OPEN z = ∞', cls: 'stub' },
              { z: zApp, label: `z = ${fz(zApp, 1)}`, cls: 'load' },
              { z: normalize(C(APP_ZL.re, -APP_ZL.im), APP_Z0), label: `z = ${fz(normalize(C(APP_ZL.re, -APP_ZL.im), APP_Z0), 1)}`, cls: 'y' },
              { z: normalize(C(2 * APP_Z0, 0), APP_Z0), label: `z = ${fz(normalize(C(2 * APP_Z0, 0), APP_Z0), 0)} (ต้านทานล้วน)`, cls: 'mid' },
            ],
            labels: [
              { z: zFromGamma(C(0.10, 0.70)), text: 'ครึ่งบน = +jX เป็นแบบเหนี่ยวนำ (inductive)' },
              { z: zFromGamma(C(0.10, -0.70)), text: 'ครึ่งล่าง = −jX เป็นแบบเก็บประจุ (capacitive)' },
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
    intro: 'ก่อนจะอ่านกราฟได้ ต้องเห็นปัญหาก่อนว่าทำไมการคำนวณสายส่งด้วยมือจึงยาก บทนี้เริ่มจากสายส่งที่มีอิมพีแดนซ์คุณลักษณะ Z₀ ต่อกับโหลด Z_L แล้วดูว่าเกิดอะไรขึ้นเมื่อทั้งสองไม่เท่ากัน',
    sections: [
      {
        id: 'mismatch', title: 'เมื่อ Z_L ไม่เท่ากับ Z₀ จะเกิดคลื่นสะท้อน',
        lines: [
          T('สมมติสายส่งมีอิมพีแดนซ์คุณลักษณะ Z₀ และปลายสายต่อโหลดที่มีอิมพีแดนซ์ Z_L = R + jX'),
          M('Z_L = Z_0 \\;\\Rightarrow\\; \\text{แมตช์พอดี ไม่มีคลื่นสะท้อน (ในอุดมคติ)}'),
          T('แต่ถ้า Z_L ≠ Z₀ โดยเฉพาะเมื่อโหลดเป็นจำนวนเชิงซ้อน เช่น Z_L = 100 + j50 Ω คลื่นบางส่วนจะสะท้อนกลับ และรวมกับคลื่นที่เดินทางไปข้างหน้ากลายเป็นคลื่นนิ่ง (standing wave) บนสาย'),
          M('\\Gamma = \\frac{Z_L - Z_0}{Z_L + Z_0}, \\qquad SWR = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|}'),
          T(`ตัวอย่าง Z_L = 100 + j50 Ω บนสาย 50 Ω: Γ = ${fz(gammaFromZ(C(100, 50), 50), 3)} ขนาด ${n(abs(gammaFromZ(C(100, 50), 50)), 3)} → SWR = ${n(swrFromGamma(gammaFromZ(C(100, 50), 50)), 2)}`),
          N('|Γ| = 0 คือแมตช์สมบูรณ์ · |Γ| = 1 คือสะท้อนกลับหมด (ปลายเปิดหรือลัดวงจร)'),
        ],
        figures: [
          { kind: 'wave', title: 'คลื่นนิ่งเมื่อโหลด 100 + j50 Ω บนสาย 50 Ω', gammaMag: abs(gammaFromZ(C(100, 50), 50)), gammaDeg: deg(arg(gammaFromZ(C(100, 50), 50))), len: 0.5,
            caption: 'จุดสูงสุดกับจุดต่ำสุดที่อยู่ติดกันห่างกัน λ/4 ส่วนจุดสูงสุดชนิดเดียวกันจะซ้ำทุก λ/2 · อัตราส่วนยอดต่อท้องคือ SWR' },
          { kind: 'wave', title: 'เทียบกับกรณีแมตช์ (Z_L = Z₀ = 50 Ω)', gammaMag: 0, gammaDeg: 0, len: 0.5, caption: 'ไม่มีคลื่นสะท้อน แรงดันคงที่ตลอดสาย SWR = 1' },
          { kind: 'lab', label: 'ทดลองใน Lab: โหลด 100 + j50 Ω บนสาย 50 Ω', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 100, X: 50 }]]), note: 'กด Explain เพื่อดูการคำนวณ Γ และ SWR ทีละขั้น' },
        ],
      },
      {
        id: 'along', title: 'อิมพีแดนซ์ที่มองเห็นเปลี่ยนไปตามตำแหน่งบนสาย',
        lines: [
          T('สิ่งสำคัญที่สุดของบทนี้: อิมพีแดนซ์ที่เรา "มองเห็น" ไม่ได้เท่ากับ Z_L ทุกตำแหน่ง เมื่อเดินจากโหลดเข้าหาแหล่งจ่าย ค่าที่วัดได้จะเปลี่ยนไปเรื่อย ๆ ตามสมการสายส่ง'),
          M('Z_{in}(l) = Z_0\\,\\frac{Z_L + jZ_0\\tan\\beta l}{Z_0 + jZ_L\\tan\\beta l}, \\qquad \\beta l = \\frac{2\\pi}{\\lambda}\\,l'),
          T('สำหรับสายไร้การสูญเสีย มีสมบัติสองข้อที่เป็นรากฐานของ Smith Chart:'),
          M('l = \\frac{\\lambda}{2}: \\; Z_{in} = Z_L \\qquad\\text{(ค่ากลับมาเท่าเดิมทุกครึ่งความยาวคลื่น)}'),
          M('l = \\frac{\\lambda}{4}: \\; Z_{in} = \\frac{Z_0^{2}}{Z_L} \\;\\Rightarrow\\; z_{in} = \\frac{1}{z_L} = y_L \\qquad\\text{(กลายเป็นแอดมิตแตนซ์ปกติของโหลด)}'),
          T('ข้อแรกทำให้กราฟหนึ่งรอบแทนระยะเพียง λ/2 ข้อที่สองทำให้การแปลง Z ↔ Y กลายเป็นการหมุนครึ่งรอบ ทั้งสองข้อจะกลับมาอีกในบทที่ 5 และ 6'),
        ],
        figures: [
          { kind: 'table', title: 'อิมพีแดนซ์ที่เห็น เมื่อเดินจากโหลด 100 + j50 Ω ไปทางแหล่งจ่าย (สาย 50 Ω, คำนวณโดยแอป)',
            head: ['ระยะจากโหลด', 'Z ที่มองเห็น (Ω)', 'z (ปกติ)', '|Γ|', 'SWR'],
            rows: [0, 0.05, 0.1, 0.125, 0.2, 0.25, 0.375, 0.5].map((d) => {
              const Z = lineInput(C(100, 50), 50, d, 0);
              const g = gammaFromZ(Z, 50);
              return [`${n(d, 3)} λ`, fz(Z, 1), fz(normalize(Z, 50), 3), n(abs(g), 3), n(swrFromGamma(g), 2)];
            }),
            caption: 'ค่า Z เปลี่ยนตลอด แต่ |Γ| และ SWR คงที่ เพราะสายไร้การสูญเสีย · ที่ 0.25 λ ได้ 1/z_L และที่ 0.5 λ กลับมาเท่าเดิม' },
          { kind: 'smith', title: 'เส้นทางเดียวกันบน Smith Chart (ยังไม่ต้องอ่านตัวเลขบนกราฟตอนนี้)',
            points: [{ z: normalize(C(100, 50), 50), label: 'z_L', cls: 'load' }, { z: normalize(lineInput(C(100, 50), 50, 0.25, 0), 50), label: '0.25λ = y_L', cls: 'y' }],
            curves: [{ zs: swrPath(normalize(C(100, 50), 50), 0.5), cls: 'net', arrow: true }],
            swr: [swrFromGamma(gammaFromZ(C(100, 50), 50))],
            caption: 'เดินครบ 0.5 λ = วนกลับมาที่จุดเดิมพอดี นี่คือเหตุผลที่กราฟหนึ่งรอบแทน λ/2' },
          { kind: 'lab', label: 'ทดลอง: ต่อสายส่งแล้วเลื่อน Probe ดูค่าเปลี่ยนตามตำแหน่ง', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.25, vf: 0.66, lossDb: 0 }], ['load', 'series', { R: 100, X: 50 }]]), note: 'คลิกสายส่ง แล้วติ๊ก Probe เพื่อเลื่อนจุดวัด' },
        ],
      },
      {
        id: 'why', title: 'ทำไมการคำนวณอย่างเดียวจึงยาก',
        lines: [
          T('ลองดูโหลด inductive เช่น Z_L = 100 + j50 Ω เมื่อเดินไปตามสาย บางตำแหน่งค่าที่เห็นยังเป็น inductive (R + jX) บางตำแหน่งกลายเป็น capacitive (R − jX)'),
          T('ระหว่างสองตำแหน่งนั้น ต้องมีจุดหนึ่งที่ X = 0 พอดี นั่นคือจุดที่อิมพีแดนซ์เป็นความต้านทานล้วน'),
          M('Z = R + j0 \\qquad \\text{(purely resistive point)}'),
          T('การหาตำแหน่งนี้ด้วยการแก้สมการสายส่งที่มีจำนวนเชิงซ้อนซ้ำ ๆ ทำได้ยากและเสียเวลา โดยเฉพาะเมื่อโหลดเป็นจำนวนเชิงซ้อน — Smith Chart ทำให้อ่านตำแหน่งนี้ได้ทันทีจากกราฟ'),
          N('จุด X = 0 นี้สำคัญมากในบทที่ 8 เพราะหม้อแปลง λ/4 ใช้ได้เฉพาะกับโหลดที่เป็นความต้านทานล้วนเท่านั้น'),
        ],
        figures: [
          { kind: 'plot', title: 'ส่วน R และ X ที่มองเห็น เมื่อเดินจากโหลด 100 + j50 Ω ไปทางแหล่งจ่าย', xLabel: 'ระยะจากโหลด (λ)', yLabel: 'Ω', xMin: 0, xMax: 0.5, yMin: -120, yMax: 260,
            series: [
              { name: 'R', points: linspace(0, 0.5, 101).map((d) => [d, lineInput(C(100, 50), 50, d, 0).re] as [number, number]) },
              { name: 'X', color: '#dc2626', points: linspace(0, 0.5, 101).map((d) => [d, lineInput(C(100, 50), 50, d, 0).im] as [number, number]) },
            ],
            xTicks: [0, 0.125, 0.25, 0.375, 0.5],
            markers: (() => {
              const roots: { x: number; y: number; text: string }[] = [];
              let prev = lineInput(C(100, 50), 50, 0, 0).im;
              for (let i = 1; i <= 500; i++) {
                const d = (0.5 * i) / 500;
                const cur = lineInput(C(100, 50), 50, d, 0).im;
                if (prev === 0 || prev * cur < 0) roots.push({ x: d, y: 0, text: `X = 0 ที่ ${n(d, 3)} λ` });
                prev = cur;
              }
              return roots.slice(0, 2);
            })(),
            caption: 'จุดที่เส้น X ตัดศูนย์คือตำแหน่งที่อิมพีแดนซ์เป็นความต้านทานล้วน' },
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
          W('เครื่องหมายผิดหมายถึงอยู่คนละด้านของกราฟ ผลลัพธ์ทั้งหมดจะผิดตาม — 0.5 + j0.5 อยู่ครึ่งบน ส่วน 0.5 − j0.5 อยู่ครึ่งล่าง'),
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
    intro: 'เมื่อพล็อตโหลดแล้ว ลากวงกลมที่มีศูนย์กลางอยู่กลางกราฟผ่านจุดโหลด วงกลมนี้คือ constant SWR circle และเป็นเส้นทางที่จุดจะเดินเมื่อเราขยับไปตามสายไร้การสูญเสีย',
    sections: [
      {
        id: 'circle', title: 'ทำไมจุดจึงเดินอยู่บนวงกลมเดียว',
        lines: [
          T('บนสายไร้การสูญเสีย ขนาดของสัมประสิทธิ์การสะท้อนไม่เปลี่ยน เปลี่ยนแต่มุม'),
          M('\\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l} \\;\\Rightarrow\\; |\\Gamma(l)| = |\\Gamma_L| = \\text{คงที่}'),
          T('เพราะ |Γ| คือรัศมีจากศูนย์กลางกราฟ จุดจึงหมุนอยู่บนวงกลมรัศมีเดิม และเพราะ SWR ขึ้นกับ |Γ| อย่างเดียว'),
          M('SWR = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|} = \\text{คงที่ตลอดสาย เฉพาะบนสายไร้การสูญเสีย}'),
          R('\\text{บนสายไร้การสูญเสียเท่านั้น: } Z \\text{ เปลี่ยนทุกตำแหน่ง แต่ } SWR \\text{ ไม่เปลี่ยน}'),
          W('SWR คงที่เป็นสมบัติของสายไร้การสูญเสีย (lossless) เท่านั้น ถ้าสายมีการสูญเสีย |Γ| จะเล็กลงเมื่อเดินเข้าหาแหล่งจ่าย SWR ที่วัดได้จึงต่ำลงเรื่อย ๆ (ดูหัวข้อ 4.4)'),
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
            caption: `ดูตารางใต้รูป: ค่า z ของสี่จุดต่างกันหมด แต่คอลัมน์ |Γ| และ SWR เท่ากันทุกแถว (${n(abs(gApp), 4)} และ ${n(swrApp, 3)}) — นั่นคือความหมายของ "อยู่บนวงกลมเดียวกัน" (คำนวณโดยแอป)` },
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
          T('พล็อต z_L = 0.5 + j0.5 แล้วลากวงกลม SWR คงที่ จะอ่านได้'),
          R(`SWR = ${n(swrFromGamma(gammaFromz(C(0.5, 0.5))), 2)} \\qquad (\\text{หนังสือ } 2.6)`),
          T('เดินจากโหลดไปทางแหล่งจ่าย 0.100 λ (ตามเข็มนาฬิกา) จะได้'),
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
          T('เมื่อวาดวงกลม SWR คงที่แล้ว ให้ดูจุดที่วงกลมตัดแกนแนวนอนทางขวามือของศูนย์กลาง ค่าความต้านทานปกติที่จุดนั้นคือ SWR'),
          M('r_{\\max} = SWR, \\qquad r_{\\min} = \\frac{1}{SWR}'),
          T('เหตุผล: จุดขวาสุดของวงกลมคือจุดที่แรงดันสูงสุด (E_max) ซึ่งอิมพีแดนซ์เป็นความต้านทานล้วนและมีค่าสูงสุด'),
          N(`ตัวอย่าง: ถ้าตัดที่ r = 2.6 ก็คือ SWR = 2.6 · จุดซ้ายสุดจะเป็น r = 1/2.6 = ${n(1 / 2.6, 3)}`),
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
            caption: 'เส้นทึบคือรัศมีวงเวียน เส้นโค้งประคือการกวาดลงแกนนอนครึ่งขวา จุดที่แตะอ่าน r ได้เท่ากับ SWR พอดี' },
        ],
      },
      {
        id: 'lossy', title: 'สายที่มีการสูญเสีย: เกลียวเข้าหาศูนย์กลาง',
        lines: [
          T('ทุกอย่างข้างต้นใช้กับสายไร้การสูญเสีย ถ้าสายมีการสูญเสีย คลื่นสะท้อนถูกลดทอนทั้งขาไปและขากลับ ทำให้ |Γ| ลดลงเรื่อย ๆ'),
          M('|\\Gamma(l)| = |\\Gamma_L|\\,e^{-2\\alpha l}'),
          T('เส้นทางจึงไม่เป็นวงกลม แต่เป็นเกลียวเข้าหาศูนย์กลาง (inward spiral) และ SWR ที่วัดได้ที่ต้นสายจะต่ำกว่าที่โหลดจริง'),
          W('SWR ที่ต้นสายต่ำ ไม่ได้แปลว่าโหลดแมตช์ดี อาจเป็นเพราะสายกินกำลังไปมากก็ได้'),
          N('ในบทเรียนพื้นฐานทั้งหมดต่อจากนี้ เราถือว่าสายไร้การสูญเสีย'),
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
    id: 'b5', num: '5', title: 'ระยะทางบนกราฟ', titleTh: 'จุดอิมพีแดนซ์วนครบรอบ = เดินไปครึ่งความยาวคลื่นบนสายสม่ำเสมอ',
    intro: 'จุดที่สับสนบ่อยที่สุดคือกราฟหนึ่งรอบแทนระยะเท่าไร และทิศไหนคือไปทางแหล่งจ่าย บทนี้ตอบทั้งสองข้อพร้อมที่มา',
    sections: [
      {
        id: 'halflambda', title: 'หนึ่งรอบ = λ/2 ไม่ใช่ λ',
        lines: [
          T('จากสมการการหมุนของ Γ'),
          M('\\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l}, \\qquad \\beta = \\frac{2\\pi}{\\lambda}'),
          T('มุมที่หมุนคือ 2βl ดังนั้นเมื่อ l = λ/2'),
          M('2\\beta l = 2\\cdot\\frac{2\\pi}{\\lambda}\\cdot\\frac{\\lambda}{2} = 2\\pi \\;\\Rightarrow\\; \\text{ครบหนึ่งรอบพอดี}'),
          R('\\text{จุดอิมพีแดนซ์หมุน } 360^\\circ \\text{ บนกราฟ} \\;\\Leftrightarrow\\; \\text{เดิน } 0.5\\lambda \\text{ บนสายส่งสม่ำเสมอ}'),
          N('เงื่อนไข: ข้อนี้ใช้กับสายส่งสม่ำเสมอ (uniform line) คือ Z₀ และ β เท่ากันตลอดเส้น และหมายถึงจุดอิมพีแดนซ์ที่วนรอบกราฟ ไม่ใช่ตัวคลื่นที่วนครบรอบ'),
          T('จึงได้ความสัมพันธ์ที่ใช้บ่อย'),
          M('180^\\circ \\Leftrightarrow 0.25\\lambda, \\qquad 90^\\circ \\Leftrightarrow 0.125\\lambda'),
          W('ระวังสองมุมนี้ให้ดี: βl คือความยาวไฟฟ้าของสาย (λ/4 → βl = 90°) ส่วนมุมที่หมุนบนกราฟคือ 2βl (λ/4 → หมุน 180°)'),
        ],
        figures: [
{ kind: 'quiz',
  question: 'หมุนครบหนึ่งรอบเต็ม (360°) บน Smith Chart ตรงกับการเดินบนสายเป็นระยะเท่าไร',
  choices: ['0.25 λ', '0.5 λ', '1 λ', '2 λ'],
  answer: 1,
  explain: `มุมที่หมุนคือ 2βl ไม่ใช่ βl เมื่อ l = λ/2 จึงได้ 2βl = 360° พอดี · ตรวจได้จากเอนจิน เดินจาก z = ${fz(zApp, 1)} ครบ 0.5 λ แล้วได้ z = ${fz(zFromGamma(rotateTowardGenerator(gApp, 0.5)), 1)} คือจุดเดิม`,
  chart: { swr: [swrApp], scale: true, fine: false,
    points: [
      { z: zApp, label: 'เริ่ม / จบ', cls: 'load' },
      { z: zFromGamma(rotateTowardGenerator(gApp, 0.125)), label: '0.125 λ', cls: 'mid' },
      { z: zFromGamma(rotateTowardGenerator(gApp, 0.25)), label: '0.25 λ', cls: 'y' },
      { z: zFromGamma(rotateTowardGenerator(gApp, 0.375)), label: '0.375 λ', cls: 'mid' },
    ] },
},
          { kind: 'smith', title: 'เดินจาก z = 0.5 + j0.5 ครบ 0.5 λ กลับมาที่จุดเดิม',
            points: [{ z: C(0.5, 0.5), label: 'เริ่ม / จบ', cls: 'load' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.125)), label: '0.125λ', cls: 'mid' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.25)), label: '0.25λ = y_L', cls: 'y' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.375)), label: '0.375λ', cls: 'mid' }],
            curves: [{ zs: swrPath(C(0.5, 0.5), 0.5), cls: 'net' }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))] },
        ],
      },
      {
        id: 'direction', title: 'ทิศทาง: toward generator กับ toward load',
        lines: [
          T('สองข้อนี้เป็นข้อตกลงมาตรฐานของ Smith Chart แบบอิมพีแดนซ์ (standard impedance Smith chart convention) ไม่ใช่สิ่งที่เดาจากรูปกราฟเปล่า ๆ ได้'),
          R('\\text{Toward Generator} = \\text{ตามเข็มนาฬิกา (clockwise)}'),
          R('\\text{Toward Load} = \\text{ทวนเข็มนาฬิกา (counterclockwise)}'),
          T('ที่มา: เครื่องหมายลบใน e^{−j2βl} ทำให้มุมของ Γ ลดลงเมื่อ l เพิ่มขึ้น ซึ่งบนระนาบเชิงซ้อนคือการหมุนตามเข็มนาฬิกา'),
          T('ดังนั้นถ้าโจทย์บอกว่า "หาอิมพีแดนซ์ที่ระยะ 0.1 λ จากโหลดไปทางแหล่งจ่าย" ให้เริ่มจากจุดโหลดแล้วเดินตามเข็มนาฬิกา 0.1 λ'),
          N('ในแอปนี้ สเกลวงกลางรอบกราฟคือ wavelengths toward generator และวงนอกสุดคือ toward load ตามข้อตกลงเดียวกัน · กราฟที่พิมพ์จากที่อื่นอาจวางสเกลกลับด้าน ให้ยึดสเกลที่พิมพ์บนกราฟใบนั้นเสมอ'),
        ],
        figures: [
{ kind: 'quiz',
  question: 'จากจุดโหลด ถ้าจะเดินไปทางแหล่งจ่าย (toward generator) ต้องหมุนไปทางไหน',
  choices: ['ตามเข็มนาฬิกา', 'ทวนเข็มนาฬิกา', 'เข้าหาศูนย์กลาง', 'ออกไปทางขอบกราฟ'],
  answer: 0,
  explain: `เครื่องหมายลบใน Γ(l) = Γ_L e^(−j2βl) ทำให้มุมลดลงเมื่อ l เพิ่มขึ้น ซึ่งคือตามเข็มนาฬิกา · ตรวจจากสเกล: z = ${fz(zApp, 1)} อยู่ที่ ${n(wtgZApp, 4)} λ เดินไป 0.1 λ แล้วได้ ${n(wtgFromGamma(rotateTowardGenerator(gApp, 0.1)), 4)} λ คือค่าที่เพิ่มขึ้น`,
  chart: { swr: [swrApp], scale: true, fine: false,
    points: [{ z: zApp, label: 'z_L', cls: 'load' }] },
},
          { kind: 'smith', title: 'จากจุดเดียวกัน เดินไปคนละทิศ 0.1 λ',
            points: [{ z: C(0.5, 0.5), label: 'z_L', cls: 'load' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), 0.1)), label: 'ตามเข็ม → generator', cls: 'in' }, { z: zFromGamma(rotateTowardGenerator(gammaFromz(C(0.5, 0.5)), -0.1)), label: 'ทวนเข็ม → load', cls: 'mid' }],
            curves: [{ zs: swrPath(C(0.5, 0.5), 0.1), cls: 'in', arrow: true }, { zs: swrPath(C(0.5, 0.5), -0.1), cls: 'mid', arrow: true }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))] },
        ],
      },
      {
        id: 'scale', title: 'วิธีอ่านระยะจากสเกลรอบนอก',
        lines: [
          T('สเกลรอบนอกมีค่า 0 ถึง 0.5 λ ให้ทำแบบนี้'),
          K('1. ลากเส้นจากศูนย์กลางผ่านจุดโหลดออกไปชนสเกล → อ่านค่าเริ่มต้น\n2. บวกระยะที่ต้องการเดิน (toward generator) หรือลบ (toward load)\n3. ถ้าเกิน 0.5 ให้ลบ 0.5 ออก เพราะกราฟวนซ้ำทุกครึ่งความยาวคลื่น\n4. ลากเส้นจากศูนย์กลางไปยังค่าใหม่ ตัดกับวงกลม SWR ตรงไหน จุดนั้นคือคำตอบ'),
          T('ตัวอย่าง: โหลดอยู่ที่สเกล 0.12 เดินไปทางแหล่งจ่ายจนถึง 0.27'),
          M('d = 0.27 - 0.12 = 0.15\\lambda'),
          T(`ตัวอย่างจริงจากแอป: z_L = 0.5 + j0.5 อยู่ที่สเกล ${n(wtgFromGamma(gammaFromz(C(0.5, 0.5))), 4)} λ เมื่อเดินไป 0.1 λ จะไปอยู่ที่ ${n((wtgFromGamma(gammaFromz(C(0.5, 0.5))) + 0.1) % 0.5, 4)} λ`),
        ],
        figures: [
{ kind: 'quiz',
  question: `z_L = ${fz(zApp, 1)} อยู่ที่สเกล ${n(wtgZApp, 4)} λ ถ้าเดินไปทางแหล่งจ่ายอีก ${n(dApp, 3)} λ จะไปอยู่ที่สเกลเท่าไร`,
  choices: [
    `${n(((wtgZApp - dApp) % 0.5 + 0.5) % 0.5, 4)} λ`,
    `${n(dApp, 4)} λ`,
    `${n(wtgFromGamma(gApp2), 4)} λ`,
    `${n(wtgZApp, 4)} λ`,
  ],
  answer: 2,
  explain: `toward generator คือบวกเข้ากับค่าเริ่มต้น: ${n(wtgZApp, 4)} + ${n(dApp, 3)} = ${n(wtgFromGamma(gApp2), 4)} λ (ถ้าเกิน 0.5 ให้ลบ 0.5 ออก) · จุดใหม่คือ z = ${fz(zApp2, 2)}`,
  chart: { swr: [swrApp], scale: true, fine: false,
    points: [{ z: zApp, label: 'z_L', cls: 'load' }, { z: zApp2, label: 'จุดใหม่', cls: 'in' }] },
},
          { kind: 'table', title: 'ตำแหน่งบนสเกลของจุดสำคัญ (คำนวณโดยแอป)', head: ['z', 'ตำแหน่งบนสเกล toward generator'],
            rows: ([[C(0, 0), 'SHORT'], [C(1e6, 0), 'OPEN'], [C(0.5, 0.5), '0.5 + j0.5'], [C(1.5, -2), '1.5 − j2'], [C(1, 0), 'ศูนย์กลาง (แมตช์)']] as [Complex, string][])
              .map(([z, name]) => [name, `${n(wtgFromGamma(gammaFromz(z)), 4)} λ`]),
            caption: 'จุดศูนย์กลางไม่มีทิศ ค่าที่แสดงจึงไม่มีความหมายสำหรับจุดนั้น' },
        ],
      },
    ],
  },
  // ============================================================
  {
    id: 'b6', num: '6', title: 'แอดมิตแตนซ์และการหมุน 180°', titleTh: 'ทำไม Z → Y จึงเป็นการหมุนครึ่งรอบ',
    intro: 'อุปกรณ์ที่ต่อขนานบวกกันด้วยแอดมิตแตนซ์ ไม่ใช่อิมพีแดนซ์ บทนี้อธิบายการแปลง Z ↔ Y บนกราฟและที่มาว่าทำไมจึงเป็นการหมุนครึ่งรอบพอดี',
    sections: [
      {
        id: 'y', title: 'นิยาม ค่าปกติ และ Y₀ = 1/Z₀',
        lines: [
          M('Y = \\frac{1}{Z} = G + jB \\quad [\\text{S}], \\qquad y = \\frac{1}{z} = g + jb'),
          T('โดย g คือ conductance ปกติ และ b คือ susceptance ปกติ'),
          M('y = \\frac{1}{r + jx} = \\frac{r - jx}{r^2 + x^2} \\;\\Rightarrow\\; g = \\frac{r}{r^2+x^2}, \\quad b = \\frac{-x}{r^2+x^2}'),
          T('เมื่อประโยคหนึ่งจริงทั้งกับอิมพีแดนซ์และแอดมิตแตนซ์ ตำราจะรวบเรียกว่า immittance (อิมมิตแตนซ์) · มุมขวาล่างของกราฟจริงพิมพ์คำนี้ไว้ในรูป IMPEDANCE OR ADMITTANCE COORDINATES นั่นเอง — กราฟใบเดียวอ่านได้ทั้งสองอย่าง ต่างกันแค่เลือกชุดเส้นที่ใช้อ่าน'),
          T('การ normalize ฝั่งแอดมิตแตนซ์ไม่ได้หารด้วย Z₀ แต่หารด้วย characteristic admittance ของสาย ซึ่งเป็นส่วนกลับของ Z₀'),
          M('Y_0 = \\frac{1}{Z_0}, \\qquad y = \\frac{Y}{Y_0} = Y Z_0'),
          T('สองทางให้คำตอบเดียวกันเสมอ เพราะ y = Y/Y₀ = (1/Z)·Z₀ = Z₀/Z = 1/z จะกลับส่วนก่อนแล้ว normalize หรือ normalize ก่อนแล้วกลับส่วน ก็ได้เท่ากัน'),
          T(`ตัวอย่างจริง: สาย ${APP_Z0} Ω มี Y₀ = 1/${APP_Z0} = ${n(Y0App, 4)} S · โหลด Z_L = ${fz(APP_ZL, 0)} Ω มี Y_L = 1/Z_L = ${fz(YApp, 4)} S`),
          M(`y_L = \\frac{Y_L}{Y_0} = \\frac{${tc(YApp, 3)}}{${n(Y0App, 3)}} = ${tc(yApp, 0)} \\qquad = \\; \\frac{1}{z_L} = \\frac{1}{${tc(zApp, 1)}}`),
          T('ข้อดีจึงเหมือนฝั่งอิมพีแดนซ์ทุกอย่าง: เมื่อ normalize แล้ว กราฟใบเดียวใช้ได้กับทุกค่า Z₀ และเมื่ออ่านค่าเสร็จก็คูณกลับเพื่อได้ค่าจริง'),
          M('Y = y\\,Y_0 = \\frac{y}{Z_0}'),
          W('สังเกตเครื่องหมาย: โหลด inductive มี x > 0 แต่ b < 0 — เครื่องหมายกลับกันเสมอเมื่อเปลี่ยนโดเมน'),
          N('หน่วยของ Y คือซีเมนส์ (S) บางตำราเขียนว่า mho หรือ ℧ · ส่วน y ไม่มีหน่วย เหมือน z'),
        ],
        figures: [
          { kind: 'table', title: 'Y₀ ของสายมาตรฐาน และโหลดตัวเดียวกันในสองโดเมน (คำนวณโดยแอป)',
            head: ['Z₀ (Ω)', 'Y₀ = 1/Z₀ (S)', 'z_L = Z_L/Z₀', 'Y_L = 1/Z_L (S)', 'y_L = Y_L·Z₀'],
            rows: [50, 75, 300].map((Z0) => [n(Z0, 0), n(1 / Z0, 5), fz(normalize(APP_ZL, Z0), 3), fz(YApp, 4), fz(C(YApp.re * Z0, YApp.im * Z0), 3)]),
            caption: `โหลดเดียวกัน Z_L = ${fz(APP_ZL, 0)} Ω · คอลัมน์สุดท้ายเท่ากับ 1/z_L ของคอลัมน์ที่สามเสมอ · Y_L ไม่ขึ้นกับสาย แต่ y_L ขึ้นกับ Z₀ ที่ใช้ normalize` },
        ],
      },
      {
        id: 'convert', title: 'ตัวอย่างการแปลงด้วยเลขเชิงซ้อน',
        lines: [
          T('ให้ z = 0.5 + j0.5'),
          M('y = \\frac{1}{0.5 + j0.5} = \\frac{0.5 - j0.5}{0.5^2 + 0.5^2} = \\frac{0.5 - j0.5}{0.5}'),
          R(`y = ${tc(admittance(C(0.5, 0.5)), 0)}`),
          T('บนกราฟทำได้เร็วกว่านั้นมาก: ลากเส้นตรงจากจุด z ผ่านศูนย์กลางไปยังอีกด้านหนึ่งของวงกลม SWR จุดที่ได้คือ y ทันที ไม่ต้องวัดระยะทีละสเกล'),
        ],
        figures: [
{ kind: 'quiz',
  question: `บนวงกลม SWR เดียวกัน จุด y ของ z = ${fz(zApp, 1)} อยู่ตรงไหน`,
  choices: [
    'จุดตรงข้ามผ่านศูนย์กลาง ห่างกันครึ่งรอบ',
    'จุดที่สะท้อนข้ามเส้นแนวนอน (คอนจูเกต)',
    'จุดเดิม แต่อ่านบนวงกลม r แทน',
    'จุดที่ใกล้ศูนย์กลางกว่าเดิม เพราะ y เล็กกว่า z',
  ],
  answer: 0,
  explain: `y = 1/z คือการหมุน 180° รอบศูนย์กลางโดย |Γ| เท่าเดิม จึงได้ y = ${fz(yApp, 0)} · บนสเกลรอบกราฟจุดทั้งสองห่างกัน ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 3)} λ พอดีคือ λ/4`,
  chart: { swr: [swrApp], showY: true, scale: false, fine: false,
    points: [{ z: zApp, label: 'z', cls: 'load' }] },
},
          { kind: 'smith', title: 'z = 0.5 + j0.5 กับ y = 1 − j1 อยู่ตรงข้ามกันผ่านศูนย์กลาง',
            points: [{ z: C(0.5, 0.5), label: 'z = 0.5 + j0.5', cls: 'load' }, { z: admittance(C(0.5, 0.5)), label: 'y = 1 − j1 (อ่านบนสเกล Z)', cls: 'y' }],
            curves: [{ zs: [C(0.5, 0.5), C(1, 0), admittance(C(0.5, 0.5))], cls: 'mid', dashed: true }],
            swr: [swrFromGamma(gammaFromz(C(0.5, 0.5)))],
            caption: 'เส้นประคือเส้นผ่านศูนย์กลาง ยาวเท่ากันทั้งสองข้าง เพราะ |Γ| เท่าเดิม' },
          { kind: 'smith', title: 'อีกวิธี: เปิดกราฟ Y (เขียว) ทับกราฟ Z แล้วอ่านค่าจากจุดเดิม', showY: true,
            points: [{ z: C(0.5, 0.5), label: 'จุดเดียวกัน', cls: 'load' }], gCircles: [1], bCircles: [-1],
            caption: 'จุดเดิมอ่านได้ทั้ง z = 0.5 + j0.5 บนสเกล Z และ y = 1 − j1 บนสเกล Y' },
          { kind: 'lab', label: 'ทดลอง: โหลด 25 + j25 Ω แล้วเปิดปุ่ม Y grid', circuit: () => buildCircuit(100e6, 50, [['load', 'series', { R: 25, X: 25 }]]), showY: true },
        ],
      },
      {
        id: 'why180', title: 'ที่มาของการหมุน 180°',
        lines: [
          T('จากบทที่ 1 สายยาว λ/4 ทำให้'),
          M('z_{in} = \\frac{1}{z_L} = y_L'),
          T('และจากบทที่ 5 ระยะ λ/4 คือครึ่งรอบของกราฟ (180°) ดังนั้นการหา y จึงเท่ากับการหมุนจุด z ไป 180° ซึ่งก็คือการลากเส้นผ่านศูนย์กลางไปอีกด้านหนึ่งนั่นเอง'),
          M('\\Gamma_y = \\Gamma_z\\,e^{-j\\pi} = -\\Gamma_z'),
          N('ตรวจได้ง่าย: ถ้า z = 0 (SHORT, Γ = −1) แล้ว y = ∞ (OPEN, Γ = +1) ซึ่งอยู่ตรงข้ามกันพอดี'),
          T('รูปแรกเดินจริงบนสาย 0.25 λ แล้วดูว่าจุดไปหยุดตรงไหน ส่วนรูปที่สองคือการตรวจกฎเดียวกันด้วยคู่ SHORT–OPEN ตามที่จะเขียนไว้ข้างล่าง'),
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
        id: 'zvsy', title: 'z กับ y เป็นคนละตัวเลข แต่เป็นจุดเดียวกันบนกราฟ',
        lines: [
          T('พูดด้วยคำรวม: จุดหนึ่งจุดคืออิมมิตแตนซ์ (immittance) หนึ่งค่า ส่วน z กับ y คือสองวิธีอ่านค่าเดียวกันนั้น — หัวข้อนี้แยกให้เห็นว่าอันไหนคือ "ค่า" และอันไหนคือ "วิธีอ่าน"'),
          W(`ประโยคที่ต้องจำให้แม่นที่สุดของบทนี้ — z กับ y เป็นคนละตัวเลขกัน (${fz(zApp, 1)} ไม่เท่ากับ ${fz(yApp, 0)}) แต่สภาพของสายที่ระนาบนั้นมีอยู่สภาพเดียว คือ Γ จุดเดียว · คำว่า "อยู่ตรงข้ามกัน" เป็นเรื่องของวิธีอ่าน ไม่ใช่เรื่องที่สายเปลี่ยนไป`),
          T('สิ่งที่ถูกพล็อตลงกราฟจริง ๆ ไม่ใช่ z และไม่ใช่ y แต่คือ Γ ซึ่งเขียนได้จากทั้งสองฝั่งแล้วได้ค่าเดียวกันเสมอ'),
          M('\\Gamma = \\frac{z-1}{z+1} = \\frac{1-y}{1+y}'),
          T(`ตรวจด้วยตัวอย่างประจำคอร์ส z = ${fz(zApp, 1)} และ y = ${fz(yApp, 0)} (แอปคำนวณทั้งสองทาง)`),
          R(`\\frac{(${tc(zApp, 1)})-1}{(${tc(zApp, 1)})+1} = ${tc(gApp, 1)} = \\frac{1-(${tc(yApp, 0)})}{1+(${tc(yApp, 0)})}`),
          T('ดังนั้นเวลาบอกว่า "หา y ได้จากจุดตรงข้าม" สิ่งที่ถูกหมุนจริง ๆ คือกริด ไม่ใช่สาย — กราฟแอดมิตแตนซ์ก็คือกราฟอิมพีแดนซ์ที่หมุนไป 180° เมื่อในมือมีกริด Z พิมพ์อยู่ใบเดียว เราจึงหมุนจุดแทนการหมุนกริด ตัวเลขที่อ่านได้ถูกต้อง แต่ปลายดินสอไปอยู่ตำแหน่งที่ไม่ใช่สภาพจริงของสายแล้ว'),
          T('จึงมีสองวิธีที่ให้ g กับ b ค่าเดียวกัน ต่างกันแค่ว่า "จุด" ไปอยู่ที่ไหน'),
          K('วิธี ก "หมุนจุด"   — ใช้กริด Z ใบเดียว ย้ายดินสอไปจุดตรงข้ามผ่านศูนย์กลาง อ่านตัวเลข r, x ที่จุดใหม่ แล้วเรียกมันว่า g, b\nวิธี ข "ซ้อนกริด Y" — เปิดกริดสีเขียวทับลงไปบนกราฟเดิม จุดไม่ขยับเลยแม้แต่นิดเดียว อ่าน g, b จากเส้นเขียวที่ลากผ่านจุดเดิม'),
          T(`ทั้งสองวิธีให้ g = ${n(yApp.re, 0)} และ b = ${n(yApp.im, 0)} เท่ากัน แต่สิ่งที่ยัง "ใช้ต่อได้" ไม่เท่ากัน ตารางด้านล่างแยกให้เห็นทีละข้อ`),
          T('เหตุผลเชิงสมการที่ทำให้กับดักนี้เกิดขึ้นได้เงียบ ๆ คือ การหมุนไปตามสายกับการกลับด้าน 180° สลับลำดับกันได้'),
          M('\\left(-\\Gamma_z\\right)e^{-j2\\beta d} = -\\left(\\Gamma_z e^{-j2\\beta d}\\right) \\qquad \\text{หมุนก่อนหรือกลับด้านก่อน ก็ลงที่เดียวกัน}'),
          T('แปลว่าถ้าเดินระยะทางต่อจากจุดกระจก จุดที่ได้ก็ยังเป็นภาพกระจกของคำตอบที่ถูกต้องอยู่ดี กราฟจึงไม่ฟ้องอะไรเลย ตัวเลขที่อ่านได้ดูสมเหตุสมผลทุกอย่าง แต่เป็น y ไม่ใช่ z'),
          W(`เป็นตัวเลขจริง: เดินไป ${n(dApp, 2)} λ จากจุดโหลด คำตอบที่ถูกคือ z = ${fz(zApp2, 3)} คือ Z = ${fz(ZApp2, 1)} Ω · แต่ถ้าเผลอเดินต่อจากจุดกระจกแล้วอ่านบนกริด Z จะได้ ${fz(zMirrorWalk, 3)} คือ ${fz(ZMirrorWalk, 1)} Ω ซึ่งคือ y ที่ระยะนั้นพอดี ไม่ใช่ z`),
          N(`วิธีทำงานที่ปลอดภัยที่สุดเมื่อทำด้วยมือ: หมุนไปอ่าน y แล้วหมุนกลับทันที อย่าเดินระยะทางต่อจากจุดกระจก · ส่วนแอปนี้และเครื่องมือจริงใช้วิธี ข เสมอ ปุ่ม Y grid ไม่ได้ย้าย marker แม้แต่นิดเดียว`),
          N(`ถ้าจำได้ข้อเดียว ให้จำว่ากราฟใบนี้เก็บ Γ ไม่ได้เก็บ z — z กับ y เป็นเพียงสองชุดพิกัดที่ตั้งชื่อให้ Γ จุดเดิม เหมือนจุดเดียวบนแผนที่ที่บอกได้ทั้งพิกัดละติจูดและพิกัด UTM`),
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
              ['ค่าบนสเกล wavelengths', `เพี้ยนไป 0.25 λ — ${n(wtgZApp, 4)} กลายเป็น ${n(wtgYApp, 4)}`, `เท่าเดิม — ${n(wtgZApp, 4)} λ`],
              ['เดินระยะทางต่อจากจุดนี้', `ได้ y ที่ระยะนั้น เช่น ${fz(zMirrorWalk, 3)}`, `ได้ z ที่ระยะนั้น คือ ${fz(zApp2, 3)}`],
              ['จุดนี้คือสภาพจริงของสายที่ระนาบนั้นหรือไม่', 'ไม่ใช่ เป็นภาพกระจก', 'ใช่'],
            ],
            caption: 'สองคอลัมน์ให้ตัวเลข g กับ b เท่ากัน ต่างกันแค่สามแถวล่าง ซึ่งเป็นที่มาของความผิดพลาดเกือบทั้งหมดในเรื่องนี้' },
          { kind: 'chart', title: `ทำไมจึงห้ามเดินต่อจากจุดกระจก: เดิน ${n(dApp, 2)} λ เท่ากัน แต่เริ่มคนละจุด`, showY: true, scale: true, fine: false,
            points: [
              { z: zApp, label: `z_L ที่ ${n(wtgZApp, 3)} λ`, cls: 'load' },
              { z: zApp2, label: `ถูก: z = ${fz(zApp2, 2)}`, cls: 'in' },
              { z: yApp, label: `จุดกระจก ที่ ${n(wtgYApp, 3)} λ`, cls: 'y' },
              { z: zMirrorWalk, label: `ผิด: อ่านได้ ${fz(zMirrorWalk, 2)} ซึ่งคือ y`, cls: 'mid' },
            ],
            curves: [
              { zs: swrPath(zApp, dApp), cls: 'net', arrow: true, label: `เดินจากจุดจริง ${n(dApp, 2)} λ` },
              { zs: swrPath(yApp, dApp), cls: 'y', arrow: true, label: `เดินจากจุดกระจก ${n(dApp, 2)} λ` },
              { zs: [zApp2, C(1, 0), zMirrorWalk], cls: 'mid', dashed: true },
            ],
            swr: [swrApp],
            caption: `เส้นทึบสองเส้นยาวเท่ากันและหมุนไปเท่ากัน ปลายทางจึงยังตรงข้ามกันเสมอ (เส้นประ) · ที่ระยะ ${n(dApp, 2)} λ ค่าที่ถูกคือ ${fz(ZApp2, 1)} Ω ส่วนที่อ่านผิดคือ ${fz(ZMirrorWalk, 1)} Ω · ทั้งสองค่ามาจากกราฟใบเดียวกัน และหน้าตาสมเหตุสมผลพอ ๆ กัน` },
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
          W('นี่คือเหตุผลเดียวที่ต้องมีกริด Y ให้ยุ่งยาก — ไม่ใช่เพราะ y สวยกว่า z แต่เพราะอุปกรณ์ขนานเดินตามเส้นที่มีแต่กริด Y เท่านั้นที่วาดไว้ให้ ถ้ามีแต่กริด Z จะมองไม่เห็นเส้นทางของมันเลย'),
          T('ทิศทางจำได้ข้อเดียว: ค่าบวกหมุนตามเข็ม ค่าลบหมุนทวนเข็ม โดยหมุนอยู่บนเส้นของตัวเองเสมอ ไม่ใช่บนวงกลม SWR'),
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
          W('กฎสองข้อนี้ใช้ได้เฉพาะอุปกรณ์ก้อนเดียวที่ต่ออยู่ ณ ระนาบเดียวกัน (L, C หรือสตับ) · ถ้าสิ่งที่เพิ่มเข้ามาคือ "สายส่ง" จุดจะเดินบนวงกลม SWR แทน ไม่ใช่วง r และไม่ใช่วง g'),
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
              { z: yApp, label: `① y = ${fz(yApp, 0)}`, cls: 'y' },
              { z: zApp2, label: `② ที่ ${n(dApp, 2)} λ บนสาย`, cls: 'in' },
              { z: normalize(stubInput('short', APP3_Z0, APP3_lw), APP3_Z0), label: `③ ปลายสตับ x = ${n(APP3_XWANT / APP3_Z0, 1)}`, cls: 'stub' },
            ],
            curves: [
              { zs: [zApp, C(1, 0), yApp], cls: 'mid', dashed: true },
              { zs: swrPath(zApp, dApp), cls: 'net', arrow: true },
              { zs: linspace(0, APP3_lw, 40).map((l) => normalize(stubInput('short', APP3_Z0, l), APP3_Z0)), cls: 'stub', arrow: true },
            ],
            swr: [swrApp],
            caption: `① เส้นประผ่านศูนย์กลาง = หา y จาก z · ② ลูกศรบนวงกลม SWR = เดินไปตามสาย · ③ ลูกศรบนขอบกราฟ = ไล่ความยาวสายปลายลัดจาก SHORT ขึ้นมาจนได้ x ที่ต้องการ · ทั้งสามอย่างคือการขยับจุดคนละแบบบนกราฟใบเดียวกัน` },
          { kind: 'table', title: 'สามกลุ่มใช้ทำอะไร และขยับจุดอย่างไร',
            head: ['กลุ่ม', 'คำถามของโจทย์', 'การขยับจุดบนกราฟ', `ตัวอย่างประจำคอร์ส (สาย ${APP_Z0} Ω — คำนวณโดยแอป)`],
            rows: [
              ['1', 'ให้ z มา หา y (หรือกลับกัน)', 'ข้ามไปจุดตรงข้ามผ่านศูนย์กลาง 180°', `z = ${fz(zApp, 1)} → y = ${fz(yApp, 0)}`],
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
          T('ทางที่สอง — บนกราฟ: ลากเส้นตรงจากจุด z ผ่านศูนย์กลางไปอีกด้านหนึ่งของวงกลม SWR จุดที่ได้คือ y ทันที ไม่ต้องคำนวณ'),
          T('ทำไมจุดตรงข้ามจึงใช้ได้ — สายยาว λ/4 ให้'),
          M('z_{in} = \\frac{Z_0^{2}/Z_L}{Z_0} = \\frac{1}{z_L} = y_L'),
          T('และ λ/4 บนสายคือการหมุน 2βl = 2·(2π/λ)·(λ/4) = π นั่นคือครึ่งรอบพอดี'),
          M('\\Gamma_y = \\Gamma_z\\,e^{-j\\pi} = -\\Gamma_z \\qquad (|\\Gamma| \\text{ เท่าเดิม มุมต่างกัน } 180^\\circ)'),
          T(`ตรวจด้วยสเกลรอบกราฟ (แอปคำนวณให้): จุด z อยู่ที่ ${n(wtgZApp, 4)} λ จุด y อยู่ที่ ${n(wtgYApp, 4)} λ ต่างกัน ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 4)} λ พอดี — คือ λ/4 ตามที่หนังสือบอกว่าสองจุดนี้ห่างกันหนึ่งในสี่ความยาวคลื่น`),
          T('และเพราะทั้งสองจุดอยู่บนวงกลมเดียวกัน SWR จึงไม่เปลี่ยน'),
          R(`|\\Gamma| = ${n(abs(gApp), 4)}, \\qquad SWR = ${n(swrApp, 3)} \\qquad \\text{(ทั้งที่จุด } z \\text{ และจุด } y)`),
          W('กับดักที่พบบ่อยที่สุด: เมื่ออ่านจุดตรงข้ามบนกราฟ Z ตัวเลขที่อ่านได้คือ g กับ b ไม่ใช่ r กับ x · ที่ตำแหน่งนั้นเขียนว่า 1 − j1 ต้องอ่านว่า g = 1, b = −1'),
          N('ทางลัดตรวจคำตอบ: SHORT (z = 0) ต้องได้ y = ∞ (OPEN) และศูนย์กลาง (z = 1) ต้องได้ y = 1 คือจุดเดิม เพราะเป็นจุดเดียวที่อยู่ตรงแกนหมุน'),
        ],
        figures: [
          { kind: 'chart', title: 'การใช้งานที่ 1 บนกราฟตัวเต็ม: z กับ y อยู่คนละด้านของศูนย์กลาง', showY: true, scale: true, fine: false,
            points: [
              { z: zApp, label: `z = ${fz(zApp, 1)}`, cls: 'load' },
              { z: yApp, label: `y = ${fz(yApp, 0)}`, cls: 'y' },
            ],
            curves: [{ zs: [zApp, C(1, 0), yApp], cls: 'mid', dashed: true }],
            swr: [swrApp], gCircles: [1], bCircles: [-1],
            caption: `เส้นประคือเส้นผ่านศูนย์กลาง ยาวเท่ากันทั้งสองข้างเพราะ |Γ| เท่าเดิม · อ่านตัวเลขบนกราฟ Y (เขียว) ที่จุดเดิมก็ได้คำตอบเดียวกัน · ค่าบนสเกลรอบนอกต่างกัน ${n(((wtgYApp - wtgZApp) % 0.5 + 0.5) % 0.5, 3)} λ` },
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
    intro: 'ที่ความถี่สูง การใช้ตัวเหนี่ยวนำหรือตัวเก็บประจุจริงทำได้ยาก แต่สายส่งสั้น ๆ ที่ปลายลัดวงจรหรือปลายเปิดให้รีแอกแตนซ์ได้เหมือนกัน นี่คือที่มาของ stub',
    sections: [
      {
        id: 'shortopen', title: 'สายปลายลัดและปลายเปิดให้รีแอกแตนซ์อะไร',
        lines: [
          T('แทน Z_L = 0 (ลัดวงจร) และ Z_L = ∞ (ปลายเปิด) ลงในสมการสายส่งจะได้'),
          M('\\text{ปลายลัด: } Z_{in} = jZ_0\\tan\\beta l \\qquad \\text{ปลายเปิด: } Z_{in} = -jZ_0\\cot\\beta l'),
          T('ผลคือ'),
          M('l < \\frac{\\lambda}{4}: \\quad \\text{ปลายลัด} \\to \\text{inductive}, \\qquad \\text{ปลายเปิด} \\to \\text{capacitive}'),
          T('และที่ l = λ/4 พอดี ปลายลัดให้ Z_in = ∞ (เหมือนวงจร LC ขนานที่ resonance) ส่วนปลายเปิดให้ Z_in = 0'),
          N('สายส่งสั้น ๆ จึงใช้แทนวงจร LC ที่ความถี่สูงได้ โดยไม่ต้องใช้ชิ้นส่วนจริง'),
        ],
        figures: [
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
          { kind: 'plot', title: 'รีแอกแตนซ์ของสายปลายลัด X = Z₀ tan βl (Z₀ = 50 Ω)', xLabel: 'ความยาว (λ)', yLabel: 'X (Ω)', xMin: 0, xMax: 0.5, yMin: -300, yMax: 300,
            series: [{ name: 'ปลายลัด', points: linspace(0.001, 0.499, 200).map((l) => [l, 50 * Math.tan(2 * Math.PI * l)] as [number, number]) }],
            xTicks: [0, 0.125, 0.25, 0.375, 0.5], yTicks: [-300, -150, 0, 150, 300],
            caption: 'สั้นกว่า λ/4 เป็นบวก (inductive) · ยาวกว่า λ/4 เป็นลบ (capacitive) · ที่ λ/4 พอดี ค่าพุ่งเป็นอนันต์' },
          { kind: 'plot', title: 'รีแอกแตนซ์ของสายปลายเปิด X = −Z₀ cot βl (Z₀ = 50 Ω)', xLabel: 'ความยาว (λ)', yLabel: 'X (Ω)', xMin: 0, xMax: 0.5, yMin: -300, yMax: 300,
            series: [{ name: 'ปลายเปิด', color: '#dc2626', points: linspace(0.001, 0.499, 200).map((l) => [l, -50 / Math.tan(2 * Math.PI * l)] as [number, number]) }],
            xTicks: [0, 0.125, 0.25, 0.375, 0.5], yTicks: [-300, -150, 0, 150, 300],
            caption: 'ตรงข้ามกับปลายลัดทุกประการ และเลื่อนไปครึ่งหนึ่งของภาพที่แล้ว (0.25 λ)' },
          { kind: 'lab', label: 'ทดลอง: สายปลายลัด 50 Ω ยาว 0.15 λ', circuit: () => buildCircuit(100e6, 50, [['tline', 'series', { Z0: 50, len: 0.15, vf: 0.66, lossDb: 0 }]]), note: 'ปรับความยาวแล้วดูจุดวิ่งไปตามขอบกราฟ' },
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
        id: 'ex-stub', title: 'ตัวอย่าง: หาความยาวสตับที่ 150 MHz',
        lines: [
          T('โจทย์จากหนังสือ: โหลดมีแอดมิตแตนซ์ Y_L = 0.004 − j0.002 S สายมี Y₀ = 0.0033 S ที่ความถี่ 150 MHz ใช้ฉนวนอากาศ'),
          T('ขั้นที่ 1 — normalize แอดมิตแตนซ์'),
          M(`y_L = \\frac{Y_L}{Y_0} = \\frac{0.004 - j0.002}{0.0033} = ${tc(C(0.004 / 0.0033, -0.002 / 0.0033), 2)}`),
          T('ขั้นที่ 2 — โหลดมี susceptance เป็น −j0.61 จึงต้องสร้าง +j0.61 มาหักล้าง'),
          M('b_{stub} = +0.61'),
          T('ขั้นที่ 3 — หาความยาวสตับปลายลัดที่ให้ค่านี้'),
          M('y_{stub} = -j\\cot\\beta l = +j0.61 \\;\\Rightarrow\\; \\cot\\beta l = -0.61'),
          R(`l = ${n((() => { let l = Math.atan(-1 / (0.002 / 0.0033 / (1))) / (2 * Math.PI); return ((l % 0.5) + 0.5) % 0.5; })(), 3)}\\lambda \\qquad (\\text{หนังสือ } 0.337\\lambda)`),
          T('ขั้นที่ 4 — แปลงเป็นความยาวจริง เพราะเป็นฉนวนอากาศ'),
          M('\\lambda = \\frac{c}{f} = \\frac{3\\times10^{8}}{150\\times10^{6}} = 2\\ \\text{m}'),
          R(`l = 0.337 \\times 2 \\approx 0.674\\ \\text{m} \\approx 67.4\\ \\text{cm}`),
        ],
        figures: [
          { kind: 'smith', title: 'หาความยาวสตับ: เริ่มจากจุด SHORT แล้วเดินตามขอบกราฟจนถึง b ที่ต้องการ', showY: true,
            points: [{ z: C(0, 0), label: 'SHORT (y = ∞)', cls: 'stub' }, { z: admittance(C(0, 0.61)), label: 'b = +0.61', cls: 'y' }],
            curves: [{ zs: linspace(0.001, 0.337, 40).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'stub', arrow: true }],
            caption: 'สตับปลายลัดเริ่มที่ SHORT เสมอ แล้วเดินไปทาง generator ตามขอบกราฟ (|Γ| = 1)' },
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
          { kind: 'smith', title: 'ขั้นที่ 1–2: จาก z_L ไปเป็น y_L (หมุน 180°)',
            points: [{ z: z78, label: `z_L = ${fz(z78, 1)}`, cls: 'load' }, { z: y78, label: `y_L = ${fz(y78, 2)}`, cls: 'y' }],
            curves: [{ zs: [z78, C(1, 0), y78], cls: 'mid', dashed: true }], swr: [swr78] },
          { kind: 'smith', title: 'ขั้นที่ 3: เดินจาก y_L ไปทาง generator จนถึงวงกลม g = 1', showY: true, gCircles: [1],
            points: [{ z: y78, label: 'y_L', cls: 'y' }, { z: admittance(ex78.yAtStub), label: `y = ${fz(ex78.yAtStub, 2)} ที่ ${n(ex78.dLambda, 3)}λ`, cls: 'in' }],
            curves: [{ zs: swrPath(y78, ex78.dLambda), cls: 'net', arrow: true }], swr: [swr78],
            caption: 'จุดสีเขียวคือตำแหน่งที่จะติดสตับ' },
          { kind: 'smith', title: 'ขั้นที่ 4–6: หาความยาวสตับจากจุด SHORT', showY: true,
            points: [{ z: C(0, 0), label: 'SHORT', cls: 'stub' }, { z: admittance(C(0, ex78.bStub)), label: `b = ${n(ex78.bStub, 2)} → l = ${n(ex78.lLambda, 3)}λ`, cls: 'stub' }],
            curves: [{ zs: linspace(0.001, ex78.lLambda, 30).map((l) => C(0, Math.tan(2 * Math.PI * l))), cls: 'stub', arrow: true }],
            bCircles: [ex78.bStub] },
          { kind: 'smith', title: 'ผลรวม: ใส่สตับแล้วจุดเข้าศูนย์กลาง', showY: true, gCircles: [1],
            points: [{ z: admittance(ex78.yAtStub), label: 'ก่อนใส่สตับ', cls: 'mid' }, { z: C(1, 0), label: 'หลังใส่สตับ → แมตช์', cls: 'in' }],
            curves: [{ zs: shuntPath(admittance(ex78.yAtStub), ex78.bStub), cls: 'y', arrow: true }] },
          { kind: 'circuit', title: 'วงจรที่ได้', circuit: buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex78.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex78.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 450, X: -600 }]]) },
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
    intro: 'ทั้งสตับและหม้อแปลง λ/4 พึ่งพาความยาวไฟฟ้า เมื่อความถี่เปลี่ยน ความยาวจริงเท่าเดิมแต่ความยาวไฟฟ้าเปลี่ยน matching จึงหลุด บทนี้อธิบายที่มาและคำนวณให้เห็นจริง',
    sections: [
      {
        id: 'physical', title: 'ความยาวจริง กับ ความยาวไฟฟ้า',
        lines: [
          T('ความยาวจริงของสาย (เช่น 3.9 เมตร) ไม่เปลี่ยนตามความถี่ แต่ความยาวคลื่นเปลี่ยน'),
          M('\\lambda = \\frac{v}{f} \\;\\Rightarrow\\; f \\uparrow \\;\\Rightarrow\\; \\lambda \\downarrow'),
          T('ความยาวไฟฟ้าคืออัตราส่วน l/λ จึงเพิ่มขึ้นเมื่อความถี่เพิ่ม'),
          M('\\frac{l}{\\lambda\'} = \\frac{l}{\\lambda}\\cdot\\frac{f\'}{f}'),
          R('f\' = k f \\;\\Rightarrow\\; \\text{ความยาวไฟฟ้าใหม่} = k \\times \\text{ความยาวไฟฟ้าเดิม}'),
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
          W('ตัวอย่างนี้สมมติว่า Z_L, Z₀, VF และ loss ไม่เปลี่ยนตามความถี่ เพื่อแยกให้เห็นผลของ electrical length เพียงอย่างเดียว · อุปกรณ์หรือเสาอากาศจริงมักมี Z_L(f) ที่เปลี่ยนไปด้วย ผลรวมจึงต่างจากนี้'),
          T('ออกแบบไว้ที่ 10 MHz ในสายอากาศ ดังนั้น λ = 30 m'),
          M('d = 0.130 \\times 30 = 3.9\\ \\text{m}, \\qquad l_s = 0.085 \\times 30 = 2.55\\ \\text{m}'),
          T('ที่ 12 MHz ความยาวคลื่นเหลือ 25 m ความยาวจริงเท่าเดิม แต่คิดเป็นความยาวคลื่นใหม่ได้'),
          M(`d' = \\frac{3.9}{25} = ${n(f12.d, 3)}\\lambda', \\qquad l_s' = \\frac{2.55}{25} = ${n(f12.ls, 3)}\\lambda'`),
          T('เมื่อคำนวณใหม่ที่ความถี่นี้ (แอปคำนวณให้)'),
          M(`y_{line} = ${tc(f12.yLine, 2)}, \\qquad y_{stub} = ${tc(f12.yStub, 2)}`),
          M(`y_{total} = ${tc(f12.yTot, 2)} \\;\\Rightarrow\\; z = ${tc(f12.zTot, 2)}`),
          R(`SWR = ${n(f12.swr, 2)} \\qquad (\\text{จาก } 1.00 \\text{ ที่ } 10\\ \\text{MHz})`),
          W('สังเกตว่าเปลี่ยนความถี่เพียง 20 % ทั้งตำแหน่งสตับและความยาวสตับก็ผิดไปพร้อมกัน SWR จึงพุ่งขึ้นทันที'),
          N(`ข้อสังเกตเรื่องการปัดเศษ: ถ้าใช้ค่าที่ปัดแล้วของหนังสือ (d = 0.130 λ, l_s = 0.085 λ) ที่ 10 MHz จะได้ SWR = ${n(ex78AtFreq(10).swr, 3)} ไม่ใช่ 1.000 พอดี · ค่าที่ไม่ปัดคือ d = ${n(ex78.dLambda, 4)} λ และ l_s = ${n(ex78.lLambda, 4)} λ ซึ่งให้ SWR = 1.000`),
        ],
        figures: [
          { kind: 'plot', title: 'SWR ของวงจร Example 7-8 เมื่อความถี่เปลี่ยน (คำนวณโดยแอป)', xLabel: 'ความถี่ (MHz)', yLabel: 'SWR', xMin: 8, xMax: 12, yMin: 1, yMax: 4,
            series: [{ name: 'SWR', points: linspace(8, 12, 81).map((fm) => [fm, Math.min(4, ex78AtFreq(fm).swr)] as [number, number]) }],
            xTicks: [8, 9, 10, 11, 12], yTicks: [1, 2, 3, 4],
            markers: [{ x: 10, y: 1, text: 'ออกแบบที่ 10 MHz' }],
            caption: 'แมตช์สมบูรณ์เฉพาะที่ 10 MHz · ยิ่งห่างจากความถี่ออกแบบ SWR ยิ่งสูง' },
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
          N('SWR ขึ้นไม่มากเพราะโหลดเดิมมี SWR เพียง 1.5 อยู่แล้ว ระบบที่ SWR เดิมสูงจะไวต่อความถี่มากกว่า'),
        ],
        figures: [
          { kind: 'smith', title: 'Example 7-10: จาก y_L เดินจนถึงวงกลม g = 1', showY: true, gCircles: [1],
            points: [{ z: admittance(z710), label: `y_L = ${fz(admittance(z710), 2)}`, cls: 'y' }, { z: admittance(ex710.yAtStub), label: `y = ${fz(ex710.yAtStub, 2)}`, cls: 'in' }],
            curves: [{ zs: swrPath(admittance(z710), ex710.dLambda), cls: 'net', arrow: true }], swr: [swr710] },
          { kind: 'lab', label: 'Lab: Example 7-10 (ลองเปลี่ยนความถี่ที่แถบบน Canvas ดู SWR เปลี่ยน)',
            circuit: () => buildCircuit(10e6, 300, [['stub_short', 'shunt', { Z0: 300, len: Number(ex710.lLambda.toFixed(4)) }], ['tline', 'series', { Z0: 300, len: Number(ex710.dLambda.toFixed(4)), vf: 1, lossDb: 0 }], ['load', 'series', { R: 200, X: 0 }]]), showY: true },
        ],
      },
      {
        id: 'bandwidth', title: 'ความหมายในเชิง bandwidth',
        lines: [
          T('การตรวจ SWR ที่ความถี่อื่นก็คือการหา bandwidth ของระบบ matching นั่นเอง'),
          T('ถ้ากำหนดเกณฑ์ว่า SWR ≤ 2 ก็ดูว่าช่วงความถี่ใดที่กราฟ SWR ยังต่ำกว่าเส้นนั้น'),
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
            points: [{ z: z77, label: 'z_L', cls: 'load' }, { z: C(1, 0), label: 'เป้าหมาย', cls: 'in' }],
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
          W('ข้อ 1 กับข้อ 2 อันตรายที่สุด เพราะกราฟยังอ่านออกมาเป็นตัวเลขสวย ๆ ได้ตามปกติ ผิดโดยไม่มีสัญญาณเตือน'),
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
