import React, { useState } from 'react';
import { useAppState, useDispatch, useDerived, Marker } from '../state/store';
import { Complex, abs, arg, deg, fmtNum, isFiniteC } from '../engine/complex';
import { gammaFromz, admittance, swrFromGamma, wtgFromGamma, returnLossDb } from '../engine/rf';

const fz = (z: Complex, d = 3) => (isFiniteC(z) ? `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}` : '∞');

/** read-out for one marker */
const info = (m: Marker, Z0: number) => {
  const z: Complex = { re: m.re, im: m.im };
  const g = gammaFromz(z);
  const y = admittance(z);
  return {
    z,
    y,
    g,
    Z: { re: m.re * Z0, im: m.im * Z0 },
    swr: swrFromGamma(g),
    rl: returnLossDb(g),
    wtg: wtgFromGamma(g),
    outside: !(abs(g) <= 1.0001),
  };
};

const Num: React.FC<{ value: number; onChange: (v: number) => void; step?: number; width?: number }> = ({ value, onChange, step = 0.05, width = 68 }) => {
  const [text, setText] = useState(String(Number(value.toPrecision(4))));
  React.useEffect(() => setText(String(Number(value.toPrecision(4)))), [value]);
  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v)) onChange(v);
    else setText(String(Number(value.toPrecision(4))));
  };
  return (
    <input
      type="number"
      step={step}
      style={{ width }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
};

export const MarkerPanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const { result } = useDerived();
  const Z0 = state.circuit.Z0;
  const [ohms, setOhms] = useState(false);
  const markers = state.markers;

  const addAt = (z: Complex, label?: string) => dispatch({ type: 'marker_add', re: Number(z.re.toFixed(4)), im: Number(z.im.toFixed(4)), label });

  return (
    <div className="markers">
      <div className="mk-head">
        <b>📍 จุดที่ mark</b>
        <button className={`chip ${state.markerMode ? 'on' : ''}`} onClick={() => dispatch({ type: 'marker_mode', value: !state.markerMode })} title="เปิดแล้วคลิกบน Smith Chart เพื่อปักจุดตรงตำแหน่งที่คลิก">
          {state.markerMode ? '● คลิกบนกราฟเพื่อปักจุด' : '＋ ปักจุดด้วยการคลิก'}
        </button>
        <button className="mini wide" onClick={() => addAt({ re: 1, im: 0 })} title="เพิ่มจุดแล้วพิมพ์ค่า r และ x เอง">＋ พิมพ์ค่าเอง</button>
        <button className="mini wide" onClick={() => addAt(result.zin, 'z_in')} title="ปักจุดที่อิมพีแดนซ์ขาเข้าปัจจุบัน" disabled={!isFiniteC(result.zin)}>＋ z_in</button>
        {result.hasNetwork && (
          <button className="mini wide" onClick={() => addAt(result.zL, 'z_L')} title="ปักจุดที่อิมพีแดนซ์ของโหลด" disabled={!isFiniteC(result.zL)}>＋ z_L</button>
        )}
        <span className="spacer" />
        <label className="mk-unit" title="สลับระหว่างค่าปกติ (r + jx) กับค่าจริงเป็นโอห์ม">
          <input type="checkbox" checked={ohms} onChange={(e) => setOhms(e.target.checked)} /> หน่วย Ω
        </label>
        {markers.length > 0 && <button className="mini wide" onClick={() => dispatch({ type: 'markers_clear' })}>ล้างทั้งหมด</button>}
      </div>
      {markers.length === 0 ? (
        <div className="mk-empty">
          ยังไม่มีจุดที่ mark · กด <b>＋ ปักจุดด้วยการคลิก</b> แล้วคลิกตำแหน่งบน Smith Chart หรือกด <b>＋ พิมพ์ค่าเอง</b> เพื่อกรอก r และ x
        </div>
      ) : (
        <table className="mk-table">
          <thead>
            <tr>
              <th></th><th>ชื่อ</th><th>{ohms ? 'R (Ω)' : 'r'}</th><th>{ohms ? 'X (Ω)' : 'x'}</th><th className="col-wide">y = g + jb</th><th className="col-wide">|Γ| ∠</th><th>SWR</th><th className="col-wide">→gen</th><th></th>
            </tr>
          </thead>
          <tbody>
            {markers.map((m) => {
              const i = info(m, Z0);
              return (
                <tr key={m.id} className={i.outside ? 'outside' : ''}>
                  <td><span className="mk-dot" style={{ background: m.color }} /></td>
                  <td>
                    <input className="mk-label" value={m.label} onChange={(e) => dispatch({ type: 'marker_update', id: m.id, patch: { label: e.target.value.slice(0, 14) } })} />
                  </td>
                  <td><Num value={ohms ? m.re * Z0 : m.re} step={ohms ? 1 : 0.05} onChange={(v) => dispatch({ type: 'marker_update', id: m.id, patch: { re: ohms ? v / Z0 : v } })} /></td>
                  <td><Num value={ohms ? m.im * Z0 : m.im} step={ohms ? 1 : 0.05} onChange={(v) => dispatch({ type: 'marker_update', id: m.id, patch: { im: ohms ? v / Z0 : v } })} /></td>
                  <td className="mono col-wide">{fz(i.y, 2)}</td>
                  <td className="mono col-wide">{i.outside ? '—' : `${fmtNum(abs(i.g), 3)} ∠${fmtNum(deg(arg(i.g)), 0)}°`}</td>
                  <td className="mono" title={`|Γ| = ${fmtNum(abs(i.g), 3)} ∠${fmtNum(deg(arg(i.g)), 1)}° · y = ${fz(i.y, 3)} · ${fmtNum(i.wtg, 3)} λ toward generator · Z = ${fmtNum(i.Z.re, 1)} ${i.Z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(i.Z.im), 1)} Ω`}>{i.outside ? '—' : Number.isFinite(i.swr) ? fmtNum(i.swr, 2) : '∞'}</td>
                  <td className="mono col-wide">{i.outside ? '—' : `${fmtNum(i.wtg, 3)} λ`}</td>
                  <td><button className="mini" title="ลบจุดนี้" onClick={() => dispatch({ type: 'marker_remove', id: m.id })}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {markers.some((m) => info(m, Z0).outside) && (
        <div className="mk-warn">⚠ จุดที่มี r ติดลบจะอยู่นอกวงกลม Smith Chart จึงไม่ถูกวาด (อิมพีแดนซ์ของวงจร passive ต้องมี r ≥ 0)</div>
      )}
    </div>
  );
};
