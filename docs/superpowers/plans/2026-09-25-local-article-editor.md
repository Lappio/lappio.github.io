# Local Article Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local browser editor that lists, creates, edits, previews, saves, imports, and downloads the blog's Markdown articles while leaving Git commits and pushes to the owner.

**Architecture:** A loopback-only Node server serves a standalone `writer/` UI and a small JSON API. The API reads and safely writes `content/posts/*.md` through a store module; a shared document codec and validator keep its output compatible with the existing Eleventy build. The public build excludes the writer entirely.

**Tech Stack:** Node.js 22, native `node:http`/`node:fs`, Eleventy 3, `gray-matter` 4, direct `markdown-it` 14.3.2 dependency, plain HTML/CSS/JavaScript, `node:test`, and jsdom.

**Spec:** `docs/superpowers/specs/2026-09-25-local-article-editor-design.md`

## Global Constraints

- `npm run write` binds to `127.0.0.1`; it does not contact or push to GitHub.
- Only validated saves may write `content/posts/*.md`; no delete route or Git command exists.
- The article fields are `title`, quoted `YYYY-MM-DD` `date`, `summary`, `language` (`en` or `zh`), lowercase hyphenated `slug`, optional boolean `draft`, and nonempty Markdown body.
- Unknown front matter fields survive import, save, and download; warn that YAML formatting and comments can change.
- A saved local file is not described as live; the owner still runs checks, commits, and pushes.
- Owner-facing editor controls and feedback use Chinese; `en`/`zh` selects the article's language.
- Preview renders Markdown with raw HTML disabled; the Eleventy build remains the final rendering check.
- Eleventy excludes `writer/**`, including all editor assets.
- Keep the existing public blog and Pages workflow behavior unchanged.

## Review Focus

1. An existing article whose YAML is malformed must remain visible and openable in raw repair mode; Task 2 tests listing/opening it, and Task 5 tests its editor state.
2. A file changed on disk after opening must not be overwritten by a stale editor save; Task 2 tests the fingerprint conflict.
3. A cross-site request or a path with traversal/symlink must not write a local file; Tasks 2 and 3 test both boundaries.
4. Imported unknown fields, date strings, and literal `{{ example }}` code must survive export and preview; Tasks 1 and 3 test the round trip and renderer.
5. Local storage disabled or an unsaved recovery copy when reopening an article must not lose work; Task 5 tests the fallback and restore choice.

## File map and interfaces

- `lib/post-document.mjs`: `decodeArticle(markdown, source)` returns `{ fields, extraFields }`; `encodeArticle(document)` returns Markdown text. `fields` holds `title,date,summary,language,slug,draft,body`.
- `lib/posts.mjs`: export `parsePost(source, markdown)` by extracting the current single-post validation; `readPosts(directory)` continues to return the same sorted shape.
- `lib/writer-store.mjs`: `createWriterStore(postsDirectory)` returns `listArticles()`, `openArticle(name)`, `prepareArticle({name,document})`, and `saveArticle({name,fingerprint,document})`. `prepareArticle` validates without writing and returns `{markdown,article}` for export; `name:null` creates `<slug>.md`, while a named save updates only that file. `WriterError` has `code` and `status`.
- `scripts/writer-server.mjs`: `startWriterServer({postsDirectory,port})` returns `{url,close}` and serves explicit UI/API routes. The CLI entry point uses port 4173 and prints the URL.
- `writer/index.html`, `writer/writer.css`, `writer/app.js`: local three-panel editor. The browser calls the API; it never writes the filesystem directly.
- `tests/post-document.test.mjs`, `tests/writer-store.test.mjs`, `tests/writer-server.test.mjs`, `tests/writer-ui.test.mjs`: focused codec, disk, HTTP, and UI behavior tests.
- `eleventy.config.js`, `tests/build.test.mjs`, `package.json`, `package-lock.json`, `README.md`: public exclusion, scripts/dependency, and author instructions.

---

### Task 1: Share article parsing and serialization

**Files:**
- Create: `lib/post-document.mjs`
- Modify: `lib/posts.mjs`
- Test: `tests/post-document.test.mjs`, `tests/posts.test.mjs`

**Interfaces:**
- Consumes: current `gray-matter` parser and the field rules in `readPosts(directory)`.
- Produces: `decodeArticle(markdown, source) -> {fields,extraFields}`, `encodeArticle({fields,extraFields}) -> string`, and `parsePost(source, markdown) -> validated post`.

