import React from 'react';
import { fmtNum } from '../engine/complex';

export interface PlotSeries {
  name: string;
  color?: string;
  dashed?: boolean;
  points: [number, number][];
}
interface Props {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xMin: number;
  xMax: number;
  yMin?: number;
  yMax?: number;
  series: PlotSeries[];
  xTicks?: number[];
  yTicks?: number[];
  height?: number;
  markers?: { x: number; y: number; text: string; color?: string }[];
}

const COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2'];

/** Small static x–y line plot used for course figures. */
export const MiniPlot: React.FC<Props> = ({ title, xLabel, yLabel, xMin, xMax, yMin, yMax, series, xTicks, yTicks, height = 220, markers }) => {
  const W = 420;
  const H = height;
  const padL = 46;
  const padR = 12;
  const padT = title ? 22 : 10;
  const padB = 34;
  const ys = series.flatMap((s) => s.points.map((p) => p[1])).filter(Number.isFinite);
  const y0 = yMin ?? Math.min(...ys, 0);
  const y1 = yMax ?? Math.max(...ys) * 1.05;
  const xOf = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const yOf = (y: number) => H - padB - ((y - y0) / (y1 - y0)) * (H - padT - padB);
  const xt = xTicks ?? Array.from({ length: 6 }, (_, i) => xMin + ((xMax - xMin) * i) / 5);
  const yt = yTicks ?? Array.from({ length: 5 }, (_, i) => y0 + ((y1 - y0) * i) / 4);
  return (
    <div className="miniplot">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        {title && <text x={W / 2} y={14} textAnchor="middle" className="mp-title">{title}</text>}
        <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} className="mp-bg" />
        {xt.map((x) => (
          <g key={`x${x}`}>
            <line x1={xOf(x)} y1={padT} x2={xOf(x)} y2={H - padB} className="mp-grid" />
            <text x={xOf(x)} y={H - padB + 12} textAnchor="middle" className="mp-tick">{fmtNum(x, 2)}</text>
          </g>
        ))}
        {yt.map((y) => (
          <g key={`y${y}`}>
            <line x1={padL} y1={yOf(y)} x2={W - padR} y2={yOf(y)} className="mp-grid" />
            <text x={padL - 4} y={yOf(y) + 3} textAnchor="end" className="mp-tick">{fmtNum(y, 2)}</text>
          </g>
        ))}
        {series.map((s, i) => {
          const pts = s.points.filter((p) => Number.isFinite(p[1]) && p[1] >= y0 - (y1 - y0) && p[1] <= y1 + (y1 - y0));
          // split at large jumps (asymptotes)
          const segs: string[] = [];
          let cur: string[] = [];
          for (let k = 0; k < pts.length; k++) {
            const p = pts[k];
            const prev = pts[k - 1];
            if (prev && Math.abs(p[1] - prev[1]) > (y1 - y0) * 0.8) {
              if (cur.length > 1) segs.push(cur.join(' '));
              cur = [];
            }
            const yy = Math.max(padT, Math.min(H - padB, yOf(p[1])));
            cur.push(`${xOf(p[0]).toFixed(1)},${yy.toFixed(1)}`);
          }
          if (cur.length > 1) segs.push(cur.join(' '));
          return segs.map((d, j) => <polyline key={`${i}-${j}`} points={d} className="mp-line" style={{ stroke: s.color ?? COLORS[i % COLORS.length], strokeDasharray: s.dashed ? '5 4' : undefined }} />);
        })}
        {markers?.map((m, i) => (
          <g key={`m${i}`}>
            <circle cx={xOf(m.x)} cy={yOf(m.y)} r={4} style={{ fill: m.color ?? '#dc2626' }} />
            <text x={xOf(m.x) + 6} y={yOf(m.y) - 5} className="mp-marker">{m.text}</text>
          </g>
        ))}
        {xLabel && <text x={(padL + W - padR) / 2} y={H - 4} textAnchor="middle" className="mp-axis">{xLabel}</text>}
        {yLabel && <text x={10} y={(padT + H - padB) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(padT + H - padB) / 2})`} className="mp-axis">{yLabel}</text>}
        {series.length > 1 && (
          <g className="mp-legend">
            {series.map((s, i) => (
              <g key={i} transform={`translate(${padL + 8 + i * 95}, ${padT + 12})`}>
                <line x1={0} y1={0} x2={16} y2={0} style={{ stroke: s.color ?? COLORS[i % COLORS.length], strokeDasharray: s.dashed ? '5 4' : undefined }} className="mp-line" />
                <text x={20} y={3} className="mp-tick">{s.name}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};
