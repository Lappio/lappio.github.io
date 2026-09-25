import test from "node:test";
import assert from "node:assert/strict";
import { decodeArticle, encodeArticle } from "../lib/post-document.mjs";
import { parsePost } from "../lib/posts.mjs";

const source = `---
title: "First post"
date: "2026-09-25"
summary: "A short summary"
language: en
slug: first-post
series: Notebook
---

Hello **world**.

~~~js
const value = "{{ example }}";
~~~
`;

test("article metadata and body survive a decode and encode round trip", () => {
  const decoded = decodeArticle(source, "import.md");
  const roundTrip = decodeArticle(encodeArticle(decoded), "export.md");
  assert.equal(roundTrip.fields.date, "2026-09-25");
  assert.equal(roundTrip.extraFields.series, "Notebook");
  assert.equal(roundTrip.fields.body, decoded.fields.body);
  assert.match(roundTrip.fields.body, /\{\{ example \}\}/);
  assert.equal(parsePost("export.md", encodeArticle(decoded)).slug, "first-post");
});

test("malformed YAML names its source", () => {
  assert.throws(() => decodeArticle("---\ntitle: [broken\n---\nBody", "broken.md"), /broken\.md.*front matter/i);
});

test("invalid metadata survives round trip so validation rejects it", () => {
  const invalidDraft = source.replace("series: Notebook", "draft: yes");
  const document = decodeArticle(invalidDraft, "draft.md");
  assert.throws(() => parsePost("draft.md", encodeArticle(document)), /draft\.md.*draft/i);

  const paddedSlug = source.replace("slug: first-post", 'slug: " first-post "');
  assert.throws(() => parsePost("slug.md", encodeArticle(decodeArticle(paddedSlug))), /slug\.md.*whitespace/i);
});
