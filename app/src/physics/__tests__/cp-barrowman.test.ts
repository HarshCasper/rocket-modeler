import { describe, expect, it } from 'vitest';
import { computeCp, computeCpForRocket } from '../cp-barrowman';
import { DEFAULT_ROCKET } from '../../domain/defaults';

describe('Barrowman CP', () => {
  it('nose cone alone has CP at L/3 from base (2/3 from tip)', () => {
    const r = computeCp({
      bodyLength: 0.0001,
      bodyDiameter: 2.5,
      noseLength: 9,
      finLength: 0.0001,
      finWidth: 0.0001,
      finHeight: 0,
      finCount: 0,
    });
    // CP from nose tip should be ~ (2/3) * 9 = 6
    expect(r.cpFromNose).toBeCloseTo(6, 1);
  });

  it('default rocket has CP behind CG (stable design)', () => {
    const cp = computeCpForRocket(DEFAULT_ROCKET).cp;
    // CP must be lower than CG for stability — and the default rocket is stable.
    expect(cp).toBeLessThan(20);
    expect(cp).toBeGreaterThan(0);
  });

  it('adding more fin area moves CP rearward (toward base, lower cp value)', () => {
    const baseline = computeCpForRocket(DEFAULT_ROCKET).cp;
    const bigger = computeCpForRocket({
      ...DEFAULT_ROCKET,
      fins: { ...DEFAULT_ROCKET.fins, width: DEFAULT_ROCKET.fins.width * 1.5 },
    }).cp;
    // larger fins -> CP closer to base -> smaller cp number (cm from bottom)
    expect(bigger).toBeLessThan(baseline);
  });

  it('Cnα of nose cone equals 2', () => {
    const r = computeCpForRocket(DEFAULT_ROCKET);
    expect(r.cnaNose).toBe(2);
  });

  it('body-fin interference factor pushes total Cnα above the bare-fin value', () => {
    // K_fb = 1 + R/(s+R) > 1, so with body present, fin contribution should be
    // larger than fin contribution computed as if R=0 (no body).
    const withBody = computeCp({
      bodyLength: 30,
      bodyDiameter: 2.5,
      noseLength: 8,
      finLength: 10,
      finWidth: 4,
      finHeight: 0,
      finCount: 4,
    });
    const noBody = computeCp({
      bodyLength: 30,
      bodyDiameter: 0.001, // effectively zero
      noseLength: 8,
      finLength: 10,
      finWidth: 4,
      finHeight: 0,
      finCount: 4,
    });
    expect(withBody.cnaFins).toBeGreaterThan(noBody.cnaFins);
  });
});
