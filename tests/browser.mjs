import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.TEST_URL ?? "http://localhost:5173";
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
    viewport: { width: 1360, height: 1000 },
  }),
  page = await context.newPage();
const errors = [],
  warnings = [],
  failed = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") warnings.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
});
await mkdir("test-results", { recursive: true });
await page.addInitScript(() =>
  sessionStorage.setItem("tirititran-entered", "true"),
);
await page.goto(`${url}/?test`);
await page.waitForFunction(() => !!window.__game, { timeout: 90000 });
assert.equal(await page.evaluate(() => window.__game.snapshot().mode), "menu");
await page.screenshot({ path: "test-results/menu.png", fullPage: true });
await page.getByRole("button", { name: "¡AL LÍO, PISHA!" }).click();
await page.waitForFunction(() => window.__game.snapshot().mode === "intro");
await page.evaluate(() => window.__game.command("continue"));
await page.keyboard.press("ArrowLeft");
const start = await page.evaluate(() => window.__game.snapshot());
assert.equal(start.mode, "playing");
await page.keyboard.down("ArrowLeft");
await page.waitForFunction(
  (x) => window.__game.snapshot().player.x < x - 64,
  start.player.x,
  { timeout: 5000 },
);
await page.keyboard.up("ArrowLeft");
const moved = await page.evaluate(() => window.__game.snapshot());
assert.ok(moved.player.x < start.player.x - 60);
// Original phase-one call is offered at cycle 150 (6.75 s), not at spawn.
await page.evaluate(() => window.__game.fastForward(7));
await page.keyboard.press("Space");
await page.waitForTimeout(80);
const dialogue = await page.evaluate(() => window.__game.snapshot());
assert.ok(dialogue.dialogue);
const frozen = dialogue.elapsed;
await page.waitForTimeout(400);
assert.equal(
  await page.evaluate(() => window.__game.snapshot().elapsed),
  frozen,
);
for (let i = 0; i < 6; i++) {
  await page.keyboard.press("Space");
  await page.waitForTimeout(45);
}
assert.equal(
  await page.evaluate(() => window.__game.snapshot().dialogue),
  false,
);
await page.keyboard.press("p");
await page.waitForTimeout(60);
assert.equal(await page.evaluate(() => window.__game.snapshot().paused), true);
const paused = await page.evaluate(() => window.__game.snapshot().elapsed);
await page.waitForTimeout(300);
assert.equal(
  await page.evaluate(() => window.__game.snapshot().elapsed),
  paused,
);
await page.keyboard.press("p");
await page.waitForTimeout(60);
await page.evaluate(() => {
  window.__game.command("select", 0);
  window.__game.command("power");
});
assert.ok((await page.evaluate(() => window.__game.snapshot())).shield > 0);
assert.equal((await page.evaluate(() => window.__game.snapshot())).uses, 1);
await page.evaluate(() => {
  window.__game.command("select", 2);
  window.__game.command("power");
});
assert.equal((await page.evaluate(() => window.__game.snapshot())).clones, 0);
assert.equal((await page.evaluate(() => window.__game.snapshot())).uses, 1);
await page.evaluate(() => {
  (window.__game.command("retry"), window.__game.command("continue"));
  window.__game.command("select", 3);
  window.__game.command("power");
});
assert.equal((await page.evaluate(() => window.__game.snapshot())).balls, 25);
await page.evaluate(() => {
  window.__game.command("select", 1);
  window.__game.command("power");
});
assert.equal((await page.evaluate(() => window.__game.snapshot())).uses, 0);
await page.evaluate(() => window.__game.command("power"));
assert.equal((await page.evaluate(() => window.__game.snapshot())).uses, 0);
await page.evaluate(() => {
  (window.__game.command("retry"), window.__game.command("continue"));
  window.__game.fastForward(8);
});
await page.screenshot({ path: "test-results/playing.png", fullPage: true });
// Campaign traversal: real firing/collisions with a test pilot. Invulnerability isolates progression from pilot skill.
const campaign = [];
for (let phase = 1; phase <= 3; phase++) {
  const result = await page.evaluate((phase) => {
    const game = window.__game;
    game.god(true);
    const scene = game.getScene();
    let maxEnemies = 0,
      eventSeen = false,
      bossSeen = false,
      gods = new Set(),
      frames = 0;
    // Phase two now lasts 186.75 s before VS, including the original Elcano stop.
    while (frames++ < 60 * (phase <= 2 ? 360 : 420)) {
      const snap = game.snapshot();
      if (
        (snap.mode === "victory" && !scene.sequence && !scene.victoryPending) ||
        snap.mode === "complete"
      )
        break;
      if (snap.mode === "boss") {
        bossSeen = true;
        if (snap.gods?.length) snap.gods.forEach((g) => gods.add(g.god));
        else if (snap.boss) gods.add(snap.boss.god);
      }
      eventSeen ||= !!snap.event;
      maxEnemies = Math.max(maxEnemies, snap.enemyCount);
      const targets = scene.enemies
        .filter((e) => !e.dead && e.y > 0 && e.y < 430)
        .sort((a, b) => b.y - a.y);
      const target = scene.boss ?? targets[0];
      if (target) {
        const x =
          scene.player.x + Math.max(-4, Math.min(4, target.x - scene.player.x));
        game.aim(x, snap.playHeight - 105);
      }
      game.step(1 / 60);
    }
    return {
      phase,
      mode: game.snapshot().mode,
      maxEnemies,
      eventSeen,
      bossSeen,
      gods: [...gods],
      kills: game.snapshot().kills,
      score: game.snapshot().score,
      frames,
      remaining: game.snapshot().boss,
    };
  }, phase);
  campaign.push(result);
  assert.ok(result.eventSeen, `evento fase ${phase}`);
  assert.ok(result.bossSeen, `boss fase ${phase}`);
  assert.ok(result.maxEnemies > 4);
  assert.equal(
    result.mode,
    phase === 3 ? "complete" : "victory",
    JSON.stringify(result),
  );
  if (phase === 3) assert.deepEqual(result.gods, [0, 1, 2]);
  await page.screenshot({
    path: `test-results/victory-${phase}.png`,
    fullPage: true,
  });
  if (phase < 3) {
    await page.getByRole("button", { name: "SIGUIENTE MISIÓN" }).click();
    await page.getByRole("button", { name: /Saltar presentación/ }).click();
    assert.equal(await page.locator("#overlay").isVisible(), false);
    assert.equal(await page.locator("#overlay").innerHTML(), "");
    const next = await page.evaluate(() => window.__game.snapshot());
    assert.equal(next.phase, phase + 1);
    assert.equal(next.mode, "playing");
    assert.equal(next.paused, false);
    await page.evaluate(() => window.__game.step(0.1));
    assert.ok(
      (await page.evaluate(() => window.__game.snapshot())).elapsed >
        next.elapsed,
    );
  }
}
// Real damage, game-over and restart are separate from the invulnerable progression test.
await page.evaluate(() => {
  window.__game.god(false);
  (window.__game.command("retry"), window.__game.command("continue"));
  for (let life = 0; life < 3; life++) {
    for (let hit = 0; hit < 3; hit++) window.__game.damage();
    window.__game.fastForward(8);
  }
});
assert.equal(
  await page.evaluate(() => window.__game.snapshot().mode),
  "gameover",
);
await page.getByRole("button", { name: "OTRA VEZ, PISHA" }).click();
await page.getByRole("button", { name: /Saltar presentación/ }).click();
assert.equal(
  await page.evaluate(() => window.__game.snapshot().mode),
  "playing",
);
await page.getByRole("button", { name: "Abrir ajustes" }).click();
assert.ok(await page.locator("#settings-dialog").isVisible());
assert.ok(await page.evaluate(() => window.__game.snapshot().paused));
await page.locator("#music-volume").fill("25");
assert.equal(await page.locator("#phase-code").count(), 0);
assert.equal(await page.locator("#unlock-button").count(), 0);
await page.getByRole("button", { name: "Cerrar ajustes" }).click();
await page.waitForFunction(() => !window.__game.snapshot().paused);
assert.equal(
  await page.evaluate(() => window.__game.snapshot().settings.music),
  0.25,
);
await page.evaluate(() => window.__game.command("menu"));
await page.reload();
await page.waitForFunction(() => !!window.__game);
assert.equal(await page.evaluate(() => window.__game.snapshot().unlocked), 3);
assert.equal(
  await page.evaluate(() => window.__game.snapshot().settings.music),
  0.25,
);
// Boss composition screenshots from the actual renderer.
for (let phase = 1; phase <= 3; phase++) {
  await page.evaluate((phase) => {
    (window.__game.command("start", { phase }),
      window.__game.command("continue"));
    window.__game.boss();
    window.__game.fastForward(6);
  }, phase);
  await page.waitForTimeout(150);
  await page.screenshot({
    path: `test-results/boss-${phase}.png`,
    fullPage: true,
  });
}
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.__game.command("menu"));
await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.setViewportSize({ width: 768, height: 1024 });
await page.screenshot({ path: "test-results/tablet.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
assert.deepEqual(errors, []);
assert.deepEqual(failed, []);
assert.ok(
  !warnings.some((s) => /not found|no frame|missing|invalid|error/i.test(s)),
  warnings.join("\n"),
);
await writeFile(
  "test-results/browser-report.json",
  JSON.stringify(
    {
      campaign,
      errors,
      warnings,
      failed,
      checks: [
        "menu",
        "keyboard",
        "dialogue freeze",
        "pause",
        "four powers",
        "campaign",
        "three gods",
        "death",
        "retry",
        "settings",
        "save",
        "responsive",
      ],
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    { campaign, errors, warnings: [...new Set(warnings)], failed },
    null,
    2,
  ),
);
await browser.close();
