import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  OriginalPurpoBoss,
  PURPO_ATTACKS,
  PURPO_PARTS,
} from "../src/game/original/boss2.ts";
test("Purpo conserva los 18 ataques de crearDisparo y su reloj anterior al dibujo", () => {
  const b = new OriginalPurpoBoss(() => 0),
    shots = [];
  for (let i = 1; i <= 501; i++) {
    const shot = b.tick();
    if (shot) shots.push([i, shot]);
  }
  assert.deepEqual(
    shots.map((s) => s[0]),
    [
      31, 81, 91, 111, 141, 161, 181, 201, 211, 241, 261, 301, 331, 361, 381,
      391, 431, 481,
    ],
  );
  assert.equal(b.cycle, 1);
  assert.equal(PURPO_ATTACKS[30].bursts, 4);
  assert.equal(PURPO_ATTACKS[260].bursts, 2);
  assert.equal(PURPO_ATTACKS[140].type, "blue");
});
test("Un solo tentáculo sale cada 180 ciclos; el ataque espera su retirada", () => {
  const b = new OriginalPurpoBoss(() => 0);
  for (let i = 1; i <= 179; i++) b.tick();
  assert.equal(b.tentacle, -1);
  b.tick();
  assert.equal(b.tentacle, 0);
  assert.equal(b.tentacleFrame, 1);
  for (let i = 181; i <= 451; i++) b.tick();
  assert.equal(b.pendingAttack, true);
  assert.equal(b.attack, false);
  b.tick();
  assert.equal(b.tentacle, -1);
  assert.equal(b.attack, false);
  b.tick();
  assert.equal(b.attack, true);
  assert.equal(b.remaining, 200);
});
test("Alquitrán: aviso, dos emisores de 30, velocidades originales y retirada completa", () => {
  const b = new OriginalPurpoBoss(() => 0.5);
  let started = 0,
    tarAt = 0,
    finished = 0;
  for (let i = 1; i <= 800; i++) {
    const was = b.attack;
    b.tick();
    if (!was && b.attack) started = i;
    if (b.tar.some((t) => t.active) && !tarAt) {
      tarAt = i;
      assert.equal(b.tar.filter((t) => t.active).length, 60);
    }
    if (was && !b.attack) finished = i;
    for (const t of b.tar.filter((t) => t.active)) {
      assert.ok(t.dx >= -1 && t.dx <= 1);
      assert.ok(t.dy >= 8 && t.dy <= 16);
    }
  }
  assert.ok(tarAt > started + 90);
  assert.ok(finished > started + 200);
  assert.equal(
    b.tar.some((t) => t.active),
    false,
  );
  assert.deepEqual([...new Set(b.tar.map((t) => t.emitter))], [0, 1]);
});
test("Piezas y recursos originales a coordenadas fijas, sin entrada desde arriba", () => {
  assert.deepEqual(PURPO_PARTS[5], [186, 35, "cabeza_0"]);
  const sprites = JSON.parse(
    readFileSync("public/generated/content.json", "utf8"),
  ).sprites;
  for (const [, , frame] of PURPO_PARTS) assert.ok(sprites[`jefe2/${frame}`]);
});
