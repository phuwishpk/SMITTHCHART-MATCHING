import { jsxDEV as _jsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { translateProps } from './runtime';

export const jsxDEV = (type: unknown, props: unknown, key?: unknown, isStatic?: boolean, source?: unknown, self?: unknown): ReturnType<typeof _jsxDEV> =>
  (_jsxDEV as never as (...a: unknown[]) => ReturnType<typeof _jsxDEV>)(type, translateProps(props), key, isStatic, source, self);
export { Fragment };
export type { JSX } from 'react/jsx-dev-runtime';
