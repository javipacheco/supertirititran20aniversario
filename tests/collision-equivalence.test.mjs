import test from "node:test";
import assert from "node:assert/strict";
import * as current from "../src/game/collision.ts";
import * as reference from "./fixtures/collision-reference.ts";
// Frozen pre-optimization implementation is the oracle, including first-contact time.
let seed = 410519;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
function pose() {
  const width = 1 + Math.floor(random() * 12),
    height = 1 + Math.floor(random() * 12);
  const angle = random() * Math.PI * 2,
    sx = 0.15 + random() * 2,
    sy = 0.15 + random() * 2;
  const p = {
    a: Math.cos(angle) * sx,
    b: Math.sin(angle) * sx,
    c: -Math.sin(angle) * sy,
    d: Math.cos(angle) * sy,
    tx: random() * 40,
    ty: random() * 40,
    originX: random() * width,
    originY: random() * height,
    flipX: random() < 0.5,
    flipY: random() < 0.5,
    mask: {
      width,
      height,
      alpha: Uint8Array.from({ length: width * height }, () =>
        random() < 0.3 ? 255 : 0,
      ),
      opaque: { x: 0, y: 0, width, height },
    },
  };
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => [
    p.a * (x - p.originX) + p.c * (y - p.originY) + p.tx,
    p.b * (x - p.originX) + p.d * (y - p.originY) + p.ty,
  ]);
  const xs = corners.map((c) => c[0]),
    ys = corners.map((c) => c[1]);
  p.bounds = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
  return p;
}
const previous = (p, dx, dy) => ({ ...p, tx: p.tx - dx, ty: p.ty - dy });
test("Equivalencia exacta de contactos y recogidas en 10.000 poses con transparencias, rotación, escala y volteo", () => {
  for (let i = 0; i < 10000; i++) {
    const a = pose(),
      b = pose();
    const pa =
      i % 3 === 0
        ? undefined
        : previous(a, (random() - 0.5) * 120, (random() - 0.5) * 120);
    const pb =
      i % 4 === 0
        ? undefined
        : previous(b, (random() - 0.5) * 120, (random() - 0.5) * 120);
    assert.equal(
      current.spriteContact(a, b, pa, pb),
      reference.spriteContact(a, b, pa, pb),
      `contact ${i}`,
    );
    assert.equal(
      current.pickupContact(a, b, pa, pb),
      reference.pickupContact(a, b, pa, pb),
      `pickup ${i}`,
    );
  }
});
test("Conserva matrices degeneradas, bordes exactos, movimiento paralelo y contacto inicial", () => {
  for (const scale of [0, 1e-7, 1e-6, 0.5, 1, 2])
    for (const shift of [0, 0.5, 1, 8, 40]) {
      const a = pose(),
        b = pose();
      a.a = a.d = scale;
      a.b = a.c = 0;
      b.tx = a.tx + shift;
      b.ty = a.ty;
      for (const delta of [0, 1, 80]) {
        const pa = previous(a, delta, 0),
          pb = previous(b, delta, 0);
        assert.equal(
          current.spriteContact(a, b, pa, pb),
          reference.spriteContact(a, b, pa, pb),
        );
      }
    }
});
