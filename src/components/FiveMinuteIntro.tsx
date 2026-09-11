import React, { useState } from 'react';
import { C, Complex, fmtNum } from '../engine/complex';
import { gammaFromZ, normalize, reflectedPowerFrac, swrFromGamma } from '../engine/rf';
import { SmithFigure } from './SmithFigure';
import { TravelingWaveDemo } from './TravelingWaveDemo';

const Z0 = 50;
const loads = [
  { label: '50 Ω · แมตช์', z: C(50, 0) },
  { label: '100 Ω', z: C(100, 0) },
  { label: '25 + j25 Ω', z: C(25, 25) },
  { label: '25 − j25 Ω', z: C(25, -25) },
];

const complexText = (value: Complex, unit = '') => {
  const imaginary = Math.abs(value.im) < 1e-9 ? '' : ` ${value.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(value.im), 2)}`;
  return `${fmtNum(value.re, 2)}${imaginary}${unit}`;
};

export const FiveMinuteIntro: React.FC = () => {
  const [step, setStep] = useState(0);
  const [loadIndex, setLoadIndex] = useState(2);
  const load = loads[loadIndex].z;
  const z = normalize(load, Z0);
  const gamma = gammaFromZ(load, Z0);
  const swr = swrFromGamma(gamma);
  const reflected = reflectedPowerFrac(gamma) * 100;
  const matched = reflected < 1e-8;
  const steps = ['1 · ปัญหา', '2 · หนึ่งจุด', '3 · อ่านตำแหน่ง', '4 · เป้าหมาย'];
  const positionText = Math.abs(z.im) < 1e-9
    ? 'อยู่บนแกนนอน: ไม่มีส่วนรีแอกแตนซ์'
    : z.im > 0
      ? 'อยู่ครึ่งบน: มี +jX ลักษณะเหนี่ยวนำ'
      : 'อยู่ครึ่งล่าง: มี −jX ลักษณะเก็บประจุ';

  return <div className="reflection-intro five-minute-intro">
    <p className="ri-eyebrow">ภาพทดลอง 4 ขั้น • ใช้สายอ้างอิง 50 Ω</p>
    <h4>รู้จัก Smith Chart โดยยังไม่ต้องอ่านเส้นตาราง</h4>
    <div className="fm-progress" role="group" aria-label="ขั้นของบทนำ">
      {steps.map((label, index) => <button key={label} type="button" aria-pressed={step === index} onClick={() => setStep(index)}><span>{index < step ? '✓' : index + 1}</span>{label.split(' · ')[1]}</button>)}
    </div>

    {step === 0 && <div className="fm-stage">
      <div><h4>ทำไมต้องมีกราฟนี้?</h4><p>เครื่องส่งส่งพลังงานผ่านสาย 50 Ω ไปยังโหลด ถ้าโหลดไม่เข้ากับสาย พลังงานบางส่วนจะสะท้อนกลับ Smith Chart ช่วยแสดงว่าโหลดอยู่ห่างจากสภาพแมตช์มากแค่ไหน</p>
        <p className="ri-small">เลือกโหลดแล้วดูคลื่นเปลี่ยนด้านล่าง ลองเริ่มที่ 50 Ω แล้วเทียบกับ 100 Ω</p>
        <div className="ri-choices" role="group" aria-label="เลือกโหลด">{loads.map((item, index) => <button key={item.label} type="button" aria-pressed={loadIndex === index} onClick={() => setLoadIndex(index)}>{item.label}</button>)}</div>
        <TravelingWaveDemo gamma={gamma} loadLabel={complexText(load, ' Ω')} />
        <div className="swd-values"><div><small>กำลังสะท้อนโดยประมาณ</small><b>{fmtNum(reflected, 1)}%</b></div><div><small>SWR</small><b>{Number.isFinite(swr) ? fmtNum(swr, 2) : '∞'}</b></div></div>
        <p className="fm-answer">{matched ? 'โหลดเท่ากับสายพอดี จึงไม่มีคลื่นสะท้อน' : 'โหลดไม่เท่ากับสาย จึงมีคลื่นสะท้อน แม้โหลดจะเป็นตัวต้านทานล้วนก็ตาม'}</p>
      </div>
    </div>}

    {step === 1 && <div className="fm-stage fm-two-column"><div><h4>หนึ่งจุดแทนอะไร?</h4><p>หนึ่งจุดแทน <b>อิมพีแดนซ์ที่มองเห็น ณ จุดวัดหนึ่งและความถี่หนึ่ง</b> กราฟใช้ค่าปกติ z ซึ่งได้จากการหาร Z ด้วยอิมพีแดนซ์อ้างอิงของสาย</p><div className="fm-equation"><span>โหลดจริง</span><b>Z = {complexText(load, ' Ω')}</b><i>หารด้วย 50 Ω</i><span>ค่าที่ใช้บนกราฟ</span><b>z = {complexText(z)}</b></div><p>เปลี่ยน Z₀ แล้วตำแหน่ง z เปลี่ยนได้ จึงต้องรู้ค่าอ้างอิงของกราฟทุกครั้ง</p></div><SmithFigure points={[{ z: C(1, 0), label: 'กลาง: z = 1', cls: 'in' }, { z, label: `โหลด: z = ${complexText(z)}`, cls: 'load' }]} curves={[{ zs: [C(1, 0), z], cls: 'y', dashed: true }]} /></div>}

    {step === 2 && <div className="fm-stage fm-two-column"><div><h4>ตอนนี้มองเพียงสองอย่าง</h4><div className="fm-rules"><div><b>บน–ล่าง</b><span>บอกเครื่องหมายของส่วน j</span></div><div><b>ใกล้–ไกลจากกลาง</b><span>บอกว่าสะท้อนน้อยหรือมาก</span></div></div><p className="fm-answer">{positionText}</p><p>จุดนี้สะท้อนกำลังประมาณ {fmtNum(reflected, 1)}% จุดกลางสะท้อน 0% ส่วนขอบนอกสะท้อน 100%</p><div className="ri-choices" role="group" aria-label="เลือกตำแหน่งตัวอย่าง">{loads.map((item, index) => <button key={item.label} type="button" aria-pressed={loadIndex === index} onClick={() => setLoadIndex(index)}>{item.label}</button>)}</div></div><div className="fm-chart-wrap"><div className="fm-half-label top">ครึ่งบน · +jX · เหนี่ยวนำ</div><SmithFigure points={[{ z: C(1, 0), label: 'MATCH', cls: 'in' }, { z, label: 'โหลด', cls: 'load' }]} curves={[{ zs: [C(1, 0), z], cls: 'y', dashed: true }]} swr={matched ? [] : [swr]} /><div className="fm-half-label bottom">ครึ่งล่าง · −jX · เก็บประจุ</div></div></div>}

    {step === 3 && <div className="fm-stage fm-two-column"><div><h4>งานของเราคือพาจุดไปกลางกราฟ</h4><p>จุดกลางหมายถึง z = 1 หรือ Z = 50 + j0 Ω สำหรับระบบนี้ ที่จุดนี้ Γ = 0, SWR = 1 และไม่มีคลื่นสะท้อน</p><div className="fm-rules"><div><b>จุด</b><span>แทนอิมพีแดนซ์หนึ่งค่า</span></div><div><b>ตำแหน่งบน–ล่าง</b><span>บอกลักษณะของส่วน j</span></div><div><b>ระยะจากกลาง</b><span>บอกระดับการสะท้อน</span></div></div><p>บทต่อไปจะค่อย ๆ เพิ่มเส้นตารางและสอนวิธีขยับจุดด้วยสายหรืออุปกรณ์ matching</p></div><SmithFigure points={[{ z: C(1, 0), label: 'เป้าหมาย: MATCH', cls: 'in' }, ...(!matched ? [{ z, label: 'จุดเริ่มของโหลด', cls: 'load' as const }] : [])]} curves={!matched ? [{ zs: [z, C(1, 0)], cls: 'mid', dashed: true }] : []} /></div>}

    <div className="fm-nav"><button type="button" disabled={step === 0} onClick={() => setStep(value => Math.max(0, value - 1))}>← ย้อนกลับ</button><span>ขั้น {step + 1} จาก 4</span><button type="button" disabled={step === 3} onClick={() => setStep(value => Math.min(3, value + 1))}>ถัดไป →</button></div>
  </div>;
};
