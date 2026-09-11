import React from 'react';
import { Complex, abs, isFiniteC, fmtNum } from '../engine/complex';
import { rCircle, xCircle, gCircle, bCircle, toSvg, pathToPoints } from '../engine/smith';
import { gammaFromz } from '../engine/rf';

export interface SmithPoint {
  z: Complex;
  label?: string;
  /** 'goal' is a target that has NOT been reached yet — drawn as a hollow ring, never as a result */
  /** 'gen' and 'ld' are the two walking directions, kept in high-contrast colours wherever both appear */
  cls?: 'load' | 'in' | 'mid' | 'y' | 'stub' | 'goal' | 'gen' | 'ld';
}
export interface SmithCurve {
  zs: Complex[];
  label?: string;
  cls?: string;
  dashed?: boolean;
  arrow?: boolean;
}
interface Props {
  title?: string;
  points?: SmithPoint[];
  curves?: SmithCurve[];
  /** constant-SWR circles to draw */
  swr?: number[];
  showY?: boolean;
  rCircles?: number[];
  xCircles?: number[];
  gCircles?: number[];
  bCircles?: number[];
  /** shade the interior of r=1 / g=1 circles (used for the L-network region map) */
  regions?: boolean;
  note?: string;
  labels?: { z: Complex; text: string }[];
}

const VB = 300;
const CX = 150;
const CY = 150;
const R = 128;
const c = (cc: { cx: number; cy: number; r: number }) => {
  const p = toSvg({ re: cc.cx, im: cc.cy }, CX, CY, R);
  return { cx: p.x, cy: p.y, r: cc.r * R };
};

/** Static Smith-chart figure for the course: coarse grid + explicit points / curves. */
export const SmithFigure: React.FC<Props> = ({ title, points, curves, swr, showY, rCircles, xCircles, gCircles, bCircles, regions, note, labels }) => {
  const uid = React.useId().replace(/:/g, '');
  const axisTaken = React.useMemo(() => {
    const near = (g: Complex, x: number) => Math.abs(g.re - x) < 0.07 && Math.abs(g.im) < 0.07;
    const gs = (points ?? []).map((p) => gammaFromz(p.z)).filter(isFiniteC);
    return { zero: gs.some((g) => near(g, -1)), one: gs.some((g) => near(g, 0)), inf: gs.some((g) => near(g, 1)) };
  }, [points]);
  return (
    <div className="smith-figure">
      {title && <div className="sf-title">{title}</div>}
      <svg viewBox={`0 0 ${VB} ${VB}`} width="100%">
        <defs>
          <clipPath id={`clip${uid}`}>
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
          <marker id={`arr${uid}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
          </marker>
        </defs>
        <circle cx={CX} cy={CY} r={R} className="sf-bg" />
        {regions && (
          <g clipPath={`url(#clip${uid})`}>
            <circle {...c(rCircle(1))} className="sf-region r" />
            <circle {...c(gCircle(1))} className="sf-region g" />
          </g>
        )}
        <g clipPath={`url(#clip${uid})`} className="sf-grid">
          {[0.2, 0.5, 1, 2, 5].map((r) => <circle key={`r${r}`} {...c(rCircle(r))} className={r === 1 ? 'major' : ''} />)}
          {[0.2, 0.5, 1, 2, 5].flatMap((x) => [x, -x]).map((x) => <circle key={`x${x}`} {...c(xCircle(x))} className={Math.abs(x) === 1 ? 'major' : ''} />)}
          {showY && [0.2, 0.5, 1, 2, 5].map((g) => <circle key={`g${g}`} {...c(gCircle(g))} className={`y ${g === 1 ? 'major' : ''}`} />)}
          {showY && [0.2, 0.5, 1, 2, 5].flatMap((b) => [b, -b]).map((b) => <circle key={`b${b}`} {...c(bCircle(b))} className="y" />)}
          {rCircles?.map((r) => <circle key={`hr${r}`} {...c(rCircle(r))} className="hl r" />)}
          {xCircles?.map((x) => (Math.abs(x) < 1e-9 ? <line key={`hx${x}`} x1={CX - R} y1={CY} x2={CX + R} y2={CY} className="hl x" /> : <circle key={`hx${x}`} {...c(xCircle(x))} className="hl x" />))}
          {gCircles?.map((g) => <circle key={`hg${g}`} {...c(gCircle(g))} className="hl g" />)}
          {bCircles?.map((b) => <circle key={`hb${b}`} {...c(bCircle(b))} className="hl b" />)}
        </g>
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} className="sf-axis" />
        <circle cx={CX} cy={CY} r={R} className="sf-rim" />
        {/* the 0 / 1 / infinity markers step aside when a plotted point already occupies that spot,
            otherwise every label placed at the centre collides with the tiny "1" */}
        {!axisTaken.one && <text x={CX + 3} y={CY - 4} className="sf-small">1</text>}
        {!axisTaken.zero && <text x={CX - R + 2} y={CY + 11} className="sf-small">0</text>}
        {!axisTaken.inf && <text x={CX + R - 8} y={CY + 11} className="sf-small">∞</text>}
        {swr?.map((s, i) => {
          const m = (s - 1) / (s + 1);
          return (
            <g key={`s${s}`}>
              <circle cx={CX} cy={CY} r={m * R} className="sf-swr" />
              <text x={CX - m * R * 0.72 - 2} y={CY - m * R * 0.72 - 4 - i * 3} textAnchor="end" className="sf-small swr">SWR {fmtNum(s, 2)}</text>
            </g>
          );
        })}
        {curves?.map((cv, i) => {
          const gs = cv.zs.map((z) => gammaFromz(z));
          const last = gs[gs.length - 1];
          const lp = last && isFiniteC(last) ? toSvg(last, CX, CY, R) : null;
          return (
            <g key={i}>
              <polyline points={pathToPoints(gs, CX, CY, R)} className={`sf-curve ${cv.cls ?? ''}`} style={{ strokeDasharray: cv.dashed ? '4 3' : undefined }} markerEnd={cv.arrow ? `url(#arr${uid})` : undefined} />
              {cv.label && lp && <text x={lp.x + (lp.x > CX ? -6 : 6)} y={lp.y + (lp.y < CY ? -6 : 12)} textAnchor={lp.x > CX ? 'end' : 'start'} className={`sf-curve-label ${cv.cls ?? ''}`}>{cv.label}</text>}
            </g>
          );
        })}
        {points?.map((pt, i) => {
          const g = gammaFromz(pt.z);
          if (!isFiniteC(g) || abs(g) > 1.0001) return null;
          const p = toSvg(g, CX, CY, R);
          const right = p.x > CX + 0.1 * R;
          const dy = i % 2 === 0 ? -6 : 13;
          return (
            <g key={i} className={`sf-pt ${pt.cls ?? 'mid'}`}>
              <circle cx={p.x} cy={p.y} r={4.5} />
              {pt.label && <text x={p.x + (right ? -7 : 7)} y={p.y + dy} textAnchor={right ? 'end' : 'start'}>{pt.label}</text>}
            </g>
          );
        })}
        {labels?.map((l, i) => {
          const g = gammaFromz(l.z);
          const p = toSvg(g, CX, CY, R);
          return <text key={`l${i}`} x={p.x} y={p.y} textAnchor="middle" className="sf-label">{l.text}</text>;
        })}
      </svg>
      {note && <div className="sf-note">{note}</div>}
    </div>
  );
};
