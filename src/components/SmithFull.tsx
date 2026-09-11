import React from 'react';
import { Complex, abs, isFiniteC, fmtNum } from '../engine/complex';
import { rCircle, xCircle, gCircle, bCircle, toSvg, pathToPoints } from '../engine/smith';
import { gammaFromz, swrFromGamma, magFromSwr } from '../engine/rf';
import { VB, CX, CY, R, circleSvg, DetailedGrid, MinimalGrid, OuterScales, ReadOff, RadialScales, ScaleRay } from './SmithGrid';
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
  /** 'full' prints the real chart; 'light' a few unlabelled guides; 'none' only the rim and axis */
  grid?: 'full' | 'light' | 'none';
  /** the z / |Γ| / SWR table under the chart (off for figures drawn before SWR is taught) */
  table?: boolean;
  /** shade the two halves the way a printed reference chart does: upper = inductive, lower = capacitive */
  halves?: boolean;
  /** the Γ angle at the two ends of the real axis — 0° at OPEN, 180° at SHORT */
  angles?: boolean;
  /** the +jx / −jx direction bar with an inductor and a capacitor symbol, in the right margin */
  lcBar?: boolean;
  /** component symbols dropped on the chart at a given z, the way reference charts annotate the halves */
  glyphs?: { z: Complex; kind: 'L' | 'C' | 'R' }[];
  /** ruler lines from the centre through a point out to the printed rings, for reading the scales */
  rays?: { z: Complex; label?: string; cls?: string }[];
  /** draw the compass read-off for this z */
  readout?: Complex;
  /** the SWR / RL / |Γ| strip under the chart — on by default whenever there is a readout to land on */
  strip?: boolean;
  rCircles?: number[];
  xCircles?: number[];
  gCircles?: number[];
  bCircles?: number[];
  labels?: { z: Complex; text: string }[];
  note?: string;
}

/** schematic symbols, drawn at 1:1 in the chart's own 800-unit space and centred on (x, y) */
const GLYPH: Record<'L' | 'C' | 'R', string> = {
  // three bumps of a coil, with a lead each side
  L: 'M-30 0 h8 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 h8',
  // two plates
  C: 'M-30 0 h20 M-10 -13 v26 M10 -13 v26 M10 0 h20',
  // a resistor zigzag
  R: 'M-30 0 h8 l4 -9 l7 18 l7 -18 l7 18 l4 -9 h8',
};
const Glyph: React.FC<{ x: number; y: number; kind: 'L' | 'C' | 'R' }> = ({ x, y, kind }) => (
  <path d={GLYPH[kind]} transform={`translate(${x} ${y})`} className={`cf-glyph ${kind}`} />
);

/**
 * The Lab's chart, printed into a course figure: the same DetailedGrid, OuterScales
 * and ReadOff at the same 800-unit geometry, so what a student learns to read here
 * is literally the chart they will use. Static — no store, no hover, no markers.
 */
export const SmithFull: React.FC<SmithFullProps> = React.memo(
  ({ title, points, curves, swr, showY = false, scale = true, fine = true, grid = 'full', table = true,
     halves = false, angles = false, lcBar = false, glyphs, rays, readout, strip = true, rCircles, xCircles, gCircles, bCircles, labels, note }) => {
    const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
    const clip = `cf${uid}`;
    const chartSvgRef = React.useRef<SVGSVGElement>(null);
    return (
      <div className="smith-full">
        {title && <div className="sf-title">{title}</div>}
        <div className="sf-scrollhint">↔ เลื่อนซ้าย–ขวาเพื่อดูกราฟทั้งใบ</div>
        <div className="smith-full-scroll">
          <svg ref={chartSvgRef} viewBox={`0 0 ${VB} ${VB}`} className={`smith-svg ${fine ? 'fine' : 'coarse'}${grid === 'full' ? '' : ' plain'}`} width="100%">
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
            {halves && (
              <g className="cf-halves">
                <path d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY} Z`} className="half ind" />
                <path d={`M${CX - R} ${CY} A${R} ${R} 0 0 0 ${CX + R} ${CY} Z`} className="half cap" />
              </g>
            )}
            {scale && <OuterScales />}
            {grid === 'full'
              ? <DetailedGrid showZ showY={showY} clipId={clip} />
              : <MinimalGrid guides={grid === 'light'} showY={showY} clipId={clip} />}

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

            {rays?.map((ry, i) => <ScaleRay key={`ray${i}`} g={gammaFromz(ry.z)} cls={ry.cls} label={ry.label} />)}

            {glyphs?.map((gl, i) => {
              const g = gammaFromz(gl.z);
              if (!isFiniteC(g)) return null;
              const p = toSvg(g, CX, CY, R);
              return <Glyph key={`gl${i}`} x={p.x} y={p.y} kind={gl.kind} />;
            })}

            {angles && (
              <g className="cf-ang">
                <text x={CX + R + 8} y={CY + 6} textAnchor="start">0°</text>
                <text x={CX - R - 8} y={CY + 6} textAnchor="end">180°</text>
              </g>
            )}

            {lcBar && (
              <g className="cf-lcbar">
                <Glyph x={CX + R + 46} y={CY - R + 22} kind="L" />
                <line x1={CX + R + 46} y1={CY - 22} x2={CX + R + 46} y2={CY - R + 62} markerEnd={`url(#cfa${uid})`} className="bar ind" />
                <line x1={CX + R + 46} y1={CY + 22} x2={CX + R + 46} y2={CY + R - 62} markerEnd={`url(#cfa${uid})`} className="bar cap" />
                <Glyph x={CX + R + 46} y={CY + R - 22} kind="C" />
                <text x={CX + R + 46} y={CY - 150} textAnchor="middle" className="tag ind">+jx</text>
                <text x={CX + R + 46} y={CY + 160} textAnchor="middle" className="tag cap">−jx</text>
              </g>
            )}

            {labels?.map((l, i) => {
              const g = gammaFromz(l.z);
              if (!isFiniteC(g)) return null;
              const p = toSvg(g, CX, CY, R);
              return <text key={`l${i}`} x={p.x} y={p.y} textAnchor="middle" className="cf-label">{l.text}</text>;
            })}
          </svg>
        {/* the drop line out of the chart has to land somewhere: this is the strip it points at.
            It lives inside the same scroller as the chart so the two keep the same width. */}
        {strip && readout && isFiniteC(gammaFromz(readout)) && abs(gammaFromz(readout)) <= 1.0001 && (
          <RadialScales
            gammaIn={gammaFromz(readout)}
            gammaL={gammaFromz(readout)}
            hasNetwork={false}
            readout={{ mag: abs(gammaFromz(readout)), cls: 'in', label: `z = ${fmtNum(readout.re, 2)}${readout.im < 0 ? ' − j' : ' + j'}${fmtNum(Math.abs(readout.im), 2)}` }}
            alignTo={chartSvgRef}
          />
        )}
        </div>
        {note && <div className="sf-note">{note}</div>}
        {table && points && points.length > 0 && (
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
