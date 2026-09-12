import React from 'react';
import { t } from '../engine/i18n';
import { fmtNum } from '../engine/complex';

/** |V(d)| and |I(d)| standing-wave envelope on a lossless line for a given load reflection coefficient. */
export const WaveFigure: React.FC<{ gammaMag: number; gammaDeg?: number; len?: number; title?: string }> = ({ gammaMag, gammaDeg = 180, len = 1, title }) => {
  const W = 420;
  const H = 168;
  const pad = 30;
  const top = 46;
  const th = (gammaDeg * Math.PI) / 180;
  const N = 200;
  const pts: { d: number; v: number; i: number }[] = [];
  for (let k = 0; k <= N; k++) {
    const d = (len * k) / N;
    const ph = th - 4 * Math.PI * d;
    const gr = gammaMag * Math.cos(ph);
    const gi = gammaMag * Math.sin(ph);
    pts.push({ d, v: Math.hypot(1 + gr, gi), i: Math.hypot(1 - gr, -gi) });
  }
  const vmax = 1 + gammaMag;
  const xOf = (d: number) => W - pad - (d / len) * (W - 2 * pad);
  const yOf = (v: number) => H - pad - (v / (vmax * 1.05)) * (H - pad - top);
  const swr = gammaMag < 1 ? (1 + gammaMag) / (1 - gammaMag) : Infinity;
  return (
    <div className="miniplot">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        {title && <text x={pad} y={16} className="mp-title">{title}</text>}
        <rect x={pad} y={top} width={W - 2 * pad} height={H - pad - top} className="mp-bg" />
        {[0, 0.25, 0.5, 0.75, 1].filter((d) => d <= len).map((d) => (
          <g key={d}>
            <line x1={xOf(d)} y1={top} x2={xOf(d)} y2={H - pad} className="mp-grid" />
            <text x={xOf(d)} y={H - pad + 12} textAnchor="middle" className="mp-tick">{d} λ</text>
          </g>
        ))}
        <polyline points={pts.map((p) => `${xOf(p.d).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')} className="mp-line" style={{ stroke: '#2563eb' }} />
        <polyline points={pts.map((p) => `${xOf(p.d).toFixed(1)},${yOf(p.i).toFixed(1)}`).join(' ')} className="mp-line" style={{ stroke: '#d97706', strokeDasharray: '4 3' }} />
        <text x={pad} y={top - 8} className="mp-tick wave-legend">{t("|V| (น้ำเงิน) · |I| (ส้ม) · |Γ| =")} {fmtNum(gammaMag, 2)} · VSWR = {Number.isFinite(swr) ? fmtNum(swr, 2) : '∞'}</text>
        <text x={pad} y={H - 4} className="mp-axis">{t("← ไปทาง generator")}</text>
        <text x={W - pad} y={H - 4} textAnchor="end" className="mp-axis">{t("โหลด (d = 0)")}</text>
      </svg>
    </div>
  );
};
