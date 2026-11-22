import test from "node:test";
import assert from "node:assert/strict";
import {
  OriginalPowers,
  OriginalWeapon,
  createBall,
} from "../src/game/original/powers.ts";
test("Escudo y clones: 400 ciclos, aviso en 320, expiración en la comprobación siguiente y bloqueo de otros poderes", () => {
  for (const id of [0, 2]) {
    const p = new OriginalPowers();
    assert.equal(p.uses, 2);
    assert.equal(p.activate(id), true);
    assert.equal(p.uses, 1);
    assert.equal(p.activate(1), false);
    assert.equal(p.uses, 1);
    let warnings = 0;
    for (let i = 1; i <= 400; i++) {
      if (p.tick(false)) warnings++;
      assert.equal(p.active, id);
    }
    assert.equal(warnings, 1);
    p.tick(false);
    assert.equal(p.active, null);
    assert.equal(p.remaining, 0);
  }
});
test("Recarga: tres piezas suman un uso, sin tope artificial de nueve; la barra se restablece después de parpadear", () => {
  const p = new OriginalPowers();
  p.uses = 9;
  assert.equal(p.collect(), false);
  assert.equal(p.collect(), false);
  assert.equal(p.uses, 9);
  assert.equal(p.collect(), true);
  assert.equal(p.uses, 10);
  p.tick(false);
  assert.equal(p.chargeSegments, 4);
  for (let i = 0; i < 82; i++) p.tick(false);
  assert.equal(p.chargeSegments, 0);
});
test("La bomba no consume el temporizador de escudo/clones y la onda recorre la pantalla a 90 px/ciclo", () => {
  const p = new OriginalPowers();
  assert.equal(p.activate(1), true);
  assert.equal(p.active, null);
  assert.equal(p.bombY, 480);
  for (let i = 0; i < 12; i++) p.tick(false);
  assert.equal(p.bombY, -600);
  p.tick(false);
  assert.equal(p.bombY, null);
  assert.equal(p.shotBlock, 40);
  for (let i = 0; i < 40; i++) p.tick(false);
  assert.equal(p.shotBlock, 0);
});
test("Normal → láser → triple; el último triple se emite al agotar el contador y vuelve al láser", () => {
  const w = new OriginalWeapon();
  assert.deepEqual(w.tick(true), [{ x: 16, y: 10, dx: 0, dy: -25, frame: 0 }]);
  w.release();
  w.upgrade();
  assert.deepEqual(w.tick(true), [{ x: 12, y: 20, dx: 0, dy: -35, frame: 1 }]);
  w.release();
  w.upgrade();
  for (let n = 0; n < 70; n++) {
    assert.equal(w.tick(true).length, 3);
    w.release();
  }
  assert.equal(w.level, 3);
  assert.equal(w.tripleRemaining, 0);
  assert.equal(w.tick(true).length, 3);
  assert.equal(w.level, 2);
  w.release();
  assert.equal(w.tick(true)[0].frame, 1);
});
test("Mantener pulsado emite como máximo ocho ráfagas; recoger otro agregador no renueva el contador triple", () => {
  const w = new OriginalWeapon();
  let volleys = 0;
  for (let i = 0; i < 100; i++) if (w.tick(true)) volleys++;
  assert.equal(volleys, 8);
  w.release();
  assert.ok(w.tick(true));
  w.upgrade();
  w.upgrade();
  w.release();
  w.tick(true);
  const remaining = w.tripleRemaining;
  w.upgrade();
  assert.equal(w.tripleRemaining, remaining);
});
test("Balones: posiciones bajo la pantalla, velocidad horizontal 18–29 y vertical −25 a −34", () => {
  for (const random of [() => 0, () => 0.9999, () => 0.5]) {
    const b = createBall(random);
    assert.ok(b.x >= 0 && b.x < 400);
    assert.ok(b.y >= 480 && b.y <= 1379);
    assert.ok(Math.abs(b.vx) >= 18 && Math.abs(b.vx) <= 29);
    assert.ok(b.vy <= -25 && b.vy >= -34);
  }
});
