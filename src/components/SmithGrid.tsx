import React, { useEffect, useRef } from 'react';
import { Complex, abs, arg, fmtNum, isFiniteC } from '../engine/complex';
import { rCircle, xCircle } from '../engine/smith';
import { readOff, magFromSwr, magFromRlDb, magFromReflPct } from '../engine/rf';

// ---------------------------------------------------------------
// Detailed Smith-chart grid (printed-chart style), outer scales and
// the radially scaled parameter bar. Pure/static: memoised by React.
// ---------------------------------------------------------------
export const VB = 800;
export const CX = 400;
export const CY = 400;
export const R = 300;
/** radii (× R) of the outer rings */
export const RING = {
  xlabel: 1.028,
  ang: [1.05, 1.08] as const,
  angLabel: 1.102,
  wtg: [1.124, 1.154] as const,
  wtgLabel: 1.182,
  wtl: [1.206, 1.236] as const,
  wtlLabel: 1.264,
};

export const circleSvg = (c: { cx: number; cy: number; r: number }) => ({ cx: CX + R * c.cx, cy: CY - R * c.cy, r: c.r * R });
const circlePath = (cx: number, cy: number, r: number) => `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
const key = (v: number) => v.toFixed(3);

/** r (or g when mirrored) circle in SVG units */
const rSvg = (r: number, mirror: boolean) => {
  const c = rCircle(r);
  return { cx: CX + R * (mirror ? -c.cx : c.cx), cy: CY, r: c.r * R };
};
/** x (or b when mirrored) circle in SVG units */
const xSvg = (x: number, mirror: boolean) => {
  const c = xCircle(x);
  return mirror ? { cx: CX - R, cy: CY + R / x, r: c.r * R } : { cx: CX + R, cy: CY - R / x, r: c.r * R };
};

const range = (a: number, b: number, step: number): number[] => {
  const out: number[] = [];
  for (let v = a; v < b - 1e-9; v += step) out.push(Number(v.toFixed(4)));
  return out;
};

/** value families of the printed chart (same list for r and x) */
export const MAJOR = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 10, 20, 50];

interface Tier {
  vals: number[];
  /** lines are drawn only where the OTHER coordinate is below this bound (null = everywhere) */
  bound: number | null;
  cls: string;
}
const buildTiers = (): Tier[] => {
  const seen = new Set<string>(MAJOR.map(key));
  const take = (vals: number[]) => vals.filter((v) => !seen.has(key(v))).map((v) => (seen.add(key(v)), v));
  return [
    { vals: [12, 14, 16, 18, 30, 40], bound: null, cls: 't1' },
    { vals: take([6, 7, 8, 9]), bound: 10, cls: 't1' },
    { vals: take(range(2.2, 5, 0.2)), bound: 5, cls: 't1' },
    { vals: take(range(0.1, 2, 0.1)), bound: 2, cls: 't1' },
    { vals: take(range(0.05, 1, 0.05)), bound: 1, cls: 't2' },
    { vals: take(range(0.02, 0.5, 0.02)), bound: 0.5, cls: 't3' },
    { vals: take(range(0.01, 0.2, 0.01)), bound: 0.2, cls: 't4' },
  ];
};
const TIERS = buildTiers();

/** evenodd clip: inside unit circle AND r < bound (outside the r=bound circle) */
const clipRlt = (bound: number, mirror: boolean) => {
  const c = rSvg(bound, mirror);
  return circlePath(CX, CY, R) + ' ' + circlePath(c.cx, c.cy, c.r);
};
/** evenodd clip: inside unit circle AND |x| < bound (outside both x=±bound circles) */
const clipXlt = (bound: number, mirror: boolean) => {
  const a = xSvg(bound, mirror);
  const b = xSvg(-bound, mirror);
  return circlePath(CX, CY, R) + ' ' + circlePath(a.cx, a.cy, a.r) + ' ' + circlePath(b.cx, b.cy, b.r);
};

const Family: React.FC<{ mirror: boolean; prefix: string }> = ({ mirror, prefix }) => (
  <g>
    <defs>
      {TIERS.filter((t) => t.bound !== null).map((t) => (
        <React.Fragment key={t.bound}>
          <clipPath id={`${prefix}-rlt-${t.bound}`} clipPathUnits="userSpaceOnUse">
            <path d={clipRlt(t.bound!, mirror)} clipRule="evenodd" />
          </clipPath>
          <clipPath id={`${prefix}-xlt-${t.bound}`} clipPathUnits="userSpaceOnUse">
            <path d={clipXlt(t.bound!, mirror)} clipRule="evenodd" />
          </clipPath>
        </React.Fragment>
      ))}
    </defs>
    {/* constant-r circles, clipped to |x| < bound */}
    {TIERS.map((t) => (
      <g key={`r${t.cls}${t.bound}`} className={`tier ${t.cls}`} clipPath={t.bound !== null ? `url(#${prefix}-xlt-${t.bound})` : undefined}>
        {t.vals.map((v) => {
          const c = rSvg(v, mirror);
          return <circle key={v} cx={c.cx} cy={c.cy} r={c.r} />;
        })}
      </g>
    ))}
    {/* constant-x arcs (±), clipped to r < bound */}
    {TIERS.map((t) => (
      <g key={`x${t.cls}${t.bound}`} className={`tier ${t.cls}`} clipPath={t.bound !== null ? `url(#${prefix}-rlt-${t.bound})` : undefined}>
        {t.vals.flatMap((v) => [v, -v]).map((v) => {
          const c = xSvg(v, mirror);
          return <circle key={v} cx={c.cx} cy={c.cy} r={c.r} />;
        })}
      </g>
    ))}
    {/* major circles on top */}
    <g className="tier major">
      {MAJOR.map((v) => {
        const c = rSvg(v, mirror);
        return <circle key={`r${v}`} cx={c.cx} cy={c.cy} r={c.r} />;
      })}
      {MAJOR.flatMap((v) => [v, -v]).map((v) => {
        const c = xSvg(v, mirror);
        return <circle key={`x${v}`} cx={c.cx} cy={c.cy} r={c.r} />;
      })}
    </g>
  </g>
);

