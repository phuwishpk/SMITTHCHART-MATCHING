import React from 'react';
import { t } from '../engine/i18n';
import { Stage, standingWave } from '../engine/solver';
import { fmtNum } from '../engine/complex';

/** Standing-wave envelope |V(d)| along a line stage; d measured from the load end (right). */
export const WaveStrip: React.FC<{ stage: Stage; probeD?: number }> = ({ stage, probeD }) => {
  const W = 240;
  const H = 90;
  const pad = 8;
  const data = standingWave(stage, 100);
  const len = stage.line!.lenLambda;
  const vmax = Math.max(...data.map((p) => Math.max(p.v, p.i)), 1e-6);
  const xOf = (d: number) => W - pad - (len > 0 ? (d / len) * (W - 2 * pad) : 0);
  const yOf = (v: number) => H - pad - (v / vmax) * (H - 2 * pad - 12);
  const vPts = data.map((p) => `${xOf(p.d).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ');
  const iPts = data.map((p) => `${xOf(p.d).toFixed(1)},${yOf(p.i).toFixed(1)}`).join(' ');
  const vminV = Math.min(...data.map((p) => p.v));
  const vmaxV = Math.max(...data.map((p) => p.v));
  return (
    <div className="wave-strip">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <rect x={0} y={0} width={W} height={H} className="wave-bg" />
        <polyline points={vPts} className="wave-v" />
        <polyline points={iPts} className="wave-i" />
        {probeD !== undefined && <line x1={xOf(probeD)} y1={pad} x2={xOf(probeD)} y2={H - pad} className="wave-probe" />}
        <text x={pad} y={H - 1} className="wave-label">generator ←</text>
        <text x={W - pad} y={H - 1} textAnchor="end" className="wave-label">→ load</text>
        <text x={pad} y={12} className="wave-label">{t("|V| (น้ำเงิน), |I| (ส้ม) · SWR บนสาย =")} {vminV > 1e-9 ? fmtNum(vmaxV / vminV, 2) : '∞'}</text>
      </svg>
    </div>
  );
};
