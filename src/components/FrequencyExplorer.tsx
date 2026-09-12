import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { C, fmtNum } from '../engine/complex';
import { admittance, gammaFromz, normalize, rotateTowardGenerator, swrFromGamma, zFromGamma } from '../engine/rf';
import { FREQUENCY_EXAMPLES, FREQUENCY_MAX, FREQUENCY_MIN, FrequencyExample, frequencyBand, frequencySample } from '../engine/frequencyExplorer';
import { SmithFigure } from './SmithFigure';
import { FrequencyExplanation, FREQUENCY_READING_STEPS } from './FrequencyExplanation';

const f = (n: number, digits = 2) => fmtNum(n, digits);
const views = ['คลื่นและสาย', 'จุดแมตช์บนกราฟ', 'ช่วง Bandwidth'];
const wave = (lambda: number, y: number) => Array.from({ length: 301 }, (_, i) => {
  const metres = i / 5;
  return `${60 + metres * 10},${y - 23 * Math.cos(2 * Math.PI * metres / lambda)}`;
}).join(' ');

export const FrequencyExplorer: React.FC = () => {
  const uid = useId();
  const root = useRef<HTMLDivElement>(null);
  const direction = useRef(1);
  const [mhz, setMhz] = useState(10);
  const [example, setExample] = useState<FrequencyExample>('ex78');
  const [view, setView] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [readingStep, setReadingStep] = useState<number | null>(0);
  const [visible, setVisible] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [limit, setLimit] = useState(2);
  const sample = frequencySample(example, mhz);
  const design = FREQUENCY_EXAMPLES[example];
  const reference = frequencySample(example, 10);
  const band = useMemo(() => frequencyBand(example, limit), [example, limit]);
  const sweep = useMemo(() => Array.from({ length: 301 }, (_, i) => frequencySample(example, 8 + i / 50)), [example]);
  const inBand = sample.swr <= limit;
  const change = (mhz / 10 - 1) * 100;
  const setFrequency = (value: number) => { setPlaying(false); setMhz(value); setReadingStep(null); };
  const changeView = (value: number) => { setView(value); setPlaying(false); setReadingStep(null); };
  const chooseReadingStep = (index: number) => {
    const selected = FREQUENCY_READING_STEPS[index];
    setPlaying(false); setReadingStep(index); setExample(selected.example);
    setMhz(selected.mhz); setView(selected.view); setLimit(2); direction.current = 1;
  };
  const reading = readingStep === null ? null : FREQUENCY_READING_STEPS[readingStep];

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    let frame = 0, previous = performance.now();
    const tick = (now: number) => {
      const elapsed = document.hidden ? 0 : Math.min(100, now - previous);
      previous = now;
      const delta = elapsed * speed / 4000 * direction.current;
      setMhz(current => Math.max(FREQUENCY_MIN, Math.min(FREQUENCY_MAX, current + delta)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible, speed]);
  useEffect(() => {
    if (mhz >= FREQUENCY_MAX) direction.current = -1;
    if (mhz <= FREQUENCY_MIN) direction.current = 1;
  }, [mhz]);

  const gLoad = gammaFromz(normalize(design.load, 300));
  const linePath = Array.from({ length: 71 }, (_, i) => zFromGamma(rotateTowardGenerator(gLoad, sample.d * i / 70)));
  const stubPath = Array.from({ length: 71 }, (_, i) => admittance(C(sample.yLine.re, sample.yLine.im + sample.yStub.im * i / 70)));
  const yMax = Math.ceil(Math.max(3, ...sweep.map(p => p.swr)));
  const xOf = (x: number) => 58 + (x - 8) / 6 * 594;
  const yOf = (y: number) => 240 - (y - 1) / (yMax - 1) * 204;

  return <div className="frequency-explorer" ref={root}>
    <header className="fx-header"><div><p className="fx-eyebrow">FREQUENCY LAB · ลองเปลี่ยนความถี่</p><h3>สายเส้นเดิม แต่จุดแมตช์เปลี่ยนไป</h3><p>เริ่มอ่านทีละขั้น ภาพจะหยุดให้ดู · พร้อมแล้วค่อยลองเล่นอัตโนมัติ</p></div><span className="fx-badge">{playing ? '● กำลังกวาดความถี่' : 'Ⅱ หยุดเพื่อดูค่า'}</span></header>
    <section className="fx-reading" aria-label="พาอ่านบทที่ 10 ทีละขั้น">
      <div className="fx-reading-heading"><strong>{reading ? `พาอ่านทีละขั้น · ${(readingStep ?? 0) + 1} / ${FREQUENCY_READING_STEPS.length}` : 'กำลังทดลองอิสระ'}</strong><button className="btn small" type="button" onClick={() => chooseReadingStep(0)}>↺ เริ่มอ่านตั้งแต่ต้น</button></div>
      <div className="fx-reading-nav" role="group" aria-label="เลือกขั้นพาอ่าน">{FREQUENCY_READING_STEPS.map((item, index) => <button key={item.title} type="button" aria-current={readingStep === index ? 'step' : undefined} aria-label={`ขั้น ${index + 1}: ${item.title}`} onClick={() => chooseReadingStep(index)}>{index + 1}</button>)}</div>
      {reading ? <><h4 aria-live="polite">{reading.title}</h4><p><b>มองตรงนี้:</b> {reading.look}</p><p><b>ภาพกำลังบอกว่า:</b> {reading.meaning}</p><div className="fx-reading-actions"><button className="btn" type="button" disabled={readingStep === 0} onClick={() => chooseReadingStep((readingStep ?? 0) - 1)}>← ย้อนหนึ่งขั้น</button><span>อ่านคำอธิบายข้างภาพ แล้วค่อยกดขั้นถัดไป</span><button className="btn primary" type="button" disabled={readingStep === FREQUENCY_READING_STEPS.length - 1} onClick={() => chooseReadingStep((readingStep ?? 0) + 1)}>ขั้นถัดไป →</button></div></> : <p>คุณเปลี่ยนค่าได้เองทุกตัว หรือกดเลขขั้นเพื่อกลับมาดูตัวอย่างพร้อมคำอธิบาย ภาพจะหยุดให้อ่านเมื่อเลือกขั้น</p>}
    </section>
    <details className="fx-glossary"><summary>จำสัญลักษณ์ไม่ได้? เปิดคำแปลที่ใช้ในบทนี้</summary><dl><div><dt>f · MHz</dt><dd>ความถี่ หรือจำนวนรอบต่อวินาที · 1 MHz = หนึ่งล้านรอบต่อวินาที</dd></div><div><dt>λ · เมตร</dt><dd>ระยะทางของคลื่นหนึ่งรอบ จากยอดหนึ่งถึงยอดถัดไป</dd></div><div><dt>d และ lₛ</dt><dd>d คือระยะจากโหลดถึงจุดต่อสตับ ส่วน lₛ คือความยาวแขนงสตับจากจุดต่อถึงปลายลัด</dd></div><div><dt>y = g + jb</dt><dd>แอดมิตแตนซ์ปกติ ใช้บวกแขนงขนาน · g คือส่วนจริง b คือส่วนจินตภาพ และ j ระบุแกนจินตภาพ</dd></div><div><dt>Γ · SWR</dt><dd>Γ คือสัมประสิทธิ์การสะท้อน ส่วน SWR วัดอัตราส่วนแรงดันสูงสุดต่อแรงดันต่ำสุด · เมื่อแมตช์พอดี Γ = 0 และ SWR = 1</dd></div></dl></details>
    <div className="fx-controls">
      <label>วงจร <select aria-label="วงจรสำหรับทดลองความถี่" value={example} onChange={e => { setExample(e.target.value as FrequencyExample); setFrequency(10); direction.current = 1; }}><option value="ex78">Example 7-8 · 450 − j600 Ω</option><option value="ex710">Example 7-10 · 200 Ω</option></select></label>
      <button className="btn primary" type="button" onClick={() => { setReadingStep(null); setPlaying(p => !p); }}>{playing ? 'Ⅱ หยุดชั่วคราว' : '▶ เล่นอัตโนมัติ'}</button>
      <label>ความเร็ว <select aria-label="ความเร็วการกวาดความถี่" value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[0.5, 1, 2].map(s => <option key={s} value={s}>{s}×</option>)}</select></label>
    </div>
    <div className="fx-frequency"><label htmlFor={`${uid}-frequency`}>ความถี่ขณะนี้ <strong data-testid="frequency-value">{f(mhz)} MHz</strong><span>{change >= 0 ? '+' : ''}{f(change, 1)}% จากความถี่ออกแบบ</span></label><input id={`${uid}-frequency`} type="range" min="8" max="14" step="0.01" value={mhz} onChange={e => setFrequency(Number(e.target.value))} aria-label="ปรับความถี่ MHz" /><div className="fx-presets">{[8, 10, 11, 12, 14].map(value => <button type="button" key={value} aria-pressed={Math.abs(mhz - value) < 0.005} onClick={() => setFrequency(value)}>{value} MHz{value === 10 ? ' · ออกแบบ' : value === 11 ? ' · +10%' : value === 12 ? ' · +20%' : ''}</button>)}</div></div>
    <div className="fx-metrics">
      <div><small>ความยาวคลื่น λ</small><strong>{f(sample.wavelength)} <em>m</em></strong><span>ที่ 10 MHz: 30 m</span></div>
      <div><small>ระยะถึงสตับ d</small><strong>{f(sample.d, 4)} <em>λ</em></strong><span>สายจริง {f(design.d0 * 30, 3)} m คงที่</span></div>
      <div><small>ความยาวสตับ lₛ</small><strong>{f(sample.ls, 4)} <em>λ</em></strong><span>สายจริง {f(design.l0 * 30, 3)} m คงที่</span></div>
      <div className={inBand ? 'fx-good' : 'fx-outside'}><small>SWR ฝั่งเครื่องส่ง</small><strong data-testid="frequency-swr">{f(sample.swr, 3)}</strong><span>กำลังสะท้อน {f(sample.reflectedPercent)}%</span></div>
    </div>
    <nav className="fx-views" aria-label="เลือกมุมมองผลของความถี่">{views.map((name, i) => <button key={name} type="button" aria-pressed={view === i} onClick={() => changeView(i)}><span>{i + 1}</span>{name}</button>)}</nav>
    <div className="fx-panel">
      {view === 0 && <div className="fx-split"><div className="fx-graphic"><h4>ไม้บรรทัดเดิม 60 เมตร · คลื่นแน่นขึ้นเมื่อ f สูงขึ้น</h4><svg viewBox="0 0 700 270" role="img" aria-label={`เปรียบเทียบคลื่นที่ 10 MHz ยาว 30 เมตร กับ ${f(mhz)} MHz ยาว ${f(sample.wavelength)} เมตร บนแกนระยะเดียวกัน`}>
        {[0, 10, 20, 30, 40, 50, 60].map(m => <g key={m}><line x1={60 + m * 10} x2={60 + m * 10} y1="36" y2="233" stroke="#e2e8f0" /><text x={60 + m * 10} y="253" textAnchor="middle">{m} m</text></g>)}
        <text x="60" y="23" className="fx-svg-heading">อ้างอิง 10 MHz · λ₀ = 30 m</text><polyline points={wave(30, 85)} fill="none" stroke="#94a3b8" strokeWidth="3" />
        <path d="M60 46V39H360V46" fill="none" stroke="#94a3b8" strokeWidth="2" /><text x="210" y="56" textAnchor="middle">1 λ₀</text>
        <text x="60" y="145" className="fx-svg-heading">ขณะนี้ {f(mhz)} MHz · λ = {f(sample.wavelength)} m</text><polyline points={wave(sample.wavelength, 205)} fill="none" stroke="#0f766e" strokeWidth="3" />
        <path d={`M60 167V160H${60 + sample.wavelength * 10}V167`} fill="none" stroke="#0f766e" strokeWidth="2" /><text x={60 + sample.wavelength * 5} y="177" textAnchor="middle">1 λ</text>
      </svg><p className="fx-caption">ภาพรูปคลื่น ณ เฟสอ้างอิงเดียวกัน · แกนนอนคือระยะทาง ไม่ใช่เวลา</p>
      <div className="fx-fixed-circuit"><h4>ส่วนไหนของวงจรที่วัดเป็น d และ lₛ?</h4><svg viewBox="0 0 640 200" role="img" aria-label={`จากเครื่องส่งผ่านจุดต่อสตับ ไปตามสายหลักระยะ ${f(design.d0 * 30, 3)} เมตรถึงโหลด แขนงสตับยาว ${f(design.l0 * 30, 3)} เมตร`}><path d="M125 70H540 M125 110H540" stroke="#64748b" strokeWidth="3" /><rect x="10" y="50" width="120" height="80" rx="9" fill="#eff6ff" stroke="#3b82f6" /><text x="70" y="84" textAnchor="middle">เครื่องส่ง</text><text x="70" y="108" textAnchor="middle">มองเข้า →</text><rect x="510" y="50" width="110" height="80" rx="9" fill="#fff1f2" stroke="#ef4444" /><text x="565" y="94" textAnchor="middle">โหลดเดิม</text><path d="M250 70V174H272V110" stroke="#0f766e" strokeWidth="4" fill="none" /><circle cx="250" cy="70" r="6" fill="#0f766e" /><text x="385" y="35" textAnchor="middle">← d = {f(design.d0 * 30, 3)} m →</text><text x="288" y="166">lₛ = {f(design.l0 * 30, 3)} m</text><text x="250" y="196" textAnchor="middle">ปลายลัด</text></svg><p className="fx-caption">ความยาวจริงทั้งสองเส้นคงที่ · ภาพวงจรแสดงการต่อ ไม่ได้วาดตามมาตราส่วน</p></div>
      <div className="fx-lengths"><h4>เส้นประ = ที่ 10 MHz · แถบสี = ความยาวไฟฟ้าขณะนี้</h4>{[{name: 'สายหลัก d', base: design.d0, value: sample.d}, {name: 'สตับ lₛ', base: design.l0, value: sample.ls}].map((item, i) => <div className="fx-length" key={item.name}><div><span>{item.name}</span><strong>{f(item.value, 4)}λ = {f(item.value * 360, 1)}°</strong></div><div className={`fx-length-track tone-${i}`}><span style={{width: `${item.value / 0.5 * 100}%`}} /><i style={{left: `${item.base / 0.5 * 100}%`}} /></div></div>)}<div className="fx-ruler"><span>0</span><span>0.25λ</span><span>0.5λ</span></div></div></div>
      <FrequencyExplanation view={0} mhz={mhz} example={example} limit={limit} guided={readingStep !== null} onView={changeView} onLimit={value => { setLimit(value); setReadingStep(null); }} /></div>}
      {view === 1 && <div className="fx-split"><div className="fx-graphic"><h4>วงจรเดิม ณ {f(mhz)} MHz</h4><SmithFigure showY gCircles={[1]} swr={[swrFromGamma(gLoad)]}
        points={[{z: normalize(design.load, 300), cls: 'load', label: 'โหลด'}, {z: sample.zLine, cls: 'mid', label: 'ก่อนสตับ'}, {z: sample.zTotal, cls: 'in', label: 'หลังสตับ'}, {z: reference.zTotal, cls: 'goal'}]}
        curves={[{zs: linePath, cls: 'net', arrow: true}, {zs: stubPath, cls: 'y', arrow: true}]}
      /><div className="fx-legend"><span>ม่วง: เดินบนสายหลัก</span><span>เขียวอมฟ้า: ต่อสตับขนาน</span><span>วงแหวนโปร่ง: ผลที่ 10 MHz</span></div><p className="fx-caption">เส้นทางแสดงการประกอบวงจรที่ความถี่ปัจจุบัน · จุดเขียวคืออิมพีแดนซ์รวมที่เครื่องส่งเห็น</p></div>
      <FrequencyExplanation view={1} mhz={mhz} example={example} limit={limit} guided={readingStep !== null} onView={changeView} onLimit={value => { setLimit(value); setReadingStep(null); }} /></div>}
      {view === 2 && <div className="fx-split"><div className="fx-graphic"><h4>แถบเขียว = ช่วงที่ SWR ≤ {limit}</h4><svg viewBox="0 0 700 300" role="img" aria-label={`กราฟ SWR ตามความถี่ เกณฑ์ ${limit} ช่วงที่ผ่านในหน้าต่างนี้ ${f(band.low)} ถึง ${f(band.high)} MHz`}>
        <rect x={xOf(band.low)} y="36" width={xOf(band.high) - xOf(band.low)} height="204" fill="#dcfce7" />
        {[8, 9, 10, 11, 12, 13, 14].map(x => <g key={x}><line x1={xOf(x)} x2={xOf(x)} y1="36" y2="240" stroke="#e2e8f0" /><text x={xOf(x)} y="262" textAnchor="middle">{x}</text></g>)}
        {[1, 2, ...Array.from({length: yMax - 2}, (_, i) => i + 3)].map(y => <g key={y}><line x1="58" x2="652" y1={yOf(y)} y2={yOf(y)} stroke="#e2e8f0" /><text x="45" y={yOf(y) + 4} textAnchor="end">{y}</text></g>)}
        <text x="58" y="22" className="fx-svg-heading">SWR</text><text x="355" y="290" textAnchor="middle">ความถี่ (MHz)</text>
        <line x1="58" x2="652" y1={yOf(limit)} y2={yOf(limit)} stroke="#d97706" strokeWidth="2" strokeDasharray="6 4" />
        <polyline points={sweep.map(p => `${xOf(p.mhz)},${yOf(p.swr)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="3" />
        <line x1={xOf(mhz)} x2={xOf(mhz)} y1="36" y2="240" stroke="#0f766e" strokeDasharray="4 4" /><circle cx={xOf(mhz)} cy={yOf(sample.swr)} r="6" fill={inBand ? '#15803d' : '#b45309'} stroke="white" strokeWidth="2" />
        <text x={Math.max(125, Math.min(575, xOf(mhz)))} y="18" textAnchor="middle">{f(mhz)} MHz · SWR {f(sample.swr)}</text>
      </svg><div className="fx-band-range"><span>{band.lowClipped ? '≤ ' : ''}{f(band.low)} MHz</span><strong>{band.lowClipped || band.highClipped ? 'ช่วงที่เห็นในกราฟ' : `Bandwidth ${f(band.high - band.low)} MHz`}</strong><span>{band.highClipped ? '≥ ' : ''}{f(band.high)} MHz</span></div><p className="fx-caption">{band.lowClipped || band.highClipped ? 'ช่วงที่ผ่านเกณฑ์ยาวออกนอกกราฟ 8–14 MHz จึงยังระบุ bandwidth เต็มจากหน้าต่างนี้ไม่ได้' : 'ขอบซ้ายและขอบขวาคือจุดที่กราฟตัดเกณฑ์ SWR · ระยะระหว่างขอบคือ bandwidth'}</p></div>
      <FrequencyExplanation view={2} mhz={mhz} example={example} limit={limit} guided={readingStep !== null} onView={changeView} onLimit={value => { setLimit(value); setReadingStep(null); }} /></div>}
    </div>
    {readingStep !== null && <div className="fx-reading-bottom"><span>อ่านขั้น {readingStep + 1} แล้ว · {readingStep === FREQUENCY_READING_STEPS.length - 1 ? 'ครบทั้ง 6 ขั้น ลองปรับค่าด้วยตัวเองได้เลย' : 'ไปต่อเมื่อพร้อม ภาพขั้นถัดไปจะหยุดให้อ่าน'}</span><button className="btn primary" type="button" onClick={() => { chooseReadingStep(readingStep === FREQUENCY_READING_STEPS.length - 1 ? 0 : readingStep + 1); root.current?.querySelector('.fx-reading')?.scrollIntoView({block: 'start', behavior: 'instant'}); }}>{readingStep === FREQUENCY_READING_STEPS.length - 1 ? 'ทบทวนตั้งแต่ต้น' : 'อ่านขั้นถัดไป →'}</button></div>}
    <footer className="fx-footnote">ใช้สายไร้การสูญเสีย v = 3 × 10⁸ m/s และคงค่าโหลด, Z₀ = 300 Ω, ความยาวจริงไว้ เพื่อแยกผลของความถี่{example === 'ex78' ? ` · Example 7-8 ใช้ความยาวปัดตามหนังสือ จึงได้ SWR ที่ 10 MHz = ${f(reference.swr, 3)} (ใกล้ 1)` : ' · Example 7-10 ใช้ความยาวที่คำนวณโดยไม่ปัดเศษ'} · การเล่นอัตโนมัติกวาดไปกลับ 8–14 MHz และพักเมื่อเลื่อนออกจากภาพ</footer>
  </div>;
};