/** Γ of the point z = jx on the rim */
const rimGamma = (x: number): Complex => ({ re: (x * x - 1) / (x * x + 1), im: (2 * x) / (x * x + 1) });

const Labels: React.FC<{ mirror: boolean }> = ({ mirror }) => {
  const sign = mirror ? -1 : 1;
  return (
    <g className={`glabels ${mirror ? 'y' : 'z'}`}>
      {/* r / g labels along the real axis */}
      {MAJOR.map((v, i) => {
        const gx = ((v - 1) / (v + 1)) * sign;
        const x = CX + R * gx;
        const above = v <= 1 || i % 2 === 0;
        const y = mirror ? (above ? CY + 13 : CY + 22) : above ? CY - 4 : CY + 11;
        return (
          <text key={`r${v}`} x={x + (mirror ? -2 : 2)} y={y} textAnchor={mirror ? 'end' : 'start'} className={`lbl-axis ${v < 1 ? 'lbl-fine' : ''}`}>
            {v}
          </text>
        );
      })}
      {/* x / b labels around the rim (outside for Z, just inside for Y) */}
      {MAJOR.flatMap((v) => [v, -v]).map((v) => {
        const g = rimGamma(v);
        const rr = mirror ? 0.955 : RING.xlabel;
        const px = CX + R * rr * g.re * sign;
        const py = CY - R * rr * g.im * sign;
        return (
          <text key={`x${v}`} x={px} y={py + 3} textAnchor="middle" className={`lbl-rim ${Math.abs(v) < 1 || Math.abs(v) > 5 ? 'lbl-fine' : ''}`}>
            {v < 0 ? `−${Math.abs(v)}` : `${v}`}
          </text>
        );
      })}
    </g>
  );
};

