import React, { useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Palette } from './components/Palette';
import { Inspector } from './components/Inspector';
import { CircuitCanvas } from './components/CircuitCanvas';
import { SmithChart } from './components/SmithChart';
import { ExplanationPanel } from './components/ExplanationPanel';
import { GuidePanel } from './components/GuidePanel';
import { Modals } from './components/Modals';
import { CoursePanel } from './components/CoursePanel';
import { useAppState, useDispatch } from './state/store';
import { MaxButton } from './components/MaxButton';

export const App: React.FC = () => {
  const state = useAppState();
  const dispatch = useDispatch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inInput = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
      if (e.key === 'Escape') {
        if (state.modal !== 'none') return; // Modals handles its own Escape
        if (inInput) (t as HTMLElement).blur();
        if (state.maximized) dispatch({ type: 'maximize', panel: null });
        else if (!inInput) dispatch({ type: 'select', id: null });
        return;
      }
      if (inInput) return;
      const canvasVisible = !state.maximized || state.maximized === 'canvas' || state.maximized === 'inspector';
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvasVisible && state.selectedId && state.selectedId !== 'source') {
        dispatch({ type: 'remove', id: state.selectedId });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.selectedId, state.maximized, state.modal, dispatch]);

  // keep keyboard focus sensible and clear a user-dragged footer height when maximizing
  const prevMax = useRef(state.maximized);
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>('footer.bottom');
    if (state.maximized === 'explain' && footer) footer.style.height = '';
    if (prevMax.current && !state.maximized) {
      const btn = document.querySelector<HTMLElement>('.app .panel-head .chip.max');
      btn?.focus();
    }
    prevMax.current = state.maximized;
  }, [state.maximized]);

  return (
    <div className={`app ${state.view === 'course' ? 'view-course' : ''} ${state.maximized && state.view === 'lab' ? `max max-${state.maximized}` : ''}`}>
      <Header />
      {state.maximized && (
        <div className="max-bar">
          <span>ขยายแผง: <b>{{ palette: 'COMPONENTS', inspector: 'PROPERTIES', canvas: 'CIRCUIT CANVAS', chart: 'SMITH CHART', explain: 'STEP-BY-STEP EXPLANATION' }[state.maximized]}</b></span>
          <button className="btn small" onClick={() => dispatch({ type: 'maximize', panel: null })}>⤡ ย่อกลับ (Esc)</button>
        </div>
      )}
      {state.view === 'course' ? (
        <CoursePanel />
      ) : (
      <main className="main">
        <aside className="col-left">
          <Palette />
          <Inspector />
        </aside>
        <section className="col-center">
          <div className="panel-head">
            <span className="panel-title">CIRCUIT CANVAS</span>
            <span className="panel-sub">{state.mode === 'guided' ? 'Guided Lab' : 'Free Circuit Builder'}</span>
            <MaxButton panel="canvas" />
          </div>
          <GuidePanel />
          <CircuitCanvas />
        </section>
        <aside className="col-right">
          <SmithChart />
        </aside>
      </main>
      )}
      {state.view === 'lab' && (
        <footer className="bottom">
          <ExplanationPanel />
        </footer>
      )}
      <Modals />
    </div>
  );
};
