import React, { useEffect, useRef, useState } from 'react';
import { t as tr } from '../engine/i18n';
import { C, Complex, fmtNum } from '../engine/complex';
import { admittance, gammaFromz, normalize, rotateTowardGenerator, swrFromGamma, wtgFromGamma, zFromGamma } from '../engine/rf';
import { solveSingleStub } from '../engine/matching';
import { EX78 } from '../engine/basics';
import { SmithFigure, SmithPoint, SmithCurve } from './SmithFigure';
import { Tex } from './Tex';

const solution = solveSingleStub(EX78.ZL, EX78.Z0, 'short')[0];
const zLoad = normalize(EX78.ZL, EX78.Z0);
const yLoad = admittance(zLoad);
const zAtStub = admittance(solution.yAtStub);
const swr = swrFromGamma(gammaFromz(zLoad));
const f = (n: number, digits = 3) => fmtNum(n, digits);
const show = (z: Complex) => `${f(z.re)} ${z.im < 0 ? '−' : '+'} j${f(Math.abs(z.im))}`;
const move = (z: Complex, d: number) => zFromGamma(rotateTowardGenerator(gammaFromz(z), d));
const path = (at: (t: number) => Complex, end: number) => Array.from({ length: 81 }, (_, i) => at(end * i / 80));
const b = f(solution.yAtStub.im);
const steps = [
  { short: 'พล็อตโหลด', title: '1. Normalize แล้วพล็อตโหลด', tag: 'เริ่มจากอิมพีแดนซ์ Z',
    formula: 'z_L=\\frac{450-j600}{300}=1.5-j2',
    paragraphs: ['หารทั้งส่วนจริงและส่วนจินตภาพด้วย Z₀ = 300 Ω จึงได้ค่าปกติที่ไม่มีหน่วย จุดโหลดอยู่ตรงวง r = 1.5 ตัดส่วนโค้ง x = −2 ในครึ่งล่างของกราฟ', 'วงประสีส้มมีศูนย์กลางที่จุดแมตช์และผ่านโหลด ทุกจุดบนวงนี้มีขนาดสัมประสิทธิ์การสะท้อนเท่ากัน เมื่อเดินบนสายไร้การสูญเสีย SWR จึงยังเท่าเดิม'],
    takeaway: `SWR = ${f(swr, 2)} · โหลดนี้ยังไม่แมตช์กับสาย 300 Ω` },
  { short: 'อ่านค่า Y', title: '2. หมุน 180° เพื่ออ่าน y ของโหลดเดิม', tag: 'จุดช่วยอ่านบนกริด Z',
    formula: 'y_L=\\frac{1}{1.5-j2}=0.24+j0.32',
    paragraphs: ['สตับจะต่อขนาน จึงใช้แอดมิตแตนซ์ Y เพราะค่าของแขนงขนานบวกกันได้โดยตรง โดย y = Y/Y₀ = 1/z และ Y₀ = 1/Z₀', 'ถ้าใช้กริด Z ใบเดียว ให้หมุนตำแหน่งอ่านครึ่งรอบผ่านศูนย์กลาง แล้วอ่านตัวเลขที่จุดตรงข้ามเป็น g และ b เส้นสีเขียวอมฟ้าแสดงการย้ายจุดช่วยอ่าน ไม่ใช่การเพิ่มความยาวสายจริง'],
    takeaway: 'โหลดและตำแหน่งวัดยังเหมือนเดิม · การเปลี่ยน Z เป็น Y ไม่ได้ทำให้แมตช์ดีขึ้น' },
  { short: 'เปิดกริด Y', title: '3. เปิดกริด Y แล้วอ่านที่จุดโหลดจริง', tag: 'ใช้พิกัด Γ ของโหลดจริงต่อจากนี้',
    formula: '\\Gamma=\\frac{z-1}{z+1}=\\frac{1-y}{1+y}',
    paragraphs: ['กริด Y สีเขียวอมฟ้าคือกริดที่หมุนจากกริด Z มาแล้ว 180° จึงอ่าน g = 0.24 และ b = +0.32 ที่จุดโหลดสีแดงเดิมได้เลย จุดช่วยอ่านจากเฟรมก่อนจึงไม่จำเป็นอีก', 'วงหนาสีเขียวคือ g = 1 ซึ่งอยู่ทางซ้ายของศูนย์กลาง เมื่อเปิดกริด Y เราจะเดินจากจุดโหลดจริงไปหาวงนี้ โดยใช้ตำแหน่ง Γ แบบเดียวกันตลอดขั้นที่เหลือ'],
    takeaway: 'ดูกริด Y: g คือส่วนจริงของ y และ b คือส่วนจินตภาพของ y' },
  { short: 'หาระยะ d', title: '4. เดินไปทาง generator จน g = 1', tag: 'หมุนตามเข็มนาฬิกาบนวง SWR',
    formula: `y(d)=1+j${b},\\qquad d=${f(solution.dLambda, 4)}\\lambda`,
    paragraphs: ['จุดสีเขียวเดินตามเข็มนาฬิกาจากโหลดไปทางเครื่องส่ง ระยะที่อ่านได้คือระยะจากโหลดถึงตำแหน่งต่อสตับ หยุดที่จุดตัดแรกกับวง g = 1 เพื่อใช้คำตอบที่มีระยะ d สั้นกว่า', `ที่จุดนี้ y = 1 + j${b} ส่วนจริงถูกต้องแล้ว แต่ยังมีส่วนจินตภาพอยู่ จึงต้องใช้สตับหักล้างส่วนนี้ บนวง SWR หนึ่งรอบเท่ากับระยะสาย 0.5λ จึงใช้มุมที่หมุนหารด้วย 720° เพื่อหาระยะเป็น λ`],
    takeaway: `ได้ตำแหน่งสตับ d = ${f(solution.dLambda, 4)}λ · SWR ของสายฝั่งโหลดยังเป็น ${f(swr, 2)}` },
  { short: 'หาค่า b สตับ', title: '5. เลือก susceptance ให้เครื่องหมายตรงข้าม', tag: 'ต่อขนาน → บวกแอดมิตแตนซ์',
    formula: `y_{\\mathrm{total}}=(1+j${b})+(-j${b})=1+j0`,
    paragraphs: [`สายที่ตำแหน่งต่อสตับมี b = +${b} ดังนั้นสตับต้องให้ b = −${b} ขนาดเท่ากันและเครื่องหมายตรงข้าม เมื่อบวกกันจึงเหลือศูนย์`, 'สตับไร้การสูญเสียให้แอดมิตแตนซ์เป็นจินตภาพล้วน จึงเปลี่ยน b โดยไม่เพิ่ม g นี่คือเหตุผลที่ต้องเดินตามสายจนได้ g = 1 ก่อน จุดวงแหวนกลางกราฟคือเป้าหมายที่ยังไปไม่ถึง'],
    takeaway: `ต้องการ y_stub = −j${b} · ค่า b เป็นค่าปกติ ไม่มีหน่วย` },
  { short: 'หาความยาวสตับ', title: '6. เริ่มจาก SHORT แล้วหาความยาวสตับ', tag: 'ดูสตับแยกจากสายหลัก',
    formula: `y_s=-j\\cot(2\\pi l_s/\\lambda),\\qquad l_s=${f(solution.lLambda, 4)}\\lambda`,
    paragraphs: ['ตอนนี้จุดที่กำลังเคลื่อนที่แทนอินพุตของสตับเพียงแขนงเดียว เริ่มที่ SHORT ด้านซ้ายของกราฟ แล้วหมุนตามเข็มนาฬิกาบนขอบวงกลม เมื่อเพิ่มความยาวสตับปลายลัด', `หยุดเมื่อกริด Y อ่าน b = −${b} ได้ความยาว ${f(solution.lLambda, 4)}λ โดยใช้สตับ Z₀ = 300 Ω เท่ากับสายหลัก ที่ความยาวศูนย์ y มีขนาดอนันต์ จึงอ่านค่า b จำกัดได้หลังเริ่มเดินจาก SHORT แล้ว`],
    takeaway: `ได้สตับปลายลัด l_s ≈ ${f(solution.lLambda)}λ · ขอบกราฟนี้เป็นของสตับ ไม่ใช่วง SWR ของโหลด` },
  { short: 'ต่อสตับ', title: '7. ต่อสตับขนาน แล้วดูจุดเข้าสู่ศูนย์กลาง', tag: 'g = 1 คงที่ · b ลดลงจนเป็นศูนย์',
    formula: `y_{\\mathrm{total}}=1+j(${b}+b_s)\\longrightarrow1+j0`,
    paragraphs: ['กลับมาดูสายหลักที่ตำแหน่งต่อสตับ ภาพค่อย ๆ เพิ่ม susceptance ของแขนงขนานจาก 0 ไปถึงค่าที่ออกแบบ เพื่อให้เห็นการหักล้าง ส่วนจริง g คงที่เท่ากับ 1 จุดจึงวิ่งตามวง g = 1 เข้าหาศูนย์กลาง', 'แถบด้านล่างแสดงสัดส่วนการชดเชยระหว่างการสาธิต ไม่ใช่การเพิ่มความยาวสตับเป็นเส้นตรง เมื่อชดเชยครบ y = 1 + j0 จึงได้ z = 1 และ Z_in = 300 Ω'],
    takeaway: 'เมื่อถึงศูนย์กลาง: Γ_in = 0 และ SWR ฝั่งเครื่องส่ง = 1' },
  { short: 'สรุปวงจร', title: '8. ได้วงจรแมตช์ครบแล้ว', tag: 'ผลลัพธ์ที่ความถี่ออกแบบ 10 MHz',
    formula: `d=${f(solution.dLambda, 4)}\\lambda,\\quad l_s=${f(solution.lLambda, 4)}\\lambda,\\quad Z_{\\mathrm{in}}=300\\,\\Omega`,
    paragraphs: ['วัดระยะ d จากโหลดไปทางเครื่องส่ง แล้วต่อสตับปลายลัดแบบขนาน ณ จุดนั้น ความยาว l_s วัดจากจุดต่อไปถึงปลายลัดวงจรของสตับ สายทั้งสองเส้นมี Z₀ = 300 Ω', `ฝั่งเครื่องส่งก่อนถึงจุดต่อสตับมี SWR = 1 แต่ช่วงระหว่างสตับกับโหลดยังมี SWR = ${f(swr, 2)} การแมตช์ทำให้เครื่องส่งเห็นอิมพีแดนซ์ที่ถูกต้อง โดยโหลดเดิมยังเป็น 450 − j600 Ω`],
    takeaway: 'ค่าจากการคำนวณปัดได้ใกล้เคียงหนังสือ: d ≈ 0.130λ และ l_s ≈ 0.085λ' },
];
const DURATION = 14000;

