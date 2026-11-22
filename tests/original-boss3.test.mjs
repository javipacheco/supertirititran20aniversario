import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  OriginalGod,
  OriginalGodEncounter,
  OriginalBioPic,
  GOD_CONFIGS,
  GOD_SHOTS,
  godFrame,
  bioPicFrame,
} from "../src/game/original/boss3.ts";
test("Tres dioses fijos, 130 impactos cada uno y 32 ataques programados independientes", () => {
  assert.deepEqual(
    GOD_CONFIGS.map((c) => [c.x, c.y]),
    [
      [290, 50],
      [153, -25],
      [-60, -15],
    ],
  );
  assert.deepEqual(
    GOD_SHOTS.map((s) => Object.keys(s).length),
    [8, 11, 13],
  );
  for (let i = 0; i < 3; i++) {
    const g = new OriginalGod(i),
      fired = [];
    for (let t = 1; t <= 481; t++) {
      const a = g.tick(() => 0);
      if (a) fired.push(t);
    }
    assert.deepEqual(fired, Object.keys(GOD_SHOTS[i]).map(Number));
    g.tick(() => 0);
    assert.equal(g.cycle, 1);
    for (let h = 0; h < 130; h++) g.hit();
    assert.equal(g.dead, true);
    assert.equal(g.hp, 0);
    assert.equal(
      g.tick(() => 0),
      undefined,
    );
    assert.equal(g.frame, GOD_CONFIGS[i].ruin);
  }
});
test("Las poses atacan cada 140 ciclos tras iniciar(), y la fiesta espera al último ataque", () => {
  const e = new OriginalGodEncounter();
  for (let c = 1; c <= 139; c++) e.tick(c, () => 0);
  assert.equal(
    e.gods.every((g) => !g.attacking),
    true,
  );
  e.tick(140, () => 0);
  assert.equal(
    e.gods.every((g) => g.attacking),
    true,
  );
  const requested = e.tick(600, () => 0);
  assert.equal(requested.partyStarted, false);
  assert.equal(e.pendingParty, true);
  let started = false;
  for (let c = 601; c < 800; c++) {
    const r = e.tick(c, () => 0);
    if (r.partyStarted) {
      started = true;
      break;
    }
  }
  assert.equal(started, true);
  assert.equal(e.bio.outside, true);
  assert.equal(
    e.gods.every((g) => g.party),
    true,
  );
});
test("BioPic espera 50 ciclos, muestra su secuencia y dispara en círculos completos", () => {
  const b = new OriginalBioPic();
  b.show();
  let shots = 0,
    visible = false;
  for (let i = 0; i < 230; i++) {
    for (const shot of b.tick()) {
      assert.equal(shot.pattern, "eight");
      shots++;
    }
    visible ||= b.visible;
  }
  assert.equal(visible, true);
  assert.ok(shots >= 5);
  assert.equal(b.outside, false);
  assert.equal(b.wait, 50);
});
test("Las animaciones de los tres dioses y BioPic solo usan recursos cargados", () => {
  const sprites = JSON.parse(
    readFileSync("public/generated/content.json", "utf8"),
  ).sprites;
  const e = new OriginalGodEncounter();
  for (let t = 1; t <= 4000; t++) {
    e.tick(t, () => 0.9);
    for (const g of e.gods)
      assert.ok(
        sprites[godFrame(g.god, g.renderFrame)],
        `dios ${g.god}: ${g.renderFrame}`,
      );
    assert.ok(sprites[bioPicFrame(e.bio.frame)]);
  }
});
