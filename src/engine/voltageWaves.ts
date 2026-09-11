import { Complex } from './complex';

/** Steady-state voltage, incident amplitude = 1. d is distance from the load
 * toward the generator in wavelengths; phase is increasing time in radians.
 * With the load on the right, incident crests move right and reflected crests left.
 */
export const voltageWaveSample = (gamma: Complex, d: number, phase: number) => {
  const distancePhase = 2 * Math.PI * d;
  const incident = Math.cos(phase + distancePhase);
  const reflected = gamma.re * Math.cos(phase - distancePhase)
    - gamma.im * Math.sin(phase - distancePhase);
  // Phasor of the voltage sum: exp(jβd) + Γ_L exp(-jβd).
  const c = Math.cos(distancePhase), s = Math.sin(distancePhase);
  const envelope = Math.hypot(c + gamma.re * c + gamma.im * s, s + gamma.im * c - gamma.re * s);
  return { incident, reflected, total: incident + reflected, envelope };
};
