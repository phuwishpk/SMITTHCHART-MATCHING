import React, { useState } from 'react';
import { C, abs, arg, deg, fmtNum } from '../engine/complex';
import { gammaFromZ, swrFromGamma } from '../engine/rf';
import { WaveFigure } from './WaveFigure';
import { Tex } from './Tex';

const examples = [
  { label: '50 Ω · แมตช์', z: C(50, 0), name: '50 Ω', note: 'โหลดเท่ากับค่าอ้างอิงของสาย คลื่นจึงไม่สะท้อนที่รอยต่อ' },
  { label: '100 Ω · ไม่แมตช์', z: C(100, 0), name: '100 Ω', note: 'แม้เป็นตัวต้านทานล้วน ก็สะท้อนได้เมื่อค่าไม่เท่ากับสาย 50 Ω' },
  { label: '100 + j50 Ω · ตัวอย่างในบท', z: C(100, 50), name: '100 + j50 Ω', note: 'โหลดมีทั้งส่วนต้านทานและส่วนเหนี่ยวนำ ตัว j บอกส่วนที่เกี่ยวกับการเหลื่อมเฟส ยังไม่ต้องคำนวณส่วนนี้ก็อ่านภาพได้' },
];

export const ReflectionIntro: React.FC = () => {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  const gamma = gammaFromZ(example.z, 50);
  const magnitude = abs(gamma);
  const reflected = magnitude ** 2 * 100;
  const swr = swrFromGamma(gamma);
  return <div className="reflection-intro">
    <p className="ri-eyebrow">เริ่มจากภาพนี้ • ยังไม่ต้องจำสูตร</p>
    <h4>ส่งพลังงานไปถึงโหลด แล้วมีอะไรย้อนกลับมา?</h4>
    <p>เครื่องส่งสร้างสัญญาณ สายส่งพาสัญญาณไปยังปลายทาง ส่วน <b>โหลด</b> คืออุปกรณ์ที่ปลายสาย เช่น เสาอากาศหรือตัวต้านทาน</p>
    <div className="ri-system" aria-label="เครื่องส่ง ส่งสัญญาณผ่านสาย 50 โอห์มไปยังโหลด">
      <div className="ri-device"><span aria-hidden="true">∿</span><b>เครื่องส่ง</b><small>ต้นทางของสัญญาณ</small></div>
      <div className="ri-cable"><b>สายส่ง 50 Ω</b><div className="ri-forward">คลื่นเดินหน้า →</div><div className={magnitude ? 'ri-back' : 'ri-back ri-zero'}>{magnitude ? '← คลื่นสะท้อน' : 'ไม่มีคลื่นสะท้อน'}</div><small>50 Ω เป็นคุณสมบัติของสาย<br />ไม่ใช่ค่าความต้านทานลวดที่วัดด้วยโอห์มมิเตอร์</small></div>
      <div className="ri-device ri-load"><span aria-hidden="true">▤</span><b>โหลด</b><strong>{example.name}</strong><small>ปลายทางของสัญญาณ</small></div>
    </div>
    <p><b>ลองเปลี่ยนเฉพาะโหลด</b> โดยใช้สาย 50 Ω เส้นเดิม แล้วดูว่าพลังงานสะท้อนเปลี่ยนอย่างไร</p>
    <div className="ri-choices" role="group" aria-label="เลือกโหลดเพื่อเปรียบเทียบการสะท้อน">
      {examples.map((item, i) => <button key={item.name} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)}>{item.label}</button>)}
    </div>
    <div className="ri-result" aria-live="polite">
      <p>{example.note}</p>
      <div className="ri-metrics"><div><small>สมมติพลังงานคลื่นเดินหน้า 100 ส่วน</small><b>{fmtNum(100 - reflected, 1)} ส่วนเข้าสู่โหลด</b></div><div><small>พลังงานที่สะท้อนกลับ</small><b>{fmtNum(reflected, 1)} ส่วน</b></div><div><small>SWR · อัตราส่วนยอดต่อท้อง</small><b>{fmtNum(swr, 2)} {selected === 0 ? '→ แมตช์' : '→ ยังไม่แมตช์'}</b></div></div>
      <div className="ri-power" aria-hidden="true"><span style={{ width: `${100 - reflected}%` }} /><i style={{ width: `${reflected}%` }} /></div>
      <p className="ri-small">สีเขียว = เข้าสู่โหลด • สีส้ม = สะท้อนกลับ · คิดที่รอยต่อสายกับโหลด บนสายไร้การสูญเสีย การเข้าสู่โหลดไม่ได้แปลว่าทั้งหมดถูกแผ่ออกเป็นคลื่นวิทยุ</p>
    </div>
    <div className="ri-reading"><div><h4>แล้วกราฟคลื่นนิ่งบอกอะไร?</h4><p>คลื่นเดินหน้าและคลื่นสะท้อนรวมกัน ทำให้บางตำแหน่งมีแอมพลิจูดมาก บางตำแหน่งมีแอมพลิจูดน้อย</p><p><b>แกนนอนคือจุดต่าง ๆ บนสาย ไม่ใช่เวลา</b> เส้นน้ำเงินคือขนาดแรงดัน ส่วนเส้นประคือขนาดกระแสที่ปรับสเกลแล้ว จึงไม่ใช่การเทียบโวลต์กับแอมป์โดยตรง</p><p>เมื่อแมตช์ เส้นราบหมายถึงขนาดเท่ากันตลอดสาย สัญญาณยังเดินทางและยังสั่นตามเวลาอยู่</p></div><div><WaveFigure gammaMag={magnitude} gammaDeg={deg(arg(gamma))} len={0.5} /><p className="ri-small">ยอดถึงท้องที่ติดกันห่าง λ/4 · ยอดถึงยอดถัดไปห่าง λ/2 โดย λ คือความยาวคลื่นในสาย</p></div></div>
    <details className="ri-formulas"><summary>เข้าใจภาพแล้ว: เปิดดูสัญลักษณ์และสูตรของตัวอย่างที่เลือก</summary><p>Z₀ คืออิมพีแดนซ์คุณลักษณะของสาย ส่วน ZL คืออิมพีแดนซ์ของโหลด (หน่วย Ω) ซึ่งบอกความสัมพันธ์ระหว่างแรงดันกับกระแส ทั้งขนาดและเฟส</p><Tex block tex={'\\Gamma = \\frac{Z_L-Z_0}{Z_L+Z_0}, \\qquad SWR=\\frac{1+|\\Gamma|}{1-|\\Gamma|}'} /><p>|Γ| = {fmtNum(magnitude, 3)} เป็นอัตราส่วนแอมพลิจูดแรงดันสะท้อนต่อแรงดันเดินหน้า ส่วนสัดส่วนกำลังสะท้อนคือ |Γ|² = {fmtNum(reflected, 1)}% จึงเป็นคนละค่ากัน</p></details>
    <div className="ri-takeaway"><b>Smith Chart เข้ามาช่วยตรงนี้</b><p>เรานำอิมพีแดนซ์มาแทนด้วยจุดบนกราฟ แล้วดูว่าจุดนั้นห่างจากจุดแมตช์แค่ไหน เมื่อเปลี่ยนตำแหน่งวัดหรือเพิ่มวงจร matching จุดจะเคลื่อนไปตามกฎที่เรียนต่อไป เป้าหมายคือแมตช์ที่จุดต่อด้านแหล่งจ่าย ไม่ได้ทำให้คลื่นนิ่งทุกช่วงของวงจรหายไปเสมอ</p></div>
  </div>;
};
