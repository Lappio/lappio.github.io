import test from "node:test";
import assert from "node:assert/strict";

test("article index validation rejects navigation outside the blog", async () => {
  const { validPostIndex } = await import("../frontend/lib/posts.js");
  const post = { title: "Hello", summary: "A real article", date: "2026-10-28", language: "zh", slug: "hello", url: "blog/hello/" };
  assert.equal(validPostIndex([]), true);
  assert.equal(validPostIndex([post]), true);
  for (const change of [{ url: "javascript:alert(1)" }, { slug: "../hello" }, { date: "2026-02-30" }, { language: "fr" }, { summary: null }]) {
    assert.equal(validPostIndex([{ ...post, ...change }]), false);
  }
  assert.equal(validPostIndex({}), false);
});
