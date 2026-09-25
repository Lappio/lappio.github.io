import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function makeProject() {
  const project = mkdtempSync(join(tmpdir(), "lappio-project-"));
  for (const path of [
    "package.json", "eleventy.config.js", "articles.11ty.js", "index.html",
    "styles.css", "script.js", "favicon.svg", ".nojekyll", "README.md",
    "assets", "_includes", "lib", "scripts", "about", "blog", "notes", "links", "projects", "contact"
  ]) {
    cpSync(join(root, path), join(project, path), { recursive: true });
  }
  mkdirSync(join(project, "content/posts"), { recursive: true });
  cpSync(join(root, "content/posts/posts.11tydata.js"), join(project, "content/posts/posts.11tydata.js"));
  mkdirSync(join(project, "docs"));
  writeFileSync(join(project, "docs/ignored.md"), "Should not be published");
  symlinkSync(join(root, "node_modules"), join(project, "node_modules"), "dir");
  return project;
}

function post({ title, slug, draft = false }) {
  return `---
title: "${title}"
date: "2026-09-24"
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
  execFileSync("npm", ["run", "build", "--", `--output=${output}`], {
    cwd: project,
    encoding: "utf8",
    stdio: "pipe"
  });
}

test("Eleventy publishes ordered articles and excludes drafts and project files", () => {
  const project = makeProject();
  const postsDirectory = join(project, "content/posts");
  const output = mkdtempSync(join(tmpdir(), "lappio-build-"));
  const files = [
    ["tdd-first.md", post({ title: "First post", slug: "first-post" })],
    ["tdd-a.md", post({ title: "A post", slug: "a-post" })],
    ["tdd-hidden.md", post({ title: "Hidden post", slug: "hidden", draft: true })],
  ];
  try {
    for (const [name, contents] of files) writeFileSync(join(postsDirectory, name), contents);
    buildTo(project, output);

    const index = JSON.parse(readFileSync(join(output, "articles.json"), "utf8"));
    assert.deepEqual(index.map(item => item.slug), ["a-post", "first-post"]);
    assert.deepEqual(index[1], {
      title: "First post", date: "2026-09-24", summary: "A short summary",
      language: "en", slug: "first-post", url: "blog/first-post/"
    });
    const html = readFileSync(join(output, "blog/first-post/index.html"), "utf8");
    assert.match(html, /Hello <strong>world<\/strong>/);
    assert.match(html, /const example = &quot;\{\{ example \}\}&quot;;/);
    assert.match(html, /<article[^>]+lang="en"/);
    assert.match(html, /href="\.\.\/\.\.\/styles\.css"/);
    assert.equal(existsSync(join(output, "blog/hidden/index.html")), false);
    for (const file of ["index.html", "blog/index.html", "notes/index.html", "styles.css", "script.js", "assets/lappio-avatar.png"]) {
      assert.equal(existsSync(join(output, file)), true, `${file} was not built`);
    }
    assert.equal(existsSync(join(output, "README/index.html")), false);
    assert.equal(existsSync(join(output, "docs")), false);
    for (const base of ["https://example.test/", "https://example.test/repository-name/"]) {
      const article = new URL("blog/first-post/", base);
      for (const relative of ["../../", "../../script.js", "../../styles.css"]) {
        assert.ok(new URL(relative, article).href.startsWith(base));
      }
    }
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
    execFileSync("npm", ["run", "build"], { cwd: project, encoding: "utf8" });
    assert.equal(existsSync(output), true);
    rmSync(source);
    execFileSync("npm", ["run", "build"], { cwd: project, encoding: "utf8" });
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
