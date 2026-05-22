import { describe, expect, it } from 'vitest';
import { computeStageCg } from '../cg';
import { DEFAULT_ROCKET } from '../../domain/defaults';

describe('computeCg (default rocket)', () => {
  it('produces a CG within the body tube', () => {
    const { cg, totalMassG } = computeStageCg(DEFAULT_ROCKET, 1);
    expect(cg).toBeGreaterThan(0);
    expect(cg).toBeLessThan(DEFAULT_ROCKET.body.length + DEFAULT_ROCKET.noseCone.length);
    expect(totalMassG).toBeGreaterThan(DEFAULT_ROCKET.recoveryPayloadMass);
  });

  it('CG shifts forward (toward nose) when more payload mass added at top', () => {
    const baseline = computeStageCg(DEFAULT_ROCKET, 1).cg;
    const heavier = computeStageCg(
      { ...DEFAULT_ROCKET, recoveryPayloadMass: DEFAULT_ROCKET.recoveryPayloadMass + 200 },
      1,
    ).cg;
    // payload sits at top of body tube — higher CG = closer to nose
    expect(heavier).toBeGreaterThan(baseline);
  });

  it('total mass scales with body length', () => {
    const m1 = computeStageCg(DEFAULT_ROCKET, 1).totalMassG;
    const m2 = computeStageCg(
      { ...DEFAULT_ROCKET, body: { ...DEFAULT_ROCKET.body, length: DEFAULT_ROCKET.body.length * 2 } },
      1,
    ).totalMassG;
    expect(m2).toBeGreaterThan(m1);
  });
});
