import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PHASE2_TIMELINE,
  PHASE2_PICKUPS,
  phase2Distance,
  OriginalElcano,
} from "../src/game/original/phase2.ts";
import {
  createMotion,
  tickMotion,
  originalFrame,
  motionVulnerable,
} from "../src/game/original/motion.ts";
const sprites = JSON.parse(
  readFileSync("public/generated/content.json", "utf8"),
).sprites;
test("110 solicitudes originales, 15 familias y cinco recogibles sin mezcla de otras fases", () => {
  assert.equal(PHASE2_TIMELINE.length, 110);
  assert.equal(new Set(PHASE2_TIMELINE.map((e) => e.family)).size, 15);
  assert.equal(PHASE2_PICKUPS.length, 5);
  for (const e of PHASE2_TIMELINE) {
    assert.ok(e.sourceLine >= 3453 && e.sourceLine < 4800);
    assert.ok(sprites[e.car ? `ene_fase/${e.car}0` : originalFrame(e.family)]);
  }
  assert.deepEqual(PHASE2_TIMELINE[0].cycle, 120);
  assert.equal(PHASE2_TIMELINE.find((e) => e.family === "wasp").cycle, 300);
});
test("Elcano entra a 2120, para en 2270 y abre/cierra la rampa a 2px por ciclo", () => {
  const e = new OriginalElcano(500);
  let stopped;
  for (let c = 1; c <= 3111; c++) {
    e.tick(c);
    if (c === 2119) assert.equal(e.active, false);
    if (c === 2120) assert.deepEqual([e.active, e.y], [true, -500]);
    if (c === 2270) {
      stopped = e.y;
      assert.equal(e.rampOpen, true);
    }
    if (c === 2306) assert.equal(e.rampX, 98);
    if (c === 3070) {
      assert.equal(e.y, stopped);
      assert.equal(e.rampOpen, false);
    }
    if (c === 3106) assert.equal(e.rampX, 26);
    if (c === 3111) assert.equal(e.y, stopped + 23);
  }
  assert.equal(phase2Distance(3100), phase2Distance(2270));
  assert.equal(phase2Distance(3110) - phase2Distance(3100), 10);
});
test("Concha se esconde siguiendo el mapa, se cierra y vuelve a andar sin giros de nave", () => {
  const m = createMotion("shell", 0, 0, [
    [0, 5, 4, 0, -1],
    [2, 20, 0, 2, -1],
    [0, -1, 4, 0, -1],
  ]);
  for (let i = 0; i < 6; i++) tickMotion(m, "shell", 260, 50);
  assert.equal(motionVulnerable("shell", m), false);
  assert.equal(m.y, 2);
  for (let i = 0; i < 15; i++) tickMotion(m, "shell", 260, 50);
  assert.equal(m.frame, 4);
  for (let i = 0; i < 7; i++) tickMotion(m, "shell", 260, 50);
  assert.equal(motionVulnerable("shell", m), true);
  assert.ok(m.frame < 4);
});
test("Los coches mantienen variante y sentido, los helicópteros alternan el rotor", () => {
  const m = createMotion("car", 0, 480, [[0, -1, 0, -8, -1]]);
  tickMotion(m, "car", 260, 40);
  assert.equal(m.frame, 1);
  assert.equal(m.y, 472);
  const h = createMotion("helicopter", 0, 0, [[0, -1, 0, 6, -1]]);
  tickMotion(h, "helicopter", 260, 40);
  assert.equal(
    originalFrame("helicopter", h.frame),
    "ene_generales/helicoptero_12b",
  );
  tickMotion(h, "helicopter", 260, 40);
  assert.equal(
    originalFrame("helicopter", h.frame),
    "ene_generales/helicoptero_12a",
  );
});