- [ ] **Step 1: Write failing codec and validator tests.** Include an article with `date: "2026-09-25"`, extra `series: Notebook`, and a fenced `{{ example }}` line. Assert decode/encode/decode preserves body and extra field, and `parsePost` returns a string date. Assert malformed YAML identifies the source, surrounding-space slugs fail, and an invalid `draft: yes` remains invalid after a decode/encode round trip. In `tests/posts.test.mjs`, assert `parsePost("inline.md", source)` matches the fields returned by `readPosts` for the same file.

```js
const decoded = decodeArticle(source, "import.md");
const roundTrip = decodeArticle(encodeArticle(decoded), "export.md");
assert.equal(roundTrip.fields.date, "2026-09-25");
assert.equal(roundTrip.extraFields.series, "Notebook");
assert.match(roundTrip.fields.body, /\{\{ example \}\}/);
assert.equal(parsePost("export.md", encodeArticle(decoded)).slug, "first-post");
```

- [ ] **Step 2: Run the new tests and observe failure.** Run `node --test tests/post-document.test.mjs tests/posts.test.mjs`. Expected: new module or `parsePost` export missing; existing `readPosts` tests stay green.

- [ ] **Step 3: Implement the codec and extract validation.** In `decodeArticle`, call `matter(markdown)`, split known keys from `data`, and return raw values so invalid documents can still be edited. Wrap YAML syntax errors with the source name. In `encodeArticle`, put extras first and known keys last, omit `draft` when false, then call `matter.stringify(fields.body, metadata)`; quoted dates must decode as strings. Move the body of the current validation loop into `parsePost(source, markdown)` and make `readPosts` call it, retaining its existing return shape, duplicate-slug detection, and sorting.

```js
export function decodeArticle(markdown, source = "<editor>") {
  const parsed = matter(markdown);
  const { title, date, summary, language, slug, draft, ...extraFields } = parsed.data;
  return { fields: { title, date, summary, language, slug, draft: draft === undefined ? false : draft, body: parsed.content }, extraFields };
}
export function encodeArticle({ fields, extraFields = {} }) {
  const metadata = { ...extraFields, title: fields.title, date: fields.date,
    summary: fields.summary, language: fields.language, slug: fields.slug };
  if (fields.draft !== false && fields.draft !== undefined) metadata.draft = fields.draft;
  return matter.stringify(fields.body, metadata);
}
```

- [ ] **Step 4: Run `node --test tests/post-document.test.mjs tests/posts.test.mjs`, then `npm test`.** Expected: all pass, including prior article validation tests.
- [ ] **Step 5: Commit.** `git add lib/post-document.mjs lib/posts.mjs tests/post-document.test.mjs tests/posts.test.mjs && git commit -m "Share article document validation"`.

### Task 2: List and safely save repository articles

**Files:**
- Create: `lib/writer-store.mjs`
- Test: `tests/writer-store.test.mjs`

**Interfaces:**
- Consumes: `decodeArticle`, `encodeArticle`, and `parsePost` from Task 1.
- Produces: `createWriterStore(directory)` with `listArticles() -> entries`, `openArticle(name) -> {name,markdown,fingerprint}`, `prepareArticle({name=null,document}) -> {markdown,article}`, `saveArticle({name=null,fingerprint=null,document}) -> {name,fingerprint}`; `WriterError(code,status,message)`.

- [ ] **Step 1: Write failing store tests with a fresh temporary posts directory.** Cover valid and draft list entries, a malformed YAML file listed with an error and openable raw Markdown, `prepareArticle` producing the same Markdown without writing, new save to `<slug>.md`, update of the opened filename, duplicate slug, existing filename, changed fingerprint, `../outside.md`, and a symlink article. Check that rejected saves leave both the article and outside target unchanged.

```js
const store = createWriterStore(directory);
const opened = store.openArticle("first.md");
writeFileSync(join(directory, "first.md"), changedByAnotherProgram);
assert.throws(() => store.saveArticle({ name: "first.md", fingerprint: opened.fingerprint, document }),
  error => error.code === "STALE_FILE");
assert.equal(readFileSync(join(directory, "first.md"), "utf8"), changedByAnotherProgram);
```

