import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { decodeArticle, encodeArticle } from "../lib/post-document.mjs";
import { parsePost } from "../lib/posts.mjs";

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
const tick = (ms = 350) => new Promise(resolve => setTimeout(resolve, ms));
const edit = (dom, selector, value, type = "input") => {
  const field = dom.window.document.querySelector(selector);
  field.value = value;
  field.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
};

async function loadEditor(articles = list, config = {}) {
  const html = readFileSync(join(root, "writer/index.html"), "utf8");
  const script = readFileSync(join(root, "writer/app.js"), "utf8");
  const dom = new JSDOM(html, { url: "http://127.0.0.1:4173/", runScripts: "outside-only" });
  for (const [key, value] of Object.entries(config.storageEntries || {})) {
    dom.window.localStorage.setItem(key, value);
  }
  if (config.storageDisabled) {
    Object.defineProperty(dom.window, "localStorage", { get() { throw new Error("Storage disabled"); } });
  }
  const requests = config.requests || [];
  const downloads = config.downloads || [];
  dom.window.URL.createObjectURL = () => "blob:article-download";
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  dom.window.fetch = async (input, requestOptions = {}) => {
    const path = new URL(input, dom.window.location.href).pathname;
    requests.push({ path, method: requestOptions.method || "GET", headers: requestOptions.headers || {},
      body: requestOptions.body ? JSON.parse(requestOptions.body) : undefined });
    let body;
    let status = 200;
    if (path === "/api/session") body = { token: "test-token" };
    else if (path === "/api/articles" && requestOptions.method === "POST") {
      if (config.saveConflict || (config.saveConflictOnFingerprint &&
        JSON.parse(requestOptions.body).fingerprint !== (config.openFingerprint || "abc"))) {
        status = 409;
        body = { error: { code: "STALE_FILE", message: "Article changed on disk" } };
      } else {
        const articleDocument = JSON.parse(requestOptions.body).document;
        try {
          parsePost("new.md", encodeArticle(articleDocument));
          body = { name: `${articleDocument.fields.slug}.md`, fingerprint: "saved-hash" };
        } catch (error) {
          status = 422;
          body = { error: { code: "INVALID_ARTICLE", message: error.message,
            field: ["title", "date", "summary", "language", "slug", "body"].find(name => error.message.includes(name)) } };
        }
      }
    } else if (path === "/api/articles/first.md" && requestOptions.method === "PUT") {
      if (config.saveConflict || (config.saveConflictOnFingerprint &&
        JSON.parse(requestOptions.body).fingerprint !== (config.openFingerprint || "abc"))) {
        status = 409;
        body = { error: { code: "STALE_FILE", message: "Article changed on disk" } };
      } else body = { name: "first.md", fingerprint: "saved-hash" };
    }
    else if (path === "/api/articles") body = { articles };
    else if (path === "/api/articles/first.md") body = { name: "first.md", markdown: encodeArticle(article), fingerprint: config.openFingerprint || "abc" };
    else if (path === "/api/articles/broken.md") body = { name: "broken.md", markdown: broken, fingerprint: "def" };
    else if (path === "/api/parse") {
      const markdown = JSON.parse(requestOptions.body).markdown;
      if (markdown === broken) {
        status = 422;
        body = { error: { code: "INVALID_ARTICLE", message: "invalid front matter" } };
      } else body = { document: decodeArticle(markdown) };
    } else if (path === "/api/preview") {
      body = { html: `<p>${JSON.parse(requestOptions.body).markdown}</p>` };
    } else if (path === "/api/export") {
      const request = JSON.parse(requestOptions.body);
      body = { markdown: encodeArticle(request.document), filename: request.downloadName || `${request.document.fields.slug}.md` };
    } else throw new Error(`Unexpected fetch ${path}`);
    if (config.deferSaves && ["POST", "PUT"].includes(requestOptions.method) && path.startsWith("/api/articles")) {
      await new Promise(resolve => { config.releaseSave = resolve; });
    }
    return { ok: status < 400, status, json: async () => body };
  };
  dom.window.confirm = message => config.confirm ? config.confirm(message) : true;
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

test("new article suggests an English slug until the owner edits it", async () => {
  const dom = await loadEditor([]);
  try {
    const d = dom.window.document;
    assert.match(d.querySelector("#date").value, /^\d{4}-\d{2}-\d{2}$/);
    edit(dom, "#language", "en", "change");
    edit(dom, "#title", "A New Article");
    assert.equal(d.querySelector("#slug").value, "a-new-article");
    edit(dom, "#slug", "own-url");
    edit(dom, "#title", "Updated Article");
    assert.equal(d.querySelector("#slug").value, "own-url");
  } finally { dom.window.close(); }
});

test("preview updates from Markdown and renders article metadata", async () => {
  const requests = [];
  const dom = await loadEditor([], { requests });
  try {
    edit(dom, "#title", "Preview title");
    edit(dom, "#summary", "Brief introduction");
    edit(dom, "#article-body", "**Preview body**");
    await tick();
    assert.match(dom.window.document.querySelector("#preview").textContent, /Preview title/);
    assert.match(dom.window.document.querySelector("#preview").textContent, /Brief introduction/);
    assert.ok(requests.some(request => request.path === "/api/preview" && request.body.markdown === "**Preview body**"));
  } finally { dom.window.close(); }
});

test("save validates and sends draft, token, and fingerprint", async () => {
  const requests = [];
  const dom = await loadEditor(list, { requests });
  try {
    dom.window.document.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    dom.window.document.querySelector("#draft").click();
    edit(dom, "#article-body", "Changed body");
    dom.window.document.querySelector("#save-article").click();
    await tick(30);
    const saved = requests.find(request => request.path === "/api/articles/first.md" && request.method === "PUT");
    assert.equal(saved.headers["x-writer-token"], "test-token");
    assert.equal(saved.body.fingerprint, "abc");
    assert.equal(saved.body.document.fields.draft, true);
    assert.equal(saved.body.document.fields.body, "Changed body");
    assert.match(dom.window.document.querySelector("#editor-status").textContent, /提交.*推送/);
  } finally { dom.window.close(); }
});

test("new article is created with POST and invalid fields receive an error", async () => {
  const requests = [];
  const dom = await loadEditor([], { requests });
  try {
    const d = dom.window.document;
    d.querySelector("#save-article").click();
    await tick(30);
    assert.match(d.querySelector("#editor-status").textContent, /无效|必填|required/i);
    edit(dom, "#title", "A new post");
    edit(dom, "#language", "en", "change");
    edit(dom, "#slug", "a-new-post");
    edit(dom, "#summary", "Summary");
    edit(dom, "#article-body", "Body content");
    d.querySelector("#save-article").click();
    await tick(30);
    const saved = requests.filter(request => request.path === "/api/articles" && request.method === "POST").at(-1);
    assert.equal(saved.body.document.fields.slug, "a-new-post");
    assert.equal(d.querySelector("#current-file").textContent, "a-new-post.md");
  } finally { dom.window.close(); }
});

test("stale save keeps edits and offers a download", async () => {
  const dom = await loadEditor(list, { saveConflict: true });
  try {
    const d = dom.window.document;
    d.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    edit(dom, "#article-body", "Keep this edit");
    d.querySelector("#save-article").click();
    await tick(30);
    assert.equal(d.querySelector("#article-body").value, "Keep this edit");
    assert.match(d.querySelector("#editor-status").textContent, /磁盘|冲突|变化/);
  } finally { dom.window.close(); }
});

test("download exports the current body under its source filename", async () => {
  const requests = [];
  const downloads = [];
  const dom = await loadEditor(list, { requests, downloads });
  try {
    dom.window.document.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    edit(dom, "#article-body", "Downloaded content");
    dom.window.document.querySelector("#download-article").click();
    await tick(30);
    const exported = requests.find(request => request.path === "/api/export");
    assert.equal(exported.body.document.fields.body, "Downloaded content");
    assert.equal(exported.body.downloadName, "first.md");
    assert.deepEqual(downloads, ["first.md"]);
  } finally { dom.window.close(); }
});

test("import keeps unknown metadata and proposes the imported filename for download", async () => {
  const requests = [];
  const dom = await loadEditor([], { requests });
  try {
    const markdown = `---\ntitle: Imported\ndate: 2026-09-25\nsummary: An import\nlanguage: en\nslug: imported\nseries: notes\n---\nOriginal body\n`;
    const picker = dom.window.document.querySelector("#import-file");
    Object.defineProperty(picker, "files", { configurable: true, value: [new dom.window.File([markdown], "from-laptop.md", { type: "text/markdown" })] });
    picker.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await tick(50);
    assert.equal(dom.window.document.querySelector("#title").value, "Imported");
    dom.window.document.querySelector("#download-article").click();
    await tick(30);
    const exported = requests.find(request => request.path === "/api/export");
    assert.equal(exported.body.document.extraFields.series, "notes");
    assert.equal(exported.body.downloadName, "from-laptop.md");
  } finally { dom.window.close(); }
});

test("malformed import leaves the current editor content intact", async () => {
  const dom = await loadEditor([]);
  try {
    edit(dom, "#title", "Keep this title");
    const picker = dom.window.document.querySelector("#import-file");
    Object.defineProperty(picker, "files", { configurable: true, value: [new dom.window.File([broken], "bad.md")] });
    picker.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await tick(50);
    assert.equal(dom.window.document.querySelector("#title").value, "Keep this title");
    assert.match(dom.window.document.querySelector("#editor-status").textContent, /导入失败/);
  } finally { dom.window.close(); }
});

test("browser recovery restores or discards an unsaved article", async () => {
  const recovery = JSON.stringify({ fields: { ...article.fields, title: "Recovered title" }, extraFields: {}, raw: null });
  const dom = await loadEditor(list, { storageEntries: { "writer:recovery:first.md": recovery }, confirm: () => true });
  try {
    dom.window.document.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    assert.equal(dom.window.document.querySelector("#title").value, "Recovered title");
    assert.match(dom.window.document.querySelector("#editor-status").textContent, /恢复/);
  } finally { dom.window.close(); }
  const discarded = await loadEditor(list, { storageEntries: { "writer:recovery:first.md": recovery }, confirm: () => false });
  try {
    discarded.window.document.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    assert.equal(discarded.window.document.querySelector("#title").value, "First post");
  } finally { discarded.window.close(); }
});

test("recovered edits retain their original fingerprint and cannot overwrite disk changes", async () => {
  const requests = [];
  const copy = JSON.stringify({ sourceName: "first.md", fingerprint: "old-version",
    fields: { ...article.fields, body: "Recovered older edit" }, extraFields: {}, raw: null });
  const dom = await loadEditor(list, { requests, saveConflictOnFingerprint: true,
    storageEntries: { "writer:recovery:first.md": copy } });
  try {
    const d = dom.window.document;
    d.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    d.querySelector("#save-article").click();
    await tick(30);
    const request = requests.find(item => item.path === "/api/articles/first.md" && item.method === "PUT");
    assert.equal(request.body.fingerprint, "old-version");
    assert.equal(d.querySelector("#article-body").value, "Recovered older edit");
    assert.match(d.querySelector("#editor-status").textContent, /变化|冲突|磁盘/);
  } finally { dom.window.close(); }
});

test("legacy recovery without a fingerprint cannot silently replace the disk file", async () => {
  const requests = [];
  const oldCopy = JSON.stringify({ fields: { ...article.fields, title: "Legacy recovery" }, extraFields: {}, raw: null });
  const dom = await loadEditor(list, { requests, saveConflictOnFingerprint: true,
    storageEntries: { "writer:recovery:first.md": oldCopy } });
  try {
    const d = dom.window.document;
    d.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    d.querySelector("#save-article").click();
    await tick(30);
    const request = requests.find(item => item.path === "/api/articles/first.md" && item.method === "PUT");
    assert.equal(request.body.fingerprint, null);
    assert.match(d.querySelector("#editor-status").textContent, /变化|冲突|磁盘/);
  } finally { dom.window.close(); }
});

test("save response does not mark edits typed during the request as saved", async () => {
  const config = { deferSaves: true };
  const dom = await loadEditor(list, config);
  try {
    const d = dom.window.document;
    d.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    edit(dom, "#article-body", "Body sent to disk");
    d.querySelector("#save-article").click();
    await tick(20);
    edit(dom, "#article-body", "Newer unsaved body");
    d.querySelector("#new-article").click();
    assert.equal(d.querySelector("#current-file").textContent, "first.md");
    config.releaseSave();
    await tick(300);
    assert.equal(d.querySelector("#article-body").value, "Newer unsaved body");
    assert.match(d.querySelector("#editor-status").textContent, /未保存/);
    const savedCopy = JSON.parse(dom.window.localStorage.getItem("writer:recovery:first.md"));
    assert.equal(savedCopy.fields.body, "Newer unsaved body");
    assert.equal(savedCopy.fingerprint, "saved-hash");
  } finally { dom.window.close(); }
});

test("new article save moves newer recovery edits to the created filename", async () => {
  const config = { deferSaves: true };
  const dom = await loadEditor([], config);
  try {
    edit(dom, "#title", "Draft while saving");
    edit(dom, "#slug", "draft-while-saving");
    edit(dom, "#summary", "Summary");
    edit(dom, "#article-body", "First version");
    dom.window.document.querySelector("#save-article").click();
    await tick(20);
    edit(dom, "#article-body", "Second version");
    config.releaseSave();
    await tick(300);
    const copy = JSON.parse(dom.window.localStorage.getItem("writer:recovery:draft-while-saving.md"));
    assert.equal(copy.fields.body, "Second version");
    assert.equal(copy.fingerprint, "saved-hash");
    assert.equal(dom.window.localStorage.getItem("writer:recovery:new"), null);
  } finally { dom.window.close(); }
});

test("unavailable browser storage does not block editing", async () => {
  const dom = await loadEditor([], { storageDisabled: true });
  try {
    edit(dom, "#title", "Still editable");
    await tick();
    assert.equal(dom.window.document.querySelector("#title").value, "Still editable");
    assert.match(dom.window.document.querySelector("#editor-status").textContent, /恢复|自动保存/);
  } finally { dom.window.close(); }
});

test("changing an existing slug warns about its public URL", async () => {
  const dom = await loadEditor();
  try {
    dom.window.document.querySelector('[data-article-name="first.md"]').click();
    await tick(30);
    edit(dom, "#slug", "different-url");
    assert.match(dom.window.document.querySelector("#slug-warning").textContent, /地址|URL/);
  } finally { dom.window.close(); }
});

test("malformed YAML stays in raw repair mode until parsing succeeds", async () => {
  const dom = await loadEditor();
  try {
    const d = dom.window.document;
    d.querySelector('[data-article-name="broken.md"]').click();
    await tick(30);
    edit(dom, "#raw-source", encodeArticle(article));
    d.querySelector("#parse-source").click();
    await tick(30);
    assert.equal(d.querySelector("#raw-repair").hidden, true);
    assert.equal(d.querySelector("#title").value, "First post");
  } finally { dom.window.close(); }
});
