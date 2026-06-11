import { describe, expect, it } from 'vitest';
import { noseConePath } from '../RocketViewer';

describe('noseConePath', () => {
  const args = { leftX: 100, rightX: 120, baseY: 200, tipY: 150 };

  it('cone is a closed triangular path', () => {
    const d = noseConePath('cone', args.leftX, args.rightX, args.baseY, args.tipY);
    expect(d).toContain('M 100 200');
    expect(d).toContain('L 110 150'); // tip at centerX, tipY
    expect(d).toContain('L 120 200');
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  it('ogive uses cubic beziers and starts at the left base', () => {
    const d = noseConePath('ogive', args.leftX, args.rightX, args.baseY, args.tipY);
    expect(d.startsWith('M 100 200')).toBe(true);
    // Two cubic bezier segments and a close.
    expect((d.match(/C /g) || []).length).toBe(2);
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  it('parabolic uses a single quadratic bezier', () => {
    const d = noseConePath('parabolic', args.leftX, args.rightX, args.baseY, args.tipY);
    expect((d.match(/Q /g) || []).length).toBe(1);
  });

  it('elliptical uses an SVG arc with correct semi-axes', () => {
    const d = noseConePath('elliptical', args.leftX, args.rightX, args.baseY, args.tipY);
    // semi-axes: halfWidth = 10, noseLen = 50
    expect(d).toContain('A 10 50 0 0 0 120 200');
  });

  it('all shapes start at left base and close back', () => {
    for (const shape of ['cone', 'ogive', 'parabolic', 'elliptical'] as const) {
      const d = noseConePath(shape, args.leftX, args.rightX, args.baseY, args.tipY);
      expect(d.startsWith(`M ${args.leftX} ${args.baseY}`)).toBe(true);
      expect(d.trim().endsWith('Z')).toBe(true);
    }
  });
});
