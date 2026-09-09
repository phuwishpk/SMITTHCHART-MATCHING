import React from 'react';
import { useAppState, useDispatch } from '../state/store';
import { findLesson } from '../engine/lessons';

export const Header: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const lesson = findLesson(state.lessonId);
  return (
    <header className="header">
      <div className="brand">
        <span className="logo">◎</span>
        <div>
          <h1>RF + SMITH CHART LAB</h1>
          <p>Circuit → X_L / X_C → Z_L → z_L → Smith Chart → SWR → Matching</p>
        </div>
      </div>
      <div className="header-mid">
        <div className="seg">
          <button className={state.mode === 'guided' ? 'on' : ''} onClick={() => dispatch({ type: 'mode', mode: 'guided' })}>
            Guided Lab
          </button>
          <button className={state.mode === 'free' ? 'on' : ''} onClick={() => dispatch({ type: 'mode', mode: 'free' })}>
            Free Circuit Builder
          </button>
        </div>
        {lesson && state.mode === 'guided' && (
          <span className="lesson-pill">
            {lesson.kind === 'problem' ? `โจทย์ ${lesson.title}` : `Level ${lesson.level}: ${lesson.title}`}
          </span>
        )}
      </div>
      <div className="header-actions">
        <button className="btn" onClick={() => dispatch({ type: 'modal', modal: 'lessons' })}>
          📚 บทเรียน (14)
        </button>
        <button className="btn" onClick={() => dispatch({ type: 'modal', modal: 'problems' })}>
          📝 โจทย์ Z / Y
        </button>
        <button className="btn" onClick={() => dispatch({ type: 'modal', modal: 'examples' })}>
          🧪 ตัวอย่าง
        </button>
        <button className="btn ghost" onClick={() => { if (confirm('ล้างวงจรและเริ่มใหม่?')) dispatch({ type: 'reset' }); }}>
          ↺ รีเซ็ต
        </button>
      </div>
    </header>
  );
};
