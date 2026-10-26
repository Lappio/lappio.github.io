import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const script = readFileSync(join(root, "script.js"), "utf8");
const posts = [
  { title: "中文文章", date: "2026-09-24", summary: "摘要", language: "zh", slug: "first-post", url: "blog/first-post/" },
  { title: "Second post", date: "2026-09-23", summary: "Second summary", language: "en", slug: "second-post", url: "blog/second-post/" },
  { title: "Third post", date: "2026-09-22", summary: "Third summary", language: "en", slug: "third-post", url: "blog/third-post/" },
  { title: "Fourth post", date: "2026-09-21", summary: "Fourth summary", language: "en", slug: "fourth-post", url: "blog/fourth-post/" }
];

async function loadPage(path, response = posts, preference) {
  const html = readFileSync(join(root, path), "utf8");
  const url = `https://example.test/repository-name/${path === "index.html" ? "" : path.replace(/index\.html$/, "")}`;
  const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.ResizeObserver = class { observe() {} disconnect() {} };
  if (preference) dom.window.localStorage.setItem("lappio-language", preference);
  dom.window.fetch = async () => {
    if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  };
  dom.window.eval(script);
  await new Promise(resolve => setTimeout(resolve, 0));
  return dom;
}

test("home lists the newest three published posts with article links", async () => {
  const dom = await loadPage("index.html");
  try {
    const links = [...dom.window.document.querySelectorAll("#blog-list a")];
    assert.equal(links.length, 3);
    assert.equal(links[0].textContent.includes("中文文章"), true);
    assert.equal(links[0].getAttribute("href"), "./blog/first-post/");
    assert.equal(new URL(links[0].href).pathname, "/repository-name/blog/first-post/");
  } finally {
    dom.window.close();
  }
});

test("Blog lists all articles and search opens a detail URL", async () => {
  const dom = await loadPage("blog/index.html");
  try {
    const document = dom.window.document;
    assert.equal(document.querySelectorAll("#blog-list a").length, 4);
    const input = document.querySelector("#search-input");
    input.value = "中文文章";
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    const result = document.querySelector("#search-results a");
    assert.equal(result.getAttribute("href"), "../blog/first-post/");
    assert.equal(new URL(result.href).pathname, "/repository-name/blog/first-post/");
    document.querySelector("#language-toggle").click();
    assert.equal(document.querySelector("#blog-list a h3").textContent, "中文文章");
  } finally {
    dom.window.close();
  }
});

test("empty blog shows a translated empty state", async () => {
  const dom = await loadPage("blog/index.html", []);
  try {
    const document = dom.window.document;
    assert.match(document.querySelector("#blog-list").textContent, /还没有发布文章，很快就来。/);
    document.querySelector("#language-toggle").click();
    assert.match(document.querySelector("#blog-list").textContent, /No articles yet/i);
  } finally {
    dom.window.close();
  }
});

test("unavailable or malformed index leaves other sections usable", async () => {
  for (const response of [new Error("offline"), { invalid: true }]) {
    const dom = await loadPage("index.html", response);
    try {
      const document = dom.window.document;
      assert.match(document.querySelector("#blog-list").textContent, /文章暂时无法加载/);
      assert.ok(document.querySelector("#notes-list").textContent.length > 0);
      assert.ok(document.querySelector("#projects-list").textContent.length > 0);
      document.querySelector("#language-toggle").click();
      assert.match(document.querySelector("#blog-list").textContent, /Articles are unavailable/i);
    } finally {
      dom.window.close();
    }
  }
});

test("article page retains its source language and uses project-relative links", async () => {
  const template = readFileSync(join(root, "_includes/post.njk"), "utf8")
    .replaceAll("{{ title }}", "An English article")
    .replaceAll("{{ language }}", "en")
    .replace("{{ content | safe }}", "<p>The article body stays in English.</p>");
  const dom = new JSDOM(template, {
    url: "https://example.test/repository-name/blog/first-post/",
    runScripts: "outside-only"
  });
  try {
    dom.window.fetch = async () => ({ ok: true, json: async () => posts });
    dom.window.eval(script);
    await new Promise(resolve => setTimeout(resolve, 0));
    const document = dom.window.document;
    assert.equal(document.querySelector(".desktop-nav a").getAttribute("aria-current"), "page");
    assert.equal(new URL(document.querySelector(".brand").href).pathname, "/repository-name/");
    document.querySelector("#language-toggle").click();
    assert.equal(document.querySelector("article").lang, "en");
    assert.match(document.querySelector("article").textContent, /The article body stays in English/);
    assert.match(document.title, /An English article/);
  } finally {
    dom.window.close();
  }
});


test("Chinese is the static and runtime default; saved English and both toggle directions work", async () => {
  for (const page of ["index.html", ...["blog", "notes", "projects", "links", "about", "contact"].map(name => `${name}/index.html`)]) {
    assert.match(readFileSync(join(root, page), "utf8"), /<html lang="zh-CN">/);
    for (const preference of [undefined, "en", "zh"]) {
      const dom = await loadPage(page, posts, preference);
      try {
        const { document, localStorage } = dom.window;
        const initial = preference === "en" ? "en" : "zh-CN";
        assert.equal(document.documentElement.lang, initial);
        const toggle = document.querySelector("#language-toggle");
        toggle.click();
        assert.equal(document.documentElement.lang, initial === "en" ? "zh-CN" : "en");
        assert.equal(localStorage.getItem("lappio-language"), initial === "en" ? "zh" : "en");
        toggle.click();
        assert.equal(document.documentElement.lang, initial);
      } finally { dom.window.close(); }
    }
  }
});
