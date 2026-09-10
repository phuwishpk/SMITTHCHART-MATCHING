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
  const padT = 10;
  const hasLegend = series.length > 1;
  const padB = hasLegend ? 50 : 34;
  const ys = series.flatMap((s) => s.points.map((p) => p[1])).filter(Number.isFinite);
  const y0 = yMin ?? Math.min(...ys, 0);
  const y1 = yMax ?? Math.max(...ys) * 1.05;
  const xOf = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * (W - padL - padR);
  const yOf = (y: number) => H - padB - ((y - y0) / (y1 - y0)) * (H - padT - padB);
  const xt = xTicks ?? Array.from({ length: 6 }, (_, i) => xMin + ((xMax - xMin) * i) / 5);
  const yt = yTicks ?? Array.from({ length: 5 }, (_, i) => y0 + ((y1 - y0) * i) / 4);
  return (
    <div className="miniplot">
      {title && <div className="mp-title-html">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
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
          // drop out-of-range samples (break the polyline) instead of clamping, so asymptotes stay honest
          const segs: string[] = [];
          let cur: string[] = [];
          let prev: [number, number] | undefined;
          for (const p of s.points) {
            const inside = Number.isFinite(p[1]) && p[1] >= y0 && p[1] <= y1;
            if (!inside || (prev && Math.abs(p[1] - prev[1]) > (y1 - y0) * 0.8)) {
              if (cur.length > 1) segs.push(cur.join(' '));
              cur = [];
              prev = inside ? p : undefined;
              if (!inside) continue;
            }
            cur.push(`${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`);
            prev = p;
          }
          if (cur.length > 1) segs.push(cur.join(' '));
          return segs.map((d, j) => <polyline key={`${i}-${j}`} points={d} className="mp-line" style={{ stroke: s.color ?? COLORS[i % COLORS.length], strokeDasharray: s.dashed ? '5 4' : undefined }} />);
        })}
        {markers?.map((m, i) => (
          <g key={`m${i}`}>
            <circle cx={xOf(m.x)} cy={yOf(m.y)} r={4} style={{ fill: m.color ?? '#dc2626' }} />
            <text x={xOf(m.x) + 7} y={yOf(m.y) + 13} className="mp-marker">{m.text}</text>
          </g>
        ))}
        {xLabel && <text x={(padL + W - padR) / 2} y={H - padB + 26} textAnchor="middle" className="mp-axis">{xLabel}</text>}
        {yLabel && <text x={10} y={(padT + H - padB) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(padT + H - padB) / 2})`} className="mp-axis">{yLabel}</text>}
        {hasLegend && (
          <g className="mp-legend">
            {series.map((s, i) => (
              <g key={i} transform={`translate(${padL + i * ((W - padL - padR) / series.length)}, ${H - 6})`}>
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
