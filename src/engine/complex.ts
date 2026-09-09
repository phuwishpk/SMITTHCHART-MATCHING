// ---------------------------------------------------------------
// Complex arithmetic helpers (plain objects, no classes)
// ---------------------------------------------------------------
export interface Complex {
  re: number;
  im: number;
}

export const C = (re: number, im = 0): Complex => ({ re, im });
export const ZERO: Complex = { re: 0, im: 0 };
export const ONE: Complex = { re: 1, im: 0 };

export const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const sub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
export const mul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const scale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k });
export const div = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) {
    // division by zero -> "infinite" impedance representation
    return { re: Infinity, im: 0 };
  }
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
};
export const inv = (a: Complex): Complex => {
  if (!isFinite(a.re) || !isFinite(a.im)) return { re: 0, im: 0 };
  return div(ONE, a);
};
export const abs = (a: Complex): number => Math.hypot(a.re, a.im);
export const arg = (a: Complex): number => Math.atan2(a.im, a.re);
export const conj = (a: Complex): Complex => ({ re: a.re, im: -a.im });
export const polar = (r: number, theta: number): Complex => ({ re: r * Math.cos(theta), im: r * Math.sin(theta) });
export const isFiniteC = (a: Complex): boolean => Number.isFinite(a.re) && Number.isFinite(a.im);
export const approxEq = (a: Complex, b: Complex, tol = 1e-6): boolean =>
  Math.abs(a.re - b.re) < tol && Math.abs(a.im - b.im) < tol;

/** complex hyperbolic tangent: tanh(a + jb) */
export const tanh = (z: Complex): Complex => {
  const { re: a, im: b } = z;
  const denom = Math.cosh(2 * a) + Math.cos(2 * b);
  if (Math.abs(denom) < 1e-15) return { re: Infinity, im: 0 };
  return { re: Math.sinh(2 * a) / denom, im: Math.sin(2 * b) / denom };
};

export const deg = (rad: number): number => (rad * 180) / Math.PI;
export const rad = (d: number): number => (d * Math.PI) / 180;

/** Format complex as "a ± jb" with fixed digits. */
export const fmtC = (z: Complex, digits = 2, unit = ''): string => {
  if (!isFiniteC(z)) return '∞';
  const re = fmtNum(z.re, digits);
  const im = fmtNum(Math.abs(z.im), digits);
  const sign = z.im < 0 ? '−' : '+';
  return `${re} ${sign} j${im}${unit ? ' ' + unit : ''}`;
};

/** Format number, trimming trailing zeros. */
export const fmtNum = (x: number, digits = 2): string => {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'NaN';
  if (Math.abs(x) < 1e-4) return '0'; // numerically-zero residues (e.g. 5e-5 after matching) read as 0
  const a = Math.abs(x);
  let s: string;
  if (a >= 1e5 || a < 1e-3) s = x.toExponential(digits);
  else s = x.toFixed(digits);
  if (s.includes('.') && !s.includes('e')) s = s.replace(/\.?0+$/, '');
  return s.replace('-', '−');
};

/** Engineering formatting with SI prefix, e.g. 39.8e-9 -> "39.8 nH". */
export const fmtEng = (x: number, unit = '', digits = 3): string => {
  if (!Number.isFinite(x)) return '∞' + (unit ? ' ' + unit : '');
  if (x === 0) return '0' + (unit ? ' ' + unit : '');
  const prefixes: [number, string][] = [
    [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f'],
  ];
  const a = Math.abs(x);
  for (const [scaleV, p] of prefixes) {
    if (a >= scaleV * 0.9999) {
      const v = x / scaleV;
      const s = Number(v.toPrecision(digits)).toString().replace('-', '−');
      return `${s} ${p}${unit}`.trim();
    }
  }
  return `${x.toExponential(2)} ${unit}`.trim();
};
