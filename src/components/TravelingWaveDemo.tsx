import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Complex, abs, fmtNum } from '../engine/complex';
import { voltageWaveSample } from '../engine/voltageWaves';

const TAU = 2 * Math.PI;
const SAMPLE_COUNT = 192;

interface PictureProps {
  gamma: Complex;
  phase: number;
  showTotal: boolean;
  showEnvelope: boolean;
}

/** Separate lanes are views of the same physical line, with the same voltage scale. */
export const VoltageWavePicture: React.FC<PictureProps> = ({ gamma, phase, showTotal, showEnvelope }) => {
  const id = useId();
  const matched = abs(gamma) < 1e-10;
  const samples = Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => {
    const x = i / SAMPLE_COUNT;
    return { x: 44 + x * 552, ...voltageWaveSample(gamma, 1 - x, phase) };
  });
  const lanes = [
    { key: 'incident' as const, y: 126, title: '1. คลื่นไปหาโหลด →', cls: 'incident' },
    { key: 'reflected' as const, y: 292, title: matched ? '2. ไม่มีคลื่นสะท้อน' : '2. คลื่นสะท้อนกลับ ←', cls: 'reflected' },
    ...(showTotal ? [{ key: 'total' as const, y: 458, title: '3. แรงดันรวม = คลื่นไป + คลื่นกลับ', cls: 'total' }] : []),
  ];
  const points = (key: 'incident' | 'reflected' | 'total' | 'envelope', y: number, sign = 1) =>
    samples.map(p => `${p.x.toFixed(2)},${(y - sign * p[key] * 30).toFixed(2)}`).join(' ');
  const height = showTotal ? 582 : 416;
  // Follow one crest per wave; these dots travel along the line rather than bobbing in place.
  const cycle = phase / TAU;
  const forwardX = ((cycle % 1) + 1) % 1;
  const backwardX = (((-phase - Math.atan2(gamma.im, gamma.re)) / TAU % 1) + 1) % 1;
  return <svg className="tw-svg" viewBox={`0 0 640 ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>คลื่นแรงดันเดินไปทางโหลดและสะท้อนกลับบนสายเดียวกัน</title>
    <desc id={`${id}-desc`}>{`ซ้ายคือเครื่องส่ง ขวาคือโหลด สเกลแรงดันทั้งสามแถวเท่ากัน ${matched ? 'โหลดแมตช์จึงไม่มีคลื่นสะท้อน' : `แอมพลิจูดคลื่นสะท้อนเป็น ${fmtNum(abs(gamma) * 100, 1)} เปอร์เซ็นต์ของคลื่นไป`}`}</desc>
    {lanes.map(lane => <g key={lane.key} className={`tw-lane ${lane.cls}`}>
      <text x="44" y={lane.y - 83} className="tw-lane-title">{lane.title}</text>
      <rect x="44" y={lane.y - 66} width="552" height="132" rx="8" className="tw-lane-bg" />
      {[0, 0.25, 0.5, 0.75, 1].map(x => <line key={x} x1={44 + x * 552} y1={lane.y - 66} x2={44 + x * 552} y2={lane.y + 66} className="tw-grid" />)}
      <line x1="44" x2="596" y1={lane.y} y2={lane.y} className="tw-zero" />
      <text x="35" y={lane.y + 4} textAnchor="end" className="tw-axis-label">0</text>
      {[-1, 1].map(value => <g key={value}>
        <line x1="44" x2="596" y1={lane.y - value * 30} y2={lane.y - value * 30} className="tw-grid" />
        <text x="35" y={lane.y - value * 30 + 4} textAnchor="end" className="tw-axis-label">{value > 0 ? '+1' : '−1'}</text>
      </g>)}
      {lane.key === 'total' && showEnvelope && <g className="tw-envelope">
        <polyline points={points('envelope', lane.y)} />
        <polyline points={points('envelope', lane.y, -1)} />
      </g>}
      {!(lane.key === 'reflected' && matched) && <polyline points={points(lane.key, lane.y)} className="tw-wave" />}
      {lane.key === 'reflected' && matched && <text x="320" y={lane.y - 12} textAnchor="middle" className="tw-no-reflection">แอมพลิจูดเป็นศูนย์</text>}
      {lane.key === 'incident' && <circle cx={44 + forwardX * 552} cy={lane.y - 30} r="5" className="tw-crest" />}
      {lane.key === 'reflected' && !matched && <circle cx={44 + backwardX * 552} cy={lane.y - abs(gamma) * 30} r="5" className="tw-crest" />}
    </g>)}
    <text x="44" y={height - 26} className="tw-endpoint">เครื่องส่ง</text>
    <text x="596" y={height - 26} textAnchor="end" className="tw-endpoint">โหลด</text>
    <text x="320" y={height - 5} textAnchor="middle" className="tw-axis-label">ตำแหน่งบนสายช่วงยาว 1 λ · ขึ้น–ลงคือแรงดัน</text>
  </svg>;
};

export const TravelingWaveDemo: React.FC<{ gamma: Complex; loadLabel: string }> = ({ gamma, loadLabel }) => {
  const [playing, setPlaying] = useState(() => typeof window !== 'undefined'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [speed, setSpeed] = useState(1);
  const [showTotal, setShowTotal] = useState(false);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [phase, setPhase] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const phaseRef = useRef(0);
  const container = useRef<HTMLDivElement>(null);
  const id = useId();
  const matched = abs(gamma) < 1e-10;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduceMotion = () => { if (media.matches) setPlaying(false); };
    const visibility = () => setPageVisible(!document.hidden);
    media.addEventListener('change', reduceMotion);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(
      entries => setOnScreen(entries[0]?.isIntersecting ?? false),
    );
    if (container.current) observer?.observe(container.current);
    return () => {
      media.removeEventListener('change', reduceMotion);
      document.removeEventListener('visibilitychange', visibility);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!playing || !onScreen || !pageVisible) return;
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous === null) previous = now;
      const elapsed = now - previous;
      if (elapsed >= 1000 / 30) {
        // Normal speed: one period per 4 seconds. Cap elapsed after a stalled frame.
        phaseRef.current = (phaseRef.current + Math.min(elapsed, 100) / 1000 * TAU * speed / 4) % TAU;
        setPhase(phaseRef.current);
        previous = now;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, speed, onScreen, pageVisible]);

  const movePhase = (next: number) => {
    setPlaying(false);
    phaseRef.current = next % TAU;
    setPhase(phaseRef.current);
  };
  // Feedback stays stable while the wave picture animates.
  const feedback = useMemo(() => matched
    ? 'ตอนนี้โหลดแมตช์: เส้นส้มไม่มีคลื่น เหลือเพียงคลื่นสีน้ำเงินเดินไปทางขวา'
    : 'ตามจุดบนยอดคลื่น: สีน้ำเงินเดินไปทางขวา ส่วนสีส้มเดินกลับทางซ้าย ยอดสีส้มยิ่งเล็กแปลว่าสะท้อนน้อย', [matched]);

  return <div className="traveling-wave-demo" ref={container}>
    <div className="tw-heading"><div><h5>ดูคลื่นเคลื่อนไหวบนสาย</h5><p>สาย 50 Ω → โหลด {loadLabel}</p></div><span className={`tw-status ${playing ? 'playing' : ''}`}>{playing ? 'กำลังเล่น' : 'หยุดภาพ'}</span></div>
    <div className="tw-controls">
      <button type="button" onClick={() => setPlaying(value => !value)}>{playing ? 'Ⅱ หยุดภาพ' : '▶ เล่นคลื่น'}</button>
      <button type="button" onClick={() => movePhase(phaseRef.current + TAU / 16)}>ทีละจังหวะ →</button>
      <button type="button" onClick={() => movePhase(0)}>กลับจังหวะเริ่ม</button>
      <label>ความเร็วภาพ<select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={0.25}>ช้ามาก · 0.25×</option><option value={0.5}>ช้า · 0.5×</option><option value={1}>ปกติ · 1×</option><option value={2}>เร็ว · 2×</option></select></label>
    </div>
    <div className="tw-options">
      <label><input type="checkbox" checked={showTotal} onChange={e => setShowTotal(e.target.checked)} aria-controls={`${id}-picture`} /> ดูคลื่นรวมด้วย</label>
      {showTotal && <label><input type="checkbox" checked={showEnvelope} onChange={e => setShowEnvelope(e.target.checked)} /> แสดงกรอบขนาดคลื่นรวม</label>}
    </div>
    <div id={`${id}-picture`}><VoltageWavePicture gamma={gamma} phase={phase} showTotal={showTotal} showEnvelope={showEnvelope} /></div>
    <p className="tw-feedback" aria-live="polite">{feedback}</p>
    {showTotal && <p>{matched ? 'เมื่อไม่มีคลื่นสะท้อน คลื่นรวมเหมือนคลื่นไป และกรอบขนาดแรงดันราบเท่ากันตลอดสาย' : 'คลื่นสองทิศบวกกันเป็นแรงดันรวมสีเขียว เส้นประเป็นกรอบขนาดแรงดัน จุดที่กรอบสูงและต่ำอยู่ที่เดิม แม้แรงดัน ณ แต่ละจุดยังแกว่งตามเวลา — นี่คือรูปแบบคลื่นนิ่งเมื่อมีการสะท้อน'}</p>}
    <details className="tw-reading"><summary>วิธีอ่านภาพนี้</summary>
      <p>ทั้งสามแถวเป็นแรงดันบนสายเส้นเดียวกัน แยกภาพเพื่อให้ตามคลื่นทัน เส้นโค้งขึ้น–ลงแทนแรงดัน ณ ขณะนั้น ตัวสายไม่ได้ขยับตามเส้น และจุดบนยอดคลื่นใช้ติดตามทิศการเคลื่อนของยอด</p>
      <p>ทุกแถวใช้สเกลเดียวกัน ตั้งแอมพลิจูดคลื่นไปเป็น 1 คลื่นกลับมีแอมพลิจูด {fmtNum(abs(gamma), 3)} เท่า และมีกำลังสะท้อนประมาณ {fmtNum(abs(gamma) ** 2 * 100, 1)}% จึงไม่ควรอ่านเปอร์เซ็นต์กำลังจากความสูงของคลื่นโดยตรง</p>
      <p>ภาพนี้เป็นคลื่นไซน์ต่อเนื่องหลังระบบอยู่ตัวบนสายไร้การสูญเสีย การเปลี่ยนโหลดจะแสดงสภาพอยู่ตัวของโหลดใหม่ ความเร็วภาพถูกลดลงเพื่อการเรียนรู้ ปุ่มความเร็วไม่เปลี่ยนความถี่หรือค่า SWR ของวงจร</p>
      <p>หลักการ: <a href="https://eng.libretexts.org/Bookshelves/Electrical_Engineering/Electro-Optics/Book%3A_Electromagnetics_I_%28Ellingson%29/03%3A_Transmission_Lines/3.12%3A_Voltage_Reflection_Coefficient" target="_blank" rel="noreferrer">คลื่นเดินหน้าและคลื่นสะท้อน — Electromagnetics I</a></p>
    </details>
  </div>;
};
