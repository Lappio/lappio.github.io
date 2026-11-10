# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Reply in Chinese.

## What this repository is

A bilingual (zh/en) personal blog. Markdown articles live in Git; Eleventy renders static HTML; a React/Vite bundle replaces the static markup in the browser. Articles are edited directly in `content/posts/`. Pushes to `main` run tests, build, and deploy `_site/` to GitHub Pages for the custom domain `lappio.top`.

`README.md` documents the authoring and publishing workflow; `AGENTS.md` holds contributor conventions; `docs/superpowers/specs/` and `docs/superpowers/plans/` hold design history.

## Commands

Requires Node.js 22 or newer.

| Command | What it does |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile. |
| `npm run dev` | Clean `_site/`, start Eleventy with `--serve`; each rebuild also runs `vite build` (`LAPPIO_DEV=1`) and triggers a full page reload, not HMR. |
| `npm test` | Run all `tests/*.test.mjs` with `node:test`. |
| `node --test tests/posts.test.mjs` | Run one suite; add `--test-name-pattern="..."` to narrow further. |
| `npm run build` | Clean `_site/`, run Vite (`frontend/main.jsx` → `.ui-build/`), then Eleventy. Extra args are forwarded to Eleventy, e.g. `npm run build -- --output=/tmp/site`. |

Browser suites (`tests/browser.test.mjs`, `tests/layout.test.mjs`) need Chrome. On macOS:

```sh
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

Without Chrome they skip rather than fail. Before handing off changes, run `npm test` and `npm run build`.

## Architecture

### Build pipeline and the static-to-React handoff

1. `scripts/build.mjs` deletes `_site/`, runs Vite, then Eleventy. Vite uses library mode (`vite.config.js`), emitting `.ui-build/app.js` and `.ui-build/app.css`; Eleventy passthrough-copies that directory to `_site/ui/`.
2. Eleventy's input is the repository root (`.`), output `_site/`. Root files become pages unless listed in `eleventyConfig.ignores` (`README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/**`, `tests/**`, `lib/**`, `frontend/**`, `.archify/**`, …) — add any new contributor-only root file there or it leaks into the public site (there is a regression test for this).
3. The `react-interface` transform rewrites every generated HTML page: it removes the legacy `script.js` tag, marks `styles.css` as `data-static-fallback`, injects `ui/app.css` + `ui/app.js`, and wraps body content in `<div id="react-root">`. The asset prefix comes from `data-root-prefix` (set to `../../` in `_includes/post.njk`), otherwise `./` for home and `../` for interior pages. Deeper page types need an explicit `data-root-prefix`.
4. `frontend/main.jsx` reads `document.body.dataset.page`, scrapes article metadata from the static `.post-article` DOM, and mounts `<App>`. React disables the fallback stylesheet on mount, so static HTML remains readable before JavaScript loads. Preserve `#main` content and, for posts, the `.post-article h1`, `.post-summary`, `time`, `.tag`, `.post-body` structure — React reads these.
5. `App` fetches `${rootPrefix}articles.json` and validates it with `frontend/lib/posts.js` (`validPostIndex`); an invalid or failed index produces the retry/error state. `articles.json` is rendered by `articles.11ty.js` from the `publishedPosts` collection, with URLs stored as `blog/<slug>/` (no prefix); React prepends `rootPrefix` for relative hosting.

### Article pipeline and validation

- Eleventy front matter is parsed with `js-yaml`'s `JSON_SCHEMA` (both in `eleventy.config.js` and `lib/post-document.mjs`). That is what keeps unquoted `date: 2026-09-24` as a string instead of a `Date`; do not relax the schema.
- `lib/posts.mjs` is the single validator: required nonempty `title`, `date`, `summary`, `language` (`en`/`zh`), `slug`; real `YYYY-MM-DD` date; boolean `draft` (defaults to `false`); nonempty body; unique slugs. `eleventy.before` calls `readPosts()` so any invalid article fails the whole build by filename.
- `content/posts/posts.11tydata.js` sets the layout and permalink; drafts get `permalink: false`, so they produce no page and never enter `publishedPosts`, lists, or search. Sorting is date descending, then slug.
- `_includes/post.njk` is both the static article fallback and the source of the React-read metadata. Keep it in sync with `frontend/article-page.jsx`/`copy.js` when changing article structure.
- `markdownTemplateEngine` and `htmlTemplateEngine` are disabled: Nunjucks does not run inside Markdown, which is why code samples containing `{{ ... }}` survive. A build test covers this.

### Frontend organization

- `frontend/app.jsx` — shell: header, desktop/mobile nav, language state (persisted in `localStorage` as `lappio-language`, default `zh`), article index fetching, `Home` vs `Interior` routing by `data-page`.
- `frontend/home.jsx` + `frontend/home.css` — notebook homepage (manuscript + margin notes).
- `frontend/article-page.jsx` — article reading view.
- `frontend/copy.js` — all UI strings. `zh` and `en` must have identical key sets and non-empty values (enforced by `tests/i18n.test.mjs`); section names stay English in both languages. Add new strings to both locales.
- `frontend/components/ui/` — shadcn/ui TSX primitives; `@` aliases to `frontend/` in `vite.config.js` and `jsconfig.json`. `components.json` configures further additions.
- Navigation and assets must stay relative (`href(path) = rootPrefix + path`) so both `lappio.top/` and repository-subpath Pages hosting work.

### Styling

The visual system is hand-drawn Excalidraw-style with macaron accents: paper/ink tokens in the `:root` block of `frontend/styles.css`, Tailwind v4 imported there, alternate border radii (`--sk-1`…`--sk-4`), zero-blur hard shadows, and restrained rotations. `@theme inline` maps these onto shadcn tokens. Decorative SVG lives in `frontend/components/sketch.jsx`; the handwritten font (`assets/fonts/caveat-latin.woff2`) is served locally — do not add an external font service. Use the `handdrawn-ui` skill for visual work.

### Tests

- `node:test` with strict assertions. Static output is inspected with `jsdom`; real browser behavior with Playwright (`playwright-core`).
- `tests/helpers/site.mjs` copies the project into a temp directory, builds a real site from the fixture posts (`test-post-1.md`, `test-post-2.md`), serves it, and launches Chrome. `tests/build.test.mjs` likewise builds isolated copies, so tests never touch your working `_site/`.
- Suites cover post validation, front matter decoding, i18n key parity, index validation, build output and exclusions, viewport layout at 320/390/1280px in both languages, reduced motion, search, and retry/empty states.

## Gotchas

- Never edit `_site/` or `.ui-build/`; both are generated and Git-ignored.
- Keep `title`/`date` quoted in new articles per README (unquoted dates still work because of `JSON_SCHEMA`, but quoted is the documented style). `draft` must be a boolean.
- `frontend/styles.css` is the mounted UI stylesheet; root `styles.css` and the section `index.html` files are the pre-React static fallback and are largely legacy. Do not add UI features to the fallback.
- `package.json` pins an `overrides` entry forcing `markdown-it` 15.x for Eleventy 3.1.6's ReDoS fixes. Re-evaluate it on Eleventy upgrades (see README Maintenance).
- `docs/sample-content.js` is reference-only, unpublished content; do not surface it. `docs/TODO-lapp.md` tracks real content still missing.
- Commits/deploys: pushing `main` runs `.github/workflows/pages.yml` (`npm ci` → `npm test` → `npm run build` → deploy). A failing test or invalid article blocks deployment.
