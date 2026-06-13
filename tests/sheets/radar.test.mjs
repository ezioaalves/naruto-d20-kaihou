// tests/sheets/radar.test.mjs
import { describe, it, expect } from "vitest";
import { axisPoints, valuePoints, pointsAttr } from "../../scripts/sheets/radar.mjs";

describe("axisPoints", () => {
  it("places the first axis at top and spaces the rest evenly", () => {
    const p = axisPoints(4, 100, 100, 70); // square: top, right, bottom, left
    expect(p[0]).toEqual({ x: 100, y: 30 });
    expect(p[1].x).toBeCloseTo(170);
    expect(p[1].y).toBeCloseTo(100);
    expect(p[2]).toMatchObject({ x: expect.closeTo(100, 5), y: expect.closeTo(170, 5) });
  });
});

describe("valuePoints", () => {
  it("scales value/max to radius and clamps out-of-range to the rim/centre", () => {
    const [full, over, zero] = valuePoints([5, 99, 0], 5, 100, 100, 70);
    expect(full).toEqual({ x: 100, y: 30 });           // 5/5 → full radius (top)
    expect(over.x).toBeCloseTo(100 + 70 * Math.cos(Math.PI / 6), 0.1);  // index 1 at 30°, clamped to max radius
    expect(over.y).toBeCloseTo(100 + 70 * Math.sin(Math.PI / 6), 0.1);  // = ~135
    expect(zero).toMatchObject({ x: expect.closeTo(100, 5), y: expect.closeTo(100, 5) }); // 0 → centre
  });

  it("treats NaN / non-numeric as 0 (centre), never NaN coords", () => {
    const [p] = valuePoints([NaN], 5, 100, 100, 70);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(p).toMatchObject({ x: 100, y: 100 });
  });

  it("returns centre for all axes when max is 0", () => {
    const pts = valuePoints([3, 4], 0, 100, 100, 70);
    expect(pts.every((p) => p.x === 100 && p.y === 100)).toBe(true);
  });
});

describe("pointsAttr", () => {
  it("formats an SVG points string, rounded to 2dp", () => {
    expect(pointsAttr([{ x: 1.234, y: 5.678 }, { x: 9, y: 10 }])).toBe("1.23,5.68 9,10");
  });
});
