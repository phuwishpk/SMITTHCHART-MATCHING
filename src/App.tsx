import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { Splitter, savedSplits } from './components/Splitter';
import { t } from './engine/i18n';
import { Header } from './components/Header';
import { Palette } from './components/Palette';
import { Inspector } from './components/Inspector';
import { CircuitCanvas } from './components/CircuitCanvas';
import { SmithChart } from './components/SmithChart';
import { ExplanationPanel } from './components/ExplanationPanel';
import { GuidePanel } from './components/GuidePanel';
import { useAppState, useDispatch } from './state/store';
import { MaxButton } from './components/MaxButton';

const Modals = lazy(() => import('./components/Modals').then((module) => ({ default: module.Modals })));
const CoursePanel = lazy(() => import('./components/CoursePanel').then((module) => ({ default: module.CoursePanel })));

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
    <div className={`app ${state.view !== 'lab' ? 'view-course' : ''} ${state.maximized && state.view === 'lab' ? `max max-${state.maximized}` : ''} ${state.collapsed.palette && state.collapsed.inspector ? 'left-folded' : ''} ${state.collapsed.nav ? 'nav-folded' : ''}`}>
      <Header />
      {state.maximized && (
        <div className="max-bar">
          <span>{t("ขยายแผง:")} <b>{{ palette: 'COMPONENTS', inspector: 'PROPERTIES', canvas: 'CIRCUIT CANVAS', chart: 'SMITH CHART', explain: 'STEP-BY-STEP EXPLANATION' }[state.maximized]}</b></span>
          <button className="btn small" onClick={() => dispatch({ type: 'maximize', panel: null })}>{t("⤡ ย่อกลับ (Esc)")}</button>
        </div>
      )}
      {state.view === 'course' ? (
        <Suspense fallback={<div className="loading" role="status">Loading course…</div>}>
          <CoursePanel />
        </Suspense>
      ) : state.view === 'basics' ? (
        <Suspense fallback={<div className="loading" role="status">Loading course…</div>}>
          <CoursePanel course="basics" />
        </Suspense>
      ) : (
      <main className="main" style={savedSplits()}>
        <aside className="col-left">
          <Palette />
          <Splitter axis="palette" fallback={320} label={t('ปรับส่วนสูงของกล่องอุปกรณ์')} />
          <Inspector />
        </aside>
        <Splitter axis="left" fallback={264} label={t('ปรับความกว้างคอลัมน์ซ้าย')} />
        <section className="col-center">
          <div className="panel-head">
            <span className="panel-title">CIRCUIT CANVAS</span>
            <span className="panel-sub">{state.mode === 'guided' ? 'Guided Lab' : 'Free Circuit Builder'}</span>
            <MaxButton panel="canvas" />
          </div>
          <GuidePanel />
          <CircuitCanvas />
        </section>
        <Splitter axis="right" fallback={600} label={t('ปรับความกว้างคอลัมน์ขวา')} />
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
      <Suspense fallback={null}>
        <Modals />
      </Suspense>
    </div>
  );
};
