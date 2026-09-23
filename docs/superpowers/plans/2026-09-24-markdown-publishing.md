# Markdown Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Markdown articles by Git push, with generated article pages and updated blog lists and search on a GitHub Pages compatible site.

**Architecture:** Eleventy processes `content/posts/*.md` into detail pages and `articles.json`. A small validator rejects malformed source before a build. The existing browser script reads the generated index and renders post links while retaining the site's English/Chinese interface.

**Tech Stack:** Node.js, Eleventy 3.1.6, gray-matter 4.0.3, browser JavaScript, Node's test runner, GitHub Actions and Pages.

**Spec:** `docs/superpowers/specs/2026-09-24-markdown-publishing-design.md`

## Global Constraints

- Article source is `content/posts/*.md`; `_site/` is the ignored build output.
- Required metadata: `title`, ISO `date`, `summary`, `language` (`en` or `zh`), and a unique lowercase `slug`.
- `draft: true` excludes an article from pages, index data, lists, and search; omitted `draft` means published.
- URLs are `blog/<slug>/`; article content remains in its original language in either interface mode.
- Existing non-blog pages and the bilingual interface must keep working.
- The generated site must work at a domain root and a GitHub Pages project path.
- No browser editor, runtime API, database, comments, or account system.

## File map

| File | Responsibility |
| --- | --- |
| `package.json`, `package-lock.json`, `.gitignore` | Reproducible build commands and ignored output |
| `lib/posts.mjs` | Read and validate Markdown metadata; return normalized, ordered articles |
| `tests/posts.test.mjs` | Metadata, date, slug, draft, and duplicate validation |
| `eleventy.config.js` | Static asset copy, input ignores, validation hook, published post collection |
| `.nojekyll` | Ensure GitHub Pages serves all generated paths as static files |
| `content/posts/posts.11tydata.js` | Default post layout, permalink, and draft output rule |
| `_includes/post.njk` | Accessible article page using the existing visual style |
| `articles.11ty.js` | Publish compact JSON metadata for the browser |
| `tests/build.test.mjs` | Build fixture to prove generated and excluded output |
| `script.js`, `styles.css`, `blog/index.html` | Browser list/search rendering, article styling, empty states |
| `tests/browser.test.mjs` | Browser behavior for published, empty, and failed index states |
| `.github/workflows/pages.yml`, `README.md` | CI deployment and author instructions |

## Review Focus

1. A nonexistent calendar date such as `2026-02-30` must fail validation, rather than silently roll into March; cover in Task 1.
2. A slug such as `../admin` must fail validation and never create a path outside `blog/`; cover in Task 1.
3. A draft sharing a slug with a published article must fail validation, since publishing it later would collide; cover in Task 1.
4. A malformed or unavailable `articles.json` must show an unavailable state without breaking notes/projects/search; cover in Task 3.
5. Article links and assets must resolve when the site is mounted at `/repository-name/`; cover in Tasks 2 and 3.

---

### Task 1: Validate article source

**Files:**
- Create: `package.json`, `package-lock.json`, `.gitignore`, `content/posts/.gitkeep`, `lib/posts.mjs`, `tests/posts.test.mjs`

**Interfaces:**
- Produces: `readPosts(directory: string): Post[]`, where `Post` has `source`, `title`, `date` as `YYYY-MM-DD`, `summary`, `language`, `slug`, `draft`, and `body`.
- Throws an `Error` mentioning the source filename and invalid field. Returns posts sorted by date descending, then slug ascending. Includes drafts so Task 2 can decide what to publish.

- [ ] **Step 1: Write failing validator tests.** Use `node:test`, `assert/strict`, and a temporary directory. Write files with quoted dates in front matter. Assert one valid English article normalizes correctly; an empty directory returns `[]`; missing title, empty body, invalid language, nonboolean draft, `2026-02-30`, `../admin`, and duplicate slugs (including a draft) throw errors naming the field or slug.

```js
const post = `---\ntitle: First post\ndate: "2026-09-24"\nsummary: A short summary\nlanguage: en\nslug: first-post\n---\n\nHello **world**.\n`;
assert.deepEqual(readPosts(emptyDirectory), []);
assert.equal(readPosts(fixtureDirectory)[0].slug, "first-post");
assert.throws(() => readPosts(invalidDateDirectory), /2026-02-30.*date|date.*2026-02-30/);
assert.throws(() => readPosts(duplicateSlugDirectory), /duplicate.*slug.*first-post/i);
```

- [ ] **Step 2: Run `node --test tests/posts.test.mjs`.** Expect a failure because `lib/posts.mjs` does not exist.
- [ ] **Step 3: Install pinned build dependencies and implement `readPosts`.** Use `npm install --save-dev --save-exact @11ty/eleventy@3.1.6 gray-matter@4.0.3`. Set `"type": "module"` and scripts `"build": "eleventy"`, `"dev": "eleventy --serve"`, `"test": "node --test tests/*.test.mjs"`. Add `_site/` and `node_modules/` to `.gitignore`. Parse each `.md` file with gray-matter, validate string fields after trimming, allow only `^[a-z0-9]+(?:-[a-z0-9]+)*$` slugs, and verify a date by comparing its UTC round trip to the original ISO value. Treat any duplicate slug as an error. Catch YAML errors and prefix them with the file path.

