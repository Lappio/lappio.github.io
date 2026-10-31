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
    "package.json", "eleventy.config.js", "articles.11ty.js", "index.html",
    "styles.css", "components.json", "jsconfig.json", "favicon.svg", ".nojekyll", "README.md",
    "assets", "_includes", "lib", "scripts", "writer", "about", "blog", "notes", "links", "projects", "contact", "frontend", "vite.config.js"
  ]) {
    cpSync(join(root, path), join(project, path), { recursive: true });
  }
  mkdirSync(join(project, "content/posts"), { recursive: true });
  cpSync(join(root, "content/posts/posts.11tydata.js"), join(project, "content/posts/posts.11tydata.js"));
  mkdirSync(join(project, "docs"));
  writeFileSync(join(project, "docs/ignored.md"), "Should not be published");
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

    const publicFiles = readdirSync(output, { recursive: true }).filter(file => /\.(html|js)$/.test(file));
    for (const file of publicFiles) assert.doesNotMatch(readFileSync(join(output, file), "utf8"), /TODO\(Lapp\)/, file);
    assert.equal(existsSync(join(output, "script.js")), false);
    const index = JSON.parse(readFileSync(join(output, "articles.json"), "utf8"));
    assert.deepEqual(index.map(item => item.slug), ["a-post", "first-post"]);
    assert.equal(index[0].category, "Reading");
    assert.match(readFileSync(join(output, "blog/a-post/index.html"), "utf8"), /tag-b[^>]*>Reading<\/span>/);
    assert.deepEqual(index[1], {
      title: "First post", date: "2026-09-24", summary: "A short summary",
      language: "en", slug: "first-post", url: "blog/first-post/"
    });
    const html = readFileSync(join(output, "blog/first-post/index.html"), "utf8");
    assert.match(html, /Hello <strong>world<\/strong>/);
    const time = new JSDOM(html).window.document.querySelector(".post-header time");
    assert.equal(time.dateTime, "2026-09-24");
    assert.equal(time.textContent, "Sep 24, 2026");
    const code = new JSDOM(html).window.document.querySelector("pre code");
    assert.equal(code.textContent.trim(), 'const example = "{{ example }}";');
    assert.equal(code.querySelector(".token.keyword").textContent, "const");
    assert.equal(code.querySelector(".token.string").textContent, '"{{ example }}"');
    assert.match(html, /<article[^>]+lang="en"/);
    assert.match(html, /href="\.\.\/\.\.\/styles\.css"/);
    assert.equal(existsSync(join(output, "blog/hidden/index.html")), false);
    const home = new JSDOM(readFileSync(join(output, "index.html"), "utf8")).window.document;
    assert.equal(home.querySelector('script[type="module"]').getAttribute("src"), "./ui/app.js");
    assert.ok(home.querySelector("#react-root .page-shell"), "static HTML stays readable before React mounts");
    assert.equal(home.querySelector('script[src="./script.js"]'), null, "legacy DOM code does not race React");
    const article = new JSDOM(html).window.document;
    assert.equal(article.querySelector('script[type="module"]').getAttribute("src"), "../../ui/app.js");
    for (const asset of ["ui/app.js", "ui/app.css"]) assert.equal(existsSync(join(output, asset)), true);
    for (const file of ["index.html", "blog/index.html", "notes/index.html", "styles.css", "assets/lappio-avatar-240.webp"]) {
      assert.equal(existsSync(join(output, file)), true, `${file} was not built`);
    }
    assert.equal(existsSync(join(output, "README/index.html")), false);
    assert.equal(existsSync(join(output, "docs")), false);
    for (const file of ["writer/index.html", "writer/app.js", "writer/writer.css"]) {
      assert.equal(existsSync(join(output, file)), false, `${file} leaked into the public site`);
    }
    assert.equal(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.write,
      "node scripts/writer-server.mjs");
    for (const base of ["https://example.test/", "https://example.test/repository-name/"]) {
      const article = new URL("blog/first-post/", base);
      for (const relative of ["../../", "../../styles.css"]) {
        assert.ok(new URL(relative, article).href.startsWith(base));
      }
    }
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
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
    const time = new JSDOM(html).window.document.querySelector(".post-header time");
    assert.equal(time.dateTime, "2026-09-25");
    assert.equal(time.textContent, "2026年9月25日");
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
