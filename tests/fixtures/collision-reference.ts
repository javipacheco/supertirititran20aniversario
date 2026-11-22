// Frozen algorithm before the 16/11/2026 optimization, used only as a test oracle.
export type Rect = { x: number; y: number; width: number; height: number };
export type AlphaMask = {
  width: number;
  height: number;
  alpha: Uint8Array;
  opaque: Rect;
};
export type SpritePose = {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
  originX: number;
  originY: number;
  flipX: boolean;
  flipY: boolean;
  bounds: Rect;
  mask: AlphaMask;
};
const moved = (r: Rect, x: number, y: number): Rect => ({
  ...r,
  x: r.x + x,
  y: r.y + y,
});
/** Entry/exit for two translating rectangles, including horizontal and diagonal travel. */
export function sweepInterval(
  a: Rect,
  b: Rect,
  dx: number,
  dy: number,
): [number, number] | null {
  const axis = (
    lo: number,
    size: number,
    target: number,
    targetSize: number,
    v: number,
  ): [number, number] => {
    if (v === 0)
      return lo + size < target || lo > target + targetSize
        ? [Infinity, -Infinity]
        : [-Infinity, Infinity];
    const t0 = (target - lo - size) / v,
      t1 = (target + targetSize - lo) / v;
    return [Math.min(t0, t1), Math.max(t0, t1)];
  };
  const x = axis(a.x, a.width, b.x, b.width, dx),
    y = axis(a.y, a.height, b.y, b.height, dy);
  const enter = Math.max(0, x[0], y[0]),
    exit = Math.min(1, x[1], y[1]);
  return enter <= exit ? [enter, exit] : null;
}
function transformedBounds(p: SpritePose, r: Rect): Rect {
  r = { ...r };
  if (p.flipX) r.x = p.mask.width - r.x - r.width;
  if (p.flipY) r.y = p.mask.height - r.y - r.height;
  const points = [
    [r.x, r.y],
    [r.x + r.width, r.y],
    [r.x, r.y + r.height],
    [r.x + r.width, r.y + r.height],
  ].map(([x, y]) => {
    x -= p.originX;
    y -= p.originY;
    return [p.a * x + p.c * y + p.tx, p.b * x + p.d * y + p.ty];
  });
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}
function solid(
  p: SpritePose,
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
) {
  const det = p.a * p.d - p.b * p.c;
  if (Math.abs(det) < 1e-12) return false;
  x -= p.tx + offsetX;
  y -= p.ty + offsetY;
  let u = Math.floor((p.d * x - p.c * y) / det + p.originX),
    v = Math.floor((-p.b * x + p.a * y) / det + p.originY);
  if (p.flipX) u = p.mask.width - 1 - u;
  if (p.flipY) v = p.mask.height - 1 - v;
  return (
    u >= 0 &&
    v >= 0 &&
    u < p.mask.width &&
    v < p.mask.height &&
    p.mask.alpha[v * p.mask.width + u] > 0
  );
}
function overlapAt(
  a: SpritePose,
  b: SpritePose,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const ar = moved(a.bounds, ax, ay),
    br = moved(b.bounds, bx, by);
  const left = Math.max(ar.x, br.x),
    right = Math.min(ar.x + ar.width, br.x + br.width),
    top = Math.max(ar.y, br.y),
    bottom = Math.min(ar.y + ar.height, br.y + br.height);
  if (left >= right || top >= bottom) return false;
  // Sample pixel centers in world space. Small scaled sprites still get a sample.
  const step = Math.max(
    0.1,
    Math.min(
      0.5,
      Math.hypot(a.a, a.b) * 0.5,
      Math.hypot(a.c, a.d) * 0.5,
      Math.hypot(b.a, b.b) * 0.5,
      Math.hypot(b.c, b.d) * 0.5,
    ),
  );
  for (
    let y = top + Math.min(step / 2, (bottom - top) / 2);
    y < bottom;
    y += step
  )
    for (
      let x = left + Math.min(step / 2, (right - left) / 2);
      x < right;
      x += step
    )
      if (solid(a, x, y, ax, ay) && solid(b, x, y, bx, by)) return true;
  return false;
}
/** Follow the complete relative path; use masks so transparent corners do not hurt. */
export function spriteContact(
  a: SpritePose,
  b: SpritePose,
  previousA?: SpritePose,
  previousB?: SpritePose,
): number | null {
  const adx = a.tx - (previousA?.tx ?? a.tx),
    ady = a.ty - (previousA?.ty ?? a.ty),
    bdx = b.tx - (previousB?.tx ?? b.tx),
    bdy = b.ty - (previousB?.ty ?? b.ty);
  const interval = sweepInterval(
    moved(a.bounds, -adx, -ady),
    moved(b.bounds, -bdx, -bdy),
    adx - bdx,
    ady - bdy,
  );
  if (!interval) return null;
  const [enter, exit] = interval;
  const steps = Math.max(
    1,
    Math.ceil(
      (Math.max(Math.abs(adx - bdx), Math.abs(ady - bdy)) * (exit - enter)) /
        0.5,
    ),
  );
  for (let i = 0; i <= steps; i++) {
    const t = enter + ((exit - enter) * i) / steps;
    if (
      overlapAt(
        a,
        b,
        -adx * (1 - t),
        -ady * (1 - t),
        -bdx * (1 - t),
        -bdy * (1 - t),
      )
    )
      return t;
  }
  return null;
}
/** Pickups use forgiving visible bounds rather than a tiny center-distance circle. */
export function pickupContact(
  a: SpritePose,
  b: SpritePose,
  previousA?: SpritePose,
  previousB?: SpritePose,
): boolean {
  if (
    !a.mask.opaque.width ||
    !a.mask.opaque.height ||
    !b.mask.opaque.width ||
    !b.mask.opaque.height
  )
    return false;
  const ar = transformedBounds(a, a.mask.opaque),
    br = transformedBounds(b, b.mask.opaque);
  ar.x -= 1;
  ar.y -= 1;
  ar.width += 2;
  ar.height += 2;
  const adx = a.tx - (previousA?.tx ?? a.tx),
    ady = a.ty - (previousA?.ty ?? a.ty),
    bdx = b.tx - (previousB?.tx ?? b.tx),
    bdy = b.ty - (previousB?.ty ?? b.ty);
  return (
    sweepInterval(
      moved(ar, -adx, -ady),
      moved(br, -bdx, -bdy),
      adx - bdx,
      ady - bdy,
    ) !== null
  );
}
