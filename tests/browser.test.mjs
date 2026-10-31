import test from "node:test";
import assert from "node:assert/strict";
import { copy } from "../frontend/copy.js";
import { browserOptions, builtSite, visit } from "./helpers/site.mjs";

test("built React site", browserOptions, async t => {
  const { browser, url } = await builtSite(t);
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();

  await t.test("home renders all six sections and published article links", async () => {
    await visit(page, url);
    assert.equal(await page.locator("html").getAttribute("lang"), "zh-CN");
    assert.deepEqual(await page.locator(".home-section h2").allTextContents(), ["About", "Blog", "Notes", "Projects", "Links", "Contact"]);
    for (const slug of ["test-post-1", "test-post-2"]) {
      const link = page.locator(`.home-post-link[href="./blog/${slug}/"]`);
      await link.waitFor();
      assert.equal(await link.count(), 1);
    }
  });

  await t.test("blog links open rendered articles", async () => {
    for (const slug of ["test-post-1", "test-post-2"]) {
      await visit(page, `${url}/blog/`);
      const link = page.locator(`.air-post[href="../blog/${slug}/"]`);
      await link.waitFor();
      const title = await link.locator("h3").innerText();
      await link.click();
      await page.locator(".air-article").waitFor();
      assert.equal(new URL(page.url()).pathname, `/blog/${slug}/`);
      assert.equal(await page.locator(".air-article h1").innerText(), title);
      assert.ok((await page.locator(".air-prose").innerText()).trim());
    }
  });

  await t.test("search dialog finds and opens a published article", async () => {
    await visit(page, url);
    await page.locator(".home-post-link").first().waitFor();
    const title = await page.locator('.home-post-link[href="./blog/test-post-1/"] span').innerText();
    await page.locator(".search-trigger").click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("combobox").fill(title);
    await page.getByRole("option", { name: title, exact: true }).click();
    await page.locator(".air-article").waitFor();
    assert.equal(new URL(page.url()).pathname, "/blog/test-post-1/");
  });

  await t.test("language toggles both ways and survives reload and navigation", async () => {
    await visit(page, url);
    for (const language of ["zh", "en", "zh", "en"]) {
      if (await page.locator(".air-app").getAttribute("data-language") !== language) await page.locator(".language-toggle").click();
      await page.waitForFunction(lang => document.documentElement.lang === lang, language === "zh" ? "zh-CN" : "en");
      assert.equal(await page.evaluate(() => localStorage.getItem("lappio-language")), language);
      assert.equal(await page.locator(".home-section-notes p").innerText(), copy[language].homeNotes);
      assert.equal(await page.locator(".language-toggle").getAttribute("aria-label"), copy[language].switchLanguage);
    }
    await page.reload();
    await page.waitForFunction(() => document.querySelector(".air-app")?.dataset.language === "en" && document.documentElement.lang === "en");
    await visit(page, `${url}/about/`);
    assert.equal(await page.locator(".air-app").getAttribute("data-language"), "en");
  });
});
