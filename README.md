# Lappio Blog

A bilingual personal blog with Blog, Notes, Projects, Links, About, and Contact pages. Articles are Markdown files in Git. Eleventy turns them into static pages, so no server or database is needed when the site is hosted on GitHub Pages.

## Write an article

Create a file such as `content/posts/a-new-article.md`:

```markdown
---
title: "A new article"
date: "2026-09-24"
summary: "What this article covers."
language: en
slug: a-new-article
---

Write the article in **Markdown** here.

## A section heading

More thoughts go here.
```

Use a real calendar date in `YYYY-MM-DD` form and keep it in quotes. The `slug` is the permanent URL name: this example appears at `/blog/a-new-article/`. It must be unique and use lowercase letters, numbers, and hyphens. `language` is `en` or `zh`. Each article has one language; the English/Chinese switch translates the surrounding site interface while leaving the article itself as written.

To keep an article unpublished while you work, add `draft: true` to its front matter. Remove that line or change it to `draft: false` when ready. Drafts do not produce article pages or appear in lists or search. The build rejects missing fields, invalid dates or slugs, duplicate slugs, and empty bodies with an error naming the file.

Edit articles directly in `content/posts/` with your preferred text editor. Preview and validate the site using the commands below, then commit the Markdown changes to Git.

## Preview and check locally

With Node.js 22 or newer installed, preview the public site by running:

```sh
npm ci
npm run dev
```

Open the local address printed by Eleventy. `npm run dev` watches files and refreshes the generated site. Before publishing, run:

```sh
npm test
npm run build
```

The generated site is in `_site/`. That folder is rebuilt from source and is ignored by Git; edit the Markdown or site source files instead. With no published articles, the Blog section displays an empty message.

## Publish on GitHub Pages

1. Create a GitHub repository for this project and push the site to its `main` branch.
2. In the repository, open **Settings → Pages → Build and deployment** and choose **GitHub Actions** as the source.
3. Add or edit an article under `content/posts/`, commit it, and push to `main`.

The workflow in `.github/workflows/pages.yml` installs dependencies, tests the site, builds it, and deploys `_site/`. A failing test or invalid article stops deployment. Check your repository's Git remote before pushing.

## Maintenance

### Homepage usage overview

The card between the introduction and Blog imports `frontend/data/usage.json`. Its labels follow the existing homepage language button. The four metrics cover all exported history; each calendar segment covers 53 weeks. `frontend/components/home-usage.jsx` adapts the reusable heatmap to the site's paper/ink tokens and mobile layout. The locally served Caveat metric font is a numeric/symbol subset under `assets/fonts/OFL.txt` (from Google Fonts).

Only public aggregates belong in the snapshot: `generatedAt`, `range`, `totals`, and `days`. `lib/public-usage.mjs` shares the dashboard exporter's allowlist. The production build validates it before clearing the previous output; database paths, request logs, credentials and other metadata are rejected.

Daily publication uses the adjacent `dashboard` project's existing macOS LaunchAgent, not a GitHub runner that would need access to the local database. Set its ignored `sync.config.json` to:

```json
{
  "dbPath": "~/.cc-switch/cc-switch.db",
  "publish": {
    "repository": "git@github.com:Lappio/lappio.github.io.git",
    "branch": "main",
    "file": "frontend/data/usage.json"
  }
}
```

From `../dashboard`, `npm run sync:daily` refreshes the local dashboard and pushes **only this JSON** through a temporary clone. The site's existing Pages workflow tests, builds and deploys it. Timestamp-only changes do not create commits. This does not touch the website's development worktree. Pull `main` before later website edits to pick up daily data commits.

The existing task runs at local time **09:00**, catches up on login/wake and checks hourly after failures. It needs the Mac running and logged in, current data already imported into CC Switch, and working Git/SSH authentication. Check with `npm run schedule:daily -- status`; logs are in `../dashboard/.usage-sync/`. If no task is installed on a new Mac, run `npm run schedule:daily -- install` after one successful manual sync. Stop it with `npm run schedule:daily -- uninstall` (data and configuration are retained).

The `markdown-it` override in `package.json` forces Eleventy 3.1.6's declared `^14` dependency to 15.x for the GHSA-vfgh-jcmw-g37q / GHSA-gfr2-rv44-r23c ReDoS fixes. Re-check it when upgrading Eleventy: if Eleventy natively depends on markdown-it >=15, remove the override; otherwise keep it. Run `npm ls markdown-it`, `npm audit`, `npm test`, and `npm run build`, and diff `_site/` before and after the upgrade.

## Customize the site

The public interface is a React application enhanced over Eleventy's static HTML. Vite builds the UI into `.ui-build/`, which Eleventy copies to `_site/ui/`. Article HTML remains available before JavaScript loads; the React entry reads that content and mounts the shared interface. Articles are authored directly as Markdown files in `content/posts/`.

- Edit the notebook homepage in `frontend/home.jsx` and its layout in `frontend/home.css`. Recent articles occupy the main manuscript sheet; Notes and Projects appear as margin notes.
- Edit shared navigation and interior pages in `frontend/app.jsx`, article rendering in `frontend/article-page.jsx`, and bilingual copy in `frontend/copy.js`. Section names stay English in both interface languages.
- `frontend/styles.css` defines the handdrawn-ui paper/ink palette, irregular borders, hard shadows, typography, shared components, and reduced-motion behavior. Decorative SVG marks live in `frontend/components/sketch.jsx`. The handwritten font is served locally from `assets/fonts/`; no external font service is required.
- UI primitives in `frontend/components/ui/` come from shadcn/ui; `components.json` configures future additions.
- `npm run dev` watches the React UI alongside Eleventy. `npm run build` creates the complete static `_site/` output.
- Search reads published articles from `articles.json`. Notes, projects, friends, and contact information remain empty until real content is supplied.
- Navigation and assets use relative URLs, including nested article pages and repository-path GitHub Pages hosting. Language preferences persist locally. Reduced-motion preferences disable animated entrances and interactions.

The section `index.html` files, root `styles.css`, and `_includes/post.njk` provide the static fallback; they are not the mounted React layout. Contributor documentation such as `AGENTS.md` is excluded from the public build.

For browser tests on macOS, point `CHROME_PATH` at an installed Chrome executable:

```sh
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

Without a detected Chrome executable, the browser suites skip rather than checking the rendered interface.
