import React from 'react';
import { PanelId, useAppState, useDispatch } from '../state/store';

/** Expand / restore toggle shown in every panel header. */
export const MaxButton: React.FC<{ panel: PanelId }> = ({ panel }) => {
  const state = useAppState();
  const dispatch = useDispatch();
  const isMax = state.maximized === panel;
  return (
    <button
      className={`chip max ${isMax ? 'on' : ''}`}
      onClick={() => dispatch({ type: 'maximize', panel: isMax ? null : panel })}
      title={isMax ? 'ย่อกลับ (Esc)' : 'ขยายแผงนี้เต็มจอ'}
      aria-label={isMax ? 'ย่อกลับ' : 'ขยาย'}
    >
      {isMax ? '⤡ ย่อกลับ' : '⤢ ขยาย'}
    </button>
  );
};