export const SingleStubWalkthrough: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const index = Math.min(steps.length - 1, Math.floor(position));
  const progress = position >= steps.length ? 1 : position - index;
  const t = Math.max(0, Math.min(1, (progress - 0.12) / 0.56));
  const step = steps[index];

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = document.hidden ? 0 : Math.min(now - last, 100);
      last = now;
      setPosition(previous => {
        const next = previous + elapsed * speed / DURATION;
        return next >= steps.length ? (loop ? next % steps.length : steps.length) : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, speed, loop]);
  useEffect(() => { if (position >= steps.length && !loop) setPlaying(false); }, [position, loop]);

  const select = (i: number) => { setPlaying(false); setPosition(i + 0.7); };
  const play = () => { if (position >= steps.length) setPosition(0); setPlaying(p => !p); };
  let points: SmithPoint[] = [];
  let curves: SmithCurve[] = [];
  let readout = `z_L = ${show(zLoad)} · SWR = ${f(swr, 2)}`;
  let chartNote = 'แดง = โหลด · เขียว = จุดปัจจุบัน · วงแหวนโปร่ง = เป้าหมาย';
  const walk = move(zLoad, solution.dLambda * t);
  const total = C(1, solution.yAtStub.im + solution.bStub * t);
  const zTotal = admittance(total);
  if (index === 0) {
    points = [{ z: zLoad, cls: 'load', label: 'z_L = 1.5 − j2' }];
    curves = [{ zs: [C(1, 0), zLoad], cls: 'mid', dashed: true }];
  } else if (index === 1) {
    points = [{ z: zLoad, cls: 'load', label: 'โหลดเดิม' }, { z: move(zLoad, 0.25 * t), cls: 'y', label: t === 1 ? 'y_L = 0.24 + j0.32' : 'จุดช่วยอ่าน' }];
    curves = [{ zs: path(p => move(zLoad, 0.25 * p), t), cls: 'y', arrow: t > 0 }, { zs: [zLoad, C(1, 0), yLoad], cls: 'mid', dashed: true }];
    readout = `หมุนจุดช่วยอ่าน ${f(180 * t, 0)}° / 180° · ไม่ใช่ระยะสาย`;
  } else if (index === 2) {
    points = [{ z: zLoad, cls: 'load', label: 'จุดเดิม: y_L' }];
    readout = 'กริด Y ณ จุดโหลดเดิม: g = 0.24, b = +0.32';
  } else if (index === 3) {
    points = [{ z: zAtStub, cls: 'goal', label: 'เป้าหมาย g = 1' }, { z: zLoad, cls: 'load', label: 'โหลด' }, { z: walk, cls: 'in' }];
    curves = [{ zs: path(p => move(zLoad, solution.dLambda * p), t), cls: 'net', arrow: t > 0 }];
    readout = `d = ${f(solution.dLambda * t, 4)}λ · y = ${show(admittance(walk))}`;
  } else if (index === 4) {
    points = [{ z: zAtStub, cls: 'in', label: `y = 1 + j${b}` }, { z: C(1, 0), cls: 'goal', label: 'เป้าหมาย' }];
    readout = `b สาย = +${b} → ต้องเพิ่ม b สตับ = −${b}`;
  } else if (index === 5) {
    const stub = C(0, Math.tan(2 * Math.PI * solution.lLambda * t));
    points = [{ z: C(0, 0), cls: 'stub', label: 'SHORT' }, { z: admittance(C(0, solution.bStub)), cls: 'goal', label: `b_s = −${b}` }, { z: stub, cls: 'stub' }];
    curves = [{ zs: path(p => C(0, Math.tan(2 * Math.PI * solution.lLambda * p)), t), cls: 'stub', arrow: t > 0 }];
    readout = `l_s = ${f(solution.lLambda * t, 4)}λ · b_s = ${t > 0.0001 ? f(-1 / stub.im) : '−∞ (ที่ SHORT)'}`;
    chartNote = 'ม่วง = อินพุตของสตับ · วงแหวนโปร่ง = ค่า b_s ที่ต้องการ';
  } else {
    const done = index === 7;
    points = [{ z: zAtStub, cls: 'mid', label: 'ก่อนต่อสตับ' }, { z: done ? C(1, 0) : zTotal, cls: 'in', label: done || t === 1 ? 'แมตช์' : 'ผลรวม' }];
    curves = [{ zs: path(p => admittance(C(1, solution.yAtStub.im + solution.bStub * p)), done ? 1 : t), cls: 'y', arrow: done || t > 0 }];
    readout = done ? 'y_in = 1 + j0 · Z_in = 300 Ω · SWR_in = 1' : `ชดเชย ${f(t * 100, 0)}% · y รวม = ${show(total)} · SWR = ${f(swrFromGamma(gammaFromz(zTotal)), 2)}`;
  }

  return <div className="stub-walk" ref={root}>
    <header className="stub-walk-header"><div><p className="stub-eyebrow">EXAMPLE 7–8 · ANIMATED WALKTHROUGH</p><h4>{tr("จากโหลดที่ไม่แมตช์ → สู่จุดกึ่งกลาง")}</h4><p>{tr("Z_L = 450 − j600 Ω · สายและสตับ 300 Ω · 10 MHz")}</p></div><span className="stub-mode">{playing ? '● เล่นอัตโนมัติ' : position >= steps.length ? '✓ เล่นครบแล้ว' : 'Ⅱ หยุดที่เฟรมนี้'}</span></header>
    <div className="stub-controls" role="group" aria-label={tr("ควบคุมภาพเคลื่อนไหว")}>
      <button type="button" className="btn primary" onClick={play}>{playing ? 'Ⅱ หยุดชั่วคราว' : position >= steps.length ? '▶ เล่นอีกครั้ง' : '▶ เล่นต่อ'}</button>
      <button type="button" className="btn" onClick={() => { setPosition(0); setPlaying(true); }}>{tr("↺ เริ่มใหม่")}</button>
      <button type="button" className="btn" disabled={index === 0} onClick={() => select(index - 1)}>{tr("← ก่อนหน้า")}</button>
      <button type="button" className="btn" disabled={index === steps.length - 1} onClick={() => select(index + 1)}>{tr("ถัดไป →")}</button>
      <label>{tr("ความเร็ว")} <select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label={tr("ความเร็วการเล่น")}>{[0.5, 1, 1.5, 2].map(s => <option key={s} value={s}>{s}×</option>)}</select></label>
      <label><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} /> {tr("วนซ้ำ")}</label>
    </div>
    <div className="stub-timeline"><label htmlFor="stub-frame-slider">{tr("เลือกเฟรมละเอียด")} <span>{tr("ขั้น")} {index + 1}/{steps.length} · {f(progress * 100, 0)}%</span></label><input id="stub-frame-slider" type="range" min="0" max={steps.length} step="0.001" value={position} aria-valuetext={`ขั้น ${index + 1}: ${step.short}, ${f(progress * 100, 0)} เปอร์เซ็นต์`} onChange={e => { setPlaying(false); setPosition(Number(e.target.value)); }} /><p>{tr("กดชื่อขั้นเพื่อดูภาพปลายทาง หรือลากแถบเพื่อดูระหว่างการเคลื่อนที่ · 14 วินาทีต่อขั้นที่ความเร็ว 1×")}</p></div>
    <nav className="stub-steps" aria-label={tr("เลือกขั้นของ Example 7-8")}>{steps.map((s, i) => <button type="button" key={s.short} aria-current={index === i ? 'step' : undefined} onClick={() => select(i)}><span>{i < index ? '✓' : i + 1}</span>{s.short}</button>)}</nav>
    <div className="stub-stage">
      <div className="stub-visual"><div className="stub-chart-tag">{index === 1 ? 'กริด Z · จุดช่วยอ่าน Y' : index >= 2 ? 'พิกัด Γ จริง · อ่านกริด Y' : 'พิกัด Γ จริง · อ่านกริด Z'}</div><SmithFigure
        points={points} curves={curves} showY={index >= 2} swr={index <= 4 ? [swr] : undefined}
        rCircles={index === 0 ? [zLoad.re] : undefined} xCircles={index === 0 ? [zLoad.im] : undefined}
        gCircles={index >= 2 && index !== 5 ? [1] : undefined} bCircles={index === 5 && t > 0.98 ? [solution.bStub] : undefined}
      /><div className="stub-live-value" data-testid="stub-readout">{readout}</div><p className="stub-legend">{chartNote}</p>
      </div>
      <article className="stub-explanation" aria-label={tr("คำอธิบายขั้นปัจจุบัน")}><p className="stub-eyebrow">{step.tag}</p><h4 aria-live="polite">{step.title}</h4><Tex block tex={step.formula} />{step.paragraphs.map(p => <p key={p}>{p}</p>)}
        {index === 3 && <p className="stub-scale-note">{tr("สเกล WTG ในพิกัดนี้:")} {f(wtgFromGamma(gammaFromz(zLoad)), 4)}λ → {f(wtgFromGamma(gammaFromz(zAtStub)), 4)}{tr("λ · ถ้าผ่าน 0 ให้บวก 0.5λ ก่อนลบ")}</p>}
        <div className="stub-takeaway"><strong>{tr("สิ่งที่ได้จากขั้นนี้")}</strong><p>{step.takeaway}</p></div>
      </article>
    </div>
    <div className="stub-circuit"><div className="stub-circuit-title">{tr("ตำแหน่งในวงจรจริง")} <span>{tr("แผนภาพไม่ใช่มาตราส่วนความยาว")}</span></div><svg viewBox="0 0 740 172" role="img" aria-label={tr("เครื่องส่ง ต่อผ่านจุดต่อสตับและสายหลักระยะ d ไปยังโหลด สตับปลายลัดยาว l_s ต่อขนานที่จุดนั้น")}>
      <path d="M85 63H650 M85 108H650" stroke="#64748b" strokeWidth="3" fill="none" />
      <rect x="22" y="43" width="110" height="86" rx="10" fill="#eff6ff" stroke="#3b82f6" /><text x="77" y="76" textAnchor="middle">Generator</text><text x="77" y="99" textAnchor="middle">300 Ω</text>
      <rect x="590" y="43" width="132" height="86" rx="10" fill="#fff1f2" stroke="#ef4444" /><text x="656" y="76" textAnchor="middle">{tr("โหลด Z_L")}</text><text x="656" y="99" textAnchor="middle">450 − j600 Ω</text>
      <path d="M290 63V150H312V108" fill="none" stroke={index >= 5 ? '#9333ea' : '#cbd5e1'} strokeWidth="4" strokeDasharray={index < 5 ? '5 4' : undefined} />
      <circle cx="290" cy="63" r="6" fill={index >= 3 ? '#16a34a' : '#64748b'} /><text x="434" y="30" textAnchor="middle">{index >= 3 ? `← d = ${f(solution.dLambda, 4)}λ →` : '← ระยะ d จากโหลด →'}</text>
      <text x="325" y="149" fill="#7e22ce">{index >= 5 ? `l_s = ${f(solution.lLambda, 4)}λ · SHORT` : 'ตำแหน่งที่จะต่อสตับ'}</text>
      {index >= 6 && <text x="208" y="30" textAnchor="middle" fill="#15803d">{index === 7 || t === 1 ? 'SWR = 1' : 'กำลังชดเชย'}</text>}
      {index === 3 && <circle cx={590 - 300 * t} cy="63" r="7" fill="#16a34a" stroke="white" strokeWidth="2" />}
    </svg></div>
    <p className="stub-footnote">{tr("แบบจำลองสายและสตับไร้การสูญเสีย · เล่นเมื่อส่วนนี้อยู่ในจอ และพักเมื่อเลื่อนออก · ผู้ที่ตั้งค่าลดการเคลื่อนไหวสามารถกดเล่นเองได้")}</p>
  </div>;
};