- [ ] **Step 2: Run `node --test tests/writer-store.test.mjs`.** Expected: module or API missing.
- [ ] **Step 3: Implement the store.** Enumerate only top-level `.md` files. Return invalid files as list entries with filename and issue; `openArticle` returns bytes even if YAML is malformed. `prepareArticle` encodes and passes the result through `parsePost`, then compares its slug to every other parseable file, including drafts, excluding only the exact opened filename. A malformed unrelated file remains listed for repair but cannot yield a slug for comparison. `saveArticle` calls `prepareArticle`, hashes file bytes with SHA-256 on open and before update, and requires the supplied fingerprint for updates. New saves require a nonexistent `<slug>.md`. Check basename and `lstat` to reject traversal and symlinks. Write a unique temporary file in the posts directory; for create, link it to a new destination without replacement, and for update, rename it over the checked original; remove the temporary file in `finally`.

```js
const targetName = name ?? `${validated.slug}.md`;
if (!safeName(targetName)) throw new WriterError("BAD_NAME", 400, "Invalid article filename");
if (name && sha256(readFileSync(target)) !== fingerprint)
  throw new WriterError("STALE_FILE", 409, "Article changed on disk");
for (const other of listMarkdownNames(directory).filter(other => other !== name)) {
  if (decodeArticle(readFileSync(join(directory, other), "utf8"), other).fields.slug === validated.slug)
    throw new WriterError("DUPLICATE_SLUG", 409, `Slug already used by ${other}`);
}
```

- [ ] **Step 4: Run `node --test tests/writer-store.test.mjs`, then `npm test`.** Expected: all pass; test temporary directories are removed in `finally`.
- [ ] **Step 5: Commit.** `git add lib/writer-store.mjs tests/writer-store.test.mjs && git commit -m "Add safe local article store"`.

### Task 3: Serve the local API and Markdown preview

**Files:**
- Create: `scripts/writer-server.mjs`
- Modify: `package.json`, `package-lock.json`
- Test: `tests/writer-server.test.mjs`

**Interfaces:**
- Consumes: `createWriterStore`, `decodeArticle`, `encodeArticle`, `parsePost`.
- Produces: `startWriterServer({postsDirectory,port=4173}) -> Promise<{url,close}>`; routes `GET /api/session`, `GET /api/articles`, `GET /api/articles/:name`, `POST /api/parse`, `POST /api/preview`, `POST /api/export`, `POST /api/articles`, and `PUT /api/articles/:name`. Export accepts `{document,sourceName,downloadName}` and returns `{markdown,filename}`.

- [ ] **Step 1: Write failing HTTP tests.** Start on port `0` with a temporary posts directory. Assert list/open responses, parse and export round trip with a safe imported download filename, preview escaping raw `<script>` while retaining `{{ example }}` inside code, correct JSON error status, a 1 MiB body limit, wrong session token rejected for POST/PUT saves, a foreign `Origin` rejected, and no route for DELETE or Git. Allow only `/`, `/writer.css`, `/app.js`, and API paths; the UI files are created in Task 4.

```js
const writer = await startWriterServer({ postsDirectory: directory, port: 0 });
const { token } = await (await fetch(`${writer.url}/api/session`)).json();
const denied = await fetch(`${writer.url}/api/articles`, {
  method: "POST", headers: { "content-type": "application/json", "x-writer-token": "wrong" },
  body: JSON.stringify({ document })
});
assert.equal(denied.status, 403);
await writer.close();
```

- [ ] **Step 2: Run `node --test tests/writer-server.test.mjs`.** Expected: server module missing.
- [ ] **Step 3: Add `markdown-it@14.3.2` as a direct dev dependency and implement explicit routes.** Use `MarkdownIt({html:false,linkify:true})`; keep the original Markdown text for validation and return rendered HTML only for preview. Read JSON incrementally and stop above 1 MiB. Generate a random startup token, return it only from same-origin `/api/session`, and require `X-Writer-Token` plus matching `Origin` when an Origin header is sent for every mutating request. Bind only `127.0.0.1`. Map `WriterError.status` to structured `{error:{code,message,field?}}`; make unknown routes return 404. `POST /api/export` calls `store.prepareArticle({name:sourceName,document})`, validates `downloadName` as a safe `.md` basename or defaults to `<slug>.md`, and returns `{markdown,filename}` without writing. The CLI entry point resolves `content/posts` from the repo root and prints the local URL.

```js
const markdown = new MarkdownIt({ html: false, linkify: true });
if (request.method === "POST" && pathname === "/api/preview")
  return sendJson(response, 200, { html: markdown.render(body.markdown) });
if (isMutation && (request.headers["x-writer-token"] !== token ||
    (request.headers.origin && request.headers.origin !== url)))
  return sendJson(response, 403, { error: { code: "FORBIDDEN", message: "Local editor request required" } });
```

