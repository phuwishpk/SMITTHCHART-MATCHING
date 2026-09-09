import React, { useMemo, useRef, useState } from 'react';
import { useAppState, useDispatch, useDerived } from '../state/store';
import { CircuitElement, ELEMENT_SPECS, ElementType, isLine, isStub } from '../engine/circuit';
import { fmtNum } from '../engine/complex';

export const RAIL_Y = 96;
export const SLOT_W = 124;
export const GAP = 44;
export const SHUNT_W = 96;
export const GND_Y = 214;
export const X0 = 150;
export const H = 268;

export interface Item {
  el: CircuitElement;
  index: number;
  kind: 'series' | 'shunt';
  x: number;
  w: number;
}
export interface Zone {
  index: number;
  x: number;
}

export const layout = (elements: CircuitElement[]) => {
  const items: Item[] = [];
  const zones: Zone[] = [];
  let x = X0;
  elements.forEach((el, i) => {
    zones.push({ index: i, x: x - GAP / 2 });
    if (el.orient === 'series') {
      items.push({ el, index: i, kind: 'series', x, w: SLOT_W });
      x += SLOT_W + GAP;
    } else {
      items.push({ el, index: i, kind: 'shunt', x, w: SHUNT_W });
      x += SHUNT_W;
    }
  });
  zones.push({ index: elements.length, x: x - GAP / 2 });
  return { items, zones, endX: x };
};

export const valueLabel = (el: CircuitElement, f: number): string => {
  switch (el.type) {
    case 'resistor':
      return `${fmtNum(el.params.R, 2)} Ω`;
    case 'inductor':
      return `${fmtNum(el.params.L, 2)} nH`;
    case 'capacitor':
      return `${fmtNum(el.params.C, 2)} pF`;
    case 'tline':
      return `${fmtNum(el.params.len, 3)} λ · ${fmtNum(el.params.Z0, 1)} Ω`;
    case 'qwt':
      return `Zt = ${fmtNum(el.params.Zt, 2)} Ω`;
    case 'stub_short':
    case 'stub_open':
      return `l = ${fmtNum(el.params.len, 3)} λ`;
    case 'load':
      return `${fmtNum(el.params.R, 1)} ${el.params.X < 0 ? '−' : '+'} j${fmtNum(Math.abs(el.params.X), 1)} Ω`;
    default:
      void f;
      return '';
  }
};

// ---------- symbol drawings ----------
export const Resistor: React.FC<{ x1: number; x2: number; y: number; vertical?: boolean }> = ({ x1, x2, y, vertical }) => {
  const len = x2 - x1;
  const n = 6;
  const seg = len / n;
  const amp = 9;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const p = x1 + i * seg;
    const off = i === 0 || i === n ? 0 : i % 2 === 1 ? -amp : amp;
    pts.push(vertical ? `${y + off},${p}` : `${p},${y + off}`);
  }
  return <polyline points={pts.join(' ')} fill="none" strokeWidth={2.4} strokeLinejoin="round" />;
};

export const Inductor: React.FC<{ x1: number; x2: number; y: number; vertical?: boolean }> = ({ x1, x2, y, vertical }) => {
  const n = 4;
  const r = (x2 - x1) / (2 * n);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = x1 + 2 * r * i;
    const b = a + 2 * r;
    d += vertical ? `M${y},${a} A${r},${r} 0 0 0 ${y},${b} ` : `M${a},${y} A${r},${r} 0 0 1 ${b},${y} `;
  }
  return <path d={d} fill="none" strokeWidth={2.4} />;
};

