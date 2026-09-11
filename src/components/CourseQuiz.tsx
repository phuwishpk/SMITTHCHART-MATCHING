import React, { useState } from 'react';
import { SmithFull, SmithFullProps } from './SmithFull';
import { Marked } from './StepLines';

export interface QuizFigure {
  question: string;
  choices: string[];
  /** index into choices */
  answer: number;
  explain: string;
  /** a small chart to answer from, rather than answering from the prose */
  chart?: Omit<SmithFullProps, 'title' | 'note'>;
  hint?: string;
}

/**
 * One question between two ideas. The learner answers by reading the chart, then
 * the explanation appears — the point is to look before being told.
 */
export const CourseQuiz: React.FC<QuizFigure> = ({ question, choices, answer, explain, chart, hint }) => {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const right = picked === answer;
  return (
    <div className={`quiz ${done ? (right ? 'ok' : 'bad') : ''}`}>
      <div className="quiz-q"><span className="quiz-tag">ลองตอบก่อน</span> {question}</div>
      {chart && (
        <div className="quiz-chart">
          <SmithFull {...chart} scale={chart.scale ?? false} fine={chart.fine ?? false} />
        </div>
      )}
      <div className="quiz-choices">
        {choices.map((c, i) => (
          <button
            key={i}
            className={`quiz-choice ${done && i === answer ? 'right' : ''} ${done && i === picked && !right ? 'wrong' : ''}`}
            onClick={() => setPicked(i)}
            disabled={done}
          >
            {c}
          </button>
        ))}
      </div>
      {!done && hint && <div className="quiz-hint">💡 <Marked text={hint} /></div>}
      {done && (
        <div className="quiz-explain">
          <b>{right ? '✓ ถูกต้อง' : '✗ ยังไม่ใช่'}</b> — <Marked text={explain} />
          {!right && <button className="btn small quiz-retry" onClick={() => setPicked(null)}>ลองใหม่</button>}
        </div>
      )}
    </div>
  );
};
