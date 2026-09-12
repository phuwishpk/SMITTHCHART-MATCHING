import { jsx as _jsx, jsxs as _jsxs, Fragment } from 'react/jsx-runtime';
import { translateProps } from './runtime';

export const jsx = (type: unknown, props: unknown, key?: unknown): ReturnType<typeof _jsx> =>
  (_jsx as never as (t: unknown, p: unknown, k?: unknown) => ReturnType<typeof _jsx>)(type, translateProps(props), key);
export const jsxs = (type: unknown, props: unknown, key?: unknown): ReturnType<typeof _jsxs> =>
  (_jsxs as never as (t: unknown, p: unknown, k?: unknown) => ReturnType<typeof _jsxs>)(type, translateProps(props), key);
export { Fragment };
export type { JSX } from 'react/jsx-runtime';
