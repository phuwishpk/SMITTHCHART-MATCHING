import React, { useState } from 'react';
import { C, Complex, abs, fmtNum } from '../engine/complex';
import { gammaFromz, rotateTowardGenerator, swrFromGamma, wtgFromGamma, zFromGamma } from '../engine/rf';
import { SmithFigure } from './SmithFigure';
import { Tex } from './Tex';

const initial = C(0.5, 0.5);
const gamma = gammaFromz(initial);
const swr = swrFromGamma(gamma);
const at = (d: number) => zFromGamma(rotateTowardGenerator(gamma, d));
const show = (z: Complex) => `${fmtNum(z.re, 3)} ${z.im < -1e-8 ? '−' : '+'} j${fmtNum(Math.abs(z.im) < 1e-8 ? 0 : Math.abs(z.im), 3)}`;
const wrap = (value: number) => ((value % 0.5) + 0.5) % 0.5;

export const SwrCircleIntro: React.FC = () => {
  const [distance, setDistance] = useState(0);
  const [readAxis, setReadAxis] = useState(false);
  const current = at(distance);
  return <div className="reflection-intro swd-intro">
    <p className="ri-eyebrow">ทดลองก่อนอ่านสูตร • โหลด 25 + j25 Ω • สาย 50 Ω ไร้การสูญเสีย</p>
    <h4>จุดเปลี่ยนตำแหน่ง แต่ห่างจากศูนย์กลางเท่าเดิม</h4>
    <p>จุดบนกราฟแทนอิมพีแดนซ์ที่อ่านได้ ณ จุดวัด ลากตัวเลื่อนแล้วดูว่า r และ x เปลี่ยน แต่เส้นจากศูนย์กลางถึงจุดวัดยาวเท่าเดิม เส้นนี้คือรัศมี |Γ|</p>
    <label className="lp-slider">ระยะจากโหลดไปทางเครื่องส่ง: {fmtNum(distance, 3)} λ
      <input type="range" min="0" max="0.5" step="0.001" value={distance} onChange={e => setDistance(Number(e.target.value))} />
    </label>
    <div className="ri-choices" role="group" aria-label="เลือกระยะเพื่อสังเกต SWR">
      {[0, 0.1, 0.25, 0.5].map(d => <button key={d} type="button" aria-pressed={Math.abs(distance - d) < 1e-8} onClick={() => setDistance(d)}>{d} λ</button>)}
      <button type="button" aria-pressed={readAxis} onClick={() => setReadAxis(!readAxis)}>อ่าน SWR ที่จุดตัดแกนนอน</button>
    </div>
    <div className="ri-reading"><div aria-live="polite">
      <h4>z ที่จุดวัด = {show(current)}</h4>
      <div className="swd-values"><div><small>รัศมี |Γ|</small><b>{fmtNum(abs(gamma), 3)}</b></div><div><small>SWR ตลอดสาย</small><b>{fmtNum(swr, 3)}</b></div></div>
      <p>วงกลม SWR มีศูนย์กลางตรงกลางกราฟ ส่วนวง r คงที่ในตารางจะมีศูนย์กลางเยื้องไปทางขวา จึงเป็นวงกลมคนละชุดกัน</p>
      {readAxis ? <p>จุดตัดด้านขวา: r = {fmtNum(swr, 3)} จึงอ่าน SWR = {fmtNum(swr, 3)}<br />จุดตัดด้านซ้าย: r = {fmtNum(1 / swr, 3)} = 1/SWR<br />ค่า r ณ จุดวัดทั่วไปใช้แทน SWR ไม่ได้</p> : <p>ลองกด 0.25 λ แล้ว 0.5 λ: จุดจะไปอีกด้านและกลับมาที่เดิม โดย SWR ยังเท่าเดิมทั้งสองครั้ง</p>}
    </div><div><SmithFigure
      points={[{ z: initial, label: 'โหลด', cls: 'load' }, { z: current, label: 'จุดวัด', cls: 'in' }, ...(readAxis ? [{ z: C(swr, 0), label: 'ขวา: r = SWR', cls: 'y' as const }, { z: C(1 / swr, 0), label: 'ซ้าย: r = 1/SWR', cls: 'mid' as const }] : [])]}
      curves={[{ zs: Array.from({ length: 81 }, (_, i) => at(distance * i / 80)), cls: 'net', arrow: distance > 0 }, { zs: [C(1, 0), current], cls: 'y', dashed: true }]}
      swr={[swr]}
    /><p className="ri-small">แดง = โหลด • เขียว = จุดวัด • เส้นประจากกลางกราฟ = รัศมี |Γ|<br />ที่ 0 และ 0.5 λ จุดโหลดกับจุดวัดซ้อนกัน</p></div></div>
    <div className="ri-takeaway"><b>รัศมีเท่ากัน → |Γ| เท่ากัน → SWR เท่ากัน</b><p>จุดกลางกราฟคือแมตช์และมี SWR = 1 การเปลี่ยนความยาวสาย 50 Ω ไร้การสูญเสียในตัวอย่างนี้หมุนจุดอยู่บนวงเดิม จึงยังไม่พาโหลดนี้ไปถึงจุดกลาง</p></div>
    <details className="ri-formulas"><summary>ตรวจด้วยสูตร: ทำไมรัศมีจึงบอก SWR ได้?</summary><Tex block tex={'SWR=\\frac{1+|\\Gamma|}{1-|\\Gamma|}=\\frac{1+0.4472}{1-0.4472}\\approx2.618'} /><p>|Γ| เป็นอัตราส่วนขนาดแรงดันคลื่นสะท้อนต่อคลื่นเดินหน้า ส่วน SWR เป็นอัตราส่วนยอดต่อท้องของขนาดแรงดันรวมบนสาย ทั้งสองค่าบอกความไม่แมตช์ได้ แต่เป็นคนละอัตราส่วน</p></details>
  </div>;
};

