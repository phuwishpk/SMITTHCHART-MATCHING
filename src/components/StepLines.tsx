import React from 'react';
import { Tex } from './Tex';
import { StepLine } from '../engine/explain';

export const Line: React.FC<{ line: StepLine }> = ({ line }) => {
  switch (line.kind) {
    case 'text':
      return <p className="ex-text">{line.text}</p>;
    case 'math':
      return <div className="ex-math"><Tex tex={line.tex} block /></div>;
    case 'result':
      return <div className="ex-result"><Tex tex={line.tex} block /></div>;
    case 'note':
      return <div className="ex-note">💡 {line.text}</div>;
    case 'code':
      return <pre className="ex-code">{line.text}</pre>;
    case 'warn':
      return <div className="ex-warn">⚠ {line.text}</div>;
  }
};

export const StepLines: React.FC<{ lines: StepLine[] }> = ({ lines }) => (
  <div className="step-body">
    {lines.map((l, i) => (
      <Line key={i} line={l} />
    ))}
  </div>
);
