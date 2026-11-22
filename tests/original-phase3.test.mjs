import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PHASE3_TIMELINE,
  PHASE3_PICKUPS,
  PHASE3_END,
  createConfetti,
  tickConfetti,
} from "../src/game/original/phase3.ts";
import {
  createMotion,
  tickMotion,
  originalFrame,
  motionVulnerable,
  compileMoves,
} from "../src/game/original/motion.ts";
const sprites = JSON.parse(
  readFileSync("public/generated/content.json", "utf8"),
).sprites;
test("174 solicitudes, 16 familias, cinco recogibles, variantes y recursos del original", () => {
  assert.equal(PHASE3_TIMELINE.length, 174);
  assert.equal(new Set(PHASE3_TIMELINE.map((e) => e.family)).size, 16);
  assert.equal(PHASE3_PICKUPS.length, 5);
  assert.equal(PHASE3_END, 4550);
  for (const e of PHASE3_TIMELINE) {
    assert.ok(e.sourceLine >= 1425 && e.sourceLine < 3332);
    assert.ok(
      sprites[
        e.float
          ? `carrozas/${e.float}0`
          : e.car
            ? `ene_fase/${e.car}0`
            : originalFrame(e.family)
      ],
    );
  }
  assert.equal(PHASE3_TIMELINE[0].car, "cmercedes_rj");
  assert.equal(PHASE3_TIMELINE.filter((e) => e.family === "car").length, 68);
  assert.equal(
    PHASE3_TIMELINE.filter((e) => e.family === "helicopter").some(
      (e) => e.shots.length > 0,
    ),
    false,
  );
});
test("Cabalgata: cuatro carrozas espaciadas y ataques diferentes; mar regala vida", () => {
  const floats = PHASE3_TIMELINE.filter((e) => e.family === "float");
  assert.deepEqual(
    floats.map((e) => [e.cycle, e.float]),
    [
      [2480, "c_barco"],
      [2650, "c_demonio"],
      [2820, "c_mar"],
      [3000, "c_castillo"],
    ],
  );
  assert.equal(floats[2].gift, "vida");
  assert.equal(floats[0].shots[0].type, "rotating");
  assert.equal(floats[1].shots[0].pattern, "pair");
});
test("Carroza baja 3 px y reduce a 1 solo entre edades 90 y 190; destruida sigue avanzando", () => {
  const m = createMotion("float", 0, 0, []);
  for (let i = 0; i < 90; i++) tickMotion(m, "float", 260, 100);
  assert.equal(m.y, 270);
  for (let i = 0; i < 99; i++) tickMotion(m, "float", 260, 100);
  assert.equal(m.y, 369);
  tickMotion(m, "float", 260, 100);
  assert.equal(m.y, 372);
  assert.ok(m.frame < 3);
  m.wreck = true;
  tickMotion(m, "float", 260, 100);
  assert.equal(m.y, 375);
  assert.equal(m.frame, 3);
  assert.equal(motionVulnerable("float", m), false);
});
test("Taxi incorpora giros, deriva vertical de 2 y solo dieciséis orientaciones", () => {
  const path = compileMoves("taxi", [
    [0, 20, 0, 8, -1],
    [0, -1, 4, 0, -1],
  ]);
  assert.equal(path.at(-1).dy, 2);
  assert.ok(path.length > 2);
  const m = createMotion("taxi", 0, 0, [[0, -1, 4, 0, -1]]);
  tickMotion(m, "taxi", 260, 40);
  assert.equal(m.x, 4);
  assert.equal(m.y, 2);
  assert.equal(originalFrame("taxi", m.frame), "ene_fase/taxi_0");
});
test("Sesenta papelillos, seis dibujos y velocidad nativa de 3–4 px/ciclo", () => {
  const p = createConfetti(() => 0.5);
  assert.equal(p.length, 60);
  assert.ok(p.every((p) => p.dy >= 3 && p.dy <= 4 && p.dx >= -3 && p.dx <= 3));
  const y = p[0].y;
  tickConfetti(p[0], () => 0.5, 10, 10);
  assert.equal(p[0].y, y + 4);
});
