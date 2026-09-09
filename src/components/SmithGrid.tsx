import React from 'react';
import { Complex, abs, fmtNum } from '../engine/complex';
import { rCircle, xCircle } from '../engine/smith';

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
export const RadialScales: React.FC<{ gammaIn: Complex; gammaL: Complex; hasNetwork: boolean }> = ({ gammaIn, gammaL, hasNetwork }) => {
  const W = 800;
  const H = 118;
  const x0 = 70;
  const x1 = W - 20;
  const xOf = (m: number) => x0 + Math.min(1, Math.max(0, m)) * (x1 - x0);
  const rows: { label: string; ticks: { m: number; t: string; minor?: boolean }[] }[] = [
    {
      label: '|Γ|',
      ticks: [...range(0, 1.0001, 0.02).map((m) => ({ m, t: Math.round(m * 100) % 10 === 0 ? m.toFixed(1) : '', minor: Math.round(m * 100) % 10 !== 0 }))],
    },
    {
      label: 'SWR',
      ticks: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2, 2.5, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50].map((s) => ({ m: (s - 1) / (s + 1), t: String(s) })).concat([{ m: 1, t: '∞' }]),
    },
    {
      label: 'RL (dB)',
      ticks: [40, 30, 25, 20, 15, 12, 10, 8, 6, 5, 4, 3, 2, 1, 0].map((rl) => ({ m: 10 ** (-rl / 20), t: String(rl) })).concat([{ m: 0, t: '∞' }]),
    },
    {
      label: 'Refl. %',
      ticks: [0, 1, 2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => ({ m: Math.sqrt(p / 100), t: String(p) })),
    },
  ];
  const rowY = (i: number) => 22 + i * 24;
  const mIn = abs(gammaIn);
  const mL = abs(gammaL);
  return (
    <div className="radial-scales">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        {rows.map((row, i) => (
          <g key={row.label} className="rs-row">
            <text x={x0 - 8} y={rowY(i) + 3} textAnchor="end" className="rs-label">{row.label}</text>
            <line x1={x0} y1={rowY(i)} x2={x1} y2={rowY(i)} className="rs-axis" />
            {row.ticks.map((tk, j) => (
              <g key={j}>
                <line x1={xOf(tk.m)} y1={rowY(i) - (tk.minor ? 3 : 5)} x2={xOf(tk.m)} y2={rowY(i)} className={tk.minor ? 'rs-tick minor' : 'rs-tick'} />
                {tk.t && <text x={xOf(tk.m)} y={rowY(i) - 7} textAnchor="middle" className="rs-tick-label">{tk.t}</text>}
              </g>
            ))}
          </g>
        ))}
        {hasNetwork && Number.isFinite(mL) && (
          <g className="rs-marker load">
            <line x1={xOf(mL)} y1={8} x2={xOf(mL)} y2={H - 14} />
            <text x={xOf(mL)} y={H - 3} textAnchor="middle">|Γ_L| = {fmtNum(mL, 3)}</text>
          </g>
        )}
        {Number.isFinite(mIn) && (
          <g className="rs-marker in">
            <line x1={xOf(mIn)} y1={8} x2={xOf(mIn)} y2={H - 14} />
            <text x={xOf(mIn)} y={H - 3} textAnchor={mIn > 0.85 ? 'end' : mIn < 0.12 ? 'start' : 'middle'}>|Γ_in| = {fmtNum(mIn, 3)}</text>
          </g>
        )}
      </svg>
    </div>
  );
};
