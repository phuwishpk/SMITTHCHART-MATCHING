import React from 'react';
import { t } from '../engine/i18n';
import { C, fmtNum } from '../engine/complex';
import { normalize, gammaFromz, swrFromGamma, rotateTowardGenerator, zFromGamma, denormalize } from '../engine/rf';
import { SmithFigure } from './SmithFigure';
import { Tex } from './Tex';

/**
 * ที่มาของ Smith Chart — ใครคิด คิดขึ้นมาแก้ปัญหาอะไร และทำไมยังใช้อยู่
 * ตัวเลขในภาพคำนวณจาก engine · ประวัติยึดข้อเท็จจริงที่ยืนยันได้ในเอกสารตีพิมพ์ ไม่ใส่สีสัน
 */
const Z0 = 50;
const ZL = C(25, 25);
const z = normalize(ZL, Z0);
const g = gammaFromz(z);
const D = 0.15;
const z2 = zFromGamma(rotateTowardGenerator(g, D));
const path = Array.from({ length: 49 }, (_, i) => zFromGamma(rotateTowardGenerator(g, (D * i) / 48)));
const fz = (v: { re: number; im: number }, d = 2) => `${fmtNum(v.re, d)} ${v.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(v.im), d)}`;

const TIMELINE: { year: string; text: string }[] = [
  { year: '1905', text: 'ฟิลลิป เฮการ์ สมิธ (Phillip Hagar Smith) เกิดที่เมืองเลกซิงตัน รัฐแมสซาชูเซตส์ สหรัฐอเมริกา' },
  { year: '1928', text: 'จบวิศวกรรมไฟฟ้าจาก Tufts College แล้วเข้าทำงานที่ Bell Telephone Laboratories ในกลุ่มงานสายอากาศและสายส่งสำหรับวิทยุ' },
  { year: '1936–37', text: 'ร่างกราฟรุ่นแรกไว้ใช้ในงานของตัวเอง เพราะเบื่อการคำนวณอิมพีแดนซ์บนสายซ้ำ ๆ ด้วยมือ' },
  { year: 'ม.ค. 1939', text: 'ตีพิมพ์บทความ "Transmission Line Calculator" ในนิตยสาร Electronics — กราฟวงกลมหน้าตาแบบที่ใช้กันทุกวันนี้' },
  { year: 'ม.ค. 1944', text: 'ฉบับปรับปรุง "An Improved Transmission Line Calculator" เพิ่มสเกลรอบนอกและแถบสเกลใต้กราฟ (SWR, return loss, …) ที่แอปนี้วาดไว้ให้' },
  { year: '1969', text: 'รวบรวมวิธีใช้ทั้งหมดเป็นหนังสือ Electronic Applications of the Smith Chart' },
  { year: '1987', text: 'ถึงแก่กรรม — แต่กราฟของเขายังอยู่บนหน้าจอเครื่องวัด VNA ทุกเครื่องจนถึงวันนี้' },
];

