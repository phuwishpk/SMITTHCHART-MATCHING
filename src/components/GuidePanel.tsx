import React, { useEffect, useMemo, useState } from 'react';
import { useAppState, useDispatch, useDerived } from '../state/store';
import { LESSONS, PROBLEMS, findLesson, AnswerSpec } from '../engine/lessons';
import { SolutionRow } from './SolutionPanel';
import { solveCircuit } from '../engine/solver';
import { fmtNum } from '../engine/complex';

export const GuidePanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const { result } = useDerived();
  const lesson = findLesson(state.lessonId);
  const [showConcept, setShowConcept] = useState(true);

  // expected answers (from the solution circuit) and per-answer correctness
  const answerInfo = useMemo(() => {
    if (!lesson || !lesson.answers || !lesson.solution) return null;
    const sc = lesson.solution();
    const sr = solveCircuit(sc);
    const rows = lesson.answers.map((a: AnswerSpec) => {
      const expected = a.value(sr, sc);
      const raw = state.answers[`${lesson.id}:${a.key}`] ?? '';
      const v = parseFloat(raw.replace(',', '.'));
      const tolAbs = Math.max(a.tolAbs ?? 0, Math.abs(expected) * a.tol, 1e-9);
      const ok = Number.isFinite(v) && Math.abs(v - expected) <= tolAbs;
      return { spec: a, expected, raw, ok, filled: raw.trim() !== '' };
    });
    return { rows, allOk: rows.every((r) => r.ok) };
  }, [lesson, state.answers]);
  const answersOk = !!answerInfo?.allOk && state.answersChecked;

  useEffect(() => {
    if (!lesson) return;
    let n = state.lessonDone;
    while (n < lesson.steps.length && lesson.steps[n].check(state.circuit, result, { answersOk })) n++;
    if (n !== state.lessonDone) dispatch({ type: 'lesson_done', n });
  }, [lesson, state.circuit, result, state.lessonDone, answersOk, dispatch]);

  if (state.mode !== 'guided') return null;
  if (!lesson) {
    return (
      <div className="guide empty">
        <span>🎓 Guided Lab: เลือกบทเรียนเพื่อให้ระบบพาทำทีละขั้น</span>
        <button className="btn primary small" onClick={() => dispatch({ type: 'modal', modal: 'lessons' })}>เลือกบทเรียน</button>
        <button className="btn small" onClick={() => dispatch({ type: 'lesson', id: 'l1' })}>เริ่ม Level 1</button>
      </div>
    );
  }
  const done = state.lessonDone;
  const total = lesson.steps.length;
  const complete = done >= total;
  const pool = lesson.kind === 'problem' ? PROBLEMS : LESSONS;
  const idx = pool.findIndex((l) => l.id === lesson.id);
  const nextLesson = pool[idx + 1];
  const current = lesson.steps[Math.min(done, total - 1)];

  return (
    <div className={`guide ${complete ? 'complete' : ''}`}>
      <div className="guide-head">
        <span className={`lvl ${lesson.kind === 'problem' ? 'prob' : ''}`}>{lesson.kind === 'problem' ? (lesson.category === 'impedance' ? 'โจทย์ Z' : lesson.category === 'admittance' ? 'โจทย์ Y' : 'โจทย์หนังสือ') : `Level ${lesson.level}`}</span>
        <b>{lesson.title}</b>
        <span className="learn">— {lesson.learn}</span>
        <span className="spacer" />
        <span className="progress">{Math.min(done, total)}/{total}</span>
        <button className="chip" onClick={() => setShowConcept(!showConcept)}>{showConcept ? 'ซ่อนแนวคิด' : 'แนวคิด'}</button>
        <button className={`chip ${state.showSolution ? 'on' : ''}`} onClick={() => dispatch({ type: 'show_solution', value: !state.showSolution })}>{state.showSolution ? 'ซ่อนเฉลย' : 'เฉลย'}</button>
        <button className="chip" onClick={() => dispatch({ type: 'lesson', id: lesson.id })}>เริ่มใหม่</button>
        {nextLesson && <button className={`chip ${complete ? 'on' : ''}`} onClick={() => dispatch({ type: 'lesson', id: nextLesson.id })}>ถัดไป: {lesson.kind === 'problem' ? nextLesson.title.split(' ')[0] : `L${nextLesson.level}`} ▶</button>}
      </div>
      {lesson.kind === 'problem' && lesson.statement && (
        <div className="problem-statement">
          <b>โจทย์:</b> {lesson.statement}
        </div>
      )}
      {answerInfo && (
        <div className="answers">
          <div className="answers-grid">
            {answerInfo.rows.map((row) => (
              <label key={row.spec.key} className={`answer ${state.answersChecked ? (row.ok ? 'ok' : 'bad') : ''}`}>
                <span className="answer-label">{row.spec.label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.raw}
                  placeholder="?"
                  onChange={(e) => dispatch({ type: 'answer', key: `${lesson.id}:${row.spec.key}`, value: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') dispatch({ type: 'answers_checked', value: true }); }}
                />
                {row.spec.unit && <span className="answer-unit">{row.spec.unit}</span>}
                {state.answersChecked && <span className="answer-mark">{row.ok ? '✓' : '✗'}</span>}
                {state.answersChecked && !row.ok && state.showSolution && <span className="answer-expected">เฉลย {fmtNum(row.expected, 3)}</span>}
              </label>
            ))}
          </div>
          <div className="answers-actions">
            <button className="btn primary small" onClick={() => dispatch({ type: 'answers_checked', value: true })}>✔ ตรวจคำตอบ</button>
            {state.answersChecked && (
              <span className={`answers-result ${answerInfo.allOk ? 'ok' : ''}`}>
                {answerInfo.allOk ? '✓ ถูกต้องทุกข้อ' : `ถูก ${answerInfo.rows.filter((r) => r.ok).length}/${answerInfo.rows.length} ข้อ${state.showSolution ? '' : ' · กด "เฉลย" เพื่อดูค่าที่ถูกต้อง'}`}
              </span>
            )}
            <span className="muted">ยอมรับความคลาดเคลื่อน ≈ 2–4 %</span>
          </div>
        </div>
      )}
      {showConcept && (
        <ul className="guide-concept">
          {lesson.concept.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
      <ol className="guide-steps">
        {lesson.steps.map((s, i) => (
          <li key={i} className={i < done ? 'done' : i === done ? 'current' : ''}>
            <span className="mark">{i < done ? '✓' : i === done ? '▶' : '○'}</span>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
      {!complete && current?.hint && <div className="guide-hint">💡 {current.hint}</div>}
      {state.showSolution && <SolutionRow lesson={lesson} />}
      {complete && <div className="guide-done">🎉 {lesson.kind === 'problem' ? 'ทำโจทย์ข้อนี้สำเร็จ!' : 'จบบทเรียนนี้แล้ว!'} {nextLesson ? `ไปต่อ ${lesson.kind === 'problem' ? nextLesson.title : `Level ${nextLesson.level}: ${nextLesson.title}`}` : 'ครบทุกข้อแล้ว'}</div>}
    </div>
  );
};
