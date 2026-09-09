// ---------------------------------------------------------------
// Smith Chart Engine: chart geometry in the Γ-plane.
// Coordinates: unit circle, Γ.re to the right, Γ.im up.
// ---------------------------------------------------------------
import { Complex } from './complex';

export interface ChartCircle {
  /** center in Γ-plane */
  cx: number;
  cy: number;
  r: number;
  value: number;
  family: 'r' | 'x' | 'g' | 'b';
}

/** constant resistance circle r */
export const rCircle = (r: number): ChartCircle => ({ cx: r / (1 + r), cy: 0, r: 1 / (1 + r), value: r, family: 'r' });
/** constant reactance circle x (x ≠ 0) */
export const xCircle = (x: number): ChartCircle => ({ cx: 1, cy: 1 / x, r: 1 / Math.abs(x), value: x, family: 'x' });
/** constant conductance circle g */
export const gCircle = (g: number): ChartCircle => ({ cx: -g / (1 + g), cy: 0, r: 1 / (1 + g), value: g, family: 'g' });
/** constant susceptance circle b (b ≠ 0) */
export const bCircle = (b: number): ChartCircle => ({ cx: -1, cy: -1 / b, r: 1 / Math.abs(b), value: b, family: 'b' });

export const R_VALUES_MAJOR = [0.2, 0.5, 1, 2, 5];
export const R_VALUES_MINOR = [0.1, 0.3, 0.4, 0.6, 0.8, 1.5, 3, 4, 10];
export const X_VALUES_MAJOR = [0.2, 0.5, 1, 2, 5];
export const X_VALUES_MINOR = [0.1, 0.3, 0.4, 0.6, 0.8, 1.5, 3, 4, 10];

/** map Γ to SVG coordinates for a chart of radius R centered at (cx, cy). */
export const toSvg = (g: Complex, cx: number, cy: number, R: number): { x: number; y: number } => ({
  x: cx + R * g.re,
  y: cy - R * g.im,
});

export const fromSvg = (x: number, y: number, cx: number, cy: number, R: number): Complex => ({
  re: (x - cx) / R,
  im: -(y - cy) / R,
});

/** Build an SVG polyline "points" string from a Γ path. */
export const pathToPoints = (path: Complex[], cx: number, cy: number, R: number): string =>
  path
    .filter((g) => Number.isFinite(g.re) && Number.isFinite(g.im))
    .map((g) => {
      const p = toSvg(g, cx, cy, R);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

/** Wavelength-scale ticks: angle (radians, math convention) for a wtg value in [0,0.5). */
export const angleForWtg = (wtg: number): number => Math.PI - 4 * Math.PI * wtg;
