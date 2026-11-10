import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function makeProject() {
  const project = mkdtempSync(join(tmpdir(), "lappio-project-"));
  for (const path of [
    "package.json", "eleventy.config.js", "articles.11ty.js", "notes.11ty.js", "index.html",
    "components.json", "jsconfig.json", "favicon.svg", ".nojekyll", "README.md",
    "assets", "_includes", "lib", "scripts", "about", "blog", "notes", "links", "projects", "contact", "frontend", "vite.config.js"
  ]) {
    cpSync(join(root, path), join(project, path), { recursive: true });
  }
  mkdirSync(join(project, "content/posts"), { recursive: true });
  cpSync(join(root, "content/posts/posts.11tydata.js"), join(project, "content/posts/posts.11tydata.js"));
  mkdirSync(join(project, "docs"));
  writeFileSync(join(project, "docs/ignored.md"), "Should not be published");
  mkdirSync(join(project, ".archify/repository"), { recursive: true });
  writeFileSync(join(project, ".archify/repository/diagram.html"), "<!doctype html><title>Private repository diagram</title>");
  writeFileSync(join(project, "AGENTS.md"), "# Repository Guidelines\nContributor-only instructions.");
  writeFileSync(join(project, "CLAUDE.md"), "# CLAUDE.md\nContributor-only instructions.");
  symlinkSync(join(root, "node_modules"), join(project, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  return project;
}

function post({ title, slug, draft = false, date = '"2026-09-24"' }) {
  return `---
title: "${title}"
date: ${date}
summary: "A short summary"
language: en
slug: ${slug}
${draft ? "draft: true\n" : ""}---

Hello **world**.

~~~js
const example = "{{ example }}";
~~~
`;
}

function buildTo(project, output) {
  execFileSync(process.execPath, [join(project, "scripts/build.mjs"), `--output=${output}`], {
    cwd: project,
    encoding: "utf8",
    stdio: "pipe"
  });
}

function articleData(html) {
  const data = new JSDOM(html).window.document.querySelector("#article-data");
  assert.ok(data, "article pages must supply inert data for the React interface");
  return JSON.parse(data.textContent);
}

test("new-only pages ship one React mount without legacy markup or assets", () => {
  const project = makeProject();
  const output = mkdtempSync(join(tmpdir(), "lappio-new-only-"));
  const title = "Title </script><script id='unexpected'> & 中文";
  try {
    writeFileSync(join(project, "content/posts/safe-data.md"), post({ title, slug: "safe-data" }));
    buildTo(project, output);
    assert.equal(existsSync(join(output, "styles.css")), false, "legacy stylesheet must not be published");
    for (const path of ["index.html", "about/index.html", "blog/index.html", "notes/index.html",
      "projects/index.html", "links/index.html", "contact/index.html", "blog/safe-data/index.html"]) {
      const document = new JSDOM(readFileSync(join(output, path), "utf8")).window.document;
      assert.equal(document.querySelectorAll("#react-root").length, 1, path);
      assert.equal(document.querySelector("#react-root").childElementCount, 0, path);
      assert.equal(document.querySelector(".page-shell, .post-article, [data-static-fallback], #unexpected"), null, path);
      assert.equal(document.querySelectorAll('link[rel="stylesheet"]').length, 1, path);
      assert.ok(document.querySelector('link[rel="stylesheet"]').getAttribute("href").endsWith("ui/app.css"), path);
      assert.equal(document.querySelectorAll('script:not([type="application/json"])').length, 1, path);
    }
    const data = articleData(readFileSync(join(output, "blog/safe-data/index.html"), "utf8"));
    assert.equal(data.title, title);
    assert.equal(data.kind, "post");
    assert.equal(data.language, "en");
    assert.match(data.html, /Hello <strong>world<\/strong>/);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("Eleventy publishes ordered articles and excludes drafts and project files", () => {
  const project = makeProject();
  const postsDirectory = join(project, "content/posts");
  const output = mkdtempSync(join(tmpdir(), "lappio-build-"));
  const files = [
    ["tdd-first.md", post({ title: "First post", slug: "first-post" })],
    ["tdd-a.md", post({ title: "A post", slug: "a-post" }).replace("language: en", "language: en\ncategory: Reading")],
    ["tdd-hidden.md", post({ title: "Hidden post", slug: "hidden", draft: true })],
  ];
  try {
    for (const [name, contents] of files) writeFileSync(join(postsDirectory, name), contents);
    buildTo(project, output);

    assert.equal(existsSync(join(output, "AGENTS/index.html")), false, "Contributor guide must not become a public page");
    assert.equal(existsSync(join(output, "CLAUDE/index.html")), false, "Claude guide must not become a public page");
    const publicFiles = readdirSync(output, { recursive: true }).filter(file => /\.(html|js)$/.test(file));
    for (const file of publicFiles) assert.doesNotMatch(readFileSync(join(output, file), "utf8"), /TODO\(Lapp\)/, file);
    assert.equal(existsSync(join(output, "script.js")), false);
    const index = JSON.parse(readFileSync(join(output, "articles.json"), "utf8"));
    assert.deepEqual(index.map(item => item.slug), ["a-post", "first-post"]);
    assert.equal(index[0].category, "Reading");
    assert.equal(articleData(readFileSync(join(output, "blog/a-post/index.html"), "utf8")).category, "Reading");
    assert.deepEqual(index[1], {
      title: "First post", date: "2026-09-24", summary: "A short summary",
      language: "en", slug: "first-post", url: "blog/first-post/"
    });
    const html = readFileSync(join(output, "blog/first-post/index.html"), "utf8");
    const data = articleData(html);
    assert.match(data.html, /Hello <strong>world<\/strong>/);
    assert.equal(data.date, "2026-09-24");
    const code = new JSDOM(data.html).window.document.querySelector("pre code");
    assert.equal(code.textContent.trim(), 'const example = "{{ example }}";');
    assert.equal(code.querySelector(".token.keyword").textContent, "const");
    assert.equal(code.querySelector(".token.string").textContent, '"{{ example }}"');
    assert.equal(data.language, "en");
    assert.equal(existsSync(join(output, "blog/hidden/index.html")), false);
    const home = new JSDOM(readFileSync(join(output, "index.html"), "utf8")).window.document;
    assert.equal(home.querySelector('meta[name="theme-color"]').content, "#fffdf8");
    assert.equal(home.querySelector('script[type="module"]').getAttribute("src"), "./ui/app.js");
    assert.equal(home.querySelector("#react-root").childElementCount, 0, "only React owns the visible interface");
    assert.equal(home.querySelector('script[src="./script.js"]'), null, "legacy DOM code does not race React");
    const article = new JSDOM(html).window.document;
    assert.equal(article.querySelector('script[type="module"]').getAttribute("src"), "../../ui/app.js");
    for (const asset of ["ui/app.js", "ui/app.css"]) assert.equal(existsSync(join(output, asset)), true);
    for (const file of ["index.html", "blog/index.html", "notes/index.html", "assets/lappio-avatar-240.webp"]) {
      assert.equal(existsSync(join(output, file)), true, `${file} was not built`);
    }
    assert.equal(existsSync(join(output, "README/index.html")), false);
    assert.equal(existsSync(join(output, "docs")), false);
    assert.equal(existsSync(join(output, ".archify")), false, "Local repository diagrams must not become public pages");
    assert.equal(existsSync(join(output, "writer")), false);
    for (const base of ["https://example.test/", "https://example.test/repository-name/"]) {
      const article = new URL("blog/first-post/", base);
      for (const relative of ["../../", "../../ui/app.css", "../../ui/app.js"]) {
        assert.ok(new URL(relative, article).href.startsWith(base));
      }
    }
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("repository no longer ships the local article editor", () => {
  const { scripts } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(scripts.write, undefined, "The local editor command must be removed");
  for (const path of ["writer", "scripts/writer-server.mjs", "lib/writer-store.mjs",
    "tests/writer-server.test.mjs", "tests/writer-store.test.mjs", "tests/writer-ui.test.mjs"]) {
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);
  }
});

test("private usage metadata stops the build before deleting the last site", () => {
  const project = makeProject();
  try {
    const usageFile = join(project, "frontend/data/usage.json");
    const data = JSON.parse(readFileSync(usageFile, "utf8"));
    data.source = "/private/cc-switch.db";
    writeFileSync(usageFile, JSON.stringify(data));
    mkdirSync(join(project, "_site"));
    writeFileSync(join(project, "_site/index.html"), "last successful site");
    assert.throws(() => buildTo(project, join(project, "_site")), /公开数据无效/);
    assert.equal(readFileSync(join(project, "_site/index.html"), "utf8"), "last successful site");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("unquoted calendar dates remain YYYY-MM-DD in the public article index", () => {
  const project = makeProject();
  const output = mkdtempSync(join(tmpdir(), "lappio-date-build-"));
  try {
    writeFileSync(join(project, "content/posts/plain-date.md"),
      post({ title: "Plain date", slug: "plain-date", date: "2026-09-25" }).replace("language: en", "language: zh"));
    buildTo(project, output);
    const index = JSON.parse(readFileSync(join(output, "articles.json"), "utf8"));
    assert.equal(index[0].date, "2026-09-25");
    const html = readFileSync(join(output, "blog/plain-date/index.html"), "utf8");
    assert.equal(articleData(html).date, "2026-09-25");
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("an empty blog still produces a valid article index", () => {
  const project = makeProject();
  const output = mkdtempSync(join(tmpdir(), "lappio-empty-build-"));
  try {
    buildTo(project, output);
    assert.deepEqual(JSON.parse(readFileSync(join(output, "articles.json"), "utf8")), []);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("a removed article disappears from the next local build", () => {
  const project = makeProject();
  const postsDirectory = join(project, "content/posts");
  const source = join(postsDirectory, "tdd-removed.md");
  const output = join(project, "_site/blog/removed-post/index.html");
  try {
    writeFileSync(source, post({ title: "Removed post", slug: "removed-post" }));
    execFileSync(process.execPath, [join(project, "scripts/build.mjs")], { cwd: project, encoding: "utf8" });
    assert.equal(existsSync(output), true);
    rmSync(source);
    execFileSync(process.execPath, [join(project, "scripts/build.mjs")], { cwd: project, encoding: "utf8" });
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("Notes publishes its own ordered index and detail pages without leaking drafts into Blog", () => {
  const project=makeProject(),output=mkdtempSync(join(tmpdir(),"lappio-notes-build-"));
  try {
    const notes=join(project,"content/notes");mkdirSync(notes,{recursive:true});
    cpSync(join(root,"content/notes/notes.11tydata.js"),join(notes,"notes.11tydata.js"));
    writeFileSync(join(notes,"public.md"),post({title:"A public note",slug:"public-note"}));
    writeFileSync(join(notes,"hidden.md"),post({title:"A hidden note",slug:"hidden-note",draft:true}));
    buildTo(project,output);
    const index=JSON.parse(readFileSync(join(output,"notes.json"),"utf8"));
    assert.deepEqual(index.map(note=>note.url),["notes/public-note/"]);
    assert.deepEqual(JSON.parse(readFileSync(join(output,"articles.json"),"utf8")),[]);
    const html=readFileSync(join(output,"notes/public-note/index.html"),"utf8");
    assert.match(html,/data-page="note"/);
    assert.equal(articleData(html).kind,"note");
    assert.match(articleData(html).html,/Hello <strong>world<\/strong>/);
    assert.ok(!existsSync(join(output,"notes/hidden-note/index.html")));
  } finally {rmSync(project,{recursive:true,force:true});rmSync(output,{recursive:true,force:true});}
});
