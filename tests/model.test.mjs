import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Terrain, makeWaves, circleHit } from "../src/game/model.ts";
const content = JSON.parse(
  readFileSync("public/generated/content.json", "utf8"),
);
test("Los mapas recuperados usan 13 × 200 celdas y excluyen el terminador de mapa 3", () => {
  for (const m of content.maps) {
    assert.equal(m.cells.length, 2600);
    assert.equal(m.columns, 13);
    assert.equal(m.rows, 200);
    assert.ok(m.cells.every((v) => m.tileMasks[v]));
    assert.ok(m.cells.every((v) => v !== 255));
  }
});
test("Las rutas acuáticas y terrestres comprueban toda la base del enemigo", () => {
  const beach = new Terrain(content.maps[0]),
    bay = new Terrain(content.maps[1]),
    city = new Terrain(content.maps[2]);
  for (let y = 80; y < 7920; y += 80) {
    const water = beach.lane("water", y, 50, 18);
    if (water !== null) {
      assert.ok(beach.fits("water", water, y, 18));
      assert.equal(beach.at(water, y), 1);
      assert.ok(!beach.fits("road", water, y, 18));
    }
    const road = city.lane("road", y, 260, 20);
    assert.notEqual(road, null);
    assert.ok(city.fits("road", road, y, 20));
    assert.ok(!city.fits("water", road, y, 20));
    const bayRoad = bay.lane("road", y, 475, 14);
    assert.notEqual(bayRoad, null);
    assert.ok(bay.fits("road", bayRoad, y, 14));
  }
  assert.equal(city.lane("water", 500, 260, 14), null);
});
test("Las oleadas son reproducibles, ordenadas y respetan la superficie de su familia", () => {
  for (let phase = 1; phase <= 3; phase++) {
    const waves = makeWaves(phase);
    assert.deepEqual(waves, makeWaves(phase));
    assert.notDeepEqual(waves, makeWaves(phase, 28));
    assert.ok(waves.length > 100);
    assert.ok(waves.every((w, i) => !i || w.at >= waves[i - 1].at));
    assert.ok(
      waves
        .filter((w) => ["boat", "crab"].includes(w.kind))
        .every((w) => w.surface === "water"),
    );
    assert.ok(
      waves
        .filter((w) => ["car", "tank"].includes(w.kind))
        .every((w) => w.surface === "road"),
    );
  }
});

test("Los guiones mantienen diálogos UTF-8 y las escenas de cada fase", () => {
  assert.match(
    JSON.stringify(content.scripts["conversaciones/fase1_1_1"]),
    /Playa Victoria/,
  );
  for (let phase = 1; phase <= 3; phase++) {
    assert.ok(content.scripts[`vs_fase${phase}/vs`]);
    assert.ok(content.scripts[`diario_fase${phase}/diario`]);
  }
  assert.match(
    JSON.stringify(content.scripts["diario_fase3/diario"]),
    /vineta3/,
  );
});
