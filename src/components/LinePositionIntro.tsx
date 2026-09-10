import React, { useState } from 'react';
import { C, fmtNum } from '../engine/complex';
import { gammaFromZ, lineInput, normalize, swrFromGamma } from '../engine/rf';
import { solveQwt } from '../engine/matching';
import { SmithFigure } from './SmithFigure';
import { Tex } from './Tex';

const load = C(100, 50);
const at = (d: number) => lineInput(load, 50, d, 0);
const textZ = (d: number) => {
  const z = at(d);
  return `${fmtNum(z.re, 2)} ${z.im < -1e-8 ? '−' : '+'} j${fmtNum(Math.abs(z.im) < 1e-8 ? 0 : Math.abs(z.im), 2)} Ω`;
};
const swr = swrFromGamma(gammaFromZ(load, 50));
const crossings = solveQwt(load, 50).slice().sort((a, b) => a.dLambda - b.dLambda);

export const LinePositionIntro: React.FC<{ findReal?: boolean }> = ({ findReal = false }) => {
  const [distance, setDistance] = useState(0);
  const value = at(distance);
  const path = Array.from({ length: 81 }, (_, i) => normalize(at(distance * i / 80), 50));
  return <div className="reflection-intro">
    <p className="ri-eyebrow">{findReal ? 'ภารกิจ: หาจุดที่ส่วน X เป็นศูนย์' : 'ทดลอง: โหลดเดิม เปลี่ยนเพียงจุดที่มองเข้าไป'}</p>
    <h4>{findReal ? 'บนกราฟ จุดตัดแกนนอนช่วยหาคำตอบ' : 'เลื่อนจุดวัด แล้วอ่านค่าใหม่ไปพร้อมกัน'}</h4>
    <p>{findReal ? 'ใช้โหลด 100 + j50 Ω กับสาย 50 Ω เหมือนหัวข้อก่อน กดดูจุดตัดทั้งสองแล้วสังเกตว่า X หายไป แต่ค่า R ยังไม่ใช่ 50 Ω' : 'โหลดที่ปลายสายยังเป็น 100 + j50 Ω ตลอด แต่จุดวัดแต่ละตำแหน่งมองเห็นทั้งสายช่วงที่เหลือและโหลด จึงอ่านอิมพีแดนซ์ได้ต่างกัน'}</p>
    <div className="lp-line" aria-hidden="true"><span>ด้านเครื่องส่ง</span><span>โหลดเดิม<br /><b>100 + j50 Ω</b></span><div className="lp-wire"><i style={{ left: `${100 - distance * 200}%` }}>▼</i></div><small>0.5 λ ← ระยะจากโหลด → 0 λ</small></div>
    <label className="lp-slider">จุดวัดอยู่ห่างจากโหลด {fmtNum(distance, 4)} λ ไปทางเครื่องส่ง
      <input type="range" min="0" max="0.5" step="0.001" value={distance} onChange={(event) => setDistance(Number(event.target.value))} />
    </label>
    <p className="ri-small">ลากตัวเลื่อนไปทางขวา = เพิ่มระยะจากโหลด จุดวัดบนรูปจึงขยับไปทางเครื่องส่งด้านซ้าย · λ อ่านว่า “แลมบ์ดา” คือความยาวคลื่นในสาย</p>
    <div className="ri-choices" role="group" aria-label="ตำแหน่งวัดตัวอย่าง">
      {(findReal ? [{ d: 0, label: 'เริ่มที่โหลด' }, ...crossings.map((c, i) => ({ d: c.dLambda, label: `จุดตัดที่ ${i + 1} · ${fmtNum(c.dLambda, 3)} λ` }))] : [{ d: 0, label: 'ที่โหลด · 0 λ' }, { d: 0.25, label: 'หนึ่งในสี่คลื่น · 0.25 λ' }, { d: 0.5, label: 'ครึ่งคลื่น · 0.5 λ' }]).map(({ d, label }) => <button key={d} type="button" aria-pressed={Math.abs(distance - d) < 1e-8} onClick={() => setDistance(d)}>{label}</button>)}
    </div>
    <div className="ri-reading"><div aria-live="polite"><h4>ค่าที่อ่านได้: {textZ(distance)}</h4><p><b>R = {fmtNum(value.re, 2)} Ω</b> คือส่วนต้านทาน<br /><b>X = {fmtNum(Math.abs(value.im) < 1e-8 ? 0 : value.im, 2)} Ω</b> คือส่วนรีแอกแตนซ์</p><p>{Math.abs(value.im) < 1e-8 ? 'ตอนนี้ X = 0: ค่าที่มองเห็นเป็นความต้านทานล้วน' : value.im > 0 ? 'X เป็นบวก: ค่าที่มองเห็นมีลักษณะเหนี่ยวนำ อยู่ครึ่งบนของกราฟ' : 'X เป็นลบ: ค่าที่มองเห็นมีลักษณะเก็บประจุ อยู่ครึ่งล่างของกราฟ'}</p><p><b>SWR = {fmtNum(swr, 2)} เท่าเดิม</b> ตลอดทาง เพราะตัวอย่างนี้ใช้สายไร้การสูญเสียและอ้างอิง 50 Ω เหมือนกัน</p></div><div><SmithFigure points={[{ z: normalize(load, 50), label: 'โหลด', cls: 'load' }, { z: normalize(value, 50), label: 'จุดวัด', cls: 'in' }]} curves={[{ zs: path, cls: 'net', arrow: distance > 0 }]} swr={[swr]} xCircles={findReal ? [0] : undefined} /><p className="ri-small">จุดแดง = โหลด • จุดเขียว = ค่าที่จุดวัด • เส้นม่วง = ทางที่จุดเดิน<br />เมื่อเริ่มที่ 0 λ หรือครบ 0.5 λ จุดทั้งสองซ้อนกัน</p></div></div>
    <div className="ri-takeaway"><b>{findReal ? 'X = 0 ยังไม่แปลว่าแมตช์' : 'ค่าเปลี่ยน เพราะเปลี่ยนตำแหน่งที่มอง ไม่ใช่เพราะโหลดถูกเปลี่ยน'}</b><p>{findReal ? 'สาย 50 Ω ต้องเห็น 50 + j0 Ω จึงแมตช์ การเดินบนสายเส้นนี้เพียงอย่างเดียวหมุนจุดอยู่บนวงเดิม ไม่พาเข้ากลาง ขั้นต่อไปจึงต้องออกแบบ matching เพิ่ม เช่น ต่อหม้อแปลง λ/4 ที่มีค่าอิมพีแดนซ์เหมาะสมตรงจุดความต้านทานล้วน' : 'ลองกด 0.25 λ จะอ่านได้ 20 − j10 Ω แล้วกด 0.5 λ จะกลับเป็น 100 + j50 Ω เหมือนโหลด จุดบน Smith Chart จึงวนครบหนึ่งรอบเมื่อเดินตามสายครึ่งความยาวคลื่น'}</p></div>
    {!findReal && <details className="ri-formulas"><summary>ดูสูตรที่อยู่เบื้องหลังภาพ (อ่านภายหลังได้)</summary><p>l คือระยะจากโหลดไปทางเครื่องส่ง ส่วน β = 2π/λ ใช้แปลงระยะเป็นมุมทางไฟฟ้า สูตรนี้ใช้กับสายสม่ำเสมอไร้การสูญเสีย</p><Tex block tex={'Z_{in}(l)=Z_0\\frac{Z_L+jZ_0\\tan(\\beta l)}{Z_0+jZ_L\\tan(\\beta l)}'} /><Tex block tex={'Z_{in}(\\lambda/4)=\\frac{Z_0^2}{Z_L}, \\qquad Z_{in}(\\lambda/2)=Z_L'} /><p>ที่หนึ่งในสี่คลื่นต้องใช้ Z₀²/ZL ไม่ใช่กลับเศษส่วนของค่าหน่วยโอห์มอย่างเดียว เรื่องค่าปกติ z และแอดมิตแตนซ์จะอธิบายในบทต่อไป</p></details>}
  </div>;
};
