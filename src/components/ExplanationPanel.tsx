import React, { useEffect, useRef, useState } from 'react';
import { t } from '../engine/i18n';
import { useAppState, useDispatch, useDerived } from '../state/store';
import { ExplainStep } from '../engine/explain';
import { Line } from './StepLines';
import { MaxButton } from './MaxButton';
import { startExplain } from './startExplain';

const StepCard: React.FC<{ step: ExplainStep; n: number; active?: boolean; onClick?: () => void }> = ({ step, n, active, onClick }) => (
  <div className={`step-card tag-${step.tag} ${active ? 'active' : ''}`} onClick={onClick}>
    <div className="step-head">
      <span className="step-num">STEP {n}</span>
      <span className="step-title">{step.title}</span>
    </div>
    <div className="step-body">
      {step.lines.map((l, i) => (
        <Line key={i} line={l} />
      ))}
    </div>
  </div>
);

export const ExplanationPanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();
  const { steps } = useDerived();
  const [auto, setAuto] = useState(false);
  const idx = Math.min(state.explainStep, steps.length - 1);
  const step = steps[idx];
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      if (idx >= steps.length - 1) setAuto(false);
      else dispatch({ type: 'explain_step', i: idx + 1 });
    }, 3200);
    return () => clearInterval(t);
  }, [auto, idx, steps.length, dispatch]);

  useEffect(() => {
    // scroll the active chip into view INSIDE the stepper only (never scroll the window)
    const box = chipsRef.current;
    const el = box?.querySelector('.chip.on') as HTMLElement | null;
    if (!box || !el) return;
    const target = el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2;
    box.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [idx]);

  return (
    <div className="explain" id="explain-panel">
      <div className="panel-head">
        <span className="panel-title">STEP-BY-STEP EXPLANATION</span>
        <div className="chip-row">
          <button className="btn primary small" onClick={() => startExplain(dispatch, state.maximized)}>
            ▶ Explain this circuit
          </button>
          <button className={`chip ${auto ? 'on' : ''}`} onClick={() => { if (!auto && idx >= steps.length - 1) dispatch({ type: 'explain_step', i: 0 }); setAuto(!auto); dispatch({ type: 'explain_all', value: false }); }}>
            {auto ? '⏸ หยุด' : '⏵ เล่นอัตโนมัติ'}
          </button>
          <button className={`chip ${state.explainAll ? 'on' : ''}`} onClick={() => dispatch({ type: 'explain_all', value: !state.explainAll })}>
            {t("แสดงทุกขั้น")}
          </button>
          <MaxButton panel="explain" />
        </div>
      </div>
      <div className="stepper" ref={chipsRef}>
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <button className={`chip step-chip tag-${s.tag} ${i === idx && !state.explainAll ? 'on' : ''} ${i < idx ? 'done' : ''}`} onClick={() => { dispatch({ type: 'explain_all', value: false }); dispatch({ type: 'explain_step', i }); }}>
              <span className="n">{i + 1}</span> {s.short}
            </button>
            {i < steps.length - 1 && <span className="arrow">→</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="explain-body">
        {state.explainAll ? (
          <div className="step-list">
            {steps.map((s, i) => (
              <StepCard key={s.id} step={s} n={i + 1} onClick={() => { dispatch({ type: 'explain_all', value: false }); dispatch({ type: 'explain_step', i }); }} />
            ))}
          </div>
        ) : (
          step && (
            <div className="step-single">
              <StepCard step={step} n={idx + 1} active />
              <div className="step-nav">
                <button className="btn small" disabled={idx === 0} onClick={() => dispatch({ type: 'explain_step', i: idx - 1 })}>{t("◀ ก่อนหน้า")}</button>
                <span className="step-pos">{idx + 1} / {steps.length}</span>
                <button className="btn small" disabled={idx >= steps.length - 1} onClick={() => dispatch({ type: 'explain_step', i: idx + 1 })}>{t("ถัดไป ▶")}</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
