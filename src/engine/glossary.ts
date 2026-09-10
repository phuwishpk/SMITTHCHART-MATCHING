// ---------------------------------------------------------------
// Glossary: every symbol / abbreviation the app shows, with a Thai
// explanation, its unit, the formula behind it and where the course
// explains it. Used by the glossary dialog and by tooltips.
// ---------------------------------------------------------------
import type { SectionLink } from './course';

export type GlossaryGroup = 'basic' | 'norm' | 'smith' | 'line' | 'match' | 'unit' | 'ui';

export interface GlossaryEntry {
  id: string;
  /** plain-text symbol shown in the list (matches what the UI prints) */
  sym: string;
  /** KaTeX version of the symbol, when it differs */
  tex?: string;
  name: string;
  nameTh: string;
  unit?: string;
  /** one line, used for tooltips */
  short: string;
  /** extra lines shown in the dialog */
  detail?: string[];
  formula?: string;
  group: GlossaryGroup;
  link?: SectionLink;
  aliases?: string[];
}

export const GROUP_LABEL: Record<GlossaryGroup, string> = {
  basic: 'อิมพีแดนซ์และแอดมิตแตนซ์ (ค่าจริง)',
  norm: 'ค่าปกติ (normalized) ที่ใช้บน Smith Chart',
  smith: 'การสะท้อนและ Smith Chart',
  line: 'สายส่งและสตับ',
  match: 'วงจร matching',
  unit: 'หน่วยและตัวคูณ',
  ui: 'สัญลักษณ์บนหน้าจอของเว็บนี้',
};

const L = (chapter: string, section: string): SectionLink => ({ chapter, section });

