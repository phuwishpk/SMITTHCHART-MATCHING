import React, { useMemo, useState } from 'react';
import { t } from '../engine/i18n';
import { C, Complex, fmtNum } from '../engine/complex';
import { buildCircuit } from '../engine/circuit';
import { solveCircuit } from '../engine/solver';
import { admittance, gammaFromZ, normalize, swrFromGamma } from '../engine/rf';
import { L_CASES, solveLCases, type LCase } from '../engine/matching';
import { CircuitSchematic } from './CircuitSchematic';
import { SmithFigure } from './SmithFigure';

const fz = (z: Complex, d = 2) => `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}`;
const part = (v: number | undefined, kind: 'inductor' | 'capacitor') =>
  v === undefined ? '—' : kind === 'inductor' ? `${fmtNum(v * 1e9, 2)} nH` : `${fmtNum(v * 1e12, 2)} pF`;
/** ค่าที่ส่งให้ buildCircuit: L เป็น nH, C เป็น pF */
const params = (v: number | undefined, kind: 'inductor' | 'capacitor'): Record<string, number> =>
  kind === 'inductor' ? { L: v === undefined ? 60 : v * 1e9 } : { C: v === undefined ? 30 : v * 1e12 };

/** จุดหลังใส่อุปกรณ์หนึ่งตัว — ขนานบวกใน Y อนุกรมบวกใน Z */
const step = (z: Complex, orient: 'shunt' | 'series', v: number): Complex => {
  if (orient === 'series') return C(z.re, z.im + v);
  const y = admittance(z);
  return admittance(C(y.re, y.im + v));
};
const path = (z: Complex, orient: 'shunt' | 'series', v: number): Complex[] =>
  Array.from({ length: 41 }, (_, i) => step(z, orient, (v * i) / 40));

/** โหลดตัวอย่างที่พาไปเจอ region ต่าง ๆ ของกราฟ จะได้เห็นว่าชุดที่ใช้ได้เปลี่ยนไปจริง */
const PRESETS: { R: number; X: number; note: string }[] = [
  { R: 100, X: -50, note: 'ของบทนี้' },
  { R: 20, X: -30, note: 'นอกทั้งสองวง' },
  { R: 25, X: 0, note: 'ต้านทานล้วน r < 1' },
  { R: 100, X: 0, note: 'ต้านทานล้วน r > 1' },
  { R: 25, X: 25, note: 'อยู่บนวง g = 1 พอดี' },
];

