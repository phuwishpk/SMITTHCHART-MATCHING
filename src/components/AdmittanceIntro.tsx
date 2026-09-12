import React, { useState } from 'react';
import { t } from '../engine/i18n';
import { C, Complex, fmtNum } from '../engine/complex';
import { admittance, gammaFromz, lineInput, swrFromGamma } from '../engine/rf';
import { SmithFigure } from './SmithFigure';
import { Tex } from './Tex';

const show = (z: Complex) => `${fmtNum(z.re, 3)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), 3)}`;
const loads = [C(0.5, 0.5), C(0.5, -0.5), C(2, 0), C(1, 0)];

/** All chart positions use impedance coordinates; the mirror is explicitly a reading aid. */
export const AdmittanceIntro: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'overlay' | 'mirror' | 'line'>('overlay');
  const [distance, setDistance] = useState(0);
  const z = loads[index];
  const y = admittance(z);
  const moved = lineInput(z, 1, distance, 0);
  const swr = swrFromGamma(gammaFromz(z));
  const modes = [
    { id: 'overlay' as const, label: '① จุดเดิม · เปิดกริด Y' },
    { id: 'mirror' as const, label: '② กริด Z ใบเดียว · อ่านจุดตรงข้าม' },
    { id: 'line' as const, label: '③ ย้ายจุดวัดบนสายจริง' },
  ];
  return <div className="reflection-intro adm-intro">
    <p className="ri-eyebrow">{t("ภาพทดลอง • ใช้สายอ้างอิง 50 Ω")}</p>
    <h4>{t("โหลดเดิม อ่านได้สองภาษา: Z และ Y")}</h4>
    <p><b>Z = V/I</b> {t("บอกแรงดันต่อกระแส ส่วน")} <b>Y = I/V</b> {t("บอกกระแสต่อแรงดัน จึงเป็นส่วนกลับกัน การเปลี่ยนไปใช้ Y เป็นการอธิบายโหลดเดิมอีกแบบ อุปกรณ์ยังไม่ได้เปลี่ยน")}</p>
    <div className="adm-equivalents"><div><small>{t("ค่าจริง · มีหน่วย")}</small><b>Z = {show(C(z.re * 50, z.im * 50))} Ω</b><span>{t("กลับส่วนทั้งจำนวน ↓")}</span><b>Y = {show(C(y.re * 20, y.im * 20))} mS</b></div><div><small>{t("ค่าปกติ · ไม่มีหน่วย")}</small><b>z = {show(z)}</b><span>{t("กลับส่วนทั้งจำนวน ↓")}</span><b>y = {show(y)}</b></div></div>
    <p className="ri-small">{t("สำหรับสายนี้ Y₀ = 1/50 = 0.02 S = 20 mS · z = Z/50 Ω และ y = Y/20 mS · S อ่านว่า “ซีเมนส์” เป็นหน่วยของแอดมิตแตนซ์")}</p>
    <div className="ri-choices" role="group" aria-label={t("เลือกโหลดสำหรับแปลงแอดมิตแตนซ์")}>{loads.map((load, i) => <button key={i} type="button" aria-pressed={index === i} onClick={() => { setIndex(i); setDistance(0); }}>z = {show(load)}</button>)}</div>
    <p><b>{t("เลือกวิธี แล้วสังเกตว่าอะไรเปลี่ยน")}</b></p>
    <div className="ri-choices" role="group" aria-label={t("วิธีอ่านแอดมิตแตนซ์")}>{modes.map((item) => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>{item.label}</button>)}</div>
    <div className="ri-reading"><div>
      {mode === 'overlay' && <><h4>{t("จุดไม่ขยับ เปลี่ยนชุดเส้นที่อ่าน")}</h4><ol><li>{t("อ่านกริด Z ได้ r และ x")}</li><li>{t("เปิดกริด Y แล้วอ่าน g และ b ที่จุดเดิม")}</li><li>{t("ได้ y =")} {show(y)} {t("โดยไม่ได้ต่อสายหรืออุปกรณ์เพิ่ม")}</li></ol><p>{t("วง g และส่วนโค้ง b ที่เน้นไว้ผ่านจุดโหลดเดียวกัน แสดงว่า z กับ y อธิบายสภาพเดียวกัน ณ ตำแหน่งวัดเดียวกัน")}</p></>}
      {mode === 'mirror' && <><h4>{t("ย้ายตำแหน่งอ่านบนกระดาษ")}</h4><ol><li>{t("ใช้กริด Z เพียงชุดเดียว")}</li><li>{t("ลากเส้นผ่านศูนย์กลางไปอีกด้าน ให้ห่างศูนย์กลางเท่าเดิม")}</li><li>{t("อ่านตัวเลขที่จุด B แล้วเรียกตัวเลขนั้นว่า g และ b")}</li></ol><p>{t("ที่จุด B อ่านได้ y =")} {show(y)} {t("เส้นประเป็นเส้นช่วยอ่าน ไม่ใช่เส้นทางเพิ่มอุปกรณ์ และไม่ได้หมายความว่าโหลดถูกย้ายจริง")}</p></>}
      {mode === 'line' && <><h4>{t("คราวนี้เปลี่ยนตำแหน่งวัดจริง")}</h4><p>{t("เริ่มจากโหลด แล้วเดินไปทางเครื่องส่งบนสายไร้การสูญเสีย 50 Ω อ่านทั้ง z และ y ที่จุดใหม่")}</p><label className="lp-slider">{t("ระยะจากโหลด")} {fmtNum(distance, 3)} λ<input type="range" min="0" max="0.25" step="0.001" value={distance} onChange={(event) => setDistance(Number(event.target.value))} /></label><div className="ri-choices"><button type="button" onClick={() => setDistance(0)}>{t("กลับที่โหลด")}</button><button type="button" onClick={() => setDistance(0.25)}>{t("เดิน λ/4")}</button></div><p>{t("ที่ระยะ λ/4 ค่า z ของจุดใหม่เท่ากับ y ของโหลดเดิม")} <b>{t("ในเชิงตัวเลข")}</b> {t("แต่ค่าจริงของ Z หน่วย Ω ไม่ใช่ค่า Y หน่วย S")}</p></>}
      <div className="ri-takeaway" aria-live="polite"><b>{mode === 'line' ? `${t('จุดวัดใหม่')}: z = ${show(moved)}` : `${t('โหลดเดิม')}: y = ${show(y)}`}</b><p>{mode === 'line' ? `${t('แอดมิตแตนซ์ที่จุดใหม่ y =')} ${show(admittance(moved))}` : 'ตำแหน่งวัดและวงจรจริงยังเหมือนเดิม'}</p><p>SWR = {fmtNum(swr, 3)} · {index === 3 ? 'โหลดแมตช์อยู่ที่ศูนย์กลาง จึงไม่มีทิศหรือมุมให้สังเกต' : 'รัศมีเท่าเดิม ไม่ได้แมตช์ดีขึ้นเพียงเพราะเปลี่ยนวิธีอ่าน'}</p></div>
    </div><div><SmithFigure
      showY={mode === 'overlay'}
      points={mode === 'mirror' ? [{ z, label: 'A: โหลด', cls: 'load' }, { z: y, label: 'B: อ่านค่า y', cls: 'y' }] : mode === 'line' ? [{ z, label: 'โหลด', cls: 'load' }, { z: moved, label: 'จุดวัดใหม่', cls: 'in' }] : [{ z, label: 'จุดเดิม: อ่าน z / y', cls: 'load' }]}
      curves={mode === 'mirror' ? [{ zs: [z, C(1, 0), y], cls: 'mid', dashed: true }] : mode === 'line' ? [{ zs: Array.from({ length: 65 }, (_, i) => lineInput(z, 1, distance * i / 64, 0)), cls: 'net', arrow: distance > 0 }] : []}
      swr={swr > 1.000001 ? [swr] : []}
      rCircles={mode === 'mirror' ? [y.re] : mode === 'overlay' ? [z.re] : []}
      xCircles={mode === 'mirror' ? [y.im] : mode === 'overlay' ? [z.im] : []}
      gCircles={mode === 'overlay' ? [y.re] : []} bCircles={mode === 'overlay' ? [y.im] : []}
    /><p className="ri-small">{t("แดง = โหลดเดิม • เขียวอมฟ้า = จุดช่วยอ่าน y • เขียว = จุดวัดใหม่")}<br />{t("กราฟทั้งสามใช้ตำแหน่งจากระนาบ Γ แบบอิมพีแดนซ์เดียวกัน")}</p></div></div>
    <details className="ri-formulas"><summary>{t("ทำไมตำแหน่งช่วยอ่านจึงอยู่ตรงข้าม 180°?")}</summary><p>{t("ให้ F เป็นสูตรแปลงตัวเลขไปเป็นตำแหน่งบนกริด Z เมื่อนำ y = 1/z ไปใส่สูตรเดียวกัน จะได้ตำแหน่งตรงข้าม")}</p><Tex block tex={'F(z)=\\frac{z-1}{z+1}, \\quad F(1/z)=\\frac{1-z}{1+z}=-F(z)'} /><p>{t("เครื่องหมายลบกลับทั้งแกนนอนและแกนตั้ง จึงหมุน 180° รอบศูนย์กลาง ต่างจากคอนจูเกตที่สะท้อนข้ามแกนนอนอย่างเดียว")}</p><Tex block tex={'\\Gamma=\\frac{z-1}{z+1}=\\frac{1-y}{1+y}'} /><p>{t("แต่ถ้าคิด Γ ของโหลดจริงจาก y ต้องใช้ (1−y)/(1+y) จึงได้จุดเดิม นี่คือเหตุผลที่การเปิดกริด Y ไม่ย้าย marker")}</p></details>
  </div>;
};