export const GLOSSARY: GlossaryEntry[] = [
  // ---------------- basic ----------------
  { id: 'Z', sym: 'Z', name: 'Impedance', nameTh: 'อิมพีแดนซ์', unit: 'Ω', group: 'basic', link: L('ch3', 'norm'),
    short: 'อิมพีแดนซ์เชิงซ้อน Z = R + jX ความต้านทานรวมของวงจรต่อสัญญาณ AC',
    formula: 'Z = R + jX', detail: ['ส่วนจริง R คือส่วนที่กินกำลังจริง ส่วนจินตภาพ X คือส่วนที่เก็บ/คายพลังงาน', 'หน่วยเป็นโอห์ม (Ω)'] },
  { id: 'R', sym: 'R', name: 'Resistance', nameTh: 'ความต้านทาน', unit: 'Ω', group: 'basic', link: L('ch3', 'norm'),
    short: 'ส่วนจริงของอิมพีแดนซ์ ไม่ขึ้นกับความถี่', formula: 'R = \\mathrm{Re}\\{Z\\}' },
  { id: 'X', sym: 'X', name: 'Reactance', nameTh: 'รีแอกแตนซ์', unit: 'Ω', group: 'basic', link: L('ch3', 'norm'),
    short: 'ส่วนจินตภาพของอิมพีแดนซ์ บวก = inductive ลบ = capacitive', formula: 'X = \\mathrm{Im}\\{Z\\}' },
  { id: 'XL', sym: 'X_L', tex: 'X_L', name: 'Inductive reactance', nameTh: 'รีแอกแตนซ์ของตัวเหนี่ยวนำ', unit: 'Ω', group: 'basic', link: L('ch1', 'wave'),
    short: 'รีแอกแตนซ์ของตัวเหนี่ยวนำ เป็นบวกและโตตามความถี่', formula: 'X_L = 2\\pi f L = \\omega L', aliases: ['XL', 'inductive'] },
  { id: 'XC', sym: 'X_C', tex: 'X_C', name: 'Capacitive reactance', nameTh: 'รีแอกแตนซ์ของตัวเก็บประจุ', unit: 'Ω', group: 'basic', link: L('ch1', 'wave'),
    short: 'รีแอกแตนซ์ของตัวเก็บประจุ เป็นลบและขนาดลดลงเมื่อความถี่สูงขึ้น', formula: 'X_C = -\\frac{1}{2\\pi f C}', aliases: ['XC', 'capacitive'] },
  { id: 'ZL', sym: 'Z_L', tex: 'Z_L', name: 'Load impedance', nameTh: 'อิมพีแดนซ์ของโหลด', unit: 'Ω', group: 'basic', link: L('ch2', 'curve'),
    short: 'อิมพีแดนซ์ของโหลด (เช่น สายอากาศ) ที่ปลายสาย', detail: ['ในเว็บนี้คือค่าที่ได้จากกลุ่มอุปกรณ์ท้ายวงจร แสดงเป็นจุดสีแดงบน Smith Chart'] },
  { id: 'Zin', sym: 'Z_in', tex: 'Z_{in}', name: 'Input impedance', nameTh: 'อิมพีแดนซ์ขาเข้า', unit: 'Ω', group: 'basic', link: L('ch3', 'rotate'),
    short: 'อิมพีแดนซ์ที่แหล่งจ่ายมองเห็น หลังผ่าน matching network และสายส่งแล้ว', detail: ['แสดงเป็นจุดสีเขียวบน Smith Chart', 'ถ้า Z_in = Z₀ แปลว่า matched'] },
  { id: 'ZS', sym: 'Z_S', tex: 'Z_S', name: 'Source impedance', nameTh: 'อิมพีแดนซ์ของแหล่งจ่าย', unit: 'Ω', group: 'basic',
    short: 'อิมพีแดนซ์ภายในของแหล่งจ่าย ในเว็บนี้ตั้งให้เท่ากับ Z₀', detail: ['โจทย์ที่แหล่งจ่ายไม่ใช่ 50 Ω (เช่น 25 Ω) ให้ตั้ง Z₀ = Z_S แล้วศูนย์กลางกราฟจะเป็นจุด conjugate match'] },
  { id: 'Z0', sym: 'Z₀', tex: 'Z_0', name: 'Characteristic impedance', nameTh: 'อิมพีแดนซ์คุณลักษณะ / อิมพีแดนซ์อ้างอิง', unit: 'Ω', group: 'basic', link: L('ch1', 'lumped'),
    short: 'อิมพีแดนซ์ของระบบหรือของสายส่ง ใช้เป็นตัวหารในการ normalize (ศูนย์กลาง Smith Chart)',
    formula: 'Z_0 = \\sqrt{\\frac{L}{C}}\\quad(\\text{สายไร้การสูญเสีย})', aliases: ['Z0', 'characteristic'] },
  { id: 'Y', sym: 'Y', name: 'Admittance', nameTh: 'แอดมิตแตนซ์', unit: 'S', group: 'basic', link: L('ch3', 'admit'),
    short: 'ส่วนกลับของอิมพีแดนซ์ Y = 1/Z = G + jB ใช้กับอุปกรณ์ที่ต่อขนาน', formula: 'Y = \\frac{1}{Z} = G + jB' },
  { id: 'G', sym: 'G', name: 'Conductance', nameTh: 'ความนำ', unit: 'S', group: 'basic', link: L('ch3', 'admit'),
    short: 'ส่วนจริงของแอดมิตแตนซ์', formula: 'G = \\mathrm{Re}\\{Y\\}' },
  { id: 'B', sym: 'B', name: 'Susceptance', nameTh: 'ซัสเซปแตนซ์', unit: 'S', group: 'basic', link: L('ch3', 'admit'),
    short: 'ส่วนจินตภาพของแอดมิตแตนซ์ บวก = capacitive ลบ = inductive (กลับกันกับ X)', formula: 'B = \\mathrm{Im}\\{Y\\}' },
  { id: 'f', sym: 'f', name: 'Frequency', nameTh: 'ความถี่', unit: 'Hz', group: 'basic',
    short: 'ความถี่ของสัญญาณ เปลี่ยนแล้ว X_L, X_C และความยาวไฟฟ้าของสายเปลี่ยนตาม' },
  { id: 'omega', sym: 'ω', tex: '\\omega', name: 'Angular frequency', nameTh: 'ความถี่เชิงมุม', unit: 'rad/s', group: 'basic',
    short: 'ความถี่เชิงมุม ใช้ย่อ 2πf ในสูตร', formula: '\\omega = 2\\pi f' },
  { id: 'Lind', sym: 'L', name: 'Inductance', nameTh: 'ความเหนี่ยวนำ', unit: 'H', group: 'basic',
    short: 'ค่าความเหนี่ยวนำของตัวเหนี่ยวนำ ในเว็บนี้กรอกเป็น nH', formula: 'X_L = 2\\pi f L' },
  { id: 'Ccap', sym: 'C', name: 'Capacitance', nameTh: 'ความจุ', unit: 'F', group: 'basic',
    short: 'ค่าความจุของตัวเก็บประจุ ในเว็บนี้กรอกเป็น pF', formula: 'X_C = -\\frac{1}{2\\pi f C}' },
  { id: 'Q', sym: 'Q', name: 'Quality factor', nameTh: 'ตัวประกอบคุณภาพ', group: 'match', link: L('ch4', 'lnet'),
    short: 'อัตราส่วนพลังงานสะสมต่อพลังงานที่สูญเสียต่อรอบ ใน L-network ใช้กำหนด bandwidth',
    formula: 'Q = \\sqrt{\\frac{R_{\\text{สูง}}}{R_{\\text{ต่ำ}}} - 1}', detail: ['Q สูง = แถบความถี่แคบ (matching ไวต่อความถี่มากขึ้น)'] },

  // ---------------- normalized ----------------
  { id: 'z', sym: 'z', name: 'Normalized impedance', nameTh: 'อิมพีแดนซ์ปกติ', group: 'norm', link: L('ch3', 'norm'),
    short: 'อิมพีแดนซ์หารด้วย Z₀ เป็นค่าที่ใช้พล็อตบน Smith Chart', formula: 'z = \\frac{Z}{Z_0} = r + jx',
    detail: ['ศูนย์กลางกราฟคือ z = 1 (matched) ซ้ายสุด z = 0 (short) ขวาสุด z = ∞ (open)'] },
  { id: 'r', sym: 'r', name: 'Normalized resistance', nameTh: 'ความต้านทานปกติ', group: 'norm', link: L('ch3', 'norm'),
    short: 'ส่วนจริงของ z บอกว่าจุดอยู่บนวงกลม r คงที่วงไหน', formula: 'r = \\frac{R}{Z_0}' },
  { id: 'x', sym: 'x', name: 'Normalized reactance', nameTh: 'รีแอกแตนซ์ปกติ', group: 'norm', link: L('ch3', 'norm'),
    short: 'ส่วนจินตภาพของ z บวกอยู่ครึ่งบน ลบอยู่ครึ่งล่างของกราฟ', formula: 'x = \\frac{X}{Z_0}' },
  { id: 'y', sym: 'y', name: 'Normalized admittance', nameTh: 'แอดมิตแตนซ์ปกติ', group: 'norm', link: L('ch3', 'admit'),
    short: 'ส่วนกลับของ z ใช้เมื่อมีอุปกรณ์ต่อขนาน อยู่ตรงข้ามจุด z ผ่านศูนย์กลาง', formula: 'y = \\frac{1}{z} = g + jb' },
  { id: 'g', sym: 'g', name: 'Normalized conductance', nameTh: 'ความนำปกติ', group: 'norm', link: L('ch3', 'admit'),
    short: 'ส่วนจริงของ y · การ matching ด้วยสตับต้องพาจุดไปที่วงกลม g = 1 ก่อน', formula: 'g = G\\,Z_0' },
  { id: 'b', sym: 'b', name: 'Normalized susceptance', nameTh: 'ซัสเซปแตนซ์ปกติ', group: 'norm', link: L('ch3', 'admit'),
    short: 'ส่วนจินตภาพของ y · สตับหรือ L/C ขนานใช้หักล้างค่านี้ให้เป็นศูนย์', formula: 'b = B\\,Z_0' },

  // ---------------- smith / reflection ----------------
  { id: 'Gamma', sym: 'Γ', tex: '\\Gamma', name: 'Reflection coefficient', nameTh: 'สัมประสิทธิ์การสะท้อน', group: 'smith', link: L('ch1', 'gamma'),
    short: 'อัตราส่วนคลื่นสะท้อนต่อคลื่นตกกระทบ เป็นจำนวนเชิงซ้อน ตำแหน่งบน Smith Chart คือค่านี้',
    formula: '\\Gamma = \\frac{E^-}{E^+} = \\frac{Z_L - Z_0}{Z_L + Z_0}', aliases: ['gamma', 'reflection'],
    detail: ['|Γ| = 0 คือ matched (ศูนย์กลาง) · |Γ| = 1 คือสะท้อนกลับหมด (ขอบกราฟ)'] },
  { id: 'absGamma', sym: '|Γ|', tex: '|\\Gamma|', name: 'Reflection magnitude', nameTh: 'ขนาดของสัมประสิทธิ์การสะท้อน', group: 'smith', link: L('ch1', 'gamma'),
    short: 'ขนาดของ Γ = รัศมีของจุดบน Smith Chart (0 ที่ศูนย์กลาง ถึง 1 ที่ขอบ)', formula: '|\\Gamma| = \\frac{SWR - 1}{SWR + 1}' },
  { id: 'angGamma', sym: '∠Γ', tex: '\\angle\\Gamma', name: 'Angle of reflection coefficient', nameTh: 'มุมของสัมประสิทธิ์การสะท้อน', unit: '°', group: 'smith', link: L('ch1', 'gamma'),
    short: 'มุมของ Γ อ่านได้จากสเกลวงในสุดรอบกราฟ (−180° ถึง +180°)' },
  { id: 'SWR', sym: 'SWR', name: 'Standing wave ratio', nameTh: 'อัตราส่วนคลื่นนิ่ง', group: 'smith', link: L('ch1', 'gamma'),
    short: 'อัตราส่วนแรงดันสูงสุดต่อต่ำสุดบนสาย ค่า 1 คือ matched สมบูรณ์',
    formula: 'SWR = \\frac{E_{max}}{E_{min}} = \\frac{1 + |\\Gamma|}{1 - |\\Gamma|}', aliases: ['VSWR', 'วีเอสดับเบิลยูอาร์'],
    detail: ['VSWR (Voltage SWR) คือค่าเดียวกัน อ่านจากจุดที่วงกลม SWR ตัดแกนนอนด้านขวา'] },
  { id: 'RL', sym: 'RL', name: 'Return loss', nameTh: 'การสูญเสียย้อนกลับ', unit: 'dB', group: 'smith', link: L('ch1', 'power'),
    short: 'กำลังสะท้อนเทียบกำลังตกกระทบในหน่วย dB ยิ่งมากยิ่งดี (∞ = matched)',
    formula: 'RL = -20\\log_{10}|\\Gamma|\\ \\text{dB}', aliases: ['return loss'] },
  { id: 'ML', sym: 'Mismatch loss', name: 'Mismatch loss', nameTh: 'การสูญเสียจากการไม่แมตช์', unit: 'dB', group: 'smith', link: L('ch1', 'power'),
    short: 'กำลังที่ส่งเข้าโหลดไม่ได้เพราะสะท้อนกลับ', formula: 'ML = -10\\log_{10}(1 - |\\Gamma|^2)\\ \\text{dB}' },
  { id: 'WTG', sym: 'WTG', name: 'Wavelengths toward generator', nameTh: 'ระยะเป็นความยาวคลื่น ไปทางแหล่งจ่าย', unit: 'λ', group: 'smith', link: L('ch3', 'rotate'),
    short: 'สเกลรอบนอกวงกลาง เดินตามเข็มนาฬิกาเมื่อขยับจากโหลดไปทางแหล่งจ่าย (1 รอบ = 0.5 λ)', aliases: ['toward generator'] },
  { id: 'WTL', sym: 'WTL', name: 'Wavelengths toward load', nameTh: 'ระยะเป็นความยาวคลื่น ไปทางโหลด', unit: 'λ', group: 'smith', link: L('ch3', 'rotate'),
    short: 'สเกลวงนอกสุด เดินทวนเข็มนาฬิกาเมื่อย้อนจากจุดวัดกลับไปหาโหลด', aliases: ['toward load'] },
  { id: 'rcircle', sym: 'วงกลม r คงที่', name: 'Constant-resistance circle', nameTh: 'วงกลมความต้านทานคงที่', group: 'smith', link: L('ch3', 'move'),
    short: 'เส้นที่ทุกจุดมี r เท่ากัน · อุปกรณ์ต่ออนุกรมทำให้จุดเดินตามวงกลมนี้' },
  { id: 'xarc', sym: 'เส้นโค้ง x คงที่', name: 'Constant-reactance arc', nameTh: 'เส้นโค้งรีแอกแตนซ์คงที่', group: 'smith', link: L('ch3', 'move'),
    short: 'เส้นที่ทุกจุดมี x เท่ากัน ครึ่งบนเป็นบวก ครึ่งล่างเป็นลบ' },
  { id: 'gcircle', sym: 'วงกลม g = 1', name: 'Unit conductance circle', nameTh: 'วงกลม g = 1', group: 'smith', link: L('ch4', 'ex80'),
    short: 'เส้นเป้าหมายของ stub matching: พาจุดมาที่วงกลมนี้ก่อน แล้วใส่สตับหักล้าง b' },
  { id: 'swrcircle', sym: 'วงกลม SWR', name: 'Constant-SWR circle', nameTh: 'วงกลม SWR คงที่', group: 'smith', link: L('ch3', 'swr'),
    short: 'วงกลมรอบศูนย์กลางที่มี |Γ| คงที่ · สายส่งไร้การสูญเสียทำให้จุดวนอยู่บนวงนี้' },
  { id: 'SHORT', sym: 'SHORT', name: 'Short circuit', nameTh: 'จุดลัดวงจร', group: 'smith',
    short: 'จุดซ้ายสุดของกราฟ z = 0 (Γ = −1)' },
  { id: 'OPEN', sym: 'OPEN', name: 'Open circuit', nameTh: 'จุดปลายเปิด', group: 'smith',
    short: 'จุดขวาสุดของกราฟ z = ∞ (Γ = +1)' },
  { id: 'MATCH', sym: 'MATCHED', name: 'Matched', nameTh: 'แมตช์', group: 'smith',
    short: 'จุดอยู่ที่ศูนย์กลาง z = 1 + j0 ไม่มีคลื่นสะท้อน กำลังส่งถึงโหลดทั้งหมด' },

  // ---------------- line ----------------
  { id: 'lambda', sym: 'λ', tex: '\\lambda', name: 'Wavelength', nameTh: 'ความยาวคลื่น', unit: 'm', group: 'line', link: L('ch1', 'wave'),
    short: 'ความยาวคลื่นบนสาย ใช้บอกความยาวสายเป็นสัดส่วน เช่น 0.25 λ', formula: '\\lambda = \\frac{c\\,\\mathrm{VF}}{f}' },
  { id: 'beta', sym: 'β', tex: '\\beta', name: 'Phase constant', nameTh: 'ค่าคงที่เฟส', unit: 'rad/m', group: 'line', link: L('ch1', 'wave'),
    short: 'มุมเฟสที่เปลี่ยนไปต่อระยะทาง 1 เมตรบนสาย', formula: '\\beta = \\frac{2\\pi}{\\lambda}' },
  { id: 'betal', sym: 'βl', tex: '\\beta l', name: 'Electrical length', nameTh: 'ความยาวไฟฟ้า', unit: '° หรือ rad', group: 'line', link: L('ch2', 'stub'),
    short: 'ความยาวสายคิดเป็นมุมเฟส · l = 0.25 λ ให้ βl = 90°', formula: '\\beta l = 360^\\circ \\times \\frac{l}{\\lambda}',
    detail: ['บน Smith Chart จุดหมุนเป็นมุม 2βl (สองเท่าของความยาวไฟฟ้า)'] },
  { id: 'VF', sym: 'VF', name: 'Velocity factor', nameTh: 'ตัวประกอบความเร็ว', group: 'line', link: L('ch1', 'wave'),
    short: 'อัตราส่วนความเร็วคลื่นในสายต่อความเร็วแสง เช่น RG-8 ≈ 0.66', aliases: ['velocity factor'],
    detail: ['ใช้แปลงความยาวเป็น λ ให้เป็นความยาวจริงเป็นเมตร'] },
  { id: 'TL', sym: 'TL', name: 'Transmission line', nameTh: 'สายส่ง', group: 'line', link: L('ch2', 'stub'),
    short: 'อุปกรณ์สายส่งบน Canvas · หมุนจุดตามวงกลม SWR ไปทางแหล่งจ่าย 2βl' },
  { id: 'stub', sym: 'stub', name: 'Stub', nameTh: 'สตับ', group: 'line', link: L('ch2', 'stub'),
    short: 'สายส่งสั้น ๆ ปลายลัดวงจรหรือปลายเปิด ใช้แทนตัวเหนี่ยวนำหรือตัวเก็บประจุ',
    formula: '\\text{ปลายลัด: } Z_{in} = jZ_0\\tan\\beta l,\\quad \\text{ปลายเปิด: } Z_{in} = -jZ_0\\cot\\beta l' },
  { id: 'Sstub', sym: 'S (สตับ)', name: 'Short-circuited stub', nameTh: 'สตับปลายลัดวงจร', group: 'line', link: L('ch2', 'stub'),
    short: 'สัญลักษณ์ S บนแผงอุปกรณ์ · สตับที่ปลายต่อลงกราวด์' },
  { id: 'Ostub', sym: 'O (สตับ)', name: 'Open-circuited stub', nameTh: 'สตับปลายเปิด', group: 'line', link: L('ch2', 'stub'),
    short: 'สัญลักษณ์ O บนแผงอุปกรณ์ · สตับที่ปลายเปิด ยาวต่างจากปลายลัด 0.25 λ' },
  { id: 'Emax', sym: 'E_max / E_min', tex: 'E_{max}/E_{min}', name: 'Voltage maximum / minimum', nameTh: 'แรงดันสูงสุด / ต่ำสุดบนสาย', group: 'line', link: L('ch2', 'shunt-stub'),
    short: 'ยอดและท้องของคลื่นนิ่ง อัตราส่วนของทั้งสองคือ SWR' },
  { id: 'probe', sym: 'Probe', name: 'Probe', nameTh: 'จุดวัดบนสาย', group: 'line', link: L('ch3', 'rotate'),
    short: 'เครื่องมือในเว็บนี้: เลื่อนตำแหน่งวัดบนสายเพื่อดูอิมพีแดนซ์และคลื่นนิ่งที่ตำแหน่งนั้น' },

  // ---------------- matching ----------------
  { id: 'QWT', sym: 'λ/4', name: 'Quarter-wave transformer', nameTh: 'หม้อแปลงหนึ่งในสี่ความยาวคลื่น', group: 'match', link: L('ch2', 'qwt'),
    short: 'สายยาว λ/4 ที่แปลงอิมพีแดนซ์แบบกลับส่วน ใช้แมตช์โหลดที่เป็นจำนวนจริง',
    formula: 'Z_{in} = \\frac{Z_t^2}{Z_L},\\qquad Z_t = \\sqrt{Z_0 R_L}', aliases: ['QWT', 'quarter wave'] },
  { id: 'Zt', sym: 'Z_t', tex: 'Z_t', name: 'Transformer impedance', nameTh: 'อิมพีแดนซ์ของสายหม้อแปลง', unit: 'Ω', group: 'match', link: L('ch2', 'qwt'),
    short: 'ค่า Z₀ ของสาย λ/4 ที่ใช้แปลงอิมพีแดนซ์', formula: 'Z_t = \\sqrt{Z_0 R_L}' },
  { id: 'Lnet', sym: 'L-network', name: 'L-section / L-network', nameTh: 'วงจรแมตช์รูปตัว L', group: 'match', link: L('ch4', 'lnet'),
    short: 'วงจร matching ที่ใช้ตัวเก็บประจุ/ตัวเหนี่ยวนำ 2 ตัว (อนุกรม 1 ขนาน 1) มีได้ 8 รูปแบบ',
    aliases: ['L-section', 'แอลเน็ตเวิร์ก'] },
  { id: 'PiT', sym: 'π / T network', name: 'Pi and T networks', nameTh: 'วงจรแมตช์รูปพาย และรูปตัวที', group: 'match', link: L('ch4', 'lnet'),
    short: 'วงจรแมตช์ 3 อุปกรณ์ มีอิสระเพิ่มให้เลือก Q และแบนด์วิดท์ได้' },
  { id: 'single', sym: 'Single stub', name: 'Single-stub matching', nameTh: 'การแมตช์ด้วยสตับตัวเดียว', group: 'match', link: L('ch4', 'ex80'),
    short: 'เลื่อนตามสาย d จนถึงวงกลม g = 1 แล้วใส่สตับยาว l หักล้าง susceptance' },
  { id: 'double', sym: 'Double stub', name: 'Double-stub matching', nameTh: 'การแมตช์ด้วยสตับสองตัว', group: 'match', link: L('ch2', 'shunt-stub'),
    short: 'สตับ 2 ตัวห่างกันคงที่ ปรับความยาวสตับแทนการเลื่อนตำแหน่ง' },
  { id: 'series', sym: 'อนุกรม (series)', name: 'Series element', nameTh: 'อุปกรณ์ต่ออนุกรม', group: 'match', link: L('ch3', 'move'),
    short: 'ต่อคั่นบนสาย · บวกอิมพีแดนซ์ ทำให้จุดเดินตามวงกลม r คงที่' },
  { id: 'shunt', sym: 'ขนาน (shunt) ↓', name: 'Shunt element', nameTh: 'อุปกรณ์ต่อขนาน', group: 'match', link: L('ch3', 'move'),
    short: 'ต่อคร่อมลงกราวด์ · บวกแอดมิตแตนซ์ ทำให้จุดเดินตามวงกลม g คงที่', aliases: ['parallel'] },
  { id: 'bandwidth', sym: 'Bandwidth', name: 'Bandwidth', nameTh: 'แถบความถี่ใช้งาน', group: 'match', link: L('ch5', 'rules'),
    short: 'ช่วงความถี่ที่ SWR ยังอยู่ในเกณฑ์ที่ยอมรับได้ เช่น SWR ≤ 2' },

  // ---------------- units ----------------
  { id: 'ohm', sym: 'Ω', name: 'Ohm', nameTh: 'โอห์ม', group: 'unit', short: 'หน่วยของอิมพีแดนซ์ ความต้านทาน และรีแอกแตนซ์' },
  { id: 'siemens', sym: 'S / mS', name: 'Siemens', nameTh: 'ซีเมนส์', group: 'unit', short: 'หน่วยของแอดมิตแตนซ์ (1 S = 1/Ω) · mS = หนึ่งในพันซีเมนส์' },
  { id: 'henry', sym: 'H / nH / µH', name: 'Henry', nameTh: 'เฮนรี', group: 'unit', short: 'หน่วยความเหนี่ยวนำ · 1 nH = 10⁻⁹ H, 1 µH = 10⁻⁶ H' },
  { id: 'farad', sym: 'F / pF', name: 'Farad', nameTh: 'ฟารัด', group: 'unit', short: 'หน่วยความจุ · 1 pF = 10⁻¹² F' },
  { id: 'hz', sym: 'Hz / MHz / GHz', name: 'Hertz', nameTh: 'เฮิรตซ์', group: 'unit', short: 'หน่วยความถี่ · 1 MHz = 10⁶ Hz, 1 GHz = 10⁹ Hz' },
  { id: 'dB', sym: 'dB', name: 'Decibel', nameTh: 'เดซิเบล', group: 'unit', short: 'หน่วยอัตราส่วนกำลังแบบลอการิทึม 10log₁₀(P₁/P₂)' },
  { id: 'j', sym: 'j', name: 'Imaginary unit', nameTh: 'หน่วยจินตภาพ', group: 'unit', short: 'หน่วยจินตภาพ (j² = −1) วิศวกรรมไฟฟ้าใช้ j แทน i เพื่อไม่ให้สับสนกับกระแส' },

  // ---------------- app UI ----------------
  { id: 'ANT', sym: 'ANT', name: 'Antenna (curve)', nameTh: 'สายอากาศแบบตารางหลายความถี่', group: 'ui', link: L('ch2', 'curve'),
    short: 'อุปกรณ์ในเว็บนี้ที่เก็บอิมพีแดนซ์ของสายอากาศหลายความถี่ (f, R, X) ใช้กวาดความถี่' },
  { id: 'ZLblock', sym: 'Z_L (บล็อกโหลด)', name: 'Load block', nameTh: 'บล็อกโหลด', group: 'ui',
    short: 'อุปกรณ์ที่กำหนดอิมพีแดนซ์โหลดโดยตรงเป็น R + jX ที่ความถี่เดียว' },
  { id: 'gnd', sym: '⏚', name: 'Ground', nameTh: 'กราวด์', group: 'ui', short: 'จุดต่อลงกราวด์ · ต่อให้อัตโนมัติเมื่อวางอุปกรณ์แบบขนาน' },
  { id: 'arrowdown', sym: '↓ (หลังชื่ออุปกรณ์)', name: 'Shunt marker', nameTh: 'เครื่องหมายว่าต่อขนาน', group: 'ui',
    short: 'เช่น C↓ หมายถึงตัวเก็บประจุตัวนั้นต่อขนานลงกราวด์' },
  { id: 'sweep', sym: 'กวาดความถี่', name: 'Frequency sweep', nameTh: 'การกวาดความถี่', group: 'ui', link: L('ch2', 'curve'),
    short: 'พล็อตทุกความถี่ในตาราง ANT เป็นเส้นโค้ง เพื่อดูว่าทั้งแบนด์อยู่ในเป้า SWR หรือไม่' },
  { id: 'target', sym: 'เป้า SWR', name: 'Target SWR circle', nameTh: 'วงกลมเป้าหมาย SWR', group: 'ui', link: L('ch2', 'resonant'),
    short: 'วงกลมประสีส้มที่กำหนดเกณฑ์ เช่น SWR ≤ 2 ทุกจุดต้องอยู่ภายในจึงถือว่าผ่าน' },
  { id: 'marker', sym: '📍 Mark z', name: 'Marker', nameTh: 'จุดที่ mark เอง', group: 'ui', link: L('ch3', 'norm'),
    short: 'เครื่องมือใน Free Circuit Builder: ปักจุดค่า z ที่ต้องการลงบน Smith Chart (คลิกบนกราฟ หรือพิมพ์ r และ x) เพื่อเทียบกับจุดของวงจร',
    detail: ['แต่ละจุดบอก y, |Γ|, มุม, SWR และตำแหน่งบนสเกล wavelengths toward generator', 'แชร์จุดผ่านลิงก์ได้ด้วย ?mark=0.5+0.5,2-1'] },
  { id: 'zLpt', sym: 'จุดสีแดง / สีเขียว', name: 'Load and input points', nameTh: 'จุดโหลดและจุดขาเข้า', group: 'ui',
    short: 'จุดสีแดงคือ z_L (โหลด) จุดสีเขียวคือ z_in (ที่แหล่งจ่ายมองเห็น) จุดสีส้มคือระหว่างทาง' },
];

/** the course section that lists the symbols */
export const SYMBOLS_SECTION: SectionLink = { chapter: 'intro', section: 'symbols' };

export const GROUP_ORDER: GlossaryGroup[] = ['basic', 'norm', 'smith', 'line', 'match', 'unit', 'ui'];

const byId = new Map(GLOSSARY.map((e) => [e.id, e]));
/** one-line meaning for a `title` tooltip, e.g. tip('SWR') */
export const tip = (id: string): string => {
  const e = byId.get(id);
  return e ? `${e.sym} — ${e.nameTh} (${e.name})${e.unit ? ` [${e.unit}]` : ''}\n${e.short}` : '';
};
export const glossaryEntry = (id: string): GlossaryEntry | undefined => byId.get(id);

/** free-text search over symbol / names / aliases / meaning */
export const searchGlossary = (q: string): GlossaryEntry[] => {
  const s = q.trim().toLowerCase();
  if (!s) return GLOSSARY;
  return GLOSSARY.filter((e) =>
    [e.sym, e.name, e.nameTh, e.short, e.unit ?? '', ...(e.aliases ?? []), ...(e.detail ?? [])]
      .join(' ')
      .toLowerCase()
      .includes(s),
  );
};