```js
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
```

- [ ] **Step 4: Run `node --test tests/posts.test.mjs`.** Expect all validator tests to pass, including the five malformed input classes above.
- [ ] **Step 5: Commit Task 1.** Run `git add package.json package-lock.json .gitignore content/posts lib/posts.mjs tests/posts.test.mjs && git commit -m "Add Markdown article validation"`.

### Task 2: Generate static articles and index

**Files:**
- Create: `eleventy.config.js`, `content/posts/posts.11tydata.js`, `_includes/post.njk`, `articles.11ty.js`, `tests/build.test.mjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `readPosts(directory)` from Task 1.
- Produces: `_site/blog/<slug>/index.html` and `_site/articles.json`, whose entries are `{title,date,summary,language,slug,url}` ordered newest first. URLs are relative, e.g. `blog/first-post/`.

- [ ] **Step 1: Write a failing build integration test.** Create a temporary published Markdown file and a draft under `content/posts/`, build to a temporary output directory, read generated HTML and JSON, then clean up in `finally`. Assert the article body, title, language, and `../../styles.css` appear in HTML; published metadata appears in JSON; the draft has no HTML or JSON entry. Assert that a second article with the same date sorts by slug. Assert the output contains the existing home, Blog, Notes, CSS, JS, and assets files but no README or `docs/` copy. Resolve the article's relative home, script, and CSS links against both `https://example.test/` and `https://example.test/repository-name/` and assert they stay under the matching site base.

```js
const index = JSON.parse(readFileSync(join(output, "articles.json"), "utf8"));
assert.deepEqual(index.map(post => post.slug), ["a-post", "first-post"]);
assert.match(readFileSync(join(output, "blog/first-post/index.html"), "utf8"), /Hello <strong>world<\/strong>/);
assert.equal(existsSync(join(output, "blog/hidden/index.html")), false);
assert.equal(existsSync(join(output, "README/index.html")), false);
```

- [ ] **Step 2: Run `node --test tests/build.test.mjs`.** Expect failure because Eleventy configuration and templates do not exist.
- [ ] **Step 3: Configure Eleventy.** Use root input and `_site` output, `htmlTemplateEngine: false`, and explicit ignores for `README.md`, `docs/**`, `tests/**`, and `lib/**`. Copy `assets`, `styles.css`, `script.js`, and `favicon.svg`. In the `eleventy.before` event call `readPosts("content/posts")` to fail on bad files for both build and watch. Define `publishedPosts` with `getFilteredByGlob("./content/posts/*.md")`, filter `item.data.draft !== true`, and sort by ISO date descending then slug. Place `.nojekyll` in output through passthrough copy so Pages serves underscore paths if introduced later.

```js
eleventyConfig.on("eleventy.before", () => readPosts("content/posts"));
eleventyConfig.addCollection("publishedPosts", api =>
  api.getFilteredByGlob("./content/posts/*.md")
    .filter(item => item.data.draft !== true)
    .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)) || a.data.slug.localeCompare(b.data.slug))
);
```

- [ ] **Step 4: Create post defaults, HTML layout, and JSON template.** In `posts.11tydata.js`, set `layout: "post.njk"`; computed `permalink` is `false` for drafts and `blog/${slug}/index.html` otherwise. In `_includes/post.njk`, include the current site header/navigation/footer/search markup with links prefixed `../../`; use `{{ title }}` and `{{ summary }}` escaped, `<article lang="{{ language }}">`, and `{{ content | safe }}` for trusted Markdown output. Set `<body data-page="post" data-root-prefix="../../" data-post-title="...">`. In `articles.11ty.js`, return JSON for `collections.publishedPosts` and set `permalink: "articles.json"`. Add article typography and responsive rules to `styles.css`.

```js
export default {
  layout: "post.njk",
  eleventyComputed: {
    permalink: data => data.draft === true ? false : `blog/${data.slug}/index.html`
  }
};
```

- [ ] **Step 5: Run `node --test tests/build.test.mjs` and `npm run build`.** Expect the integration test to pass and a zero-article build to create `articles.json` containing `[]`.
- [ ] **Step 6: Commit Task 2.** Run `git add eleventy.config.js content/posts/posts.11tydata.js _includes/post.njk articles.11ty.js tests/build.test.mjs styles.css .nojekyll && git commit -m "Generate static blog articles"`.

### Task 3: Connect article data to the existing interface

**Files:**
- Modify: `script.js`, `blog/index.html`, `styles.css`, `package.json`, `package-lock.json`
- Create: `tests/browser.test.mjs`

**Interfaces:**
- Consumes: `articles.json` entries from Task 2.
- Produces: linked home and Blog article lists, blog search results, translated empty/error messages, and an article page whose shared interface can switch languages while the article body stays unchanged.

