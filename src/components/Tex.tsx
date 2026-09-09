import React, { useMemo } from 'react';
import katex from 'katex';

export const Tex: React.FC<{ tex: string; block?: boolean; className?: string }> = ({ tex, block = false, className }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: 'ignore', trust: false });
    } catch {
      return tex;
    }
  }, [tex, block]);
  return <span className={`tex ${block ? 'tex-block' : ''} ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
