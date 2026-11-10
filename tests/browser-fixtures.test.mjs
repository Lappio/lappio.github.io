import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyBrowserProject } from "./helpers/site.mjs";
import { readPosts } from "../lib/posts.mjs";

test("browser projects use checked-in test fixtures, independent of deleted live articles",()=>{
  const project=mkdtempSync(join(tmpdir(),"browser-fixture-regression-"));
  try {
    copyBrowserProject(project);
    assert.deepEqual(readPosts(join(project,"content/posts")).map(p=>p.slug).sort(),["test-post-1","test-post-2"]);
    for(const name of ["test-post-1","test-post-2"])assert.match(readFileSync(join(project,`content/posts/${name}.md`),"utf8"),/Stable browser fixture/);
  } finally {rmSync(project,{recursive:true,force:true});}
});