Add `"write": "node scripts/writer-server.mjs"` to `package.json` scripts, install `markdown-it@14.3.2` with `npm install --save-dev markdown-it@14.3.2`, and commit the resulting lockfile. All UI POST requests send the startup token in `X-Writer-Token`.

- [ ] **Step 4: Run `node --test tests/writer-server.test.mjs`, then `npm test`.** Expected: all pass. Verify `npm run write` prints a `127.0.0.1` URL and stop it with Ctrl-C; the page itself becomes available in Task 4.
- [ ] **Step 5: Commit.** `git add scripts/writer-server.mjs package.json package-lock.json tests/writer-server.test.mjs && git commit -m "Serve local article editor API"`.

### Task 4: Build the article management interface

**Files:**
- Create: `writer/index.html`, `writer/writer.css`, `writer/app.js`
- Test: `tests/writer-ui.test.mjs`

**Interfaces:**
- Consumes: Task 3's session, list, and open routes.
- Produces: DOM identifiers `article-list`, `article-search`, `article-filter`, `article-form`, `article-body`, `preview`, `new-article`, `import-file`, `save-article`, `download-article`, and mobile tabs. `writer/app.js` owns client-side state `{sourceName,fingerprint,fields,extraFields,dirty,token}`.

- [ ] **Step 1: Write failing jsdom tests for the page shell and list.** Stub `fetch` for session/list/open. Assert the new button, all seven article fields, preview region, list search/filter, empty state, a draft badge, and a malformed article's repair badge. Click an article and assert its fields and original filename load. Assert mobile tab buttons have `aria-selected` updates without clearing the textarea.

```js
assert.ok(document.querySelector("#article-form"));
assert.equal(document.querySelectorAll("#article-list [data-article-name]").length, 2);
document.querySelector("#article-search").value = "second";
document.querySelector("#article-search").dispatchEvent(new Event("input", { bubbles: true }));
assert.equal(document.querySelectorAll("#article-list [data-article-name]").length, 1);
```

- [ ] **Step 2: Run `node --test tests/writer-ui.test.mjs`.** Expected: writer files missing or elements absent.
- [ ] **Step 3: Implement the accessible responsive shell.** Use Chinese owner-facing copy, semantic buttons, labels, status region (`aria-live="polite"`), per-field error containers, and keyboard-visible focus styles. Follow the site's colors and type without importing the public `styles.css`. Fetch session/list on load; list all local articles, show invalid ones, filter by text/status, and fetch opened raw source. For parse failures, show a raw-source repair textarea with a **重新解析源码** action instead of discarding bytes. Use the three panels at desktop size and 文章/编辑/预览 tabs on small screens.

```html
<nav class="writer-tabs" aria-label="编辑器面板">
  <button type="button" data-panel="articles" aria-selected="true">文章</button>
  <button type="button" data-panel="edit" aria-selected="false">编辑</button>
  <button type="button" data-panel="preview" aria-selected="false">预览</button>
</nav>
<main class="writer-layout">
  <aside id="article-list" aria-label="本地文章"></aside>
  <form id="article-form" novalidate></form>
  <section id="preview" aria-label="文章预览"></section>
</main>
```

- [ ] **Step 4: Run `node --test tests/writer-ui.test.mjs`, then `npm test`.** Expected: all pass. Inspect the page at desktop and phone widths before committing the final CSS.
- [ ] **Step 5: Commit.** `git add writer/index.html writer/writer.css writer/app.js tests/writer-ui.test.mjs && git commit -m "Add local article management interface"`.

### Task 5: Complete editing, recovery, and save workflows

**Files:**
- Modify: `writer/app.js`, `writer/index.html`, `writer/writer.css`
- Test: `tests/writer-ui.test.mjs`, `tests/writer-server.test.mjs`

**Interfaces:**
- Consumes: Task 3's parse/preview/export/create/update routes and Task 4's DOM/state.
- Produces: new/import/edit, preview, browser recovery, validation, save, and download interactions.

- [ ] **Step 1: Write failing interaction tests.** Cover a new article with today's date, English slug suggestion that stops after manual editing, imported unknown metadata, live preview of Markdown, the draft switch writing `draft: true`, save request with token and fingerprint, stale-save warning without replacing form data, download filename/body, a disabled-localStorage fallback, and a restore/discard choice when reopening an unsaved article. Check changing an existing slug shows an old-URL warning. Test malformed YAML opens raw repair mode and becomes structured after a valid edit.

