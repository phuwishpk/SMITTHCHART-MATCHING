import React, { useId, useState } from 'react';
import { isFiniteC, fmtNum } from '../engine/complex';
import { stubInput } from '../engine/rf';
import { Tex } from './Tex';

type Kind = 'short' | 'open';
const Z0 = 50;
const frequency = 100e6;
const presets = [0, 0.125, 0.249, 0.25, 0.251, 0.375, 0.5];
const read = (kind: Kind, length: number) => {
  const z = stubInput(kind, Z0, length);
  if (!isFiniteC(z)) return { state: 'open' as const, x: null };
  const x = Math.abs(z.im) < 1e-8 ? 0 : z.im;
  return { state: x === 0 ? 'short' as const : x > 0 ? 'inductive' as const : 'capacitive' as const, x };
};
const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${fmtNum(Math.abs(x), 2)}`;

const StubPlot: React.FC<{ kind: Kind; length: number }> = ({ kind, length }) => {
  const id = useId();
  const color = kind === 'short' ? '#2563eb' : '#dc2626';
  const value = read(kind, length);
  const px = (l: number) => 58 + l * 768;
  const py = (x: number) => 159 - x * 0.35;
  const paths: string[] = [];
  let segment = '';
  for (let i = 0; i <= 800; i++) {
    const l = i / 1600;
    const sample = read(kind, l);
    if (sample.x === null || Math.abs(sample.x) > 300) {
      if (segment) paths.push(segment);
      segment = '';
    } else {
      segment += `${segment ? ' L' : 'M'}${px(l).toFixed(2)},${py(sample.x).toFixed(2)}`;
    }
  }
  if (segment) paths.push(segment);
  const beyond = value.x !== null && Math.abs(value.x) > 300;
  return <svg viewBox="0 0 480 323" role="img" aria-labelledby={id}>
    <title id={id}>{`${kind === 'short' ? 'ปลายลัด' : 'ปลายเปิด'}: ความยาว ${length} λ, ${value.x === null ? 'ขาเข้าเหมือนปลายเปิด' : `X = ${signed(value.x)} โอห์ม`}`}</title>
    <rect x="58" y="54" width="384" height="105" fill="#eff6ff" />
    <rect x="58" y="159" width="384" height="105" fill="#fff7ed" />
    <text x="66" y="26" className="stub-plot-region">X &gt; 0: ลักษณะเหนี่ยวนำ (L)</text>
    <text x="66" y="44" className="stub-plot-region">X &lt; 0: ลักษณะเก็บประจุ (C)</text>
    {[-300, -150, 0, 150, 300].map(x => <g key={x}>
      <line x1="58" y1={py(x)} x2="442" y2={py(x)} stroke={x === 0 ? '#64748b' : '#cbd5e1'} />
      <text x="50" y={py(x) + 4} textAnchor="end">{x}</text>
    </g>)}
    {[0, 0.125, 0.25, 0.375, 0.5].map(l => <g key={l}>
      <line x1={px(l)} y1="54" x2={px(l)} y2="264" stroke="#cbd5e1" />
      <text x={px(l)} y="282" textAnchor="middle">{l}</text>
    </g>)}
    {(kind === 'short' ? [0.25] : [0, 0.5]).map(l => <line key={l} x1={px(l)} y1="54" x2={px(l)} y2="264" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5 4" />)}
    {paths.map((path, i) => <path key={i} d={path} fill="none" stroke={color} strokeWidth="2.5" />)}
    <line x1={px(length)} y1="54" x2={px(length)} y2="264" stroke="#0f766e" strokeWidth="1.5" strokeDasharray="2 3" />
    {value.x !== null && !beyond && <circle cx={px(length)} cy={py(value.x)} r="5" fill="#0f766e" stroke="white" strokeWidth="2" />}
    {beyond && <text x={px(length)} y={value.x! > 0 ? 70 : 256} textAnchor="middle" fill="#0f766e" style={{ fontSize: 24 }}> {value.x! > 0 ? '↑' : '↓'}</text>}
    <text x="250" y="313" textAnchor="middle">ความยาว l/λ (เศษส่วนของความยาวคลื่น)</text>
    <text x="16" y="159" textAnchor="middle" transform="rotate(-90 16 159)">X (Ω)</text>
  </svg>;
};

const StubCard: React.FC<{ kind: Kind; length: number }> = ({ kind, length }) => {
  const value = read(kind, length);
  const short = kind === 'short';
  const isReactive = value.state === 'inductive' || value.state === 'capacitive';
  return <section className="stub-card" aria-label={short ? 'เปรียบเทียบสายปลายลัด' : 'เปรียบเทียบสายปลายเปิด'}>
    <h4>{short ? 'สายปลายลัด (Short)' : 'สายปลายเปิด (Open)'}</h4>
    <p>{short ? 'ปลายตัวนำเชื่อมถึงกัน: V ที่ปลาย = 0' : 'ปลายตัวนำแยกจากกัน: I ที่ปลาย = 0'}</p>
    <svg className="stub-circuit" viewBox="0 0 400 72" role="img" aria-label={short ? 'มองเข้าทางซ้ายผ่านสายไปยังปลายลัดทางขวา' : 'มองเข้าทางซ้ายผ่านสายไปยังปลายเปิดทางขวา'}>
      <path d="M48 18 H340 M48 44 H340" fill="none" stroke="#475569" strokeWidth="3" />
      {short ? <path d="M340 18 V44" stroke="#2563eb" strokeWidth="4" /> : <g fill="white" stroke="#dc2626" strokeWidth="2"><circle cx="340" cy="18" r="4" /><circle cx="340" cy="44" r="4" /></g>}
      <text x="8" y="35" fill="#0f766e">→</text><text x="48" y="66">ขาเข้าที่เราอ่าน Z</text><text x="250" y="66">ปลายสตับ</text>
    </svg>
    <Tex block tex={short ? 'X=50\\tan(\\beta l)' : 'X=-50\\cot(\\beta l)=-\\frac{50}{\\tan(\\beta l)}'} />
    <StubPlot kind={kind} length={length} />
    <div className="stub-readout" aria-live="polite">
      <b>{value.x === null ? 'Z ขาเข้า → ∞: เหมือนปลายเปิด' : `X = ${signed(value.x)} Ω`}</b>
      <p>{value.state === 'open' ? 'จุดนี้ไม่มีค่า X จำกัดให้พล็อต จึงไม่มีจุดสีเขียวบนเส้นกราฟ' : value.state === 'short' ? 'Z ขาเข้า = 0: เหมือนลัดวงจร ยังไม่ใช่การแมตช์กับ 50 Ω' : value.state === 'inductive' ? 'X เป็นบวก → ขาเข้ามีลักษณะเหนี่ยวนำ' : 'X เป็นลบ → ขาเข้ามีลักษณะเก็บประจุ'}</p>
      {value.x !== null && Math.abs(value.x) > 300 && <p>ค่าอยู่นอกกรอบ ±300 Ω ลูกศรแสดงทิศที่กราฟยังไปต่อ ไม่ใช่ค่า X หยุดที่ 300 Ω</p>}
      {isReactive && value.x !== null && <p>ที่ 100 MHz เทียบได้กับ {value.x > 0 ? `L ≈ ${fmtNum(value.x / (2 * Math.PI * frequency) * 1e9, 2)} nH` : `C ≈ ${fmtNum(1 / (2 * Math.PI * frequency * Math.abs(value.x)) * 1e12, 2)} pF`} ในแง่รีแอกแตนซ์ขาเข้า ณ ความถี่นี้</p>}
    </div>
  </section>;
};

export const StubReactanceIntro: React.FC = () => {
  const [length, setLength] = useState(0.125);
  return <div className="reflection-intro stub-intro">
    <p className="ri-eyebrow">อ่านกราฟทีละส่วน • เปรียบเทียบสาย Z₀ = 50 Ω ไร้การสูญเสีย</p>
    <h4>สายยาวเท่ากัน เปลี่ยนปลายสายแล้วให้ X ต่างกันอย่างไร?</h4>
    <p>กราฟนี้แสดงค่ารีแอกแตนซ์ที่มองจาก <b>ขาเข้าสตับ</b> แกนนอนเป็นความยาวสาย l/λ แกนตั้งเป็น X หน่วยโอห์ม เพราะสตับอุดมคติไม่ดูดกลืนกำลังเฉลี่ย ขาเข้าจึงมี Z = jX เมื่อค่าอิมพีแดนซ์มีขนาดจำกัด</p>
    <p><b>วิธีอ่าน:</b> เลือกความยาวบนแกนนอน ตามเส้นตั้งสีเขียวไปตัดกราฟ แล้วอ่าน X บนแกนตั้ง จุดเหนือเส้นศูนย์เป็นบวกแบบ L จุดใต้เส้นศูนย์เป็นลบแบบ C</p>
    <label className="lp-slider">ความยาวสตับทั้งสอง: {fmtNum(length, 3)} λ · βl = {fmtNum(length * 360, 2)}°
      <input type="range" min="0" max="0.5" step="0.001" value={length} onChange={e => setLength(Number(e.target.value))} />
    </label>
    <div className="ri-choices" role="group" aria-label="เลือกความยาวสตับตัวอย่าง">{presets.map(l => <button key={l} type="button" aria-pressed={Math.abs(length - l) < 1e-8} onClick={() => setLength(l)}>{l} λ{l === 0.249 ? ' · ก่อน λ/4' : l === 0.25 ? ' · λ/4 พอดี' : l === 0.251 ? ' · หลัง λ/4' : ''}</button>)}</div>
    <p className="ri-small">กำหนดความถี่คงที่ 100 MHz แล้วปรับความยาวสาย · ถ้าสมมุติ VF = 0.66 ความยาวคลื่นในสาย ≈ 1.979 m และความยาวที่เลือก ≈ {fmtNum(length * 0.66 * 299792458 / frequency * 100, 2)} cm · รูปตัวนำแสดงการต่อปลาย ไม่ได้วาดตามสัดส่วนความยาว</p>
    <div className="stub-compare"><StubCard kind="short" length={length} /><StubCard kind="open" length={length} /></div>
    <p className="ri-small">เส้นประม่วง = ตำแหน่งที่สูตรไม่มีค่า X จำกัด • เส้นตั้งเขียว = ความยาวที่เลือก • จุดเขียว = ค่า X เมื่ออยู่ในกรอบกราฟ</p>
    <div className="ri-takeaway"><b>ที่ λ/4 สองกราฟเกิดคนละเหตุการณ์</b><p>ปลายลัด: X พุ่งจาก +∞ ก่อน λ/4 แล้วเริ่มจาก −∞ หลัง λ/4 ขาเข้าที่ λ/4 พอดีเหมือนปลายเปิด จึงไม่ลากเส้นเชื่อมสองฝั่งผ่าน X = 0</p><p>ปลายเปิด: X ผ่านศูนย์อย่างต่อเนื่องที่ λ/4 ขาเข้าจึงเหมือนลัดวงจร สังเกตว่าจุดนี้ไม่ใช่ตำแหน่งเส้นประม่วงของกราฟปลายเปิด</p></div>
    <h4>ลองแทนค่า 0.125 λ ทีละขั้น</h4>
    <ol><li>แปลงระยะเป็นมุมของสาย: βl = 360° × 0.125 = 45°</li><li>หา tan 45° = 1 และ cot 45° = 1/tan 45° = 1</li><li>ปลายลัด: X = 50 × 1 = +50 Ω จึงได้ Z = j50 Ω</li><li>ปลายเปิด: X = −50 × 1 = −50 Ω จึงได้ Z = −j50 Ω</li><li>ที่ 100 MHz ค่าแรกเทียบได้กับ L ≈ 79.58 nH ส่วนค่าที่สองเทียบได้กับ C ≈ 31.83 pF</li></ol>
    <p>βl ในสูตรนี้คือมุมของสาย ไม่ใช่มุมหมุนบน Smith Chart: สาย 0.125 λ มี βl = 45° แต่จุดบน Smith Chart หมุน 90° ตามที่เรียนในบท 5</p>
    <h4>อ่านช่วง 0 ถึง 0.5 λ ให้ครบ</h4>
    <div className="stub-table-scroll" role="region" aria-label="ตารางเปรียบเทียบช่วงความยาวสตับ" tabIndex={0}><table><thead><tr><th>ความยาว</th><th>ปลายลัด</th><th>ปลายเปิด</th></tr></thead><tbody>
      <tr><th>0 λ</th><td>Z = 0 · ลัดวงจร</td><td>Z → ∞ · ปลายเปิด</td></tr>
      <tr><th>0 &lt; l &lt; λ/4</th><td>X &gt; 0 · แบบ L</td><td>X &lt; 0 · แบบ C</td></tr>
      <tr><th>λ/4 พอดี</th><td>Z → ∞ · เหมือนเปิด</td><td>Z = 0 · เหมือนลัด</td></tr>
      <tr><th>λ/4 &lt; l &lt; λ/2</th><td>X &lt; 0 · แบบ C</td><td>X &gt; 0 · แบบ L</td></tr>
      <tr><th>λ/2 พอดี</th><td>Z = 0 · กลับเหมือนเดิม</td><td>Z → ∞ · กลับเหมือนเดิม</td></tr>
    </tbody></table></div>
    <details className="ri-formulas"><summary>ทำไมเปลี่ยนปลายสายแล้วกราฟจึงต่างกัน? และสองกราฟเป็นค่าติดลบของกันหรือไม่?</summary>
      <p>ปลายลัดบังคับให้แรงดันที่ปลายเป็นศูนย์ ส่วนปลายเปิดบังคับให้กระแสที่ปลายเป็นศูนย์ คลื่นสะท้อนจึงมีเฟสต่างกัน 180° เมื่อมองผ่านสายความยาวเดียวกัน จึงได้อัตราส่วน V/I ที่ขาเข้าต่างกัน</p>
      <Tex block tex={'X_{SC}=Z_0\\tan(\\beta l),\\qquad X_{OC}=-Z_0\\cot(\\beta l)'} />
      <p>สองกราฟไม่ได้มีขนาดเท่ากันแล้วกลับเครื่องหมายทุกจุด ตัวอย่างที่ 0.05 λ: ปลายลัดให้ประมาณ +16.25 Ω แต่ปลายเปิดให้ประมาณ −153.88 Ω</p>
      <Tex block tex={'X_{SC}X_{OC}=-Z_0^2\\quad\\text{เมื่อทั้งสองค่ามีขนาดจำกัดและไม่เป็นศูนย์}'} />
      <p>ความสัมพันธ์อีกแบบคือเลื่อนความยาว 0.25 λ แล้วได้รูปกราฟเดียวกัน เพราะ tan(θ + 90°) = −cot θ โดยค่าซ้ำทุก 0.5 λ</p>
      <p>ที่ tan 90° สูตรไม่มีค่าจำกัด จึงต้องพิจารณาขีดจำกัดจากซ้ายและขวา แทนการใช้ ∞ เป็นตัวเลขปกติ สายจริงมีการสูญเสียและผลจากปลายสาย จึงไม่ให้ค่าอนันต์อย่างอุดมคติ</p>
      <p>เมื่อนำสตับไปต่อขนานเพื่อ matching ต้องใช้ B = −1/X สำหรับค่า X ที่จำกัดและไม่เป็นศูนย์: X บวกให้ B ลบ และ X ลบให้ B บวก การอ่านกราฟนี้จึงเป็นขั้นหาอิมพีแดนซ์ของสตับก่อนนำไปรวมกับวงจร</p>
    </details>
  </div>;
};
