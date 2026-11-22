import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.url());
  });
  await page.addInitScript(() => {
    sessionStorage.setItem("tirititran-entered", "true");
    localStorage.setItem("tirititran-debug", "active");
  });
  await page.goto(`${process.env.TEST_URL ?? "http://localhost:5173"}/?test`);
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "¡AL LÍO, PISHA!" }).click();
  await page.waitForFunction(() => window.__game.snapshot().mode === "intro");
  assert.equal(
    await page.evaluate(() => window.__game.snapshot().mode),
    "intro",
  );
  await page.getByRole("button", { name: /Saltar presentación/ }).click();
  assert.equal(
    await page.evaluate(() => window.__game.snapshot().mode),
    "playing",
  );
  await mkdir("test-results", { recursive: true });
  for (const phase of [1, 2, 3]) {
    await page.evaluate((phase) => {
      window.__game.getScene().scene.resume();
      window.__game.command("start", { phase });
    }, phase);
    await page.waitForFunction(
      (phase) =>
        !window.__game.getScene().loadingPhase &&
        window.__game.snapshot().phase === phase &&
        window.__game.snapshot().mode === "intro",
      phase,
    );
    const audit = await page.evaluate((phase) => {
      const g = window.__game,
        scene = g.getScene();
      scene.scene.pause();
      g.command("start", { phase });
      const seq = scene.sequence;
      const initial = g.snapshot();
      seq.update(0.045);
      const cycle = seq.cycle;
      const samples = [];
      // Play through every original cue without allowing gameplay to start.
      for (let i = 1; i < [0, 670, 1150, 1740][phase] + 20; i++) {
        seq.update(0.045);
        if (i % 100 === 0)
          samples.push(seq.records.filter((r) => r.sprite.visible).length);
      }
      const stopped = seq.cycle;
      seq.update(3);
      const stillStopped = seq.cycle;
      const expectedSounds = seq.script.objects.object
        .filter((o) => o.type === "sound")
        .flatMap((o) => o.sounds.sound).length;
      const result = {
        initial,
        cycle,
        stopped,
        stillStopped,
        samples,
        played: seq.played.size,
        expectedSounds,
        prompt: seq.stopText.visible,
        missing:
          seq.script.objects.object.filter((o) => o.type !== "sound").length -
          seq.records.length,
      };
      return result;
    }, phase);
    assert.equal(audit.initial.mode, "intro");
    assert.equal(audit.initial.originalCycle, 0);
    assert.equal(audit.initial.enemyCount, 0);
    assert.equal(audit.initial.playHeight, 480);
    assert.equal(audit.cycle, 1);
    assert.equal(audit.stopped, [0, 670, 1150, 1740][phase]);
    assert.equal(audit.stillStopped, audit.stopped);
    assert.equal(audit.played, audit.expectedSounds);
    assert.equal(audit.missing, 0);
    assert.ok(audit.prompt);
    assert.ok(audit.samples.some((n) => n > 0));
    await page.screenshot({ path: `test-results/intro-${phase}.png` });
    await page.getByRole("button", { name: /Saltar presentación/ }).click();
    const after = await page.evaluate(async () => {
      const { audio } = await import("/src/game/audio.ts");
      if (audio.cinematic.size !== 0)
        throw new Error("Audio de intro sin detener");
      const g = window.__game,
        s = g.getScene();
      return {
        mode: g.snapshot().mode,
        cycle: g.snapshot().originalCycle,
        sequence: !!s.sequence,
      };
    });
    assert.deepEqual(after, { mode: "playing", cycle: 0, sequence: false });
    console.log(
      `Intro ${phase}: XML completo, parada final y botón correctos.`,
    );
  }
  const lifecycle = await page.evaluate(() => {
    const g = window.__game,
      s = g.getScene();
    g.command("retry");
    const retry = g.snapshot().mode;
    g.command("menu");
    const menu = g.snapshot().mode;
    s.mode = "victory";
    s.phase = 1;
    g.command("next");
    const next = { mode: g.snapshot().mode, phase: g.snapshot().phase };
    g.command("continue");
    g.command("start", { phase: 2, debugBoss: true });
    const debugIntro = g.snapshot().mode;
    g.command("continue");
    return {
      retry,
      menu,
      next,
      debugIntro,
      debugCycle: g.snapshot().originalCycle,
    };
  });
  assert.equal(lifecycle.retry, "intro");
  assert.equal(lifecycle.menu, "menu");
  assert.deepEqual(lifecycle.next, { mode: "intro", phase: 2 });
  assert.equal(lifecycle.debugIntro, "intro");
  assert.equal(lifecycle.debugCycle, 4150 - 22);
  // Escape is available immediately, without waiting for the first picture.
  await page.evaluate(() => {
    const s = window.__game.getScene();
    s.scene.resume();
    window.__game.command("start", { phase: 1 });
  });
  await page.waitForTimeout(100);
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.__game.step(0.016));
  await page.waitForFunction(() => window.__game.snapshot().mode === "playing");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
