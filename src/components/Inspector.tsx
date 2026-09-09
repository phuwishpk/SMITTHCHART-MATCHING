import React from 'react';
import { useAppState, useDispatch, useDerived } from '../state/store';
import { ELEMENT_SPECS, wavelength } from '../engine/circuit';
import { NumField } from './NumField';
import { fmtNum, fmtEng, abs, isFiniteC, Complex } from '../engine/complex';
import { admittance } from '../engine/rf';
import { solveQwt, solveSingleStub, solveLMatch } from '../engine/matching';
import { probeOnLine } from '../engine/solver';
import { WaveStrip } from './WaveStrip';
import { MaxButton } from './MaxButton';

const fz = (z: Complex, d = 3) => (isFiniteC(z) ? `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}` : '∞');

export const Inspector: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const { result } = useDerived();
  const { circuit, selectedId, probe } = state;

  if (!selectedId) {
    return (
      <div className="inspector">
        <div className="panel-head"><span className="panel-title">PROPERTIES</span><MaxButton panel="inspector" /></div>
        <div className="insp-empty">คลิกอุปกรณ์บน Canvas เพื่อแก้ค่า<br />หรือคลิก RF Source เพื่อตั้งความถี่และ Z₀</div>
      </div>
    );
  }

  if (selectedId === 'source') {
    const lam = wavelength(circuit.f, 1);
    return (
      <div className="inspector">
        <div className="panel-head"><span className="panel-title">PROPERTIES</span><span className="insp-name">RF Source</span><MaxButton panel="inspector" /></div>
        <div className="insp-body">
          <NumField label="Frequency f" unit="MHz" value={circuit.f / 1e6} min={1} max={10000} log digits={5} onChange={(v) => dispatch({ type: 'freq', f: v * 1e6 })} hint={`λ₀ (อากาศ) = ${fmtEng(lam, 'm', 3)}`} />
          <NumField label="Z₀ = Z_S (อิมพีแดนซ์แหล่งจ่าย/ระบบ)" unit="Ω" value={circuit.Z0} min={10} max={300} step={1} onChange={(v) => dispatch({ type: 'z0', Z0: v })} hint="ค่าอ้างอิงสำหรับ normalize: ศูนย์กลาง Smith Chart = Z₀ = conjugate match กับแหล่งจ่าย" />
          <div className="insp-note">โจทย์ที่แหล่งจ่ายไม่ใช่ 50 Ω (เช่น Z_S = 25 Ω) ให้ตั้ง Z₀ เท่ากับ Z_S แล้วออกแบบ matching ให้จุดเข้าศูนย์กลางตามปกติ</div>
          <div className="insp-note">เปลี่ยน f แล้ว X_L และ X_C ของทุกตัวจะเปลี่ยนตาม จุดบน Smith Chart จะขยับทันที</div>
        </div>
      </div>
    );
  }

  const index = circuit.elements.findIndex((e) => e.id === selectedId);
  const el = circuit.elements[index];
  if (!el) return null;
  const spec = ELEMENT_SPECS[el.type];
  const stage = result.stages.find((s) => s.index === index);
  const next = circuit.elements[index + 1];
  const nextIsLine = next && next.type === 'tline';
  const nextStage = nextIsLine ? result.stages.find((s) => s.index === index + 1) : undefined;

  const setP = (key: string, value: number) => dispatch({ type: 'param', id: el.id, key, value });

  // helper info
  let computed: React.ReactNode = null;
  if (stage) {
    if (el.type === 'inductor') computed = <div className="insp-calc">X_L = 2πfL = <b>{fmtNum(2 * Math.PI * circuit.f * el.params.L * 1e-9, 2)} Ω</b>{stage.kind === 'shunt' && <> · B = {fmtNum(stage.B!, 5)} S</>}</div>;
    if (el.type === 'capacitor') computed = <div className="insp-calc">X_C = −1/(2πfC) = <b>{fmtNum(-1 / (2 * Math.PI * circuit.f * el.params.C * 1e-12), 2)} Ω</b>{stage.kind === 'shunt' && <> · B = {fmtNum(stage.B!, 5)} S</>}</div>;
    if (el.type === 'resistor') computed = <div className="insp-calc">Z = <b>{fmtNum(el.params.R, 2)} + j0 Ω</b>{stage.kind === 'shunt' && <> · G = {fmtNum(1 / el.params.R, 5)} S</>}</div>;
    if (stage.kind === 'line') computed = <div className="insp-calc">βl = {fmtNum(stage.line!.degrees, 1)}° · หมุนบน chart {fmtNum(2 * stage.line!.degrees, 1)}° · ความยาวจริง ≈ {fmtEng(stage.line!.lenLambda * wavelength(circuit.f, el.params.vf ?? 1), 'm', 3)}</div>;
    if (stage.kind === 'stub') computed = <div className="insp-calc">βl = {fmtNum(stage.line!.degrees, 1)}° · b_stub = <b>{fmtNum(stage.B! * circuit.Z0, 3)}</b> (normalized)</div>;
  }

  return (
    <div className="inspector">
      <div className="panel-head">
        <span className="panel-title">PROPERTIES</span>
        <span className="insp-name" style={{ color: spec.color }}>{spec.symbol} · {spec.name}</span>
        <MaxButton panel="inspector" />
      </div>
      <div className="insp-body">
        <div className="insp-desc">{spec.description}</div>

        {spec.allowed.length === 2 && (
          <div className="seg small">
            <button className={el.orient === 'series' ? 'on' : ''} onClick={() => dispatch({ type: 'orient', id: el.id, orient: 'series' })}>อนุกรม (Series)</button>
            <button className={el.orient === 'shunt' ? 'on' : ''} onClick={() => dispatch({ type: 'orient', id: el.id, orient: 'shunt' })}>ขนาน (Shunt ⏚)</button>
          </div>
        )}

        {spec.params.map((p) => (
          <NumField key={p.key} label={p.labelTh} unit={p.unit} value={el.params[p.key]} min={p.min} max={p.max} step={p.step} log={p.log} onChange={(v) => setP(p.key, v)} />
        ))}
        {computed}

        {/* ---- special helpers ---- */}
        {el.type === 'load' && (
          <div className="insp-presets">
            <span>ค่าตัวอย่าง:</span>
            {[[100, -50], [60, -80], [200, -100], [25, 25], [50, 0], [20, 40]].map(([r, x]) => (
              <button key={`${r}${x}`} className="mini wide" onClick={() => { setP('R', r); setP('X', x); }}>{r}{x < 0 ? '−' : '+'}j{Math.abs(x)}</button>
            ))}
          </div>
        )}

        {el.type === 'tline' && (
          <div className="insp-section">
            <div className="insp-presets">
              <span>ตั้งความยาว:</span>
              {[0.125, 0.25, 0.375, 0.5].map((l) => (
                <button key={l} className="mini wide" onClick={() => setP('len', l)}>{l === 0.125 ? 'λ/8' : l === 0.25 ? 'λ/4' : l === 0.375 ? '3λ/8' : 'λ/2'}</button>
              ))}
            </div>
            <label className="check">
              <input type="checkbox" checked={probe?.elementId === el.id} onChange={(e) => dispatch({ type: 'probe', probe: e.target.checked ? { elementId: el.id, d: Math.min(el.params.len, probe?.d ?? el.params.len / 2) } : null })} />
              Probe: วัดอิมพีแดนซ์ตามตำแหน่งบนสาย
            </label>
            {probe?.elementId === el.id && stage && (
              <div className="probe-box">
                <NumField label="ตำแหน่งวัด d (จากโหลด)" unit="λ" value={Math.min(probe.d, el.params.len)} min={0} max={Math.max(el.params.len, 0.001)} step={0.001} digits={4} compact onChange={(v) => dispatch({ type: 'probe', probe: { elementId: el.id, d: v } })} />
                {(() => {
                  const pr = probeOnLine(stage, probe.d, circuit.Z0);
                  return (
                    <div className="insp-calc">
                      ที่ d = {fmtNum(probe.d, 3)} λ: Z = <b>{fz(pr.Z, 2)} Ω</b> · z = {fz(pr.z, 3)} · |Γ| = {fmtNum(abs(pr.gamma), 3)}
                    </div>
                  );
                })()}
                <WaveStrip stage={stage} probeD={probe.d} />
              </div>
            )}
          </div>
        )}

        {el.type === 'qwt' && stage && (
          <div className="insp-section">
            {(() => {
              const sols = solveQwt(stage.Zbefore, circuit.Z0);
              const ZLr = stage.Zbefore;
              const real = isFiniteC(ZLr) && Math.abs(ZLr.im) < 1e-6;
              return (
                <>
                  <div className="insp-calc">โหลดที่หม้อแปลงมองเห็น: Z_L = <b>{fz(ZLr, 2)} Ω</b></div>
                  {real ? (
                    <button className="btn small" onClick={() => setP('Zt', Number(Math.sqrt(circuit.Z0 * ZLr.re).toFixed(2)))}>
                      Auto Z_t = √(Z₀·R_L) = {fmtNum(Math.sqrt(circuit.Z0 * ZLr.re), 2)} Ω
                    </button>
                  ) : (
                    <div className="insp-warn">
                      Z_L ไม่ใช่จำนวนจริง หม้อแปลง λ/4 ต้องการโหลดจริง: ใส่สายส่ง (Z₀ = {circuit.Z0} Ω) ระหว่างหม้อแปลงกับโหลด ยาว{' '}
                      {sols.map((s) => `${fmtNum(s.dLambda, 3)} λ (R = ${fmtNum(s.Rreal, 1)} Ω → Z_t = ${fmtNum(s.Zt, 1)} Ω)`).join(' หรือ ')}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {(el.type === 'stub_short' || el.type === 'stub_open') && (
          <div className="insp-section">
            {nextIsLine && nextStage ? (
              <>
                <NumField label="ตำแหน่งสตับ d (ความยาวสายถึงโหลด)" unit="λ" value={next.params.len} min={0} max={0.5} step={0.001} digits={4} onChange={(v) => dispatch({ type: 'param', id: next.id, key: 'len', value: v })} hint={`y ที่ตำแหน่งสตับ (ก่อนใส่สตับ) = ${fz(admittance(nextStage.zafter), 3)}`} />
                {(() => {
                  const kind = el.type === 'stub_short' ? 'short' : 'open';
                  const sols = solveSingleStub(nextStage.Zbefore, circuit.Z0, kind, el.params.Z0);
                  const yb = admittance(nextStage.zafter);
                  const onG1 = isFiniteC(yb) && Math.abs(yb.re - 1) < 0.03;
                  return (
                    <div className="insp-solve">
                      <div className={`insp-calc ${onG1 ? 'ok' : ''}`}>{onG1 ? '✓ y อยู่บนวงกลม g = 1 แล้ว → ปรับความยาวสตับให้ b หักล้าง' : '→ เลื่อน d จน g = 1 ก่อน'}</div>
                      <div className="insp-presets">
                        <span>เฉลย (Single stub):</span>
                        {sols.map((s, i) => (
                          <button key={i} className="mini wide" onClick={() => { dispatch({ type: 'param', id: next.id, key: 'len', value: Number(s.dLambda.toFixed(4)) }); setP('len', Number(s.lLambda.toFixed(4))); }}>
                            d={fmtNum(s.dLambda, 3)}λ, l={fmtNum(s.lLambda, 3)}λ
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="insp-warn">วางสายส่ง (TL) ถัดจากสตับทางด้านโหลด เพื่อกำหนดตำแหน่งสตับ d</div>
            )}
          </div>
        )}

        {(el.type === 'inductor' || el.type === 'capacitor') && stage && !stage.inLoad && (
          <div className="insp-section">
            {(() => {
              // L-match helper: load seen by the element closest to the load in the network
              const loadStage = result.stages.find((s) => s.index === result.loadStart);
              const ZL = loadStage ? loadStage.Zafter : result.Zterm;
              const sols = solveLMatch(ZL, circuit.Z0, circuit.f);
              if (sols.length === 0) return null;
              return (
                <div className="insp-calc small">
                  L-section สำหรับ Z_L = {fz(ZL, 1)} Ω: {sols.map((s, i) => `${i + 1}) ${s.topology === 'shunt-first' ? 'ขนาน' : 'อนุกรม'}ที่โหลด: ${s.shuntEl.type === 'capacitor' ? 'C' : 'L'}↓=${fmtEng(s.shuntEl.value, s.shuntEl.type === 'capacitor' ? 'F' : 'H', 3)}, ${s.seriesEl.type === 'capacitor' ? 'C' : 'L'}=${fmtEng(s.seriesEl.value, s.seriesEl.type === 'capacitor' ? 'F' : 'H', 3)}`).join(' · ')}
                </div>
              );
            })()}
          </div>
        )}

        {stage && (
          <div className="insp-stage">
            <div className="k">ผลของอุปกรณ์นี้บน Smith Chart</div>
            <div>z ก่อน: <b>{fz(stage.zbefore)}</b> → หลัง: <b>{fz(stage.zafter)}</b></div>
            {(stage.kind === 'shunt' || stage.kind === 'stub') && <div>y ก่อน: <b>{fz(admittance(stage.zbefore))}</b> → หลัง: <b>{fz(admittance(stage.zafter))}</b></div>}
          </div>
        )}

        <div className="insp-actions">
          <button className="btn small" disabled={index === 0} onClick={() => dispatch({ type: 'move', id: el.id, index: index - 1 })}>◀ ย้ายซ้าย</button>
          <button className="btn small" disabled={index >= circuit.elements.length - 1} onClick={() => dispatch({ type: 'move', id: el.id, index: index + 2 })}>ย้ายขวา ▶</button>
          <button className="btn small danger" onClick={() => dispatch({ type: 'remove', id: el.id })}>🗑 ลบ</button>
        </div>
      </div>
    </div>
  );
};
