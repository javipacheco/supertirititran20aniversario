import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  compileMoves,
  createMotion,
  followMotion,
  tickMotion,
  originalFrame,
  mapCamera,
  ORIGINAL_STEP,
} from "../src/game/original/motion.ts";
import {
  PHASE1_OPENING,
  PHASE1_TIMELINE,
} from "../src/game/original/phase1.ts";
const content = JSON.parse(
  readFileSync("public/generated/content.json", "utf8"),
);

test("La cámara coincide con los cambios de fila de mapa.cpp, incluido el salto de repetición", () => {
  assert.equal(mapCamera(0), 7520);
  assert.equal(mapCamera(19), 7482);
  assert.equal(mapCamera(20), 7480);
  assert.equal(mapCamera(3739), 42);
  assert.equal(mapCamera(3740), 7520);
});
test("La primera formación espera 10 ciclos y luego conserva la ruta vertical de 6 px/ciclo", () => {
  const leader = createMotion("gaviota1", 56, -58, [[0, -1, 0, 6]]);
  const follower = followMotion("gaviota1", leader, 10, 80, 0);
  for (let i = 0; i < 10; i++) {
    tickMotion(leader, "gaviota1", 260, 60);
    tickMotion(follower, "gaviota1", 260, 60);
  }
  assert.deepEqual([leader.x, leader.y, leader.frame], [56, 2, 12]);
  assert.deepEqual([follower.x, follower.y], [136, -58]);
  tickMotion(follower, "gaviota1", 260, 60);
  assert.equal(follower.y, -52);
});
test("El giro de ave añade orientaciones de tres ciclos sin recalcular el final histórico", () => {
  const route = compileMoves("gaviota1", [
    [0, 35, 8, 0],
    [0, 20, 0, -8],
  ]);
  assert.deepEqual(
    route.map((s) => [s.frame, s.end]),
    [
      [0, 35],
      [1, 38],
      [2, 41],
      [3, 44],
      [4, 47],
      [4, 55],
    ],
  );
  const bird = createMotion("gaviota1", -60, 240, [
    [0, 35, 8, 0],
    [0, 20, 0, -8],
  ]);
  for (let i = 0; i < 38; i++) tickMotion(bird, "gaviota1", 260, 60);
  assert.deepEqual([bird.x, bird.y, bird.frame], [232, 216, 1]);
});
test("La mediana frena, queda inmóvil y acelera al salir; no oscila horizontalmente", () => {
  const entry = PHASE1_OPENING.find((e) => e.cycle === 520);
  const ship = createMotion(entry.family, 386, -89, entry.moves);
  for (let i = 0; i < 25; i++) tickMotion(ship, entry.family, 260, 88);
  const stopped = ship.y;
  for (let i = 0; i < 45; i++) tickMotion(ship, entry.family, 260, 88);
  assert.equal(ship.y, stopped);
  assert.equal(ship.x, 386);
  for (let i = 0; i < 20; i++) tickMotion(ship, entry.family, 260, 88);
  assert.ok(ship.x > 386);
  assert.equal(ship.facing, 0);
});
test("Kamikaze persigue solo X y baja 6 px/ciclo, con zona muerta de 25 px", () => {
  const ship = createMotion("small", 104, -48, [[1, -1, -6, 6]]);
  tickMotion(ship, "small", 400, 48);
  assert.deepEqual([ship.x, ship.y, ship.frame], [107, -42, 17]);
  tickMotion(ship, "small", 131, 48);
  assert.deepEqual([ship.x, ship.y, ship.frame], [107, -36, 12]);
  tickMotion(ship, "small", 0, 48);
  assert.deepEqual([ship.x, ship.y, ship.frame], [104, -30, 16]);
});
test("La transcripción conserva familias, anomalías, ataques y todos los recursos de la apertura", () => {
  assert.equal(ORIGINAL_STEP, 0.045);
  assert.equal(PHASE1_OPENING.filter((e) => e.cycle === 110).length, 2);
  const right = PHASE1_OPENING.find((e) => e.cycle === 180 && e.x === 540);
  assert.equal(right.followers.family, "gaviota1");
  assert.deepEqual(PHASE1_OPENING.find((e) => e.cycle === 380).shots, [
    { at: 20, pattern: "aim", count: 4, interval: 15, type: "small" },
  ]);
  for (const entry of PHASE1_OPENING) {
    for (
      let i = 0;
      i <
      (["gaviota1", "gaviota2", "small"].includes(entry.family)
        ? 18
        : entry.family === "medium" || entry.family === "gavibot"
          ? 12
          : entry.family === "crab"
            ? 7
            : 3);
      i++
    ) {
      assert.ok(
        content.sprites[originalFrame(entry.family, i)],
        originalFrame(entry.family, i),
      );
    }
  }
});

test("El calendario completo conserva las 11 familias y no solicita lanchas durante el banco de nubes", () => {
  assert.equal(PHASE1_TIMELINE.length, 105);
  assert.equal(new Set(PHASE1_TIMELINE.map((e) => e.family)).size, 11);
  assert.ok(
    PHASE1_TIMELINE.every(
      (e) => !["wasp", "heli", "car", "tank"].includes(e.family),
    ),
  );
  assert.deepEqual(
    PHASE1_TIMELINE.filter((e) => e.family === "boat").map((e) => e.cycle),
    [920, 1400, 1720, 1840, 2200, 3580, 3630, 4190, 4210],
  );
  const clouds = PHASE1_TIMELINE.filter(
    (e) => e.cycle >= 2300 && e.cycle <= 3410,
  );
  assert.ok(
    clouds.every((e) => ["mine", "gaviota1", "gaviota2"].includes(e.family)),
  );
});
test("La lancha de 2200 se retira antes de las nubes siguiendo su ruta original", () => {
  const entry = PHASE1_TIMELINE.find(
    (e) => e.family === "boat" && e.cycle === 2200,
  );
  const motion = createMotion("boat", entry.x, entry.y, entry.moves);
  let outsideAt;
  for (let age = 1; age <= 100; age++) {
    tickMotion(motion, "boat", 260, 67);
    assert.ok(motion.frame >= 0 && motion.frame < 32);
    if (
      motion.x < -67 * 2 - 5 ||
      motion.x > 520 + 67 * 2 - 5 ||
      motion.y < -67 * 2 - 5 ||
      motion.y > 480 + 67 * 2 - 5
    ) {
      outsideAt = 2200 + age;
      break;
    }
  }
  assert.ok(outsideAt < 2300);
});
