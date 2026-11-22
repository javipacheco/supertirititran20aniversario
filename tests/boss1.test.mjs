import test from "node:test";
import assert from "node:assert/strict";
import {
  OriginalCrabBoss,
  CRAB_ATTACKS,
  tickArenaEnemy,
  arenaTower,
  arenaCrab,
} from "../src/game/original/boss1.ts";
test("El cangrejo empieza colocado, espera 100 ciclos y se desplaza solo horizontalmente", () => {
  const b = new OriginalCrabBoss();
  for (let i = 0; i < 100; i++) b.tick();
  assert.equal(b.x, 150);
  assert.equal(b.y, -25);
  b.tick();
  assert.equal(b.x, 153);
  for (let i = 0; i < 99; i++) b.tick();
  assert.equal(b.x, 42);
  assert.equal(b.y, -25);
  const x = b.x;
  for (let i = 0; i < 100; i++) b.tick();
  assert.equal(b.x, x);
});
test("Los dieciséis ataques conservan los ciclos y las castañuelas llaman refuerzos", () => {
  const b = new OriginalCrabBoss(),
    attacks = [],
    calls = [],
    reinforcements = [];
  for (let i = 1; i <= 501; i++) {
    const cycle = b.cycle,
      r = b.tick();
    if (r.attack) attacks.push(cycle);
    if (r.castanets) calls.push(i);
    if (r.reinforcements) reinforcements.push(i);
  }
  assert.deepEqual(attacks.slice(0, 16), Object.keys(CRAB_ATTACKS).map(Number));
  assert.deepEqual(calls, [401]);
  assert.deepEqual(reinforcements, [500]);
  assert.equal(b.y, -25);
});
test("Los brazos rebotan entre 0 y 2; las castañuelas usan 3/4 sin avanzar", () => {
  const b = new OriginalCrabBoss();
  for (let i = 0; i < 400; i++) {
    b.tick();
    assert.ok(b.leftArm >= 0 && b.leftArm <= 2);
    assert.ok(b.rightArm >= 0 && b.rightArm <= 2);
  }
  b.tick();
  const x = b.x;
  for (let i = 0; i < 98; i++) {
    b.tick();
    assert.equal(b.x, x);
  }
  assert.ok([3, 4].includes(b.leftArm));
  b.tick();
  assert.equal(b.leftArm, 0);
  assert.equal(b.calling, false);
});
test("Las torres permanecen cerradas hasta la llamada y los cangrejos auxiliares se esconden", () => {
  const t = arenaTower(-8);
  for (let i = 0; i < 499; i++) {
    assert.equal(tickArenaEnemy(t), false);
    assert.equal(t.frame, 0);
    assert.equal(t.vulnerable, false);
  }
  const c = arenaCrab(30, 272, 70, 80),
    shots = [];
  for (let i = 1; i <= 190; i++) {
    if (tickArenaEnemy(c)) shots.push(i);
  }
  assert.deepEqual(shots, [70, 150]);
  assert.equal(c.active, false);
  assert.equal(c.y, 272);
});
