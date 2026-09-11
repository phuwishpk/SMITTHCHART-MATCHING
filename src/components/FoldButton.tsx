import React from 'react';
import { useAppState, useDispatch } from '../state/store';

/**
 * Fold a panel away. A folded panel keeps its header — so it can always be unfolded from the same
 * place it was folded — and gives its room to whatever is next to it.
 */
export const FoldButton: React.FC<{ panel: 'palette' | 'inspector' | 'nav' }> = ({ panel }) => {
  const state = useAppState();
  const dispatch = useDispatch();
  const folded = state.collapsed[panel];
  return (
    <button
      className={`chip fold ${folded ? 'on' : ''}`}
      onClick={() => dispatch({ type: 'collapse', panel })}
      title={folded ? 'กางแผงนี้ออก' : 'ย่อแผงนี้เพื่อให้ที่ว่างกับแผงอื่น'}
      aria-expanded={!folded}
    >
      {folded ? '▸ กาง' : '▾ ย่อ'}
    </button>
  );
};
