import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWriterStore } from "../lib/writer-store.mjs";
import { decodeArticle, encodeArticle } from "../lib/post-document.mjs";

function document(slug = "first-post", draft = false) {
  return {
    fields: {
      title: "First post", date: "2026-09-25", summary: "A short summary",
      language: "en", slug, draft, body: "Hello **world**.\n"
    },
    extraFields: { series: "Notebook" }
  };
}

function withDirectory(check) {
  const base = mkdtempSync(join(tmpdir(), "lappio-writer-store-"));
  const posts = join(base, "posts");
  mkdirSync(posts);
  try {
    check({ base, posts, store: createWriterStore(posts) });
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

test("list includes drafts and malformed files, and open preserves raw source", () => {
  withDirectory(({ posts, store }) => {
    writeFileSync(join(posts, "first.md"), encodeArticle(document()));
    writeFileSync(join(posts, "draft.md"), encodeArticle(document("private-post", true)));
    const broken = "---\ntitle: [bad\n---\nOriginal text";
    writeFileSync(join(posts, "broken.md"), broken);
    const entries = store.listArticles();
    assert.equal(entries.length, 3);
    assert.equal(entries.find(item => item.name === "draft.md").draft, true);
    assert.match(entries.find(item => item.name === "broken.md").error, /front matter/i);
    const opened = store.openArticle("broken.md");
    assert.equal(opened.markdown, broken);
    assert.match(opened.fingerprint, /^[a-f0-9]{64}$/);
  });
});

test("prepare validates without writing and save creates then updates the opened filename", () => {
  withDirectory(({ posts, store }) => {
    const initial = document();
    const prepared = store.prepareArticle({ document: initial });
    assert.equal(decodeArticle(prepared.markdown).extraFields.series, "Notebook");
    assert.equal(readdirSync(posts).length, 0);

    const saved = store.saveArticle({ document: initial });
    assert.equal(saved.name, "first-post.md");
    assert.match(saved.fingerprint, /^[a-f0-9]{64}$/);
    const changed = document("revised-post");
    changed.fields.title = "Revised post";
    const updated = store.saveArticle({ name: saved.name, fingerprint: saved.fingerprint, document: changed });
    assert.equal(updated.name, saved.name);
    assert.notEqual(updated.fingerprint, saved.fingerprint);
    assert.equal(readdirSync(posts).length, 1);
    assert.equal(decodeArticle(readFileSync(join(posts, saved.name), "utf8")).fields.slug, "revised-post");
  });
});

test("duplicate slugs and existing filenames cannot be replaced by a new save", () => {
  withDirectory(({ posts, store }) => {
    writeFileSync(join(posts, "other.md"), encodeArticle(document("taken", true)));
    assert.throws(() => store.prepareArticle({ document: document("taken") }),
      error => error.code === "DUPLICATE_SLUG" && /other\.md/.test(error.message));

    writeFileSync(join(posts, "collision.md"), encodeArticle(document("different")));
    assert.throws(() => store.saveArticle({ document: document("collision") }),
      error => error.code === "FILE_EXISTS");
    assert.equal(decodeArticle(readFileSync(join(posts, "collision.md"), "utf8")).fields.slug, "different");
  });
});

test("stale editor save leaves an externally changed file untouched", () => {
  withDirectory(({ posts, store }) => {
    writeFileSync(join(posts, "first.md"), encodeArticle(document()));
    const opened = store.openArticle("first.md");
    const changedByAnotherProgram = encodeArticle(document("outside-change"));
    writeFileSync(join(posts, "first.md"), changedByAnotherProgram);
    assert.throws(() => store.saveArticle({ name: "first.md", fingerprint: opened.fingerprint, document: document("editor-change") }),
      error => error.code === "STALE_FILE");
    assert.equal(readFileSync(join(posts, "first.md"), "utf8"), changedByAnotherProgram);
  });
});

test("traversal and symlink targets are rejected without changing outside files", () => {
  withDirectory(({ base, posts, store }) => {
    const outside = join(base, "outside.md");
    writeFileSync(outside, "Do not change me");
    symlinkSync(outside, join(posts, "link.md"));
    assert.throws(() => store.openArticle("link.md"), error => error.code === "UNSAFE_TARGET");
    assert.throws(() => store.saveArticle({ name: "../outside.md", fingerprint: "x", document: document() }),
      error => error.code === "BAD_NAME");
    assert.throws(() => store.saveArticle({ name: "link.md", fingerprint: "x", document: document() }),
      error => error.code === "UNSAFE_TARGET");
    assert.equal(readFileSync(outside, "utf8"), "Do not change me");
  });
});