export const SmithOrigin: React.FC = () => <div className="reflection-intro origin-intro">
  <p className="ri-eyebrow">{t("ที่มา • Phillip H. Smith • Bell Telephone Laboratories")}</p>
  <h4>{t("กราฟใบนี้เกิดจากวิศวกรคนหนึ่งที่เบื่อการคำนวณซ้ำ ๆ")}</h4>
  <p>{t("ก่อนมี Smith Chart การหาว่าอิมพีแดนซ์ที่ต้นสายเป็นเท่าไร เมื่อรู้โหลดกับความยาวสาย ต้องแทนค่าลงสูตรนี้ทุกครั้ง")}</p>
  <Tex block tex={'Z_{in} = Z_0\\,\\frac{Z_L + jZ_0\\tan\\beta l}{Z_0 + jZ_L\\tan\\beta l}'} />
  <p>{t("เป็นจำนวนเชิงซ้อนซ้อนกันสองชั้น ยุคนั้นมีแต่สไลด์รูลกับตารางตัวเลข งานออกแบบสายอากาศชิ้นเดียวต้องคิดแบบนี้หลายสิบครั้ง ทุกครั้งที่ความยาวสายหรือความถี่เปลี่ยน — ช้า และผิดง่าย")}</p>

  <div className="ri-reading">
    <div>
      <h4>{t("สิ่งที่สมิธสังเกตเห็น")}</h4>
      <p>{t("ถ้าเลิกมองที่ Z แล้วไปมองที่สัมประสิทธิ์การสะท้อน Γ แทน จะเกิดของขวัญสองอย่างพร้อมกัน")}</p>
      <ol>
        <li>{t("ต่อสายเพิ่ม (สายไร้การสูญเสีย) = Γ แค่หมุนรอบจุดกลาง ขนาดไม่เปลี่ยนเลย · การคำนวณทั้งก้อนข้างบนกลายเป็นการหมุนเข็มทิศ")}</li>
        <li>{t("เส้น r คงที่และ x คงที่ของ Z เมื่อย้ายมาอยู่บนระนาบ Γ กลายเป็นวงกลมทั้งหมด · พิมพ์วงกลมชุดนี้ลงกระดาษครั้งเดียว ก็อ่าน Z ได้ทุกจุดโดยไม่ต้องคำนวณ")}</li>
      </ol>
      <Tex block tex={'\\Gamma = \\frac{z-1}{z+1}, \\qquad \\Gamma(l) = \\Gamma_L\\,e^{-j2\\beta l}'} />
      <p className="ri-small">{t("สองบรรทัดนี้คือทั้งหมดที่กราฟทำ: บรรทัดแรกคือวิธีวาดเส้นตาราง บรรทัดที่สองคือเหตุผลที่การเดินตามสายเป็นการหมุน")}</p>
    </div>
    <div>
      <SmithFigure points={[{ z, label: `z_L = ${fz(z, 1)}`, cls: 'load' }, { z: z2, label: `${t('หลังสาย')} ${fmtNum(D, 2)} λ`, cls: 'in' }]}
        curves={[{ zs: path, cls: 'net', arrow: true }]} swr={[swrFromGamma(g)]} />
      <p className="ri-small">{t("โจทย์เดียวกันบนกราฟ: โหลด")} {fz(ZL, 0)} Ω {t("ต่อสาย 50 Ω ยาว")} {fmtNum(D, 2)} λ · {t("แทนที่จะแทนค่าสูตร แค่หมุน")} {fmtNum(720 * D, 0)}° {t("แล้วอ่านได้")} {fz(denormalize(z2, Z0), 1)} Ω ({t("คำนวณโดยแอป")})</p>
    </div>
  </div>

  <h4>{t("ลำดับเหตุการณ์")}</h4>
  <ol className="origin-timeline">
    {TIMELINE.map((e) => <li key={e.year}><b>{e.year}</b><span>{e.text}</span></li>)}
  </ol>
  <p className="ri-small">{t("กราฟแบบเดียวกันถูกคิดขึ้นโดยอิสระในช่วงเวลาใกล้กันโดย Tosaku Mizuhashi ในญี่ปุ่น (1937) และ Amiel Volpert ในสหภาพโซเวียต (1939) บางตำราจึงเรียกว่า Smith–Mizuhashi–Volpert chart แต่ชื่อที่ใช้กันทั่วโลกคือชื่อของสมิธ เพราะเขาเผยแพร่วิธีใช้และปรับปรุงต่อเนื่องหลายสิบปี")}</p>

  <div className="ri-takeaway">
    <b>{t("ทำไมยุคคอมพิวเตอร์แล้วยังใช้กราฟกระดาษ")}</b>
    <p>{t("ไม่ใช่เพราะคำนวณเร็วกว่า แต่เพราะมองแล้วเห็นทันที: โหลดสะท้อนมากไหม (ระยะจากจุดกลาง) ต้องใส่ L หรือ C (อยู่ครึ่งบนหรือล่าง) และต้องเดินไปทางไหน (หมุน) · เครื่องวัด VNA ทุกเครื่องจึงยังแสดงผล S₁₁ บนกราฟใบนี้ และแอปทั้งแอปนี้ก็คือกราฟของสมิธที่คำนวณให้แทนวงเวียน")}</p>
  </div>
</div>;
