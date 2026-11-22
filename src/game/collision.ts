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
/** Entry/exit for two translating rectangles, including horizontal and diagonal travel. */
export function sweepInterval(
  a: Rect,
  b: Rect,
  dx: number,
  dy: number,
): [number, number] | null {
  return sweepBounds(
    a.x,
    a.y,
    a.width,
    a.height,
    b.x,
    b.y,
    b.width,
    b.height,
    dx,
    dy,
  );
}
// Scalar bounds avoid allocating translated rectangles and per-axis arrays per pair.
function sweepBounds(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  dx: number,
  dy: number,
): [number, number] | null {
  let xEnter = -Infinity,
    xExit = Infinity,
    yEnter = -Infinity,
    yExit = Infinity;
  if (dx === 0) {
    if (ax + aw < bx || ax > bx + bw) return null;
  } else {
    const t0 = (bx - ax - aw) / dx,
      t1 = (bx + bw - ax) / dx;
    xEnter = Math.min(t0, t1);
    xExit = Math.max(t0, t1);
  }
  if (dy === 0) {
    if (ay + ah < by || ay > by + bh) return null;
  } else {
    const t0 = (by - ay - ah) / dy,
      t1 = (by + bh - ay) / dy;
    yEnter = Math.min(t0, t1);
    yExit = Math.max(t0, t1);
  }
  const enter = Math.max(0, xEnter, yEnter),
    exit = Math.min(1, xExit, yExit);
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
  det: number,
) {
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
  detA: number,
  detB: number,
  step: number,
) {
  const arx = a.bounds.x + ax,
    ary = a.bounds.y + ay,
    brx = b.bounds.x + bx,
    bry = b.bounds.y + by;
  const left = Math.max(arx, brx),
    right = Math.min(arx + a.bounds.width, brx + b.bounds.width),
    top = Math.max(ary, bry),
    bottom = Math.min(ary + a.bounds.height, bry + b.bounds.height);
  if (left >= right || top >= bottom) return false;
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
      if (solid(a, x, y, ax, ay, detA) && solid(b, x, y, bx, by, detB))
        return true;
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
  const interval = sweepBounds(
    a.bounds.x - adx,
    a.bounds.y - ady,
    a.bounds.width,
    a.bounds.height,
    b.bounds.x - bdx,
    b.bounds.y - bdy,
    b.bounds.width,
    b.bounds.height,
    adx - bdx,
    ady - bdy,
  );
  if (!interval) return null;
  const detA = a.a * a.d - a.b * a.c,
    detB = b.a * b.d - b.b * b.c;
  if (Math.abs(detA) < 1e-12 || Math.abs(detB) < 1e-12) return null;
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
  // Keep divisions in solid() in their original order to preserve pixel boundaries.
  if (adx === 0 && ady === 0 && bdx === 0 && bdy === 0)
    return overlapAt(a, b, 0, 0, 0, 0, detA, detB, step) ? 0 : null;
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
        detA,
        detB,
        step,
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
    sweepBounds(
      ar.x - adx,
      ar.y - ady,
      ar.width,
      ar.height,
      br.x - bdx,
      br.y - bdy,
      br.width,
      br.height,
      adx - bdx,
      ady - bdy,
    ) !== null
  );
}
