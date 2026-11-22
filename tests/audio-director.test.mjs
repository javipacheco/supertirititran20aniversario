import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
const source = await readFile(
  new URL("../src/game/audio.ts", import.meta.url),
  "utf8",
);
// Supply Vite's asset base while exercising the real director in Node.
const { AudioDirector } = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      stripTypeScriptTypes(
        source.replaceAll("import.meta.env.BASE_URL", JSON.stringify("/")),
        { mode: "strip" },
      ),
    ).toString("base64")
);
class FakeAudio {
  static created = [];
  constructor(src) {
    this.src = src;
    this.paused = true;
    this.currentTime = 0;
    this.calls = 0;
    FakeAudio.created.push(this);
  }
  play() {
    this.calls++;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
const setup = () => {
  FakeAudio.created = [];
  globalThis.Audio = FakeAudio;
  globalThis.document = new EventTarget();
  return new AudioDirector();
};
test("Solicitar la misma música aplica preferencias sin duplicar play", () => {
  const a = setup();
  a.unlock();
  a.song("opciones");
  const track = FakeAudio.created[0];
  assert.equal(track.calls, 1);
  a.song("opciones");
  assert.equal(track.calls, 2);
  a.muted = true;
  a.song("opciones");
  assert.equal(track.calls, 2);
});
test("Una pista pendiente permite el intento de autoplay al volver a solicitarla", () => {
  const a = setup();
  a.song("opciones");
  const track = FakeAudio.created[0];
  assert.equal(track.calls, 0);
  a.song("opciones", "sonidos", true);
  assert.equal(track.calls, 1);
});
test("Intercom reutiliza un canal, reinicia el tono y no reaparece al reanudar tras cerrarlo", () => {
  const a = setup();
  a.unlock();
  a.ringIntercom();
  const ring = FakeAudio.created[0];
  ring.currentTime = 5;
  a.stopIntercom();
  assert.equal(ring.paused, true);
  a.resume();
  assert.equal(ring.calls, 1);
  a.ringIntercom();
  assert.equal(FakeAudio.created.length, 1);
  assert.equal(ring.currentTime, 0);
  assert.equal(ring.calls, 2);
  a.pause();
  assert.equal(ring.paused, true);
  a.resume();
  assert.equal(ring.calls, 3);
  a.stopIntercom();
  a.apply();
  assert.equal(ring.calls, 3);
});