export const Capacitor: React.FC<{ x1: number; x2: number; y: number; vertical?: boolean }> = ({ x1, x2, y, vertical }) => {
  const m = (x1 + x2) / 2;
  const g = 5;
  const h = 14;
  if (vertical)
    return (
      <g strokeWidth={2.4}>
        <line x1={y} y1={x1} x2={y} y2={m - g} />
        <line x1={y - h} y1={m - g} x2={y + h} y2={m - g} />
        <line x1={y - h} y1={m + g} x2={y + h} y2={m + g} />
        <line x1={y} y1={m + g} x2={y} y2={x2} />
      </g>
    );
  return (
    <g strokeWidth={2.4}>
      <line x1={x1} y1={y} x2={m - g} y2={y} />
      <line x1={m - g} y1={y - h} x2={m - g} y2={y + h} />
      <line x1={m + g} y1={y - h} x2={m + g} y2={y + h} />
      <line x1={m + g} y1={y} x2={x2} y2={y} />
    </g>
  );
};

export const Ground: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g strokeWidth={2}>
    <line x1={x - 12} y1={y} x2={x + 12} y2={y} />
    <line x1={x - 8} y1={y + 5} x2={x + 8} y2={y + 5} />
    <line x1={x - 4} y1={y + 10} x2={x + 4} y2={y + 10} />
  </g>
);

