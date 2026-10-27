import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync, createReadStream } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const executablePath = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .find(path => path && existsSync(path));

test("mobile navigation reflows without page overflow", {
  skip: executablePath ? false : "Layout cases skipped: Chrome not found (CHROME_PATH, /usr/bin/google-chrome, /usr/bin/chromium)."
}, async t => {
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
  const server = createServer((request, response) => {
    let path = resolve(root, `.${new URL(request.url, "http://localhost").pathname}`);
    if (!path.startsWith(root + sep) && path !== root) { response.writeHead(403).end(); return; }
    try {
      if (statSync(path).isDirectory()) path = resolve(path, "index.html");
      if (!statSync(path).isFile()) throw new Error("Not a file");
      response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
      createReadStream(path).pipe(response);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  let cases = 0;
  const measurements = [];
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
    for (const width of [320, 375, 390]) {
      for (const language of ["zh", "en"]) {
        const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: "reduce" });
        await context.addInitScript(value => localStorage.setItem("lappio-language", value), language);
        const page = await context.newPage();
        try {
          for (const route of ["", "blog/", "notes/", "projects/", "links/", "about/", "contact/"]) {
            await t.test(`${width}px ${language} /${route}`, async () => {
              await page.goto(`http://127.0.0.1:${server.address().port}/${route}`);
              await page.evaluate(() => document.fonts.ready);
              const geometry = await page.evaluate(() => {
                const nav = document.querySelector(".mobile-nav");
                const rect = nav.getBoundingClientRect();
                return {
                  pageWidth: document.documentElement.scrollWidth, viewport: innerWidth,
                  client: nav.clientWidth, scroll: nav.scrollWidth, left: nav.scrollLeft,
                  end: nav.hasAttribute("data-overflow-end"), start: nav.hasAttribute("data-overflow-start"),
                  current: (() => {
                    const r = nav.querySelector('[aria-current]').getBoundingClientRect();
                    const startFade = nav.hasAttribute("data-overflow-start") ? 18 : 0;
                    const endFade = nav.hasAttribute("data-overflow-end") ? 18 : 0;
                    return r.left >= rect.left + startFade - 1 && r.right <= rect.right - endFade + 1;
                  })(),
                  links: [...nav.querySelectorAll("a")].map(a => {
                    const r = a.getBoundingClientRect();
                    return { left: r.left, right: r.right, top: r.top, height: r.height, font: parseFloat(getComputedStyle(a).fontSize) };
                  })
                };
              });
              assert.ok(geometry.pageWidth <= geometry.viewport, JSON.stringify(geometry));
              assert.equal(geometry.links.length, 7);
              assert.ok(geometry.current, "current link is fully clear of nav fades on load");
              for (const [i, link] of geometry.links.entries()) {
                assert.equal(link.top, geometry.links[0].top, "single line");
                assert.ok(link.height >= 32 && link.font >= 13, "comfortable tap targets and text");
                if (i) assert.ok(link.left >= geometry.links[i - 1].right + 3.9, "links have a visible gap");
                // Move every pill fully into the nav viewport, then verify its reachability.
                assert.ok(await page.evaluate(index => {
                  const nav = document.querySelector(".mobile-nav");
                  const link = nav.querySelectorAll("a")[index];
                  const n = nav.getBoundingClientRect();
                  const r = link.getBoundingClientRect();
                  nav.scrollLeft += r.left - n.left;
                  const after = link.getBoundingClientRect();
                  return after.left >= n.left - 1 && after.right <= n.right + 1;
                }, i), `link ${i} reachable`);
              }
              if (!route) {
                measurements.push(`${width}px ${language}: ${geometry.scroll}px content / ${geometry.client}px viewport`);
                if (width === 320 && language === "en") {
                  assert.ok(geometry.end, "end hint on initial home nav");
                  await page.evaluate(() => { const nav = document.querySelector(".mobile-nav"); nav.scrollLeft = nav.scrollWidth; });
                  await page.waitForFunction(() => !document.querySelector(".mobile-nav").hasAttribute("data-overflow-end"));
                  assert.ok(await page.locator(".mobile-nav").evaluate(nav => nav.hasAttribute("data-overflow-start")));
                  await page.evaluate(() => { document.querySelector(".mobile-nav").scrollLeft = 0; });
                  await page.waitForFunction(() => !document.querySelector(".mobile-nav").hasAttribute("data-overflow-start"));
                }
              }
              if (geometry.scroll <= geometry.client) assert.ok(!geometry.start && !geometry.end, "no hints when nav fits");
              cases++;
            });
          }
        } finally { await context.close(); }
      }
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    t.diagnostic(`Layout cases ran (not skipped): ${cases}`);
    for (const measurement of measurements) t.diagnostic(measurement);
  }
});
