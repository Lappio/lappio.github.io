import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validatePublicUsage } from "../lib/public-usage.mjs";
import { browserOptions, builtSite, visit } from "./helpers/site.mjs";

const snapshot = () => JSON.parse(readFileSync(new URL("../frontend/data/usage.json", import.meta.url), "utf8"));

test("homepage usage snapshot contains only valid public aggregates", () => {
  const data = snapshot();
  assert.equal(validatePublicUsage(data), data);
  for (const change of [
    value => { value.source = "/private/database.db"; },
    value => { value.totals.tokens = -1; },
    value => { value.totals.cacheHitRate = 1.1; },
    value => { value.days["2026-02-30"] = { tokens: 0, requests: 0, cost: 0, newInputTokens: 0 }; },
    value => { value.range.start = "2000-01-01"; },
    value => { value.days[Object.keys(value.days)[0]].model = "private metadata"; },
  ]) {
    const invalid = structuredClone(data);
    change(invalid);
    assert.throws(() => validatePublicUsage(invalid), /公开数据无效/);
  }
  const empty = { generatedAt: new Date().toISOString(), range: { start: null, end: null },
    totals: Object.fromEntries(Object.keys(data.totals).map(key => [key, 0])), days: {} };
  assert.equal(validatePublicUsage(empty), empty);
});

test("homepage embeds the bilingual usage card with responsive interactions", browserOptions, async t => {
  const { browser, url } = await builtSite(t);
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await visit(page, url);
  const card = page.locator(".home-usage .uh-root");
  await card.waitFor();
  assert.equal(await page.locator("#home-usage-title").innerText(), "用量总览");
  const position = await page.evaluate(() => {
    const hero = document.querySelector(".notebook-hero").getBoundingClientRect();
    const usage = document.querySelector(".home-usage").getBoundingClientRect();
    const blog = document.querySelector("#writing").getBoundingClientRect();
    return hero.bottom <= usage.top && usage.bottom <= blog.top;
  });
  assert.equal(position, true);
  assert.equal(await card.locator(".uh-stat").count(), 4);
  const values = await card.locator(".uh-stat-value").allTextContents();
  assert.equal(values[0].trim(), `$${new Intl.NumberFormat("en-US").format(snapshot().totals.cost)}`);
  assert.equal(values[1].trim(), new Intl.NumberFormat("en-US").format(snapshot().totals.requests));
  assert.equal(await page.locator(".language-toggle").count(), 1);
  assert.equal(await page.locator(".home-usage button").filter({ hasText: /EN|中文/ }).count(), 0);

  await page.locator(".language-toggle").click();
  assert.equal(await page.locator("#home-usage-title").innerText(), "Usage overview");
  assert.deepEqual(await card.locator(".uh-stat-label > span:first-child").allTextContents(),
    ["Total cost", "Requests", "Tokens processed", "Cache hit rate"]);
  assert.equal(await card.locator(".uh-weekday").first().innerText(), "Mon");
  assert.match(await card.locator(".uh-range-stats").first().innerText(), /tokens/);
  assert.deepEqual(await card.locator(".uh-stat-value").allTextContents(), values);
  const toggle = card.locator(".uh-toggle");
  assert.equal(await toggle.getAttribute("aria-label"), "Collapse the usage heatmap");
  await toggle.focus();
  await page.keyboard.press("Enter");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await card.locator(".uh-body").evaluate(el => el.inert), true);
  await page.keyboard.press("Enter");
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await page.waitForFunction(() => Number(document.querySelector(".uh-snake-head").getAttribute("r")) > 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".uh-body")).transitionDuration === "0s");
  assert.equal(await card.locator(".uh-snake-layer").isVisible(), false);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForFunction(() => {
      const chart = document.querySelector(".uh-chart");
      return chart.scrollLeft > 0;
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await card.locator(".uh-stats").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length), 2);
    assert.equal(await card.locator(".uh-weekdays").evaluate(el => getComputedStyle(el).position), "sticky");
    const day = card.locator(".uh-cell:not(.is-empty)").last();
    await day.focus();
    const tooltip = card.locator('[role="tooltip"]');
    await tooltip.waitFor({ state: "visible" });
    assert.match(await tooltip.innerText(), /tokens.*requests/);
    // Resize events may follow setViewportSize; keep the same focused date
    // and wait for its existing top-layer tooltip to finish repositioning.
    await page.waitForFunction(() => {
      const tip = document.querySelector('[role="tooltip"]');
      if (!tip) return false;
      const bounds = tip.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth;
    });
    const bounds = await tooltip.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, JSON.stringify({ width, bounds }));
  }
  await page.locator(".language-toggle").click();
  assert.equal(await page.locator("#home-usage-title").innerText(), "用量总览");
  assert.equal(await card.locator(".uh-weekday").first().innerText(), "周一");
  await visit(page, `${url}/blog/`);
  assert.equal(await page.locator(".uh-root").count(), 0);
  assert.deepEqual(errors, []);
});