export const CircuitCanvas: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const { result, steps } = useDerived();
  const { circuit, selectedId, dragging, probe } = state;
  const { items, zones, endX } = useMemo(() => layout(circuit.elements), [circuit.elements]);
  const width = Math.max(760, endX + 90);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [moveDrag, setMoveDrag] = useState<{ id: string; x: number; y: number; target: number | null } | null>(null);
  const highlightId = !state.explainAll ? steps[Math.min(state.explainStep, steps.length - 1)]?.highlight?.elementId : undefined;

  const dragType: ElementType | null = dragging && dragging !== 'move' ? dragging : null;
  const zoneAllowed = (orient: 'series' | 'shunt'): boolean => {
    if (dragType) return ELEMENT_SPECS[dragType].allowed.includes(orient);
    return true;
  };

  const svgPoint = (e: React.PointerEvent | React.DragEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const nearestZone = (x: number): number => {
    let best = zones[0];
    for (const z of zones) if (Math.abs(z.x - x) < Math.abs(best.x - x)) best = z;
    return best.index;
  };

  // --- palette HTML5 drag/drop ---
  const onDropZone = (e: React.DragEvent, index: number, orient: 'series' | 'shunt') => {
    e.preventDefault();
    e.stopPropagation();
    const t = (e.dataTransfer.getData('text/plain') || dragType) as ElementType | '';
    setActiveZone(null);
    if (!t || !(t in ELEMENT_SPECS)) return;
    const spec = ELEMENT_SPECS[t as ElementType];
    const o = spec.allowed.includes(orient) ? orient : spec.defaultOrient;
    dispatch({ type: 'add', elType: t as ElementType, index, orient: o });
  };
  const onDropSvg = (e: React.DragEvent) => {
    e.preventDefault();
    const t = (e.dataTransfer.getData('text/plain') || dragType) as ElementType | '';
    setActiveZone(null);
    if (!t || !(t in ELEMENT_SPECS)) return;
    const p = svgPoint(e);
    const idx = nearestZone(p.x);
    const spec = ELEMENT_SPECS[t as ElementType];
    const orient: 'series' | 'shunt' = p.y > RAIL_Y + 28 && spec.allowed.includes('shunt') ? 'shunt' : spec.allowed.includes('series') ? 'series' : 'shunt';
    dispatch({ type: 'add', elType: t as ElementType, index: idx, orient });
  };

  // --- pointer drag to reorder existing elements ---
  const startMove = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    const p = svgPoint(e);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setMoveDrag({ id, x: p.x, y: p.y, target: null });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!moveDrag) return;
    const p = svgPoint(e);
    const moved = Math.abs(p.x - moveDrag.x) > 8 || moveDrag.target !== null;
    if (!moved) return;
    if (dragging !== 'move') dispatch({ type: 'dragging', value: 'move' });
    setMoveDrag({ ...moveDrag, target: nearestZone(p.x) });
  };
  const endMove = () => {
    if (!moveDrag) return;
    if (moveDrag.target !== null) dispatch({ type: 'move', id: moveDrag.id, index: moveDrag.target });
    else dispatch({ type: 'select', id: moveDrag.id });
    setMoveDrag(null);
    if (dragging === 'move') dispatch({ type: 'dragging', value: null });
  };

  const showZones = dragging !== null;
  const last = circuit.elements[circuit.elements.length - 1];
  const endOpen = last ? last.orient === 'shunt' : false;

  // load bracket
  const loadItems = items.filter((it) => it.index >= result.loadStart);
  const netItems = items.filter((it) => it.index < result.loadStart);
  const bracket = (list: Item[]) => {
    if (list.length === 0) return null;
    const x1 = Math.min(...list.map((i) => i.x)) - 6;
    const x2 = Math.max(...list.map((i) => i.x + i.w)) + 6;
    return { x1, x2 };
  };
  const loadBr = result.hasNetwork ? bracket(loadItems) : null;
  const netBr = result.hasNetwork ? bracket(netItems) : null;

  // probe marker on line
  const probeItem = probe ? items.find((it) => it.el.id === probe.elementId) : undefined;

  return (
    <div className="canvas-wrap">
      <div className="canvas-toolbar">
        <div className="tb-group">
          <label>f</label>
          <input
            type="number"
            step="1"
            value={Number((circuit.f / 1e6).toPrecision(6))}
            onChange={(e) => dispatch({ type: 'freq', f: parseFloat(e.target.value) * 1e6 || circuit.f })}
          />
          <span className="unit">MHz</span>
        </div>
        <div className="tb-group">
          <label>Z₀</label>
          <input type="number" step="1" value={circuit.Z0} onChange={(e) => dispatch({ type: 'z0', Z0: parseFloat(e.target.value) || circuit.Z0 })} />
          <span className="unit">Ω</span>
        </div>
        <div className="tb-spacer" />
        <button className="btn ghost" onClick={() => dispatch({ type: 'select', id: 'source' })}>
          ⚙ Source
        </button>
        <button className="btn ghost danger" onClick={() => dispatch({ type: 'set_circuit', circuit: { ...circuit, elements: [] }, select: null })} title="ล้างอุปกรณ์ทั้งหมด">
          ✕ ล้างวงจร
        </button>
        <button className="btn primary" onClick={() => { if (state.maximized) dispatch({ type: 'maximize', panel: null }); dispatch({ type: 'explain_all', value: false }); dispatch({ type: 'explain_step', i: 0 }); requestAnimationFrame(() => document.getElementById('explain-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); }}>
          ▶ Explain this circuit
        </button>
      </div>
      <div className="canvas-scroll" onDragOver={(e) => e.preventDefault()} onDrop={onDropSvg}>
        <svg
          ref={svgRef}
          className={`circuit-svg ${moveDrag?.target !== null && moveDrag ? 'moving' : ''}`}
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          onPointerMove={onPointerMove}
          onPointerUp={endMove}
          onPointerCancel={endMove}
          onClick={(e) => {
            if (e.target === svgRef.current) dispatch({ type: 'select', id: null });
          }}
        >
          <defs>
            <marker id="arrowSrc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
            </marker>
          </defs>
          {/* rail */}
          <line className="rail" x1={70} y1={RAIL_Y} x2={endOpen ? endX : endX - GAP / 2} y2={RAIL_Y} />
          {/* ground rail */}
          <line className="gnd-rail" x1={40} y1={GND_Y + 16} x2={endX + 20} y2={GND_Y + 16} />

          {/* source */}
          <g
            className={`el source ${selectedId === 'source' ? 'selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'select', id: 'source' }); }}
          >
            <circle cx={40} cy={RAIL_Y} r={24} fill="#fff" strokeWidth={2.4} />
            <path d={`M28,${RAIL_Y} q6,-12 12,0 t12,0`} fill="none" strokeWidth={2} />
            <line x1={40} y1={RAIL_Y + 24} x2={40} y2={RAIL_Y + 36} strokeWidth={2} />
            <line x1={40} y1={RAIL_Y + 36} x2={90} y2={RAIL_Y + 36} strokeWidth={2} />
            <line x1={90} y1={RAIL_Y + 36} x2={90} y2={GND_Y} strokeWidth={2} />
            <Ground x={90} y={GND_Y} />
            <line x1={64} y1={RAIL_Y} x2={74} y2={RAIL_Y} strokeWidth={2} />
            <rect x={74} y={RAIL_Y - 8} width={40} height={16} rx={3} fill="#fff" strokeWidth={2} />
            <text x={94} y={RAIL_Y + 4} textAnchor="middle" className="tl-label">Z_S</text>
            <line x1={114} y1={RAIL_Y} x2={X0 - GAP} y2={RAIL_Y} strokeWidth={2} />
            <text x={12} y={RAIL_Y - 34} textAnchor="start" className="el-name">RF Source</text>
            <text x={12} y={RAIL_Y + 44} textAnchor="start" className="el-value">{fmtNum(circuit.f / 1e6, 3)} MHz</text>
            <text x={12} y={RAIL_Y + 60} textAnchor="start" className="el-value">Z_S = Z₀ = {fmtNum(circuit.Z0, 1)} Ω</text>
          </g>

          {/* empty hint */}
          {circuit.elements.length === 0 && (
            <g className="empty-hint">
              <rect x={X0} y={RAIL_Y - 36} width={360} height={72} rx={12} />
              <text x={X0 + 180} y={RAIL_Y - 6} textAnchor="middle">ลากอุปกรณ์จาก COMPONENTS มาวางบนสายนี้</text>
              <text x={X0 + 180} y={RAIL_Y + 18} textAnchor="middle" className="small">วางบนสาย = อนุกรม · วางใต้สาย = ขนานลงกราวด์</text>
            </g>
          )}

          {/* brackets */}
          {netBr && (
            <g className="bracket net">
              <path d={`M${netBr.x1},${GND_Y + 30} v8 H${netBr.x2} v-8`} fill="none" />
              <text x={(netBr.x1 + netBr.x2) / 2} y={GND_Y + 52} textAnchor="middle">MATCHING NETWORK</text>
            </g>
          )}
          {loadBr && (
            <g className="bracket load">
              <path d={`M${loadBr.x1},${GND_Y + 30} v8 H${loadBr.x2} v-8`} fill="none" />
              <text x={(loadBr.x1 + loadBr.x2) / 2} y={GND_Y + 52} textAnchor="middle">LOAD (Z_L)</text>
            </g>
          )}

          {/* elements */}
          {items.map((it) => {
            const { el, x, w, kind } = it;
            const spec = ELEMENT_SPECS[el.type];
            const sel = selectedId === el.id;
            const hl = highlightId === el.id;
            const isMoving = moveDrag?.id === el.id && moveDrag.target !== null;
            const stage = result.stages.find((s) => s.index === it.index);
            const zTitle = stage ? `z: ${fmtNum(stage.zbefore.re, 3)}${stage.zbefore.im < 0 ? '−' : '+'}j${fmtNum(Math.abs(stage.zbefore.im), 3)} → ${fmtNum(stage.zafter.re, 3)}${stage.zafter.im < 0 ? '−' : '+'}j${fmtNum(Math.abs(stage.zafter.im), 3)}` : '';
            const common = {
              className: `el ${kind} ${sel ? 'selected' : ''} ${hl ? 'highlight' : ''} ${isMoving ? 'ghost' : ''}`,
              style: { color: spec.color } as React.CSSProperties,
              onClick: (e: React.MouseEvent) => { e.stopPropagation(); },
              onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); startMove(e, el.id); },
            };
            if (kind === 'series') {
              const s1 = x + 26;
              const s2 = x + w - 26;
              return (
                <g key={el.id} {...common}>
                  <title>{`${spec.name} — ${valueLabel(el, circuit.f)}\n${zTitle}`}</title>
                  <rect className="hit" x={x} y={RAIL_Y - 44} width={w} height={96} rx={10} />
                  <line x1={x} y1={RAIL_Y} x2={s1} y2={RAIL_Y} strokeWidth={2} />
                  <line x1={s2} y1={RAIL_Y} x2={x + w} y2={RAIL_Y} strokeWidth={2} />
                  {el.type === 'resistor' && <Resistor x1={s1} x2={s2} y={RAIL_Y} />}
                  {el.type === 'inductor' && <Inductor x1={s1} x2={s2} y={RAIL_Y} />}
                  {el.type === 'capacitor' && <Capacitor x1={s1 + 14} x2={s2 - 14} y={RAIL_Y} />}
                  {isLine(el.type) && (
                    <g>
                      <rect className="tl-box" x={s1 - 8} y={RAIL_Y - 15} width={s2 - s1 + 16} height={30} rx={4} />
                      <line x1={s1 - 8} y1={RAIL_Y - 5} x2={s2 + 8} y2={RAIL_Y - 5} strokeWidth={1} opacity={0.5} />
                      <line x1={s1 - 8} y1={RAIL_Y + 5} x2={s2 + 8} y2={RAIL_Y + 5} strokeWidth={1} opacity={0.5} />
                      <text x={(s1 + s2) / 2} y={RAIL_Y + 4} textAnchor="middle" className="tl-label">{el.type === 'qwt' ? 'λ/4' : `Z₀=${fmtNum(el.params.Z0, 0)}`}</text>
                      {probeItem?.el.id === el.id && probe && (
                        <g className="probe-marker">
                          {(() => {
                            const len = el.type === 'qwt' ? 0.25 : el.params.len;
                            const frac = len > 0 ? Math.min(1, probe.d / len) : 0;
                            const px = s2 + 8 - frac * (s2 - s1 + 16);
                            return (
                              <>
                                <line x1={px} y1={RAIL_Y - 30} x2={px} y2={RAIL_Y - 16} strokeWidth={2} />
                                <path d={`M${px - 6},${RAIL_Y - 32} L${px + 6},${RAIL_Y - 32} L${px},${RAIL_Y - 22} z`} />
                                <text x={px} y={RAIL_Y - 36} textAnchor="middle" className="probe-text">d = {fmtNum(probe.d, 3)} λ</text>
                              </>
                            );
                          })()}
                        </g>
                      )}
                    </g>
                  )}
                  {el.type === 'load' && (
                    <g>
                      <rect className="load-box" x={s1 + 4} y={RAIL_Y - 16} width={s2 - s1 - 8} height={32} rx={5} />
                      <text x={(s1 + s2) / 2} y={RAIL_Y + 5} textAnchor="middle" className="tl-label">Z_L</text>
                    </g>
                  )}
                  <text x={x + w / 2} y={RAIL_Y - 28} textAnchor="middle" className="el-name">{spec.symbol}</text>
                  <text x={x + w / 2} y={RAIL_Y + 36} textAnchor="middle" className="el-value">{valueLabel(el, circuit.f)}</text>
                </g>
              );
            }
            // shunt element
            const cx = x + w / 2;
            const y1 = RAIL_Y + 22;
            const y2 = RAIL_Y + 96;
            const stub = isStub(el.type);
            return (
              <g key={el.id} {...common}>
                <title>{`${spec.name} (shunt) — ${valueLabel(el, circuit.f)}\n${zTitle}`}</title>
                <rect className="hit" x={cx - 40} y={RAIL_Y - 6} width={80} height={GND_Y - RAIL_Y + 26} rx={10} />
                <circle className="node" cx={cx} cy={RAIL_Y} r={4} />
                <line x1={cx} y1={RAIL_Y} x2={cx} y2={y1} strokeWidth={2} />
                {el.type === 'resistor' && <Resistor x1={y1} x2={y2} y={cx} vertical />}
                {el.type === 'inductor' && <Inductor x1={y1} x2={y2} y={cx} vertical />}
                {el.type === 'capacitor' && <Capacitor x1={y1 + 14} x2={y2 - 14} y={cx} vertical />}
                {stub && (
                  <g>
                    <rect className="tl-box" x={cx - 13} y={y1} width={26} height={y2 - y1} rx={4} />
                    <line x1={cx - 5} y1={y1} x2={cx - 5} y2={y2} strokeWidth={1} opacity={0.5} />
                    <line x1={cx + 5} y1={y1} x2={cx + 5} y2={y2} strokeWidth={1} opacity={0.5} />
                  </g>
                )}
                {(!stub || el.type === 'stub_short') && (
                  <g>
                    <line x1={cx} y1={y2} x2={cx} y2={GND_Y} strokeWidth={2} />
                    <Ground x={cx} y={GND_Y} />
                  </g>
                )}
                {el.type === 'stub_open' && (
                  <g>
                    <circle cx={cx} cy={y2 + 6} r={4} fill="#fff" strokeWidth={2} />
                    <text x={cx} y={y2 + 24} textAnchor="middle" className="el-value">open</text>
                  </g>
                )}
                <text x={cx + 20} y={(y1 + y2) / 2 - 6} className="el-name">{spec.symbol}{stub ? '' : '↓'}</text>
                <text x={cx + 20} y={(y1 + y2) / 2 + 12} className="el-value">{valueLabel(el, circuit.f)}</text>
              </g>
            );
          })}

          {/* end terminal */}
          {circuit.elements.length > 0 && (
            <g className="terminal">
              {endOpen ? (
                <g>
                  <circle cx={endX + 6} cy={RAIL_Y} r={5} fill="#fff" strokeWidth={2} />
                  <text x={endX + 6} y={RAIL_Y - 14} textAnchor="middle" className="el-value">open end</text>
                </g>
              ) : (
                <g>
                  <line x1={endX - GAP / 2} y1={RAIL_Y} x2={endX - GAP / 2} y2={GND_Y} strokeWidth={2} />
                  <Ground x={endX - GAP / 2} y={GND_Y} />
                  <text x={endX - GAP / 2} y={RAIL_Y - 14} textAnchor="middle" className="el-value">return</text>
                </g>
              )}
            </g>
          )}

          {/* drop zones */}
          {showZones &&
            zones.map((z) => {
              const key = `${z.index}`;
              const okSeries = zoneAllowed('series');
              const okShunt = zoneAllowed('shunt');
              const movingTarget = moveDrag?.target === z.index;
              return (
                <g key={key} className="zones">
                  {okSeries && (
                    <g
                      className={`zone series ${activeZone === key + 's' || movingTarget ? 'active' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setActiveZone(key + 's'); }}
                      onDragLeave={() => setActiveZone(null)}
                      onDrop={(e) => onDropZone(e, z.index, 'series')}
                    >
                      <rect x={z.x - 18} y={RAIL_Y - 16} width={36} height={32} rx={6} />
                      <text x={z.x} y={RAIL_Y + 5} textAnchor="middle">+</text>
                    </g>
                  )}
                  {okShunt && dragging !== 'move' && (
                    <g
                      className={`zone shunt ${activeZone === key + 'p' ? 'active' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setActiveZone(key + 'p'); }}
                      onDragLeave={() => setActiveZone(null)}
                      onDrop={(e) => onDropZone(e, z.index, 'shunt')}
                    >
                      <rect x={z.x - 18} y={RAIL_Y + 30} width={36} height={78} rx={6} />
                      <text x={z.x} y={RAIL_Y + 62} textAnchor="middle">⏚</text>
                      <text x={z.x} y={RAIL_Y + 96} textAnchor="middle" className="zone-small">ขนาน</text>
                    </g>
                  )}
                </g>
              );
            })}
        </svg>
      </div>
      {result.warnings.length > 0 && (
        <div className="canvas-warn">
          {result.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}
    </div>
  );
};
