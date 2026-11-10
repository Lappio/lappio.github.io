import test from "node:test";
import assert from "node:assert/strict";
import { decodeArticle } from "../lib/post-document.mjs";
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

test("article decoding preserves metadata and the Markdown body", () => {
  const decoded = decodeArticle(source, "article.md");
  assert.deepEqual(decoded.fields, {
    title: "First post", date: "2026-09-25", summary: "A short summary",
    language: "en", slug: "first-post", draft: false,
    body: '\nHello **world**.\n\n~~~js\nconst value = "{{ example }}";\n~~~\n'
  });
  assert.deepEqual(decoded.extraFields, { series: "Notebook" });
  assert.equal(parsePost("article.md", source).slug, "first-post");
});

test("malformed YAML names its source", () => {
  assert.throws(() => decodeArticle("---\ntitle: [broken\n---\nBody", "broken.md"), /broken\.md.*front matter/i);
});

test("common unquoted YAML dates open as calendar dates and remain valid", () => {
  const unquoted = source.replace('date: "2026-09-25"', "date: 2026-09-25");
  const document = decodeArticle(unquoted, "plain.md");
  assert.equal(document.fields.date, "2026-09-25");
  assert.equal(parsePost("plain.md", unquoted).date, "2026-09-25");
});

test("an impossible unquoted calendar date is rejected without rollover", () => {
  const invalid = source.replace('date: "2026-09-25"', "date: 2026-02-30");
  assert.throws(() => parsePost("impossible.md", invalid), /date.*YYYY-MM-DD|real YYYY-MM-DD/i);
});

test("executable front matter language is rejected without evaluating it", () => {
  const executable = "---javascript\n({ title: (globalThis.__articleProbe = true) })\n---\nBody";
  try {
    assert.throws(() => decodeArticle(executable, "unsafe.md"), /YAML|front matter|unsupported/i);
    assert.equal(globalThis.__articleProbe, undefined);
  } finally {
    delete globalThis.__articleProbe;
  }
});

test("decoding preserves invalid metadata so article validation rejects it", () => {
  const invalidDraft = source.replace("series: Notebook", "draft: yes");
  const document = decodeArticle(invalidDraft, "draft.md");
  assert.equal(document.fields.draft, "yes");
  assert.throws(() => parsePost("draft.md", invalidDraft), /draft\.md.*draft/i);

  const paddedSlug = source.replace("slug: first-post", 'slug: " first-post "');
  assert.equal(decodeArticle(paddedSlug).fields.slug, " first-post ");
  assert.throws(() => parsePost("slug.md", paddedSlug), /slug\.md.*whitespace/i);
});
