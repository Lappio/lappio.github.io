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

## Use the local writing editor

Install [Node.js](https://nodejs.org/) 22 or newer and run:

```sh
npm ci
npm run write
```

Open the local address printed in the terminal (normally `http://127.0.0.1:4173/`). The editor runs only on your computer and is excluded from the public site build. Its article list reads the local `content/posts/` directory, including drafts and files that need repair; it does not check what is currently live on GitHub Pages.

- Choose an article from the list to edit its fields and Markdown. Use **＋** to start a new article with today's date, or **导入 Markdown** to load an external `.md` file. An imported file becomes a new unsaved article.
- The preview updates while you write. **保留为草稿** writes `draft: true`, which keeps the article out of the next public build. It is separate from the browser's unsaved recovery copy.
- **保存到仓库** validates the article and creates `<slug>.md` for a new article, or updates the exact local file you opened. **下载 .md** exports a Markdown copy without changing the repository. Unknown YAML fields are kept, although YAML formatting and comments may change.
- Unsaved edits are copied to this browser's local storage. On reopening, choose whether to restore or discard them. **清除浏览器恢复副本** removes that copy. If browser storage is unavailable, editing and saving still work, but recovery does not.
- If a file changed on disk after you opened it, saving stops to protect the newer version. Download your edits before reopening the file. A duplicate slug or invalid field also stops saving and downloading until corrected.

Saving only changes local files. Review the result, run `npm test` and `npm run build`, then commit and push the changed Markdown to GitHub yourself. GitHub Pages updates after the push triggers a successful build and deployment. The editor has no GitHub login or publish button.

## Preview and check locally

To preview the public site, run:

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

## Customize the site

- Edit bilingual interface copy and the sample note and project entries in `script.js`.
- Edit page layouts in their respective `index.html` files; article pages use `_includes/post.njk`.
- Replace the six sample `friendLinks` in `script.js` with friends’ names, descriptions, and URLs.
- Replace `hello@example.com`, the generic GitHub URL, and the generic Are.na URL in the homepage and Contact page.
- Adjust colors and typography in `styles.css`.
