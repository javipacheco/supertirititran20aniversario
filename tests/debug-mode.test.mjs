import test from "node:test";
import assert from "node:assert/strict";
import { DebugTapSequence } from "../src/game/debug.ts";
test("Siete pulsaciones rápidas activan la secuencia; las lentas empiezan otra vez", () => {
  const seq = new DebugTapSequence();
  for (let i = 1; i <= 7; i++) assert.equal(seq.tap(i * 150), i);
  seq.reset();
  assert.equal(seq.tap(2000), 1);
  assert.equal(seq.tap(2600), 1);
  assert.equal(seq.tap(2750), 2);
  seq.reset();
  assert.equal(seq.tap(2800), 1);
});
test("La secuencia también limita el tiempo total, aunque los intervalos sean pequeños", () => {
  const seq = new DebugTapSequence();
  for (let i = 0; i < 6; i++) assert.equal(seq.tap(i * 480), i + 1);
  assert.equal(seq.tap(2880), 1);
});
