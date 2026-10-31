import test from "node:test";
import assert from "node:assert/strict";
import { browserOptions, builtSite, visit } from "./helpers/site.mjs";

test("React navigation fits the viewport", browserOptions, async t => {
  const { browser, url } = await builtSite(t);
  for (const width of [320, 390, 1280]) {
    for (const language of ["zh", "en"]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: "reduce" });
      try {
        await context.addInitScript(value => localStorage.setItem("lappio-language", value), language);
        const page = await context.newPage();
        for (const route of ["", "about/", "blog/", "notes/", "projects/", "links/", "contact/"]) {
          await t.test(`${width}px ${language} /${route}`, async () => {
            await visit(page, `${url}/${route}`);
            await page.evaluate(() => document.fonts.ready);
            const nav = page.locator(width === 1280 ? ".air-desktop-nav" : ".air-mobile-nav");
            assert.equal(await nav.isVisible(), true);
            const geometry = await nav.evaluate(nav => {
              const rect = nav.getBoundingClientRect();
              return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
                left: rect.left, right: rect.right, client: nav.clientWidth, scroll: nav.scrollWidth,
                links: [...nav.querySelectorAll("a")].map(a => ({ href: new URL(a.href).pathname, text: a.textContent })) };
            });
            assert.ok(geometry.pageWidth <= width, JSON.stringify(geometry));
            assert.ok(geometry.left >= -1 && geometry.right <= width + 1, JSON.stringify(geometry));
            for (const link of await nav.locator("a").all()) {
              await link.scrollIntoViewIfNeeded();
              const bounds = await link.boundingBox();
              assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1, "nav link is reachable within viewport");
            }
            assert.deepEqual(geometry.links.map(link => link.href), ["/about/", "/blog/", "/notes/", "/projects/", "/links/", "/contact/"]);
            if (route) assert.equal(await nav.locator('[aria-current="page"]').getAttribute("href"), `../${route}`);
          });
        }
      } finally { await context.close(); }
    }
  }
});
