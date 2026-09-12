import React from 'react';
import { fmtNum } from '../engine/complex';
import { t } from '../engine/i18n';
import { Tex } from './Tex';

/** distance is the magnitude travelled in wavelengths, not the WTG reading. */
export const BetaLengthExplanation: React.FC<{ distance: number; towardGenerator: boolean }> = ({ distance, towardGenerator }) => {
  const n = (value: number, digits = 3) => fmtNum(value, digits);
  return <section className="beta-explanation" aria-label={t('อธิบาย βl และ 2βl ทีละขั้น')}>
    <h4>{t('βl อ่านว่า “เบตาแอล” — คือมุมเฟส ไม่ใช่ความยาวเป็นเมตร')}</h4>
    <p>{t('สัญลักษณ์นี้เป็นการคูณ β × l ตัว β คืออักษรกรีกเบตา ส่วน l คือแอลตัวเล็ก ในภาพนี้ l หมายถึงระยะที่เดินจากจุดเริ่ม ไม่ใช่ตำแหน่งปัจจุบันจากโหลด และไม่ใช่ตัวเลขบนสเกล Toward Generator')}</p>
    <dl className="beta-definitions">
      <div><dt>β</dt><dd><b>{t('มุมต่อหนึ่งเมตร')}</b><span>{t('ค่าคงที่เฟส: คลื่นเปลี่ยนเฟสกี่เรเดียนเมื่อเดินทางหนึ่งเมตร หน่วย rad/m')}</span></dd></div>
      <div><dt>l</dt><dd><b>{t('ระยะที่เดินบนสาย')}</b><span>{t('ความยาวจริง มีหน่วยเมตร หากโจทย์บอก 0.125λ ให้ใช้สัดส่วน l/λ = 0.125 ได้เลย')}</span></dd></div>
      <div><dt>βl</dt><dd><b>{t('มุมเฟสรวมของระยะนั้น')}</b><span>{t('มุมต่อเมตร × จำนวนเมตร = มุม หน่วย rad หรือแปลงเป็นองศาได้')}</span></dd></div>
    </dl>
    <div className="beta-two-column"><div>
      <h5>{t('1. จากระยะ → มุมของคลื่นหนึ่งขา')}</h5>
      <p>{t('หนึ่งความยาวคลื่นคือหนึ่งรอบเฟส เท่ากับ 2π เรเดียนหรือ 360° จึงนำหนึ่งรอบไปหารด้วย λ เพื่อหามุมต่อเมตร แล้วคูณด้วยระยะ l')}</p>
      <Tex block tex={'\\beta=\\frac{2\\pi}{\\lambda},\\qquad \\beta l=2\\pi\\frac{l}{\\lambda}'} />
      <div className="beta-worked"><small>{t('แทนระยะที่เลือกอยู่ตอนนี้')}</small><b>l/λ = {n(distance)}</b><span>βl = 2π × {n(distance)} ≈ {n(2 * Math.PI * distance, 4)} rad</span><strong>βl = 360° × {n(distance)} = {n(360 * distance, 2)}°</strong></div>
    </div><div>
      <h5>{t('2. จากมุมของคลื่น → มุมบน Smith Chart')}</h5>
      <p>{t('กราฟพล็อต Γ ซึ่งเป็นอัตราส่วนคลื่นสะท้อนต่อคลื่นเดินหน้า เมื่อเลื่อนจุดวัด เฟสของคลื่นสองขาเปลี่ยนคนละทิศ มุมของอัตราส่วนจึงเปลี่ยนเป็นสองเท่า')}</p>
      <Tex block tex={'\\Gamma_{\\mathrm{end}}=\\Gamma_{\\mathrm{start}}e^{-j2\\beta l}'} />
      <p className="ri-small">{t('สูตรเครื่องหมายลบนี้ใช้เมื่อเดินไปทางเครื่องส่ง หากเดินกลับทางโหลดให้เปลี่ยนเป็นเครื่องหมายบวก')}</p>
      <div className="beta-worked chart"><small>{t('ขนาดมุมที่จุดหมุนจากจุดเริ่ม')}</small><strong>2βl = 2 × {n(360 * distance, 2)}° = {n(720 * distance, 2)}°</strong><span>{t('ทิศหมุน:')} {towardGenerator ? t('ไปทางเครื่องส่ง ↻ ตามเข็ม') : t('กลับทางโหลด ↺ ทวนเข็ม')}</span><span>{t('มุมทั้งสองช่องแสดงขนาดเป็นบวก ส่วนปุ่มทิศทางเป็นตัวกำหนดว่าจะหมุนไปด้านใด')}</span></div>
    </div></div>
    <div className="beta-example-table"><table><caption>{t('ลองกดระยะด้านบน แล้วเทียบมุมทั้งสองคอลัมน์')}</caption><thead><tr><th>l/λ</th><th>{t('เฟสหนึ่งขา βl')}</th><th>{t('มุมบนกราฟ 2βl')}</th></tr></thead><tbody>{[0, 0.1, 0.125, 0.25, 0.5].map(value => <tr key={value} className={Math.abs(distance - value) < 1e-8 ? 'selected' : undefined}><td>{value}</td><td>{360 * value}°</td><td>{720 * value}°</td></tr>)}</tbody></table></div>
    <p className="ri-takeaway">{t('จุดจำสำคัญ: สาย λ/4 มี βl = 90° แต่หมุนจุดบนกราฟ 180° ส่วนสาย λ/2 มี βl = 180° แต่หมุนกราฟ 360° กลับมาที่เดิม การกลับจุดเดิมบนสายไร้การสูญเสียไม่ได้แปลว่าเกิดการแมตช์ใหม่')}</p>
    <details className="ri-formulas"><summary>{t('ดูตัวอย่างเป็นเมตร วิธีใช้เครื่องคิดเลข และสัญลักษณ์ที่สับสนบ่อย')}</summary>
      <p>{t('สมมติความยาวคลื่นในสาย λ = 2 m และเดิน l = 0.25 m จะได้ β = 2π/2 = π rad/m เมื่อนำมาคูณกัน βl = π × 0.25 = π/4 rad = 45° ส่วนจุดบน Smith Chart หมุน 90° ตัวอย่างนี้ตั้ง λ ขึ้นเพื่อสอนเรื่องหน่วย ไม่ใช่การกำหนดความถี่ให้ตัวเลื่อนด้านบน')}</p>
      <Tex block tex={'\\underbrace{\\pi\\;\\mathrm{rad/m}}_{\\beta}\\times\\underbrace{0.25\\;\\mathrm m}_{l}=\\frac{\\pi}{4}\\;\\mathrm{rad}=45^\\circ'} />
      <p>{t('ถ้าใช้ 2πl/λ ผลเป็นเรเดียน ให้ตั้งเครื่องคิดเลขเป็น RAD ก่อนนำเข้า sin, cos หรือ tan ถ้าใช้ 360° × l/λ ผลเป็นองศา ให้ตั้ง DEG ทั้งสองวิธีให้ผลเดียวกันเมื่อใช้หน่วยถูกต้อง เช่น tan(π/4) ใน RAD เท่ากับ tan(45°) ใน DEG')}</p>
      <p>{t('ในสูตรสตับ Z_in = jZ₀ tan(βl) ให้ใช้มุมหนึ่งขา βl ส่วนสูตรการหมุน Γ ใช้ 2βl อย่าแทนมุมบนกราฟลงในสูตร tan ของสตับ')}</p>
      <p>{t('λ ต้องเป็นความยาวคลื่นในสายที่ความถี่นั้น: λ = v_p/f และ βl = 2πfl/v_p หากสายมี VF ให้ใช้ v_p = VF × c เมื่อความถี่เพิ่มแต่ l และ v_p คงเดิม βl จะเพิ่มตามความถี่ด้วย')}</p>
      <p>{t('βl ไม่ใช่ b_L: βl คือเบตาคูณระยะ เป็นมุม ส่วน b_L คือส่วนจินตภาพของแอดมิตแตนซ์ปกติของโหลดใน y_L = g_L + jb_L และไม่ใช่ L ตัวใหญ่ที่แทนความเหนี่ยวนำ')}</p>
      <p>{t('ตัวอย่างนี้รู้ระยะเป็นสัดส่วนของ λ จึงหามุมได้ทันที แต่ยังระบุ β เป็น rad/m หรือ l เป็นเมตรไม่ได้ จนกว่าจะรู้ λ หรือความถี่และความเร็วคลื่นในสาย')}</p>
    </details>
  </section>;
};
