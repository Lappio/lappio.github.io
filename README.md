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

## Preview and check locally

Install [Node.js](https://nodejs.org/) 22 or newer, then run:

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

The workflow in `.github/workflows/pages.yml` installs dependencies, tests the site, builds it, and deploys `_site/`. A failing test or invalid article stops deployment. No GitHub remote is configured in this local copy yet.

## Customize the site

- Edit bilingual interface copy and the sample note and project entries in `script.js`.
- Edit page layouts in their respective `index.html` files; article pages use `_includes/post.njk`.
- Replace the six sample `friendLinks` in `script.js` with friends’ names, descriptions, and URLs.
- Replace `hello@example.com`, the generic GitHub URL, and the generic Are.na URL in the homepage and Contact page.
- Adjust colors and typography in `styles.css`.
