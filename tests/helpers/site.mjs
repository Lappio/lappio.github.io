import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, statSync, createReadStream } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const executablePath = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .find(path => path && existsSync(path));
export const browserOptions = {
  skip: executablePath ? false : "Browser cases skipped: Chrome not found (CHROME_PATH, /usr/bin/google-chrome, /usr/bin/chromium)."
};

// Each browser suite gets one fresh, isolated build, reused by all its cases.
export async function builtSite(t) {
  const project = mkdtempSync(join(tmpdir(), "lappio-browser-"));
  let server;
  let browser;
  t.after(async () => {
    try { await browser?.close(); }
    finally {
      try { if (server?.listening) await new Promise(resolve => server.close(resolve)); }
      finally { rmSync(project, { recursive: true, force: true }); }
    }
  });
  for (const path of ["package.json", "eleventy.config.js", "articles.11ty.js", "index.html",
    "styles.css", "favicon.svg", ".nojekyll", "assets", "_includes", "lib", "scripts",
    "about", "blog", "notes", "links", "projects", "contact", "frontend",
    "vite.config.js", "components.json", "jsconfig.json"]) {
    cpSync(join(root, path), join(project, path), { recursive: true });
  }
  // Use real published posts as a stable fixture, independent of other working content.
  mkdirSync(join(project, "content/posts"), { recursive: true });
  for (const path of ["posts.11tydata.js", "test-post-1.md", "test-post-2.md"]) {
    cpSync(join(root, "content/posts", path), join(project, "content/posts", path));
  }
  symlinkSync(join(root, "node_modules"), join(project, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  execFileSync(process.execPath, [join(project, "scripts/build.mjs")], { cwd: project, stdio: "pipe" });
  const output = join(project, "_site");
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp" };
  server = createServer((request, response) => {
    let path = resolve(output, `.${new URL(request.url, "http://localhost").pathname}`);
    if (!path.startsWith(output + sep) && path !== output) { response.writeHead(403).end(); return; }
    try {
      if (statSync(path).isDirectory()) path = join(path, "index.html");
      if (!statSync(path).isFile()) throw new Error("Not a file");
      response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
      createReadStream(path).pipe(response);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
  return { browser, url: `http://127.0.0.1:${server.address().port}` };
}

export async function visit(page, url) {
  await page.goto(url);
  await page.locator(".air-app").waitFor();
  await page.waitForFunction(() => document.documentElement.lang ===
    (document.querySelector(".air-app").dataset.language === "en" ? "en" : "zh-CN"));
}
