import test from "node:test";
import assert from "node:assert/strict";
import { copy, sections, sectionTitles } from "../frontend/copy.js";

test("React Chinese and English copy have matching keys and non-empty strings", () => {
  assert.deepEqual(Object.keys(copy).sort(), ["en", "zh"]);
  assert.ok(Object.keys(copy.zh).length > 0);
  assert.deepEqual(Object.keys(copy.zh).sort(), Object.keys(copy.en).sort());
  for (const [language, values] of Object.entries(copy)) {
    for (const [key, value] of Object.entries(values)) {
      assert.equal(typeof value, "string", `${language}.${key}`);
      assert.ok(value.trim(), `${language}.${key} is empty`);
    }
    for (const section of sections) {
      assert.ok(values[section]?.trim(), `${language}.${section}`);
      assert.ok(sectionTitles[section]?.trim(), section);
    }
  }
});
