import type { Dispatch } from 'react';
import type { Action, State } from '../state/store';

/**
 * "Explain this circuit": always give visible feedback, even when the panel is
 * already showing step 1 (otherwise the button feels dead).
 */
export const startExplain = (dispatch: Dispatch<Action>, maximized: State['maximized']) => {
  if (maximized) dispatch({ type: 'maximize', panel: null });
  dispatch({ type: 'explain_all', value: false });
  dispatch({ type: 'explain_step', i: 0 });
  requestAnimationFrame(() => {
    const panel = document.getElementById('explain-panel');
    if (!panel) return;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    panel.querySelector('.explain-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    panel.querySelector('.stepper')?.scrollTo({ left: 0, behavior: 'smooth' });
    panel.classList.remove('flash');
    void panel.offsetWidth; // restart the animation
    panel.classList.add('flash');
    window.setTimeout(() => panel.classList.remove('flash'), 1000);
  });
};
