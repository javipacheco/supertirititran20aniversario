import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const requests = [],
    errors = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (/not found|missing frame/i.test(m.text())) errors.push(m.text());
  });
  await page.addInitScript(() =>
    sessionStorage.setItem("tirititran-entered", "true"),
  );
  await page.goto(`${process.env.TEST_URL ?? "http://localhost:5173"}/?test`);
  await page.waitForFunction(() => !!window.__game);
  assert.ok(
    !requests.some((r) =>
      /map[123]-|atlas-phase[123]|images\/(intro_fase[123]|final[123]|diario_fase[123])\//.test(
        r,
      ),
    ),
  );
  for (const phase of [2, 3, 1]) {
    await page.evaluate(
      (phase) => window.__game.command("start", { phase }),
      phase,
    );
    await page.waitForFunction((phase) => {
      const scene = window.__game.getScene();
      return (
        !scene.loadingPhase && scene.mode === "intro" && scene.phase === phase
      );
    }, phase);
    assert.equal(await page.locator("#loader").isVisible(), false);
    const audit = await page.evaluate((phase) => {
      const scene = window.__game.getScene(),
        missing = [];
      const images = Object.keys(scene.content.scripts).filter(
        (k) =>
          /^(intro_fase|vs_fase|diario_fase)/.test(k) &&
          k.split("/")[0].endsWith(String(phase)),
      );
      for (const key of images) {
        const script = scene.content.scripts[key];
        for (const o of script.objects?.object ?? []) {
          if (["sound", "text", "background"].includes(o.type)) continue;
          for (const file of [
            o.data?.file,
            ...(o.frames?.frame ?? []).map((f) => f.file),
          ]) {
            if (
              file &&
              !file.includes("$") &&
              !scene.textures.exists(
                `scene:${key.split("/")[0]}/${file.replace(/\.timp$/, "")}`,
              )
            )
              missing.push(file);
          }
        }
      }
      return missing;
    }, phase);
    assert.deepEqual(audit, []);
    await page.evaluate(() => window.__game.command("continue"));
    await page.waitForFunction(
      () => window.__game.snapshot().mode === "playing",
    );
    await page.evaluate(() => {
      window.__game.god(true);
      window.__game.fastForward(30);
      window.__game.command("boss");
      window.__game.command("continue");
    });
    assert.ok(requests.some((r) => r.includes(`atlas-phase${phase}.json`)));
    const count = requests.filter((r) =>
      r.includes(`atlas-phase${phase}`),
    ).length;
    await page.evaluate(
      (phase) => window.__game.command("start", { phase }),
      phase,
    );
    await page.waitForFunction(() => window.__game.snapshot().mode === "intro");
    assert.equal(
      requests.filter((r) => r.includes(`atlas-phase${phase}`)).length,
      count,
    );
  }
  assert.deepEqual(errors, []);
  // A failed phase download must not enter gameplay with missing graphics.
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.route("**/atlas-phase3.json", (r) => r.abort());
  await page.evaluate(() => window.__game.command("start", { phase: 3 }));
  await page.waitForFunction(() =>
    document.querySelector("#loader").textContent.includes("REINTENTAR"),
  );
  assert.equal(await page.locator("#loader").isVisible(), true);
  assert.notEqual(
    await page.evaluate(() => window.__game.snapshot().mode),
    "intro",
  );
  console.log(
    "Carga diferida de tres fases, presentaciones, rutas, arenas, reutilización y fallo de red: correcto.",
  );
} finally {
  await browser.close();
}
