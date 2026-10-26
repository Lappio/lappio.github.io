import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const script = readFileSync(join(root, "preview/preview.js"), "utf8");
const posts = [
  { title: "中文文章", date: "2026-09-24", summary: "摘要", language: "zh", slug: "first-post", url: "blog/first-post/" }
];

function pageUrl(path) {
  return `https://example.test/repository-name/${path}`;
}

async function loadPreview(path, response = []) {
  const html = readFileSync(join(root, path), "utf8");
  const dom = new JSDOM(html, { url: pageUrl(path), runScripts: "outside-only" });
  dom.window.fetch = async () => {
    if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  };
  dom.window.localStorage.setItem("lappio-language", "en");
  dom.window.eval(script);
  await new Promise(resolve => setTimeout(resolve, 0));
  return dom;
}

test("preview homes default to Chinese and keep sample contacts unmarked as real", async () => {
  for (const variant of ["a", "b", "c"]) {
    const path = `preview/${variant}/index.html`;
    const source = readFileSync(join(root, path), "utf8");
    assert.doesNotMatch(source, /hello@example\.com/);
    assert.doesNotMatch(source, /github\.com/);
    assert.doesNotMatch(source, /https?:\/\/(www\.)?are\.na/);
    assert.match(source, /TODO/);
    const dom = await loadPreview(path, []);
    try {
      const document = dom.window.document;
      assert.equal(document.documentElement.lang, "zh-CN");
      assert.equal(document.body.dataset.postsReady, "true");
      assert.match(document.querySelector("#post-feature, #post-list").textContent, /暂无文章/);
      assert.match(document.querySelector("#note-list").textContent, /凌乱初稿的价值/);
      assert.match(document.querySelector("#note-list").textContent, /示例/);
      assert.match(document.querySelector("#project-list").textContent, /开放笔记本/);
      assert.match(document.body.textContent, /邮箱还没填/);
      document.querySelector("#lang-toggle").click();
      assert.equal(document.documentElement.lang, "en");
      assert.match(document.body.textContent, /This is a place for the things/);
      assert.match(document.querySelector("#note-list").textContent, /The value of a messy first draft/);
      assert.equal(dom.window.localStorage.getItem("lappio-preview-language"), "en");
      assert.equal(dom.window.localStorage.getItem("lappio-language"), "en");
    } finally {
      dom.window.close();
    }
  }
});

test("each preview renders published posts with its own list structure", async () => {
  const expected = { a: "#post-feature a.story", b: "#post-list a.row", c: "#post-list a.slab" };
  for (const [variant, selector] of Object.entries(expected)) {
    const dom = await loadPreview(`preview/${variant}/index.html`, posts);
    try {
      const link = dom.window.document.querySelector(selector);
      assert.ok(link, `${variant} missing ${selector}`);
      assert.equal(link.getAttribute("href"), "../../blog/first-post/");
      assert.match(link.textContent, /中文文章/);
      const input = dom.window.document.querySelector("#search-input");
      input.value = "凌乱";
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      assert.match(dom.window.document.querySelector("#search-results").textContent, /凌乱初稿的价值/);
    } finally {
      dom.window.close();
    }
  }
});

test("the layout specimen stays in Chinese when the preview chrome switches", async () => {
  const dom = await loadPreview("preview/a/article/index.html", []);
  try {
    const document = dom.window.document;
    assert.match(document.querySelector("article").textContent, /不会进入正式站点/);
    assert.equal(document.querySelector("article").lang, "zh");
    document.querySelector("#lang-toggle").click();
    assert.equal(document.documentElement.lang, "en");
    assert.equal(document.querySelector("article").lang, "zh");
    assert.match(document.querySelector("article h1").textContent, /版式预览/);
    assert.match(document.body.textContent, /Back to this preview/);
  } finally {
    dom.window.close();
  }
});
