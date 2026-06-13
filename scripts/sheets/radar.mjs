// scripts/sheets/radar.mjs
//
// Pure radar-polygon geometry. No Foundry globals — unit-tested in node.
// Axis 0 sits at the top (-90°); axes advance clockwise, evenly spaced.

function pointAt(angleDeg, radius, cx, cy) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
}

/** N evenly-spaced points on the rim (for grid outlines / axis ends). */
export function axisPoints(count, cx, cy, r, startAngleDeg = -90) {
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) => pointAt(startAngleDeg + i * step, r, cx, cy));
}

/** One point per value, radius scaled by clamp(value,0,max)/max. */
export function valuePoints(values, max, cx, cy, r, startAngleDeg = -90) {
  const step = 360 / values.length;
  return values.map((v, i) => {
    const n = Number(v);
    const safe = Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
    const radius = max > 0 ? (safe / max) * r : 0;
    return pointAt(startAngleDeg + i * step, radius, cx, cy);
  });
}

const round2 = (n) => Math.round(n * 100) / 100;

/** "x,y x,y …" for an SVG <polygon points>. */
export function pointsAttr(points) {
  return points.map((p) => `${round2(p.x)},${round2(p.y)}`).join(" ");
}
