import React from 'react';
import { SolveResult } from '../engine/solver';
import { ELEMENT_SPECS } from '../engine/circuit';
import { abs, fmtNum, isFiniteC } from '../engine/complex';
import { rCircle, xCircle, gCircle, toSvg, pathToPoints } from '../engine/smith';
import { gammaFromz } from '../engine/rf';

const VB = 240;
const CX = 120;
const CY = 120;
const R = 104;

/** Small static Smith chart: r/x grid (coarse), SWR circles, network path, load/in points. */
export const MiniSmith: React.FC<{ result: SolveResult; showY?: boolean; caption?: string; predicted?: boolean }> = ({ result, showY, caption, predicted }) => {
  const c = (cc: { cx: number; cy: number; r: number }) => {
    const p = toSvg({ re: cc.cx, im: cc.cy }, CX, CY, R);
    return { cx: p.x, cy: p.y, r: cc.r * R };
  };
  const loadStage = result.stages.find((s) => s.index === result.loadStart);
  const gL = loadStage ? gammaFromz(loadStage.zafter) : result.gammaIn;
  const pL = toSvg(gL, CX, CY, R);
  const pIn = toSvg(result.gammaIn, CX, CY, R);
  return (
    <div className="mini-smith">
      <svg viewBox={`0 0 ${VB} ${VB}`} width="100%">
        <defs>
          <clipPath id="miniClip">
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
        </defs>
        <circle cx={CX} cy={CY} r={R} className="chart-bg" />
        <g clipPath="url(#miniClip)" className="grid z">
          {[0.5, 1, 2].map((r) => <circle key={`r${r}`} {...c(rCircle(r))} className={r === 1 ? 'major' : 'minor'} />)}
          {[0.5, 1, 2, -0.5, -1, -2].map((x) => <circle key={`x${x}`} {...c(xCircle(x))} className={Math.abs(x) === 1 ? 'major' : 'minor'} />)}
        </g>
        {showY && (
          <g clipPath="url(#miniClip)" className="grid y">
            <circle {...c(gCircle(1))} className="major" />
          </g>
        )}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} className="axis" />
        <circle cx={CX} cy={CY} r={R} className="rim" />
        {abs(gL) < 1 && abs(gL) > 0.01 && <circle cx={CX} cy={CY} r={abs(gL) * R} className="swr-circle load" />}
        {result.hasNetwork && abs(result.gammaIn) < 1 && abs(result.gammaIn) > 0.02 && <circle cx={CX} cy={CY} r={abs(result.gammaIn) * R} className="swr-circle in" />}
        <g className="paths">
          {result.stages.map((s) => (
            <polyline key={s.el.id} points={pathToPoints(s.path, CX, CY, R)} className={`path ${s.inLoad ? 'load' : 'net'}`} style={{ stroke: s.inLoad ? undefined : ELEMENT_SPECS[s.el.type].color }} />
          ))}
        </g>
        <g className="center"><line x1={CX - 5} y1={CY} x2={CX + 5} y2={CY} /><line x1={CX} y1={CY - 5} x2={CX} y2={CY + 5} /></g>
        {result.hasNetwork && isFiniteC(gL) && abs(gL) <= 1 && <circle cx={pL.x} cy={pL.y} r={5} className="pt load" />}
        {isFiniteC(result.gammaIn) && abs(result.gammaIn) <= 1 && <circle cx={pIn.x} cy={pIn.y} r={5.5} className="pt in" />}
      </svg>
      <div className="mini-caption">
        {caption && <b>{caption} · </b>}
        z_in = {isFiniteC(result.zin) ? `${fmtNum(result.zin.re, 2)} ${result.zin.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(result.zin.im), 2)}` : '∞'} · SWR {Number.isFinite(result.swrIn) ? fmtNum(result.swrIn, 2) : '∞'}
        {result.matched && (predicted
          ? <span className="mini-pred"> → ถ้าใส่วงจรนี้จึงจะแมตช์</span>
          : <span className="mini-ok"> ✓ MATCHED</span>)}
      </div>
    </div>
  );
};
