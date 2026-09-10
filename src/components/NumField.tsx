import React, { useEffect, useState } from 'react';

interface Props {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  log?: boolean;
  digits?: number;
  onChange: (v: number) => void;
  hint?: string;
  compact?: boolean;
}

const toSlider = (v: number, min: number, max: number, log: boolean) => {
  if (!log) return Math.max(min, Math.min(max, v));
  const lo = Math.log10(Math.max(min, 1e-12));
  const hi = Math.log10(max);
  return Math.max(0, Math.min(1000, ((Math.log10(Math.max(v, min)) - lo) / (hi - lo)) * 1000));
};
const fromSlider = (s: number, min: number, max: number, log: boolean) => {
  if (!log) return s;
  const lo = Math.log10(Math.max(min, 1e-12));
  const hi = Math.log10(max);
  return 10 ** (lo + (s / 1000) * (hi - lo));
};

const roundSig = (v: number, sig = 4) => (v === 0 ? 0 : Number(v.toPrecision(sig)));

export const NumField: React.FC<Props> = ({ label, unit, value, min, max, step, log = false, digits = 4, onChange, hint, compact }) => {
  const [text, setText] = useState(String(roundSig(value, digits)));
  useEffect(() => {
    setText(String(roundSig(value, digits)));
  }, [value, digits]);

  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v)) onChange(v);
    else setText(String(roundSig(value, digits)));
  };

  return (
    <div className={`numfield ${compact ? 'compact' : ''}`}>
      <div className="numfield-row">
        <label>{label}</label>
        <div className="numfield-input">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
          {unit && <span className="unit">{unit}</span>}
        </div>
      </div>
      <input
        className="slider"
        type="range"
        min={log ? 0 : min}
        max={log ? 1000 : max}
        step={log ? 1 : step ?? (max - min) / 500}
        value={toSlider(value, min, max, log)}
        onChange={(e) => onChange(roundSig(fromSlider(parseFloat(e.target.value), min, max, log), 4))}
      />
      {hint && <div className="numfield-hint">{hint}</div>}
    </div>
  );
};