export const ShuntAdmittanceIntro: React.FC = () => {
  const [b, setB] = useState(0);
  const z = C(0.5, 0.5), y = admittance(z);
  const total = C(y.re, y.im + b), result = admittance(total);
  return <div className="reflection-intro">
    <p className="ri-eyebrow">{t("ใช้ Y เพื่อออกแบบจริง • โหลด 25 + j25 Ω บนระบบ 50 Ω ที่ 100 MHz")}</p>
    <h4>{t("ต่อขนานแล้วบวก Y: หักล้าง −j1 ด้วย +j1")}</h4>
    <div className="adm-parallel" aria-label={t("โหลดกับตัวเก็บประจุต่อขนานกันที่ขั้วเดียวกัน")}><b>{t("ขั้วเข้าสาย 50 Ω")}</b><div><span>{t("แขนงโหลด")}<br /><strong>y = 1 − j1</strong></span><span>{t("แขนง C ขนาน")}<br /><strong>{t("y เพิ่ม = +j")}{fmtNum(b, 2)}</strong></span></div><b>{t("ขั้วกลับร่วมกัน")}</b></div>
    <p>{t("ทั้งสองแขนงมีแรงดันเท่ากัน กระแสรวมจึงเป็นผลบวก: I รวม = V·Y โหลด + V·Y ของ C นั่นทำให้")} <b>{t("Y รวม = Y โหลด + Y ของ C")}</b> {t("โดยตรง")}</p>
    <label className="lp-slider">{t("เพิ่ม susceptance ปกติของ C: b =")} {fmtNum(b, 2)}<input type="range" min="0" max="2" step="0.01" value={b} onChange={(event) => setB(Number(event.target.value))} /></label>
    <div className="ri-choices"><button type="button" onClick={() => setB(0)}>{t("ยังไม่ใส่ C")}</button><button type="button" onClick={() => setB(1)}>{t("ใส่ +j1 พอดี")}</button><button type="button" onClick={() => setB(2)}>{t("ใส่มากเกินไป")}</button></div>
    <div className="ri-reading"><div aria-live="polite"><h4>{t("y รวม =")} {show(total)}</h4><p>{t("g = 1 คงเดิม ส่วน b เปลี่ยนจาก −1 ไปหา 0")}</p><p>{t("กลับเป็น z =")} {show(result)}<br /><b>SWR = {fmtNum(swrFromGamma(gammaFromz(result)), 3)}</b></p><p>C ≈ {fmtNum(b / (50 * 2 * Math.PI * 100e6) * 1e12, 2)} {t("pF ที่ 100 MHz (อุปกรณ์อุดมคติ)")}</p><p>{b === 1 ? 'ตอนนี้ y = 1 + j0 และ z = 1 + j0 แมตช์พอดี' : b < 1 ? 'ยังชดเชยไม่ครบ ลองเพิ่ม C จน b รวมเป็นศูนย์' : 'ชดเชยเกินแล้ว จุดผ่านศูนย์กลางออกไปอีกด้าน ลด C เพื่อกลับมาแมตช์'}</p></div><SmithFigure showY gCircles={[1]} points={[{ z, label: 'ก่อนใส่ C', cls: 'load' }, { z: result, label: 'หลังใส่ C', cls: 'in' }]} curves={[{ zs: Array.from({ length: 51 }, (_, i) => admittance(C(1, -1 + b * i / 50))), cls: 'y', arrow: b > 0 }]} /></div>
    <p className="ri-small">{t("เส้นทางนี้คือวง g คงที่ เนื่องจากเพิ่มอุปกรณ์รีแอกทีฟขนานจริง ต่างจากการหมุน 180° เพื่ออ่านค่า ซึ่งไม่ได้เปลี่ยนวงจร")}</p>
  </div>;
};