export const DistanceIntro: React.FC = () => {
  const [distance, setDistance] = useState(0.1);
  const [towardGenerator, setTowardGenerator] = useState(true);
  // Returning toward the load starts 0.5 λ from it, so the probe stays on the real line.
  const startDistance = towardGenerator ? 0 : 0.5;
  const signed = towardGenerator ? distance : -distance;
  const position = startDistance + signed;
  const current = at(position);
  const startScale = wtgFromGamma(gamma);
  const rawScale = startScale + signed;
  const endScale = wrap(rawScale);
  const wrapped = rawScale < 0 || rawScale >= 0.5;
  return <div className="reflection-intro swd-intro">
    <p className="ri-eyebrow">ระยะจริง → มุมบนกราฟ → ค่าบนสเกล • ใช้โหลดและสายเดียวกับบท 4</p>
    <h4>เดินบนสายเท่าไร จุดบนกราฟหมุนเท่าไร?</h4>
    <p>λ คือความยาวคลื่นในสาย ลองเลือก 0.125, 0.25 และ 0.5 λ แล้วเทียบตำแหน่งจุดวัดกับเส้นทางบนกราฟ</p>
    <div className="ri-choices" role="group" aria-label="ทิศทางการเดินบนสาย">
      <button type="button" aria-pressed={towardGenerator} onClick={() => setTowardGenerator(true)}>ไปทางเครื่องส่ง ↻ ตามเข็ม</button>
      <button type="button" aria-pressed={!towardGenerator} onClick={() => setTowardGenerator(false)}>กลับทางโหลด ↺ ทวนเข็ม</button>
    </div>
    <p className="ri-small">{towardGenerator ? 'เริ่มที่โหลด ระยะจากโหลด = 0 λ' : 'เริ่มที่จุดวัดห่างโหลด 0.5 λ ซึ่งอ่าน z ได้เท่ากับโหลด แล้วเดินกลับเข้าหาโหลด'}</p>
    <div className="lp-line" aria-hidden="true"><span>ด้านเครื่องส่ง</span><span>โหลด 25 + j25 Ω</span><div className="lp-wire"><i style={{ left: `${100 - position * 200}%` }}>▼</i></div><small>0.5 λ ← ระยะจากโหลด → 0 λ</small></div>
    <label className="lp-slider">ระยะที่เดินจากจุดเริ่ม: {fmtNum(distance, 3)} λ
      <input type="range" min="0" max="0.5" step="0.001" value={distance} onChange={e => setDistance(Number(e.target.value))} />
    </label>
    <div className="ri-choices" role="group" aria-label="ระยะเดินตัวอย่าง">
      {[0, 0.1, 0.125, 0.25, 0.5].map(d => <button key={d} type="button" aria-pressed={Math.abs(distance - d) < 1e-8} onClick={() => setDistance(d)}>{d} λ</button>)}
    </div>
    <div className="swd-values"><div><small>มุมทางไฟฟ้าของสาย βl</small><b>{fmtNum(360 * distance, 1)}°</b></div><div><small>มุมที่หมุนบนกราฟ 2βl</small><b>{fmtNum(720 * distance, 1)}°</b></div></div>
    <div className="ri-reading"><div aria-live="polite">
      <h4>อ่านสเกล Toward Generator ชุดเดียวตลอด</h4>
      <ol><li>สเกลเริ่มต้น = {fmtNum(startScale, 4)} λ</li><li>{towardGenerator ? 'บวก' : 'ลบ'}ระยะเดิน: {fmtNum(startScale, 4)} {towardGenerator ? '+' : '−'} {fmtNum(distance, 3)} = {fmtNum(rawScale, 4)}</li><li>{wrapped ? `${rawScale < 0 ? 'ค่าติดลบ จึงบวก' : 'ค่าถึงหรือเกิน 0.5 จึงลบ'} 0.5 → ${fmtNum(endScale, 4)} λ` : `ยังอยู่ในช่วง 0 ถึงต่ำกว่า 0.5 → ${fmtNum(endScale, 4)} λ`}</li><li>อ่าน z ที่จุดปลายทาง = {show(current)}</li></ol>
      <p>จุดวัดจริงห่างโหลด {fmtNum(position, 3)} λ<br />SWR = {fmtNum(swr, 3)} เท่าเดิม</p>
      <p className="ri-small">สเกลเริ่มต้นเป็นพิกัดรอบกราฟ จึงไม่จำเป็นต้องเริ่มที่เลข 0 แม้เราจะวัดตรงโหลดก็ตาม</p>
    </div><div><SmithFigure points={[{ z: initial, label: 'เริ่ม', cls: 'load' }, { z: current, label: 'ปลายทาง', cls: 'in' }]} curves={[{ zs: Array.from({ length: 81 }, (_, i) => at(startDistance + signed * i / 80)), cls: 'net', arrow: distance > 0 }]} swr={[swr]} /><p className="ri-small">กราฟย่อเน้นทิศหมุน ตัวเลขสเกลแสดงในขั้นตอนข้างกราฟ<br />ตัวอย่างนี้ใช้สายสม่ำเสมอไร้การสูญเสีย</p></div></div>
    <div className="ri-takeaway"><b>0.125 λ → 90° • 0.25 λ → 180° • 0.5 λ → 360°</b><p>มุมบนกราฟมาจากเฟสของคลื่นสะท้อนเทียบกับคลื่นเดินหน้า เมื่อย้ายจุดวัด เฟสทั้งสองเปลี่ยนคนละทิศ จึงได้มุมสัมพัทธ์เป็นสองเท่าของ βl</p></div>
  </div>;
};
