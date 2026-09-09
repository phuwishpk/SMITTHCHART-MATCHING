import React, { useMemo } from 'react';
import { Circuit, ELEMENT_SPECS, isLine, isStub } from '../engine/circuit';
import { SolveResult } from '../engine/solver';
import { fmtNum } from '../engine/complex';
import { layout, valueLabel, Resistor, Inductor, Capacitor, Ground, RAIL_Y, GAP, GND_Y, X0 } from './CircuitCanvas';

export type ElementStatus = 'ok' | 'bad' | 'missing' | 'extra';

interface Props {
  circuit: Circuit;
  result?: SolveResult;
  /** status per element index (in this circuit) */
  status?: Record<number, ElementStatus>;
  title?: string;
  maxHeight?: number;
}

/** Read-only schematic of a circuit (used for solution previews). */
export const CircuitSchematic: React.FC<Props> = ({ circuit, result, status, title, maxHeight = 190 }) => {
  const { items, endX } = useMemo(() => layout(circuit.elements), [circuit.elements]);
  const width = Math.max(520, endX + 70);
  const H = 250;
  const last = circuit.elements[circuit.elements.length - 1];
  const endOpen = last ? last.orient === 'shunt' : false;
  const loadItems = result ? items.filter((it) => it.index >= result.loadStart) : [];
  const netItems = result ? items.filter((it) => it.index < result.loadStart) : [];
  const bracket = (list: typeof items) => {
    if (list.length === 0) return null;
    return { x1: Math.min(...list.map((i) => i.x)) - 6, x2: Math.max(...list.map((i) => i.x + i.w)) + 6 };
  };
  const loadBr = result?.hasNetwork ? bracket(loadItems) : null;
  const netBr = result?.hasNetwork ? bracket(netItems) : null;

  return (
    <div className="schematic">
      {title && <div className="schematic-title">{title}</div>}
      <svg viewBox={`0 ${RAIL_Y - 70} ${width} ${H - 40}`} width="100%" style={{ maxHeight }} className="circuit-svg schematic-svg" preserveAspectRatio="xMidYMid meet">
        <line className="rail" x1={70} y1={RAIL_Y} x2={endOpen ? endX : endX - GAP / 2} y2={RAIL_Y} />
        <g className="el source">
          <circle cx={40} cy={RAIL_Y} r={22} fill="#fff" strokeWidth={2.2} />
          <path d={`M29,${RAIL_Y} q5.5,-11 11,0 t11,0`} fill="none" strokeWidth={2} />
          <line x1={40} y1={RAIL_Y + 22} x2={40} y2={RAIL_Y + 36} strokeWidth={2} />
          <line x1={40} y1={RAIL_Y + 36} x2={90} y2={RAIL_Y + 36} strokeWidth={2} />
          <line x1={90} y1={RAIL_Y + 36} x2={90} y2={GND_Y} strokeWidth={2} />
          <Ground x={90} y={GND_Y} />
          <line x1={62} y1={RAIL_Y} x2={74} y2={RAIL_Y} strokeWidth={2} />
          <rect x={74} y={RAIL_Y - 8} width={40} height={16} rx={3} fill="#fff" strokeWidth={2} />
          <text x={94} y={RAIL_Y + 4} textAnchor="middle" className="tl-label">Z_S</text>
          <text x={12} y={RAIL_Y - 32} textAnchor="start" className="el-name">Source</text>
          <text x={12} y={RAIL_Y + 52} textAnchor="start" className="el-value">{fmtNum(circuit.f / 1e6, 3)} MHz · Z_S = Z₀ = {fmtNum(circuit.Z0, 1)} Ω</text>
        </g>
        {circuit.elements.length === 0 && (
          <text x={X0 + 40} y={RAIL_Y + 5} className="el-value">(ยังไม่มีอุปกรณ์)</text>
        )}
        {netBr && (
          <g className="bracket net">
            <path d={`M${netBr.x1},${GND_Y + 26} v8 H${netBr.x2} v-8`} fill="none" />
            <text x={(netBr.x1 + netBr.x2) / 2} y={GND_Y + 47} textAnchor="middle">MATCHING NETWORK</text>
          </g>
        )}
        {loadBr && (
          <g className="bracket load">
            <path d={`M${loadBr.x1},${GND_Y + 26} v8 H${loadBr.x2} v-8`} fill="none" />
            <text x={(loadBr.x1 + loadBr.x2) / 2} y={GND_Y + 47} textAnchor="middle">LOAD (Z_L)</text>
          </g>
        )}
        {items.map((it) => {
          const { el, x, w, kind } = it;
          const spec = ELEMENT_SPECS[el.type];
          const st = status?.[it.index];
          const badge = st === 'ok' ? '✓' : st === 'bad' || st === 'missing' ? '✗' : st === 'extra' ? '?' : '';
          const common = { className: `el ${kind} st-${st ?? 'none'}`, style: { color: spec.color } as React.CSSProperties };
          if (kind === 'series') {
            const s1 = x + 26;
            const s2 = x + w - 26;
            return (
              <g key={el.id} {...common}>
                {st && <rect className="st-box" x={x + 2} y={RAIL_Y - 44} width={w - 4} height={92} rx={8} />}
                <line x1={x} y1={RAIL_Y} x2={s1} y2={RAIL_Y} strokeWidth={2} />
                <line x1={s2} y1={RAIL_Y} x2={x + w} y2={RAIL_Y} strokeWidth={2} />
                {el.type === 'resistor' && <Resistor x1={s1} x2={s2} y={RAIL_Y} />}
                {el.type === 'inductor' && <Inductor x1={s1} x2={s2} y={RAIL_Y} />}
                {el.type === 'capacitor' && <Capacitor x1={s1 + 14} x2={s2 - 14} y={RAIL_Y} />}
                {isLine(el.type) && (
                  <g>
                    <rect className="tl-box" x={s1 - 8} y={RAIL_Y - 15} width={s2 - s1 + 16} height={30} rx={4} />
                    <text x={(s1 + s2) / 2} y={RAIL_Y + 4} textAnchor="middle" className="tl-label">{el.type === 'qwt' ? 'λ/4' : `Z₀=${fmtNum(el.params.Z0, 0)}`}</text>
                  </g>
                )}
                {isStub(el.type) && (
                  <g>
                    <rect className="tl-box" x={s1 - 8} y={RAIL_Y - 15} width={s2 - s1 + 16} height={30} rx={4} />
                    <line x1={(s1 + s2) / 2} y1={RAIL_Y - 15} x2={(s1 + s2) / 2} y2={RAIL_Y - 30} strokeWidth={2} />
                    {el.type === 'stub_short' ? <line x1={(s1 + s2) / 2 - 8} y1={RAIL_Y - 30} x2={(s1 + s2) / 2 + 8} y2={RAIL_Y - 30} strokeWidth={2.5} /> : <circle cx={(s1 + s2) / 2} cy={RAIL_Y - 33} r={3.5} fill="#fff" strokeWidth={2} />}
                    <text x={(s1 + s2) / 2} y={RAIL_Y + 4} textAnchor="middle" className="tl-label">{el.type === 'stub_short' ? 'S-stub' : 'O-stub'}</text>
                  </g>
                )}
                {el.type === 'load' && (
                  <g>
                    <rect className="load-box" x={s1 + 4} y={RAIL_Y - 16} width={s2 - s1 - 8} height={32} rx={5} />
                    <text x={(s1 + s2) / 2} y={RAIL_Y + 5} textAnchor="middle" className="tl-label">Z_L</text>
                  </g>
                )}
                {el.type === 'antenna' && (
                  <g>
                    <rect className="load-box ant" x={s1 + 4} y={RAIL_Y - 16} width={s2 - s1 - 8} height={32} rx={5} />
                    <path d={`M${(s1 + s2) / 2},${RAIL_Y + 10} v-14 m-9,-8 l9,8 l9,-8`} fill="none" strokeWidth={2} />
                    <text x={(s1 + s2) / 2 + 16} y={RAIL_Y + 5} textAnchor="middle" className="tl-label">ANT</text>
                  </g>
                )}
                <text x={x + w / 2} y={RAIL_Y - 28} textAnchor="middle" className="el-name">{spec.symbol}{badge && <tspan className={`badge-${st}`}> {badge}</tspan>}</text>
                <text x={x + w / 2} y={RAIL_Y + 36} textAnchor="middle" className="el-value">{valueLabel(el, circuit.f)}</text>
              </g>
            );
          }
          const cx = x + w / 2;
          const y1 = RAIL_Y + 22;
          const y2 = RAIL_Y + 96;
          const stub = isStub(el.type);
          return (
            <g key={el.id} {...common}>
              {st && <rect className="st-box" x={cx - 40} y={RAIL_Y - 6} width={80} height={GND_Y - RAIL_Y + 22} rx={8} />}
              <circle className="node" cx={cx} cy={RAIL_Y} r={4} />
              <line x1={cx} y1={RAIL_Y} x2={cx} y2={y1} strokeWidth={2} />
              {el.type === 'resistor' && <Resistor x1={y1} x2={y2} y={cx} vertical />}
              {el.type === 'inductor' && <Inductor x1={y1} x2={y2} y={cx} vertical />}
              {el.type === 'capacitor' && <Capacitor x1={y1 + 14} x2={y2 - 14} y={cx} vertical />}
              {stub && (
                <g>
                  <rect className="tl-box" x={cx - 13} y={y1} width={26} height={y2 - y1} rx={4} />
                </g>
              )}
              {(!stub || el.type === 'stub_short') && (
                <g>
                  <line x1={cx} y1={y2} x2={cx} y2={GND_Y} strokeWidth={2} />
                  <Ground x={cx} y={GND_Y} />
                </g>
              )}
              {el.type === 'stub_open' && <circle cx={cx} cy={y2 + 6} r={4} fill="#fff" strokeWidth={2} />}
              <text x={cx + 18} y={(y1 + y2) / 2 - 6} className="el-name">{spec.symbol}{stub ? '' : '↓'}{badge && <tspan className={`badge-${st}`}> {badge}</tspan>}</text>
              <text x={cx + 18} y={(y1 + y2) / 2 + 12} className="el-value">{valueLabel(el, circuit.f)}</text>
            </g>
          );
        })}
        {circuit.elements.length > 0 && (
          <g className="terminal">
            {endOpen ? (
              <circle cx={endX + 6} cy={RAIL_Y} r={5} fill="#fff" strokeWidth={2} />
            ) : (
              <g>
                <line x1={endX - GAP / 2} y1={RAIL_Y} x2={endX - GAP / 2} y2={GND_Y} strokeWidth={2} />
                <Ground x={endX - GAP / 2} y={GND_Y} />
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
};