export const DetailedGrid: React.FC<{ showZ: boolean; showY: boolean }> = React.memo(({ showZ, showY }) => (
  <g>
    {showZ && (
      <g className="grid z" clipPath="url(#clipUnit)">
        <Family mirror={false} prefix="z" />
      </g>
    )}
    {showY && (
      <g className="grid y" clipPath="url(#clipUnit)">
        <Family mirror prefix="y" />
      </g>
    )}
    <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} className="axis" />
    <circle cx={CX} cy={CY} r={R} className="rim" />
    {showZ && <Labels mirror={false} />}
    {showY && <Labels mirror />}
    <text x={CX - R - 4} y={CY + 16} className="pole" textAnchor="start">SHORT</text>
    <text x={CX + R + 4} y={CY + 16} className="pole" textAnchor="end">OPEN</text>
    <text x={CX + 3} y={CY - 6} className="pole center-lbl">1.0</text>
  </g>
));

const polar = (rr: number, a: number) => ({ x: CX + rr * R * Math.cos(a), y: CY - rr * R * Math.sin(a) });

export const OuterScales: React.FC = React.memo(() => {
  const els: React.ReactNode[] = [];
  // ---- angle of reflection coefficient (degrees) ----
  for (let d = -178; d <= 180; d += 2) {
    const a = (d * Math.PI) / 180;
    const major = d % 10 === 0;
    const p1 = polar(RING.ang[0], a);
    const p2 = polar(major ? RING.ang[1] : RING.ang[0] + 0.016, a);
    els.push(<line key={`a${d}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={major ? 'tick major' : 'tick tick-fine'} />);
    if (major) {
      const pl = polar(RING.angLabel, a);
      els.push(<text key={`al${d}`} x={pl.x} y={pl.y + 2.5} textAnchor="middle" className="ticklabel ang">{d}</text>);
    }
  }
  // ---- wavelengths toward generator (clockwise from SHORT) and toward load (counter-clockwise) ----
  for (let i = 0; i < 250; i++) {
    const w = i / 500; // 0.002 λ per tick
    const aG = Math.PI - 4 * Math.PI * w;
    const aL = Math.PI + 4 * Math.PI * w;
    const lvl = i % 25 === 0 ? 3 : i % 5 === 0 ? 2 : 1;
    const outG = lvl === 3 ? RING.wtg[1] : lvl === 2 ? RING.wtg[0] + 0.02 : RING.wtg[0] + 0.01;
    const outL = lvl === 3 ? RING.wtl[1] : lvl === 2 ? RING.wtl[0] + 0.02 : RING.wtl[0] + 0.01;
    const g1 = polar(RING.wtg[0], aG);
    const g2 = polar(outG, aG);
    const l1 = polar(RING.wtl[0], aL);
    const l2 = polar(outL, aL);
    const cls = lvl === 3 ? 'tick major' : lvl === 2 ? 'tick mid' : 'tick tick-fine';
    els.push(<line key={`g${i}`} x1={g1.x} y1={g1.y} x2={g2.x} y2={g2.y} className={cls} />);
    els.push(<line key={`l${i}`} x1={l1.x} y1={l1.y} x2={l2.x} y2={l2.y} className={cls} />);
    if (i % 10 === 0) {
      const pg = polar(RING.wtgLabel, aG);
      const pl = polar(RING.wtlLabel, aL);
      const bold = i % 25 === 0;
      els.push(<text key={`gl${i}`} x={pg.x} y={pg.y + 2.5} textAnchor="middle" className={`ticklabel wtg ${bold ? 'bold' : 'lbl-fine'}`}>{w.toFixed(2)}</text>);
      els.push(<text key={`ll${i}`} x={pl.x} y={pl.y + 2.5} textAnchor="middle" className={`ticklabel wtl ${bold ? 'bold' : 'lbl-fine'}`}>{w.toFixed(2)}</text>);
    }
  }
  return (
    <g className="scale">
      <circle cx={CX} cy={CY} r={R * RING.ang[0]} className="scale-ring" />
      <circle cx={CX} cy={CY} r={R * RING.wtg[0]} className="scale-ring" />
      <circle cx={CX} cy={CY} r={R * RING.wtl[0]} className="scale-ring" />
      {els}
      <text x={6} y={14} className="scale-title">WAVELENGTHS TOWARD GENERATOR ⟳ (วงนอก)</text>
      <text x={VB - 6} y={14} textAnchor="end" className="scale-title">WAVELENGTHS TOWARD LOAD ⟲ (วงนอกสุด)</text>
      <text x={6} y={VB - 6} className="scale-title">ANGLE OF REFLECTION COEFFICIENT (°) (วงใน)</text>
      <text x={VB - 6} y={VB - 6} textAnchor="end" className="scale-title">IMPEDANCE OR ADMITTANCE COORDINATES</text>
    </g>
  );
});

/** Radially scaled parameters: |Γ| ↔ SWR ↔ return loss ↔ reflected power, with markers. */
export interface ReadoutMark {
  /** |Γ| to read off, 0…1 */
  mag: number;
  cls: 'load' | 'in';
  label?: string;
}

export const RadialScales: React.FC<{ gammaIn: Complex; gammaL: Complex; hasNetwork: boolean; readout?: ReadoutMark }> = React.memo(({ gammaIn, gammaL, hasNetwork, readout }) => {
  const W = 800;
  const H = 126;
  const x0 = 150;
  const x1 = W - 20;
  const xOf = (m: number) => x0 + Math.min(1, Math.max(0, m)) * (x1 - x0);
  const rows: { label: string; ticks: { m: number; t: string; minor?: boolean }[] }[] = [
    {
      label: '|Γ|',
      ticks: [...range(0, 1.0001, 0.02).map((m) => ({ m, t: Math.round(m * 100) % 10 === 0 ? m.toFixed(1) : '', minor: Math.round(m * 100) % 10 !== 0 }))],
    },
    {
      label: 'SWR',
      ticks: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2, 2.5, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50].map((s) => ({ m: magFromSwr(s), t: String(s) })).concat([{ m: 1, t: '∞' }]),
    },
    {
      label: 'RL (dB)',
      // 40 dB would sit 6 units from the infinity end-cap, so the two labels would overlap
      ticks: [30, 25, 20, 15, 12, 10, 8, 6, 5, 4, 3, 2, 1, 0].map((rl) => ({ m: magFromRlDb(rl), t: String(rl) })).concat([{ m: 0, t: '∞' }]),
    },
    {
      label: '|Γ|² %',
      ticks: [0, 1, 2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => ({ m: magFromReflPct(p), t: String(p) })),
    },
  ];
  const rowY = (i: number) => 34 + i * 22;
  const mIn = abs(gammaIn);
  const mL = abs(gammaL);
  const boxRef = useRef<HTMLDivElement>(null);
  const readX = readout && Number.isFinite(readout.mag) ? xOf(Math.min(1, Math.max(0, readout.mag))) : null;
  useEffect(() => {
    const box = boxRef.current;
    if (!box || readX === null) return;
    if (box.scrollWidth <= box.clientWidth + 4) return;
    const target = (readX / W) * box.scrollWidth - box.clientWidth / 2;
    box.scrollTo({ left: Math.max(0, Math.min(target, box.scrollWidth - box.clientWidth)), behavior: 'smooth' });
  }, [readX]);
  return (
    <div className="radial-scales" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        {/* the read line goes under the printed ticks so its halo cannot erase them */}
        {readX !== null && (
          <g className={`rs-read ${readout!.cls}`}>
            <line x1={readX} y1={16} x2={readX} y2={H - 20} className="rs-read-halo" />
            <line x1={readX} y1={16} x2={readX} y2={H - 20} className="rs-read-line" />
          </g>
        )}
        {rows.map((row, i) => (
          <g key={row.label} className="rs-row">
            <text x={46} y={rowY(i) + 3} textAnchor="start" className="rs-label">{row.label}</text>
            <line x1={x0} y1={rowY(i)} x2={x1} y2={rowY(i)} className="rs-axis" />
            {row.ticks.map((tk, j) => (
              <g key={j}>
                <line x1={xOf(tk.m)} y1={rowY(i) - (tk.minor ? 3 : 5)} x2={xOf(tk.m)} y2={rowY(i)} className={tk.minor ? 'rs-tick minor' : 'rs-tick'} />
                {tk.t && <text x={xOf(tk.m)} y={rowY(i) - 6} textAnchor="middle" className="rs-tick-label">{tk.t}</text>}
              </g>
            ))}
          </g>
        ))}
        {hasNetwork && Number.isFinite(mL) && (
          <g className="rs-marker load">
            <line x1={xOf(mL)} y1={rowY(0) - 8} x2={xOf(mL)} y2={H - 22} />
            <text x={xOf(mL)} y={H - 13} textAnchor="middle">|Γ_L| = {fmtNum(mL, 3)}</text>
          </g>
        )}
        {Number.isFinite(mIn) && (
          <g className="rs-marker in">
            <line x1={xOf(mIn)} y1={rowY(0) - 8} x2={xOf(mIn)} y2={H - 22} />
            <text x={xOf(mIn)} y={H - 13} textAnchor={mIn > 0.85 ? 'end' : mIn < 0.12 ? 'start' : 'middle'}>|Γ_in| = {fmtNum(mIn, 3)}</text>
          </g>
        )}
        {readout && Number.isFinite(readout.mag) && (() => {
          // one radius, four readings: draw the line the compass would leave and
          // print what each row says where the line crosses it
          const m = Math.min(1, Math.max(0, readout.mag));
          const ro = readOff({ re: m, im: 0 });
          const x = xOf(m);
          const vals = [
            fmtNum(ro.mag, 3),
            Number.isFinite(ro.swr) ? fmtNum(ro.swr, 2) : '∞',
            Number.isFinite(ro.rlDb) ? fmtNum(ro.rlDb, 1) : '∞',
            fmtNum(ro.reflPct, 1),
          ];
          const flagTxt = `▼ อ่านค่าตรงนี้${readout.label ? ` (${readout.label})` : ''}`;
          const flagW = 12 + flagTxt.length * 6.2;
          const flagX = Math.min(Math.max(x, x0 + flagW / 2), x1 - flagW / 2);
          return (
            <g className={`rs-read ${readout.cls}`}>
              <g className="rs-read-flag">
                <rect x={flagX - flagW / 2} y={1} width={flagW} height={15} rx={7.5} />
                <text x={flagX} y={12.5} textAnchor="middle">{flagTxt}</text>
              </g>
              {rows.map((row, i) => (
                <g key={`rv${row.label}`}>
                  <circle cx={x} cy={rowY(i)} r={3.2} className="rs-read-dot" />
                  {/* what this row reads there, kept at the left so it survives a phone's sideways scroll */}
                  <text x={x0 - 10} y={rowY(i) + 4} textAnchor="end" className="rs-read-val">{vals[i]}</text>
                </g>
              ))}
            </g>
          );
        })()}
        <text x={46} y={H - 2} className="rs-title">RADIALLY SCALED PARAMETERS</text>
      </svg>
    </div>
  );
});

/**
 * The compass transfer drawn on the chart itself: the radius to the plotted
 * point, swung down onto the positive real axis (where r = SWR exactly), then
 * dropped straight down toward the SWR/RL strip printed below the chart.
 * Everything here is geometry — the numbers come from readOff().
 */
const SWR_TICKS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 20];
const SWR_LABELLED = new Set([1.5, 2, 3, 5, 10]); // 1 is the chart's own centre label

export const ReadOff: React.FC<{ g: Complex; cls: 'load' | 'in'; label?: string; ruler?: boolean }> = React.memo(({ g, cls, label, ruler = true }) => {
  if (!isFiniteC(g)) return null;
  const mag = abs(g);
  if (!Number.isFinite(mag) || mag > 1.0001) return null;
  const m = Math.min(mag, 1);
  const ro = readOff(g);
  const rad = m * R;
  const th = arg(g);
  const P = { x: CX + rad * Math.cos(th), y: CY - rad * Math.sin(th) };
  const A = { x: CX + rad, y: CY };
  const swrTxt = Number.isFinite(ro.swr) ? fmtNum(ro.swr, 2) : '∞';
  const tiny = rad < 6; // a matched load has no radius to swing
  // put the callout on the side of the axis the swing arc does NOT cross
  const below = th > 0;
  const labY = below ? CY + 52 : CY - 52;
  const subY = below ? CY + 68 : CY - 36;
  const toLeft = A.x > CX + R * 0.2;
  const labX = toLeft ? A.x - 9 : A.x + 9;
  const anchor = toLeft ? 'end' : 'start';
  const dropY = VB - 30;
  return (
    <g className={`ro ${cls}`}>
      {/* SWR ruler printed on the positive real axis: r = SWR there */}
      {ruler && (
      <g className="ro-ruler">
        <line x1={CX} y1={CY} x2={CX + R} y2={CY} className="ro-axis" />
        {SWR_TICKS.map((sw) => {
          const tx = CX + magFromSwr(sw) * R;
          const lbl = SWR_LABELLED.has(sw);
          return (
            <g key={`rt${sw}`}>
              <line x1={tx} y1={CY - (lbl ? 7 : 4)} x2={tx} y2={CY + (lbl ? 7 : 4)} className={`ro-tick ${lbl ? '' : 'minor'}`} />
              {lbl && <text x={tx} y={CY - 11} textAnchor="middle" className="ro-tick-label">{sw}</text>}
            </g>
          );
        })}
        <text x={CX + R * 0.46} y={CY - 27} textAnchor="middle" className="ro-caption">ครึ่งขวาของแกนนอน: ค่า r ตรงนี้ = SWR</text>
      </g>
      )}
      {/* compass radius, then the swing down onto the axis */}
      {!tiny && <line x1={CX} y1={CY} x2={P.x} y2={P.y} className="ro-spoke" />}
      {!tiny && Math.abs(th) > 1e-4 && (
        <path d={`M${P.x},${P.y} A${rad},${rad} 0 0 ${th > 0 ? 1 : 0} ${A.x},${A.y}`} className="ro-arc" markerEnd="url(#arrowRo)" />
      )}
      {/* where you read it */}
      <circle cx={A.x} cy={A.y} r={5.5} className="ro-dot" />
      {/* the line that drops toward the strip below */}
      <line x1={A.x} y1={A.y} x2={A.x} y2={dropY} className="ro-drop-halo" />
      <line x1={A.x} y1={A.y} x2={A.x} y2={dropY} className="ro-drop" markerEnd="url(#arrowRoDown)" />
      <g className="ro-flag">
        <text x={labX} y={labY} textAnchor={anchor}>อ่านค่าตรงนี้ · SWR = {swrTxt}</text>
        <text x={labX} y={subY} textAnchor={anchor} className="ro-flag-sub">
          {label ? `|Γ| ของ ${label} = ` : '|Γ| = '}{fmtNum(ro.mag, 3)}
        </text>
      </g>
      <text x={A.x + (toLeft ? -7 : 7)} y={VB - 38} textAnchor={anchor} className="ro-drop-label">
        {ruler ? '↓ อ่านค่าที่เหลือบนแถบ SWR/RL' : '↓ กดปุ่ม "อ่าน SWR/RL" เพื่อดูแถบสเกลเต็ม'}
      </text>
    </g>
  );
});
