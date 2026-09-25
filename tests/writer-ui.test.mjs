import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { decodeArticle, encodeArticle } from "../lib/post-document.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const article = {
  fields: { title: "First post", date: "2026-09-25", summary: "A short summary",
    language: "en", slug: "first-post", draft: false, body: "Hello **world**.\n" },
  extraFields: {}
};
const list = [
  { name: "first.md", title: "First post", date: "2026-09-25", language: "en", slug: "first-post", draft: false },
  { name: "second.md", title: "Second draft", date: "2026-09-24", language: "zh", slug: "second", draft: true },
  { name: "broken.md", title: "broken.md", date: "", language: "", slug: "", draft: false, error: "invalid front matter" }
];
const broken = "---\ntitle: [bad\n---\nKeep this raw source";

async function loadEditor(articles = list) {
  const html = readFileSync(join(root, "writer/index.html"), "utf8");
  const script = readFileSync(join(root, "writer/app.js"), "utf8");
  const dom = new JSDOM(html, { url: "http://127.0.0.1:4173/", runScripts: "outside-only" });
  dom.window.fetch = async (input, options = {}) => {
    const path = new URL(input, dom.window.location.href).pathname;
    let body;
    let status = 200;
    if (path === "/api/session") body = { token: "test-token" };
    else if (path === "/api/articles") body = { articles };
    else if (path === "/api/articles/first.md") body = { name: "first.md", markdown: encodeArticle(article), fingerprint: "abc" };
    else if (path === "/api/articles/broken.md") body = { name: "broken.md", markdown: broken, fingerprint: "def" };
    else if (path === "/api/parse") {
      const markdown = JSON.parse(options.body).markdown;
      if (markdown === broken) {
        status = 422;
        body = { error: { code: "INVALID_ARTICLE", message: "invalid front matter" } };
      } else body = { document: decodeArticle(markdown) };
    } else throw new Error(`Unexpected fetch ${path}`);
    return { ok: status < 400, status, json: async () => body };
  };
  dom.window.confirm = () => true;
  dom.window.eval(script);
  await new Promise(resolve => setTimeout(resolve, 20));
  return dom;
}

test("editor has structured fields, local actions, and a preview region", async () => {
  const dom = await loadEditor();
  try {
    const { document } = dom.window;
    for (const id of ["article-list", "article-search", "article-filter", "article-form", "article-body",
      "preview", "new-article", "import-file", "save-article", "download-article",
      "title", "date", "summary", "language", "slug", "draft"]) {
      assert.ok(document.getElementById(id), `${id} missing`);
    }
    assert.equal(document.querySelectorAll("#article-list [data-article-name]").length, 3);
    assert.match(document.querySelector('[data-article-name="second.md"]').textContent, /草稿/);
    assert.match(document.querySelector('[data-article-name="broken.md"]').textContent, /需修复/);
  } finally {
    dom.window.close();
  }
});

test("search and draft filter narrow the local article list", async () => {
  const dom = await loadEditor();
  try {
    const { document, Event } = dom.window;
    document.querySelector("#article-search").value = "second";
    document.querySelector("#article-search").dispatchEvent(new Event("input", { bubbles: true }));
    assert.equal(document.querySelectorAll("#article-list [data-article-name]").length, 1);
    document.querySelector("#article-search").value = "";
    document.querySelector("#article-search").dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#article-filter").value = "draft";
    document.querySelector("#article-filter").dispatchEvent(new Event("change", { bubbles: true }));
    assert.equal(document.querySelectorAll("#article-list [data-article-name]").length, 1);
    assert.equal(document.querySelector("#article-list [data-article-name]").dataset.articleName, "second.md");
  } finally {
    dom.window.close();
  }
});

test("opening an existing article fills the form and malformed YAML enters repair mode", async () => {
  const dom = await loadEditor();
  try {
    const { document } = dom.window;
    document.querySelector('[data-article-name="first.md"]').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(document.querySelector("#title").value, "First post");
    assert.equal(document.querySelector("#article-body").value, "Hello **world**.\n");
    assert.match(document.querySelector("#editor-status").textContent, /first\.md/);

    document.querySelector('[data-article-name="broken.md"]').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(document.querySelector("#raw-source").value, broken);
    assert.equal(document.querySelector("#raw-repair").hidden, false);
  } finally {
    dom.window.close();
  }
});

test("empty list and mobile panel tabs keep editor text", async () => {
  const dom = await loadEditor([]);
  try {
    const { document } = dom.window;
    assert.match(document.querySelector("#article-list").textContent, /还没有文章/);
    document.querySelector("#article-body").value = "Unfinished paragraph";
    document.querySelector('[data-panel="preview"]').click();
    assert.equal(document.querySelector('[data-panel="preview"]').getAttribute("aria-selected"), "true");
    assert.equal(document.querySelector("#article-body").value, "Unfinished paragraph");
  } finally {
    dom.window.close();
  }
});
