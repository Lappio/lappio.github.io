import test from "node:test";
import assert from "node:assert/strict";
import { copy } from "../frontend/copy.js";
import { browserOptions, builtSite, visit } from "./helpers/site.mjs";

test("built React site", browserOptions, async t => {
  const { browser, url } = await builtSite(t);
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();

  await t.test("navigation never paints the legacy interface while the React bundle loads", async () => {
    for (const width of [390, 1280]) {
      const delayedContext = await browser.newContext({ viewport: { width, height: 844 } });
      try {
        const delayedPage = await delayedContext.newPage();
        let release;
        let requested;
        await delayedPage.route("**/ui/app.js", async route => {
          requested();
          await new Promise(resolve => { release = resolve; });
          await route.continue();
        });
        for (const section of ["blog", "notes", "blog"]) {
          const bundleRequested = new Promise(resolve => { requested = resolve; });
          if (new URL(delayedPage.url()).protocol === "about:") {
            await delayedPage.goto(`${url}/${section}/`, { waitUntil: "commit" });
          } else {
            const nav = width === 1280 ? ".air-desktop-nav" : ".air-mobile-nav";
            await delayedPage.locator(`${nav} a[href="../${section}/"]`).click({ noWaitAfter: true });
            await delayedPage.waitForURL(`${url}/${section}/`, { waitUntil: "commit" });
          }
          try {
            await bundleRequested;
            await delayedPage.locator("#react-root").waitFor({ state: "attached" });
            assert.equal(await delayedPage.locator("#react-root").evaluate(el => el.childElementCount), 0);
            assert.equal(await delayedPage.locator(".page-shell, .post-article, [data-static-fallback]").count(), 0);
            assert.equal(await delayedPage.locator("body").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(255, 253, 248)");
          } finally { release(); }
          await delayedPage.locator(`.air-app[data-page="${section}"]`).waitFor();
          assert.equal(await delayedPage.locator(".air-app").isVisible(), true);
          assert.equal(await delayedPage.locator("#ui-load-error").isVisible(), false);
        }
      } finally { await delayedContext.close(); }
    }
  });

  await t.test("missing JavaScript shows a useful notice, never the legacy interface", async () => {
    for (const javaScriptEnabled of [false, true]) {
      const fallbackContext = await browser.newContext({ javaScriptEnabled });
      try {
        const fallbackPage = await fallbackContext.newPage();
        if (javaScriptEnabled) await fallbackPage.route("**/ui/app.js", route => route.abort());
        await fallbackPage.goto(`${url}/blog/test-post-1/`);
        const notice = fallbackPage.locator(javaScriptEnabled ? "#ui-load-error" : "#ui-noscript");
        await notice.waitFor();
        assert.equal(await notice.locator('[lang="zh-CN"]').innerText(), javaScriptEnabled ? copy.zh.interfaceLoadError : copy.zh.enableJavaScript);
        assert.equal(await notice.locator('[lang="en"]').innerText(), javaScriptEnabled ? copy.en.interfaceLoadError : copy.en.enableJavaScript);
        assert.equal(await fallbackPage.locator(".page-shell, .post-article, [data-static-fallback]").count(), 0);
      } finally { await fallbackContext.close(); }
    }
  });

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

  await t.test("explore keeps only its small labelled heading in both languages", async () => {
    for (const language of ["zh", "en"]) {
      const exploreContext = await browser.newContext();
      try {
        await exploreContext.addInitScript(value => localStorage.setItem("lappio-language", value), language);
        const explorePage = await exploreContext.newPage();
        await visit(explorePage, `${url}/blog/`);
        const explore = explorePage.getByRole("region", { name: "A LITTLE FURTHER", exact: true });
        assert.equal(await explore.count(), 1);
        assert.equal(await explorePage.locator(".explore-heading").innerText(), "A LITTLE FURTHER");
        assert.equal(await explore.getByRole("heading", { level: 2 }).innerText(), "A LITTLE FURTHER");
      } finally { await exploreContext.close(); }
    }
  });

  await t.test("explore excludes the current section without reordering other destinations", async t => {
    const destinations = {
      blog: ["Notes", "Projects", "Links", "Contact"],
      notes: ["Blog", "Projects", "Links", "Contact"],
      projects: ["Blog", "Notes", "Links", "Contact"],
      links: ["Blog", "Notes", "Projects", "Contact"],
      contact: ["Blog", "Notes", "Projects", "Links"],
      about: ["Notes", "Projects", "Links", "Contact"],
    };
    for (const language of ["zh", "en"]) {
      const exploreContext = await browser.newContext();
      try {
        await exploreContext.addInitScript(value => localStorage.setItem("lappio-language", value), language);
        const explorePage = await exploreContext.newPage();
        for (const [section, titles] of Object.entries(destinations)) {
          await t.test(`${language} /${section}/`, async () => {
            await visit(explorePage, `${url}/${section}/`);
            const cards = explorePage.locator(".explore-card");
            assert.deepEqual(await cards.locator("h3").allTextContents(), titles);
            assert.deepEqual(await cards.evaluateAll(links => links.map(link => link.getAttribute("href"))), titles.map(title => `../${title.toLowerCase()}/`));
            assert.deepEqual(await cards.locator("p").allTextContents(), titles.map(title => title === "Blog"
              ? language === "zh" ? "个人经验分享" : "Personal experiences and reflections"
              : copy[language][`discover${title}`]));
          });
        }
        for (const path of ["", "blog/test-post-1/"]) {
          await visit(explorePage, `${url}/${path}`);
          assert.equal(await explorePage.locator(".air-explore").count(), 0);
        }
      } finally { await exploreContext.close(); }
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
      assert.equal(await page.locator(".home-section-notes .home-section-note").innerText(), copy[language].homeNotes);
      assert.equal(await page.locator(".language-toggle").getAttribute("aria-label"), copy[language].switchLanguage);
    }
    await page.reload();
    await page.waitForFunction(() => document.querySelector(".air-app")?.dataset.language === "en" && document.documentElement.lang === "en");
    await visit(page, `${url}/about/`);
    assert.equal(await page.locator(".air-app").getAttribute("data-language"), "en");
  });

  await t.test("language switching keeps the editor-hidden hero title hidden", async () => {
    await visit(page, url);
    for (const language of ["zh", "en"]) {
      if (await page.locator(".air-app").getAttribute("data-language") !== language) await page.locator(".language-toggle").click();
      await page.waitForFunction(lang => document.documentElement.lang === lang, language === "zh" ? "zh-CN" : "en");
      assert.equal(await page.locator(".notebook-hero h1:not(.sr-only)").count(), 0);
      assert.equal(await page.locator(".notebook-hero h1").innerText(), copy[language].intro);
    }
  });

  await t.test("About omits the homepage introduction while keeping the identity note", async () => {
    for (const language of ["zh", "en"]) {
      const aboutContext = await browser.newContext();
      try {
        await aboutContext.addInitScript(value => localStorage.setItem("lappio-language", value), language);
        const aboutPage = await aboutContext.newPage();
        await visit(aboutPage, url);
        assert.equal(await aboutPage.locator(".hero-description").innerText(), copy[language].aboutBody);
        await visit(aboutPage, `${url}/about/`);
        assert.equal((await aboutPage.locator("main").innerText()).includes(copy[language].aboutBody), false);
        assert.equal(await aboutPage.locator(".about-page-note p").innerText(), copy[language].notebookBody);
        assert.equal(await aboutPage.locator(".about-story-card .primary-button").getAttribute("href"), "../blog/");
      } finally { await aboutContext.close(); }
    }
  });

  await t.test("notebook composition uses manuscript and margin with working reading shortcut", async () => {
    await visit(page, url);
    assert.equal(await page.locator(".notebook-home").count(), 1);
    assert.equal(await page.locator(".notebook-manuscript").count(), 1);
    assert.equal(await page.locator(".notebook-margin .sticky-note").count(), 2);
    assert.equal(await page.locator(".home-open").getAttribute("href"), "#writing");
    await page.locator(".home-open").click();
    assert.equal(new URL(page.url()).hash, "#writing");
    const paper = await page.locator("body").evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(paper, "rgb(255, 253, 248)");
    const columns = await page.locator(".notebook-layout").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    assert.equal(columns, 2);
  });

  await t.test("notebook handles article failure, retry and a genuinely empty index", async () => {
    let failed = true;
    const pattern = "**/articles.json";
    await page.route(pattern, route => failed ? route.fulfill({ status: 503, body: "Unavailable" }) : route.continue());
    await visit(page, url);
    await page.locator(".home-retry").waitFor();
    failed = false;
    await page.locator(".home-retry").click();
    await page.locator(".home-post-link").first().waitFor();
    await page.unroute(pattern);
    await page.route(pattern, route => route.fulfill({ contentType: "application/json", body: "[]" }));
    await page.reload();
    await page.waitForFunction(() => document.querySelector(".notebook-manuscript [role=status]")?.textContent.includes("No articles") || document.querySelector(".notebook-manuscript [role=status]")?.textContent.includes("还没有"));
    assert.equal(await page.locator(".home-post-link").count(), 0);
    await page.unroute(pattern);
  });

  await t.test("search restores focus on Escape and mobile notebook stacks without motion", async () => {
    await visit(page, url);
    await page.locator(".search-trigger").click();
    await page.getByRole("combobox").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.classList.contains("search-trigger"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    const layout = await page.locator(".notebook-layout").evaluate(el => ({
      columns: getComputedStyle(el).gridTemplateColumns.split(" ").length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      animation: getComputedStyle(document.querySelector(".notebook-hero")).animationName,
    }));
    assert.deepEqual(layout, { columns: 1, overflow: false, animation: "none" });
    await page.setViewportSize({ width: 1280, height: 800 });
  });


  await t.test("article reading stays unrotated and usable on a narrow screen", async () => {
    await page.setViewportSize({ width: 320, height: 740 });
    await visit(page, `${url}/blog/test-post-1/`);
    const reading = await page.locator(".air-prose").evaluate(el => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      transform: getComputedStyle(el).transform,
      fontSize: parseFloat(getComputedStyle(el).fontSize),
    }));
    assert.equal(reading.overflow, false);
    assert.equal(reading.transform, "none");
    assert.ok(reading.fontSize >= 16);
    await page.locator(".article-end").click();
    await page.locator(".notebook-home").waitFor();
    assert.equal(new URL(page.url()).pathname, "/");
    await page.setViewportSize({ width: 1280, height: 800 });
  });

});