export const LNetworkExplorer: React.FC = () => {
  const [id, setId] = useState<LCase>('a');
  const [R, setR] = useState(100);
  const [X, setX] = useState(-50);
  const [Z0, setZ0] = useState(50);
  const [fMHz, setFMHz] = useState(100);
  const valid = R > 0 && Z0 > 0 && fMHz > 0;
  const F = fMHz * 1e6;
  const ZL = C(R, X);
  const cases = useMemo(
    () => (valid ? solveLCases(C(R, X), Z0, F) : []),
    [valid, R, X, Z0, F],
  );
  const sel = cases.find((c) => c.spec.id === id);
  const zL = valid ? normalize(ZL, Z0) : C(1, 0);
  const yL = admittance(zL);
  const swrOf = (z: Complex) => swrFromGamma(gammaFromZ(C(z.re * Z0, z.im * Z0), Z0));
  const okCount = cases.filter((c) => c.feasible).length;
  const spec = (sel ?? { spec: L_CASES.find((s) => s.id === id) as typeof L_CASES[number] }).spec;
  const ok = sel?.feasible ?? false;
  const circuit = buildCircuit(F || 1e6, Z0 || 50, [
    [spec.second.type, spec.second.orient, params(sel?.second, spec.second.type)],
    [spec.first.type, spec.first.orient, params(sel?.first, spec.first.type)],
    ['load', 'series', { R: valid ? R : 50, X }],
  ]);
  const z1 = ok ? step(zL, spec.first.orient, sel?.xb1 ?? 0) : zL;
  const z2 = ok ? step(z1, spec.second.orient, sel?.xb2 ?? 0) : zL;
  const num = (v: number, set: (n: number) => void, label: string, step2 = 1) =>
    <label className="lnet-field">{label}
      <input type="number" value={v} step={step2} onChange={(e) => set(Number(e.target.value))} />
    </label>;
  return <div className="reflection-intro lnet-explorer">
    <p className="ri-eyebrow">{t("เปลี่ยนโหลดได้เอง แล้วดูว่ารูปแบบไหนใช้ได้บ้าง • ค่าอุปกรณ์คำนวณใหม่ทุกครั้ง")}</p>
    <h4>{t("ลองทีละแบบ: กดปุ่มเพื่อดูวงจร ค่าอุปกรณ์จริง และเส้นทางบนกราฟ")}</h4>
    <div className="lnet-inputs">
      {num(R, setR, t('R_L (Ω)'), 5)}
      {num(X, setX, t('X_L (Ω)'), 5)}
      {num(Z0, setZ0, t('Z₀ ของระบบ (Ω)'), 5)}
      {num(fMHz, setFMHz, t('ความถี่ (MHz)'), 10)}
    </div>
    <div className="ri-choices" role="group" aria-label={t("โหลดตัวอย่าง")}>
      {PRESETS.map((p) => <button key={`${p.R},${p.X}`} type="button"
        aria-pressed={R === p.R && X === p.X}
        onClick={() => { setR(p.R); setX(p.X); }}>
        {p.R} {p.X < 0 ? '−' : '+'} j{Math.abs(p.X)} Ω · {t(p.note)}
      </button>)}
    </div>
    {!valid ? <p className="ri-takeaway"><b>{t("ค่าที่กรอกยังใช้ไม่ได้")}</b><br />{t("R_L, Z₀ และความถี่ ต้องเป็นค่าบวกทั้งหมด")}</p> : <>
      <p className="ri-small">{t("โหลดนี้ได้")} z = {fz(zL, 3)} · y = {fz(yL, 3)} · SWR = {fmtNum(swrOf(zL), 3)} — {t("ใช้ได้")} {okCount} {t("จาก 8 แบบ")}</p>
      <div className="ri-choices lnet-picker" role="group" aria-label={t("เลือกรูปแบบ L-network")}>
        {L_CASES.map((s) => {
          const c = cases.find((x) => x.spec.id === s.id);
          return <button key={s.id} type="button" aria-pressed={id === s.id} className={c?.feasible ? 'ok' : 'no'} onClick={() => setId(s.id)}>
            ({s.id}) {s.label}{c?.feasible ? '' : ' ✕'}
          </button>;
        })}
      </div>
      <p className="ri-small">{t("ปุ่มที่มีเครื่องหมาย ✕ คือแบบที่ใช้กับโหลดตัวนี้ไม่ได้ กดดูเหตุผลได้")}</p>
      <CircuitSchematic circuit={circuit} result={solveCircuit(circuit)} maxHeight={170}
        title={`(${spec.id}) ${spec.label}${ok ? '' : ` — ${t('ใช้กับโหลดตัวนี้ไม่ได้')}`}`} />
      {ok ? <>
        <div className="swd-values">
          <div><small>{t("ตัวแรก (ชิดโหลด)")}</small><b>{part(sel?.first, spec.first.type)}</b></div>
          <div><small>{t("ตัวที่สอง (ไปทางแหล่งจ่าย)")}</small><b>{part(sel?.second, spec.second.type)}</b></div>
          <div><small>SWR</small><b>{fmtNum(swrOf(zL), 3)} → {fmtNum(swrOf(z2), 3)}</b></div>
        </div>
        <div className="ri-reading"><div aria-live="polite">
          <h4>{t("เดินสองขั้นจาก")} z = {fz(zL, 2)}</h4>
          <ol>
            <li>{spec.first.orient === 'shunt' ? t('ตัวขนานบวกใน Y:') : t('ตัวอนุกรมบวกใน Z:')} {spec.first.orient === 'shunt' ? 'b' : 'x'} = {fmtNum(sel?.xb1 ?? 0, 4)} → z = {fz(z1, 3)}</li>
            <li>{spec.second.orient === 'shunt' ? t('ตัวขนานบวกใน Y:') : t('ตัวอนุกรมบวกใน Z:')} {spec.second.orient === 'shunt' ? 'b' : 'x'} = {fmtNum(sel?.xb2 ?? 0, 4)} → z = {fz(z2, 3)}</li>
          </ol>
          <p>{t("ตัวแรกพาจุดไปนั่งบนวง")} {spec.second.orient === 'series' ? 'r = 1' : 'g = 1'} {t("ตัวที่สองจึงพาเข้าศูนย์กลางได้")}</p>
        </div><SmithFigure showY={spec.first.orient === 'shunt' || spec.second.orient === 'shunt'}
          rCircles={[1]} gCircles={[1]} swr={[swrOf(zL)]}
          points={[{ z: zL, label: t('โหลด'), cls: 'load' }, { z: z1, label: t('หลังตัวแรก'), cls: 'mid' }, { z: z2, label: t('แมตช์'), cls: 'in' }]}
          curves={[
            { zs: path(zL, spec.first.orient, sel?.xb1 ?? 0), cls: spec.first.orient === 'shunt' ? 'y' : 'load', arrow: true },
            { zs: path(z1, spec.second.orient, sel?.xb2 ?? 0), cls: spec.second.orient === 'shunt' ? 'y' : 'load', arrow: true },
          ]} /></div>
      </> : <p className="ri-takeaway"><b>{t("ทำไมแบบนี้ไม่ได้")}</b><br />{sel?.reason ?? t('ใช้กับโหลดตัวนี้ไม่ได้')}</p>}
    </>}
  </div>;
};
