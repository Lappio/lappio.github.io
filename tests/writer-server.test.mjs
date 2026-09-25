import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startWriterServer } from "../scripts/writer-server.mjs";
import { encodeArticle } from "../lib/post-document.mjs";

function document(slug = "first-post") {
  return {
    fields: { title: "First post", date: "2026-09-25", summary: "Summary", language: "en", slug,
      draft: false, body: "Hello **world**.\n" },
    extraFields: { series: "Notebook" }
  };
}

async function withServer(check) {
  const base = mkdtempSync(join(tmpdir(), "lappio-writer-http-"));
  const postsDirectory = join(base, "posts");
  mkdirSync(postsDirectory);
  const writer = await startWriterServer({ postsDirectory, port: 0 });
  try {
    const response = await fetch(`${writer.url}/api/session`);
    const { token } = await response.json();
    await check({ ...writer, token, postsDirectory });
  } finally {
    await writer.close();
    rmSync(base, { recursive: true, force: true });
  }
}

function postJson(writer, path, body, options = {}) {
  return fetch(`${writer.url}${path}`, {
    method: options.method || "POST",
    headers: { "content-type": "application/json", "x-writer-token": options.token ?? writer.token,
      ...(options.origin ? { origin: options.origin } : {}) },
    body: JSON.stringify(body)
  });
}

test("list, open, parse, and export preserve an existing article without writing", async () => {
  await withServer(async writer => {
    const original = encodeArticle(document());
    writeFileSync(join(writer.postsDirectory, "first.md"), original);
    const listed = await (await fetch(`${writer.url}/api/articles`)).json();
    assert.equal(listed.articles[0].name, "first.md");
    const opened = await (await fetch(`${writer.url}/api/articles/first.md`)).json();
    assert.equal(opened.markdown, original);
    assert.match(opened.fingerprint, /^[a-f0-9]{64}$/);

    const parsed = await (await postJson(writer, "/api/parse", { markdown: original, source: "first.md" })).json();
    assert.equal(parsed.document.fields.date, "2026-09-25");
    assert.equal(parsed.document.extraFields.series, "Notebook");
    const exported = await (await postJson(writer, "/api/export", {
      document: parsed.document, sourceName: "first.md", downloadName: "my-notes.md"
    })).json();
    assert.equal(exported.filename, "my-notes.md");
    assert.equal(exported.markdown, original);
    assert.deepEqual(readdirSync(writer.postsDirectory), ["first.md"]);
    assert.equal(readFileSync(join(writer.postsDirectory, "first.md"), "utf8"), original);
  });
});

test("preview escapes HTML and keeps template-looking code literal", async () => {
  await withServer(async writer => {
    const response = await postJson(writer, "/api/preview", {
      markdown: "<script>alert(1)</script>\n\n~~~js\n{{ example }}\n~~~"
    });
    assert.equal(response.status, 200);
    const { html } = await response.json();
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /\{\{ example \}\}/);
    assert.doesNotMatch(html, /<script>/);
  });
});

test("only authorized local requests can save", async () => {
  await withServer(async writer => {
    const badToken = await postJson(writer, "/api/articles", { document: document() }, { token: "wrong" });
    assert.equal(badToken.status, 403);
    const badOrigin = await postJson(writer, "/api/articles", { document: document() }, { origin: "https://elsewhere.test" });
    assert.equal(badOrigin.status, 403);
    assert.deepEqual(readdirSync(writer.postsDirectory), []);

    const saved = await postJson(writer, "/api/articles", { document: document() });
    assert.equal(saved.status, 201);
    const { name, fingerprint } = await saved.json();
    assert.equal(name, "first-post.md");
    const revised = await postJson(writer, `/api/articles/${name}`, {
      fingerprint, document: document("revised")
    }, { method: "PUT" });
    assert.equal(revised.status, 200);
    assert.equal((await revised.json()).name, name);
  });
});

test("invalid input returns structured errors and large requests are rejected", async () => {
  await withServer(async writer => {
    const invalid = await postJson(writer, "/api/export", { document: document("Bad Slug") });
    assert.equal(invalid.status, 422);
    assert.equal((await invalid.json()).error.field, "slug");
    const unsafeName = await postJson(writer, "/api/export", { document: document(), downloadName: "../outside.md" });
    assert.equal(unsafeName.status, 400);
    const large = await postJson(writer, "/api/parse", { markdown: "x".repeat(1024 * 1024 + 1) });
    assert.equal(large.status, 413);
    assert.equal((await large.json()).error.code, "TOO_LARGE");
    assert.equal((await fetch(`${writer.url}/api/git/push`)).status, 404);
    assert.equal((await fetch(`${writer.url}/api/articles/first.md`, { method: "DELETE" })).status, 404);
  });
});

test("parse route rejects executable front matter without running it", async () => {
  await withServer(async writer => {
    const markdown = "---javascript\n({ title: (globalThis.__writerServerProbe = true) })\n---\nBody";
    try {
      const response = await postJson(writer, "/api/parse", { markdown });
      assert.equal(response.status, 422);
      assert.equal(globalThis.__writerServerProbe, undefined);
    } finally {
      delete globalThis.__writerServerProbe;
    }
  });
});
