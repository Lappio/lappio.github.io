import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readNotes } from "../lib/notes.mjs";
import { validPostIndex, validNoteIndex } from "../frontend/lib/posts.js";
import NotesIndex from "../notes.11ty.js";

test("notes are optional and validated independently from articles", () => {
  const root=mkdtempSync(join(tmpdir(),"site-notes-"));
  try {
    assert.deepEqual(readNotes(join(root,"missing")),[]);
    const note=`---\ntitle: A note\ndate: "2026-11-10"\nsummary: A spark\nlanguage: en\nslug: a-note\ndraft: true\n---\n\nA **small** idea.`;
    writeFileSync(join(root,"one.md"),note);
    assert.equal(readNotes(root)[0].draft,true);
    writeFileSync(join(root,"two.md"),note);
    assert.throws(()=>readNotes(root),/duplicate slug/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
test("note indexes cannot navigate to Blog or outside the site", () => {
  const note={title:"A note",summary:"A spark",date:"2026-11-10",language:"en",slug:"a-note",url:"notes/a-note/"};
  assert.equal(validNoteIndex([note]),true);assert.equal(validPostIndex([note]),false);
  for(const url of ["blog/a-note/","javascript:alert(1)","notes/../../evil/"])assert.equal(validNoteIndex([{...note,url}]),false);
  const json=new NotesIndex().render({collections:{publishedNotes:[{data:note}]}});
  assert.equal(JSON.parse(json)[0].url,"notes/a-note/");
});
