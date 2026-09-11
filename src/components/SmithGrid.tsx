import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Complex, abs, arg, fmtNum, isFiniteC } from '../engine/complex';
import { rCircle, xCircle, gCircle } from '../engine/smith';
import {
  readOff, magFromSwr, magFromRlDb, magFromReflPct,
  swrDb, magFromSwrDb, magFromSwLoss, magFromMismatchDb, magFromTransmP, magFromAttenDb, transmPower,
} from '../engine/rf';

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

/**
 * The chart with almost nothing on it: the rim, the real axis and — optionally — a
 * handful of unlabelled guide circles. For the first figure a beginner sees, where the
 * printed grid is exactly the thing the text is asking them to ignore.
 */
export const MinimalGrid: React.FC<{ guides?: boolean; showY?: boolean; clipId?: string }> = React.memo(({ guides = false, showY = false, clipId = 'clipUnit' }) => (
  <g className="mgrid">
    {guides && (
      <g className="mgrid-guides" clipPath={`url(#${clipId})`}>
        {[0.2, 0.5, 1, 2, 5].map((r) => <circle key={`gr${r}`} {...circleSvg(rCircle(r))} />)}
        {[0.5, 1, 2, -0.5, -1, -2].map((x) => <circle key={`gx${x}`} {...circleSvg(xCircle(x))} />)}
        {showY && [0.2, 0.5, 1, 2, 5].map((g) => <circle key={`gg${g}`} className="y" {...circleSvg(gCircle(g))} />)}
      </g>
    )}
    <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} className="axis" />
    <circle cx={CX} cy={CY} r={R} className="rim" />
  </g>
));

