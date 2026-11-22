import test from "node:test";
import assert from "node:assert/strict";
import { HeroFall } from "../src/game/original/hero-death.ts";
test("La caída mantiene X y cambia al segundo sprite en el siguiente múltiplo de cuatro", () => {
  const fall = new HeroFall(120, 100);
  for (let cycle = 1; cycle <= 3; cycle++) {
    fall.tick(cycle, 85, 480);
    assert.equal(fall.frame, 0);
  }
  fall.tick(4, 85, 480);
  assert.equal(fall.x, 120);
  assert.equal(fall.y, 160);
  assert.equal(fall.drawY, 145);
  assert.equal(fall.frame, 1);
  for (let cycle = 5; cycle <= 8; cycle++) fall.tick(cycle, 85, 480);
  assert.equal(fall.frame, 1);
});
test("La muerte termina al superar el límite original, no al tocar el borde inferior", () => {
  const fall = new HeroFall(120, 475);
  fall.tick(1, 85, 480);
  assert.equal(fall.finished, false);
  for (let cycle = 2; cycle <= 11; cycle++) fall.tick(cycle, 85, 480);
  assert.equal(fall.y, 640);
  assert.equal(fall.finished, false);
  fall.tick(12, 85, 480);
  assert.equal(fall.y, 655);
  assert.equal(fall.finished, true);
});