```js
document.querySelector("#title").value = "A New Article";
document.querySelector("#title").dispatchEvent(new Event("input", { bubbles: true }));
assert.equal(document.querySelector("#slug").value, "a-new-article");
document.querySelector("#save-article").click();
assert.equal(saveRequest.headers["x-writer-token"], sessionToken);
assert.equal(saveRequest.body.document.fields.slug, "a-new-article");
```

- [ ] **Step 2: Run `node --test tests/writer-ui.test.mjs tests/writer-server.test.mjs`.** Expected: new interaction cases fail for absent handlers.
- [ ] **Step 3: Implement the interactions.** Debounce preview and local-storage writes. Use per-document recovery keys (`new` or source filename), prompt restore/discard when a recovery copy exists, and continue if storage throws. Read imported files with `FileReader`, call parse, and leave prior state unchanged on failure. Call export before browser download so the same server validation applies to save/download; use a Blob URL and revoke it. Save through POST for new/imported or PUT for opened source; refresh list and fingerprint on success, clear that recovery copy, and show a commit/push reminder. Surface field errors, conflicts, preview failures, and the slug-change warning. Keep raw repair mode until the full source parses successfully.

```js
async function saveCurrent() {
  const path = state.sourceName ? `/api/articles/${encodeURIComponent(state.sourceName)}` : "/api/articles";
  const method = state.sourceName ? "PUT" : "POST";
  const recoveryKey = state.sourceName ?? "new";
  const result = await api(path, { method, body: {
    name: state.sourceName, fingerprint: state.fingerprint, document: currentDocument()
  }});
  state.sourceName = result.name;
  state.fingerprint = result.fingerprint;
  clearRecovery(recoveryKey);
  await refreshArticles();
}
```

- [ ] **Step 4: Run the focused UI/server tests, then `npm test`.** Expected: all pass, including previous public blog tests. Exercise import, save, reload, and download manually against a temporary article, then remove the temporary article before finishing.
- [ ] **Step 5: Commit.** `git add writer/index.html writer/writer.css writer/app.js tests/writer-ui.test.mjs tests/writer-server.test.mjs && git commit -m "Complete article editing and recovery"`.

### Task 6: Exclude the editor from public output and document the workflow

**Files:**
- Modify: `eleventy.config.js`, `tests/build.test.mjs`, `README.md`
- Test: `tests/build.test.mjs`

**Interfaces:**
- Consumes: the `writer/` directory and `npm run write` command from earlier tasks.
- Produces: a public `_site/` without writer files and a complete local editor guide.

- [ ] **Step 1: Write a failing build test.** Copy `writer/` into the build test's temporary project, run the build, and assert `writer/index.html`, `writer/app.js`, and `writer/writer.css` are absent from output while public pages and `articles.json` remain. Assert the npm script exists.

```js
cpSync(join(root, "writer"), join(project, "writer"), { recursive: true });
buildTo(project, output);
for (const name of ["writer/index.html", "writer/app.js", "writer/writer.css"])
  assert.equal(existsSync(join(output, name)), false);
assert.equal(JSON.parse(readFileSync(join(root, "package.json")).toString()).scripts.write,
  "node scripts/writer-server.mjs");
```

- [ ] **Step 2: Run `node --test tests/build.test.mjs`.** Expected: `writer/index.html` is published, so the new assertion fails.
- [ ] **Step 3: Add `writer/**` to Eleventy ignores and update the README.** Document `npm ci`, `npm run write`, list/open/new/import/save/download, browser recovery, draft flag, file conflict behavior, `npm test`, `npm run build`, commit, and push. State clearly that save is local and that GitHub Pages updates only after a successful push/build.

```js
for (const ignored of ["README.md", "docs/**", "tests/**", "lib/**", "writer/**", ".superpowers/**"]) {
  eleventyConfig.ignores.add(ignored);
}
```

- [ ] **Step 4: Run `npm ci && npm test && npm run build` and inspect `_site/`.** Expected: all tests pass, `writer/` is absent, public pages and index exist. Run `git diff --check` and read the output.
- [ ] **Step 5: Commit.** `git add eleventy.config.js tests/build.test.mjs README.md && git commit -m "Document local editor and exclude it from Pages"`.

## Final verification

Run the complete suite and build from a clean checkout, open `npm run write` locally, and verify the desktop/mobile layout, an existing-article edit, a new-article save, and a download. Inspect `git status --short`, `git diff main...HEAD --check`, and the generated `_site/` for unexpected files. Request the whole-branch review required by the chosen execution skill before integration.
