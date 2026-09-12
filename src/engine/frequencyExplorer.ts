import { C } from './complex';
import { admittance, gammaFromz, lineInput, normalize, stubInput, swrFromGamma } from './rf';
import { solveSingleStub } from './matching';

const load710 = C(200, 0);
const stub710 = solveSingleStub(load710, 300, 'short')[0];
export const FREQUENCY_EXAMPLES = {
  ex78: { name: 'Example 7-8', load: C(450, -600), d0: 0.130, l0: 0.085 },
  ex710: { name: 'Example 7-10', load: load710, d0: stub710.dLambda, l0: stub710.lLambda },
};
export type FrequencyExample = keyof typeof FREQUENCY_EXAMPLES;
export const FREQUENCY_MIN = 8;
export const FREQUENCY_MAX = 14;

/** Same ideal, fixed-load model and rounded Example 7-8 lengths as chapter 10.
 * v = 3e8 m/s follows the textbook's 30 m wavelength at 10 MHz. */
export function frequencySample(example: FrequencyExample, mhz: number) {
  const design = FREQUENCY_EXAMPLES[example];
  const wavelength = 300 / mhz;
  const d = design.d0 * mhz / 10;
  const ls = design.l0 * mhz / 10;
  const zLine = normalize(lineInput(design.load, 300, d, 0), 300);
  const yLine = admittance(zLine);
  const yStub = admittance(normalize(stubInput('short', 300, ls), 300));
  const yTotal = C(yLine.re + yStub.re, yLine.im + yStub.im);
  const zTotal = admittance(yTotal);
  const gamma = gammaFromz(zTotal);
  return { mhz, wavelength, d, ls, zLine, yLine, yStub, yTotal, zTotal, gamma,
    swr: swrFromGamma(gamma), reflectedPercent: (gamma.re ** 2 + gamma.im ** 2) * 100 };
}

/** Connected passband containing the design frequency, with refined crossings.
 * A clipped boundary is only the edge of our sweep, not an SWR crossing. */
export function frequencyBand(example: FrequencyExample, limit: number) {
  const samples = Array.from({ length: 601 }, (_, i) => frequencySample(example, 8 + i / 100));
  let low = 200, high = 200;
  while (low > 0 && samples[low - 1].swr <= limit) low--;
  while (high < 600 && samples[high + 1].swr <= limit) high++;
  const crossing = (outside: number, inside: number) => {
    for (let i = 0; i < 35; i++) {
      const middle = (inside + outside) / 2;
      if (frequencySample(example, middle).swr <= limit) inside = middle;
      else outside = middle;
    }
    return (inside + outside) / 2;
  };
  return {
    low: low === 0 ? 8 : crossing(samples[low - 1].mhz, samples[low].mhz),
    high: high === 600 ? 14 : crossing(samples[high + 1].mhz, samples[high].mhz),
    lowClipped: low === 0, highClipped: high === 600,
  };
}
