import { describe, expect, it } from 'vitest';
import { runFullFlight, apogee, peakSpeed } from '../simulate';
import { DEFAULT_ROCKET, DEFAULT_FLIGHT_CONFIG } from '../../domain/defaults';

describe('flight integrator', () => {
  it('default rocket (A8-3, vertical launch) reaches a plausible apogee', () => {
    const samples = runFullFlight(DEFAULT_ROCKET, DEFAULT_FLIGHT_CONFIG);
    const a = apogee(samples);
    // A8-3 on a small Alpha-style rocket peaks somewhere in ~30-120 m. We just
    // want to know it left the pad and reached something realistic.
    expect(a).toBeGreaterThan(30);
    expect(a).toBeLessThan(250);
  });

  it('peak velocity is positive and finite', () => {
    const samples = runFullFlight(DEFAULT_ROCKET, DEFAULT_FLIGHT_CONFIG);
    const v = peakSpeed(samples);
    expect(v).toBeGreaterThan(10);
    expect(v).toBeLessThan(200);
  });

  it('rocket lands (alt comes back to 0)', () => {
    const samples = runFullFlight(DEFAULT_ROCKET, DEFAULT_FLIGHT_CONFIG);
    const last = samples[samples.length - 1];
    expect(last.altitude).toBeLessThanOrEqual(0.5);
    expect(['landed', 'crashed']).toContain(last.phase);
  });

  it('a two stage rocket shows different stability margin before and after stage drop', () => {
    const twoStage = {
      ...DEFAULT_ROCKET,
      numStages: 2 as const,
      engineIds: ['B6-0', 'A8-3'] as [string, string],
    };
    const samples = runFullFlight(twoStage, DEFAULT_FLIGHT_CONFIG);
    const earlyBoost = samples.find((s) => s.phase === 'boost' && s.activeStage === 0);
    const afterDrop = samples.find((s) => s.phase === 'boost' && s.activeStage === 1);
    if (!earlyBoost || !afterDrop) throw new Error('expected to find both stages');
    // Margin is recomputed when the booster drops — values should differ
    // meaningfully (more than rounding noise).
    expect(Math.abs(earlyBoost.marginCal - afterDrop.marginCal)).toBeGreaterThan(0.1);
    // Each sample should also expose a sensible cg and cp.
    expect(earlyBoost.cg).toBeGreaterThan(0);
    expect(earlyBoost.cp).toBeGreaterThan(0);
  });

  it('rocket clears the launch rod at a hobby-realistic speed', () => {
    const samples = runFullFlight(DEFAULT_ROCKET, DEFAULT_FLIGHT_CONFIG);
    const rodClear = samples.find((s) => !s.onRod && s.phase === 'boost');
    expect(rodClear).toBeDefined();
    if (rodClear) {
      // 1/2A through C class hobby motors clear a 110 cm rod at roughly
      // 8–40 m/s depending on mass and class.
      expect(rodClear.speed).toBeGreaterThan(8);
      expect(rodClear.speed).toBeLessThan(40);
    }
  });

  it('positive wind drifts the rocket downwind by landing', () => {
    const calm = runFullFlight(DEFAULT_ROCKET, DEFAULT_FLIGHT_CONFIG);
    const windy = runFullFlight(DEFAULT_ROCKET, { ...DEFAULT_FLIGHT_CONFIG, windSpeed: 5 });
    const calmLast = calm[calm.length - 1];
    const windyLast = windy[windy.length - 1];
    // Calm vertical launch lands within a meter or so of the pad.
    expect(Math.abs(calmLast.xDistance)).toBeLessThan(2);
    // Steady wind carries the parachute and weathercocks ascent downwind.
    expect(windyLast.xDistance).toBeGreaterThan(calmLast.xDistance + 5);
  });
});
