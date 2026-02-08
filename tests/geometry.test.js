import { describe, it, expect } from 'vitest';
import { convexHull, expandHull } from '../src/js/core/geometry.js';

describe('convexHull', () => {
  it('returns the input when fewer than 3 points', () => {
    expect(convexHull([])).toEqual([]);
    expect(convexHull([{ x: 0, y: 0 }])).toEqual([{ x: 0, y: 0 }]);
    expect(convexHull([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it('computes hull of a simple triangle', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 3 },
    ];
    const hull = convexHull(points);
    expect(hull).toHaveLength(3);
    // All 3 points should be on the hull
    for (const p of points) {
      expect(hull).toContainEqual(p);
    }
  });

  it('excludes interior points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 }, // interior point
    ];
    const hull = convexHull(points);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ x: 2, y: 2 });
  });

  it('handles collinear points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 1, y: 1 },
    ];
    const hull = convexHull(points);
    // Collinear bottom points: endpoints should be on hull, middle may or may not
    // At minimum the triangle {0,0}, {3,0}, {1,1} should be present
    expect(hull.length).toBeGreaterThanOrEqual(3);
    expect(hull).toContainEqual({ x: 0, y: 0 });
    expect(hull).toContainEqual({ x: 3, y: 0 });
    expect(hull).toContainEqual({ x: 1, y: 1 });
  });

  it('handles duplicate points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    const hull = convexHull(points);
    expect(hull.length).toBeGreaterThanOrEqual(3);
  });

  it('does not mutate the input array', () => {
    const points = [
      { x: 3, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 2 },
    ];
    const original = points.map(p => ({ ...p }));
    convexHull(points);
    expect(points).toEqual(original);
  });

  it('returns hull in correct winding order for a square', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const hull = convexHull(points);
    expect(hull).toHaveLength(4);
    // First point should be leftmost (sorted by x then y)
    expect(hull[0]).toEqual({ x: 0, y: 0 });
  });
});

describe('expandHull', () => {
  it('expands hull outward from centroid', () => {
    const hull = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const expanded = expandHull(hull, 5);

    expect(expanded).toHaveLength(4);
    // Each point should be farther from centroid (5, 5)
    const cx = 5, cy = 5;
    for (let i = 0; i < hull.length; i++) {
      const origDist = Math.sqrt((hull[i].x - cx) ** 2 + (hull[i].y - cy) ** 2);
      const newDist = Math.sqrt((expanded[i].x - cx) ** 2 + (expanded[i].y - cy) ** 2);
      expect(newDist).toBeGreaterThan(origDist);
    }
  });

  it('contracts hull with negative padding', () => {
    const hull = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const contracted = expandHull(hull, -2);
    const cx = 5, cy = 5;
    for (let i = 0; i < hull.length; i++) {
      const origDist = Math.sqrt((hull[i].x - cx) ** 2 + (hull[i].y - cy) ** 2);
      const newDist = Math.sqrt((contracted[i].x - cx) ** 2 + (contracted[i].y - cy) ** 2);
      expect(newDist).toBeLessThan(origDist);
    }
  });

  it('returns same shape with zero padding', () => {
    const hull = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 8 },
    ];
    const result = expandHull(hull, 0);
    for (let i = 0; i < hull.length; i++) {
      expect(result[i].x).toBeCloseTo(hull[i].x);
      expect(result[i].y).toBeCloseTo(hull[i].y);
    }
  });
});
