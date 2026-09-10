import React, { useMemo, useState } from 'react';
import { useAppState, useDispatch, useDerived } from '../state/store';
import { Complex, abs, arg, deg, fmtNum, isFiniteC } from '../engine/complex';
import { ELEMENT_SPECS } from '../engine/circuit';
import { rCircle, xCircle, gCircle, bCircle, toSvg, fromSvg, pathToPoints, angleForWtg } from '../engine/smith';
import { VB, CX, CY, R, RING, circleSvg, DetailedGrid, OuterScales, RadialScales, ReadOff } from './SmithGrid';
import { zFromGamma, admittance, swrFromGamma, wtgFromGamma, gammaFromz, returnLossDb } from '../engine/rf';
import { probeOnLine } from '../engine/solver';
import { Highlight } from '../engine/explain';
import { MaxButton } from './MaxButton';
import { tip } from '../engine/glossary';
import { MarkerPanel } from './MarkerPanel';
import { findLesson } from '../engine/lessons';
import { smithMethodSteps } from '../engine/smithMethod';

interface Pt {
  g: Complex;
  label: string;
  cls: string;
  r: number;
  key: string;
  z: Complex;
  /** stage index: the explanation walks from the load (high) down to the input (0) */
  idx: number;
}

export const SmithChart: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const { result, steps, sweep } = useDerived();
  const { showZ, showY, showSwr, showPath, showScale, probe } = state;
  const [hover, setHover] = useState<Complex | null>(null);
  const Z0 = result.circuit.Z0;

  const step = !state.explainAll ? steps[Math.min(state.explainStep, steps.length - 1)] : undefined;
  const lesson = findLesson(state.lessonId);
  const walk = useMemo(() => (lesson && lesson.solution ? smithMethodSteps(lesson, lesson.solution()) : []), [lesson]);
  const walkStep = state.solutionStep !== null && walk.length > 0 ? walk[Math.min(state.solutionStep, walk.length - 1)] : undefined;
  const hl: Highlight = walkStep ? walkStep.highlight ?? {} : step?.highlight ?? {};
  const effShowY = showY || !!hl.showY;

  // Which Γ is being read off the SWR/RL scales. An explanation step asking for a
  // read-off wins; otherwise it follows the input point. The construction itself is
  // always drawn; the "อ่าน SWR/RL" chip adds the ruler and the strip below.
  const readoff = useMemo(() => {
    if (hl.readout) {
      const { g } = hl.readout;
      if (!isFiniteC(g) || abs(g) > 1.0001) return null;
      const fromLoad = hl.readout.from === 'load';
      const cls = (walkStep ? fromLoad : fromLoad && result.hasNetwork) ? 'load' : 'in';
      return { g, cls: cls as 'load' | 'in', label: hl.readout.label };
    }
    if (result.circuit.elements.length === 0) return null;
    if (!isFiniteC(result.gammaIn) || abs(result.gammaIn) > 1.0001) return null;
    return { g: result.gammaIn, cls: 'in' as const, label: result.hasNetwork ? 'z_in' : 'z_L' };
  }, [hl.readout, result, walkStep]);
  const showStrip = state.showRadial || !!hl.readout;

  // The explanation walks from the load (highest stage index) down to the input (0).
  // Anything the walk has not reached yet is drawn grey, and takes its real colour the
  // moment the step that computes it arrives.
  const frontier: number | null = useMemo(() => {
    if (state.explainAll || walkStep) return null;
    if (typeof hl.point === 'number') return hl.point;
    if (hl.point === 'in' || hl.center) return 0;
    if (hl.point === 'load') return result.loadStart;
    if (typeof hl.stageIndex === 'number') return hl.stageIndex;
    return null;
  }, [hl.point, hl.center, hl.stageIndex, state.explainAll, walkStep, result.loadStart]);
  const pending = (i: number) => frontier !== null && i < frontier;
  const stripReadout = useMemo(
    () => (readoff ? { mag: abs(readoff.g), cls: readoff.cls, label: readoff.label } : undefined),
    [readoff],
  );

  // points
  const pts: Pt[] = useMemo(() => {
    const out: Pt[] = [];
    const n = result.circuit.elements.length;
    if (n === 0) {
      out.push({ g: result.gammaIn, label: 'z = 0 (short)', cls: 'in', r: 7, key: 'in', z: result.zin, idx: 0 });
      return out;
    }
    // termination
    out.push({ g: gammaFromz(result.termination === 'open' ? { re: Infinity, im: 0 } : { re: 0, im: 0 }), label: result.termination === 'open' ? 'ปลายเปิด' : 'ปลายลัดวงจร', cls: 'term', r: 3.5, key: 'term', z: result.Zterm, idx: n });
    let netCount = 0;
    for (const s of result.stages) {
      const isLoadPt = s.index === result.loadStart;
      const isIn = s.index === 0;
      if (isLoadPt && isIn) {
        out.push({ g: gammaFromz(s.zafter), label: result.hasNetwork ? 'z_in' : 'z_L (= z_in)', cls: 'in', r: 8, key: 'in', z: s.zafter, idx: s.index });
      } else if (isLoadPt) {
        out.push({ g: gammaFromz(s.zafter), label: 'z_L (Load)', cls: 'load', r: 8, key: 'load', z: s.zafter, idx: s.index });
      } else if (isIn) {
        out.push({ g: gammaFromz(s.zafter), label: 'z_in', cls: 'in', r: 8, key: 'in', z: s.zafter, idx: s.index });
      } else if (s.inLoad) {
        out.push({ g: gammaFromz(s.zafter), label: `หลัง ${ELEMENT_SPECS[s.el.type].symbol}`, cls: 'mid-load', r: 3.5, key: `s${s.index}`, z: s.zafter, idx: s.index });
      } else {
        netCount += 1;
        out.push({ g: gammaFromz(s.zafter), label: `${netCount}: หลัง ${ELEMENT_SPECS[s.el.type].symbol}`, cls: 'mid-net', r: 5.5, key: `s${s.index}`, z: s.zafter, idx: s.index });
      }
    }
    return out;
  }, [result]);

  const probeInfo = useMemo(() => {
    if (!probe) return null;
    const st = result.stages.find((s) => s.el.id === probe.elementId && s.kind === 'line');
    if (!st) return null;
    return probeOnLine(st, probe.d, Z0);
  }, [probe, result, Z0]);

  const gammaAt = (e: React.MouseEvent<SVGSVGElement>): Complex | null => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return fromSvg(p.x, p.y, CX, CY, R);
  };
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const g = gammaAt(e);
    setHover(g && abs(g) <= 1 ? g : null);
  };
  const onChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!state.markerMode) return;
    const g = gammaAt(e);
    if (!g || abs(g) > 1) return;
    const z = zFromGamma(g);
    if (!isFiniteC(z)) return;
    dispatch({ type: 'marker_add', re: Number(z.re.toFixed(3)), im: Number(z.im.toFixed(3)) });
  };

  const hoverZ = hover ? zFromGamma(hover) : null;
  const hoverY = hoverZ ? admittance(hoverZ) : null;

  const wtgArc = (w1: number, len: number, radius: number) => {
    const a1 = angleForWtg(w1);
    const a2 = angleForWtg(w1 + len);
    const p1 = { x: CX + radius * Math.cos(a1), y: CY - radius * Math.sin(a1) };
    const p2 = { x: CX + radius * Math.cos(a2), y: CY - radius * Math.sin(a2) };
    const large = len > 0.25 ? 1 : 0;
    return `M${p1.x},${p1.y} A${radius},${radius} 0 ${large} 1 ${p2.x},${p2.y}`;
  };

  const fmtz = (z: Complex, d = 3) => (isFiniteC(z) ? `${fmtNum(z.re, d)} ${z.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(z.im), d)}` : '∞');

  const Toggle: React.FC<{ k: 'showZ' | 'showY' | 'showSwr' | 'showPath' | 'showScale' | 'showFine' | 'showRadial' | 'showSweep'; label: string }> = ({ k, label }) => (
    <button className={`chip ${state[k] ? 'on' : ''}`} onClick={() => dispatch({ type: 'toggle', key: k })}>
      {label}
    </button>
  );

  return (
    <div className="smith-wrap">
      <div className="panel-head">
        <span className="panel-title">SMITH CHART{walkStep && <span className="walk-badge"> · เฉลยขั้น {Math.min(state.solutionStep!, walk.length - 1) + 1}: {walkStep.short}</span>}</span>
        <div className="chip-row">
          <Toggle k="showZ" label="Z grid" />
          <Toggle k="showY" label="Y grid" />
          <Toggle k="showSwr" label="SWR" />
          <Toggle k="showPath" label="Path" />
          <Toggle k="showScale" label="สเกลรอบนอก" />
          <Toggle k="showFine" label="กริดละเอียด" />
          <Toggle k="showRadial" label="อ่าน SWR/RL" />
          {sweep.length > 0 && <Toggle k="showSweep" label="กวาดความถี่" />}
          <button className={`chip ${state.markerMode ? 'on' : ''}`} onClick={() => dispatch({ type: 'marker_mode', value: !state.markerMode })} title="เปิดแล้วคลิกบนกราฟเพื่อปักจุด z (ดูรายการด้านล่างกราฟ)">
            📍 Mark z{state.markers.length ? ` (${state.markers.length})` : ''}
          </button>
          <button className={`chip ${state.swrTarget ? 'on' : ''}`} onClick={() => { const seq = [null, 1.5, 2, 3]; const i = seq.indexOf(state.swrTarget as never); dispatch({ type: 'swr_target', value: seq[(i + 1) % seq.length] }); }} title="วงกลมเป้าหมาย SWR (คลิกวนค่า)">
            เป้า SWR {state.swrTarget ? `≤ ${state.swrTarget}` : 'ปิด'}
          </button>
          <MaxButton panel="chart" />
        </div>
      </div>
      <div className="smith-svg-wrap">
        <svg viewBox={`0 0 ${VB} ${VB}`} className={`smith-svg ${state.showFine ? 'fine' : 'coarse'} ${state.markerMode ? 'marking' : ''}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onClick={onChartClick}>
          <defs>
            <clipPath id="clipUnit">
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
            <marker id="arrowPath" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
            </marker>
            <marker id="arrowWtg" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#7c3aed" />
            </marker>
            <marker id="arrowOv" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#be185d" />
            </marker>
            <marker id="arrowRo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
            </marker>
            <marker id="arrowRoDown" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
            </marker>
          </defs>
          <circle cx={CX} cy={CY} r={R} className="chart-bg" />
          {showScale && <OuterScales />}
          <DetailedGrid showZ={showZ} showY={effShowY} />

          {/* highlights */}
          <g className="highlights" clipPath="url(#clipUnit)">
            {hl.rCircle !== undefined && Number.isFinite(hl.rCircle) && hl.rCircle >= 0 && <circle {...circleSvg(rCircle(hl.rCircle))} className="hl r" />}
            {hl.xCircle !== undefined && Number.isFinite(hl.xCircle) && (Math.abs(hl.xCircle) > 1e-6 ? <circle {...circleSvg(xCircle(hl.xCircle))} className="hl x" /> : <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} className="hl x" />)}
            {hl.gCircle !== undefined && Number.isFinite(hl.gCircle) && hl.gCircle >= 0 && <circle {...circleSvg(gCircle(hl.gCircle))} className="hl g" />}
            {hl.bCircle !== undefined && Number.isFinite(hl.bCircle) && Math.abs(hl.bCircle) > 1e-6 && <circle {...circleSvg(bCircle(hl.bCircle))} className="hl b" />}
          </g>
          {hl.wtg && (
            <path d={wtgArc(hl.wtg[0], hl.wtg[1], R * RING.wtg[1])} className="hl wtg" markerEnd="url(#arrowWtg)" />
          )}
          {/* free-form overlays (solution walkthrough) */}
          <g className="overlay">
            {hl.swrRadius !== undefined && Number.isFinite(hl.swrRadius) && hl.swrRadius > 0.005 && hl.swrRadius <= 1 && (
              <circle cx={CX} cy={CY} r={hl.swrRadius * R} className="ov-swr" />
            )}
            {hl.circles?.map((c, i) => {
              const p = toSvg({ re: c.cx, im: c.cy }, CX, CY, R);
              const lp = toSvg({ re: c.cx, im: c.cy + c.r }, CX, CY, R);
              return (
                <g key={`oc${i}`}>
                  <circle cx={p.x} cy={p.y} r={c.r * R} className={`ov-circle ${c.cls ?? ''}`} />
                  {c.label && <text x={lp.x} y={lp.y - 6} textAnchor="middle" className="ov-label">{c.label}</text>}
                </g>
              );
            })}
            {hl.arcs?.map((a, i) => {
              const rad = (a.radius ?? abs(a.g)) * R;
              if (!(rad > 0.5)) return null;
              const a1 = arg(a.g);
              const sweep = 4 * Math.PI * a.lenLambda;
              if (sweep >= 2 * Math.PI - 1e-6) return <circle key={`oa${i}`} cx={CX} cy={CY} r={rad} className="ov-arc" />;
              const a2 = a1 - sweep;
              const p1 = { x: CX + rad * Math.cos(a1), y: CY - rad * Math.sin(a1) };
              const p2 = { x: CX + rad * Math.cos(a2), y: CY - rad * Math.sin(a2) };
              const large = sweep > Math.PI ? 1 : 0;
              return <path key={`oa${i}`} d={`M${p1.x},${p1.y} A${rad},${rad} 0 ${large} 1 ${p2.x},${p2.y}`} className="ov-arc" markerEnd="url(#arrowOv)" />;
            })}
            {hl.paths?.map((pth, i) => (
              <polyline key={`op${i}`} points={pathToPoints(pth, CX, CY, R)} className="ov-path" markerEnd="url(#arrowOv)" />
            ))}
            {hl.wtgMarks?.map((m, i) => {
              const a = angleForWtg(m.w);
              const r1 = R * (RING.wtg[0] - 0.012);
              const r2 = R * (RING.wtg[1] + 0.012);
              const rl = R * (RING.wtgLabel + 0.026);
              return (
                <g key={`ow${i}`} className="ov-wtg">
                  <line x1={CX + r1 * Math.cos(a)} y1={CY - r1 * Math.sin(a)} x2={CX + r2 * Math.cos(a)} y2={CY - r2 * Math.sin(a)} />
                  <text x={CX + rl * Math.cos(a)} y={CY - rl * Math.sin(a) + 4} textAnchor="middle">{m.label}</text>
                </g>
              );
            })}
            {hl.points?.map((pt, i) => {
              if (!isFiniteC(pt.g) || abs(pt.g) > 1.0001) return null;
              const p = toSvg(pt.g, CX, CY, R);
              return (
                <g key={`opt${i}`} className={`ov-pt ${pt.cls ?? 'mid'}`}>
                  <circle cx={p.x} cy={p.y} r={11} className="ov-ring" />
                  <circle cx={p.x} cy={p.y} r={5.5} className="ov-dot" />
                  <text x={p.x + 10} y={p.y + (pt.g.im >= 0 ? -8 : 16)} className="ov-ptlabel">{pt.label}</text>
                </g>
              );
            })}
          </g>

          {/* SWR circles */}
          {showSwr && result.circuit.elements.length > 0 && (
            <g className="swr">
              {result.hasNetwork && abs(result.gammaL) < 1 && <circle cx={CX} cy={CY} r={abs(result.gammaL) * R} className={`swr-circle load ${hl.swrCircle === 'load' ? 'hl' : ''}`} />}
              {abs(result.gammaIn) < 1 && abs(result.gammaIn) > 0.01 && <circle cx={CX} cy={CY} r={abs(result.gammaIn) * R} className={`swr-circle in ${hl.swrCircle === 'in' || (!result.hasNetwork && hl.swrCircle === 'load') ? 'hl' : ''}`} />}
            </g>
          )}

          {/* paths */}
          {showPath && (
            <g className="paths">
              {result.stages.map((s) => (
                <polyline
                  key={s.el.id}
                  points={pathToPoints(s.path, CX, CY, R)}
                  className={`path ${s.inLoad ? 'load' : 'net'} ${hl.stageIndex === s.index ? 'hl' : ''} ${pending(s.index) ? 'pending' : ''}`}
                  style={{ stroke: pending(s.index) ? undefined : s.inLoad ? undefined : ELEMENT_SPECS[s.el.type].color }}
                  markerEnd={s.inLoad ? undefined : 'url(#arrowPath)'}
                />
              ))}
            </g>
          )}

          {/* design-goal SWR circle */}
          {state.swrTarget && (
            <g className="target">
              <circle cx={CX} cy={CY} r={((state.swrTarget - 1) / (state.swrTarget + 1)) * R} className="target-circle" />
              <text x={CX + ((state.swrTarget - 1) / (state.swrTarget + 1)) * R + 4} y={CY - 6} className="target-label">SWR {state.swrTarget}</text>
            </g>
          )}
          {/* frequency sweep curves */}
          {state.showSweep && sweep.length > 0 && (
            <g className="sweep">
              {result.hasNetwork && (
                <polyline points={pathToPoints(sweep.map((p) => p.result.gammaL), CX, CY, R)} className="sweep-line load" />
              )}
              <polyline points={pathToPoints(sweep.map((p) => p.result.gammaIn), CX, CY, R)} className="sweep-line in" />
              {sweep.map((p, i) => {
                const gi = p.result.gammaIn;
                const gl = p.result.gammaL;
                const pi = toSvg(gi, CX, CY, R);
                const pl = toSvg(gl, CX, CY, R);
                const fl = `${fmtNum(p.f / 1e6, p.f >= 1e8 ? 0 : 2)}`;
                return (
                  <g key={i}>
                    {result.hasNetwork && isFiniteC(gl) && abs(gl) <= 1 && <circle cx={pl.x} cy={pl.y} r={3.5} className="sweep-pt load" />}
                    {isFiniteC(gi) && abs(gi) <= 1 && (
                      <>
                        <circle cx={pi.x} cy={pi.y} r={4} className="sweep-pt in">
                          <title>{`f = ${fmtNum(p.f / 1e6, 3)} MHz\nz_in = ${fmtz(p.result.zin)}\nSWR = ${fmtNum(p.result.swrIn, 2)}`}</title>
                        </circle>
                        <text x={pi.x + 6} y={pi.y - 5} className="sweep-label">{fl}</text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}
          {/* hand-placed markers */}
          {state.markers.length > 0 && (
            <g className="user-markers">
              {state.markers.map((m) => {
                const g = gammaFromz({ re: m.re, im: m.im });
                if (!isFiniteC(g) || abs(g) > 1.0001) return null;
                const p = toSvg(g, CX, CY, R);
                const right = p.x > CX;
                return (
                  <g key={m.id} className="umark" style={{ color: m.color }}>
                    <path d={`M${p.x},${p.y - 8} L${p.x + 8},${p.y} L${p.x},${p.y + 8} L${p.x - 8},${p.y} Z`} className="umark-shape" />
                    <circle cx={p.x} cy={p.y} r={1.8} className="umark-core" />
                    <text x={p.x + (right ? -11 : 11)} y={p.y - 10} textAnchor={right ? 'end' : 'start'} className="umark-label">
                      {m.label}
                    </text>
                    <text x={p.x + (right ? -11 : 11)} y={p.y + 17} textAnchor={right ? 'end' : 'start'} className="umark-value">
                      {fmtNum(m.re, 2)}{m.im < 0 ? '−' : '+'}j{fmtNum(Math.abs(m.im), 2)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
          {/* read SWR / RL off the radius */}
          {readoff && <ReadOff g={readoff.g} cls={readoff.cls} label={readoff.label} ruler={showStrip} />}

          {/* center marker */}
          <g className={`center ${hl.center ? 'hl' : ''}`}>
            <line x1={CX - 7} y1={CY} x2={CX + 7} y2={CY} />
            <line x1={CX} y1={CY - 7} x2={CX} y2={CY + 7} />
          </g>

          {/* probe */}
          {probeInfo && abs(probeInfo.gamma) <= 1.0001 && (
            <g className="probe">
              {(() => {
                const p = toSvg(probeInfo.gamma, CX, CY, R);
                return (
                  <>
                    <line x1={CX} y1={CY} x2={p.x} y2={p.y} className="probe-line" />
                    <circle cx={p.x} cy={p.y} r={6} className="pt probe" />
                    <text x={p.x + 9} y={p.y - 8} className="ptlabel probe">probe z = {fmtz(probeInfo.z, 2)}</text>
                  </>
                );
              })()}
            </g>
          )}

          {/* points */}
          <g className="points">
            {pts.map((pt) => {
              if (!isFiniteC(pt.g) || abs(pt.g) > 1.0001) return null;
              const p = toSvg(pt.g, CX, CY, R);
              const isHl = (hl.point === 'load' && pt.key === 'load') || (hl.point === 'in' && pt.key === 'in') || (hl.point === 'load' && !result.hasNetwork && pt.key === 'in') || (typeof hl.point === 'number' && pt.key === `s${hl.point}`) || (typeof hl.point === 'number' && hl.point === 0 && pt.key === 'in') || (typeof hl.point === 'number' && hl.point === result.loadStart && pt.key === 'load');
              const show = pt.cls === 'load' || pt.cls === 'in' || pt.cls === 'mid-net';
              return (
                <g key={pt.key} className={`ptg ${pt.cls} ${isHl ? 'hl' : ''} ${pending(pt.idx) ? 'pending' : ''}`}>
                  {isHl && <circle cx={p.x} cy={p.y} r={pt.r + 8} className="pulse" />}
                  <circle cx={p.x} cy={p.y} r={pt.r} className={`pt ${pt.cls}`}>
                    <title>{`${pt.label}\nz = ${fmtz(pt.z)}\n|Γ| = ${fmtNum(abs(pt.g), 3)}  SWR = ${fmtNum(swrFromGamma(pt.g), 2)}`}</title>
                  </circle>
                  {show && (
                    <text x={p.x + pt.r + 4} y={p.y - pt.r - 2} className={`ptlabel ${pt.cls}`}>
                      {pt.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        {hover && hoverZ && hoverY && (
          <div className="hover-box">
            <div>z = {fmtz(hoverZ, 4)}</div>
            <div>Z = {isFiniteC(hoverZ) ? `${fmtNum(hoverZ.re * Z0, 2)} ${hoverZ.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(hoverZ.im) * Z0, 2)} Ω` : '∞'}</div>
            <div>y = {fmtz(hoverY, 4)}</div>
            <div>Y = {isFiniteC(hoverY) ? `${fmtNum((hoverY.re / Z0) * 1e3, 3)} ${hoverY.im < 0 ? '−' : '+'} j${fmtNum((Math.abs(hoverY.im) / Z0) * 1e3, 3)} mS` : '∞'}</div>
            <div>Γ = {fmtNum(abs(hover), 4)} ∠{fmtNum(deg(arg(hover)), 2)}°</div>
            <div>SWR = {fmtNum(swrFromGamma(hover), 3)} · RL = {Number.isFinite(returnLossDb(hover)) ? `${fmtNum(returnLossDb(hover), 2)} dB` : '∞'}</div>
            <div>→gen {fmtNum(wtgFromGamma(hover), 4)} λ · →load {fmtNum(((0.5 - wtgFromGamma(hover)) % 0.5 + 0.5) % 0.5, 4)} λ</div>
            {state.markerMode && <div className="hover-mark">คลิกเพื่อปักจุดนี้</div>}
          </div>
        )}
        <div className="legend">
          <span><i className="dot load" /> Load z_L</span>
          <span><i className="dot mid-net" /> ระหว่างทาง</span>
          <span><i className="dot in" /> z_in</span>
          <span><i className="dot probe" /> Probe</span>
        </div>
        {showStrip && (
          <RadialScales
            gammaIn={result.gammaIn}
            gammaL={result.gammaL}
            hasNetwork={result.hasNetwork}
            readout={stripReadout}
          />
        )}
      </div>
      {(state.markerMode || state.markers.length > 0) && <MarkerPanel />}
      <div className={`stats ${result.matched ? 'matched' : ''}`}>
        <div className="stats-row">
          <div className="stat" title={tip('Zin')}><span className="k">Z_in <i className="hint">?</i></span><span className="v">{isFiniteC(result.Zin) ? `${fmtNum(result.Zin.re, 2)} ${result.Zin.im < 0 ? '−' : '+'} j${fmtNum(Math.abs(result.Zin.im), 2)} Ω` : '∞'}</span></div>
          <div className="stat" title={tip('z')}><span className="k">z_in <i className="hint">?</i></span><span className="v">{fmtz(result.zin)}</span></div>
          <div className="stat" title={tip('Gamma')}><span className="k">Γ <i className="hint">?</i></span><span className="v">{fmtNum(abs(result.gammaIn), 3)} ∠{fmtNum(deg(arg(result.gammaIn)), 1)}°</span></div>
          <div className="stat" title={tip('SWR')}><span className="k">SWR <i className="hint">?</i></span><span className="v big">{Number.isFinite(result.swrIn) ? fmtNum(result.swrIn, 2) : '∞'}</span></div>
          <div className="stat" title={tip('RL')}><span className="k">Return loss <i className="hint">?</i></span><span className="v">{Number.isFinite(result.returnLossDb) ? `${fmtNum(result.returnLossDb, 1)} dB` : '∞'}</span></div>
        </div>
        {sweep.length > 0 && (
          <div className="band-table-wrap">
            <table className="band-table">
              <thead><tr><th title={tip('f')}>f (MHz)</th>{result.hasNetwork && <th title={tip('ZL')}>z_L</th>}<th title={tip('Zin')}>z_in</th><th title={tip('absGamma')}>|Γ|</th><th title={tip('SWR')}>SWR</th></tr></thead>
              <tbody>
                {sweep.map((p) => (
                  <tr key={p.f} className={state.swrTarget && p.result.swrIn > state.swrTarget ? 'over' : ''}>
                    <td>{fmtNum(p.f / 1e6, 3)}</td>
                    {result.hasNetwork && <td>{fmtz(p.result.zL, 2)}</td>}
                    <td>{fmtz(p.result.zin, 2)}</td>
                    <td>{fmtNum(abs(p.result.gammaIn), 3)}</td>
                    <td><b>{Number.isFinite(p.result.swrIn) ? fmtNum(p.result.swrIn, 2) : '∞'}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="band-summary">
              SWR สูงสุดในแบนด์ = <b>{fmtNum(Math.max(...sweep.map((p) => p.result.swrIn)), 2)}</b>
              {state.swrTarget && (Math.max(...sweep.map((p) => p.result.swrIn)) <= state.swrTarget ? <span className="ok"> ✓ ทุกความถี่อยู่ใน SWR ≤ {state.swrTarget}</span> : <span className="bad"> ✗ มี {sweep.filter((p) => p.result.swrIn > state.swrTarget!).length} ความถี่เกินเป้า</span>)}
            </div>
          </div>
        )}
        <div className="stats-row">
          {sweep.length > 0 && state.swrTarget ? (
            (() => { const mx = Math.max(...sweep.map((p) => p.result.swrIn)); const ok = mx <= state.swrTarget!; return <div className={`badge ${ok ? 'ok' : ''}`}>{ok ? `✓ ทั้งแบนด์ SWR ≤ ${state.swrTarget}` : `✗ แบนด์เกิน SWR ${state.swrTarget}`}</div>; })()
          ) : (
            <div className={`badge ${result.matched ? 'ok' : ''}`}>{result.matched ? '✓ MATCHED' : 'NOT MATCHED'}</div>
          )}
          {result.hasNetwork ? (
            <div className="before-after">
              <span className="ba"><b>BEFORE</b> z_L = {fmtz(result.zL, 2)} · SWR {Number.isFinite(result.swrL) ? fmtNum(result.swrL, 2) : '∞'}</span>
              <span className="ba"><b>AFTER</b> z_in = {fmtz(result.zin, 2)} · SWR {Number.isFinite(result.swrIn) ? fmtNum(result.swrIn, 2) : '∞'}</span>
            </div>
          ) : (
            <div className="before-after"><span className="ba">กำลังสะท้อน |Γ|² = {fmtNum(abs(result.gammaIn) ** 2 * 100, 1)} % · mismatch loss {Number.isFinite(result.mismatchLossDb) ? fmtNum(result.mismatchLossDb, 2) : '∞'} dB</span></div>
          )}
        </div>
      </div>
    </div>
  );
};
