import test from "node:test";
import assert from "node:assert/strict";
import {
  spriteContact,
  pickupContact,
  sweepInterval,
} from "../src/game/collision.ts";
const pose = (x, y, w = 8, h = 8, alpha) => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  tx: x,
  ty: y,
  originX: 0,
  originY: 0,
  flipX: false,
  flipY: false,
  bounds: { x, y, width: w, height: h },
  mask: {
    width: w,
    height: h,
    alpha: alpha ?? new Uint8Array(w * h).fill(255),
    opaque: { x: 0, y: 0, width: w, height: h },
  },
});
test("Trayecto horizontal y diagonal aunque los extremos no se solapen", () => {
  assert.notEqual(spriteContact(pose(100, 0), pose(48, 0), pose(0, 0)), null);
  assert.notEqual(
    spriteContact(pose(100, 100), pose(48, 48), pose(0, 0)),
    null,
  );
  assert.equal(spriteContact(pose(100, 0), pose(48, 20), pose(0, 0)), null);
});
test("Considera el movimiento relativo del objetivo, no solo el de la bala", () => {
  const time = spriteContact(
    pose(100, 0),
    pose(0, 0),
    pose(0, 0),
    pose(100, 0),
  );
  assert.ok(time > 0 && time < 1);
});
test("Los píxeles transparentes no producen impactos", () => {
  const alpha = new Uint8Array(20 * 20);
  for (let y = 8; y < 12; y++)
    for (let x = 8; x < 12; x++) alpha[y * 20 + x] = 255;
  const target = pose(40, 0, 20, 20, alpha);
  assert.equal(
    spriteContact(pose(90, 2, 2, 2), target, pose(0, 2, 2, 2)),
    null,
  );
  assert.notEqual(
    spriteContact(pose(90, 9, 2, 2), target, pose(0, 9, 2, 2)),
    null,
  );
});
test("Recoge al tocar los pies/capa y durante un cruce entre actualizaciones", () => {
  const hero = pose(200, 200, 55, 85);
  assert.equal(pickupContact(pose(220, 280, 40, 40), hero), true);
  assert.equal(
    pickupContact(pose(350, 230, 40, 40), hero, pose(100, 230, 40, 40)),
    true,
  );
  assert.equal(pickupContact(pose(350, 230, 40, 40), hero), false);
});
test("La primera entrada ordena los impactos por distancia y permite el contacto de borde", () => {
  assert.deepEqual(
    sweepInterval(
      { x: 0, y: 0, width: 4, height: 4 },
      { x: 20, y: 0, width: 4, height: 4 },
      100,
      0,
    ),
    [0.16, 0.24],
  );
  assert.equal(
    sweepInterval(
      { x: 0, y: 0, width: 4, height: 4 },
      { x: 20, y: 10, width: 4, height: 4 },
      100,
      0,
    ),
    null,
  );
});
