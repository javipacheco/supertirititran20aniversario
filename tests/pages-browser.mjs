import { chromium } from "playwright";
import assert from "node:assert/strict";

// Run against npm run preview, or a static server under a repository subfolder.
const url = process.env.TEST_URL ?? "http://localhost:4173/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
  const failures = [], external = [], errors = [];
  page.on("response", (r) => { if (r.status() >= 400) failures.push(r.url()); });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    // Blob URLs refer to local decoded resources, not another server.
    if (new URL(r.url()).origin !== new URL(url).origin) external.push(r.url());
  });
  for (const phase of [1, 2, 3]) {
    await page.goto(url, { waitUntil: "networkidle" });
    if (await page.locator("#anniversary-enter").isVisible())
      await page.locator("#anniversary-enter").click();
    await page.locator("#start-phase").selectOption(String(phase));
    await page.locator('[data-action="start"]').click();
    await page.getByRole("button", { name: /Saltar presentación/ }).click({ timeout: 30000 });
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#loader").isVisible(), false);
    assert.equal(await page.evaluate(() => typeof window.__game), "undefined");
  }
  assert.deepEqual(failures, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log("Producción estática: las tres fases cargan y arrancan sin errores ni peticiones externas.");
} finally {
  await browser.close();
}
