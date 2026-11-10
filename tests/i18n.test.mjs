import test from "node:test";
import assert from "node:assert/strict";
import { copy, sections, sectionTitles } from "../frontend/copy.js";

test("React copy keeps required text nonempty while hero title lines may be hidden", () => {
  assert.deepEqual(Object.keys(copy).sort(), ["en", "zh"]);
  assert.ok(Object.keys(copy.zh).length > 0);
  assert.deepEqual(Object.keys(copy.zh).sort(), Object.keys(copy.en).sort());
  for (const [language, values] of Object.entries(copy)) {
    for (const [key, value] of Object.entries(values)) {
      assert.equal(typeof value, "string", `${language}.${key}`);
      // The editor may intentionally hide either or both decorative hero title lines.
      if (!["heroFirst", "heroSecond"].includes(key)) assert.ok(value.trim(), `${language}.${key} is empty`);
    }
    for (const section of sections) {
      assert.ok(values[section]?.trim(), `${language}.${section}`);
      assert.ok(sectionTitles[section]?.trim(), section);
    }
  }
});