- [ ] **Step 1: Add browser behavior tests.** Install `jsdom@26` as a pinned dev dependency. Load the existing home and Blog HTML using JSDOM with `runScripts: "outside-only"`, stub `window.fetch`, evaluate `script.js`, and wait for its index request. Test four published posts: the home shows three, Blog shows all four, both link to article URLs, search links to the detail page, and a Chinese article title is unchanged after clicking the language switch. Test `[]` for an English/Chinese empty message. Test rejected fetch and malformed JSON for a translated unavailable state while Notes and Projects still render. On an article fixture with `data-root-prefix="../../"`, assert navigation and search targets resolve below `/repository-name/`.

```js
window.fetch = async () => ({ ok: true, json: async () => [{
  title: "中文文章", date: "2026-09-24", summary: "摘要", language: "zh",
  slug: "first-post", url: "blog/first-post/"
}] });
assert.equal(document.querySelector("#blog-list a").getAttribute("href"), "./blog/first-post/");
```

- [ ] **Step 2: Run `node --test tests/browser.test.mjs`.** Expect a failure because `script.js` still uses hardcoded sample entries and does not fetch the index.
- [ ] **Step 3: Replace the blog sample data path.** Keep notes/projects/friends unchanged. Initialize `entries.blog` as `[]`; derive `rootPrefix` from `document.body.dataset.rootPrefix` when present; fetch `${rootPrefix}articles.json` once on startup. Accept only an array of objects with the expected string fields and URLs matching `blog/<safe-slug>/`, otherwise set a load-error state. Render blog cards using `createElement` and `textContent` so Markdown metadata cannot inject markup, and display dates using `Intl.DateTimeFormat` for the interface language. On the home page use `.slice(0, 3)`; on Blog use all. Link search results to `${rootPrefix}${post.url}`. For `page === "post"`, highlight Blog in navigation and retain the article title in the browser tab. Remove the “Sample entries” label from the Blog page and show a normal count or no label.

```js
const rootPrefix = document.body.dataset.rootPrefix || (page === "home" ? "./" : "../");
fetch(`${rootPrefix}articles.json`)
  .then(response => { if (!response.ok) throw new Error("index unavailable"); return response.json(); })
  .then(posts => { if (!Array.isArray(posts)) throw new Error("invalid index"); entries.blog = posts; renderContent(); })
  .catch(() => { blogLoadFailed = true; renderContent(); });
```

- [ ] **Step 4: Run `node --test tests/browser.test.mjs`, then `npm test` and `npm run build`.** Expect all browser, validator, and build tests to pass. Open local generated home, Blog, and one temporary article page to verify appearance at desktop and mobile widths, direct links, search, and the language switch.
- [ ] **Step 5: Commit Task 3.** Run `git add script.js blog/index.html styles.css package.json package-lock.json tests/browser.test.mjs && git commit -m "Show generated articles in blog and search"`.

### Task 4: Add deployment and publishing instructions

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm ci`, `npm test`, `npm run build` from Tasks 1–3.
- Produces: a Pages workflow on pushes to `main`, plus a concrete authoring checklist.

- [ ] **Step 1: Add a GitHub Pages workflow.** On `push` to `main` and `workflow_dispatch`, check out source, set up Node 22 with npm caching, run `npm ci`, `npm test`, and `npm run build`; upload `_site` with `actions/upload-pages-artifact@v4`; deploy in a dependent job using `actions/deploy-pages@v4` and `pages: write` plus `id-token: write` permissions. Use `actions/checkout@v6` and `actions/setup-node@v4` unless GitHub's official current examples require a newer supported version at execution time. Only the deployment job needs write permissions.

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v4
        with:
          path: _site
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    permissions:
      pages: write
      id-token: write
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Rewrite the README publishing section.** Show a complete article file with quoted ISO date, `language`, `slug`, `summary`, and Markdown body; show optional `draft: true`; explain `npm ci`, `npm run dev`, `npm test`, `npm run build`, commit and push; explain that the owner must create a GitHub repository and select **Settings → Pages → Build and deployment → GitHub Actions** before the workflow can publish. State that article text is shown in its source language in either UI mode.

```markdown
---
title: "A new article"
date: "2026-09-24"
summary: "What this article covers."
language: en
slug: a-new-article
---

Write the article in Markdown here.
```

- [ ] **Step 3: Run clean-install and acceptance checks.** Run `npm ci`, `npm test`, `npm run build`, then inspect `_site/articles.json` and confirm `_site/index.html`, `_site/blog/index.html`, CSS, JS, and assets are present. Validate workflow YAML syntax with an available YAML parser or `actionlint` if installed. Confirm `git status --short` contains no generated output.
- [ ] **Step 4: Commit Task 4.** Run `git add .github/workflows/pages.yml README.md && git commit -m "Prepare GitHub Pages article publishing"`.

## Final verification

- [ ] Run `npm ci && npm test && npm run build` from a clean working tree.
- [ ] Add a temporary published Markdown article, build, and browse its direct URL, lists, and search; remove the temporary article and build again.
- [ ] Confirm no draft or temporary article remains in `_site` after the final build and no generated files are tracked.
- [ ] Review `git diff main~4..main` and `git status --short --branch` before reporting completion.
