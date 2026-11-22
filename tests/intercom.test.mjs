import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  OriginalIntercom,
  RANDOM_CALL_CYCLES,
  readConversation,
} from "../src/game/original/intercom.ts";
const content = JSON.parse(
  fs.readFileSync(new URL("../public/generated/content.json", import.meta.url)),
);
test("Aviso de misión 1 entre 150 y 350 y variante elegida entre las tres originales", () => {
  const call = new OriginalIntercom(1, () => 0.4);
  assert.deepEqual(call.advanceTo(149), []);
  assert.deepEqual(call.advanceTo(150), [{ cycle: 150, name: "fase1_1_1" }]);
  assert.deepEqual(call.advanceTo(349), []);
  assert.deepEqual(call.advanceTo(350), [{ cycle: 350, name: null }]);
  assert.equal(call.randomCycle, 1700);
});
test("Las cinco conversaciones aleatorias y los cinco momentos son alcanzables", () => {
  for (let n = 0; n < 5; n++) {
    const call = new OriginalIntercom(1, () => (n + 0.1) / 5);
    assert.equal(call.randomCycle, RANDOM_CALL_CYCLES[n]);
    const events = call.advanceTo(3600);
    assert.ok(events.some((e) => e.name === `aleatoria${n}`));
    assert.ok(
      events.some(
        (e) => e.name === null && e.cycle === RANDOM_CALL_CYCLES[n] + 200,
      ),
    );
  }
});
test("Ventanas de fases 2/3, sin llamada de nubes añadida ni segunda misión habilitada en 0.9", () => {
  for (const [phase, start, end] of [
    [2, 170, 360],
    [3, 160, 360],
  ]) {
    const call = new OriginalIntercom(phase, () => 0.8);
    const calls = call.advanceTo(4000).filter((e) => e.name);
    assert.deepEqual(calls, [
      { cycle: start, name: `fase${phase}_1_2` },
      { cycle: 3400, name: "aleatoria4" },
    ]);
  }
  const call = new OriginalIntercom(1, () => 0.8);
  assert.equal(
    call.advanceTo(4780).filter((e) => e.name?.startsWith("fase1_2")).length,
    0,
  );
});
test("Conserva el cierre incondicional de 1710 que acorta la aleatoria de 1700", () => {
  const call = new OriginalIntercom(1, () => 0.4);
  assert.deepEqual(call.advanceTo(1720).slice(-2), [
    { cycle: 1700, name: "aleatoria2" },
    { cycle: 1710, name: null },
  ]);
});
test("Personajes consecutivos y voces salen del XML, sin alternancia artificial", () => {
  const script = readConversation(content.scripts["conversaciones/fase1_1_1"]);
  assert.deepEqual(
    script.lines.map((l) => l.speaker),
    [
      "Paco Alba",
      "Tirititran",
      "Paco Alba",
      "Paco Alba",
      "Tirititran",
      "Paco Alba",
    ],
  );
  assert.deepEqual(
    script.lines.map((l) => l.voice),
    [
      "vozpaco1",
      "voztirititran1",
      "vozpaco2",
      "vozpaco3",
      "voztirititran2",
      "vozpaco1",
    ],
  );
  for (const [name, who, portrait] of [
    ["aleatoria0", "Supermán", "superman_0"],
    ["aleatoria1", "Supermán", "superman_0"],
    ["aleatoria2", "Mamá", "mare_0"],
    ["aleatoria3", "Mamá", "mare_0"],
    ["aleatoria4", "Mamá", "mare_0"],
    ["fase2_2_1", "Bizcone", "bizcone0"],
  ]) {
    const convo = readConversation(content.scripts[`conversaciones/${name}`]);
    assert.equal(convo.name, who);
    assert.equal(convo.portrait, portrait);
    assert.ok(convo.lines.length > 0);
  }
});

test("El texto adapta los cortes simples y conserva párrafos y palabras originales", async () => {
  const { conversationText } = await import("../src/game/original/intercom.ts");
  assert.equal(
    conversationText("Del tirón Paco.|Estaré al liki.|Corto"),
    "Del tirón Paco. Estaré al liki. Corto",
  );
  assert.equal(conversationText("Uno||Dos\r\n\r\nTres"), "Uno\n\nDos\n\nTres");
  for (const [name, script] of Object.entries(content.scripts)) {
    if (!name.startsWith("conversaciones/")) continue;
    const objects = Array.isArray(script.objects.object)
      ? script.objects.object
      : [script.objects.object];
    for (const o of objects.filter((o) => o.type === "text" && o.data?.text)) {
      const original = String(o.data.text)
        .replaceAll("|", " ")
        .replace(/\s+/g, " ")
        .trim();
      assert.equal(
        conversationText(String(o.data.text)).replace(/\s+/g, " "),
        original,
        name,
      );
    }
  }
});
