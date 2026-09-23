# Markdown article publishing design

## Purpose

Turn the existing static personal blog into a site where the owner publishes articles by adding Markdown files and pushing to GitHub. A push should produce readable article pages and update the home page, Blog page, and search. The site remains suitable for GitHub Pages.

## Current state

The site consists of static HTML, CSS, and one browser script. `script.js` contains three sample blog summaries, but there are no article pages or content files. The folder has no Git repository or deployment workflow. The interface supports English and Chinese.

## Chosen approach

Use Eleventy as a build-time publishing system. Git holds the article source; Eleventy turns Markdown into static HTML and an article index. GitHub Actions builds and deploys the output to GitHub Pages after the owner creates a GitHub repository and enables Pages with GitHub Actions as its source. No runtime server or database is needed for this publishing method.

Eleventy will use the project root as its input and `_site/` as its ignored output. Existing static pages and assets remain in their current paths. Configuration will exclude project documentation, tests, and dependencies from published output, while processing `content/posts/*.md` and an article index template. The generated site must work both at a domain root and at a GitHub Pages project path; links and assets use relative paths or an explicit base path where necessary.

## Article format

Each file in `content/posts/` is one article. Its YAML front matter requires:

| Field | Meaning |
| --- | --- |
| `title` | Nonempty article title |
| `date` | Calendar date in `YYYY-MM-DD` format |
| `summary` | Nonempty short description for lists and search |
| `language` | `en` or `zh` |
| `slug` | Unique lowercase URL segment using letters, numbers, and hyphens |

`draft: true` is optional and excludes an article from all published output. Without it, an article is published. The Markdown body is the full article. The site owner writes trusted Markdown; arbitrary HTML in articles is outside the supported authoring format.

The canonical URL is `blog/<slug>/`. Slugs do not change when titles change. Duplicate slugs, missing or invalid fields, and empty article bodies fail the build with a message naming the source file. Dates determine newest-first order; equal dates sort by slug for deterministic output.

## Build output and page behavior

Eleventy generates an HTML detail page for every published article and a small JSON index containing only the metadata required for lists and search. Drafts never appear in either output. The existing browser script loads this index once and uses it for the home page's latest three articles, the full Blog list, and search results. Article list items and search results link directly to the detail page. The three current sample blog summaries are removed. If no published articles exist, the home and Blog lists show a translated empty state and search contains no blog results.

The article template reuses the site's visual language, header, footer, search dialog, and language switch. The interface can be shown in English or Chinese according to the saved preference; the article title, summary, and body remain in the language in which the article was written. The article page declares that language for the article content. A browser can open article URLs directly without needing a client-side router or JavaScript to render the body.

Notes, projects, links, and the rest of the site continue to work as they do now. The blog section alone moves from hardcoded samples to generated content. Network failure when fetching the JSON index shows a translated unavailable message without breaking the other sections.

## Deployment and author workflow

`npm install` sets up the local build. `npm run dev` serves the generated site, `npm run build` writes `_site/`, and `npm test` validates the publishing behavior. `_site/` and `node_modules/` are ignored by Git.

To publish, the owner adds `content/posts/<name>.md`, runs the local checks, commits, and pushes to the repository's default branch. The GitHub Actions workflow installs locked dependencies, runs tests and the build, then deploys `_site/` to GitHub Pages. It uses GitHub's Pages artifact and deployment actions. A failed validation or build prevents deployment. The workflow cannot publish until a GitHub repository exists and Pages is enabled there.

The README will include a complete article example, local preview steps, draft behavior, publish steps, and the one-time GitHub Pages setting.

## Verification and acceptance

- A valid published Markdown file builds to `blog/<slug>/index.html` with readable body content.
- Its title, date, summary, and link appear on the home page, Blog page, and in search; article order is newest first.
- A draft is absent from detail pages and index data.
- Missing required metadata, an invalid date or slug, and duplicate slugs fail with useful errors.
- Empty and failed-index states do not break the existing pages.
- The generated site works when served locally, including direct article links and assets, and the deployment workflow targets GitHub Pages.

## Scope limits

This setup does not include a browser editor, account authentication, comments, a database, or an API. Article creation and edits happen through Markdown files in Git. GitHub repository creation and enabling Pages are later owner actions because no remote repository is configured yet.
