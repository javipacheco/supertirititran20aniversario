import test from "node:test";
import assert from "node:assert/strict";
import { CLOUD_POSITIONS, cloudOffset } from "../src/game/original/clouds.ts";
import { PHASE1_MINES } from "../src/game/original/phase1.ts";
import {
  createMotion,
  tickMotion,
  motionVulnerable,
} from "../src/game/original/motion.ts";
test("Las 20 nubes originales se desplazan 3 px/ciclo desde 2300 hasta salir la última", () => {
  assert.equal(CLOUD_POSITIONS.length, 20);
  assert.deepEqual(CLOUD_POSITIONS[0], [-50, -400]);
  assert.deepEqual(CLOUD_POSITIONS[19], [210, -2850]);
  assert.equal(cloudOffset(2299), null);
  assert.equal(cloudOffset(2300), 3);
  assert.equal(cloudOffset(2400), 303);
  assert.equal(CLOUD_POSITIONS[19][1] + cloudOffset(3409), 480);
  assert.equal(CLOUD_POSITIONS[19][1] + cloudOffset(3410), 483);
  assert.equal(cloudOffset(3411), null);
});
test("Las 14 minas mantienen ciclos, coordenadas y direcciones originales", () => {
  assert.deepEqual(
    PHASE1_MINES.map((m) => m.cycle),
    [
      2400, 2420, 2500, 2570, 2640, 2790, 2850, 2870, 2900, 2980, 3000, 3080,
      3110, 3120,
    ],
  );
  assert.deepEqual([PHASE1_MINES[0].x, PHASE1_MINES[0].y], [173, 160]);
  assert.equal(PHASE1_MINES[1].moves[0][2], -2);
});
test("La mina deriva horizontalmente, crece y solo colisiona durante la ventana del tamaño máximo", () => {
  const mine = createMotion("mine", 173, 160, [[0, -1, 2, 0]]);
  for (let i = 0; i < 36; i++) tickMotion(mine, "mine", 260, 60);
  assert.deepEqual([mine.x, mine.y, mine.frame], [245, 160, 9]);
  assert.equal(motionVulnerable("mine", mine), false);
  tickMotion(mine, "mine", 260, 60);
  assert.equal(motionVulnerable("mine", mine), true);
  while (mine.age < 104) tickMotion(mine, "mine", 260, 60);
  assert.equal(mine.frame, 8);
  assert.equal(motionVulnerable("mine", mine), true);
  tickMotion(mine, "mine", 260, 60);
  assert.equal(motionVulnerable("mine", mine), false);
  while (mine.age < 140) tickMotion(mine, "mine", 260, 60);
  assert.equal(mine.frame, -1);
});
