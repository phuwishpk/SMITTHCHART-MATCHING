import React from 'react';
import { Tex } from './Tex';
import { StepLine } from '../engine/explain';
import { useT } from '../state/store';

/**
 * Course text marks its load-bearing phrases with **double asterisks**. They are rendered as a
 * highlighter stroke rather than bold, because the point is "this is the sentence to take away",
 * not "this word is loud". Everything else is left alone, so a line with no marks looks exactly
 * as it did before.
 */
export const Marked: React.FC<{ text: string }> = ({ text: raw }) => {
  // จุดเดียวที่ข้อความคอร์สทุกบรรทัดวิ่งผ่าน จึงแปลตรงนี้ทีเดียว
  const text = useT()(raw);
  if (!text.includes('**')) return <>{text}</>;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i} className="key">{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>,
      )}
    </>
  );
};

export const Line: React.FC<{ line: StepLine }> = ({ line }) => {
  switch (line.kind) {
    case 'text':
      return <p className="ex-text"><Marked text={line.text} /></p>;
    case 'math':
      return <div className="ex-math"><Tex tex={line.tex} block /></div>;
    case 'result':
      return <div className="ex-result"><Tex tex={line.tex} block /></div>;
    case 'note':
      return <div className="ex-note">💡 <Marked text={line.text} /></div>;
    case 'code':
      return <pre className="ex-code"><Marked text={line.text} /></pre>;
    case 'warn':
      return <div className="ex-warn">⚠ <Marked text={line.text} /></div>;
  }
};

export const StepLines: React.FC<{ lines: StepLine[] }> = ({ lines }) => (
  <div className="step-body">
    {lines.map((l, i) => (
      <Line key={i} line={l} />
    ))}
  </div>
);