export const DetailedGrid: React.FC<{ showZ: boolean; showY: boolean; clipId?: string }> = React.memo(({ showZ, showY, clipId = 'clipUnit' }) => (
  <g>
    {showZ && (
      <g className="grid z" clipPath={`url(#${clipId})`}>
        <Family mirror={false} prefix="z" />
      </g>
    )}
    {showY && (
      <g className="grid y" clipPath={`url(#${clipId})`}>
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

/** one printed row of the strip: which half it lives on and where each tick sits on the 0…1 radius */
interface StripRow {
  label: string;
  side: 'left' | 'right';
  ticks: { m: number; t: string; minor?: boolean }[];
}

/**
 * RADIALLY SCALED PARAMETERS, laid out the way the printed chart lays them out: one strip as wide
 * as the chart's diameter, CENTER directly under the chart's centre, ORIGIN under the left rim.
 * Every value here is a function of |Γ| alone, so it is read with a compass — open it from the
 * chart's centre to the point, then set that same opening from CENTER along the strip. The
 * reflection family (SWR, dBS, return loss, |Γ|², |Γ|) runs from CENTER out to the LEFT, the
 * transmission family (line attenuation, standing-wave loss, mismatch loss, transmitted power) runs
 * from CENTER out to the RIGHT, and the bottom line is 1 + Γ along the real axis, 0 … 2.
 */
export const RadialScales: React.FC<{
  gammaIn: Complex;
  gammaL: Complex;
  hasNetwork: boolean;
  readout?: ReadoutMark;
  /** the chart this strip sits under: the strip is sized and offset to share its x-mapping exactly */
  alignTo?: React.RefObject<SVGSVGElement | null>;
}> = React.memo(({ gammaIn, gammaL, hasNetwork, readout, alignTo }) => {
  const W = 800;
  const H = 168;
  const XL = CX - R; // ORIGIN, under the left rim
  const XR = CX + R; // under the right rim
  const xLeft = (m: number) => CX - Math.min(1, Math.max(0, m)) * R;
  const xRight = (m: number) => CX + Math.min(1, Math.max(0, m)) * R;
  const xOf = (side: 'left' | 'right', m: number) => (side === 'left' ? xLeft(m) : xRight(m));
  const inf = (m: number, t = '∞') => ({ m, t });
  // The rows, in the printed order, top to bottom. Left and right rows share a line.
  const rows: StripRow[] = [
    { label: 'SWR', side: 'left',
      ticks: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2, 2.5, 3, 4, 5, 10, 20, 40, 100].map((s) => ({ m: magFromSwr(s), t: String(s) })).concat([inf(1)]) },
    { label: 'ATTEN dB', side: 'right',
      ticks: [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((a) => ({ m: magFromAttenDb(a), t: String(a) })).concat([inf(0)]) },
    { label: 'dBS', side: 'left',
      ticks: [0, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40].map((d) => ({ m: magFromSwrDb(d), t: String(d) })).concat([inf(1)]) },
    { label: 'SW LOSS COEFF', side: 'right',
      ticks: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2, 3, 4, 5, 10, 20].map((k) => ({ m: magFromSwLoss(k), t: String(k) })).concat([inf(1)]) },
    { label: 'RTN LOSS dB', side: 'left',
      ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 20, 30].map((rl) => ({ m: magFromRlDb(rl), t: String(rl) })).concat([inf(0)]) },
    { label: 'RFL LOSS dB', side: 'right',
      ticks: [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.5, 2, 3, 4, 5, 6, 10, 15].map((l) => ({ m: magFromMismatchDb(l), t: String(l) })).concat([inf(1)]) },
    { label: 'RFL COEFF P', side: 'left',
      ticks: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.01, 0].map((p) => ({ m: magFromReflPct(p * 100), t: String(p) })) },
    { label: 'TRANSM COEFF P', side: 'right',
      ticks: [1, 0.99, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0].map((p) => ({ m: magFromTransmP(p), t: String(p) })) },
    { label: 'RFL COEFF E/I', side: 'left',
      ticks: range(0, 1.0001, 0.05).map((m) => ({ m, t: Math.round(m * 100) % 10 === 0 ? m.toFixed(1) : '', minor: Math.round(m * 100) % 10 !== 0 })) },
  ];
  const LINES = 5; // row pairs
  const rowY = (i: number) => 22 + i * 22;
  const lineOf = (r: StripRow) => rows.filter((q) => q.side === r.side).indexOf(r);
  const yBottom = rowY(LINES) + 4; // the full-width 1 + Γ line
  const mIn = abs(gammaIn);
  const mL = abs(gammaL);
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Both SVGs use the same 800-unit viewBox width, so the strip lands under the chart's own |Γ| axis
  // as long as it is drawn at the same scale and the same origin. When the chart is height-limited
  // (a phone, a short window) its content is smaller than its box, so match it measurement by
  // measurement rather than hoping the CSS widths agree.
  const [fit, setFit] = useState<{ w: number; dx: number } | null>(null);
  const fitRef = useRef(fit);
  fitRef.current = fit;
  useLayoutEffect(() => {
    const chart = alignTo?.current;
    const self = svgRef.current;
    if (!chart || !self) return;
    const measure = () => {
      const m = chart.getScreenCTM();
      const own = self.getScreenCTM();
      if (!m || !own) return;
      const w = 800 * m.a;
      const dx = m.e - (own.e - (fitRef.current?.dx ?? 0));
      setFit((prev) => (prev && Math.abs(prev.w - w) < 0.5 && Math.abs(prev.dx - dx) < 0.5 ? prev : { w, dx }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(chart);
    if (self.parentElement) ro.observe(self.parentElement);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [alignTo]);
  const readM = readout && Number.isFinite(readout.mag) ? Math.min(1, Math.max(0, readout.mag)) : null;
  useEffect(() => {
    const box = boxRef.current;
    if (!box || readM === null) return;
    if (box.scrollWidth <= box.clientWidth + 4) return;
    const target = (xLeft(readM) / W) * box.scrollWidth - box.clientWidth / 2;
    box.scrollTo({ left: Math.max(0, Math.min(target, box.scrollWidth - box.clientWidth)), behavior: 'smooth' });
  }, [readM]);
  // Every tick keeps its mark; a label is printed only where there is room for it, since each
  // scale is compressed toward the rim. The tick at the rim end (∞, 0 or 1) always keeps its label.
  const wide = (t: string) => 7 + t.length * 4.4;
  const labelled = (row: StripRow) => {
    const order = row.ticks.map((tk, j) => ({ j, x: xOf(row.side, tk.m) })).sort((a, b) => a.x - b.x);
    const keep = new Set<number>();
    const rimIdx = row.side === 'left' ? order[0].j : order[order.length - 1].j;
    const seq = row.side === 'left' ? [...order].reverse() : order; // walk from CENTER toward the rim
    let last = -Infinity;
    const rimX = xOf(row.side, row.ticks[rimIdx].m);
    const rimHalf = wide(row.ticks[rimIdx].t) / 2;
    for (const { j, x } of seq) {
      const t = row.ticks[j].t;
      if (!t) continue;
      const half = wide(t) / 2;
      const near = row.side === 'left' ? x - half : x + half;
      const far = row.side === 'left' ? x + half : x - half;
      const clearsLast = row.side === 'left' ? far < last : far > last;
      const clearsRim = j === rimIdx || (row.side === 'left' ? near > rimX + rimHalf : near < rimX - rimHalf);
      if (j !== rimIdx && !(clearsLast || last === -Infinity)) continue;
      if (!clearsRim) continue;
      keep.add(j);
      last = row.side === 'left' ? x - half : x + half;
    }
    keep.add(rimIdx);
    return keep;
  };
  const ro = readM !== null ? readOff({ re: readM, im: 0 }) : null;
  const fmtInf = (v: number, d: number) => (Number.isFinite(v) ? fmtNum(v, d) : '∞');
  return (
    <div className="radial-scales" ref={boxRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={fit ? { width: `${fit.w}px`, maxWidth: 'none', transform: `translateX(${fit.dx}px)` } : undefined}
      >
        <text x={XR} y={9} textAnchor="end" className="rs-title">RADIALLY SCALED PARAMETERS</text>
        {/* the read line goes under the printed ticks so its halo cannot erase them */}
        {readM !== null && readout && (
          <g className={`rs-read ${readout.cls}`}>
            {(readM < 0.02 ? (['right'] as const) : (['left', 'right'] as const)).map((side) => (
              <g key={side}>
                <line x1={xOf(side, readM)} y1={rowY(0) - 8} x2={xOf(side, readM)} y2={yBottom + 6} className="rs-read-halo" />
                <line x1={xOf(side, readM)} y1={rowY(0) - 8} x2={xOf(side, readM)} y2={yBottom + 6} className="rs-read-line" />
              </g>
            ))}
          </g>
        )}
        {/* CENTER and ORIGIN, as printed */}
        <line x1={CX} y1={rowY(0) - 10} x2={CX} y2={yBottom + 2} className="rs-centre" />
        {rows.map((row) => {
          const y = rowY(lineOf(row));
          const keep = labelled(row);
          const a = row.side === 'left' ? XL : CX;
          const b = row.side === 'left' ? CX : XR;
          return (
            <g key={row.label} className="rs-row">
              <text x={row.side === 'left' ? XL - 6 : XR + 6} y={y + 3} textAnchor={row.side === 'left' ? 'end' : 'start'} className="rs-label">{row.label}</text>
              <line x1={a} y1={y} x2={b} y2={y} className="rs-axis" />
              {row.ticks.map((tk, j) => (
                <g key={j}>
                  <line x1={xOf(row.side, tk.m)} y1={y - (tk.minor ? 3 : 5)} x2={xOf(row.side, tk.m)} y2={y} className={tk.minor ? 'rs-tick minor' : 'rs-tick'} />
                  {keep.has(j) && tk.t && <text x={xOf(row.side, tk.m)} y={y - 6} textAnchor="middle" className="rs-tick-label">{tk.t}</text>}
                </g>
              ))}
            </g>
          );
        })}
        {/* the full-width bottom line: 1 + Γ along the real axis, 0 at ORIGIN, 1 at CENTER, 2 at the right rim */}
        <g className="rs-row">
          <text x={XL - 6} y={yBottom + 3} textAnchor="end" className="rs-label">TRANSM COEFF E/I</text>
          <line x1={XL} y1={yBottom} x2={XR} y2={yBottom} className="rs-axis" />
          {range(0, 2.0001, 0.1).map((v) => {
            const x = XL + (v / 2) * (XR - XL);
            const major = Math.round(v * 10) % 5 === 0;
            return (
              <g key={`t${v.toFixed(1)}`}>
                <line x1={x} y1={yBottom - (major ? 5 : 3)} x2={x} y2={yBottom} className={major ? 'rs-tick' : 'rs-tick minor'} />
                {major && <text x={x} y={yBottom - 6} textAnchor="middle" className="rs-tick-label">{v.toFixed(1)}</text>}
              </g>
            );
          })}
          <text x={CX} y={yBottom + 13} textAnchor="middle" className="rs-anchor">▲ CENTER</text>
          <text x={XL} y={yBottom + 13} textAnchor="middle" className="rs-anchor">▲ ORIGIN</text>
        </g>
        {hasNetwork && Number.isFinite(mL) && (
          <g className="rs-marker load">
            <line x1={xLeft(mL)} y1={rowY(0) - 8} x2={xLeft(mL)} y2={yBottom + 2} />
            <text x={xLeft(mL)} y={rowY(0) - 11} textAnchor="middle">|Γ_L| = {fmtNum(mL, 3)}</text>
          </g>
        )}
        {Number.isFinite(mIn) && (
          <g className="rs-marker in">
            <line x1={xLeft(mIn)} y1={rowY(0) - 8} x2={xLeft(mIn)} y2={yBottom + 2} />
            <text x={xLeft(mIn)} y={rowY(0) - 11} textAnchor={mIn > 0.85 ? 'start' : 'middle'}>|Γ_in| = {fmtNum(mIn, 3)}</text>
          </g>
        )}
        {readM !== null && readout && ro && (
          <g className={`rs-read ${readout.cls}`}>
            {rows.map((row) => (
              <circle key={`rd${row.label}`} cx={xOf(row.side, readM)} cy={rowY(lineOf(row))} r={3} className="rs-read-dot" />
            ))}
            {/* what the compass opening reads on each row, printed once under the strip */}
            <text x={CX} y={H - 4} textAnchor="middle" className="rs-read-val">
              {readout.label ? `${readout.label} · ` : ''}|Γ| {fmtNum(ro.mag, 3)} · SWR {fmtInf(ro.swr, 2)} ({fmtInf(swrDb(ro.swr), 1)} dBS) · RL {fmtInf(ro.rlDb, 1)} dB · |Γ|² {fmtNum(ro.mag * ro.mag, 3)} · mismatch {fmtInf(ro.mismatchDb, 2)} dB · transm. {fmtNum(transmPower(ro.mag), 3)}
            </text>
          </g>
        )}
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
  const B = { x: CX - rad, y: CY };
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
      {/* where you read it: the same opening set to the right (r = SWR here) and to the left of centre */}
      <circle cx={A.x} cy={A.y} r={5.5} className="ro-dot" />
      {!tiny && <line x1={CX} y1={CY} x2={B.x} y2={B.y} className="ro-mirror" />}
      {!tiny && <circle cx={B.x} cy={B.y} r={5.5} className="ro-dot" />}
      {/* the two lines that drop straight onto the strip below: left onto SWR / RL / |Γ|, right onto loss / transmission */}
      <line x1={A.x} y1={A.y} x2={A.x} y2={dropY} className="ro-drop-halo" />
      <line x1={A.x} y1={A.y} x2={A.x} y2={dropY} className="ro-drop" markerEnd="url(#arrowRoDown)" />
      {!tiny && <line x1={B.x} y1={B.y} x2={B.x} y2={dropY} className="ro-drop-halo" />}
      {!tiny && <line x1={B.x} y1={B.y} x2={B.x} y2={dropY} className="ro-drop" markerEnd="url(#arrowRoDown)" />}
      <g className="ro-flag">
        <text x={labX} y={labY} textAnchor={anchor}>อ่านค่าตรงนี้ · SWR = {swrTxt}</text>
        <text x={labX} y={subY} textAnchor={anchor} className="ro-flag-sub">
          {label ? `|Γ| ของ ${label} = ` : '|Γ| = '}{fmtNum(ro.mag, 3)}
        </text>
      </g>
      {ruler ? (
        <>
          {!tiny && <text x={B.x - 7} y={VB - 38} textAnchor="end" className="ro-drop-label">↓ ฝั่งซ้าย: SWR · dBS · RL · |Γ|</text>}
          <text x={A.x + 7} y={VB - 38} textAnchor="start" className="ro-drop-label">↓ ฝั่งขวา: loss · transm.</text>
        </>
      ) : (
        <text x={A.x + (toLeft ? -7 : 7)} y={VB - 38} textAnchor={anchor} className="ro-drop-label">↓ กดปุ่ม "อ่าน SWR/RL" เพื่อดูแถบสเกลเต็ม</text>
      )}
    </g>
  );
});
