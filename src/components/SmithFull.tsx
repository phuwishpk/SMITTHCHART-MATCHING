import React from 'react';
import { Complex, abs, isFiniteC, fmtNum } from '../engine/complex';
import { rCircle, xCircle, gCircle, bCircle, toSvg, pathToPoints } from '../engine/smith';
import { gammaFromz, swrFromGamma, magFromSwr } from '../engine/rf';
import { VB, CX, CY, R, circleSvg, DetailedGrid, OuterScales, ReadOff } from './SmithGrid';
import { SmithPoint, SmithCurve } from './SmithFigure';

export interface SmithFullProps {
  title?: string;
  points?: SmithPoint[];
  curves?: SmithCurve[];
  /** constant-SWR circles to draw, by SWR value */
  swr?: number[];
  showY?: boolean;
  /** the wavelength and angle rings printed around a real chart */
  scale?: boolean;
  /** the dense tiers of the printed grid */
  fine?: boolean;
  /** draw the compass read-off for this z */
  readout?: Complex;
  rCircles?: number[];
  xCircles?: number[];
  gCircles?: number[];
  bCircles?: number[];
  labels?: { z: Complex; text: string }[];
  note?: string;
}

/**
 * The Lab's chart, printed into a course figure: the same DetailedGrid, OuterScales
 * and ReadOff at the same 800-unit geometry, so what a student learns to read here
 * is literally the chart they will use. Static — no store, no hover, no markers.
 */
export const SmithFull: React.FC<SmithFullProps> = React.memo(
  ({ title, points, curves, swr, showY = false, scale = true, fine = true, readout, rCircles, xCircles, gCircles, bCircles, labels, note }) => {
    const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
    const clip = `cf${uid}`;
    return (
      <div className="smith-full">
        {title && <div className="sf-title">{title}</div>}
        <div className="smith-full-scroll">
          <svg viewBox={`0 0 ${VB} ${VB}`} className={`smith-svg ${fine ? 'fine' : 'coarse'}`} width="100%">
            <defs>
              <clipPath id={clip}>
                <circle cx={CX} cy={CY} r={R} />
              </clipPath>
              <marker id={`cfa${uid}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
              </marker>
              <marker id="arrowRo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
              </marker>
              <marker id="arrowRoDown" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
              </marker>
            </defs>
            <circle cx={CX} cy={CY} r={R} className="chart-bg" />
            {scale && <OuterScales />}
            <DetailedGrid showZ showY={showY} clipId={clip} />

            {/* highlighted coordinate lines */}
            <g className="highlights" clipPath={`url(#${clip})`}>
              {rCircles?.map((r) => <circle key={`hr${r}`} {...circleSvg(rCircle(r))} className="hl r" />)}
              {xCircles?.map((x) => (Math.abs(x) < 1e-9
                ? <line key={`hx${x}`} x1={CX - R} y1={CY} x2={CX + R} y2={CY} className="hl x" />
                : <circle key={`hx${x}`} {...circleSvg(xCircle(x))} className="hl x" />))}
              {gCircles?.map((g) => <circle key={`hg${g}`} {...circleSvg(gCircle(g))} className="hl g" />)}
              {bCircles?.map((b) => <circle key={`hb${b}`} {...circleSvg(bCircle(b))} className="hl b" />)}
            </g>

            {/* constant-SWR circles */}
            {swr?.map((s, i) => {
              const m = magFromSwr(s);
              return (
                <g key={`s${s}`} className="swr">
                  <circle cx={CX} cy={CY} r={m * R} className="swr-circle load" />
                  <text x={CX - m * R * 0.71 - 3} y={CY - m * R * 0.71 - 5 - i * 12} textAnchor="end" className="cf-swr-label">SWR {fmtNum(s, 2)}</text>
                </g>
              );
            })}

            {readout && isFiniteC(gammaFromz(readout)) && abs(gammaFromz(readout)) <= 1.0001 && (
              <ReadOff g={gammaFromz(readout)} cls="in" label={`z = ${fmtNum(readout.re, 2)}${readout.im < 0 ? ' − j' : ' + j'}${fmtNum(Math.abs(readout.im), 2)}`} ruler />
            )}

            {curves?.map((cv, i) => {
              const gs = cv.zs.map((z) => gammaFromz(z));
              const last = gs[gs.length - 1];
              const lp = last && isFiniteC(last) ? toSvg(last, CX, CY, R) : null;
              return (
                <g key={i}>
                  <polyline
                    points={pathToPoints(gs, CX, CY, R)}
                    className={`cf-curve ${cv.cls ?? ''}`}
                    style={{ strokeDasharray: cv.dashed ? '9 6' : undefined }}
                    markerEnd={cv.arrow ? `url(#cfa${uid})` : undefined}
                  />
                  {cv.label && lp && (
                    <text x={lp.x + (lp.x > CX ? -10 : 10)} y={lp.y + (lp.y < CY ? -10 : 20)} textAnchor={lp.x > CX ? 'end' : 'start'} className={`cf-curve-label ${cv.cls ?? ''}`}>{cv.label}</text>
                  )}
                </g>
              );
            })}

            {points?.map((pt, i) => {
              const g = gammaFromz(pt.z);
              if (!isFiniteC(g) || abs(g) > 1.0001) return null;
              const p = toSvg(g, CX, CY, R);
              const right = p.x > CX + 0.1 * R;
              const dy = i % 2 === 0 ? -12 : 24;
              return (
                <g key={i} className={`cf-pt ${pt.cls ?? 'mid'}`}>
                  <circle cx={p.x} cy={p.y} r={8} />
                  {pt.label && (
                    <text x={p.x + (right ? -12 : 12)} y={p.y + dy} textAnchor={right ? 'end' : 'start'}>
                      {pt.label}
                    </text>
                  )}
                </g>
              );
            })}

            {labels?.map((l, i) => {
              const g = gammaFromz(l.z);
              if (!isFiniteC(g)) return null;
              const p = toSvg(g, CX, CY, R);
              return <text key={`l${i}`} x={p.x} y={p.y} textAnchor="middle" className="cf-label">{l.text}</text>;
            })}
          </svg>
        </div>
        {note && <div className="sf-note">{note}</div>}
        {points && points.length > 0 && (
          <table className="cf-table">
            <thead><tr><th>จุด</th><th>z</th><th>|Γ|</th><th>SWR</th></tr></thead>
            <tbody>
              {points.map((pt, i) => {
                const g = gammaFromz(pt.z);
                if (!isFiniteC(g)) return null;
                const s = swrFromGamma(g);
                return (
                  <tr key={i}>
                    <td>{pt.label ?? `#${i + 1}`}</td>
                    <td className="mono">{fmtNum(pt.z.re, 3)} {pt.z.im < 0 ? '−' : '+'} j{fmtNum(Math.abs(pt.z.im), 3)}</td>
                    <td className="mono">{fmtNum(abs(g), 3)}</td>
                    <td className="mono">{Number.isFinite(s) ? fmtNum(s, 2) : '∞'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  },
);
