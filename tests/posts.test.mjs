import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPosts } from "../lib/posts.mjs";

const firstPost = `---
title: First post
date: "2026-09-24"
summary: A short summary
language: en
slug: first-post
---

Hello **world**.
`;

function withPosts(files, check) {
  const directory = mkdtempSync(join(tmpdir(), "lappio-posts-"));
  try {
    for (const [name, contents] of Object.entries(files)) {
      writeFileSync(join(directory, name), contents);
    }
    check(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("an empty posts directory produces no articles", () => {
  withPosts({}, directory => assert.deepEqual(readPosts(directory), []));
});

test("valid posts retain body and drafts and sort by date then slug", () => {
  const newer = firstPost.replace("First post", "Another post").replace("first-post", "another-post");
  const olderDraft = firstPost.replace("2026-09-24", "2026-09-01")
    .replace("slug: first-post", "slug: older-draft\ndraft: true");
  withPosts({ "first.md": firstPost, "another.md": newer, "older.md": olderDraft }, directory => {
    const posts = readPosts(directory);
    assert.deepEqual(posts.map(post => post.slug), ["another-post", "first-post", "older-draft"]);
    assert.equal(posts[1].date, "2026-09-24");
    assert.match(posts[1].body, /Hello \*\*world\*\*\./);
    assert.equal(posts[2].draft, true);
    assert.equal(posts[0].draft, false);
  });
});

test("missing or malformed article fields identify the source", async t => {
  const cases = [
    ["title", firstPost.replace("title: First post\n", ""), /bad\.md.*title/i],
    ["body", firstPost.replace("Hello **world**.", "  "), /bad\.md.*body/i],
    ["language", firstPost.replace("language: en", "language: fr"), /bad\.md.*language/i],
    ["draft", firstPost.replace("slug: first-post", "slug: first-post\ndraft: yes"), /bad\.md.*draft/i],
    ["date", firstPost.replace("2026-09-24", "2026-02-30"), /bad\.md.*date.*2026-02-30/i],
    ["slug", firstPost.replace("slug: first-post", "slug: ../admin"), /bad\.md.*slug/i],
  ];
  for (const [name, contents, expected] of cases) {
    await t.test(name, () => withPosts({ "bad.md": contents }, directory => {
      assert.throws(() => readPosts(directory), expected);
    }));
  }
});

test("a draft and a published article may not share a slug", () => {
  const draft = firstPost.replace("title: First post", "title: Hidden post")
    .replace("slug: first-post", "slug: first-post\ndraft: true");
  withPosts({ "first.md": firstPost, "draft.md": draft }, directory => {
    assert.throws(() => readPosts(directory), /duplicate.*slug.*first-post/i);
  });
});

test("metadata with surrounding whitespace is rejected before publishing", () => {
  for (const [field, line] of [
    ["slug", 'slug: " first-post "'],
    ["language", 'language: " en "'],
    ["title", 'title: " First post "']
  ]) {
    const original = field === "title" ? "title: First post" : `${field}: ${field === "slug" ? "first-post" : "en"}`;
    withPosts({ "bad.md": firstPost.replace(original, line) }, directory => {
      assert.throws(() => readPosts(directory), new RegExp(`bad\\.md.*${field}.*whitespace`, "i"));
    });
  }
});
