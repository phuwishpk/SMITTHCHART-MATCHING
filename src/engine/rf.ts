// ---------------------------------------------------------------
// RF Engine: normalization, reflection coefficient, SWR, admittance,
// and Smith-chart coordinate helpers (Γ-plane).
// ---------------------------------------------------------------
import { Complex, C, add, sub, div, abs, arg, inv, isFiniteC, polar } from './complex';

export const normalize = (Z: Complex, Z0: number): Complex =>
  isFiniteC(Z) ? { re: Z.re / Z0, im: Z.im / Z0 } : { re: Infinity, im: 0 };

export const denormalize = (z: Complex, Z0: number): Complex =>
  isFiniteC(z) ? { re: z.re * Z0, im: z.im * Z0 } : { re: Infinity, im: 0 };

/** Γ = (Z − Z0)/(Z + Z0). Infinite Z -> Γ = 1. */
export const gammaFromZ = (Z: Complex, Z0: number): Complex => {
  if (!isFiniteC(Z)) return C(1, 0);
  const num = sub(Z, C(Z0));
  const den = add(Z, C(Z0));
  if (abs(den) < 1e-15) return C(1, 0);
  return div(num, den);
};

/** normalized z -> Γ */
export const gammaFromz = (z: Complex): Complex => gammaFromZ(z, 1);

/** Γ -> normalized z = (1 + Γ)/(1 − Γ). */
export const zFromGamma = (g: Complex): Complex => {
  const den = sub(C(1), g);
  if (abs(den) < 1e-12) return { re: Infinity, im: 0 };
  return div(add(C(1), g), den);
};

export const admittance = (z: Complex): Complex => (isFiniteC(z) ? (abs(z) < 1e-15 ? { re: Infinity, im: 0 } : inv(z)) : C(0, 0));

export const swrFromGamma = (g: Complex): number => {
  const m = Math.min(abs(g), 1);
  if (m >= 1 - 1e-9) return Infinity;
  return (1 + m) / (1 - m);
};

export const returnLossDb = (g: Complex): number => {
  const m = abs(g);
  if (m < 1e-12) return Infinity;
  return -20 * Math.log10(m);
};

export const mismatchLossDb = (g: Complex): number => {
  const m = abs(g);
  const p = 1 - m * m;
  if (p <= 0) return Infinity;
  return -10 * Math.log10(p);
};

/** Fraction of incident power reflected, |Γ|². */
export const reflectedPowerFrac = (g: Complex): number => Math.min(1, abs(g) ** 2);

/**
 * The four quantities printed on a Smith chart's "radially scaled parameters"
 * strip. All of them are functions of |Γ| alone — that is why one compass
 * setting (the distance from the chart centre to the plotted point) reads them
 * all off at once.
 */
export interface ReadOff {
  /** |Γ|, the radius on the chart normalised so the rim is 1 */
  mag: number;
  swr: number;
  /** return loss in dB (∞ for a perfect match) */
  rlDb: number;
  /** reflected power as a percentage of the incident power */
  reflPct: number;
  /** mismatch loss in dB (∞ for total reflection) */
  mismatchDb: number;
}

export const readOff = (g: Complex): ReadOff => ({
  mag: Math.min(abs(g), 1),
  swr: swrFromGamma(g),
  rlDb: returnLossDb(g),
  reflPct: reflectedPowerFrac(g) * 100,
  mismatchDb: mismatchLossDb(g),
});

/* ---- inverse maps: where a printed tick sits on the 0…1 radius ---- */
export const magFromSwr = (swr: number): number => (Number.isFinite(swr) ? (swr - 1) / (swr + 1) : 1);
export const magFromRlDb = (rlDb: number): number => (Number.isFinite(rlDb) ? 10 ** (-rlDb / 20) : 0);
export const magFromReflPct = (pct: number): number => Math.sqrt(Math.max(0, Math.min(100, pct)) / 100);

/**
 * Position on the "wavelengths toward generator" scale (0 … 0.5 λ),
 * measured clockwise from the short-circuit point (Γ = −1).
 */
export const wtgFromGamma = (g: Complex): number => {
  const th = arg(g); // −π … π (math convention, CCW positive)
  let w = (Math.PI - th) / (4 * Math.PI);
  w = ((w % 0.5) + 0.5) % 0.5;
  return w;
};

/** Rotate Γ toward generator by lenLambda wavelengths (clockwise). */
export const rotateTowardGenerator = (g: Complex, lenLambda: number): Complex =>
  polar(abs(g), arg(g) - 4 * Math.PI * lenLambda);

/** Electrical length in radians for a length in wavelengths. */
export const betaL = (lenLambda: number): number => 2 * Math.PI * lenLambda;

/** Frequency-dependent reactances */
export const XL = (f: number, L: number): number => 2 * Math.PI * f * L;
export const XC = (f: number, Cf: number): number => (Cf <= 0 ? -Infinity : -1 / (2 * Math.PI * f * Cf));

/** Input impedance of a line (Z0line, γl) terminated by ZL. Uses the Γ form so open/short work. */
export const lineInput = (ZL: Complex, Z0line: number, lenLambda: number, lossDbTotal = 0): Complex => {
  const gL = gammaFromZ(ZL, Z0line);
  const alphaL = lossDbTotal / 8.685889638; // nepers
  const bl = betaL(lenLambda);
  // Γ_in = Γ_L · e^{−2γl} = Γ_L · e^{−2αl} · e^{−j2βl}
  const gin = polar(abs(gL) * Math.exp(-2 * alphaL), arg(gL) - 2 * bl);
  const zin = zFromGamma(gin);
  return denormalize(zin, Z0line);
};

/** Input impedance of a stub of char. impedance Z0s, length in λ. */
export const stubInput = (kind: 'short' | 'open', Z0s: number, lenLambda: number): Complex => {
  const gEnd = kind === 'short' ? C(-1, 0) : C(1, 0);
  const gin = polar(1, arg(gEnd) - 2 * betaL(lenLambda));
  return denormalize(zFromGamma(gin), Z0s);
};

/** Stub normalized susceptance seen on main line (relative to Y0 = 1/Z0sys). */
export const stubSusceptanceNormalized = (kind: 'short' | 'open', Z0s: number, lenLambda: number, Z0sys: number): number => {
  const bl = betaL(lenLambda);
  // short: y = −j cot(βl) · (Z0sys/Z0s); open: y = +j tan(βl) · (Z0sys/Z0s)
  const ratio = Z0sys / Z0s;
  if (kind === 'short') {
    const t = Math.tan(bl);
    if (Math.abs(t) < 1e-12) return -Infinity;
    return -ratio / t;
  }
  return ratio * Math.tan(bl);
};
