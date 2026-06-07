import { describe, expect, it } from 'vitest';
import { ENGINES, ENGINES_BY_ID } from '../../domain/engines';

function totalImpulseNs(e: (typeof ENGINES)[number]): number {
  return e.avThrust1 * e.burnTime1 + e.avThrust2 * Math.max(0, e.totalBurnTime - e.burnTime1);
}

describe('engine catalog', () => {
  it('every entry resolves through ENGINES_BY_ID', () => {
    for (const e of ENGINES) {
      expect(ENGINES_BY_ID[e.id], `lookup for ${e.id}`).toBe(e);
    }
  });

  it('all hobby classes from 1/2A through F are represented', () => {
    const classes = new Set(ENGINES.map((e) => e.classLetter));
    for (const c of ['1/2A', 'A', 'B', 'C', 'D', 'E', 'F'] as const) {
      expect(classes.has(c), `class ${c}`).toBe(true);
    }
  });

  it('total impulse is positive and class ordering holds monotonically', () => {
    // The original applet's catalog values for thrust were higher than NAR
    // certification numbers, so we don't bind to strict NAR brackets — but
    // higher classes should still produce higher impulse on average.
    const order = ['1/2A', 'A', 'B', 'C', 'D', 'E', 'F'];
    const avgImpulse: Record<string, number> = {};
    for (const cls of order) {
      const motors = ENGINES.filter((e) => e.classLetter === cls);
      const total = motors.reduce((sum, m) => sum + totalImpulseNs(m), 0);
      avgImpulse[cls] = motors.length > 0 ? total / motors.length : 0;
    }
    for (const e of ENGINES) {
      expect(totalImpulseNs(e), `${e.id} total impulse`).toBeGreaterThan(0);
    }
    for (let i = 1; i < order.length; i++) {
      const lower = avgImpulse[order[i - 1]];
      const higher = avgImpulse[order[i]];
      if (lower > 0 && higher > 0) {
        expect(higher, `${order[i]} avg vs ${order[i - 1]}`).toBeGreaterThan(lower);
      }
    }
  });

  it('booster motors all have zero delay time', () => {
    for (const e of ENGINES) {
      if (e.isBooster) {
        expect(e.delayTime, `${e.id} is booster`).toBe(0);
      }
    }
  });
});
